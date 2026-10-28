import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  sendToSheet,
  getTheme,
  getForceOffline,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';

export default function MilkTrackerScreen() {
  const navigation = useNavigation();
  const [amount, setAmount] = useState(90);
  const [milkSource, setMilkSource] = useState('Lapte praf');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data și ora pornesc direct de la momentul curent (Acum)
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const quickAmounts = [30, 60, 90, 120, 150, 180, 210];

  useEffect(() => {
    let isMounted = true;
    getTheme().then((themeMode) => {
      if (isMounted) {
        setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const onChangeTime = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const nowIsoString = now.toISOString().replace('T', ' ').substring(0, 19);

      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedValue = `${amount || 0} ml (${milkSource})`;

      const newEntry = {
        id: now.getTime().toString(),
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        time: timeString,
        type: 'milk',
        value: formattedValue,
        fullDateTime: nowIsoString,
      };

      const currentEntries = await getLocalEntries();
      const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
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
      Alert.alert('Eroare', 'Nu s-a putut salva înregistrarea.');
      setIsSubmitting(false);
    }
  };

  const sources = [
    { label: 'Lapte praf', icon: 'baby-carriage' },
    { label: 'Lapte pompat', icon: 'wine-bottle' },
    { label: 'Lapte Mix', icon: 'blender' },
    { label: 'Sân Stâng', icon: 'female' },
    { label: 'Sân Drept', icon: 'female' },
    { label: 'Ambii Sâni', icon: 'heart' },
    { label: 'Lapte praf + Sân Stâng', icon: 'female' },
    { label: 'Lapte praf + Sân Drept', icon: 'female' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={isSubmitting}>
          <Ionicons name="arrow-back" size={24} color={currentTheme.textMain} />
        </TouchableOpacity>

        {/* 1. Rând Unic: Ora + Titlu Sursă / Tip Hrănire */}
        <View style={styles.topCompactRow}>
          {/* Buton Oră */}
          <TouchableOpacity
            style={[styles.timeBox, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="time-outline" size={18} color={currentTheme.textSub} style={{ marginRight: 6 }} />
            <Text style={[styles.timeText, { color: currentTheme.inputText }]}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Text>
          </TouchableOpacity>

          {/* Titlu Sursă / Tip Hrănire alăturat */}
          <Text style={[styles.sectionTitleInline, { color: currentTheme.textSub }]}>Sursă / Tip Hrănire</Text>
        </View>

        {/* Picker-ul nativ */}
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeTime}
          />
        )}

        {/* 2. Selecție Tip Lapte / Sursă (Grid) */}
        <View style={styles.sourceGrid}>
          {sources.map((item) => {
            const isSelected = milkSource === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.sourceOption,
                  { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border },
                  isSelected && styles.sourceOptionSelected,
                ]}
                onPress={() => setMilkSource(item.label)}
              >
                <FontAwesome5
                  name={item.icon}
                  size={13}
                  color={isSelected ? '#FFF' : currentTheme.textSub}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.sourceText, { color: currentTheme.textSub }, isSelected && styles.sourceTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Input cantitate */}
        <View style={styles.displayBadge}>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            value={String(amount)}
            onChangeText={(val) => {
              const numericValue = val.replace(/[^0-9]/g, '');
              setAmount(numericValue ? parseInt(numericValue, 10) : '');
            }}
            editable={!isSubmitting}
          />
          <Text style={styles.unitText}>ml</Text>
        </View>

        {/* 4. Quick amounts */}
        <View style={styles.quickAmountContainer}>
          {quickAmounts.map((qty) => (
            <TouchableOpacity
              key={qty}
              style={[
                styles.quickBtn,
                { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border },
                amount === qty && styles.quickBtnActive,
              ]}
              onPress={() => setAmount(qty)}
            >
              <Text
                style={[
                  styles.quickBtnText,
                  { color: currentTheme.textSub },
                  amount === qty && styles.quickBtnTextActive,
                ]}
              >
                {qty} ml
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. Slider cantitate */}
        <View style={styles.sliderContainer}>
          <Slider
            value={typeof amount === 'number' ? amount : 0}
            onValueChange={(val) => setAmount(Array.isArray(val) ? val[0] : val)}
            minimumValue={10}
            maximumValue={300}
            step={5}
            minimumTrackTintColor="#D35400"
            thumbTintColor="#D35400"
            maximumTrackTintColor={currentTheme.border}
          />
        </View>

        {/* Buton Confirmare pe toată lățimea ecranului */}
        <TouchableOpacity
          style={[styles.confirmBtnFullWidth, isSubmitting && styles.confirmBtnDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.confirmBtnText}>Salvează Înregistrarea</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  container: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 10, paddingVertical: 5 },

  topCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  timeText: { fontSize: 15, fontWeight: 'bold' },
  sectionTitleInline: { fontSize: 14, fontWeight: 'bold' },

  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '48%',
    marginBottom: 6,
    justifyContent: 'center',
  },
  sourceOptionSelected: { backgroundColor: '#D35400', borderColor: '#D35400' },
  sourceText: { fontSize: 11, fontWeight: '600' },
  sourceTextSelected: { color: '#FFF' },

  displayBadge: {
    backgroundColor: '#D35400',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 6,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    minWidth: 40,
    textAlign: 'center',
  },
  unitText: { fontSize: 18, color: '#FFF', marginLeft: 4, fontWeight: '600' },

  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 6,
  },
  quickBtn: {
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    margin: 3,
  },
  quickBtnActive: { backgroundColor: '#D35400', borderColor: '#D35400' },
  quickBtnText: { fontSize: 12, fontWeight: 'bold' },
  quickBtnTextActive: { color: '#FFF' },

  sliderContainer: { width: '100%', paddingHorizontal: 10, marginVertical: 6 },

  confirmBtnFullWidth: {
    backgroundColor: '#D35400',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    elevation: 3,
  },
  confirmBtnDisabled: { backgroundColor: '#A0A0A0' },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});