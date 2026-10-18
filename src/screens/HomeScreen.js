import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  saveSheetUrl,
  fetchFromSheet,
  sendToSheet,
  getBabyName,
} from '../services/storage';

export default function HomeScreen({ navigation }) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [babyName, setBabyName] = useState('Bebelușul');

  const isSyncingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const initializeAndSync = async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        setLoading(true);

        try {
          const savedUrl = await getStoredSheetUrl();
          const localData = (await getLocalEntries()) || [];
          const savedBabyName = await getBabyName();

          if (isMounted) {
            setEntries(localData);
            if (savedBabyName) setBabyName(savedBabyName);
          }

          if (savedUrl) {
            if (isMounted) {
              setSheetUrl(savedUrl);
              setIsUrlSaved(true);
            }
            await performSync(savedUrl, localData);
          }
        } catch (e) {
          console.error('Eroare la inițializare:', e);
        } finally {
          isSyncingRef.current = false;
          if (isMounted) setLoading(false);
        }
      };

      initializeAndSync();

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
        const cleanRemote = remoteEntries.map((item) => ({
          ...item,
          id: String(item.id).replace(/^'/, '').trim(),
          date: cleanDate(item.date),
          time: cleanTime(item.time),
        }));

        const safeLocal = (currentLocalEntries || []).map((item) => ({
          ...item,
          id: String(item.id).replace(/^'/, '').trim(),
        }));

        if (cleanRemote.length === 0 && safeLocal.length > 0) {
          await sendToSheet(targetUrl, safeLocal);
          setEntries(safeLocal);
          await saveLocalEntries(safeLocal);
          return;
        }

        const mergedMap = new Map();

        safeLocal.forEach((item) => {
          if (item && item.id) mergedMap.set(item.id, item);
        });

        cleanRemote.forEach((item) => {
          if (item && item.id) mergedMap.set(item.id, item);
        });

        const mergedEntries = Array.from(mergedMap.values());

        const remoteIds = new Set(cleanRemote.map((item) => item.id));
        const unsyncedLocal = safeLocal.filter((item) => !remoteIds.has(item.id));

        if (unsyncedLocal.length > 0) {
          Alert.alert(
            'Sincronizare date',
            `S-au găsit ${unsyncedLocal.length} înregistrări noi pe telefon. Dorești să le trimiți în Google Sheet?`,
            [
              {
                text: 'Nu, păstrează doar Sheet',
                onPress: async () => {
                  setEntries(cleanRemote);
                  await saveLocalEntries(cleanRemote);
                },
                style: 'cancel',
              },
              {
                text: 'Da, trimite-le',
                onPress: async () => {
                  const success = await sendToSheet(targetUrl, unsyncedLocal);
                  if (success) {
                    setEntries(mergedEntries);
                    await saveLocalEntries(mergedEntries);
                  } else {
                    Alert.alert('Eroare', 'Nu s-au putut trimite datele locale.');
                  }
                },
              },
            ]
          );
        } else {
          setEntries(mergedEntries);
          await saveLocalEntries(mergedEntries);
        }
      }
    } catch (e) {
      console.log('Sincronizare eșuată sau offline:', e);
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

  const activeSleepEntry = entries.find(
    (item) =>
      item.type === 'sleep' &&
      item.value &&
      item.value.includes('Adormit la') &&
      !item.value.includes('Trezit la')
  );

  const handleWakeUp = async () => {
    if (!activeSleepEntry) return;

    const wakeTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let sleepTimeStr = '';
    const matchAdormit = String(activeSleepEntry.value || '').match(/Adormit la\s+[\d:A-Za-z\s ]+/i);
    if (matchAdormit) {
      sleepTimeStr = matchAdormit[0].trim();
    } else {
      sleepTimeStr = `Adormit la ${activeSleepEntry.time || ''}`.trim();
    }

    const formattedValue = `${sleepTimeStr} - Trezit la ${wakeTime}`;
    const cleanId = String(activeSleepEntry.id).replace(/^'/, '').trim();

    const updatedEntry = {
      ...activeSleepEntry,
      id: cleanId,
      value: formattedValue,
    };

    const updatedEntries = entries.map((item) =>
      String(item.id).replace(/^'/, '').trim() === cleanId ? updatedEntry : item
    );

    setEntries(updatedEntries);
    await saveLocalEntries(updatedEntries);

    if (sheetUrl) {
      sendToSheet(sheetUrl, updatedEntry);
    }
  };

  const cleanDate = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr);
    if (str.includes('GMT') || str.includes('Ora')) {
      try {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {}
    }
    if (str.includes('-')) return str.split('T')[0];
    return str.substring(0, 10);
  };

  const cleanTime = (timeStr) => {
    if (!timeStr) return '';
    const str = String(timeStr);
    if (str.includes('GMT') || str.includes('1899')) {
      const match = str.match(/(\d{2}:\d{2})/);
      if (match) {
        const [hourStr, minuteStr] = match[1].split(':');
        let h = parseInt(hourStr, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${minuteStr} ${ampm}`;
      }
    }
    return str.replace(/'/g, '');
  };

  const renderSleepDetails = (value) => {
    if (!value) return <Text style={styles.historyValue}>-</Text>;

    const sleepMatch = value.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
    const wakeMatch = value.match(/Trezit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|$)/i);

    const sleepTime = sleepMatch ? sleepMatch[1].trim() : '';
    const wakeTime = wakeMatch ? wakeMatch[1].trim() : '';

    if (sleepTime || wakeTime) {
      return (
        <View style={styles.sleepDetailsContainer}>
          {sleepTime ? (
            <View style={styles.sleepDetailRow}>
              <Ionicons name="moon-outline" size={15} color="#2980B9" style={{ marginRight: 4 }} />
              <Text style={styles.sleepDetailText}>{sleepTime}</Text>
            </View>
          ) : null}
          {wakeTime ? (
            <View style={[styles.sleepDetailRow, { marginTop: 3 }]}>
              <Ionicons name="sunny-outline" size={15} color="#E67E22" style={{ marginRight: 4 }} />
              <Text style={styles.sleepDetailText}>{wakeTime}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return <Text style={styles.historyValue}>{value}</Text>;
  };

  const uniqueEntriesMap = new Map();
  entries.forEach((item) => {
    if (item && item.type !== 'alaptare' && item.id) {
      const cleanId = String(item.id).replace(/^'/, '').trim();
      uniqueEntriesMap.set(cleanId, item);
    }
  });

  const sortedEntries = Array.from(uniqueEntriesMap.values()).sort((a, b) => {
    const timeA = parseInt(String(a.id).replace(/^'/, '').trim(), 10) || 0;
    const timeB = parseInt(String(b.id).replace(/^'/, '').trim(), 10) || 0;
    return timeB - timeA;
  });

  const renderIconForType = (type) => {
    if (type === 'milk' || type === 'lapte') {
      return <FontAwesome5 name="wine-bottle" size={18} color="#D35400" style={{ marginRight: 12 }} />;
    }
    if (type === 'growth' || type === 'crestere') {
      return <MaterialCommunityIcons name="ruler" size={20} color="#27AE60" style={{ marginRight: 12 }} />;
    }
    return <Ionicons name="moon-outline" size={20} color="#2980B9" style={{ marginRight: 12 }} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" translucent={false} />

      {/* 1. Sync Header */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Google Sheet Sync</Text>
          <View style={styles.row}>
            {loading && <ActivityIndicator size="small" color="#D35400" style={{ marginRight: 10 }} />}
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

      {/* 2. Meniu Navigare - Compact Grid 2x2 */}
      <Text style={styles.sectionHeader}>Meniu Activități</Text>
      <View style={styles.menuGridContainer}>
        <View style={styles.menuRow}>
          <TouchableOpacity
            style={[styles.menuCard, { backgroundColor: '#E67E22' }]}
            onPress={() => navigation.navigate('MilkTracker')}>
            <FontAwesome5 name="wine-bottle" size={18} color="#FFF" />
            <Text style={styles.menuText}>Lapte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuCard, { backgroundColor: '#2980B9' }]}
            onPress={() => navigation.navigate('SleepTracker')}>
            <Ionicons name="moon-outline" size={20} color="#FFF" />
            <Text style={styles.menuText}>Somn</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.menuRow, { marginTop: 6 }]}>
          <TouchableOpacity
            style={[styles.menuCard, { backgroundColor: '#27AE60' }]}
            onPress={() => navigation.navigate('GrowthTracker')}>
            <MaterialCommunityIcons name="ruler" size={20} color="#FFF" />
            <Text style={styles.menuText}>Creștere</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuCard, { backgroundColor: '#D81B60' }]}
            onPress={() => navigation.navigate('Mama')}>
            <Ionicons name="woman-outline" size={20} color="#FFF" />
            <Text style={styles.menuText}>MAMA</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Banner Somn Dinamic */}
      {activeSleepEntry && (
        <View style={styles.activeSleepCard}>
          <View style={styles.row}>
            <Ionicons name="moon" size={28} color="#FFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeSleepTitle}>{babyName} doarme 🌙</Text>
              <Text style={styles.activeSleepSub}>{activeSleepEntry.value}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.wakeUpBtn} onPress={handleWakeUp}>
            <Ionicons name="sunny-outline" size={20} color="#2980B9" style={{ marginRight: 6 }} />
            <Text style={styles.wakeUpBtnText}>S-a trezit!</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Zona Istoric */}
      <View style={[styles.card, { flex: 1, marginTop: 6 }]}>
        <Text style={styles.cardTitle}>Istoric Activități ({sortedEntries.length})</Text>

        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={true}>
          {sortedEntries.length === 0 ? (
            <Text style={styles.emptyText}>Nu există activități înregistrate.</Text>
          ) : (
            sortedEntries.map((item, index) => {
              const itemKey = `entry_${index}_${item.id}`;
              const formattedDate = cleanDate(item.date);
              const formattedTime = cleanTime(item.time);
              const dateTimeCombined = `${formattedDate} ${formattedTime}`.trim();
              const isSleep = item.type === 'sleep';

              return (
                <View key={itemKey} style={styles.historyItem}>
                  <View style={styles.row}>
                    {renderIconForType(item.type)}
                    <View>
                      <Text style={styles.historyType}>
                        {item.type ? item.type.toUpperCase() : 'ACTIVITATE'}
                      </Text>
                      <Text style={styles.historyDateTime}>{dateTimeCombined}</Text>
                    </View>
                  </View>

                  {isSleep ? (
                    renderSleepDetails(item.value)
                  ) : (
                    <Text style={styles.historyValue}>
                      {item.value || (item.amount ? `${item.amount} ml` : '-')}
                    </Text>
                  )}
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
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#555', marginVertical: 6, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 8, marginRight: 8, fontSize: 13 },
  button: { backgroundColor: '#D35400', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  buttonSmall: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  statusText: { flex: 1, fontSize: 12, color: '#666', marginRight: 8 },

  menuGridContainer: { marginBottom: 8 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between' },
  menuCard: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  menuText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 2,
    fontSize: 12,
  },

  activeSleepCard: { backgroundColor: '#2980B9', padding: 14, borderRadius: 12, marginBottom: 10, elevation: 3 },
  activeSleepTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  activeSleepSub: { color: '#EBF5FB', fontSize: 13, marginTop: 2 },
  wakeUpBtn: { backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 8 },
  wakeUpBtnText: { color: '#2980B9', fontWeight: 'bold', fontSize: 13 },

  historyList: { flex: 1, marginTop: 4 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5ECE1' },
  historyType: { fontWeight: 'bold', fontSize: 15, color: '#2C3E50' },
  historyDateTime: { fontSize: 12, color: '#7F8C8D', marginTop: 2, fontWeight: '500' },
  historyValue: { fontSize: 15, fontWeight: 'bold', color: '#D35400' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },

  sleepDetailsContainer: { alignItems: 'flex-end' },
  sleepDetailRow: { flexDirection: 'row', alignItems: 'center' },
  sleepDetailText: { fontSize: 14, fontWeight: 'bold', color: '#2C3E50' },
});