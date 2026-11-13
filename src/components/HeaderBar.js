import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HeaderBar({
  babyName,
  navigation,
  currentTheme,
  showStats,
  onToggleStats,
  showLastEventsBanner,
  onToggleLastEventsBanner,
}) {
  return (
    <View style={styles.topHeaderBar}>
      <Text style={[styles.appMainTitle, { color: currentTheme.textMain }]}>{babyName}</Text>

      <View style={styles.rightActionsContainer}>
        {/* Butonul de Toggle pentru LastEventsSummary (Ultima masă / somn) */}
        <TouchableOpacity
          onPress={onToggleLastEventsBanner}
          style={[
            styles.iconButton,
            {
              backgroundColor: showLastEventsBanner ? (currentTheme.inputBackground || '#e0e0e0') : currentTheme.cardBackground,
              borderColor: currentTheme.border
            }
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={currentTheme.textMain}
          />
        </TouchableOpacity>

        {/* Butonul de Toggle pentru Grafice (Stats) */}
        <TouchableOpacity
          onPress={onToggleStats}
          style={[
            styles.iconButton,
            {
              backgroundColor: showStats ? (currentTheme.inputBackground || '#e0e0e0') : currentTheme.cardBackground,
              borderColor: currentTheme.border
            }
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="stats-chart-outline"
            size={18}
            color={currentTheme.textMain}
          />
        </TouchableOpacity>

        {/* Butonul de Setări (Settings) */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={[styles.iconButton, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={currentTheme.textMain} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  appMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});