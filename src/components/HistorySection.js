import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import ZZZAnimation from './ZZZAnimation';

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
  getGrowthDifferenceText,
  handleOpenEditModal,
  handleDeleteEntry,
  translateType,
  t,
}) {
  const renderSleepDetails = (value) => {
    if (!value) return <Text style={[styles.historyValue, { color: currentTheme.tint }]}>-</Text>;

    const isSleepingNow = value.toLowerCase().includes('adormit la') && !value.toLowerCase().includes('trezit la');
    if (isSleepingNow) {
      return (
        <View style={[styles.sleepDetailsContainer, { flexDirection: 'row', alignItems: 'center' }]}>
          <ZZZAnimation style={{ marginRight: 4 }} textStyle={{ color: '#2980B9', fontSize: 11 }} />
          <Text style={[styles.sleepDetailTextActive, { color: '#2980B9' }]}>Doarme încă...</Text>
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
              <Text style={[styles.sleepDetailTextSleep, { color: '#2980B9' }]}>{sleepTimeStr}</Text>
            </View>
          ) : null}
          {wakeTimeStr ? (
            <View style={[styles.sleepDetailRow, { marginTop: 2 }]}>
              <Ionicons name="sunny" size={13} color="#E67E22" style={{ marginRight: 4 }} />
              <Text style={[styles.sleepDetailTextWake, { color: '#E67E22' }]}>{wakeTimeStr}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return <Text style={[styles.historyValue, { color: currentTheme.tint }]}>{value}</Text>;
  };

  const renderIconForType = (type) => {
    const cleanType = String(type || '').toLowerCase();
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

  return (
    <View style={[styles.card, { flex: 1, marginTop: 2, backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
      {/* Rând Filtre cu Iconițe */}
      <View style={styles.filterRowContainer}>
        <TouchableOpacity
          style={[styles.filterIconChip, filterType === 'all' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
          onPress={() => setFilterType('all')}
        >
          <Ionicons name="apps-outline" size={18} color={filterType === 'all' ? '#FFF' : currentTheme.textSub} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterIconChip, filterType === 'milk' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
          onPress={() => setFilterType('milk')}
        >
          <FontAwesome5 name="wine-bottle" size={16} color={filterType === 'milk' ? '#FFF' : '#D35400'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterIconChip, filterType === 'sleep' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
          onPress={() => setFilterType('sleep')}
        >
          <Ionicons name="moon-outline" size={18} color={filterType === 'sleep' ? '#FFF' : '#2980B9'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterIconChip, filterType === 'growth' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
          onPress={() => setFilterType('growth')}
        >
          <MaterialCommunityIcons name="ruler" size={18} color={filterType === 'growth' ? '#FFF' : '#27AE60'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterIconChip, filterType === 'mama' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
          onPress={() => setFilterType('mama')}
        >
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
        {sortedDates.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>{t.noActivity}</Text>
        ) : (
          sortedDates.map((dateStr) => {
            const dayEntries = groupedEntries[dateStr];
            const isToday = dateStr === todayStr;
            const displayDateLabel = isToday ? 'Astăzi' : dateStr;
            const isCollapsed = !!collapsedDays[dateStr];

            return (
              <View key={dateStr} style={styles.dayGroupContainer}>
                <TouchableOpacity
                  style={[styles.dayHeaderRow, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
                  onPress={() => toggleDayCollapse(dateStr)}
                >
                  <View style={styles.row}>
                    <Ionicons
                      name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={16}
                      color={currentTheme.textMain}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.dayHeaderTitle, { color: currentTheme.textMain }]}>
                      📅 {displayDateLabel} ({dayEntries.length})
                    </Text>
                  </View>
                </TouchableOpacity>

                {!isCollapsed &&
                  dayEntries.map((item, index) => {
                    const itemKey = `entry_${dateStr}_${index}_${item.id || index}`;
                    const formattedTime = cleanTime(item.time);
                    const isSleep = String(item.type || '').toLowerCase() === 'sleep';
                    const isGrowth = String(item.type || '').toLowerCase() === 'growth' || String(item.type || '').toLowerCase() === 'crestere';

                    return (
                      <TouchableOpacity
                        key={itemKey}
                        style={[styles.historyItem, { borderBottomColor: currentTheme.borderColorLight }]}
                        onLongPress={() => {
                          Alert.alert(t.actionTitle, t.actionSub, [
                            { text: t.cancel, style: 'cancel' },
                            { text: t.edit, onPress: () => handleOpenEditModal(item) },
                            { text: t.delete, style: 'destructive', onPress: () => handleDeleteEntry(item.id) },
                          ]);
                        }}
                      >
                        <View style={[styles.row, { flex: 1, marginRight: 8 }]}>
                          {renderIconForType(item.type)}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyType, { color: currentTheme.textMain }]}>
                              {translateType(item.type)}
                            </Text>
                            <Text style={[styles.historyDateTime, { color: currentTheme.textSub }]}>
                              {isGrowth ? getGrowthDifferenceText(item) : formattedTime}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.valueRightContainer}>
                          {isSleep ? renderSleepDetails(item.value) : <Text style={[styles.historyValue, { color: currentTheme.tint }]}>{item.value || '-'}</Text>}
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
  filterRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 4,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  filterIconChip: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: 'transparent',
  },
  filterIconChipActive: { backgroundColor: '#D35400', borderColor: '#D35400' },
  dayGroupContainer: { marginBottom: 6 },
  dayHeaderRow: { padding: 6, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  dayHeaderTitle: { fontSize: 12, fontWeight: 'bold' },
  historyList: { flex: 1, marginTop: 2 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, paddingLeft: 10 },
  historyType: { fontWeight: 'bold', fontSize: 11 },
  historyDateTime: { fontSize: 10, marginTop: 1, fontWeight: '500' },
  valueRightContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  historyValue: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 12 },
  sleepDetailsContainer: { alignItems: 'flex-end' },
  sleepDetailRow: { flexDirection: 'row', alignItems: 'center' },
  sleepDetailTextSleep: { fontSize: 11, fontWeight: 'bold' },
  sleepDetailTextWake: { fontSize: 11, fontWeight: 'bold' },
  sleepDetailTextActive: { fontSize: 11, fontWeight: 'bold' },
});