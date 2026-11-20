// istoric pentru un tip de mancare selectat

import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  extractFoodNameFromEntry,
  extractQuantityFromEntry,
  extractAllergyTypeFromEntry,
  isAllergyReaction,
} from './DiversificationHistoryItem';

const MIN_OK_EXPOSURES = 3;

export default function FoodHistoryModal({
  visible,
  foodName,
  groupedEntries,
  todayStr,
  cleanTime,
  currentTheme,
  onClose,
}) {
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShowInfo(false);
    }
  }, [visible, foodName]);

  const entriesForFood = useMemo(() => {
    if (!foodName || !groupedEntries) return [];
    const targetKey = String(foodName).trim().toLowerCase();
    const collected = [];

    Object.keys(groupedEntries).forEach((dateKey) => {
      const dayList = Array.isArray(groupedEntries[dateKey])
        ? groupedEntries[dateKey]
        : [];

      dayList.forEach((entry, idx) => {
        const type = String(entry?.type || '').toLowerCase();
        const isDiv =
          type === 'diversification' || type === 'food' || type === 'solid';
        if (!isDiv) return;

        const entryFood = extractFoodNameFromEntry(entry).toLowerCase();
        if (entryFood === targetKey) {
          const resolvedDate = entry?.date || dateKey;
          const displayDate =
            resolvedDate === todayStr || resolvedDate === 'Astăzi'
              ? 'Astăzi'
              : resolvedDate;

          collected.push({
            id: entry?.id || `${dateKey}_${idx}`,
            displayDate,
            rawDate: resolvedDate,
            timeText: cleanTime ? cleanTime(entry?.time) : entry?.time || '-',
            quantity: extractQuantityFromEntry(entry),
            allergyType: extractAllergyTypeFromEntry(entry),
            hasAllergy: isAllergyReaction(entry),
            fullDateTime: entry?.fullDateTime || '',
          });
        }
      });
    });

    return collected.sort((a, b) => {
      const keyA = a.fullDateTime || `${a.rawDate} ${a.timeText}`;
      const keyB = b.fullDateTime || `${b.rawDate} ${b.timeText}`;
      return keyB.localeCompare(keyA);
    });
  }, [foodName, groupedEntries, todayStr, cleanTime]);

  const allergyCount = useMemo(
    () => entriesForFood.filter((e) => e.hasAllergy).length,
    [entriesForFood]
  );

  const summaryStatus = useMemo(() => {
    const total = entriesForFood.length;
    if (total === 0) {
      return { label: '-', color: currentTheme.textSub };
    }

    if (allergyCount > 0) {
      return { label: 'Alergie', color: '#C0392B' };
    }

    if (total < MIN_OK_EXPOSURES) {
      return { label: 'Potențial alergic', color: '#D35400' };
    }

    return { label: 'OK', color: '#27AE60' };
  }, [entriesForFood.length, allergyCount, currentTheme.textSub]);

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: currentTheme.background },
        ]}
      >
        <StatusBar
          barStyle={currentTheme.statusBar}
          backgroundColor={currentTheme.background}
          translucent={false}
        />

        <View
          style={[
            styles.topHeaderFixed,
            {
              backgroundColor: currentTheme.background,
              borderBottomColor: currentTheme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.backButtonLarge,
              {
                backgroundColor: currentTheme.cardBackground,
                borderColor: currentTheme.border,
              },
            ]}
            onPress={onClose}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={currentTheme.textMain}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.backButtonLargeText,
                { color: currentTheme.textMain },
              ]}
            >
              Înapoi
            </Text>
          </TouchableOpacity>

          <View style={styles.summaryRow}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: currentTheme.textMain }]}
                numberOfLines={1}
              >
                {foodName || 'Istoric aliment'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.infoToggleBtn,
                  {
                    backgroundColor: showInfo
                      ? currentTheme.inputBackground
                      : currentTheme.cardBackground,
                    borderColor: showInfo ? '#D35400' : currentTheme.border,
                  },
                ]}
                onPress={() => setShowInfo((prev) => !prev)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={
                    showInfo
                      ? 'information-circle'
                      : 'information-circle-outline'
                  }
                  size={18}
                  color={showInfo ? '#D35400' : currentTheme.textMain}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.infoToggleText,
                    { color: showInfo ? '#D35400' : currentTheme.textMain },
                  ]}
                >
                  Info
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.subtitle, { color: currentTheme.textSub }]}>
              {entriesForFood.length}{' '}
              {entriesForFood.length === 1 ? 'masă' : 'mese'} • Status:{' '}
              <Text
                style={{
                  color: summaryStatus.color,
                  fontWeight: '700',
                }}
              >
                {summaryStatus.label}
              </Text>
            </Text>
          </View>

          {showInfo && (
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: currentTheme.cardBackground,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text
                style={[styles.infoBoxTitle, { color: currentTheme.textMain }]}
              >
                Reguli status & sumar
              </Text>
              <Text style={[styles.infoLine, { color: currentTheme.textSub }]}>
                • <Text style={styles.infoBoldRed}>Alergie</Text>: există cel
                puțin o masă cu reacție alergică ({allergyCount} din{' '}
                {entriesForFood.length}).
              </Text>
              <Text style={[styles.infoLine, { color: currentTheme.textSub }]}>
                • <Text style={styles.infoBoldOrange}>Potențial alergic</Text>:
                fără alergii, dar sub {MIN_OK_EXPOSURES} mese înregistrate (în
                observare).
              </Text>
              <Text style={[styles.infoLine, { color: currentTheme.textSub }]}>
                • <Text style={styles.infoBoldGreen}>OK</Text>: cel puțin{' '}
                {MIN_OK_EXPOSURES} mese fără reacții alergice.
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        >
          {entriesForFood.length === 0 ? (
            <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>
              Nu există înregistrări pentru acest aliment.
            </Text>
          ) : (
            entriesForFood.map((row) => (
              <View
                key={row.id}
                style={[
                  styles.entryCard,
                  {
                    backgroundColor: currentTheme.cardBackground,
                    borderColor: currentTheme.border,
                  },
                ]}
              >
                <View style={styles.entryLeft}>
                  <Text
                    style={[styles.entryDate, { color: currentTheme.textMain }]}
                  >
                    {row.displayDate} • {row.timeText}
                  </Text>
                  <Text
                    style={[styles.entryQty, { color: currentTheme.textSub }]}
                  >
                    {row.quantity
                      ? `Cantitate: ${row.quantity}`
                      : 'Cantitate nespecificată'}
                  </Text>
                  {row.hasAllergy && row.allergyType ? (
                    <Text style={styles.allergyDetailText}>
                      Reacție: {row.allergyType}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: row.hasAllergy ? '#FDEDEC' : '#E8F8F5',
                      borderColor: row.hasAllergy ? '#E74C3C' : '#A3E4D7',
                    },
                  ]}
                >
                  <Ionicons
                    name={row.hasAllergy ? 'alert-circle' : 'checkmark-circle'}
                    size={13}
                    color={row.hasAllergy ? '#C0392B' : '#27AE60'}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      { color: row.hasAllergy ? '#C0392B' : '#117A65' },
                    ]}
                  >
                    {row.hasAllergy ? 'Alergie' : 'OK'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop:
      Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 12,
  },
  topHeaderFixed: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
  },
  backButtonLargeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  summaryRow: {
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  infoToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  infoBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoLine: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  infoBoldRed: {
    fontWeight: '700',
    color: '#C0392B',
  },
  infoBoldOrange: {
    fontWeight: '700',
    color: '#D35400',
  },
  infoBoldGreen: {
    fontWeight: '700',
    color: '#27AE60',
  },
  listContainer: {
    padding: 16,
  },
  entryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryLeft: {
    flex: 1,
    marginRight: 10,
  },
  entryDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  entryQty: {
    fontSize: 12,
    marginTop: 3,
  },
  allergyDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C0392B',
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
  },
});