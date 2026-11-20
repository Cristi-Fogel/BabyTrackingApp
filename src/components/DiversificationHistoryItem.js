//Componentă de UI responsabilă de afișarea unui rând individual de mâncare solidă în lista cronologică din HistorySection.
//    Ce afișează: iconița generică nutrition-outline (Ionicons), numele alimentului, ora mesei, cantitatea (dacă este completată), un badge de status (OK sau Alergie — plus tipul reacției când există alergie) și săgeata > (chevron-forward).
//    Interacțiuni:
//        Tap pe card / >: deschide istoricul detaliat al alimentului respectiv (onPressDetails).
//        Long press: deschide meniul de acțiuni pentru intrarea selectată (onLongPress).
//    Utilitare exportate: include funcții helper pentru extragerea numelui alimentului, a cantității și a tipului de alergie, precum și verificarea stării alergice (isAllergyReaction).


import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const extractFoodNameFromEntry = (item) => {
  if (item?.food && String(item.food).trim()) {
    return String(item.food).trim();
  }
  const raw = String(item?.value || '').trim();
  if (!raw) return 'Mâncare solidă';
  const parts = raw.split(' - ');
  return (parts[0] || raw).trim();
};

export const extractQuantityFromEntry = (item) => {
  if (item?.quantity !== undefined && item?.quantity !== null) {
    const q = String(item.quantity).trim();
    if (q) return q;
  }
  const raw = String(item?.value || '').trim();
  const parts = raw.split(' - ');
  if (parts.length > 1) {
    const secondPart = parts[1].trim();
    if (secondPart && !secondPart.toLowerCase().startsWith('alergie')) {
      return secondPart;
    }
  }
  return '';
};

export const extractAllergyTypeFromEntry = (item) => {
  if (item?.allergyType && String(item.allergyType).trim()) {
    return String(item.allergyType).trim();
  }
  const raw = String(item?.value || '');
  const match = raw.match(/alergie\s*:\s*(.+)$/i);
  return match ? match[1].trim() : '';
};

export const isAllergyReaction = (item) => {
  const reaction = String(
    item?.reaction || item?.allergenStatus || ''
  ).toLowerCase();
  const allergyType = String(item?.allergyType || '').toLowerCase();
  const rawValue = String(item?.value || '').toLowerCase();

  if (reaction.trim() === 'ok' && !allergyType && !rawValue.includes('alerg')) {
    return false;
  }

  const combined = `${reaction} ${allergyType} ${rawValue}`;
  return (
    combined.includes('alerg') ||
    combined.includes('reacț') ||
    combined.includes('react') ||
    combined.includes('erupț') ||
    combined.includes('erupt') ||
    combined.includes('urticar') ||
    combined.includes('diaree') ||
    combined.includes('vărsătur') ||
    combined.includes('varsatur')
  );
};

export default function DiversificationHistoryItem({
  item,
  formattedTime,
  currentTheme,
  dynamicFont,
  onPressDetails,
  onLongPress,
}) {
  const foodName = extractFoodNameFromEntry(item);
  const quantity = extractQuantityFromEntry(item);
  const allergyType = extractAllergyTypeFromEntry(item);
  const hasAllergy = isAllergyReaction(item);
  const statusLabel = hasAllergy ? 'Alergie' : 'OK';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: currentTheme.cardBackground,
          borderColor: currentTheme.border,
        },
      ]}
      activeOpacity={0.75}
      onPress={() => onPressDetails && onPressDetails(foodName, item)}
      onLongPress={() => onLongPress && onLongPress(item)}
    >
      <View style={styles.leftSection}>
        <Ionicons
          name="nutrition-outline"
          size={18}
          color="#E67E22"
          style={styles.icon}
        />
        <View style={styles.textColumn}>
          <Text
            style={[
              styles.foodTitle,
              { color: currentTheme.textMain, fontSize: dynamicFont.title },
            ]}
            numberOfLines={1}
          >
            {foodName}
          </Text>
          <Text
            style={[
              styles.metaText,
              { color: currentTheme.textSub, fontSize: dynamicFont.sub },
            ]}
            numberOfLines={1}
          >
            {formattedTime || '-'}
            {quantity ? ` • ${quantity}` : ''}
            {hasAllergy && allergyType ? ` • ${allergyType}` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: hasAllergy ? '#FDEDEC' : '#E8F8F5',
              borderColor: hasAllergy ? '#E74C3C' : '#A3E4D7',
            },
          ]}
        >
          <Ionicons
            name={hasAllergy ? 'alert-circle' : 'checkmark-circle'}
            size={12}
            color={hasAllergy ? '#C0392B' : '#27AE60'}
            style={{ marginRight: 3 }}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: hasAllergy ? '#C0392B' : '#117A65',
                fontSize: dynamicFont.sub,
              },
            ]}
          >
            {statusLabel}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={currentTheme.textSub}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  foodTitle: {
    fontWeight: '700',
  },
  metaText: {
    fontWeight: '500',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 6,
  },
});