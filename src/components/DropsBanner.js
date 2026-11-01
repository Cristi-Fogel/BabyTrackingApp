import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DropsBanner({ babyName, t, onAdminister }) {
  return (
    <View style={styles.dropsCard}>
      <View style={styles.dropsContentRow}>
        <Ionicons name="medkit-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.dropsTitle}>{t.dropsTitle}</Text>
          <Text style={styles.dropsSub}>{t.dropsSub(babyName)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.dropsBtn} onPress={onAdminister}>
        <Ionicons name="checkmark-circle-outline" size={16} color="#27AE60" style={{ marginRight: 4 }} />
        <Text style={styles.dropsBtnText}>{t.dropsBtn}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dropsCard: { backgroundColor: '#27AE60', padding: 10, borderRadius: 10, marginBottom: 4, elevation: 1 },
  dropsContentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dropsTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  dropsSub: { color: '#E8F8F5', fontSize: 11, marginTop: 1 },
  dropsBtn: { backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  dropsBtnText: { color: '#27AE60', fontWeight: 'bold', fontSize: 11 },
});