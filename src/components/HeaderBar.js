import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HeaderBar({ babyName, navigation, currentTheme }) {
  return (
    <View style={styles.topHeaderBar}>
      <Text style={[styles.appMainTitle, { color: currentTheme.textMain }]}>{babyName}</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        style={[styles.settingsIconButton, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
      >
        <Ionicons name="settings-outline" size={20} color={currentTheme.textMain} />
      </TouchableOpacity>
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
  settingsIconButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});