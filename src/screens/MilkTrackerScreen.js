import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { useNavigation } from '@react-navigation/native';
import { getLocalEntries, saveLocalEntries, getStoredSheetUrl, sendToSheet } from '../services/storage';

export default function MilkTrackerScreen() {
  const navigation = useNavigation();
  const [amount, setAmount] = useState(90);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const handleBack = () => {
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleSave = async () => {
    try {
      const now = new Date();
      const newEntry = {
        id: now.getTime().toString(),
        date: now.toISOString().split('T')[0], // YYYY-MM-DD
        time: time,
        type: 'milk',
        value: `${amount} ml`,
      };

      // 1. Salvăm local
      const currentEntries = await getLocalEntries();
      const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
      await saveLocalEntries(updatedEntries);

      // 2. Încercăm trimiterea în Google Sheet dacă există URL
      const sheetUrl = await getStoredSheetUrl();
      if (sheetUrl) {
        const success = await sendToSheet(sheetUrl, newEntry);
        if (!success) {
          console.log('Salvat doar local, se va sincroniza ulterior.');
        }
      }

      handleBack();
    } catch (e) {
      console.error('Eroare la salvarea din MilkTracker:', e);
      Alert.alert('Eroare', 'Nu s-a putut salva înregistrarea.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header cu buton înapoi sigur */}
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      {/* 1. Ceasul și input de timp */}
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={20} color="#666" />
        <TextInput
          style={styles.timeInput}
          value={time}
          onChangeText={setTime}
        />
      </View>

      {/* 2. Valoarea de x ml */}
      <View style={styles.displayBadge}>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          value={String(amount)}
          onChangeText={(val) => setAmount(Number(val) || 0)}
        />
        <Text style={styles.unitText}>ml</Text>
      </View>

      {/* 3. Slider-ul */}
      <View style={styles.sliderContainer}>
        <Slider
          value={amount}
          onValueChange={(val) => setAmount(Array.isArray(val) ? val[0] : val)}
          minimumValue={10}
          maximumValue={300}
          step={10}
          minimumTrackTintColor="#D35400"
          thumbTintColor="#D35400"
        />
      </View>

      {/* Buton Confirmare */}
      <TouchableOpacity style={styles.confirmBtn} onPress={handleSave}>
        <Ionicons name="checkmark" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', padding: 20, justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginTop: 30, padding: 10 },
  displayBadge: { backgroundColor: '#D35400', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center' },
  amountInput: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  unitText: { fontSize: 20, color: '#FFF', marginLeft: 6, fontWeight: '600' },
  sliderContainer: { width: '100%', paddingHorizontal: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, elevation: 1 },
  timeInput: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  confirmBtn: { backgroundColor: '#D35400', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 30, elevation: 4 },
});