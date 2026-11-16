import React, { useState } from 'react';
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
  Keyboard,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getStoredSheetUrl,
  saveSheetUrl,
  getBabyName,
  saveBabyName,
  getBabyBirthDate,
  saveBabyBirthDate,
  getDropsEnabled,
  saveDropsEnabled,
  getDiversificationEnabled,
  saveDiversificationEnabled,
  getForceOffline,
  saveForceOffline,
  getTheme,
  saveTheme,
  getLanguage,
  saveLanguage,
  getFontSize,
  saveFontSize,
  getLastEventsDefault,
  saveLastEventsDefault,
  getStatsDefault,
  saveStatsDefault,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { translations } from '../services/translations';
import Constants from 'expo-constants';

export default function SettingsScreen({ navigation }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [babyName, setBabyName] = useState('');
  const [babyBirthDate, setBabyBirthDate] = useState('');
  const [dropsEnabled, setDropsEnabled] = useState(true);
  const [diversificationEnabled, setDiversificationEnabled] = useState(false); // 👈 Implicit false
  const [forceOffline, setForceOffline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLang, setCurrentLang] = useState('ro');
  const [fontSize, setFontSize] = useState('normal');

  const [lastEventsDefault, setLastEventsDefault] = useState(true);
  const [statsDefault, setStatsDefault] = useState(false);

  // Stări pentru DatePicker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());

  const [loading, setLoading] = useState(false);

  const t = translations[currentLang] || translations.ro;

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadSettings = async () => {
        try {
          const url = await getStoredSheetUrl();
          const name = await getBabyName();
          const birthDate = await getBabyBirthDate();
          const drops = await getDropsEnabled();
          const divEnabled = await getDiversificationEnabled();
          const offline = await getForceOffline();
          const themeMode = await getTheme();
          const lang = await getLanguage();
          const fSize = await getFontSize();
          const lEventsDef = await getLastEventsDefault();
          const statsDef = await getStatsDefault();

          if (isMounted) {
            setSheetUrl(url || '');
            setBabyName(name || '');
            setBabyBirthDate(birthDate || '');
            if (birthDate) {
              const parsed = new Date(birthDate);
              if (!isNaN(parsed.getTime())) {
                setPickerDate(parsed);
              }
            }
            setDropsEnabled(drops !== null ? !!drops : true);
            setDiversificationEnabled(divEnabled !== null ? !!divEnabled : false);
            setForceOffline(!!offline);
            setIsDarkMode(themeMode === 'dark');
            setCurrentLang(lang || 'ro');
            setFontSize(fSize || 'normal');
            setLastEventsDefault(lEventsDef !== null ? lEventsDef : true);
            setStatsDefault(statsDef !== null ? statsDef : false);
          }
        } catch (e) {
          console.error(e);
        }
      };

      loadSettings();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPickerDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setBabyBirthDate(`${year}-${month}-${day}`);
    }
  };

  const handleSaveAll = async () => {
    if (loading) return;
    setLoading(true);
    try {
      Keyboard.dismiss();
      await saveSheetUrl(sheetUrl.trim());
      await saveBabyName(babyName.trim());
      await saveBabyBirthDate(babyBirthDate.trim());
      await saveDropsEnabled(dropsEnabled);
      await saveDiversificationEnabled(diversificationEnabled);
      await saveForceOffline(forceOffline);
      await saveTheme(isDarkMode ? 'dark' : 'light');
      await saveLanguage(currentLang);
      await saveFontSize(fontSize);
      await saveLastEventsDefault(lastEventsDefault);
      await saveStatsDefault(statsDefault);

      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-au putut salva setările.');
      setLoading(false);
    }
  };

  const appVersion = Constants.expoConfig?.version;
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* 📌 HEADER */}
        <View style={[styles.fixedHeader, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardTitle, { color: currentTheme.textMain }]}>
                {t.settingsTitle || 'Setări'}
              </Text>
              <Text style={[styles.versionSubText, { color: currentTheme.textSub }]}>
                Versiune v{appVersion}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={currentTheme.textSub} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 📜 SCROLL CONTENT */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Limbă */}
          <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <View style={styles.settingRow}>
              <Text style={[styles.labelInline, { color: currentTheme.textMain }]}>
                {currentLang === 'ro' ? 'Limbă' : currentLang === 'en' ? 'Language' : 'Nyelv'}
              </Text>
              <View style={[styles.row, { flex: 1, justifyContent: 'flex-end', marginLeft: 12 }]}>
                {['ro', 'en', 'hu'].map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.langBtnCompact,
                      { borderColor: currentTheme.border, backgroundColor: currentTheme.inputBackground },
                      currentLang === code && { backgroundColor: '#D35400', borderColor: '#D35400' },
                    ]}
                    onPress={() => setCurrentLang(code)}
                  >
                    <Text
                      style={[
                        styles.langText,
                        { color: currentLang === code ? '#FFF' : currentTheme.textMain },
                      ]}
                    >
                      {code.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Font Listă */}
          <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>
              Dimensiune Font Listă 🔠
            </Text>
            <View style={[styles.row, { marginTop: 8 }]}>
              {[
                { key: 'small', label: 'Mic' },
                { key: 'normal', label: 'Normal' },
                { key: 'large', label: 'Mare' },
                { key: 'extraLarge', label: 'Extra Mare' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.langBtn,
                    { borderColor: currentTheme.border, backgroundColor: currentTheme.inputBackground },
                    fontSize === item.key && { backgroundColor: '#2980B9', borderColor: '#2980B9' },
                  ]}
                  onPress={() => setFontSize(item.key)}
                >
                  <Text
                    style={[
                      styles.langText,
                      { color: fontSize === item.key ? '#FFF' : currentTheme.textMain },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Stare implicită */}
          <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <Text style={[styles.label, { color: currentTheme.textMain, marginBottom: 10 }]}>
              Stare implicită la pornire aplicație ⚙️
            </Text>
            <View style={styles.settingRow}>
              <Text style={[styles.settingText, { color: currentTheme.textMain }]}>Afișează rezumatul (Last Events) ⏱️</Text>
              <Switch
                value={lastEventsDefault}
                onValueChange={setLastEventsDefault}
                trackColor={{ false: '#767577', true: '#D35400' }}
              />
            </View>

            <View style={[styles.settingRow, { marginTop: 12 }]}>
              <Text style={[styles.settingText, { color: currentTheme.textMain }]}>Afișează statisticile (Stats Dashboard) 📊</Text>
              <Switch
                value={statsDefault}
                onValueChange={setStatsDefault}
                trackColor={{ false: '#767577', true: '#2980B9' }}
              />
            </View>
          </View>

          {/* Nume, Dată Naștere (cu DatePicker) & Sheet URL */}
          <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <Text style={[styles.label, { color: currentTheme.textMain }]}>Nume Bebeluș:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              value={babyName}
              onChangeText={setBabyName}
              placeholder="Introduceți numele bebelușului..."
              placeholderTextColor={currentTheme.inputPlaceholder}
            />

            <Text style={[styles.label, { color: currentTheme.textMain, marginTop: 12 }]}>Data Nașterii:</Text>
            <TouchableOpacity
              style={[styles.datePickerBtn, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={currentTheme.textSub} style={{ marginRight: 8 }} />
              <Text style={[styles.datePickerBtnText, { color: babyBirthDate ? currentTheme.inputText : currentTheme.inputPlaceholder }]}>
                {babyBirthDate || 'Selectează data nașterii...'}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}

            <Text style={[styles.label, { color: currentTheme.textMain, marginTop: 12 }]}>Google Sheet WebApp URL:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              value={sheetUrl}
              onChangeText={setSheetUrl}
              placeholder="https://script.google.com/..."
              placeholderTextColor={currentTheme.inputPlaceholder}
              autoCapitalize="none"
            />
          </View>

          {/* Toggle-uri principale (inclusiv Diversificarea setată pe false) */}
          <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingText, { color: currentTheme.textMain }]}>Activează modul Diversificare 🥑</Text>
              <Switch
                value={diversificationEnabled}
                onValueChange={setDiversificationEnabled}
                trackColor={{ false: '#767577', true: '#D35400' }}
              />
            </View>

            <View style={[styles.settingRow, { marginTop: 12 }]}>
              <Text style={[styles.settingText, { color: currentTheme.textMain }]}>Activează notificarea picături zilnice 💧</Text>
              <Switch
                value={dropsEnabled}
                onValueChange={setDropsEnabled}
                trackColor={{ false: '#767577', true: '#27AE60' }}
              />
            </View>

            <View style={[styles.settingRow, { marginTop: 12 }]}>
              <Text style={[styles.settingText, { color: currentTheme.textMain }]}>Forțează modul Offline 📴</Text>
              <Switch
                value={forceOffline}
                onValueChange={setForceOffline}
                trackColor={{ false: '#767577', true: '#E67E22' }}
              />
            </View>

            <View style={[styles.settingRow, { marginTop: 12 }]}>
              <Text style={[styles.settingText, { color: currentTheme.textMain }]}>Mod Întunecat (Dark Theme) 🌙</Text>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#767577', true: '#2980B9' }}
              />
            </View>
          </View>
        </ScrollView>

        {/* 🚀 FOOTER FIX JOS */}
        <View style={[styles.fixedFooter, { backgroundColor: currentTheme.background }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Salvează Setările</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
  },
  fixedHeader: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 2,
    borderWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fixedFooter: {
    paddingTop: 6,
    paddingBottom: 25,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  versionSubText: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  labelInline: { fontSize: 13, fontWeight: 'bold' },
  input: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 13, marginTop: 4 },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
  datePickerBtnText: { fontSize: 13 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  langBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  langBtnCompact: { paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginLeft: 6, minWidth: 55 },
  langText: { fontSize: 11, fontWeight: 'bold' },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});