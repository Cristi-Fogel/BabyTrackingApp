import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, StatusBar, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeaderBar from '../components/HeaderBar';
import DropsBanner from '../components/DropsBanner';
import ActivityMenuGrid from '../components/ActivityMenuGrid';
import ActiveSleepBanner from '../components/ActiveSleepBanner';
import HistorySection from '../components/HistorySection';
import LastEventsSummary from '../components/LastEventsSummary';
import EditEntryModal from '../components/EditEntryModal';
import ActionModal from '../components/ActionModal';
import StatsDashboard from '../components/StatsDashboard';

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

export default function HomeScreen({ navigation }) {
  const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbwWQ7UAaX_5fi1GT9nyNmpM5xZbUvVeZ2AY_mISSk7ANXoFSC6Y3Jq37y_EB5Fs4Toa3Q/exec';

  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [babyName, setBabyName] = useState('Bebelușul');
  const [dropsEnabled, setDropsEnabled] = useState(false);

  const [isOffline, setIsOffline] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(lightTheme);
  const [currentLang, setCurrentLang] = useState('ro');

  const [showStats, setShowStats] = useState(false);
  const [showLastEventsBanner, setShowLastEventsBanner] = useState(true);

  const t = translations[currentLang] || translations.ro;

  const [filterType, setFilterType] = useState('all');
  const [activeMenuPage, setActiveMenuPage] = useState(0);
  const [collapsedDays, setCollapsedDays] = useState({});

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState(null);

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState(null);

  const isSyncingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        handleRefreshEntries();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [sheetUrl, entries]);

  const performSync = async (targetUrl, currentLocalEntries = [], isDropsOn = false) => {
    if (!targetUrl) return;

    const forcedOffline = await getForceOffline();
    if (forcedOffline) {
      setIsOffline(true);
      const localData = await getLocalEntries();
      if (Array.isArray(localData)) {
        setEntries([...localData]);
      }
      return;
    }

    setLoading(true);
    try {
      const remoteEntries = await fetchFromSheet(targetUrl);
      if (!Array.isArray(remoteEntries) || remoteEntries.length === 0) {
        setLoading(false);
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
        if (!item || String(item.type || '').toLowerCase() !== 'drops' || cleanDate(item.date) !== todayStr) {
          return false;
        }
        return Number(item.drops) === 1 || String(item.value || '').trim().toLowerCase() === 'administrate';
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
      }

      setEntries([...cleanRemote]);
      await saveLocalEntries(cleanRemote);
    } catch (e) {
      console.log('Sincronizare eșuată sau offline:', e);
      setIsOffline(true);
      const localData = await getLocalEntries();
      if (Array.isArray(localData)) {
        setEntries([...localData]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshEntries = async () => {
    try {
      const forcedOffline = await getForceOffline();
      if (forcedOffline) {
        const localData = await getLocalEntries();
        if (Array.isArray(localData)) {
          setEntries([...localData]);
        }
        return;
      }

      if (sheetUrl) {
        await performSync(sheetUrl, entries, dropsEnabled);
      }
    } catch (e) {
      console.error('Eroare la reîmprospătare:', e);
    }
  };

  const handleQuickEntryAdded = async (newEntry) => {
    if (!newEntry) {
      await handleRefreshEntries();
      return;
    }
    const currentEntries = Array.isArray(entries) ? entries : [];
    const updatedEntries = [newEntry, ...currentEntries];
    setEntries(updatedEntries);
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

      setEntries([...updatedEntries]);
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
        const existingItem = entriesMap.get(cleanId);

        if (existingItem) {
          const existingVal = String(existingItem.value || '').toLowerCase();
          const newVal = val.toLowerCase();

          if (newVal.includes('trezit la') && !existingVal.includes('trezit la')) {
            entriesMap.set(cleanId, item);
          } else if (!existingVal.includes('trezit la') && !newVal.includes('trezit la')) {
            entriesMap.set(cleanId, item);
          }
        } else {
          entriesMap.set(cleanId, item);
        }
      }
    }
  });

  const allUniqueEntries = Array.from(entriesMap.values()).sort((a, b) => {
    const timeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return 0;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const ampm = (match[3] || '').toUpperCase();

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const dateA = cleanDate(a.date) || '0000-00-00';
    const dateB = cleanDate(b.date) || '0000-00-00';

    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    return timeToMinutes(b.time) - timeToMinutes(a.time);
  });

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

      const currentEntries = Array.isArray(entries) ? entries : [];
      const updatedEntries = currentEntries.map((item) => {
        const itemId = String(item?.id || '').replace(/^'/, '').trim();
        return itemId === cleanId ? updatedEntry : item;
      });

      if (!updatedEntries.some((item) => String(item?.id || '').replace(/^'/, '').trim() === cleanId)) {
        updatedEntries.unshift(updatedEntry);
      }

      setEntries([...updatedEntries]);
      await saveLocalEntries(updatedEntries);

      const forcedOffline = await getForceOffline();
      if (sheetUrl && !forcedOffline) {
        sendToSheet(sheetUrl, updatedEntry).catch((err) => {
          console.log('Eroare sincronizare trezire:', err);
        });
      }
    } catch (e) {
      console.error('Eroare la handleWakeUp:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (itemId) => {
    const updated = await deleteEntryById(itemId, entries, sheetUrl);
    setEntries([...updated]);
  };

  const handleOpenEditModal = (item) => {
    setCurrentEditingItem(item);
    setEditModalVisible(true);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

      <HeaderBar
        babyName={babyName}
        navigation={navigation}
        currentTheme={currentTheme}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
        showLastEventsBanner={showLastEventsBanner}
        onToggleLastEventsBanner={() => setShowLastEventsBanner(!showLastEventsBanner)}
      />

      {isOffline && (
        <View style={{ backgroundColor: '#ffcccc', padding: 6, marginVertical: 2, borderRadius: 6 }}>
          <Text style={{ color: '#900', fontWeight: 'bold', fontSize: 11 }}>{t.offlineWarning}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {showStats && (
          <StatsDashboard entries={allUniqueEntries} currentTheme={currentTheme} />
        )}

        {showLastEventsBanner && (
          <LastEventsSummary
            entries={allUniqueEntries}
            sortedDates={sortedDates}
            groupedEntries={groupedEntries}
            todayStr={todayStr}
            cleanTime={cleanTime}
            currentTheme={currentTheme}
          />
        )}

        <HistorySection
          currentTheme={currentTheme}
          filterType={filterType}
          setFilterType={setFilterType}
          loading={loading}
          onRefresh={handleRefreshEntries}
          sortedDates={sortedDates}
          groupedEntries={groupedEntries}
          todayStr={todayStr}
          collapsedDays={collapsedDays}
          toggleDayCollapse={toggleDayCollapse}
          cleanTime={cleanTime}
          getGrowthDifferenceText={getGrowthDifferenceText}
          onOpenActionModal={(item) => {
            setSelectedItemForAction(item);
            setActionModalVisible(true);
          }}
          translateType={translateType}
          t={t}
        />
      </View>

      <View style={{ marginTop: 4 }}>
        {showDropsBanner && (
          <DropsBanner babyName={babyName} t={t} onAdminister={handleAdministerDrops} />
        )}

        <ActiveSleepBanner
          activeSleepEntry={activeSleepEntry}
          babyName={babyName}
          t={t}
          onWakeUp={handleWakeUp}
        />

        <ActivityMenuGrid
          navigation={navigation}
          t={t}
          activeMenuPage={activeMenuPage}
          setActiveMenuPage={setActiveMenuPage}
          currentTheme={currentTheme}
          onEntryAdded={handleQuickEntryAdded}
          activeSleepEntry={activeSleepEntry}
        />
      </View>

      <ActionModal
        visible={actionModalVisible}
        currentTheme={currentTheme}
        t={t}
        onClose={() => setActionModalVisible(false)}
        onEdit={() => {
          if (selectedItemForAction) {
            handleOpenEditModal(selectedItemForAction);
          }
        }}
        onDelete={() => {
          if (selectedItemForAction) {
            handleDeleteEntry(selectedItemForAction.originalId || selectedItemForAction.id);
          }
        }}
      />

      <EditEntryModal
        visible={editModalVisible}
        currentTheme={currentTheme}
        t={t}
        entryItem={currentEditingItem}
        onClose={() => {
          setEditModalVisible(false);
          setCurrentEditingItem(null);
        }}
        onSave={(updatedData) => {
          setEditModalVisible(false);
          setCurrentEditingItem(null);

          const finalEntries = entries.map(e => {
            const eId = String(e?.id || '').trim();
            const targetId = String(currentEditingItem?.id || '').trim();
            return eId === targetId ? { ...e, ...updatedData } : e;
          });

          setEntries([...finalEntries]);
          saveLocalEntries(finalEntries);

          getForceOffline().then(async (forcedOffline) => {
            if (!forcedOffline) {
              updateEntryValue(
                currentEditingItem,
                updatedData.value,
                entries,
                sheetUrl
              ).catch((err) => {
                console.log('Eroare sincronizare fundal editare:', err);
              });
            }
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 10, paddingBottom: 6, paddingTop: 2 },
});