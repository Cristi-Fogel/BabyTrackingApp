import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
} from '../services/storage';

export default function SettingsScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [babyName, setBabyName] = useState('');
  const [dropsEnabled, setDropsEnabled] = useState(false);

  // Stări noi
  const [forceOffline, setForceOffline] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default'); // 'default' sau 'dark'

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
    getForceOffline().then((offline) => {
      setForceOffline(offline);
    });
    getTheme().then((th) => {
      setSelectedTheme(th);
    });
  }, []);

  const handleSave = async () => {
    await saveSheetUrl(url);
    await saveBabyName(babyName.trim() || 'Bebelușul');
    await saveDropsEnabled(dropsEnabled);
    await saveForceOffline(forceOffline);
    await saveTheme(selectedTheme);

    Alert.alert('Succes', 'Setările au fost salvate cu succes!');
    navigation.goBack();
  };

  const isDark = selectedTheme === 'dark';

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : '#333'} />
      </TouchableOpacity>

      <Text style={[styles.title, isDark && styles.darkText]}>Setări Aplicație ⚙️</Text>

      {/* Setare Nume Bebe */}
      <Text style={[styles.label, isDark && styles.darkSubText]}>Numele Bebe:</Text>
      <TextInput
        style={[styles.inputShort, isDark && styles.darkInput]}
        placeholder="ex: Sofia / David"
        placeholderTextColor={isDark ? '#888' : '#999'}
        value={babyName}
        onChangeText={setBabyName}
      />

      {/* Setare Picături */}
      <View style={[styles.switchRow, isDark && styles.darkCard]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, isDark && styles.darkText]}>Notificare Picături Zilnice</Text>
          <Text style={[styles.subLabel, isDark && styles.darkSubText]}>Afișează reminder pe ecranul principal</Text>
        </View>
        <Switch
          value={dropsEnabled}
          onValueChange={setDropsEnabled}
          trackColor={{ false: '#767577', true: '#27AE60' }}
          thumbColor={dropsEnabled ? '#FFF' : '#f4f3f4'}
        />
      </View>

      {/* 1. Toggle Blochează Sincronizarea (Mod Offline Forțat) */}
      <View style={[styles.switchRow, isDark && styles.darkCard]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[styles.label, isDark && styles.darkText]}>Mod Doar Local (Fără Internet)</Text>
          <Text style={[styles.subLabel, isDark && styles.darkSubText]}>
            Oprește orice conexiune/sincronizare cu Google Sheet până la dezactivare.
          </Text>
        </View>
        <Switch
          value={forceOffline}
          onValueChange={setForceOffline}
          trackColor={{ false: '#767577', true: '#E67E22' }}
          thumbColor={forceOffline ? '#FFF' : '#f4f3f4'}
        />
      </View>

      {/* 2. Selector de Temă */}
      <Text style={[styles.label, { marginTop: 20 }, isDark && styles.darkSubText]}>Temă Interfață:</Text>
      <View style={styles.themeContainer}>
        <TouchableOpacity
          style={[
            styles.themeOption,
            selectedTheme === 'default' && styles.themeOptionSelected,
            isDark && styles.darkCard,
          ]}
          onPress={() => setSelectedTheme('default')}
        >
          <Ionicons name="sunny-outline" size={20} color={selectedTheme === 'default' ? '#D35400' : '#888'} />
          <Text style={[styles.themeText, selectedTheme === 'default' && styles.themeTextActive, isDark && styles.darkText]}>
            Default (Warm)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeOption,
            selectedTheme === 'dark' && styles.themeOptionSelectedDark,
            isDark && styles.darkCard,
          ]}
          onPress={() => setSelectedTheme('dark')}
        >
          <Ionicons name="moon-outline" size={20} color={selectedTheme === 'dark' ? '#9B59B6' : '#888'} />
          <Text style={[styles.themeText, selectedTheme === 'dark' && styles.themeTextActiveDark, isDark && styles.darkText]}>
            Dark Theme
          </Text>
        </TouchableOpacity>
      </View>

      {/* Setare Google Sheet URL */}
      <Text style={[styles.label, { marginTop: 20 }, isDark && styles.darkSubText]}>Google Apps Script Web App URL:</Text>
      <TextInput
        style={[styles.input, isDark && styles.darkInput]}
        multiline
        placeholder="https://script.google.com/macros/s/..."
        placeholderTextColor={isDark ? '#888' : '#999'}
        value={url}
        onChangeText={setUrl}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Salvează Setările</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', padding: 20 },
  darkContainer: { backgroundColor: '#121212' },
  backBtn: { marginTop: 30, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  darkText: { color: '#FFF' },
  darkSubText: { color: '#AAA' },
  label: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
  subLabel: { fontSize: 12, color: '#888' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  darkCard: { backgroundColor: '#1E1E1E', borderColor: '#333' },
  inputShort: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, fontSize: 14, borderWidth: 1, borderColor: '#DDD' },
  input: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#DDD' },
  darkInput: { backgroundColor: '#1E1E1E', borderColor: '#333', color: '#FFF' },

  // Stiluri selector temă
  themeContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 6,
  },
  themeOptionSelected: { borderColor: '#D35400', borderWidth: 2, backgroundColor: '#FDF2E9' },
  themeOptionSelectedDark: { borderColor: '#9B59B6', borderWidth: 2, backgroundColor: '#2C1E38' },
  themeText: { marginLeft: 8, fontWeight: 'bold', fontSize: 13, color: '#666' },
  themeTextActive: { color: '#D35400' },
  themeTextActiveDark: { color: '#9B59B6' },

  saveBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});