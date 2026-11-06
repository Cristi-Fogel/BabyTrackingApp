import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  scheduleExactAlarm,
  getRecentNotifications,
  deleteNotification,
  cancelAllNotifications
} from '../services/notificationService';
import { getTheme, getLanguage } from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { translations } from '../services/translations';

const AVAILABLE_ICONS = [
  'notifications-outline',
  'alarm-outline',
  'time-outline',
  'restaurant-outline',
  'moon-outline',
  'medkit-outline',
  'heart-outline',
  'calendar-outline',
];

export default function ReminderScreen({ navigation }) {
  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const [currentLang, setCurrentLang] = useState('ro');

  const [reminderTitle, setReminderTitle] = useState('🍼 Reminder Masă Bebe');
  const [selectedIcon, setSelectedIcon] = useState('notifications-outline');
  const [date, setDate] = useState(new Date(Date.now() + 3 * 3600 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [loading, setLoading] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);

  const t = translations[currentLang] || translations.ro;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const initScreen = async () => {
        try {
          const themeMode = await getTheme();
          const langCode = await getLanguage();
          const recent = await getRecentNotifications();

          if (isMounted) {
            setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
            setCurrentLang(langCode || 'ro');
            setRecentNotifications(recent);
          }
        } catch (e) {
          console.error(e);
        }
      };

      initScreen();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const onChangePicker = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onDismissPicker = () => {
    setShowPicker(false);
  };

  const openPicker = (mode) => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleQuickReminder = async (value, type) => {
    setLoading(true);
    try {
      const targetTime = new Date();

      if (type === 'minutes') {
        targetTime.setTime(targetTime.getTime() + value * 60 * 1000);
      } else if (type === 'hours') {
        targetTime.setTime(targetTime.getTime() + value * 3600 * 1000);
      } else if (type === 'tomorrow') {
        targetTime.setDate(targetTime.getDate() + 1);
        targetTime.setHours(9, 0, 0, 0);
      }

      const success = await scheduleExactAlarm(
        targetTime,
        '🍼 Reminder Bebe',
        type === 'tomorrow' ? 'Reminder programat pentru mâine!' : 'Reminder setat cu succes!',
        'time-outline'
      );

      if (success) {
        const updated = await getRecentNotifications();
        setRecentNotifications(updated);
        Alert.alert('Succes', 'Reminder setat cu succes!');
      }
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-a putut seta reminderul.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomReminder = async () => {
    setLoading(true);
    try {
      if (date.getTime() <= Date.now()) {
        Alert.alert('Atenție', 'Ora selectată trebuie să fie în viitor!');
        setLoading(false);
        return;
      }

      const success = await scheduleExactAlarm(
        date,
        reminderTitle || '⏰ Notificare Bebe',
        'A sosit ora programată pentru reminder!',
        selectedIcon
      );

      if (success) {
        const updated = await getRecentNotifications();
        setRecentNotifications(updated);
        Alert.alert('Succes', `Reminder personalizat setat pentru ${date.toLocaleString()}!`);
      }
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-a putut seta reminderul personalizat.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id) => {
    const updated = await deleteNotification(id);
    setRecentNotifications(updated);
  };

  const handleCancelAll = async () => {
    Alert.alert(
      'Anulare Remindere',
      'Ești sigur că vrei să ștergi și să anulezi toate notificările programate?',
      [
        { text: 'Renunță', style: 'cancel' },
        {
          text: 'Șterge Tot',
          style: 'destructive',
          onPress: async () => {
            const updated = await cancelAllNotifications();
            setRecentNotifications(updated);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Buton Înapoi Mare */}
        <TouchableOpacity
          style={[
            styles.backButtonLarge,
            {
              backgroundColor: currentTheme.cardBackground,
              borderColor: currentTheme.border,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={20} color={currentTheme.textMain} style={{ marginRight: 8 }} />
          <Text style={[styles.backButtonLargeText, { color: currentTheme.textMain }]}>
            Înapoi la Meniu
          </Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: currentTheme.textMain }]}>Setare Remindere 🔔</Text>

        {/* Secțiune Presete Rapide (30 min, 1 oră, Mâine) */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={styles.sectionTitle}>Presete rapide</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => handleQuickReminder(30, 'minutes')}
              disabled={loading}
            >
              <Ionicons name="time-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.presetText}>30 min</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => handleQuickReminder(1, 'hours')}
              disabled={loading}
            >
              <Ionicons name="time-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.presetText}>1 oră</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => handleQuickReminder(null, 'tomorrow')}
              disabled={loading}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.presetText}>Mâine</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Secțiune Custom (Dată, Oră & Iconiță) */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={styles.sectionTitle}>Reminder Custom (Dată, Oră & Iconiță)</Text>

          <Text style={[styles.label, { color: currentTheme.textSub }]}>Alege Iconița Notificării:</Text>
          <View style={styles.iconSelectorRow}>
            {AVAILABLE_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: selectedIcon === icon ? '#2980B9' : currentTheme.inputBackground,
                    borderColor: currentTheme.border
                  }
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={selectedIcon === icon ? '#FFF' : currentTheme.textMain}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Mesaj / Titlu Notificare:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
            value={reminderTitle}
            onChangeText={setReminderTitle}
            placeholder="Introduceți titlul..."
            placeholderTextColor={currentTheme.inputPlaceholder}
          />

          <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Selectează Data și Ora:</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={[styles.dateTimeBox, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
              onPress={() => openPicker('date')}
            >
              <Ionicons name="calendar-outline" size={16} color="#2980B9" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: 'bold', color: currentTheme.textMain }}>
                {date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateTimeBox, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
              onPress={() => openPicker('time')}
            >
              <Ionicons name="time-outline" size={16} color="#2980B9" style={{ marginRight: 6 }} />
              <Text style={{ fontWeight: 'bold', color: currentTheme.textMain }}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangePicker}
              onDismiss={onDismissPicker}
            />
          )}

          <TouchableOpacity
            style={styles.customSaveBtn}
            onPress={handleCustomReminder}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.customSaveBtnText}>Programează Reminder Custom</Text>
          </TouchableOpacity>
        </View>

        {/* Secțiune Ultimele 5 Notificări Programate */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Ultimele Notificări 📋</Text>
            {recentNotifications.length > 0 && (
              <TouchableOpacity onPress={handleCancelAll}>
                <Text style={{ color: '#E74C3C', fontSize: 12, fontWeight: 'bold' }}>Șterge tot</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentNotifications.length === 0 ? (
            <Text style={{ color: currentTheme.textSub, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 6 }}>
              Nu există notificări programate recent.
            </Text>
          ) : (
            recentNotifications.map((item, index) => (
              <View
                key={item.id || index}
                style={[styles.notificationItem, { borderBottomColor: currentTheme.border }]}
              >
                <Ionicons name={item.iconName || 'notifications-outline'} size={18} color="#2980B9" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 13, color: currentTheme.textMain }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: currentTheme.textSub }}>
                    {item.body}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#E67E22', marginRight: 10 }}>
                  {item.time}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
  },
  container: {
    padding: 16,
    flexGrow: 1,
  },
  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 1,
  },
  backButtonLargeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#2980B9', marginBottom: 10 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  presetBtn: {
    backgroundColor: '#2980B9',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 3,
  },
  presetText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  iconSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 6,
  },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8 },
  dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dateTimeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  customSaveBtn: {
    backgroundColor: '#27AE60',
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSaveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
});