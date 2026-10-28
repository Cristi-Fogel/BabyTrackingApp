import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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

export default function GrowthTrackerScreen() {
  const navigation = useNavigation();
  const [weight, setWeight] = useState(''); // kg
  const [height, setHeight] = useState(''); // cm
  const [loading, setLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

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

  const handleBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSave = async () => {
    if (!weight.trim() && !height.trim()) {
      Alert.alert('Atenție', 'Introdu cel puțin o valoare (greutate sau lungime).');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Construim valoarea lizibilă
      const parts = [];
      if (weight.trim()) parts.push(`${weight.trim()} kg`);
      if (height.trim()) parts.push(`${height.trim()} cm`);
      const valueText = parts.join(' | ');

      const cleanId = now.getTime().toString();

      const newEntry = {
        id: cleanId,
        date: dateStr,
        time: timeStr,
        type: 'growth',
        value: valueText,
      };

      // 1. Salvăm local
      const currentEntries = await getLocalEntries();
      const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
      await saveLocalEntries(updatedEntries);

      // 2. Trimitere în Google Sheet (dacă nu e forțat offline)
      const forcedOffline = await getForceOffline();
      if (!forcedOffline) {
        const sheetUrl = await getStoredSheetUrl();
        if (sheetUrl) {
          await sendToSheet(sheetUrl, newEntry);
        }
      }

      handleBack();
    } catch (e) {
      console.error('Eroare la salvarea măsurătorilor:', e);
      Alert.alert('Eroare', 'Nu s-au putut salva datele.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={loading}>
        <Ionicons name="arrow-back" size={24} color={currentTheme.textMain} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: currentTheme.textMain }]}>Creștere & Măsurători 📏</Text>

      <View style={[styles.inputCard, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: currentTheme.textSub }]}>Greutate (kg):</Text>
          <View style={[styles.inputRow, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}>
            <MaterialCommunityIcons name="scale-bathroom" size={24} color="#27AE60" style={styles.icon} />
            <TextInput
              style={[styles.input, { color: currentTheme.inputText }]}
              placeholder="ex: 4.5"
              placeholderTextColor={currentTheme.inputPlaceholder}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: currentTheme.textSub }]}>Lungime / Înălțime (cm):</Text>
          <View style={[styles.inputRow, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}>
            <MaterialCommunityIcons name="ruler" size={24} color="#27AE60" style={styles.icon} />
            <TextInput
              style={[styles.input, { color: currentTheme.inputText }]}
              placeholder="ex: 56"
              placeholderTextColor={currentTheme.inputPlaceholder}
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
              editable={!loading}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Salvează Măsurătoarea</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  backBtn: { marginTop: 10, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  inputCard: { padding: 20, borderRadius: 16, elevation: 2, borderWidth: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16 },
  saveBtn: { backgroundColor: '#27AE60', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, elevation: 2 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});