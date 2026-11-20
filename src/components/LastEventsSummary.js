import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function LastEventsSummary({
  sortedDates,
  groupedEntries,
  todayStr,
  currentTheme,
}) {
  const parseTimeParts = (timeStr) => {
    if (!timeStr) return null;
    const cleanTimeStr = String(timeStr).replace(/'/g, '').trim();
    const match = cleanTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : '';

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return { hours, minutes };
  };

  const parseEntryDateTime = (dateStr, timeStr) => {
    const parts = parseTimeParts(timeStr);
    if (!parts) return null;

    const targetDateStr =
      !dateStr || dateStr === 'Astăzi' ? todayStr : String(dateStr).trim();
    const dateMatch = targetDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateMatch) {
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);
      return new Date(year, month - 1, day, parts.hours, parts.minutes, 0, 0);
    }

    const fallback = new Date(targetDateStr);
    if (!isNaN(fallback.getTime())) {
      fallback.setHours(parts.hours, parts.minutes, 0, 0);
      return fallback;
    }

    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parts.hours,
      parts.minutes,
      0,
      0
    );
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
    let latestMealDate = null;
    let latestWakeDate = null;
    let latestActiveSleepStartDate = null;

    if (!sortedDates || sortedDates.length === 0 || !groupedEntries) {
      return {
        lastMealElapsed: null,
        lastSleepElapsed: null,
        activeSleepElapsed: null,
        isCurrentlySleeping: false,
      };
    }

    for (const dateStr of sortedDates) {
      const dayEntries = groupedEntries[dateStr] || [];
      const effectiveDateStr = itemDateFallback(dateStr, todayStr);

      for (const item of dayEntries) {
        const type = String(item?.type || '').toLowerCase();
        const val = String(item?.value || '');
        const valLower = val.toLowerCase();

        const isBreastFeeding =
          valLower.includes('sân') ||
          valLower.includes('sâni') ||
          valLower.includes('alăptare');
        const isMilk =
          type === 'milk' ||
          type === 'lapte' ||
          type === 'mama' ||
          type === 'alaptare' ||
          isBreastFeeding;
        const isSolidFood =
          type === 'diversification' || type === 'food' || type === 'solid';

        if (isMilk || isSolidFood) {
          const itemDateStr = item?.date || effectiveDateStr;
          const mealDate = parseEntryDateTime(itemDateStr, item?.time);
          if (
            mealDate &&
            !isNaN(mealDate.getTime()) &&
            (!latestMealDate || mealDate > latestMealDate)
          ) {
            latestMealDate = mealDate;
          }
        }

        if (type === 'sleep') {
          const itemDateStr = item?.date || effectiveDateStr;
          const isSleepingNow =
            valLower.includes('adormit la') && !valLower.includes('trezit la');

          if (isSleepingNow) {
            const sleepOnlyMatch = val.match(/Adormit la\s+([\d:A-Za-z\s]+?)$/i);
            const startTimeStr = sleepOnlyMatch
              ? sleepOnlyMatch[1].trim()
              : item?.time;
            let startDate = parseEntryDateTime(itemDateStr, startTimeStr);

            // Dacă ora de adormire pare să fie din seara precedentă (ex. ora curentă e 02:00 și a adormit la 22:30)
            if (startDate && !isNaN(startDate.getTime()) && startDate > new Date()) {
              startDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
            }

            if (
              startDate &&
              !isNaN(startDate.getTime()) &&
              (!latestActiveSleepStartDate ||
                startDate > latestActiveSleepStartDate)
            ) {
              latestActiveSleepStartDate = startDate;
            }
          } else {
            const sleepMatch = val.match(
              /Adormit la\s+([\d:A-Za-z\s]+?)(?=\s*-|\s*Trezit|$)/i
            );
            const wakeMatch = val.match(/Trezit la\s+([\d:A-Za-z\s]+?)(?=\s*-|$)/i);

            const startDate = sleepMatch
              ? parseEntryDateTime(itemDateStr, sleepMatch[1].trim())
              : null;
            let wakeDate = wakeMatch
              ? parseEntryDateTime(itemDateStr, wakeMatch[1].trim())
              : parseEntryDateTime(itemDateStr, item?.time);

            // Dacă ora de trezire este înaintea orei de adormire, somnul a trecut de miezul nopții
            if (startDate && wakeDate && wakeDate < startDate) {
              wakeDate = new Date(wakeDate.getTime() + 24 * 60 * 60 * 1000);
            }

            if (
              wakeDate &&
              !isNaN(wakeDate.getTime()) &&
              (!latestWakeDate || wakeDate > latestWakeDate)
            ) {
              latestWakeDate = wakeDate;
            }
          }
        }
      }
    }

    // Bebelușul doarme în prezent doar dacă ultimul somn activ este mai recent decât ultima trezire
    const isCurrentlySleeping =
      latestActiveSleepStartDate !== null &&
      (!latestWakeDate || latestActiveSleepStartDate >= latestWakeDate);

    return {
      lastMealElapsed: getTimeElapsedText(latestMealDate),
      lastSleepElapsed: getTimeElapsedText(latestWakeDate),
      activeSleepElapsed: isCurrentlySleeping
        ? getTimeElapsedText(latestActiveSleepStartDate)
        : null,
      isCurrentlySleeping,
    };
  };

  function itemDateFallback(dateStr, todayStr) {
    return !dateStr || dateStr === 'Astăzi' ? todayStr : dateStr;
  }

  const {
    lastMealElapsed,
    lastSleepElapsed,
    activeSleepElapsed,
    isCurrentlySleeping,
  } = calculateTimeElapsedForEvents();

  const sleepingDisplayText = isCurrentlySleeping
    ? activeSleepElapsed
      ? `Doarme • ${activeSleepElapsed.replace(/^Acum\s+/i, '')}`
      : 'Doarme'
    : lastSleepElapsed || 'Niciunul';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: currentTheme.inputBackground,
          borderColor: currentTheme.border,
        },
      ]}
    >
      {/* Secțiunea Masă (lapte sau mâncare solidă) */}
      <View style={styles.statusItem}>
        <View style={styles.headerRow}>
          <FontAwesome5
            name="utensils"
            size={12}
            color="#D35400"
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusLabel, { color: currentTheme.textSub }]}>
            Timp de la masă
          </Text>
        </View>
        <Text
          style={[styles.statusValue, { color: currentTheme.textMain }]}
          numberOfLines={1}
        >
          {lastMealElapsed || 'Niciuna'}
        </Text>
      </View>

      <View
        style={[styles.statusDivider, { backgroundColor: currentTheme.border }]}
      />

      {/* Secțiunea Somn */}
      <View style={styles.statusItem}>
        <View style={styles.headerRow}>
          <Ionicons
            name="moon"
            size={13}
            color="#2980B9"
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusLabel, { color: currentTheme.textSub }]}>
            {isCurrentlySleeping ? 'Stare somn' : 'Timp de la somn'}
          </Text>
        </View>

        <Text
          style={[
            styles.statusValue,
            { color: currentTheme.textMain },
            isCurrentlySleeping && { fontSize: 11 },
          ]}
          numberOfLines={1}
        >
          {sleepingDisplayText}
        </Text>
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