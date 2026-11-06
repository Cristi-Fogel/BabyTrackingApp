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
      <View style={styles.containerRow}>

        {/* COLOANA STÂNGA: Text dinamic adaptabil */}
        <View style={styles.leftContainer}>
          <Ionicons name="moon" size={22} color="#FFF" style={styles.moonIcon} />

          <View style={styles.textColumn}>
            {/* Container flexibil cu wrap: Dacă încape, stau pe un rând. Dacă nu, doarme+ZZZ coboară. */}
            <View style={styles.titleRow}>
              <Text style={styles.babyNameText}>{babyName} </Text>
              <View style={styles.statusGroup}>
                <Text style={styles.activeSleepTitle}>doarme</Text>
                <ZZZAnimation style={{ marginLeft: 4 }} textStyle={{ color: '#FFF', fontSize: 12 }} />
              </View>
            </View>

            {sleepTimeStr ? (
              <Text style={styles.activeSleepSub}>Adormit la {sleepTimeStr}</Text>
            ) : null}
          </View>
        </View>

        {/* COLOANA DREAPTA: Durata somnului + Butonul de trezire */}
        <View style={styles.rightContainer}>
          {durationStr ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationPillText}>{durationStr}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.wakeUpBtn} onPress={onWakeUp}>
            <Ionicons name="sunny-outline" size={16} color="#2980B9" style={{ marginRight: 6 }} />
            <Text style={styles.wakeUpBtnText}>{t.wakeUp || 'S-a trezit'}</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeSleepCard: {
    backgroundColor: '#2980B9',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    elevation: 2
  },

  // Coloana Stânga
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  moonIcon: {
    marginRight: 8,
    alignSelf: 'center',
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  babyNameText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSleepTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  activeSleepSub: {
    color: '#EBF5FB',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2
  },

  // Coloana Dreapta (Protejată)
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  durationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  durationPillText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  wakeUpBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeUpBtnText: { color: '#2980B9', fontWeight: 'bold', fontSize: 12 },
});
