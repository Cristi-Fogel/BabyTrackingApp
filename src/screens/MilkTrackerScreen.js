import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { saveLog } from '../services/storage';

export default function MilkTrackerScreen({ navigation }) {
  const [amount, setAmount] = useState(80);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const handleSave = async () => {
    const logEntry = {
      type: 'milk',
      amount: amount,
      time: time,
      date: new Date().toISOString(),
    };
    await saveLog(logEntry);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header cu buton înapoi */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      {/* Indicator principal valoare */}
      <View style={styles.displayBadge}>
        <TextInput
          style={styles.amountInput}
          keyboardType="numeric"
          value={String(amount)}
          onChangeText={(val) => setAmount(Number(val) || 0)}
        />
        <Text style={styles.unitText}>ml</Text>
      </View>

      {/* Slider / Control Riglă */}
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

      {/* Selector/Câmp Oră */}
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={20} color="#666" />
        <TextInput
          style={styles.timeInput}
          value={time}
          onChangeText={setTime}
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
  timeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  timeInput: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  confirmBtn: { backgroundColor: '#D35400', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 30, elevation: 4 },
});