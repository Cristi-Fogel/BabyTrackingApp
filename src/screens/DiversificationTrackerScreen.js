import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  sendToSheet,
  getTheme,
  getLanguage,
  getForceOffline,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { translations } from '../services/translations';

const ALLERGY_TYPES = [
  'Erupție cutanată / Roșeață',
  'Urticarie',
  'Disconfort digestiv / Vărsături',
  'Diaree',
  'Altă reacție',
];

const extractFoodName = (rawValue) => {
  if (!rawValue) return '';
  const str = String(rawValue).trim();
  const dashIndex = str.indexOf(' - ');
  return (dashIndex >= 0 ? str.slice(0, dashIndex) : str).trim();
};

export default function DiversificationTrackerScreen() {
  const navigation = useNavigation();

  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reaction, setReaction] = useState('OK'); // 'OK' | 'Alergie'
  const [allergyType, setAllergyType] = useState(ALLERGY_TYPES[0]);
  const [customReactionText, setCustomReactionText] = useState('');
  const [allergyDropdownOpen, setAllergyDropdownOpen] = useState(false);

  const [previousFoods, setPreviousFoods] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const [currentLang, setCurrentLang] = useState('ro');

  const t = translations[currentLang] || translations.ro;

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        const themeMode = await getTheme();
        const langCode = await getLanguage();
        if (isMounted) {
          setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
          setCurrentLang(langCode || 'ro');
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadPreviousFoods = useCallback(async () => {
    try {
      const entries = await getLocalEntries();
      if (!Array.isArray(entries)) return;

      const seen = new Set();
      const orderedFoods = [];

      for (const item of entries) {
        const type = String(item?.type || '').toLowerCase();
        if (type === 'diversification' || type === 'food' || type === 'solid') {
          const parsedFood = extractFoodName(item?.value);
          if (parsedFood) {
            const key = parsedFood.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              orderedFoods.push(parsedFood);
            }
          }
        }
      }

      setPreviousFoods(orderedFoods);

      if (!hasPrefilled && orderedFoods.length > 0) {
        setFoodName(orderedFoods[0]);
        setHasPrefilled(true);
      }
    } catch (err) {
      console.error('Eroare la încărcarea mâncărurilor anterioare:', err);
    }
  }, [hasPrefilled]);

  useFocusEffect(
    useCallback(() => {
      loadPreviousFoods();
    }, [loadPreviousFoods])
  );

  useEffect(() => {
    loadPreviousFoods();
  }, [loadPreviousFoods]);

  const handleBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeString = (d) =>
    d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event?.type === 'dismissed') return;
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event?.type === 'dismissed') return;
    if (time) {
      setSelectedTime(time);
    }
  };

  const handleSelectPreviousFood = (selected) => {
    setFoodName(selected);
    setDropdownOpen(false);
  };

  const handleSelectReaction = (nextReaction) => {
    setReaction(nextReaction);
    if (nextReaction !== 'Alergie') {
      setAllergyDropdownOpen(false);
    }
  };

  const handleSelectAllergyType = (selectedType) => {
    setAllergyType(selectedType);
    setAllergyDropdownOpen(false);
  };

  const handleSave = async () => {
    const trimmedFood = foodName.trim();
    const trimmedQty = quantity.trim();
    const trimmedCustomReaction = customReactionText.trim();

    if (!trimmedFood) {
      Alert.alert(
        t.error || 'Lipsă informație',
        t.foodRequired || 'Introdu sau selectează un fel de mâncare.'
      );
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const combinedDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0
      );

      const nowIsoString = combinedDateTime
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19);
      const timeString = formatTimeString(combinedDateTime);

      const resolvedAllergyType =
        reaction === 'Alergie'
          ? allergyType === 'Altă reacție'
            ? trimmedCustomReaction || 'Altă reacție'
            : allergyType
          : '';

      const parts = [trimmedFood];
      if (trimmedQty) parts.push(trimmedQty);
      if (reaction === 'Alergie' && resolvedAllergyType) {
        parts.push(`Alergie: ${resolvedAllergyType}`);
      }
      const formattedValue = parts.join(' - ');

      const newEntry = {
        id: Date.now().toString(),
        date: getLocalDateString(combinedDateTime),
        time: timeString,
        type: 'diversification',
        value: formattedValue,
        food: trimmedFood,
        quantity: trimmedQty,
        reaction,
        allergyType: resolvedAllergyType,
        fullDateTime: nowIsoString,
      };

      const currentEntries = await getLocalEntries();
      const updatedEntries = [
        newEntry,
        ...(Array.isArray(currentEntries) ? currentEntries : []),
      ];
      await saveLocalEntries(updatedEntries);

      const forcedOffline = await getForceOffline();
      if (!forcedOffline) {
        const sheetUrl = await getStoredSheetUrl();
        if (sheetUrl) {
          await sendToSheet(sheetUrl, newEntry);
        }
      }

      handleBack();
    } catch (e) {
      console.error('Eroare la salvare:', e);
      Alert.alert(
        t.error || 'Eroare',
        t.saveError || 'Nu s-a putut salva înregistrarea.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: currentTheme.background }]}
    >
      <StatusBar
        barStyle={currentTheme.statusBar}
        backgroundColor={currentTheme.background}
        translucent={false}
      />

      {/* Header fix sus — același stil și lățime ca la celelalte ecrane, fără suprapunere */}
      <View
        style={[
          styles.topHeaderFixed,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.backButtonLarge,
            {
              backgroundColor: currentTheme.cardBackground,
              borderColor: currentTheme.border,
            },
          ]}
          onPress={handleBack}
          disabled={isSubmitting}
        >
          <Ionicons
            name="arrow-back-outline"
            size={20}
            color={currentTheme.textMain}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.backButtonLargeText,
              { color: currentTheme.textMain },
            ]}
          >
            {t.back || 'Înapoi'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              {/* Dropdown mâncăruri anterioare */}
              <Text style={[styles.label, { color: currentTheme.textSub }]}>
                {t.previousFoods || 'Mâncăruri anterioare'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: currentTheme.inputBackground,
                    borderColor: currentTheme.border,
                  },
                ]}
                onPress={() => {
                  setDropdownOpen((prev) => !prev);
                  setAllergyDropdownOpen(false);
                }}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    { color: currentTheme.inputText },
                  ]}
                  numberOfLines={1}
                >
                  {previousFoods.length > 0
                    ? foodName || `Ultimul: ${previousFoods[0]}`
                    : t.noPreviousFoods || 'Nu există mâncăruri salvate încă'}
                </Text>
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={currentTheme.textSub}
                />
              </TouchableOpacity>

              {dropdownOpen && (
                <View
                  style={[
                    styles.dropdownList,
                    {
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: currentTheme.border,
                    },
                  ]}
                >
                  {previousFoods.length === 0 ? (
                    <Text
                      style={[
                        styles.dropdownEmptyText,
                        { color: currentTheme.textSub },
                      ]}
                    >
                      {t.noPreviousFoods || 'Nicio mâncare anterioară găsită'}
                    </Text>
                  ) : (
                    previousFoods.map((item, idx) => {
                      const isSelected =
                        foodName.toLowerCase() === item.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={`${item}_${idx}`}
                          style={[
                            styles.dropdownItem,
                            { borderBottomColor: currentTheme.border },
                            isSelected && {
                              backgroundColor: currentTheme.inputBackground,
                            },
                          ]}
                          onPress={() => handleSelectPreviousFood(item)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              { color: currentTheme.textMain },
                              isSelected && styles.dropdownItemTextSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {item}
                          </Text>
                          {idx === 0 && (
                            <Text style={styles.lastBadge}>Ultimul</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* Input mâncare */}
              <Text style={[styles.label, { color: currentTheme.textSub }]}>
                {t.foodName || 'Fel de mâncare'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.inputBackground,
                    borderColor: currentTheme.border,
                    color: currentTheme.inputText,
                  },
                ]}
                placeholder="Ex: Piure de dovlecel, Avocat, Banane..."
                placeholderTextColor={currentTheme.textSub}
                value={foodName}
                onChangeText={setFoodName}
                editable={!isSubmitting}
              />

              {/* Input opțional cantitate */}
              <Text style={[styles.label, { color: currentTheme.textSub }]}>
                {t.quantityOptional || 'Cantitate (opțional)'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.inputBackground,
                    borderColor: currentTheme.border,
                    color: currentTheme.inputText,
                  },
                ]}
                placeholder="Ex: 100g, 5 lingurițe..."
                placeholderTextColor={currentTheme.textSub}
                value={quantity}
                onChangeText={setQuantity}
                editable={!isSubmitting}
              />

              {/* Data și Ora mesei */}
              <View style={styles.dateTimeRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={[styles.label, { color: currentTheme.textSub }]}>
                    {t.date || 'Data'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      {
                        backgroundColor: currentTheme.inputBackground,
                        borderColor: currentTheme.border,
                      },
                    ]}
                    onPress={() => setShowDatePicker(true)}
                    disabled={isSubmitting}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={currentTheme.textSub}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.pickerButtonText,
                        { color: currentTheme.inputText },
                      ]}
                    >
                      {getLocalDateString(selectedDate)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={[styles.label, { color: currentTheme.textSub }]}>
                    {t.time || 'Ora'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.pickerButton,
                      {
                        backgroundColor: currentTheme.inputBackground,
                        borderColor: currentTheme.border,
                      },
                    ]}
                    onPress={() => setShowTimePicker(true)}
                    disabled={isSubmitting}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={currentTheme.textSub}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.pickerButtonText,
                        { color: currentTheme.inputText },
                      ]}
                    >
                      {formatTimeString(selectedTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
              )}

              {/* Reacție / Alergie */}
              <Text style={[styles.label, { color: currentTheme.textSub }]}>
                {t.reaction || 'Reacție'}
              </Text>
              <View style={styles.reactionRow}>
                <TouchableOpacity
                  style={[
                    styles.reactionOptionBtn,
                    {
                      backgroundColor:
                        reaction === 'OK'
                          ? '#E8F8F5'
                          : currentTheme.inputBackground,
                      borderColor:
                        reaction === 'OK' ? '#27AE60' : currentTheme.border,
                    },
                  ]}
                  onPress={() => handleSelectReaction('OK')}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={reaction === 'OK' ? '#27AE60' : currentTheme.textSub}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.reactionOptionText,
                      {
                        color:
                          reaction === 'OK' ? '#117A65' : currentTheme.textMain,
                      },
                    ]}
                  >
                    OK
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reactionOptionBtn,
                    {
                      backgroundColor:
                        reaction === 'Alergie'
                          ? '#FDEDEC'
                          : currentTheme.inputBackground,
                      borderColor:
                        reaction === 'Alergie' ? '#E74C3C' : currentTheme.border,
                    },
                  ]}
                  onPress={() => handleSelectReaction('Alergie')}
                  disabled={isSubmitting}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={
                      reaction === 'Alergie' ? '#E74C3C' : currentTheme.textSub
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.reactionOptionText,
                      {
                        color:
                          reaction === 'Alergie'
                            ? '#C0392B'
                            : currentTheme.textMain,
                      },
                    ]}
                  >
                    Alergie
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Dropdown tipuri de alergie când este selectat "Alergie" */}
              {reaction === 'Alergie' && (
                <View style={{ marginTop: 8 }}>
                  <Text
                    style={[styles.label, { color: currentTheme.textSub }]}
                  >
                    {t.allergyType || 'Tip alergie'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor: currentTheme.inputBackground,
                        borderColor: currentTheme.border,
                      },
                    ]}
                    onPress={() => {
                      setAllergyDropdownOpen((prev) => !prev);
                      setDropdownOpen(false);
                    }}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.dropdownTriggerText,
                        { color: currentTheme.inputText },
                      ]}
                      numberOfLines={1}
                    >
                      {allergyType}
                    </Text>
                    <Ionicons
                      name={allergyDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={currentTheme.textSub}
                    />
                  </TouchableOpacity>

                  {allergyDropdownOpen && (
                    <View
                      style={[
                        styles.dropdownList,
                        {
                          backgroundColor: currentTheme.cardBackground,
                          borderColor: currentTheme.border,
                        },
                      ]}
                    >
                      {ALLERGY_TYPES.map((typeOption, idx) => {
                        const isSelected = allergyType === typeOption;
                        return (
                          <TouchableOpacity
                            key={`${typeOption}_${idx}`}
                            style={[
                              styles.dropdownItem,
                              { borderBottomColor: currentTheme.border },
                              isSelected && {
                                backgroundColor: currentTheme.inputBackground,
                              },
                            ]}
                            onPress={() => handleSelectAllergyType(typeOption)}
                          >
                            <Text
                              style={[
                                styles.dropdownItemText,
                                { color: currentTheme.textMain },
                                isSelected && styles.dropdownItemTextSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {typeOption}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Input liber când este selectat "Altă reacție" */}
                  {allergyType === 'Altă reacție' && (
                    <View style={{ marginTop: 8 }}>
                      <Text
                        style={[styles.label, { color: currentTheme.textSub }]}
                      >
                        {t.otherReaction || 'Descrie reacția'}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: currentTheme.inputBackground,
                            borderColor: currentTheme.border,
                            color: currentTheme.inputText,
                          },
                        ]}
                        placeholder="Ex: Roșeață în jurul gurii, agitație..."
                        placeholderTextColor={currentTheme.textSub}
                        value={customReactionText}
                        onChangeText={setCustomReactionText}
                        editable={!isSubmitting}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Buton Save jos — același stil ca la celelalte ecrane */}
            <TouchableOpacity
              style={[
                styles.confirmBtnFullWidth,
                isSubmitting && styles.confirmBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.confirmBtnText}>
                    {t.save || 'Salvează Înregistrarea'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 12,
  },
  topHeaderFixed: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
  },
  backButtonLargeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 6,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  dropdownList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownEmptyText: {
    fontSize: 13,
    padding: 12,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  dropdownItemTextSelected: {
    color: '#D35400',
    fontWeight: 'bold',
  },
  lastBadge: {
    color: '#D35400',
    fontSize: 11,
    fontWeight: 'bold',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reactionOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  confirmBtnFullWidth: {
    backgroundColor: '#D35400',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
    elevation: 3,
  },
  confirmBtnDisabled: {
    backgroundColor: '#A0A0A0',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});