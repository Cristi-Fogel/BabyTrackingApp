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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  saveSheetUrl,
  fetchFromSheet,
  sendToSheet,
} from '../services/storage';

export default function MamaScreen({ navigation }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stări formular Alăptare
  const [time, setTime] = useState('');
  const [amount, setAmount] = useState(30); // Implicit 30 ml
  const [side, setSide] = useState('Amândoi'); // Stâng / Drept / Amândoi
  const [entries, setEntries] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const initScreen = async () => {
        try {
          const url = await getStoredSheetUrl();
          const local = await getLocalEntries();

          if (isMounted) {
            setEntries(local || []);
            if (url) {
              setSheetUrl(url);
              setIsUrlSaved(true);
            }
            const now = new Date();
            const timeNow = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setTime(timeNow);
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

      const finalTime = time.trim() || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newEntry = {
        id: Date.now().toString(),
        type: 'alaptare',
        date: dateStr,
        time: finalTime,
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

  // Filtrăm DOAR alăptarea, ordonată descrescător după ID / Timestamp (cel mai recent SUS)
  const mamaEntries = (entries || [])
    .filter((item) => item.type === 'alaptare')
    .sort((a, b) => {
      const timeA = parseInt(String(a.id).replace(/^'/, '').trim(), 10) || 0;
      const timeB = parseInt(String(b.id).replace(/^'/, '').trim(), 10) || 0;
      return timeB - timeA;
    });

  const presets = [5, 10, 15, 20, 25, 30, 40, 50, 60, 90, 120];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" translucent={false} />

      {/* 1. Header Google Sheet Sync */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Google Sheet Sync</Text>
          <View style={styles.row}>
            {loading && <ActivityIndicator size="small" color="#D81B60" style={{ marginRight: 8 }} />}
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={22} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        {!isUrlSaved ? (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Introdu URL WebApp din Google Apps Script"
              value={sheetUrl}
              onChangeText={setSheetUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveUrl}>
              <Text style={styles.buttonText}>Salvează</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.rowBetween}>
            <Text style={styles.statusText} numberOfLines={1}>
              Conectat: {sheetUrl}
            </Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.buttonSmall, { backgroundColor: '#27AE60' }]}
                onPress={() => performSync(sheetUrl, entries)}>
                <Ionicons name="refresh" size={14} color="#FFF" style={{ marginRight: 4 }} />
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
      <TouchableOpacity style={styles.backButtonLarge} onPress={() => navigation.navigate('Home')}>
        <Ionicons name="arrow-back-outline" size={22} color="#D81B60" style={{ marginRight: 8 }} />
        <Text style={styles.backButtonLargeText}>Înapoi la Bebe 👶</Text>
      </TouchableOpacity>

      {/* 3. Formular Alăptare */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Înregistrare Alăptare 🤱</Text>

        {/* Câmpul de Oră și Cantitate pe Același Rând */}
        <View style={styles.rowInline}>
          {/* Câmp Ora */}
          <View style={styles.timeContainer}>
            <Text style={styles.labelSmall}>Ora:</Text>
            <View style={styles.timeInputWrapper}>
              <Ionicons name="time-outline" size={16} color="#D81B60" style={{ marginRight: 4 }} />
              <TextInput
                style={styles.timeInputField}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Control Cantitate (Afișaj + Pas -/+) */}
          <View style={styles.amountContainer}>
            <View style={styles.rowBetween}>
              <Text style={styles.labelSmall}>Cantitate:</Text>
              <Text style={styles.amountDisplay}>{amount} ml</Text>
            </View>
            <View style={styles.sliderContainer}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => changeAmount(-5)}>
                <Ionicons name="remove-circle-outline" size={26} color="#D81B60" />
              </TouchableOpacity>

              <View style={styles.sliderBarBackground}>
                <View style={[styles.sliderBarFill, { width: `${Math.min(100, (amount / 200) * 100)}%` }]} />
              </View>

              <TouchableOpacity style={styles.stepBtn} onPress={() => changeAmount(5)}>
                <Ionicons name="add-circle-outline" size={26} color="#D81B60" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scroll Preset-uri Cantități */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScrollContainer}>
          {presets.map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.presetChip, amount === val && styles.presetChipActive]}
              onPress={() => setAmount(val)}>
              <Text style={[styles.presetText, amount === val && styles.presetTextActive]}>
                {val} ml
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { marginTop: 8 }]}>Sân:</Text>
        <View style={styles.row}>
          {['Stâng', 'Drept', 'Amândoi'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.optionBtn, side === item && styles.optionBtnActive]}
              onPress={() => setSide(item)}>
              <Text style={[styles.optionText, side === item && styles.optionTextActive]}>
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
      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.cardTitle}>Istoric Alăptare ({mamaEntries.length})</Text>

        <ScrollView style={{ flex: 1, marginTop: 8 }}>
          {mamaEntries.length === 0 ? (
            <Text style={styles.emptyText}>Nu există înregistrări de alăptare.</Text>
          ) : (
            mamaEntries.map((item, index) => {
              const formattedDate = cleanDate(item.date);
              const formattedTime = cleanTime(item.time);
              const dateTimeDisplay = `${formattedDate} ${formattedTime}`.trim();

              return (
                <View key={`mama_${index}_${item.id}`} style={styles.historyItem}>
                  <View style={styles.row}>
                    <Ionicons name="woman-outline" size={20} color="#D81B60" style={{ marginRight: 10 }} />
                    <View>
                      <Text style={styles.historyType}>ALĂPTARE</Text>
                      <Text style={styles.historyDateTime}>{dateTimeDisplay}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyValue}>{item.value}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 20,
  },
  card: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 10, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#D81B60', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { flex: 1, fontSize: 12, color: '#666', marginRight: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 8, marginRight: 8, fontSize: 13 },
  button: { backgroundColor: '#D35400', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonSmall: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  backButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FADBD8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F5B7B1',
    elevation: 1,
  },
  backButtonLargeText: {
    color: '#D81B60',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Rând combinat Oră + Cantitate
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
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 6,
    backgroundColor: '#FAFAFA',
    height: 38,
  },
  timeInputField: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    paddingVertical: 4,
  },
  amountContainer: {
    width: '64%',
  },
  labelSmall: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginTop: 4, marginBottom: 4 },
  amountDisplay: { fontSize: 14, fontWeight: 'bold', color: '#D81B60' },

  sliderContainer: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { padding: 1 },
  sliderBarBackground: { flex: 1, height: 8, backgroundColor: '#F0D0DC', borderRadius: 4, marginHorizontal: 4, overflow: 'hidden' },
  sliderBarFill: { height: '100%', backgroundColor: '#D81B60', borderRadius: 4 },

  presetScrollContainer: { paddingVertical: 6, alignItems: 'center' },
  presetChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', backgroundColor: '#FAFAFA', marginRight: 6 },
  presetChipActive: { backgroundColor: '#D81B60', borderColor: '#D81B60' },
  presetText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  presetTextActive: { color: '#FFF' },

  optionBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, alignItems: 'center', marginRight: 6 },
  optionBtnActive: { backgroundColor: '#D81B60', borderColor: '#D81B60' },
  optionText: { fontSize: 13, color: '#555', fontWeight: 'bold' },
  optionTextActive: { color: '#FFF' },
  saveBtn: { flexDirection: 'row', backgroundColor: '#D81B60', paddingVertical: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5ECE1' },
  historyType: { fontWeight: 'bold', fontSize: 14, color: '#2C3E50' },
  historyDateTime: { fontSize: 12, color: '#7F8C8D', marginTop: 2, fontWeight: '500' },
  historyValue: { fontSize: 14, fontWeight: 'bold', color: '#D81B60' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
});