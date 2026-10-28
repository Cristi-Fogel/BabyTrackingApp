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
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { translations } from '../services/translations';

export default function SettingsScreen({ navigation }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [babyName, setBabyName] = useState('');
  const [dropsEnabled, setDropsEnabled] = useState(false);
  const [forceOffline, setForceOffline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentLang, setCurrentLang] = useState('ro');
  const [loading, setLoading] = useState(false);

  // Stări inițiale pentru a detecta dacă s-au făcut modificări
  const [initialState, setInitialState] = useState({
    sheetUrl: '',
    babyName: '',
    dropsEnabled: false,
    forceOffline: false,
    isDarkMode: false,
    currentLang: 'ro',
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

          if (isMounted) {
            const urlVal = url || '';
            const nameVal = name || '';
            const dropsVal = !!drops;
            const offlineVal = !!offline;
            const darkVal = themeMode === 'dark';
            const langVal = lang || 'ro';

            setSheetUrl(urlVal);
            setBabyName(nameVal);
            setDropsEnabled(dropsVal);
            setForceOffline(offlineVal);
            setIsDarkMode(darkVal);
            setCurrentLang(langVal);

            // Salvăm starea inițială pentru comparație
            setInitialState({
              sheetUrl: urlVal,
              babyName: nameVal,
              dropsEnabled: dropsVal,
              forceOffline: offlineVal,
              isDarkMode: darkVal,
              currentLang: langVal,
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

  // Verificăm dacă există modificări nesalvate
  const hasChanges =
    sheetUrl !== initialState.sheetUrl ||
    babyName !== initialState.babyName ||
    dropsEnabled !== initialState.dropsEnabled ||
    forceOffline !== initialState.forceOffline ||
    isDarkMode !== initialState.isDarkMode ||
    currentLang !== initialState.currentLang;

  // Interceptăm butonul de back / ieșire din ecran
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
  }, [navigation, hasChanges, sheetUrl, babyName, dropsEnabled, forceOffline, isDarkMode, currentLang]);

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      await saveSheetUrl(sheetUrl.trim());
      await saveBabyName(babyName.trim());
      await saveDropsEnabled(dropsEnabled);
      await saveForceOffline(forceOffline);
      await saveTheme(isDarkMode ? 'dark' : 'light');
      await saveLanguage(currentLang);

      setInitialState({
        sheetUrl: sheetUrl.trim(),
        babyName: babyName.trim(),
        dropsEnabled,
        forceOffline,
        isDarkMode,
        currentLang,
      });

      Alert.alert('Succes', 'Setările au fost salvate cu succes!');
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-au putut salva setările.');
    } finally {
      setLoading(false);
    }
  };

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      {/* Header Setări */}
      <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: currentTheme.textMain }]}>
            {t.settingsTitle || 'Setări'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={currentTheme.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Secțiune Limbă / Language Selector */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={[styles.label, { color: currentTheme.textMain }]}>
            {t.language || 'Limbă / Language / Nyelv'}
          </Text>
          <View style={[styles.row, { marginTop: 8 }]}>
            {['ro', 'en', 'hu'].map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.langBtn,
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

        {/* Secțiune Nume Bebeluș & Google Sheet */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={[styles.label, { color: currentTheme.textMain }]}>Nume Bebeluș:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
            value={babyName}
            onChangeText={setBabyName}
            placeholder="Introduceți numele bebelușului..."
            placeholderTextColor={currentTheme.inputPlaceholder}
          />

          <Text style={[styles.label, { color: currentTheme.textMain, marginTop: 10 }]}>Google Sheet WebApp URL:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
            value={sheetUrl}
            onChangeText={setSheetUrl}
            placeholder="https://script.google.com/..."
            placeholderTextColor={currentTheme.inputPlaceholder}
            autoCapitalize="none"
          />
        </View>

        {/* Secțiune Toggle-uri */}
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

        {/* Buton Salvare */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 10,
    // Corectare padding superior în funcție de sistemul de operare pentru a evita suprapunerea cu ceasul/bateria
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
  },
  card: { padding: 12, borderRadius: 10, marginBottom: 8, elevation: 2, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 13 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
  langBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  langText: { fontSize: 13, fontWeight: 'bold' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#27AE60', paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4, marginBottom: 15 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});