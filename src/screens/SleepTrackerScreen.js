import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const [startTime, setStartTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [endTime, setEndTime] = useState('');
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

  const handleBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return; // Prevenim trimiterile multiple
    setIsSubmitting(true);

    try {
      const now = new Date();

      // Calcul dată locală curată YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const nowIsoString = now.toISOString().replace('T', ' ').substring(0, 19);

      const cleanStart = startTime.trim() || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cleanEnd = endTime.trim();

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
        fullDateTime: nowIsoString,
      };

      // 1. Salvăm local
      const currentEntries = await getLocalEntries();
      const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
      await saveLocalEntries(updatedEntries);

      // 2. Trimitere în Google Sheet dacă nu e forțat offline
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

      // Navigăm automat înapoi către HomeScreen
      handleBack();
    } catch (e) {
      console.error('Eroare la salvarea somnului:', e);
      Alert.alert(t.error || 'Eroare', t.saveError || 'Nu s-a putut salva somnul.');
      setIsSubmitting(false); // Reactivăm butonul doar dacă apare o eroare
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={isSubmitting}>
        <Ionicons name="arrow-back" size={24} color={currentTheme.textMain} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: currentTheme.textMain }]}>
        {t.sleepTitle || 'Înregistrare Somn 🌙'}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.textSub }]}>
          {t.sleepStartTimeLabel || 'Ora adormirii:'}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
          value={startTime}
          onChangeText={setStartTime}
          placeholderTextColor={currentTheme.inputPlaceholder}
          editable={!isSubmitting}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: currentTheme.textSub }]}>
          {t.sleepEndTimeLabel || 'Ora trezirii (Opțional):'}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
          placeholder={t.sleepEndTimePlaceholder || 'Lăsați gol dacă doarme acum'}
          placeholderTextColor={currentTheme.inputPlaceholder}
          value={endTime}
          onChangeText={setEndTime}
          editable={!isSubmitting}
        />
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  backBtn: { marginTop: 10, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: {
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
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