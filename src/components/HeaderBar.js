import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// Folosim direct serviciul tău existent de storage dacă dorești, sau AsyncStorage nativ din react-native
import AsyncStorage from '@react-native-async-storage/async-storage';
// Notă: Dacă @react-native-async-storage/async-storage tot dă eroare,
// poți înlocua linia de sus cu: import { Platform } from 'react-native'; (sau stocare locală simplă)

const BABY_AVATAR_KEY = '@baby_avatar_image';

export default function HeaderBar({
  babyName,
  navigation,
  currentTheme,
  showStats,
  onToggleStats,
  showLastEventsBanner,
  onToggleLastEventsBanner,
}) {
  const [avatarUri, setAvatarUri] = useState(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const savedUri = await AsyncStorage.getItem(BABY_AVATAR_KEY);
        if (savedUri) {
          setAvatarUri(savedUri);
        }
      } catch (e) {
        console.error('Eroare la încărcarea avatarului:', e);
      }
    };
    loadAvatar();
  }, []);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Este necesar accesul la galerie pentru a selecta o poză cu bebelușul!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        setAvatarUri(selectedUri);
        await AsyncStorage.setItem(BABY_AVATAR_KEY, selectedUri);
      }
    } catch (e) {
      console.error('Eroare la selectarea imaginii:', e);
    }
  };

  return (
    <View style={styles.topHeaderBar}>
      <View style={styles.leftContainer}>
        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: currentTheme.border }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
              <Ionicons name="camera-outline" size={16} color={currentTheme.textSub} />
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.appMainTitle, { color: currentTheme.textMain }]} numberOfLines={1}>
          {babyName || 'Bebeluș'}
        </Text>
      </View>

      <View style={styles.rightActionsContainer}>
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
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  appMainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
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