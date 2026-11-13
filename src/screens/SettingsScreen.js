import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getStoredSheetUrl,
  saveSheetUrl,
  getBabyName,
  saveBabyName,
  getDropsEnabled,
  saveDropsEnabled,
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
  const [dropsEnabled, setDropsEnabled] = useState(false);
  const [forceOffline, setForceOffline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLang, setCurrentLang] = useState('ro');
  const [fontSize, setFontSize] = useState('normal');

  const [lastEventsDefault, setLastEventsDefault] = useState(true);
  const [statsDefault, setStatsDefault] = useState(false);

  const [loading, setLoading] = useState(false);

  const [initialState, setInitialState] = useState({
    sheetUrl: '',
    babyName: '',
    dropsEnabled: false,
    forceOffline: false,
    isDarkMode: false,
    currentLang: 'ro',
    fontSize: 'normal',
    lastEventsDefault: true,
    statsDefault: false,
  });

  const t = translations[currentLang] || translations.ro;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadSettings = async () => {
        try {
          const url = await getStoredSheetUrl();
          const name = await getBabyName();
          const drops = await getDropsEnabled();
          const offline = await getForceOffline();
          const themeMode = await getTheme();
          const lang = await getLanguage();
          const fSize = await getFontSize();
          const lEventsDef = await getLastEventsDefault();
          const statsDef = await getStatsDefault();

          if (isMounted) {
            const urlVal = url || '';
            const nameVal = name || '';
            const dropsVal = !!drops;
            const offlineVal = !!offline;
            const darkVal = themeMode === 'dark';
            const langVal = lang || 'ro';
            const fSizeVal = fSize || 'normal';
            const lEventsVal = lEventsDef !== null ? lEventsDef : true;
            const statsVal = statsDef !== null ? statsDef : false;

            setSheetUrl(urlVal);
            setBabyName(nameVal);
            setDropsEnabled(dropsVal);
            setForceOffline(offlineVal);
            setIsDarkMode(darkVal);
            setCurrentLang(langVal);
            setFontSize(fSizeVal);
            setLastEventsDefault(lEventsVal);
            setStatsDefault(statsVal);

            setInitialState({
              sheetUrl: urlVal,
              babyName: nameVal,
              dropsEnabled: dropsVal,
              forceOffline: offlineVal,
              isDarkMode: darkVal,
              currentLang: langVal,
              fontSize: fSizeVal,
              lastEventsDefault: lEventsVal,
              statsDefault: statsVal,
            });
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

  const hasChanges =
    sheetUrl !== initialState.sheetUrl ||
    babyName !== initialState.babyName ||
    dropsEnabled !== initialState.dropsEnabled ||
    forceOffline !== initialState.forceOffline ||
    isDarkMode !== initialState.isDarkMode ||
    currentLang !== initialState.currentLang ||
    fontSize !== initialState.fontSize ||
    lastEventsDefault !== initialState.lastEventsDefault ||
    statsDefault !== initialState.statsDefault;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Modificări nesalvate',
        'Ai modificări care nu au fost salvate. Dorești să ieși fără să salvezi?',
        [
          { text: 'Rămâi', style: 'cancel', onPress: () => {} },
          {
            text: 'Ieși',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasChanges, sheetUrl, babyName, dropsEnabled, forceOffline, isDarkMode, currentLang, fontSize, lastEventsDefault, statsDefault]);

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      await saveSheetUrl(sheetUrl.trim());
      await saveBabyName(babyName.trim());
      await saveDropsEnabled(dropsEnabled);
      await saveForceOffline(forceOffline);
      await saveTheme(isDarkMode ? 'dark' : 'light');
      await saveLanguage(currentLang);
      await saveFontSize(fontSize);
      await saveLastEventsDefault(lastEventsDefault);
      await saveStatsDefault(statsDefault);

      setInitialState({
        sheetUrl: sheetUrl.trim(),
        babyName: babyName.trim(),
        dropsEnabled,
        forceOffline,
        isDarkMode,
        currentLang,
        fontSize,
        lastEventsDefault,
        statsDefault,
      });

      Alert.alert('Succes', 'Setările au fost salvate cu succes!');
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-au putut salva setările.');
    } finally {
      setLoading(false);
    }
  };

  const appVersion = Constants.expoConfig?.version;
  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      {/* 📌 Header Fix */}
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

      {/* 📜 Conținut Scrollabil */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Limbă (Etichetă și butoane pe același rând) */}
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

        {/* Nume & Sheet URL */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={[styles.label, { color: currentTheme.textMain }]}>Nume Bebeluș:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
            value={babyName}
            onChangeText={setBabyName}
            placeholder="Introduceți numele bebelușului..."
            placeholderTextColor={currentTheme.inputPlaceholder}
          />

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

        {/* Toggle-uri principale */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <View style={styles.settingRow}>
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

      {/* 📌 Buton Salvare Fix (cu marginTop: 5 și marginBottom: 20) */}
      <View style={[styles.fixedFooter, { backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}>
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
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
  },
  fixedFooter: {
    paddingTop: 5,         // 💡 Top margin / padding 5px
    paddingBottom: 0,
    borderTopWidth: 1,
    marginBottom: 20,      // 💡 Bottom margin 20px (evită suprapunerea pe Android)
  },
  scrollContent: {
    paddingBottom: 20,
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
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  langBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  langBtnCompact: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginLeft: 4, minWidth: 42 },
  langText: { fontSize: 11, fontWeight: 'bold' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#27AE60', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});