import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HeaderBar({ babyName, navigation, currentTheme, showStats, onToggleStats }) {
  return (
    <View style={styles.topHeaderBar}>
      <Text style={[styles.appMainTitle, { color: currentTheme.textMain }]}>{babyName}</Text>

      <View style={styles.rightActionsContainer}>
        {/* Butonul de Toggle pentru Grafice */}
        <TouchableOpacity
          onPress={onToggleStats}
          style={[
            styles.iconButton,
            {
              backgroundColor: showStats ? currentTheme.primary || '#D35400' : currentTheme.cardBackground,
              borderColor: currentTheme.border
            }
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="stats-chart-outline"
            size={18}
            color={showStats ? '#FFF' : currentTheme.textMain}
          />
        </TouchableOpacity>

        {/* Butonul de Setări (Cogwheel) */}
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