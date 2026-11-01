import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ZZZAnimation from './ZZZAnimation';

export default function ActiveSleepBanner({ activeSleepEntry, babyName, t, onWakeUp }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((prev) => prev + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!activeSleepEntry) return null;

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : '';

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const getActiveSleepDuration = (value) => {
    if (!value) return '';
    const sleepMatch = value.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
    if (!sleepMatch) return '';

    const sleepTimeStr = sleepMatch[1].trim();
    const sleepMinutesTotal = parseTimeToMinutes(sleepTimeStr);
    if (sleepMinutesTotal === null) return '';

    const now = new Date();
    const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();

    let diff = currentMinutesTotal - sleepMinutesTotal;
    if (diff < 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const durationStr = getActiveSleepDuration(activeSleepEntry.value);
  const sleepMatch = activeSleepEntry.value.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
  const sleepTimeStr = sleepMatch ? sleepMatch[1].trim() : '';

  return (
    <View style={styles.activeSleepCard}>
      <View style={styles.mainRow}>
        <Ionicons name="moon" size={22} color="#FFF" style={{ marginRight: 8 }} />

        <View style={{ flex: 1, marginRight: 10, justifyContent: 'center' }}>
          <View style={styles.row}>
            <Text style={styles.activeSleepTitle}>{babyName} doarme de</Text>

            {/* Pill-ul distinct pentru durată */}
            {durationStr ? (
              <View style={styles.durationPill}>
                <Text style={styles.durationPillText}>{durationStr}</Text>
              </View>
            ) : null}

            <ZZZAnimation style={{ marginLeft: 4 }} textStyle={{ color: '#FFF', fontSize: 13 }} />
          </View>

          {sleepTimeStr ? (
            <Text style={styles.activeSleepSub}>Adormit la {sleepTimeStr}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.wakeUpBtn} onPress={onWakeUp}>
          <Ionicons name="sunny-outline" size={16} color="#2980B9" style={{ marginRight: 4 }} />
          <Text style={styles.wakeUpBtnText}>{t.wakeUp}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeSleepCard: {
    backgroundColor: '#2980B9',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    elevation: 1
  },
  activeSleepTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  // Stilul pentru noua pilulă a duratei
  durationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Alb semitransparent sau poți pune o culoare solidă
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
    marginRight: 2,
  },
  durationPillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  activeSleepSub: { color: '#EBF5FB', fontSize: 11, marginTop: 1 },
  wakeUpBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch'
  },
  wakeUpBtnText: { color: '#2980B9', fontWeight: 'bold', fontSize: 11 },
});