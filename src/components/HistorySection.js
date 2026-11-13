import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ZZZAnimation from './ZZZAnimation';
import { getFontSize } from '../services/storage';

export default function HistorySection({
  currentTheme,
  filterType,
  setFilterType,
  loading,
  onRefresh,
  sortedDates,
  groupedEntries,
  todayStr,
  collapsedDays,
  toggleDayCollapse,
  cleanTime,
  onOpenActionModal,
  translateType,
  t,
}) {
  const [fontSizeSetting, setFontSizeSetting] = useState('normal');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadFontSetting = async () => {
        const fSize = await getFontSize();
        if (isMounted) {
          setFontSizeSetting(fSize || 'normal');
        }
      };
      loadFontSetting();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const getDynamicStyles = () => {
    if (fontSizeSetting === 'small') {
      return { title: 10, sub: 9, value: 11, header: 10, stat: 9 };
    } else if (fontSizeSetting === 'large') {
      return { title: 14, sub: 12, value: 15, header: 13, stat: 11 };
    } else if (fontSizeSetting === 'extraLarge') {
      return { title: 18, sub: 15, value: 19, header: 16, stat: 13 };
    }
    // Normal (default)
    return { title: 11, sub: 10, value: 12, header: 12, stat: 10 };
  };

  const dynamicFont = getDynamicStyles();

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

  const formatDuration = (totalMins) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const getSleepDurationText = (value) => {
    if (!value) return '';
    const sleepMatch = value.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
    const wakeMatch = value.match(/Trezit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|$)/i);

    if (!sleepMatch || !wakeMatch) return '';

    const startMin = parseTimeToMinutes(sleepMatch[1].trim());
    const endMin = parseTimeToMinutes(wakeMatch[1].trim());

    if (startMin === null || endMin === null) return '';

    let diff = endMin - startMin;
    if (diff < 0) diff += 24 * 60;

    return formatDuration(diff);
  };

  const getSplitSleepParts = (item, dateStr) => {
    const val = String(item?.value || '');
    const isSleepingNow = val.toLowerCase().includes('adormit la') && !val.toLowerCase().includes('trezit la');
    if (isSleepingNow) return [{ ...item, displayPart: 'active' }];

    const sleepMatch = val.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
    const wakeMatch = val.match(/Trezit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|$)/i);

    if (!sleepMatch || !wakeMatch) return [{ ...item, displayPart: 'full' }];

    const sleepStr = sleepMatch[1].trim();
    const wakeStr = wakeMatch[1].trim();
    const startMin = parseTimeToMinutes(sleepStr);
    const endMin = parseTimeToMinutes(wakeStr);

    if (startMin === null || endMin === null) return [{ ...item, displayPart: 'full' }];

    const crossesMidnight = endMin < startMin;
    if (!crossesMidnight) return [{ ...item, displayPart: 'full' }];

    const getNextDateStr = (dStr) => {
      if (dStr === 'Astăzi') {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      }
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return null;
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    };

    const nextDateStr = getNextDateStr(dateStr);
    const totalSleepMinutes = ((24 * 60) - startMin) + endMin;
    const totalDurationText = formatDuration(totalSleepMinutes);

    // Prima parte (ziua precedenta): Fără durată și marcată corect să nu apară ca activă
    const part1 = {
      ...item,
      id: `${item.id}_part1`,
      originalId: item.id,
      displayPart: 'first',
      value: `Adormit la ${sleepStr}`,
      customDurationLabel: '',
    };

    // A doua parte (ziua următoare): Afișează durata totală la trezire
    const part2 = {
      ...item,
      id: `${item.id}_part2`,
      originalId: item.id,
      displayPart: 'second',
      value: `Adormit la 12:00 AM - Trezit la ${wakeStr}`,
      targetDate: nextDateStr,
      customDurationLabel: totalDurationText,
    };

    return [part1, part2];
  };

  const renderSleepDetails = (value, item) => {
    if (!value) return <Text style={[styles.historyValue, { color: currentTheme.tint, fontSize: dynamicFont.value }]}>-</Text>;

    // Verificăm dacă este somn în desfășurare real (doar dacă e activ și nu face parte dintr-un split completat)
    const isSleepingNow =
      value.toLowerCase().includes('adormit la') &&
      !value.toLowerCase().includes('trezit la') &&
      item?.displayPart === 'active';

    if (isSleepingNow) {
      return (
        <View style={[styles.sleepDetailsContainer, { flexDirection: 'row', alignItems: 'center' }]}>
          <ZZZAnimation style={{ marginRight: 4 }} textStyle={{ color: '#2980B9', fontSize: dynamicFont.sub }} />
          <Text style={[styles.sleepDetailTextActive, { color: '#2980B9', fontSize: dynamicFont.sub }]}>Doarme încă...</Text>
        </View>
      );
    }

    const sleepMatch = value.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
    const wakeMatch = value.match(/Trezit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|$)/i);

    const sleepTimeStr = sleepMatch ? sleepMatch[1].trim() : '';
    const wakeTimeStr = wakeMatch ? wakeMatch[1].trim() : '';

    if (sleepTimeStr || wakeTimeStr) {
      return (
        <View style={styles.sleepDetailsContainer}>
          {sleepTimeStr ? (
            <View style={styles.sleepDetailRow}>
              <Ionicons name="moon" size={13} color="#2980B9" style={{ marginRight: 4 }} />
              <Text style={[styles.sleepDetailTextSleep, { color: '#2980B9', fontSize: dynamicFont.sub }]}>{sleepTimeStr}</Text>
            </View>
          ) : null}
          {wakeTimeStr ? (
            <View style={[styles.sleepDetailRow, { marginTop: 2 }]}>
              <Ionicons name="sunny" size={13} color="#E67E22" style={{ marginRight: 4 }} />
              <Text style={[styles.sleepDetailTextWake, { color: '#E67E22', fontSize: dynamicFont.sub }]}>{wakeTimeStr}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return <Text style={[styles.historyValue, { color: currentTheme.tint, fontSize: dynamicFont.value }]}>{value}</Text>;
  };

  const renderIconForType = (type, value) => {
    const cleanType = String(type || '').toLowerCase();
    const cleanValue = String(value || '').toLowerCase();

    if (cleanValue.includes('sân') || cleanValue.includes('sâni') || cleanValue.includes('alăptare')) {
      return <Ionicons name="heart" size={16} color="#D81B60" style={{ marginRight: 8 }} />;
    }
    if (cleanType === 'milk' || cleanType === 'lapte') {
      return <FontAwesome5 name="wine-bottle" size={16} color="#D35400" style={{ marginRight: 8 }} />;
    }
    if (cleanType === 'growth' || cleanType === 'crestere') {
      return <MaterialCommunityIcons name="ruler" size={18} color="#27AE60" style={{ marginRight: 8 }} />;
    }
    if (cleanType === 'mama' || cleanType === 'alaptare') {
      return <Ionicons name="woman-outline" size={18} color="#D81B60" style={{ marginRight: 8 }} />;
    }
    return <Ionicons name="moon-outline" size={18} color="#2980B9" style={{ marginRight: 8 }} />;
  };

  const calculateDayStats = (entries) => {
    let totalMilk = 0;
    let totalSleepMinutes = 0;

    if (!entries || !Array.isArray(entries)) {
      return { totalMilk: 0, sleepHours: '0.0', awakeHours: '0.0' };
    }

    entries.forEach((item) => {
      const type = String(item?.type || '').toLowerCase();
      const val = String(item?.value || '');

      // 1. Calcul lapte
      if (type === 'milk' || type === 'lapte' || type === 'alaptare' || val.toLowerCase().includes('sân')) {
        const mlMatch = val.match(/(\d+)\s*ml/i);
        if (mlMatch) {
          totalMilk += parseInt(mlMatch[1], 10);
        }
      }

      // 2. Calcul somn: adunăm doar de pe rândurile care au durată calculată
      if (type === 'sleep') {
        const durationSource = item.customDurationLabel || '';
        const hMatch = durationSource.match(/(\d+)\s*h/i);
        const mMatch = durationSource.match(/(\d+)\s*m/i);

        if (hMatch || mMatch) {
          const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
          const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
          totalSleepMinutes += (hours * 60) + mins;
        } else if (!item.displayPart || item.displayPart === 'full') {
          const sleepMatch = val.match(/Adormit la\s+([\d:A-Za-z\s]+?)(?=\s*-|\s*Trezit|$)/i);
          const wakeMatch = val.match(/Trezit la\s+([\d:A-Za-z\s]+?)(?=\s*-|$)/i);

          if (sleepMatch && wakeMatch) {
            const startMin = parseTimeToMinutes(sleepMatch[1].trim());
            const endMin = parseTimeToMinutes(wakeMatch[1].trim());
            if (startMin !== null && endMin !== null) {
              let diff = endMin - startMin;
              if (diff > 0) totalSleepMinutes += diff;
            }
          }
        }
      }
    });

    const sleepHoursNum = totalSleepMinutes / 60;
    const clampedSleepHours = Math.min(24.0, sleepHoursNum);
    const sleepHours = clampedSleepHours.toFixed(1);

    const awakeHoursNum = Math.max(0.0, 24.0 - clampedSleepHours);
    const awakeHours = awakeHoursNum.toFixed(1);

    return { totalMilk, sleepHours, awakeHours };
  };

  const isOlderThan7Days = (dateStr) => {
    if (!dateStr || dateStr === 'Astăzi') return false;
    const entryDate = new Date(dateStr);
    const today = new Date();
    const diffTime = today - entryDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  };

  const expandedGroupedEntries = {};
  if (sortedDates && Array.isArray(sortedDates)) {
    sortedDates.forEach((dateStr) => {
      if (!expandedGroupedEntries[dateStr]) expandedGroupedEntries[dateStr] = [];
      const dayEntries = groupedEntries[dateStr] || [];

      dayEntries.forEach((item) => {
        const type = String(item?.type || '').toLowerCase();
        const val = String(item?.value || '').toLowerCase();

        const isBreastFeedingEntry = val.includes('sân') || val.includes('sâni') || val.includes('alăptare');
        const isMilkFeeding = type === 'milk' || type === 'lapte' || type === 'mama' || type === 'alaptare' || isBreastFeedingEntry;

        if (type === 'sleep') {
          const splitParts = getSplitSleepParts(item, dateStr);
          if (splitParts.length > 1) {
            expandedGroupedEntries[dateStr].push(splitParts[0]);
            const nextDay = splitParts[1].targetDate;
            if (nextDay) {
              if (!expandedGroupedEntries[nextDay]) expandedGroupedEntries[nextDay] = [];
              expandedGroupedEntries[nextDay].push(splitParts[1]);
            }
          } else {
            expandedGroupedEntries[dateStr].push(item);
          }
        } else if (filterType === 'all') {
          expandedGroupedEntries[dateStr].push(item);
        } else if (filterType === 'mama') {
          if (type === 'mama' || type === 'alaptare' || isBreastFeedingEntry) {
            expandedGroupedEntries[dateStr].push(item);
          }
        } else if (filterType === 'milk') {
          if (isMilkFeeding) {
            expandedGroupedEntries[dateStr].push(item);
          }
        } else if (type === filterType) {
          expandedGroupedEntries[dateStr].push(item);
        }
      });
    });
  }

  const allActiveDates = Array.from(new Set([...sortedDates, ...Object.keys(expandedGroupedEntries)])).sort().reverse();

  const allGrowthEntries = [];
  allActiveDates.forEach((dateStr) => {
    const dayEntries = expandedGroupedEntries[dateStr] || [];
    dayEntries.forEach((item) => {
      const type = String(item?.type || '').toLowerCase();
      if (type === 'growth' || type === 'crestere') {
        allGrowthEntries.push({ ...item, resolvedDate: dateStr });
      }
    });
  });

  allGrowthEntries.sort((a, b) => {
    const formatToISO = (dStr) => (!dStr || dStr === 'Astăzi' ? new Date().toISOString().split('T')[0] : dStr);
    return new Date(`${formatToISO(a.date || a.resolvedDate)}T${a.time || '00:00'}`) -
           new Date(`${formatToISO(b.date || b.resolvedDate)}T${b.time || '00:00'}`);
  });

  const getCalculatedGrowthDiff = (currentItem) => {
    const valStr = String(currentItem?.value || '');
    const currentKgMatch = valStr.match(/(\d+[\.,]?\d*)\s*kg/i);
    const currentCmMatch = valStr.match(/(\d+[\.,]?\d*)\s*cm/i);

    const currentKg = currentKgMatch ? parseFloat(currentKgMatch[1].replace(',', '.')) : null;
    const currentCm = currentCmMatch ? parseFloat(currentCmMatch[1].replace(',', '.')) : null;

    const currentIndex = allGrowthEntries.findIndex(e => e.id === currentItem.id);
    if (currentIndex <= 0 || currentIndex === -1) return { heightDiff: '', weightDiff: '' };

    const prevItem = allGrowthEntries[currentIndex - 1];
    const prevValStr = String(prevItem?.value || '');
    const prevKgMatch = prevValStr.match(/(\d+[\.,]?\d*)\s*kg/i);
    const prevCmMatch = prevValStr.match(/(\d+[\.,]?\d*)\s*cm/i);

    const prevKg = prevKgMatch ? parseFloat(prevKgMatch[1].replace(',', '.')) : null;
    const prevCm = prevCmMatch ? parseFloat(prevCmMatch[1].replace(',', '.')) : null;

    let heightDiff = '';
    let weightDiff = '';

    if (currentCm !== null && prevCm !== null) {
      const diffCm = (currentCm - prevCm).toFixed(1);
      heightDiff = `${diffCm > 0 ? '+' : ''}${diffCm.replace('.', ',')} cm`;
    }
    if (currentKg !== null && prevKg !== null) {
      const diffKg = (currentKg - prevKg).toFixed(2);
      weightDiff = `${diffKg > 0 ? '+' : ''}${diffKg.replace('.', ',')} kg`;
    }

    return { heightDiff, weightDiff };
  };

  const isGrowthFilter = filterType === 'growth';
  const isMilkFilter = filterType === 'milk';
  const hideSunMoon = isGrowthFilter || isMilkFilter;

  return (
    <View style={[styles.card, { flex: 1, marginTop: 2, backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
      <View style={styles.filterRowContainer}>
        <TouchableOpacity style={[styles.filterIconChip, filterType === 'all' && styles.filterIconChipActive, { borderColor: currentTheme.border }]} onPress={() => setFilterType('all')}>
          <Ionicons name="apps-outline" size={18} color={filterType === 'all' ? '#FFF' : currentTheme.textSub} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterIconChip, filterType === 'milk' && styles.filterIconChipActive, { borderColor: currentTheme.border }]} onPress={() => setFilterType('milk')}>
          <FontAwesome5 name="wine-bottle" size={16} color={filterType === 'milk' ? '#FFF' : '#D35400'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterIconChip, filterType === 'sleep' && styles.filterIconChipActive, { borderColor: currentTheme.border }]} onPress={() => setFilterType('sleep')}>
          <Ionicons name="moon-outline" size={18} color={filterType === 'sleep' ? '#FFF' : '#2980B9'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterIconChip, filterType === 'growth' && styles.filterIconChipActive, { borderColor: currentTheme.border }]} onPress={() => setFilterType('growth')}>
          <MaterialCommunityIcons name="ruler" size={18} color={filterType === 'growth' ? '#FFF' : '#27AE60'} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterIconChip, filterType === 'mama' && styles.filterIconChipActive, { borderColor: currentTheme.border }]} onPress={() => setFilterType('mama')}>
          <Ionicons name="woman-outline" size={18} color={filterType === 'mama' ? '#FFF' : '#D81B60'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.historyList}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[currentTheme.tint]} tintColor={currentTheme.tint} />
        }
      >
        {allActiveDates.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>{t.noActivity}</Text>
        ) : (
          allActiveDates.map((dateStr) => {
            const dayEntries = expandedGroupedEntries[dateStr] || [];
            if (dayEntries.length === 0) return null;

            const isToday = dateStr === todayStr;
            const displayDateLabel = isToday ? 'Astăzi' : dateStr;

            const autoCollapsed = isOlderThan7Days(dateStr);
            const isCollapsed = isGrowthFilter ? false : (collapsedDays[dateStr] !== undefined ? collapsedDays[dateStr] : autoCollapsed);

            const stats = calculateDayStats(dayEntries);

            return (
              <View key={dateStr} style={styles.dayGroupContainer}>
                <TouchableOpacity
                  style={[styles.dayHeaderRow, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
                  onPress={() => toggleDayCollapse(dateStr)}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.row}>
                      <Ionicons name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={16} color={currentTheme.textMain} style={{ marginRight: 6 }} />
                      <Text style={[styles.dayHeaderTitle, { color: currentTheme.textMain, fontSize: dynamicFont.header }]}>📅 {displayDateLabel}</Text>
                    </View>
                    <View style={styles.row}>
                      {stats.totalMilk > 0 && <Text style={[styles.dayStatText, { color: '#D35400', marginRight: 6, fontSize: dynamicFont.stat }]}>🍼 {stats.totalMilk}ml</Text>}
                      {!hideSunMoon && (
                        <>
                          <Text style={[styles.dayStatText, { color: '#E67E22', marginRight: 6, fontSize: dynamicFont.stat }]}>☀️ {stats.awakeHours}h</Text>
                          <Text style={[styles.dayStatText, { color: '#2980B9', fontSize: dynamicFont.stat }]}>🌙 {stats.sleepHours}h</Text>
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {!isCollapsed &&
                  dayEntries.map((item, index) => {
                    const itemKey = `entry_${dateStr}_${index}_${item?.id || index}`;
                    const formattedTime = cleanTime(item?.time);
                    const isSleep = String(item?.type || '').toLowerCase() === 'sleep';
                    const isGrowth = String(item?.type || '').toLowerCase() === 'growth' || String(item?.type || '').toLowerCase() === 'crestere';
                    const { heightDiff, weightDiff } = isGrowth ? getCalculatedGrowthDiff(item) : { heightDiff: '', weightDiff: '' };

                    const realIdForAction = item.originalId || item.id;
                    const sleepDurationLabel = isSleep
                      ? (item.customDurationLabel || getSleepDurationText(item?.value))
                      : '';

                    return (
                      <TouchableOpacity
                        key={itemKey}
                        style={[styles.historyItem, { borderBottomColor: currentTheme.borderColorLight }]}
                        onLongPress={() => {
                          if (onOpenActionModal) {
                            onOpenActionModal({ ...item, id: realIdForAction, date: dateStr, time: item.time });
                          }
                        }}
                      >
                        <View style={[styles.row, { flex: 1, marginRight: 8 }]}>
                          {renderIconForType(item?.type, item?.value)}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyType, { color: currentTheme.textMain, fontSize: dynamicFont.title }]}>
                              {translateType(item?.type)}
                            </Text>
                            {isGrowth ? (
                              <View style={{ marginTop: 2 }}>
                                {heightDiff ? <Text style={[styles.growthSubText, { fontSize: dynamicFont.sub }]}>📏 {heightDiff}</Text> : null}
                                {weightDiff ? <Text style={[styles.growthSubText, { fontSize: dynamicFont.sub }]}>⚖️ {weightDiff}</Text> : null}
                              </View>
                            ) : (
                              <Text style={[styles.historyDateTime, { color: currentTheme.textSub, fontSize: dynamicFont.sub }]}>
                                {isSleep && sleepDurationLabel ? sleepDurationLabel : formattedTime}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.valueRightContainer}>
                          {isSleep ? renderSleepDetails(item?.value, item) : (
                            <Text style={[styles.historyValue, { color: isGrowth ? '#27AE60' : currentTheme.tint, fontSize: dynamicFont.value }]}>
                              {item?.value ? item.value : '-'}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 8, borderRadius: 10, marginBottom: 4, elevation: 1, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  filterRowContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 4, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  filterIconChip: { padding: 6, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flex: 1, marginHorizontal: 3, backgroundColor: 'transparent' },
  filterIconChipActive: { backgroundColor: '#D35400', borderColor: '#D35400' },
  dayGroupContainer: { marginBottom: 6 },
  dayHeaderRow: { padding: 6, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  dayHeaderTitle: { fontWeight: 'bold' },
  dayStatText: { fontWeight: 'bold' },
  historyList: { flex: 1, marginTop: 2 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, paddingLeft: 10 },
  historyType: { fontWeight: 'bold' },
  historyDateTime: { marginTop: 1, fontWeight: '500' },
  growthSubText: { fontWeight: '600', color: '#27AE60', marginTop: 1 },
  valueRightContainer: { alignItems: 'flex-end', justifyContent: 'center', paddingTop: 2 },
  historyValue: { fontWeight: 'bold', textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 12 },
  sleepDetailsContainer: { alignItems: 'flex-end' },
  sleepDetailRow: { flexDirection: 'row', alignItems: 'center' },
  sleepDetailTextSleep: { fontWeight: 'bold' },
  sleepDetailTextWake: { fontWeight: 'bold' },
  sleepDetailTextActive: { fontWeight: 'bold' },
});