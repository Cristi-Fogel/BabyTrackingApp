import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
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

export default function SleepTrackerScreen() {
  const navigation = useNavigation();

  // Stare nouă pentru data înregistrării (implicit data curentă)
  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Stări pentru ore
  const [startDate, setStartDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);

  const [hasNextMorning, setHasNextMorning] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  const onChangeEntryDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
  };

  const onChangeStartTime = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onChangeEndTime = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
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

      // Folosim data selectată din entryDate
      const year = entryDate.getFullYear();
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const day = String(entryDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const nowIsoString = now.toISOString().replace('T', ' ').substring(0, 19);

      const cleanStart = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const cleanEnd = hasNextMorning
        ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : '';

      const sleepLabel = t.sleepStartLabel || 'Adormit la';
      const wakeLabel = t.wakeEndLabel || 'Trezit la';

      const valueText = cleanEnd
        ? `${sleepLabel} ${cleanStart} - ${wakeLabel} ${cleanEnd}`
        : `${sleepLabel} ${cleanStart}`;

      const newEntry = {
        id: now.getTime().toString(),
        date: dateStr,
        time: cleanStart,
        type: 'sleep',
        value: valueText,
        fullDateTime: `${dateStr} ${cleanStart}`,
      };

      const currentEntries = await getLocalEntries();
      const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
      await saveLocalEntries(updatedEntries);

      const forcedOffline = await getForceOffline();
      if (!forcedOffline) {
        const sheetUrl = await getStoredSheetUrl();
        if (sheetUrl) {
          const success = await sendToSheet(sheetUrl, newEntry);
          if (!success) {
            console.log('Salvat doar local, se va sincroniza ulterior.');
          }
        }
      }

      handleBack();
    } catch (e) {
      console.error('Eroare la salvarea somnului:', e);
      Alert.alert(t.error || 'Eroare', t.saveError || 'Nu s-a putut salva somnul.');
      setIsSubmitting(false);
    }
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString(currentLang === 'ro' ? 'ro-RO' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
       {/* Buton Înapoi la Bebe */}
               <TouchableOpacity
                 style={[
                   styles.backButtonLarge,
                   {
                     backgroundColor: currentTheme.cardBackground,
                     borderColor: currentTheme.border,
                   },
                 ]}
                 onPress={() => {
                   if (navigation && navigation.canGoBack && navigation.canGoBack()) {
                     navigation.goBack();
                   } else {
                     navigation.navigate('Home');
                   }
                 }}
               >
                 <Ionicons name="arrow-back-outline" size={20} color={currentTheme.textMain} style={{ marginRight: 8 }} />
                 <Text style={[styles.backButtonLargeText, { color: currentTheme.textMain }]}>
                   Înapoi
                 </Text>
               </TouchableOpacity>

        <Text style={[styles.title, { color: currentTheme.textMain }]}>
          {t.sleepTitle || 'Înregistrare Somn 🌙'}
        </Text>

        {/* 📅 Selector Data Înregistrării */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: currentTheme.textSub }]}>
            {t.dateLabel || 'Data:'}
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
            onPress={() => setShowDatePicker(true)}
            disabled={isSubmitting}
          >
            <Ionicons name="calendar-outline" size={20} color="#2980B9" style={{ marginRight: 8 }} />
            <Text style={[styles.pickerText, { color: currentTheme.inputText }]}>
              {formatDateDisplay(entryDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={entryDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeEntryDate}
          />
        )}

        {/* 🌙 Ora Adormirii */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: currentTheme.textSub }]}>
            {t.sleepStartTimeLabel || 'Ora adormirii:'}
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
            onPress={() => setShowStartPicker(true)}
            disabled={isSubmitting}
          >
            <Ionicons name="moon-outline" size={20} color="#2980B9" style={{ marginRight: 8 }} />
            <Text style={[styles.pickerText, { color: currentTheme.inputText }]}>
              {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Text>
          </TouchableOpacity>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeStartTime}
          />
        )}

        {/* ☀️ Toggle / Opțiune pentru Ora Trezirii */}
        <View style={styles.inputGroup}>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: currentTheme.textSub }]}>
              {t.sleepEndTimeLabel || 'Ora trezirii:'}
            </Text>
            <TouchableOpacity
              onPress={() => setHasNextMorning(!hasNextMorning)}
              style={[styles.toggleBadge, { backgroundColor: hasNextMorning ? '#2980B9' : currentTheme.inputBackground, borderColor: currentTheme.border }]}
            >
              <Text style={[styles.toggleText, { color: hasNextMorning ? '#FFF' : currentTheme.textSub }]}>
                {hasNextMorning ? 'Activă (Setează ora)' : 'Doarme încă (Fără oră)'}
              </Text>
            </TouchableOpacity>
          </View>

          {hasNextMorning && (
            <TouchableOpacity
              style={[styles.pickerButton, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border, marginTop: 8 }]}
              onPress={() => setShowEndPicker(true)}
              disabled={isSubmitting}
            >
              <Ionicons name="sunny-outline" size={20} color="#E67E22" style={{ marginRight: 8 }} />
              <Text style={[styles.pickerText, { color: currentTheme.inputText }]}>
                {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {showEndPicker && hasNextMorning && (
          <DateTimePicker
            value={endDate}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeEndTime}
          />
        )}

        <TouchableOpacity
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>{t.save || 'Creează Înregistrare'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButtonLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      elevation: 1,
    },
    backButtonLargeText: {
      fontWeight: 'bold',
      fontSize: 14,
    },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: 'bold',
  },

  toggleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  saveBtn: {
    backgroundColor: '#2980B9',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 2,
  },
  saveBtnDisabled: {
    backgroundColor: '#A0A0A0',
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

