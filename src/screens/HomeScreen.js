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
  StatusBar,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  saveSheetUrl,
  fetchFromSheet,
  sendToSheet,
  getBabyName,
  getDropsEnabled,
} from '../services/storage';

export default function HomeScreen({ navigation }) {
  const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwWQ7UAaX_5fi1GT9nyNmpM5xZbUvVeZ2AY_mISSk7ANXoFSC6Y3Jq37y_EB5Fs4Toa3Q/exec';

  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [isUrlSaved, setIsUrlSaved] = useState(true);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [babyName, setBabyName] = useState('Bebelușul');
  const [dropsEnabled, setDropsEnabled] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);
  const [editedValue, setEditedValue] = useState('');

  const isSyncingRef = useRef(false);

  // --- FUNCȚII HELPER DECLARATE PRIMELE ---
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

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  // ----------------------------------------

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const initializeAndSync = async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        setLoading(true);

        try {
          const savedUrl = await getStoredSheetUrl();
          const localData = await getLocalEntries();
          const savedBabyName = await getBabyName();
          const savedDropsEnabled = await getDropsEnabled();

          const safeLocal = Array.isArray(localData) ? localData : [];

          if (isMounted) {
            setEntries(safeLocal);
            if (savedBabyName) setBabyName(savedBabyName);
            setDropsEnabled(savedDropsEnabled);
          }

          const activeUrl = savedUrl || DEFAULT_SHEET_URL;
          if (!savedUrl) {
            await saveSheetUrl(DEFAULT_SHEET_URL);
          }

          if (isMounted) {
            setSheetUrl(activeUrl);
            setIsUrlSaved(true);
          }

          await performSync(activeUrl, safeLocal, savedDropsEnabled);
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

  const performSync = async (targetUrl, currentLocalEntries = [], isDropsOn = false) => {
    if (!targetUrl) return;
    setLoading(true);
    try {
      const remoteEntries = await fetchFromSheet(targetUrl);
      if (!Array.isArray(remoteEntries) || remoteEntries.length === 0) return;

      let cleanRemote = remoteEntries
        .map((item) => ({
          id: String(item?.id || '').replace(/^'/, '').trim(),
          date: cleanDate(item?.date),
          time: cleanTime(item?.time),
          type: String(item?.type || '').trim(),
          value: String(item?.value || '').trim(),
          fullDateTime: String(item?.fullDateTime || '').replace(/^'/, '').trim(),
          drops: item?.drops !== undefined ? Number(item?.drops) : 0,
        }))
        .filter((item) => item.id !== '');

      const todayStr = getTodayDateString();

      const localDropsAdministered = currentLocalEntries.some((item) => {
        if (
          !item ||
          String(item.type || '').toLowerCase() !== 'drops' ||
          cleanDate(item.date) !== todayStr
        ) {
          return false;
        }
        return (
          Number(item.drops) === 1 ||
          String(item.value || '').trim().toLowerCase() === 'administrate'
        );
      });

      if (localDropsAdministered) {
        let foundRemoteToday = false;
        cleanRemote.forEach((item) => {
          if (item.type === 'drops' && cleanDate(item.date) === todayStr) {
            item.drops = 1;
            item.value = 'Administrate';
            foundRemoteToday = true;
          }
        });

        if (!foundRemoteToday) {
          cleanRemote.push({
            id: `drops_${todayStr}`,
            date: todayStr,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'drops',
            value: 'Administrate',
            fullDateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
            drops: 1,
          });
        }

        sendToSheet(targetUrl, {
          id: `drops_${todayStr}`,
          date: todayStr,
          type: 'drops',
          value: 'Administrate',
          drops: 1,
        }).catch(() => {});
      }
      else if (isDropsOn) {
        const hasRemoteToday = cleanRemote.some(
          (e) => e.type === 'drops' && cleanDate(e.date) === todayStr
        );

        if (!hasRemoteToday) {
          const newDropsEntry = {
            id: `drops_${todayStr}`,
            date: todayStr,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'drops',
            value: 'Neadministrate',
            fullDateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
            drops: 0,
          };
          cleanRemote.push(newDropsEntry);
          await sendToSheet(targetUrl, newDropsEntry);
        }
      }

      setEntries(cleanRemote);
      await saveLocalEntries(cleanRemote);
    } catch (e) {
      console.log('Sincronizare eșuată sau offline:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdministerDrops = async () => {
    try {
      const todayStr = getTodayDateString();
      const now = new Date();
      const nowIsoString = now.toISOString().replace('T', ' ').substring(0, 19);
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const existingDropsIndex = entries.findIndex(
        (item) => item && item.type === 'drops' && cleanDate(item.date) === todayStr
      );

      let updatedDropsEntry;
      let updatedEntries = [...entries];

      if (existingDropsIndex >= 0) {
        updatedDropsEntry = {
          ...updatedEntries[existingDropsIndex],
          value: 'Administrate',
          drops: 1,
          fullDateTime: nowIsoString,
          time: timeStr,
        };
        updatedEntries[existingDropsIndex] = updatedDropsEntry;
      } else {
        updatedDropsEntry = {
          id: `drops_${todayStr}`,
          date: todayStr,
          time: timeStr,
          type: 'drops',
          value: 'Administrate',
          fullDateTime: nowIsoString,
          drops: 1,
        };
        updatedEntries.push(updatedDropsEntry);
      }

      setEntries(updatedEntries);
      await saveLocalEntries(updatedEntries);

      if (sheetUrl) {
        sendToSheet(sheetUrl, updatedDropsEntry).catch((err) => {
          console.log('Eroare sincronizare fundal drops:', err);
        });
      }
    } catch (e) {
      console.error('Eroare la administrarea picăturilor:', e);
    }
  };

  const handleSaveUrl = async () => {
    if (!sheetUrl.trim()) return;
    await saveSheetUrl(sheetUrl.trim());
    setIsUrlSaved(true);
    await performSync(sheetUrl.trim(), entries, dropsEnabled);
  };

  const handleSwapUrl = () => {
    Alert.alert('Schimbare Link', 'Dorești să schimbi link-ul către Google Sheet?', [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Da, schimbă', onPress: () => setIsUrlSaved(false) },
    ]);
  };

  const safeEntries = Array.isArray(entries) ? entries : [];

  const sortedRawEntries = [...safeEntries].sort((a, b) => {
    const timeA = a.fullDateTime || a.id || '';
    const timeB = b.fullDateTime || b.id || '';
    return timeA.localeCompare(timeB);
  });

  const entriesMap = new Map();
  sortedRawEntries.forEach((item) => {
    if (item && item.id) {
      const cleanType = String(item.type || '').toLowerCase();
      if (cleanType === 'alaptare' || cleanType === 'drops') return;

      const cleanId = String(item.id).replace(/^'/, '').trim();
      const val = String(item.value || '').trim();

      if (val === '') {
        entriesMap.delete(cleanId);
      } else {
        entriesMap.set(cleanId, item);
      }
    }
  });

  const sortedEntries = Array.from(entriesMap.values()).sort((a, b) => {
    const timeA = a.fullDateTime || a.id || '';
    const timeB = b.fullDateTime || b.id || '';
    return timeB.localeCompare(timeA);
  });

  // --- LOGICĂ PICĂTURI ZILNICE NORMALIZATĂ ---
  const todayStr = getTodayDateString();

  const todayDropsItems = safeEntries.filter((item) => {
    if (!item || String(item.type || '').toLowerCase() !== 'drops') {
      return false;
    }
    return cleanDate(item.date) === todayStr;
  });

  const hasBeenAdministeredToday = todayDropsItems.some((item) => {
    const value = String(item.value || '').trim().toLowerCase();
    const drops = Number(item.drops);
    return drops === 1 || value === 'administrate';
  });

  const showDropsBanner = dropsEnabled && !hasBeenAdministeredToday;
  // ---------------------------------------------

  const sleepEntries = sortedEntries.filter((item) => item && item.type === 'sleep' && item.value);
  const latestSleep = sleepEntries[0];
  const activeSleepEntry =
    latestSleep &&
    latestSleep.value.toLowerCase().includes('adormit la') &&
    !latestSleep.value.toLowerCase().includes('trezit la')
      ? latestSleep
      : null;

  const handleWakeUp = async () => {
    if (!activeSleepEntry || loading) return;
    setLoading(true);

    try {
      const wakeTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let sleepTimeStr = '';
      const matchAdormit = String(activeSleepEntry.value || '').match(/Adormit la\s+([\d:A-Za-z\s]+)/i);
      if (matchAdormit && matchAdormit[1]) {
        sleepTimeStr = matchAdormit[1].trim();
      } else {
        sleepTimeStr = activeSleepEntry.time || '';
      }

      const formattedValue = `Adormit la ${sleepTimeStr} - Trezit la ${wakeTime}`;
      const cleanId = String(activeSleepEntry.id || '').replace(/^'/, '').trim();
      const nowString = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const updatedEntry = {
        ...activeSleepEntry,
        id: cleanId,
        value: formattedValue,
        fullDateTime: nowString,
      };

      const updatedEntries = [...safeEntries, updatedEntry];
      setEntries(updatedEntries);
      await saveLocalEntries(updatedEntries);

      if (sheetUrl) {
        await sendToSheet(sheetUrl, updatedEntry);
      }
    } catch (e) {
      console.error('Eroare la handleWakeUp:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = (itemId) => {
    Alert.alert('Confirmare Ștergere', 'Sigur dorești să ștergi această activitate?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          const targetCleanId = String(itemId || '').replace(/^'/, '').trim();
          if (!targetCleanId) return;

          const nowString = new Date().toISOString().replace('T', ' ').substring(0, 19);

          const emptyEntry = {
            id: targetCleanId,
            date: '',
            time: '',
            type: '',
            value: '',
            fullDateTime: nowString,
          };

          const updatedEntries = [...safeEntries, emptyEntry];
          setEntries(updatedEntries);
          await saveLocalEntries(updatedEntries);

          if (sheetUrl) {
            await sendToSheet(sheetUrl, emptyEntry);
          }
        },
      },
    ]);
  };

  const handleOpenEditModal = (item) => {
    setCurrentEditingItem(item);
    setEditedValue(item.value || '');
    setEditModalVisible(true);
  };

  const handleConfirmEdit = () => {
    Alert.alert('Confirmare Modificare', 'Dorești să salvezi modificările?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Salvează',
        onPress: async () => {
          if (!currentEditingItem) return;
          const cleanId = String(currentEditingItem.id).replace(/^'/, '').trim();
          const nowString = new Date().toISOString().replace('T', ' ').substring(0, 19);

          const updatedEntry = {
            ...currentEditingItem,
            id: cleanId,
            value: editedValue,
            fullDateTime: nowString,
          };

          const updatedEntries = [...safeEntries, updatedEntry];
          setEntries(updatedEntries);
          await saveLocalEntries(updatedEntries);
          setEditModalVisible(false);
          setCurrentEditingItem(null);

          if (sheetUrl) {
            await sendToSheet(sheetUrl, updatedEntry);
          }
        },
      },
    ]);
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

  const renderIconForType = (type) => {
    const cleanType = String(type || '').toLowerCase();
    if (cleanType === 'milk' || cleanType === 'lapte') {
      return <FontAwesome5 name="wine-bottle" size={18} color="#D35400" style={{ marginRight: 12 }} />;
    }
    if (cleanType === 'growth' || cleanType === 'crestere') {
      return <MaterialCommunityIcons name="ruler" size={20} color="#27AE60" style={{ marginRight: 12 }} />;
    }
    return <Ionicons name="moon-outline" size={20} color="#2980B9" style={{ marginRight: 12 }} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" translucent={false} />

      {/* Sync Header */}
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
              placeholder="Introdu URL WebApp"
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
            <Text style={styles.statusText} numberOfLines={1}>Conectat: {sheetUrl}</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.buttonSmall, { backgroundColor: '#27AE60' }]}
                onPress={() => performSync(sheetUrl, entries, dropsEnabled)}>
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

      {/* Banner Picături (Zilnic) */}
      {showDropsBanner && (
        <View style={styles.dropsCard}>
          <View style={styles.row}>
            <Ionicons name="medkit-outline" size={26} color="#FFF" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dropsTitle}>Nu uita de picături! 💧</Text>
              <Text style={styles.dropsSub}>Nu au fost administrate astăzi pentru {babyName}.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.dropsBtn} onPress={handleAdministerDrops}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#27AE60" style={{ marginRight: 6 }} />
            <Text style={styles.dropsBtnText}>Le-am administrat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Meniu Navigare */}
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

      {/* Banner Somn Dinamic */}
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

      {/* Zona Istoric */}
      <View style={[styles.card, { flex: 1, marginTop: 6 }]}>
        <Text style={styles.cardTitle}>Istoric Activități ({sortedEntries.length})</Text>

        <ScrollView
          style={styles.historyList}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => performSync(sheetUrl, entries, dropsEnabled)}
              colors={['#D35400']}
              tintColor="#D35400"
            />
          }
        >
          {sortedEntries.length === 0 ? (
            <Text style={styles.emptyText}>Nu există activități înregistrate.</Text>
          ) : (
            sortedEntries.map((item, index) => {
              const itemKey = `entry_${index}_${item.id || index}`;
              const formattedDate = cleanDate(item.date);
              const formattedTime = cleanTime(item.time);
              const dateTimeCombined = `${formattedDate} ${formattedTime}`.trim();
              const isSleep = item.type === 'sleep';

              return (
                <TouchableOpacity
                  key={itemKey}
                  style={styles.historyItem}
                  onLongPress={() => {
                    Alert.alert('Acțiune Înregistrare', 'Ce dorești să faci?', [
                      { text: 'Anulează', style: 'cancel' },
                      { text: 'Editează', onPress: () => handleOpenEditModal(item) },
                      { text: 'Șterge', style: 'destructive', onPress: () => handleDeleteEntry(item.id) },
                    ]);
                  }}
                >
                  <View style={[styles.row, { flex: 1, marginRight: 10 }]}>
                    {renderIconForType(item.type)}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyType}>
                        {item.type ? item.type.toUpperCase() : 'ACTIVITATE'}
                      </Text>
                      <Text style={styles.historyDateTime}>{dateTimeCombined}</Text>
                    </View>
                  </View>

                  <View style={styles.valueRightContainer}>
                    {isSleep ? (
                      renderSleepDetails(item.value)
                    ) : (
                      <Text style={styles.historyValue}>{item.value || '-'}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Modal Editare */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editează Înregistrarea</Text>
            <TextInput
              style={styles.modalInput}
              value={editedValue}
              onChangeText={setEditedValue}
              placeholder="Modifică valoarea..."
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
  container: { flex: 1, backgroundColor: '#FAF6F0', paddingHorizontal: 14, paddingBottom: 14, paddingTop: 5 },
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

  dropsCard: { backgroundColor: '#27AE60', padding: 14, borderRadius: 12, marginBottom: 10, elevation: 3 },
  dropsTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  dropsSub: { color: '#E8F8F5', fontSize: 12, marginTop: 2 },
  dropsBtn: { backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 8 },
  dropsBtnText: { color: '#27AE60', fontWeight: 'bold', fontSize: 13 },

  menuGridContainer: { marginBottom: 8 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between' },
  menuCard: { flex: 1, marginHorizontal: 3, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  menuText: { color: '#FFF', fontWeight: 'bold', marginTop: 2, fontSize: 12 },
  activeSleepCard: { backgroundColor: '#2980B9', padding: 14, borderRadius: 12, marginBottom: 10, elevation: 3 },
  activeSleepTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  activeSleepSub: { color: '#EBF5FB', fontSize: 13, marginTop: 2 },
  wakeUpBtn: { backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 8 },
  wakeUpBtnText: { color: '#2980B9', fontWeight: 'bold', fontSize: 13 },
  historyList: { flex: 1, marginTop: 4 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5ECE1' },
  historyType: { fontWeight: 'bold', fontSize: 14, color: '#2C3E50' },
  historyDateTime: { fontSize: 11, color: '#7F8C8D', marginTop: 2, fontWeight: '500' },
  valueRightContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  historyValue: { fontSize: 14, fontWeight: 'bold', color: '#D35400', textAlign: 'right' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  sleepDetailsContainer: { alignItems: 'flex-end' },
  sleepDetailRow: { flexDirection: 'row', alignItems: 'center' },
  sleepDetailText: { fontSize: 13, fontWeight: 'bold', color: '#2C3E50' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', width: '100%', padding: 20, borderRadius: 12, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 16 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
});