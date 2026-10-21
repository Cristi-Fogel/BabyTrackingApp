import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getStoredSheetUrl,
  saveSheetUrl,
  getBabyName,
  saveBabyName,
  getDropsEnabled,
  saveDropsEnabled,
} from '../services/storage';

export default function SettingsScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [babyName, setBabyName] = useState('');
  const [dropsEnabled, setDropsEnabled] = useState(false);

  useEffect(() => {
    getStoredSheetUrl().then((saved) => {
      if (saved) setUrl(saved);
    });
    getBabyName().then((name) => {
      if (name) setBabyName(name);
    });
    getDropsEnabled().then((enabled) => {
      setDropsEnabled(enabled);
    });
  }, []);

  const handleSave = async () => {
    await saveSheetUrl(url);
    await saveBabyName(babyName.trim() || 'Bebelușul');
    await saveDropsEnabled(dropsEnabled);
    Alert.alert('Succes', 'Setările au fost salvate cu succes!');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Setări Aplicație ⚙️</Text>

      {/* Setare Nume Bebe */}
      <Text style={styles.label}>Numele Bebe:</Text>
      <TextInput
        style={styles.inputShort}
        placeholder="ex: Sofia / David"
        value={babyName}
        onChangeText={setBabyName}
      />

      {/* Setare Picături */}
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Notificare Picături Zilnice</Text>
          <Text style={styles.subLabel}>Afișează reminder pe ecranul principal</Text>
        </View>
        <Switch
          value={dropsEnabled}
          onValueChange={setDropsEnabled}
          trackColor={{ false: '#767577', true: '#27AE60' }}
          thumbColor={dropsEnabled ? '#FFF' : '#f4f3f4'}
        />
      </View>

      {/* Setare Google Sheet URL */}
      <Text style={[styles.label, { marginTop: 20 }]}>Google Apps Script Web App URL:</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="https://script.google.com/macros/s/..."
        value={url}
        onChangeText={setUrl}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Salvează Setările</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', padding: 20 },
  backBtn: { marginTop: 30, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  subLabel: { fontSize: 12, color: '#888' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  inputShort: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1, borderColor: '#DDD' },
  input: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#DDD' },
  saveBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});