import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  saveSheetUrl,
  fetchFromSheet,
  sendToSheet,
  deleteEntryById,
  updateEntryValue,
  getTheme,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';

export default function MamaScreen({ navigation }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stare pentru temă
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  // Stări formular Alăptare & DateTimePicker nativ
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [amount, setAmount] = useState(30); // Implicit 30 ml
  const [side, setSide] = useState('Amândoi'); // Stâng / Drept / Amândoi
  const [entries, setEntries] = useState([]);

  // Stări pentru Modalul de Editare
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);
  const [editedValue, setEditedValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const initScreen = async () => {
        try {
          const url = await getStoredSheetUrl();
          const local = await getLocalEntries();
          const themeMode = await getTheme();

          if (isMounted) {
            setEntries(local || []);
            setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
            if (url) {
              setSheetUrl(url);
              setIsUrlSaved(true);
            }
            setDate(new Date()); // Resetăm la ora curentă de fiecare dată când intrăm
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

  const onChangeTime = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const performSync = async (targetUrl, currentLocalEntries) => {
    if (!targetUrl) return;
    setLoading(true);
    try {
      const remoteEntries = await fetchFromSheet(targetUrl);
      if (Array.isArray(remoteEntries)) {
        const remoteIds = new Set(remoteEntries.map((item) => String(item.id)));
        const unsyncedLocal = currentLocalEntries.filter(
          (item) => !remoteIds.has(String(item.id))
        );

        if (unsyncedLocal.length > 0) {
          Alert.alert(
            'Sincronizare date',
            `S-au găsit ${unsyncedLocal.length} înregistrări pe telefon care nu sunt în Google Sheet. Dorești să le trimiți în Sheet?`,
            [
              {
                text: 'Nu, folosește doar Sheet-ul',
                onPress: async () => {
                  setEntries(remoteEntries);
                  await saveLocalEntries(remoteEntries);
                },
                style: 'cancel',
              },
              {
                text: 'Da, trimite-le',
                onPress: async () => {
                  const success = await sendToSheet(targetUrl, unsyncedLocal);
                  if (success) {
                    const merged = [...remoteEntries, ...unsyncedLocal];
                    setEntries(merged);
                    await saveLocalEntries(merged);
                  } else {
                    Alert.alert('Eroare', 'Nu s-au putut trimite datele locale.');
                  }
                },
              },
            ]
          );
        } else {
          setEntries(remoteEntries);
          await saveLocalEntries(remoteEntries);
        }
      }
    } catch (e) {
      console.log('Sincronizare eșuată sau fără conexiune.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!sheetUrl.trim()) return;
    await saveSheetUrl(sheetUrl.trim());
    setIsUrlSaved(true);
    await performSync(sheetUrl.trim(), entries);
  };

  const handleSwapUrl = () => {
    Alert.alert(
      'Schimbare Link',
      'Dorești să schimbi link-ul către Google Sheet?',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Da, schimbă',
          onPress: () => {
            setIsUrlSaved(false);
          },
        },
      ]
    );
  };

  const handleSaveAlaptare = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      const newEntry = {
        id: Date.now().toString(),
        type: 'alaptare',
        date: dateStr,
        time: timeString,
        value: `${amount} ml (${side})`,
      };

      const updated = [newEntry, ...(entries || [])];
      setEntries(updated);
      await saveLocalEntries(updated);

      if (sheetUrl) {
        await sendToSheet(sheetUrl, newEntry);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (itemId) => {
    const updated = await deleteEntryById(itemId, entries, sheetUrl);
    setEntries(updated);
  };

  const handleOpenEdit = (item) => {
    setCurrentEditingItem(item);
    setEditedValue(item.value || '');
    setEditModalVisible(true);
  };

  const handleConfirmEdit = async () => {
    if (!currentEditingItem) return;
    const updated = await updateEntryValue(currentEditingItem, editedValue, entries, sheetUrl);
    setEntries(updated);
    setEditModalVisible(false);
    setCurrentEditingItem(null);
  };

  const changeAmount = (delta) => {
    setAmount((prev) => Math.max(0, Math.min(300, prev + delta)));
  };

  const cleanDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('-')) return dateStr.split('T')[0];
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const cleanTime = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.includes('GMT')) {
      const match = timeStr.match(/(\d{2}:\d{2})/);
      if (match) {
        const [hourStr, minuteStr] = match[1].split(':');
        let h = parseInt(hourStr, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${minuteStr} ${ampm}`;
      }
    }
    return timeStr.replace(/'/g, '');
  };

  const mamaEntries = (entries || [])
    .filter((item) => item.type === 'alaptare' && item.value)
    .sort((a, b) => {
      const timeA = parseInt(String(a.id).replace(/^'/, '').trim(), 10) || 0;
      const timeB = parseInt(String(b.id).replace(/^'/, '').trim(), 10) || 0;
      return timeB - timeA;
    });

  const presets = [5, 10, 15, 20, 25, 30, 40, 50, 60, 90, 120];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      {/* 1. Header Google Sheet Sync */}
      <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardTitle, { color: currentTheme.textMain }]}>Google Sheet Sync</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={currentTheme.textSub} />
          </TouchableOpacity>
        </View>

        {!isUrlSaved ? (
          <View style={[styles.row, { marginTop: 8 }]}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              placeholder="Introdu URL WebApp..."
              placeholderTextColor={currentTheme.inputPlaceholder}
              value={sheetUrl}
              onChangeText={setSheetUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveUrl}>
              <Text style={styles.buttonText}>Salvează</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <View style={{ flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
              {loading && <ActivityIndicator size="small" color="#D81B60" style={{ marginRight: 6 }} />}
              <Text style={[styles.statusText, { color: currentTheme.textSub }]} numberOfLines={1}>
                Conectat: {sheetUrl}
              </Text>
            </View>
            <View style={[styles.row, { flexShrink: 0 }]}>
              <TouchableOpacity
                style={[styles.buttonSmall, { backgroundColor: '#27AE60' }]}
                onPress={() => performSync(sheetUrl, entries)}>
                <Ionicons name="refresh" size={14} color="#FFF" style={{ marginRight: 2 }} />
                <Text style={styles.buttonText}>Sync</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.buttonSmall, { backgroundColor: '#E67E22', marginLeft: 6 }]}
                onPress={handleSwapUrl}>
                <Text style={styles.buttonText}>Swap</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 2. Buton de Înapoi la Bebe */}
      <TouchableOpacity
        style={[
          styles.backButtonLarge,
          {
            backgroundColor: currentTheme.cardBackground,
            borderColor: currentTheme.border,
          },
        ]}
        onPress={() => navigation.navigate('Home')}
      >
        <Ionicons name="arrow-back-outline" size={20} color={currentTheme.textMain} style={{ marginRight: 8 }} />
        <Text style={[styles.backButtonLargeText, { color: currentTheme.textMain }]}>
          Înapoi la Bebe 👶
        </Text>
      </TouchableOpacity>

      {/* 3. Formular Alăptare */}
      <View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <Text style={styles.sectionHeader}>Înregistrare Alăptare 🤱</Text>

        <View style={styles.rowInline}>
          {/* Selector Oră Nativ (În loc de TextInput) */}
          <View style={styles.timeContainer}>
            <Text style={[styles.labelSmall, { color: currentTheme.textSub }]}>Ora:</Text>
            <TouchableOpacity
              style={[styles.timeInputWrapper, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
              onPress={() => setShowPicker(true)}
            >
              <Ionicons name="time-outline" size={16} color="#D81B60" style={{ marginRight: 4 }} />
              <Text style={[styles.timeInputField, { color: currentTheme.inputText }]}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={date}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeTime}
            />
          )}

          <View style={styles.amountContainer}>
            <View style={styles.rowBetween}>
              <Text style={[styles.labelSmall, { color: currentTheme.textSub }]}>Cantitate:</Text>
              <Text style={styles.amountDisplay}>{amount} ml</Text>
            </View>
            <View style={styles.sliderContainer}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => changeAmount(-5)}>
                <Ionicons name="remove-circle-outline" size={26} color="#D81B60" />
              </TouchableOpacity>

              <View style={[styles.sliderBarBackground, { backgroundColor: currentTheme.sliderBg || currentTheme.border }]}>
                <View style={[styles.sliderBarFill, { width: `${Math.min(100, (amount / 200) * 100)}%` }]} />
              </View>

              <TouchableOpacity style={styles.stepBtn} onPress={() => changeAmount(5)}>
                <Ionicons name="add-circle-outline" size={26} color="#D81B60" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScrollContainer}>
          {presets.map((val) => (
            <TouchableOpacity
              key={val}
              style={[
                styles.presetChip,
                { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border },
                amount === val && styles.presetChipActive,
              ]}
              onPress={() => setAmount(val)}>
              <Text style={[styles.presetText, { color: currentTheme.textSub }, amount === val && styles.presetTextActive]}>
                {val} ml
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: currentTheme.textSub }]}>Sân:</Text>
        <View style={styles.row}>
          {['Stâng', 'Drept', 'Amândoi'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionBtn,
                { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border },
                side === item && styles.optionBtnActive,
              ]}
              onPress={() => setSide(item)}>
              <Text style={[styles.optionText, { color: currentTheme.textSub }, side === item && styles.optionTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAlaptare} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>Salvează Alăptare</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 4. Istoric MAMA */}
      <View style={[styles.card, { flex: 1, backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <Text style={[styles.cardTitle, { color: currentTheme.textMain }]}>Istoric Alăptare ({mamaEntries.length})</Text>

        <ScrollView style={{ flex: 1, marginTop: 8 }}>
          {mamaEntries.length === 0 ? (
            <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>Nu există înregistrări de alăptare.</Text>
          ) : (
            mamaEntries.map((item, index) => {
              const formattedDate = cleanDate(item.date);
              const formattedTime = cleanTime(item.time);
              const dateTimeDisplay = `${formattedDate} ${formattedTime}`.trim();

              return (
                <TouchableOpacity
                  key={`mama_${index}_${item.id}`}
                  style={[styles.historyItem, { borderBottomColor: currentTheme.borderColorLight }]}
                  onLongPress={() => {
                    Alert.alert('Opțiuni Înregistrare', 'Alege o acțiune:', [
                      { text: 'Anulează', style: 'cancel' },
                      { text: 'Editează', onPress: () => handleOpenEdit(item) },
                      { text: 'Șterge', style: 'destructive', onPress: () => handleDeleteEntry(item.id) },
                    ]);
                  }}
                >
                  <View style={styles.row}>
                    <Ionicons name="woman-outline" size={20} color="#D81B60" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={[styles.historyType, { color: currentTheme.textMain }]}>ALĂPTARE</Text>
                      <Text style={[styles.historyDateTime, { color: currentTheme.textSub }]}>{dateTimeDisplay}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyValue}>{item.value}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Modal Editare */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: currentTheme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.modalBackground }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>Editează Înregistrarea</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              value={editedValue}
              onChangeText={setEditedValue}
              placeholder="Modifică valoarea..."
              placeholderTextColor={currentTheme.inputPlaceholder}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#95A5A6' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Anulează</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#27AE60', marginLeft: 10 }]}
                onPress={handleConfirmEdit}
              >
                <Text style={styles.buttonText}>Salvează</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 20,
  },
  card: { padding: 14, borderRadius: 12, marginBottom: 10, elevation: 2, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#D81B60', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { flex: 1, fontSize: 12, marginRight: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, marginRight: 8, fontSize: 13 },
  button: { backgroundColor: '#D35400', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonSmall: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
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

  rowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeContainer: {
    width: '32%',
  },
  timeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    height: 38,
    justifyContent: 'center',
  },
  timeInputField: {
    fontSize: 13,
    fontWeight: '600',
  },
  amountContainer: {
    width: '64%',
  },
  labelSmall: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: 'bold', marginTop: 4, marginBottom: 4 },
  amountDisplay: { fontSize: 14, fontWeight: 'bold', color: '#D81B60' },

  sliderContainer: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { padding: 1 },
  sliderBarBackground: { flex: 1, height: 8, borderRadius: 4, marginHorizontal: 4, overflow: 'hidden' },
  sliderBarFill: { height: '100%', backgroundColor: '#D81B60', borderRadius: 4 },

  presetScrollContainer: { paddingVertical: 6, alignItems: 'center' },
  presetChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, marginRight: 6 },
  presetChipActive: { backgroundColor: '#D81B60', borderColor: '#D81B60' },
  presetText: { fontSize: 12, fontWeight: 'bold' },
  presetTextActive: { color: '#FFF' },

  optionBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderRadius: 8, alignItems: 'center', marginRight: 6 },
  optionBtnActive: { backgroundColor: '#D81B60', borderColor: '#D81B60' },
  optionText: { fontSize: 13, fontWeight: 'bold' },
  optionTextActive: { color: '#FFF' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#D81B60', paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  historyType: { fontWeight: 'bold', fontSize: 14 },
  historyDateTime: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  historyValue: { fontSize: 14, fontWeight: 'bold', color: '#D81B60' },
  emptyText: { textAlign: 'center', marginTop: 20 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 16 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
});