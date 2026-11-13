import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function LastEventsSummary({
  sortedDates,
  groupedEntries,
  todayStr,
  currentTheme,
}) {
  const parseEntryDateTime = (dateStr, timeStr) => {
    if (!timeStr) return null;

    let targetDateStr = dateStr === 'Astăzi' || !dateStr ? todayStr : dateStr;

    const cleanTimeStr = String(timeStr).replace(/'/g, '').trim();
    const match = cleanTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : '';

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = targetDateStr.split('-').map(Number);
    if (!year || !month || !day) return new Date();

    return new Date(year, month - 1, day, hours, minutes, 0);
  };

  const getTimeElapsedText = (targetDate) => {
    if (!targetDate || isNaN(targetDate.getTime())) return null;

    const now = new Date();
    const diffMs = now - targetDate;
    if (diffMs < 0) return 'Acum câteva clipe';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;

    if (h === 0 && m === 0) return 'Acum câteva clipe';
    if (h === 0) return `Acum ${m}m`;
    if (m === 0) return `Acum ${h}h`;
    return `Acum ${h}h ${m}m`;
  };

  const calculateTimeElapsedForEvents = () => {
    let lastMilkElapsed = null;
    let lastSleepElapsed = null;
    let isCurrentlySleeping = false;

    if (!sortedDates || sortedDates.length === 0 || !groupedEntries) {
      return { lastMilkElapsed, lastSleepElapsed, isCurrentlySleeping };
    }

    let checkedFirstSleep = false;

    for (const dateStr of sortedDates) {
      const dayEntries = groupedEntries[dateStr] || [];
      for (const item of dayEntries) {
        const type = String(item?.type || '').toLowerCase();
        const val = String(item?.value || '').toLowerCase();

        const isBreastFeeding = val.includes('sân') || val.includes('sâni') || val.includes('alăptare');
        const isMilk = type === 'milk' || type === 'lapte' || type === 'mama' || type === 'alaptare' || isBreastFeeding;

        if (!lastMilkElapsed && isMilk) {
          const eventDate = parseEntryDateTime(dateStr === todayStr ? todayStr : dateStr, item.time);
          lastMilkElapsed = getTimeElapsedText(eventDate);
        }

        if (!lastSleepElapsed && type === 'sleep') {
          if (!checkedFirstSleep) {
            checkedFirstSleep = true;
            const isSleepingNow = val.includes('adormit la') && !val.includes('trezit la');
            if (isSleepingNow) {
              isCurrentlySleeping = true;
            }
          }

          if (!isCurrentlySleeping) {
            const eventDate = parseEntryDateTime(dateStr === todayStr ? todayStr : dateStr, item.time);
            lastSleepElapsed = getTimeElapsedText(eventDate);
          }
        }

        if (lastMilkElapsed && (lastSleepElapsed || isCurrentlySleeping)) break;
      }
      if (lastMilkElapsed && (lastSleepElapsed || isCurrentlySleeping)) break;
    }

    return { lastMilkElapsed, lastSleepElapsed, isCurrentlySleeping };
  };

  const { lastMilkElapsed, lastSleepElapsed, isCurrentlySleeping } = calculateTimeElapsedForEvents();

  return (
    <View style={[styles.card, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}>
      {/* Secțiunea Masă */}
      <View style={styles.statusItem}>
        <View style={styles.headerRow}>
          <FontAwesome5 name="wine-bottle" size={12} color="#D35400" style={{ marginRight: 4 }} />
          <Text style={[styles.statusLabel, { color: currentTheme.textSub }]}>Timp de la masă</Text>
        </View>
        <Text style={[styles.statusValue, { color: currentTheme.textMain }]} numberOfLines={1}>
          {lastMilkElapsed || 'Niciuna'}
        </Text>
      </View>

      <View style={[styles.statusDivider, { backgroundColor: currentTheme.border }]} />

      {/* Secțiunea Somn */}
      <View style={styles.statusItem}>
        <View style={styles.headerRow}>
          <Ionicons name="moon" size={13} color="#2980B9" style={{ marginRight: 4 }} />
          <Text style={[styles.statusLabel, { color: currentTheme.textSub }]}>Timp de la somn</Text>
        </View>

        {isCurrentlySleeping ? (
          <Text style={[styles.statusValue, { color: currentTheme.textMain }]} numberOfLines={1}>
            Doarme
          </Text>
        ) : (
          <Text style={[styles.statusValue, { color: currentTheme.textMain }]} numberOfLines={1}>
            {lastSleepElapsed || 'Niciunul'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusDivider: {
    width: 1,
    height: '70%',
    marginHorizontal: 2,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});