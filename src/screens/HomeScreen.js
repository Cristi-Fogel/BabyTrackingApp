import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { getSheetUrl, getLogs, getActiveSleep, setActiveSleep, saveLog } from '../services/storage';

export default function HomeScreen({ navigation }) {
  const [hasSheet, setHasSheet] = useState(false);
  const [logs, setLogs] = useState([]);
  const [activeSleep, setActiveSleepState] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    loadData();
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const url = await getSheetUrl();
    setHasSheet(!!url && url.trim().length > 0);
    const savedLogs = await getLogs();
    setLogs(savedLogs);
    const currentSleep = await getActiveSleep();
    setActiveSleepState(currentSleep);
  };

  const handleEndSleep = async () => {
    if (!activeSleep) return;
    const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logEntry = {
      type: 'sleep',
      startTime: activeSleep.startTime,
      endTime: endTime,
      date: new Date().toISOString(),
    };

    await saveLog(logEntry);
    await setActiveSleep(null);
    setActiveSleepState(null);
    loadData();
  };

  return (
    <View style={styles.container}>
      {/* Header cu status Google Link & Setări */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          {hasSheet ? (
            <View style={styles.connectedRow}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Ionicons name="document-text" size={18} color="#555" style={{ marginLeft: 4 }} />
              <Text style={styles.statusText}>Conectat</Text>
            </View>
          ) : (
            <Text style={styles.disconnectedText}>Google Sheet neconfigurat</Text>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Opțiuni Principale (Somn, Lapte, Mâncare) */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SleepTracker')}>
          <View style={[styles.iconBg, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="moon" size={28} color="#FF9800" />
          </View>
          <Text style={styles.actionLabel}>Somn</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MilkTracker')}>
          <View style={[styles.iconBg, { backgroundColor: '#E1F5FE' }]}>
            <FontAwesome5 name="baby-carriage" size={24} color="#03A9F4" />
          </View>
          <Text style={styles.actionLabel}>Lapte</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, { opacity: 0.5 }]} disabled={true}>
          <View style={[styles.iconBg, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="restaurant" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.actionLabel}>Mâncare</Text>
          <Text style={styles.subText}>În curând</Text>
        </TouchableOpacity>
      </View>

      {/* Somn activ în curs */}
      {activeSleep && (
        <View style={styles.activeSleepCard}>
          <Ionicons name="bed" size={24} color="#FF9800" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.activeSleepTitle}>Bebelușul doarme în prezent</Text>
            <Text style={styles.activeSleepTime}>A adormit la: {activeSleep.startTime}</Text>
          </View>
          <TouchableOpacity style={styles.wakeButton} onPress={handleEndSleep}>
            <Text style={styles.wakeButtonText}>S-a trezit</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista / Timeline cu istoric */}
      <Text style={styles.sectionTitle}>Istoric Activitate</Text>
      <ScrollView style={{ flex: 1 }}>
        {logs.map((item, index) => (
          <View key={index} style={styles.logCard}>
            <Text style={styles.logType}>
              {item.type === 'milk' ? `🍼 Lapte: ${item.amount} ml` : `🌙 Somn: ${item.startTime} - ${item.endTime}`}
            </Text>
            <Text style={styles.logTime}>{item.time || item.startTime}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingTop: 50, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { backgroundColor: '#EFEBE4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  connectedRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, color: '#4CAF50', fontWeight: '600', marginLeft: 4 },
  disconnectedText: { fontSize: 12, color: '#9E9E9E' },
  iconBtn: { padding: 8, backgroundColor: '#EFEBE4', borderRadius: 20 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  actionCard: { backgroundColor: '#FFF', width: '30%', padding: 15, borderRadius: 20, alignItems: 'center', elevation: 2 },
  iconBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  subText: { fontSize: 9, color: '#999', marginTop: 2 },
  activeSleepCard: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  activeSleepTitle: { fontWeight: 'bold', color: '#E65100' },
  activeSleepTime: { fontSize: 12, color: '#EF6C00' },
  wakeButton: { backgroundColor: '#FF9800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  wakeButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#444' },
  logCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  logType: { fontWeight: '600', color: '#333' },
  logTime: { color: '#888', fontSize: 12 },
});