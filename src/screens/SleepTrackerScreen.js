import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  sendToSheet,
} from '../services/storage';

export default function SleepTrackerScreen() {
  const navigation = useNavigation();
  const [startTime, setStartTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const valueText = cleanEnd
        ? `Adormit la ${cleanStart} - Trezit la ${cleanEnd}`
        : `Adormit la ${cleanStart}`;

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

      // 2. Trimitere în Google Sheet dacă există URL
      const sheetUrl = await getStoredSheetUrl();
      if (sheetUrl) {
        const success = await sendToSheet(sheetUrl, newEntry);
        if (!success) {
          console.log('Salvat doar local, se va sincroniza ulterior.');
        }
      }

      // Navigăm automat înapoi către HomeScreen
      handleBack();
    } catch (e) {
      console.error('Eroare la salvarea somnului:', e);
      Alert.alert('Eroare', 'Nu s-a putut salva somnul.');
      setIsSubmitting(false); // Reactivăm butonul doar dacă apare o eroare
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Înregistrare Somn 🌙</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ora adormirii:</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ora trezirii (Opțional):</Text>
        <TextInput
          style={styles.input}
          placeholder="Lăsați gol dacă doarme acum"
          placeholderTextColor="#999"
          value={endTime}
          onChangeText={setEndTime}
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
          <Text style={styles.saveBtnText}>Creează Înregistrare</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', padding: 20 },
  backBtn: { marginTop: 30, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  input: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, fontSize: 16, color: '#333' },
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