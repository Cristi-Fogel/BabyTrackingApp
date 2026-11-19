import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// Folosim direct serviciul tău existent de storage dacă dorești, sau AsyncStorage nativ din react-native
import AsyncStorage from '@react-native-async-storage/async-storage';
// Notă: Dacă @react-native-async-storage/async-storage tot dă eroare,
// poți înlocua linia de sus cu: import { Platform } from 'react-native'; (sau stocare locală simplă)

const BABY_AVATAR_KEY = '@baby_avatar_image';
const BABY_BIRTH_DATE_KEYS = ['@baby_birth_date', '@baby_dob', '@baby_info'];

const parseBirthDate = (rawValue) => {
  if (!rawValue) return null;

  if (rawValue instanceof Date) {
    return isNaN(rawValue.getTime()) ? null : rawValue;
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseBirthDate(parsed);
      } catch (_) {
        // continuăm cu parsarea normală de dată
      }
    }

    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const d = new Date(
        parseInt(ymdMatch[1], 10),
        parseInt(ymdMatch[2], 10) - 1,
        parseInt(ymdMatch[3], 10)
      );
      return isNaN(d.getTime()) ? null : d;
    }

    const dmyMatch = trimmed.match(/^(\d{2})[./-](\d{2})[./-](\d{4})/);
    if (dmyMatch) {
      const d = new Date(
        parseInt(dmyMatch[3], 10),
        parseInt(dmyMatch[2], 10) - 1,
        parseInt(dmyMatch[1], 10)
      );
      return isNaN(d.getTime()) ? null : d;
    }

    const parsedDate = new Date(trimmed);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (typeof rawValue === 'object') {
    return (
      parseBirthDate(rawValue.birthDate) ||
      parseBirthDate(rawValue.dob) ||
      parseBirthDate(rawValue.babyBirthDate) ||
      null
    );
  }

  return null;
};

const formatAgeSinceBirth = (birthDate) => {
  if (!birthDate || isNaN(birthDate.getTime())) {
    return null;
  }

  const now = new Date();
  if (birthDate > now) {
    return '0 zile';
  }

  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  let days = now.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.floor((now - birthDate) / (1000 * 60 * 60 * 24));

  if (years > 0) {
    const parts = [`${years} ${years === 1 ? 'an' : 'ani'}`];
    if (months > 0) parts.push(`${months} ${months === 1 ? 'lună' : 'luni'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'zi' : 'zile'}`);
    return parts.join(' ');
  }

  if (months > 0) {
    const parts = [`${months} ${months === 1 ? 'lună' : 'luni'}`];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'zi' : 'zile'}`);
    return parts.join(' ');
  }

  if (totalDays >= 7) {
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    const parts = [`${weeks} ${weeks === 1 ? 'săptămână' : 'săptămâni'}`];
    if (remDays > 0) parts.push(`${remDays} ${remDays === 1 ? 'zi' : 'zile'}`);
    return parts.join(' ');
  }

  return `${totalDays} ${totalDays === 1 ? 'zi' : 'zile'}`;
};

export default function HeaderBar({
  babyName,
  babyBirthDate,
  babyAgePlaceholder,
  navigation,
  currentTheme,
  showStats,
  onToggleStats,
  showLastEventsBanner,
  onToggleLastEventsBanner,
}) {
  const [avatarUri, setAvatarUri] = useState(null);
  const [showAgeSubtext, setShowAgeSubtext] = useState(false);
  const [storedBirthDate, setStoredBirthDate] = useState(null);

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

  useEffect(() => {
    let isMounted = true;
    const loadBirthDate = async () => {
      try {
        for (const key of BABY_BIRTH_DATE_KEYS) {
          const val = await AsyncStorage.getItem(key);
          const parsed = parseBirthDate(val);
          if (parsed && isMounted) {
            setStoredBirthDate(parsed);
            return;
          }
        }
      } catch (e) {
        console.error('Eroare la încărcarea datei de naștere:', e);
      }
    };
    loadBirthDate();
    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveBirthDate = parseBirthDate(babyBirthDate) || storedBirthDate;
  const formattedAge = formatAgeSinceBirth(effectiveBirthDate);
  const hasBirthDate = Boolean(formattedAge);
  const fallbackSubtext = babyAgePlaceholder || 'Adaugă ziua nașterii în setări';
  const shouldShowSubtext = hasBirthDate ? showAgeSubtext : true;
  const subtextLabel = hasBirthDate ? formattedAge : fallbackSubtext;

  const handleNamePress = () => {
    if (hasBirthDate) {
      setShowAgeSubtext((prev) => !prev);
    }
  };

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
        <TouchableOpacity
          onPress={handleNamePress}
          activeOpacity={hasBirthDate ? 0.7 : 1}
          style={styles.nameContainer}
        >
          <Text style={[styles.appMainTitle, { color: currentTheme.textMain }]} numberOfLines={1}>
            {babyName || 'Bebeluș'}
          </Text>
          {shouldShowSubtext && (
            <Text style={[styles.ageSubtext, { color: currentTheme.textSub }]} numberOfLines={1}>
              {subtextLabel}
            </Text>
          )}
        </TouchableOpacity>
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
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  appMainTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 17,
  },
  ageSubtext: {
    fontSize: 10,
    lineHeight: 12,
    marginTop: 0,
  },
  rightActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});