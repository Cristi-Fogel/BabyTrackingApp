import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setActiveSleep, saveLog } from '../services/storage';

export default function SleepTrackerScreen({ navigation }) {
  const [startTime, setStartTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [endTime, setEndTime] = useState('');

  const handleSave = async () => {
    if (endTime.trim().length > 0) {
      // S-a completat și trezirea -> se salvează ca log complet
      await saveLog({
        type: 'sleep',
        startTime: startTime,
        endTime: endTime,
        date: new Date().toISOString(),
      });
    } else {
      // Doar adormire -> devine somn activ pe ecranul principal
      await setActiveSleep({ startTime: startTime });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
          value={endTime}
          onChangeText={setEndTime}
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Creează Înregistrare</Text>
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
  input: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, fontSize: 16 },
  saveBtn: { backgroundColor: '#FF9800', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});