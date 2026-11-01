import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DropsBanner({ babyName, t, onAdminister }) {
  return (
    <View style={styles.dropsCard}>
      <View style={styles.mainRow}>
        <Ionicons name="medkit-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />

        <View style={{ flex: 1, marginRight: 10, justifyContent: 'center' }}>
          <Text style={styles.dropsTitle}>{t.dropsTitle}</Text>
          <Text style={styles.dropsSub}>{t.dropsSub(babyName)}</Text>
        </View>

        <TouchableOpacity style={styles.dropsBtn} onPress={onAdminister}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#27AE60" style={{ marginRight: 4 }} />
          <Text style={styles.dropsBtnText}>{t.dropsBtn}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dropsCard: { backgroundColor: '#27AE60', padding: 8, borderRadius: 10, marginBottom: 4, elevation: 1 },
  mainRow: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between' },
  dropsTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  dropsSub: { color: '#E8F8F5', fontSize: 11, marginTop: 1 },
  dropsBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch' // Ia toată înălțimea cardului pe verticală
  },
  dropsBtnText: { color: '#27AE60', fontWeight: 'bold', fontSize: 11 },
});