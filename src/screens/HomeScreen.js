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
  Dimensions,
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
  getForceOffline,
  getTheme,
  getLanguage,
  deleteEntryById,
  updateEntryValue,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { translations } from '../services/translations';
import ZZZAnimation from '../components/ZZZAnimation';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwWQ7UAaX_5fi1GT9nyNmpM5xZbUvVeZ2AY_mISSk7ANXoFSC6Y3Jq37y_EB5Fs4Toa3Q/exec';

  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [babyName, setBabyName] = useState('Bebelușul');
  const [dropsEnabled, setDropsEnabled] = useState(false);

  // Stări pentru Offline, Temă și Limbă
  const [isOffline, setIsOffline] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const [currentLang, setCurrentLang] = useState('ro');

  const t = translations[currentLang] || translations.ro;

  // Stare pentru Filtru Istoric ('all', 'milk', 'sleep', 'growth', 'mama')
  const [filterType, setFilterType] = useState('all');

  // Stare pentru pagina curentă din meniul de activități (Swipe left-right)
  const [activeMenuPage, setActiveMenuPage] = useState(0);

  // Stare pentru secțiunile collapse/expand pe zile
  const [collapsedDays, setCollapsedDays] = useState({});

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);
  const [editedValue, setEditedValue] = useState('');

  const isSyncingRef = useRef(false);

  // --- FUNCȚII HELPER ---
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
          const forcedOffline = await getForceOffline();
          const themeMode = await getTheme();
          const langCode = await getLanguage();

          const safeLocal = Array.isArray(localData) ? localData : [];

          if (isMounted) {
            setEntries(safeLocal);
            if (savedBabyName) setBabyName(savedBabyName);
            setDropsEnabled(savedDropsEnabled);
            setIsOffline(forcedOffline);
            setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
            setCurrentLang(langCode || 'ro');
          }

          if (forcedOffline) {
            setLoading(false);
            isSyncingRef.current = false;
            return;
          }

          const activeUrl = savedUrl || DEFAULT_SHEET_URL;
          if (!savedUrl) {
            await saveSheetUrl(DEFAULT_SHEET_URL);
          }

          if (isMounted) {
            setSheetUrl(activeUrl);
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

    const forcedOffline = await getForceOffline();
    if (forcedOffline) {
      setIsOffline(true);
      return;
    }

    setLoading(true);
    try {
      const remoteEntries = await fetchFromSheet(targetUrl);
      if (!Array.isArray(remoteEntries) || remoteEntries.length === 0) {
        return;
      }

      setIsOffline(false);

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
      } else if (isDropsOn) {
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
      setIsOffline(true);
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

      const forcedOffline = await getForceOffline();
      if (sheetUrl && !forcedOffline) {
        sendToSheet(sheetUrl, updatedDropsEntry).catch((err) => {
          console.log('Eroare sincronizare fundal drops:', err);
        });
      }
    } catch (e) {
      console.error('Eroare la administrarea picăturilor:', e);
    }
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
      if (cleanType === 'drops') return;

      const cleanId = String(item.id).replace(/^'/, '').trim();
      const val = String(item.value || '').trim();

      if (val === '') {
        entriesMap.delete(cleanId);
      } else {
        entriesMap.set(cleanId, item);
      }
    }
  });

  const allUniqueEntries = Array.from(entriesMap.values()).sort((a, b) => {
    const timeA = a.fullDateTime || a.id || '';
    const timeB = b.fullDateTime || b.id || '';
    return timeB.localeCompare(timeA);
  });

  // --- LOGICĂ FILTRARE ---
  const filteredEntries = allUniqueEntries.filter((item) => {
    const tItem = String(item.type || '').toLowerCase();
    if (filterType === 'all') {
      return tItem !== 'mama' && tItem !== 'alaptare';
    }
    if (filterType === 'milk') return tItem === 'milk' || tItem === 'lapte';
    if (filterType === 'sleep') return tItem === 'sleep';
    if (filterType === 'growth' || filterType === 'crestere') return tItem === 'growth' || tItem === 'crestere';
    if (filterType === 'mama') return tItem === 'mama' || tItem === 'alaptare';
    return true;
  });

  // --- CALCUL CREȘTERE ---
  const growthEntriesList = allUniqueEntries.filter(
    (item) => item && (item.type === 'growth' || item.type === 'crestere')
  );

  const getGrowthDifferenceText = (currentItem) => {
    const currentIndex = growthEntriesList.findIndex((i) => i.id === currentItem.id);
    if (currentIndex === -1 || currentIndex === growthEntriesList.length - 1) {
      return 'Prima măsurătoare';
    }
    const previousItem = growthEntriesList[currentIndex + 1];

    const currVal = String(currentItem.value || '');
    const prevVal = String(previousItem.value || '');

    const currKg = parseFloat(currVal.match(/([\d.]+)\s*(?:kg|g)/i)?.[1] || '0');
    const prevKg = parseFloat(prevVal.match(/([\d.]+)\s*(?:kg|g)/i)?.[1] || '0');

    const currCm = parseFloat(currVal.match(/([\d.]+)\s*cm/i)?.[1] || '0');
    const prevCm = parseFloat(prevVal.match(/([\d.]+)\s*cm/i)?.[1] || '0');

    let diffs = [];
    if (currKg && prevKg) {
      const diffKg = (currKg - prevKg).toFixed(2);
      diffs.push(`${diffKg > 0 ? '+' : ''}${diffKg} kg`);
    }
    if (currCm && prevCm) {
      const diffCm = (currCm - prevCm).toFixed(1);
      diffs.push(`${diffCm > 0 ? '+' : ''}${diffCm} cm`);
    }

    if (diffs.length > 0) {
      return `🗓️ Față de data trecută: ${diffs.join(', ')}`;
    }
    return 'Actualizat';
  };

  // --- GRUPARE PE ZILE PENTRU ISTORIC ---
  const groupedEntries = filteredEntries.reduce((groups, item) => {
    const dateKey = cleanDate(item.date) || 'Altele';
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));

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

  const sleepEntries = allUniqueEntries.filter((item) => item && item.type === 'sleep' && item.value);
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

      const forcedOffline = await getForceOffline();
      if (sheetUrl && !forcedOffline) {
        await sendToSheet(sheetUrl, updatedEntry);
      }
    } catch (e) {
      console.error('Eroare la handleWakeUp:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (itemId) => {
    const forcedOffline = await getForceOffline();
    const updated = await deleteEntryById(itemId, entries, forcedOffline ? null : sheetUrl);
    setEntries(updated);
  };

  const handleOpenEditModal = (item) => {
    setCurrentEditingItem(item);
    setEditedValue(item.value || '');
    setEditModalVisible(true);
  };

  const handleConfirmEdit = async () => {
    if (!currentEditingItem) return;
    const forcedOffline = await getForceOffline();
    const updated = await updateEntryValue(currentEditingItem, editedValue, entries, forcedOffline ? null : sheetUrl);
    setEntries(updated);
    setEditModalVisible(false);
    setCurrentEditingItem(null);
  };

  const toggleDayCollapse = (dateKey) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const translateType = (type) => {
    const tLower = String(type || '').toLowerCase();
    if (tLower === 'milk' || tLower === 'lapte') return t.milk;
    if (tLower === 'sleep' || tLower === 'somn') return t.sleep;
    if (tLower === 'growth' || tLower === 'crestere') return t.growth;
    if (tLower === 'mama' || tLower === 'alaptare') return t.mama;
    return tLower.toUpperCase();
  };

  const renderSleepDetails = (value) => {
    if (!value) return <Text style={[styles.historyValue, { color: currentTheme.tint }]}>-</Text>;

    const isSleepingNow = value.toLowerCase().includes('adormit la') && !value.toLowerCase().includes('trezit la');
    if (isSleepingNow) {
      return (
        <View style={[styles.sleepDetailsContainer, { flexDirection: 'row', alignItems: 'center' }]}>
          <ZZZAnimation style={{ marginRight: 4 }} textStyle={{ color: '#2980B9', fontSize: 11 }} />
          <Text style={[styles.sleepDetailTextActive, { color: '#2980B9' }]}>Doarme încă...</Text>
        </View>
      );
    }

    const sleepMatch = value.match(/Adormit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|\s*Trezit|$)/i);
    const wakeMatch = value.match(/Trezit la\s+([\d:A-Za-z\s ]+?)(?=\s*-|$)/i);

    const sleepTimeStr = sleepMatch ? sleepMatch[1].trim() : '';
    const wakeTimeStr = wakeMatch ? wakeMatch[1].trim() : '';

    if (sleepTimeStr || wakeTimeStr) {
      return (
        <View style={styles.sleepDetailsContainer}>
          {sleepTimeStr ? (
            <View style={styles.sleepDetailRow}>
              <Ionicons name="moon" size={13} color="#2980B9" style={{ marginRight: 4 }} />
              <Text style={[styles.sleepDetailTextSleep, { color: '#2980B9' }]}>{sleepTimeStr}</Text>
            </View>
          ) : null}
          {wakeTimeStr ? (
            <View style={[styles.sleepDetailRow, { marginTop: 2 }]}>
              <Ionicons name="sunny" size={13} color="#E67E22" style={{ marginRight: 4 }} />
              <Text style={[styles.sleepDetailTextWake, { color: '#E67E22' }]}>{wakeTimeStr}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return <Text style={[styles.historyValue, { color: currentTheme.tint }]}>{value}</Text>;
  };

  const renderIconForType = (type) => {
    const cleanType = String(type || '').toLowerCase();
    if (cleanType === 'milk' || cleanType === 'lapte') {
      return <FontAwesome5 name="wine-bottle" size={16} color="#D35400" style={{ marginRight: 8 }} />;
    }
    if (cleanType === 'growth' || cleanType === 'crestere') {
      return <MaterialCommunityIcons name="ruler" size={18} color="#27AE60" style={{ marginRight: 8 }} />;
    }
    if (cleanType === 'mama' || cleanType === 'alaptare') {
      return <Ionicons name="woman-outline" size={18} color="#D81B60" style={{ marginRight: 8 }} />;
    }
    return <Ionicons name="moon-outline" size={18} color="#2980B9" style={{ marginRight: 8 }} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      {/* ANTET SUPERIOR (Nume Bebeluș & Buton Setări) */}
      <View style={styles.topHeaderBar}>
        <Text style={[styles.appMainTitle, { color: currentTheme.textMain }]}>{babyName}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={[styles.settingsIconButton, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
        >
          <Ionicons name="settings-outline" size={20} color={currentTheme.textMain} />
        </TouchableOpacity>
      </View>

      {/* MESAJUL DE LIPSĂ INTERNET */}
      {isOffline && (
        <View style={{ backgroundColor: '#ffcccc', padding: 6, marginVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: '#900', fontWeight: 'bold', fontSize: 11 }}>{t.offlineWarning}</Text>
        </View>
      )}

      {/* Banner Picături */}
      {showDropsBanner && (
        <View style={styles.dropsCard}>
          <View style={styles.dropsContentRow}>
            <Ionicons name="medkit-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dropsTitle}>{t.dropsTitle}</Text>
              <Text style={styles.dropsSub}>{t.dropsSub(babyName)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.dropsBtn} onPress={handleAdministerDrops}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#27AE60" style={{ marginRight: 4 }} />
            <Text style={styles.dropsBtnText}>{t.dropsBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2. MENIU ACTIVITĂȚI 4x TILES (CU ÎNĂLȚIME DE 62px) */}
      <Text style={[styles.sectionHeader, { color: currentTheme.textSub }]}>
        {t.menuHeader || 'Meniu Activități'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const page = Math.round(offsetX / (width - 20));
          setActiveMenuPage(page);
        }}
        style={styles.menuSwipeContainer}
        contentContainerStyle={styles.menuSwipeContentContainer}
      >
        {/* Pagina 1: 4 tile-uri principale */}
        <View style={[styles.menuPageGrid, { width: width - 20 }]}>
          <View style={styles.menuRow}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#E67E22' }]}
              onPress={() => navigation.navigate('MilkTracker')}>
              <FontAwesome5 name="wine-bottle" size={18} color="#FFF" />
              <Text style={styles.menuText}>{t.milk}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#2980B9' }]}
              onPress={() => navigation.navigate('SleepTracker')}>
              <Ionicons name="moon-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>{t.sleep}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.menuRow, { marginTop: 6 }]}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#27AE60' }]}
              onPress={() => navigation.navigate('GrowthTracker')}>
              <MaterialCommunityIcons name="ruler" size={20} color="#FFF" />
              <Text style={styles.menuText}>{t.growth}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#D81B60' }]}
              onPress={() => navigation.navigate('Mama')}>
              <Ionicons name="woman-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>{t.mama}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pagina 2: 4 tile-uri viitoare */}
        <View style={[styles.menuPageGrid, { width: width - 20 }]}>
          <View style={styles.menuRow}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#8E44AD' }]}
              onPress={() => Alert.alert('În curând', 'Modulul Scutec va fi disponibil în curând.')}>
              <MaterialCommunityIcons name="baby-face-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Scutec</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#16A085' }]}
              onPress={() => Alert.alert('În curând', 'Modulul Achiziții va fi disponibil în curând.')}>
              <Ionicons name="cart-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Achiziții</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.menuRow, { marginTop: 6 }]}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#D35400' }]}
              onPress={() => Alert.alert('În curând', 'Modulul Note va fi disponibil în curând.')}>
              <Ionicons name="book-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#7F8C8D' }]}
              onPress={() => Alert.alert('În curând', 'Modulul Custom va fi disponibil în curând.')}>
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Indicatori puncte compacti */}
      <View style={styles.paginationDotsContainer}>
        <View style={[styles.dot, activeMenuPage === 0 && styles.activeDot]} />
        <View style={[styles.dot, activeMenuPage === 1 && styles.activeDot]} />
      </View>

      {/* Banner Somn Dinamic (cu lună în stânga și ZZZ lângă titlu) */}
      {activeSleepEntry && (
        <View style={styles.activeSleepCard}>
          <View style={styles.row}>
            <Ionicons name="moon" size={22} color="#FFF" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <View style={[styles.row, { alignItems: 'center' }]}>
                <Text style={styles.activeSleepTitle}>{t.sleeping(babyName)}</Text>
                <ZZZAnimation style={{ marginLeft: 6 }} textStyle={{ color: '#FFF', fontSize: 13 }} />
              </View>
              <Text style={styles.activeSleepSub}>{activeSleepEntry.value}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.wakeUpBtn} onPress={handleWakeUp}>
            <Ionicons name="sunny-outline" size={16} color="#2980B9" style={{ marginRight: 4 }} />
            <Text style={styles.wakeUpBtnText}>{t.wakeUp}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. ZONA ISTORIC CU FILTRE ȘI SECȚIUNI COLLAPSE/EXPAND PE ZILE */}
      <View style={[styles.card, { flex: 1, marginTop: 2, backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>

        {/* Rând Filtre cu Iconițe (Compact) */}
        <View style={styles.filterRowContainer}>
          <TouchableOpacity
            style={[styles.filterIconChip, filterType === 'all' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
            onPress={() => setFilterType('all')}
          >
            <Ionicons name="apps-outline" size={18} color={filterType === 'all' ? '#FFF' : currentTheme.textSub} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterIconChip, filterType === 'milk' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
            onPress={() => setFilterType('milk')}
          >
            <FontAwesome5 name="wine-bottle" size={16} color={filterType === 'milk' ? '#FFF' : '#D35400'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterIconChip, filterType === 'sleep' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
            onPress={() => setFilterType('sleep')}
          >
            <Ionicons name="moon-outline" size={18} color={filterType === 'sleep' ? '#FFF' : '#2980B9'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterIconChip, filterType === 'growth' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
            onPress={() => setFilterType('growth')}
          >
            <MaterialCommunityIcons name="ruler" size={18} color={filterType === 'growth' ? '#FFF' : '#27AE60'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterIconChip, filterType === 'mama' && styles.filterIconChipActive, { borderColor: currentTheme.border }]}
            onPress={() => setFilterType('mama')}
          >
            <Ionicons name="woman-outline" size={18} color={filterType === 'mama' ? '#FFF' : '#D81B60'} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.historyList}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => performSync(sheetUrl, entries, dropsEnabled)}
              colors={[currentTheme.tint]}
              tintColor={currentTheme.tint}
            />
          }
        >
          {sortedDates.length === 0 ? (
            <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>{t.noActivity}</Text>
          ) : (
            sortedDates.map((dateStr) => {
              const dayEntries = groupedEntries[dateStr];
              const isToday = dateStr === todayStr;
              const displayDateLabel = isToday ? 'Astăzi' : dateStr;
              const isCollapsed = !!collapsedDays[dateStr];

              return (
                <View key={dateStr} style={styles.dayGroupContainer}>
                  {/* Antet Zi Collapse / Expand */}
                  <TouchableOpacity
                    style={[styles.dayHeaderRow, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
                    onPress={() => toggleDayCollapse(dateStr)}
                  >
                    <View style={styles.row}>
                      <Ionicons
                        name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                        size={16}
                        color={currentTheme.textMain}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.dayHeaderTitle, { color: currentTheme.textMain }]}>
                        📅 {displayDateLabel} ({dayEntries.length})
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Conținutul zilei (afișat doar dacă NU este collapsed) */}
                  {!isCollapsed && dayEntries.map((item, index) => {
                    const itemKey = `entry_${dateStr}_${index}_${item.id || index}`;
                    const formattedTime = cleanTime(item.time);
                    const isSleep = String(item.type || '').toLowerCase() === 'sleep';
                    const isGrowth = String(item.type || '').toLowerCase() === 'growth' || String(item.type || '').toLowerCase() === 'crestere';

                    return (
                      <TouchableOpacity
                        key={itemKey}
                        style={[styles.historyItem, { borderBottomColor: currentTheme.borderColorLight }]}
                        onLongPress={() => {
                          Alert.alert(t.actionTitle, t.actionSub, [
                            { text: t.cancel, style: 'cancel' },
                            { text: t.edit, onPress: () => handleOpenEditModal(item) },
                            { text: t.delete, style: 'destructive', onPress: () => handleDeleteEntry(item.id) },
                          ]);
                        }}
                      >
                        <View style={[styles.row, { flex: 1, marginRight: 8 }]}>
                          {renderIconForType(item.type)}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyType, { color: currentTheme.textMain }]}>
                              {translateType(item.type)}
                            </Text>
                            <Text style={[styles.historyDateTime, { color: currentTheme.textSub }]}>
                              {isGrowth ? getGrowthDifferenceText(item) : formattedTime}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.valueRightContainer}>
                          {isSleep ? (
                            renderSleepDetails(item.value)
                          ) : (
                            <Text style={[styles.historyValue, { color: currentTheme.tint }]}>{item.value || '-'}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Modal Editare */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: currentTheme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.modalBackground }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>{t.editTitle}</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              value={editedValue}
              onChangeText={setEditedValue}
              placeholder={t.editPlaceholder}
              placeholderTextColor={currentTheme.inputPlaceholder}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#95A5A6' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#27AE60', marginLeft: 8 }]}
                onPress={handleConfirmEdit}
              >
                <Text style={styles.buttonText}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 10, paddingBottom: 6, paddingTop: 2 },
  card: { padding: 8, borderRadius: 10, marginBottom: 4, elevation: 1, borderWidth: 1 },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', marginVertical: 2, marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },

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

  filterRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 4,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  filterIconChip: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: 'transparent',
  },
  filterIconChipActive: {
    backgroundColor: '#D35400',
    borderColor: '#D35400',
  },

  dropsCard: { backgroundColor: '#27AE60', padding: 10, borderRadius: 10, marginBottom: 4, elevation: 1 },
  dropsContentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dropsTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  dropsSub: { color: '#E8F8F5', fontSize: 11, marginTop: 1 },
  dropsBtn: { backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
  dropsBtnText: { color: '#27AE60', fontWeight: 'bold', fontSize: 11 },

  menuSwipeContainer: { flexGrow: 0, marginBottom: 2 },
  menuSwipeContentContainer: { alignItems: 'center' },
  menuPageGrid: { marginHorizontal: 2 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between' },
  menuCard: { flex: 1, marginHorizontal: 3, height: 62, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 1, flexDirection: 'row' },
  menuText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 11 },

  paginationDotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 8, marginBottom: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 2 },
  activeDot: { backgroundColor: '#D35400', width: 10 },

  activeSleepCard: { backgroundColor: '#2980B9', padding: 8, borderRadius: 10, marginBottom: 4, elevation: 1 },
  activeSleepTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  activeSleepSub: { color: '#EBF5FB', fontSize: 11, marginTop: 1 },
  wakeUpBtn: { backgroundColor: '#FFF', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 2 },
  wakeUpBtnText: { color: '#2980B9', fontWeight: 'bold', fontSize: 11 },

  dayGroupContainer: { marginBottom: 6 },
  dayHeaderRow: { padding: 6, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  dayHeaderTitle: { fontSize: 12, fontWeight: 'bold' },

  historyList: { flex: 1, marginTop: 2 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, paddingLeft: 10 },
  historyType: { fontWeight: 'bold', fontSize: 11 },
  historyDateTime: { fontSize: 10, marginTop: 1, fontWeight: '500' },
  valueRightContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  historyValue: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 12 },

  sleepDetailsContainer: { alignItems: 'flex-end' },
  sleepDetailRow: { flexDirection: 'row', alignItems: 'center' },
  sleepDetailTextSleep: { fontSize: 11, fontWeight: 'bold' },
  sleepDetailTextWake: { fontSize: 11, fontWeight: 'bold' },
  sleepDetailTextActive: { fontSize: 11, fontWeight: 'bold' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 15 },
  modalContent: { width: '100%', padding: 15, borderRadius: 10, elevation: 4 },
  modalTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 13, marginBottom: 12 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
});