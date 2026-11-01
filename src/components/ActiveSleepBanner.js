import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ZZZAnimation from './ZZZAnimation';

export default function ActiveSleepBanner({ activeSleepEntry, babyName, t, onWakeUp }) {
  if (!activeSleepEntry) return null;

  return (
    <View style={styles.activeSleepCard}>
      <View style={styles.row}>
        <Ionicons name="moon" size={22} color="#FFF" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Text style={styles.activeSleepTitle}>{t.sleeping(babyName)}</Text>
            <ZZZAnimation style={{ marginLeft: 6 }} textStyle={{ color: '#FFF', fontSize: 13 }} />
          </View>
          <Text style={styles.activeSleepSub}>{activeSleepEntry.value}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.wakeUpBtn} onPress={onWakeUp}>
        <Ionicons name="sunny-outline" size={16} color="#2980B9" style={{ marginRight: 4 }} />
        <Text style={styles.wakeUpBtnText}>{t.wakeUp}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  activeSleepCard: { backgroundColor: '#2980B9', padding: 8, borderRadius: 10, marginBottom: 4, elevation: 1 },
  activeSleepTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  activeSleepSub: { color: '#EBF5FB', fontSize: 11, marginTop: 1 },
  wakeUpBtn: { backgroundColor: '#FFF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  wakeUpBtnText: { color: '#2980B9', fontWeight: 'bold', fontSize: 11 },
});