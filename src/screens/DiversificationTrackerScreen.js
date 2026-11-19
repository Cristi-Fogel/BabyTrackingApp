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
  const [previousFoods, setPreviousFoods] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);

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

  const handleSelectPreviousFood = (selected) => {
    setFoodName(selected);
    setDropdownOpen(false);
  };

  const handleSave = async () => {
    const trimmedFood = foodName.trim();
    const trimmedQty = quantity.trim();

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
      const now = new Date();
      const nowIsoString = now.toISOString().replace('T', ' ').substring(0, 19);
      const timeString = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const formattedValue = trimmedQty
        ? `${trimmedFood} - ${trimmedQty}`
        : trimmedFood;

      const newEntry = {
        id: now.getTime().toString(),
        date: getLocalDateString(now),
        time: timeString,
        type: 'diversification',
        value: formattedValue,
        food: trimmedFood,
        quantity: trimmedQty,
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
              {/* Buton Înapoi — același stil și lățime ca la celelalte ecrane */}
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
                onPress={() => setDropdownOpen((prev) => !prev)}
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
      Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  container: {
    padding: 16,
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
    marginBottom: 12,
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