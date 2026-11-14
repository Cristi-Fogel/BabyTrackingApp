import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground } from 'react-native';
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
    <View style={styles.cardContainer}>
      <ImageBackground
        source={require('../../assets/bear-sleep.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <View style={styles.imageOverlay}>
          <View style={styles.contentRow}>

            {/* COLOANA 1: Nume + Adormit la... */}
            <View style={styles.leftColumn}>
              <View style={styles.titleLine}>
                <Text style={styles.mainTitle} numberOfLines={1} ellipsizeMode="tail">
                  {babyName} doarme
                </Text>
                <ZZZAnimation style={{ marginLeft: 6 }} textStyle={{ color: '#FFE082', fontSize: 15, fontWeight: 'bold' }} />
              </View>

              {sleepTimeStr ? (
                <View style={styles.timeSubLine}>
                  <Ionicons name="time-outline" size={13} color="#EBF5FB" style={{ marginRight: 4 }} />
                  <Text style={styles.activeSleepSub}>Adormit la {sleepTimeStr}</Text>
                </View>
              ) : null}
            </View>

            {/* COLOANA 2: Pilula de durată (separată) */}
            <View style={styles.middleColumn}>
              {durationStr ? (
                <View style={styles.durationPill}>
                  <Text style={styles.durationPillText}>{durationStr}</Text>
                </View>
              ) : null}
            </View>

            {/* COLOANA 3: Butonul de trezire */}
            <View style={styles.rightColumn}>
              <TouchableOpacity style={styles.wakeUpBtn} onPress={onWakeUp} activeOpacity={0.8}>
                <Ionicons name="sunny-outline" size={19} color="#2980B9" style={{ marginRight: 6 }} />
                <Text style={styles.wakeUpBtnText}>{t.wakeUp || 'S-a trezit!'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    marginBottom: 6,
    overflow: 'hidden',
    elevation: 3,
    backgroundColor: '#2980B9',
  },
  backgroundImage: {
    width: '100%',
  },
  backgroundImageStyle: {
    resizeMode: 'cover',
    transform: [{ scaleX: -1 }],
  },
  imageOverlay: {
    backgroundColor: 'rgba(41, 128, 185, 0.6)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Coloana 1: Nume + Ora de somn
  leftColumn: {
    flex: 1.3,
    justifyContent: 'center',
    marginRight: 8,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  timeSubLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSleepSub: {
    color: '#F0F3F4',
    fontSize: 12.5,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Coloana 2: Pilula de durată
  middleColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  durationPill: {
    backgroundColor: '#FFE082',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  durationPillText: {
    color: '#7D6608',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  // Coloana 3: Butonul
  rightColumn: {
    justifyContent: 'center',
  },
  wakeUpBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  wakeUpBtnText: {
    color: '#2980B9',
    fontWeight: 'bold',
    fontSize: 14,
  },
});