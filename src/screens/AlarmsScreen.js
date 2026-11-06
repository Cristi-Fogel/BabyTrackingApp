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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTheme, getLanguage } from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';

const ALARMS_STORAGE_KEY = '@baby_track_alarms_list';

const REPEAT_INTERVALS = [
  { label: 'O singură dată', value: 0 },
  { label: 'La fiecare 5 min', value: 5 },
  { label: 'La fiecare 10 min', value: 10 },
  { label: 'La fiecare 1 oră', value: 60 },
  { label: 'La fiecare 3 ore', value: 180 },
  { label: 'La fiecare 5 ore', value: 300 },
];

export default function AlarmsScreen({ navigation }) {
  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const [currentLang, setCurrentLang] = useState('ro');

  const [alarmTitle, setAlarmTitle] = useState('🍼 Alarmă Masă Bebe');
  const [alarmTime, setAlarmTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState(0);
  const [alarmsList, setAlarmsList] = useState([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const initScreen = async () => {
        try {
          const themeMode = await getTheme();
          const langCode = await getLanguage();
          const storedAlarms = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);

          if (isMounted) {
            setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
            setCurrentLang(langCode || 'ro');
            if (storedAlarms) {
              setAlarmsList(JSON.parse(storedAlarms));
            }
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

  const saveAlarmsToStorage = async (updatedList) => {
    try {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(updatedList));
      setAlarmsList(updatedList);
    } catch (e) {
      console.error('Eroare la salvarea alarmelor:', e);
    }
  };

  const onChangeTime = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setAlarmTime(selectedDate);
    }
  };

  // Setează ora curentă instant
  const handleSetCurrentTime = () => {
    setAlarmTime(new Date());
  };

  const adjustMinutes = (minutesToAdd) => {
    const newDate = new Date(alarmTime.getTime() + minutesToAdd * 60000);
    setAlarmTime(newDate);
  };

  const handleAddAlarm = async () => {
    setLoading(true);
    try {
      const intervalObj = REPEAT_INTERVALS.find(i => i.value === selectedInterval);

      const newAlarm = {
        id: Date.now().toString(),
        title: alarmTitle || '⏰ Alarmă Bebe',
        time: alarmTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        intervalMinutes: selectedInterval,
        intervalLabel: intervalObj ? intervalObj.label : 'O singură dată',
        active: true,
      };

      const updatedList = [newAlarm, ...alarmsList];
      await saveAlarmsToStorage(updatedList);

      Alert.alert('Succes', 'Alarma a fost setată cu succes!');
      setAlarmTitle('🍼 Alarmă Masă Bebe');
      setSelectedInterval(0);
    } catch (e) {
      Alert.alert('Eroare', 'Nu s-a putut adăuga alarma.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlarm = async (id) => {
    const updatedList = alarmsList.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    await saveAlarmsToStorage(updatedList);
  };

  const handleDeleteAlarm = async (id) => {
    const updatedList = alarmsList.filter((item) => item.id !== id);
    await saveAlarmsToStorage(updatedList);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      {/* HEADER FIX */}
      <View style={styles.fixedHeader}>
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

        <Text style={[styles.title, { color: currentTheme.textMain }]}>Alarme Bebe ⏰</Text>
      </View>

      {/* CONȚINUT DERULANT */}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* FORMULAR ADAUGARE ALARMĂ */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={styles.sectionTitle}>Adaugă Alarmă Nouă</Text>

          <Text style={[styles.label, { color: currentTheme.textSub }]}>Titlu Alarmă:</Text>
          <TextInput
            style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
            value={alarmTitle}
            onChangeText={setAlarmTitle}
            placeholder="Nume alarmă..."
            placeholderTextColor={currentTheme.inputPlaceholder}
          />

          <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Ora Selectată:</Text>

          <View style={styles.timeRowContainer}>
            {/* Casetă afișare oră curentă cu buton de deschidere picker nativ */}
            <TouchableOpacity
              style={[styles.timeBox, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#2980B9" style={{ marginRight: 8 }} />
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: currentTheme.textMain }}>
                {alarmTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </Text>
              <Ionicons name="create-outline" size={18} color={currentTheme.textSub} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            {/* Buton Oră Curentă */}
            <TouchableOpacity
              style={styles.nowBtn}
              onPress={handleSetCurrentTime}
            >
              <Ionicons name="flash-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.nowBtnText}>Acum</Text>
            </TouchableOpacity>
          </View>

          {/* BUTOANE DE AJUSTARE RAPIDĂ (+ / - minute) */}
          <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 8 }]}>Ajustare Rapidă:</Text>
          <View style={styles.quickButtonsContainer}>
            <TouchableOpacity style={styles.quickBtnMinus} onPress={() => adjustMinutes(-10)}><Text style={styles.quickBtnText}>-10m</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnMinus} onPress={() => adjustMinutes(-5)}><Text style={styles.quickBtnText}>-5m</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnMinus} onPress={() => adjustMinutes(-1)}><Text style={styles.quickBtnText}>-1m</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnPlus} onPress={() => adjustMinutes(1)}><Text style={styles.quickBtnText}>+1m</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnPlus} onPress={() => adjustMinutes(5)}><Text style={styles.quickBtnText}>+5m</Text></TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnPlus} onPress={() => adjustMinutes(10)}><Text style={styles.quickBtnText}>+10m</Text></TouchableOpacity>
          </View>

          {/* Componenta DateTimePicker Nativ */}
          {showPicker && (
            <DateTimePicker
              value={alarmTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeTime}
            />
          )}

          {/* Selector Recurență / Interval */}
          <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Frecvență / Recurență:</Text>
          <View style={styles.intervalsContainer}>
            {REPEAT_INTERVALS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.intervalChip,
                  {
                    backgroundColor: selectedInterval === item.value ? '#2980B9' : currentTheme.inputBackground,
                    borderColor: currentTheme.border,
                  },
                ]}
                onPress={() => setSelectedInterval(item.value)}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: selectedInterval === item.value ? '#FFF' : currentTheme.textMain,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleAddAlarm}
            disabled={loading}
          >
            <Ionicons name="add-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>Salvează Alarma</Text>
          </TouchableOpacity>
        </View>

        {/* LISTĂ ALARME VIITOARE */}
        <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
          <Text style={styles.sectionTitle}>Alarme Programate 📋</Text>

          {alarmsList.length === 0 ? (
            <Text style={{ color: currentTheme.textSub, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
              Nu există alarme setate.
            </Text>
          ) : (
            alarmsList.map((item) => (
              <View
                key={item.id}
                style={[styles.alarmItem, { borderBottomColor: currentTheme.border, opacity: item.active ? 1 : 0.5 }]}>

                <Ionicons
                  name={item.intervalMinutes > 0 ? "repeat-outline" : "alarm-outline"}
                  size={20}
                  color={item.active ? "#2980B9" : currentTheme.textSub}
                  style={{ marginRight: 10 }}
                />

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 14, color: currentTheme.textMain }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#E67E22', fontWeight: 'bold' }}>
                    Ora: {item.time} • {item.intervalLabel}
                  </Text>
                </View>

                <Switch
                  value={item.active}
                  onValueChange={() => handleToggleAlarm(item.id)}
                  trackColor={{ false: '#767577', true: '#27AE60' }}
                  thumbColor={item.active ? '#FFF' : '#f4f3f4'}
                  style={{ marginRight: 10 }}
                />

                <TouchableOpacity onPress={() => handleDeleteAlarm(item.id)}>
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
  fixedHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 1,
  },
  backButtonLargeText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 14, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#2980B9', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, marginBottom: 8 },
  timeRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  nowBtn: {
    backgroundColor: '#8E44AD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  nowBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  quickButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickBtnMinus: {
    backgroundColor: '#E74C3C',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 4,
    alignItems: 'center',
  },
  quickBtnPlus: {
    backgroundColor: '#27AE60',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flex: 1,
    marginLeft: 4,
    alignItems: 'center',
  },
  quickBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  intervalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  intervalChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 6,
  },
  saveBtn: {
    backgroundColor: '#27AE60',
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  alarmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});