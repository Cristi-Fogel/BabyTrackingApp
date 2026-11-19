import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  sendToSheet,
  getForceOffline,
  getDiversificationEnabled,
  getFontSize,
} from '../services/storage';

const { width } = Dimensions.get('window');
const pageWidth = width - 24;
const BUTTONS_PER_PAGE = 4;

export default function ActivityMenuGrid({
  navigation,
  t,
  activeMenuPage,
  setActiveMenuPage,
  currentTheme,
  onEntryAdded,
  activeSleepEntry,
  diversificationEnabled: diversificationProp,
}) {
  const [loadingCard, setLoadingCard] = useState(null);
  const [diversificationLocal, setDiversificationLocal] = useState(false);
  const [fontSizeSetting, setFontSizeSetting] = useState('normal');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadSettings = async () => {
        try {
          const [enabled, fSize] = await Promise.all([
            getDiversificationEnabled(),
            getFontSize(),
          ]);
          if (isMounted) {
            setDiversificationLocal(!!enabled);
            setFontSizeSetting(fSize || 'normal');
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadSettings();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const isDivEnabled =
    diversificationProp !== undefined ? !!diversificationProp : diversificationLocal;

  const getButtonFontSize = () => {
    if (fontSizeSetting === 'small') return 10;
    if (fontSizeSetting === 'large') return 13;
    if (fontSizeSetting === 'extraLarge') return 14;
    return 11;
  };

  const buttonFontSize = getButtonFontSize();

  const handleQuickSleepTap = async () => {
    if (activeSleepEntry || loadingCard) return;
    setLoadingCard('sleep');

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const cleanStart = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const valueText = `Adormit la ${cleanStart}`;
      const fullDateTimeStr = `${dateStr} ${now.toTimeString().split(' ')[0]}`;

      const newEntry = {
        id: now.getTime().toString(),
        date: dateStr,
        time: cleanStart,
        type: 'sleep',
        value: valueText,
        fullDateTime: fullDateTimeStr,
      };

      const currentEntries = await getLocalEntries();
      const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
      await saveLocalEntries(updatedEntries);

      const forcedOffline = await getForceOffline();
      if (!forcedOffline) {
        const sheetUrl = await getStoredSheetUrl();
        if (sheetUrl) {
          sendToSheet(sheetUrl, newEntry).catch((err) => {
            console.log('Eroare sincronizare fundal somn rapid:', err);
          });
        }
      }

      if (onEntryAdded) {
        onEntryAdded(newEntry);
      }
    } catch (e) {
      console.error('Eroare la adăugarea rapidă a somnului:', e);
    } finally {
      setLoadingCard(null);
    }
  };

  const handleNavigationPress = (cardKey, screenName) => {
    if (loadingCard) return;
    setLoadingCard(cardKey);

    setTimeout(() => {
      navigation.navigate(screenName);
      setLoadingCard(null);
    }, 50);
  };

  const baseButtons = [
    {
      key: 'milk',
      backgroundColor: '#E67E22',
      disabled: loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'milk',
      loading: loadingCard === 'milk',
      onPress: () => handleNavigationPress('milk', 'MilkTracker'),
      renderContent: () => (
        <>
          <FontAwesome5 name="wine-bottle" size={18} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>{t.milk}</Text>
        </>
      ),
    },
    {
      key: 'sleep',
      backgroundColor: activeSleepEntry ? '#7F8C8D' : '#2980B9',
      disabled: activeSleepEntry ? true : loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'sleep',
      loading: loadingCard === 'sleep',
      activeOpacity: activeSleepEntry ? 1 : 0.7,
      onPress: handleQuickSleepTap,
      renderContent: () =>
        activeSleepEntry ? (
          <View style={styles.sleepActiveContainer}>
            <Ionicons name="moon" size={18} color="#FFF" />
            <Text style={[styles.menuText, { marginLeft: 4, fontSize: buttonFontSize }]} numberOfLines={1}>Doarme</Text>
          </View>
        ) : (
          <>
            <Ionicons name="moon-outline" size={20} color="#FFF" />
            <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>{t.sleep || 'Somn'}</Text>
          </>
        ),
    },
    {
      key: 'growth',
      backgroundColor: '#27AE60',
      disabled: loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'growth',
      loading: loadingCard === 'growth',
      onPress: () => handleNavigationPress('growth', 'GrowthTracker'),
      renderContent: () => (
        <>
          <MaterialCommunityIcons name="ruler" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>{t.growth}</Text>
        </>
      ),
    },
    {
      key: 'mama',
      backgroundColor: '#D81B60',
      disabled: loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'mama',
      loading: loadingCard === 'mama',
      onPress: () => handleNavigationPress('mama', 'Mama'),
      renderContent: () => (
        <>
          <Ionicons name="woman-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>{t.mama}</Text>
        </>
      ),
    },
    {
      key: 'vaccines',
      backgroundColor: '#16A085',
      disabled: loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'vaccines',
      loading: loadingCard === 'vaccines',
      onPress: () => handleNavigationPress('vaccines', 'Vaccines'),
      renderContent: () => (
        <>
          <Ionicons name="medical-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Vaccinuri & Tratamente</Text>
        </>
      ),
    },
    {
      key: 'diapers',
      backgroundColor: '#8E44AC',
      disabled: false,
      dimmed: false,
      loading: false,
      onPress: () => navigation.navigate('Diapers'),
      renderContent: () => (
        <>
          <MaterialCommunityIcons name="baby-face-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Scutec</Text>
        </>
      ),
    },
    {
      key: 'purchases',
      backgroundColor: '#3F51B5',
      disabled: false,
      dimmed: false,
      loading: false,
      onPress: () => Alert.alert('În curând', 'Modulul Achiziții va fi disponibil în curând.'),
      renderContent: () => (
        <>
          <Ionicons name="cart-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Achiziții</Text>
        </>
      ),
    },
    {
      key: 'notes',
      backgroundColor: '#D35400',
      disabled: false,
      dimmed: false,
      loading: false,
      onPress: () => navigation.navigate('Notes'),
      renderContent: () => (
        <>
          <Ionicons name="book-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Note</Text>
        </>
      ),
    },
    {
      key: 'reminders',
      backgroundColor: '#2980B9',
      disabled: false,
      dimmed: false,
      loading: false,
      onPress: () =>
        navigation.navigate
          ? navigation.navigate('Reminders')
          : Alert.alert('Remindere', 'Ecranul de remindere se va deschide aici.'),
      renderContent: () => (
        <>
          <Ionicons name="notifications-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Remindere</Text>
        </>
      ),
    },
    {
      key: 'alarms',
      backgroundColor: '#C0392B',
      disabled: loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'alarms',
      loading: loadingCard === 'alarms',
      onPress: () => handleNavigationPress('alarms', 'Alarms'),
      renderContent: () => (
        <>
          <Ionicons name="alarm-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Alarme</Text>
        </>
      ),
    },
    {
      key: 'detailsleep',
      backgroundColor: '#1B4F72',
      disabled: loadingCard !== null,
      dimmed: loadingCard && loadingCard !== 'detailsleep',
      loading: loadingCard === 'detailsleep',
      onPress: () => handleNavigationPress('detailsleep', 'SleepTracker'),
      renderContent: () => (
        <>
          <Ionicons name="moon" size={18} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Sleep Tracker Detaliat</Text>
        </>
      ),
    },
    {
      key: 'custom',
      backgroundColor: '#7F8C8D',
      disabled: false,
      dimmed: false,
      loading: false,
      onPress: () => Alert.alert('În curând', 'Modulul Custom va fi disponibil în curând.'),
      renderContent: () => (
        <>
          <Ionicons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>Custom</Text>
        </>
      ),
    },
  ];

  const diversificationButton = {
    key: 'diversification',
    backgroundColor: '#D35400',
    disabled: loadingCard !== null,
    dimmed: loadingCard && loadingCard !== 'diversification',
    loading: loadingCard === 'diversification',
    onPress: () => handleNavigationPress('diversification', 'DiversificationTracker'),
    renderContent: () => (
      <>
        <Ionicons name="restaurant" size={18} color="#FFF" />
        <Text style={[styles.menuText, { fontSize: buttonFontSize }]} numberOfLines={1}>
          {t.diversification || 'Mâncare'}
        </Text>
      </>
    ),
  };

  const activeButtons = [...baseButtons];
  if (isDivEnabled) {
    const mamaIndex = activeButtons.findIndex((btn) => btn.key === 'mama');
    const insertIndex = mamaIndex >= 0 ? mamaIndex : 3;
    activeButtons.splice(insertIndex, 0, diversificationButton);
  }

  const pages = [];
  for (let i = 0; i < activeButtons.length; i += BUTTONS_PER_PAGE) {
    pages.push(activeButtons.slice(i, i + BUTTONS_PER_PAGE));
  }

  useEffect(() => {
    if (pages.length > 0 && activeMenuPage >= pages.length) {
      setActiveMenuPage(pages.length - 1);
    }
  }, [pages.length, activeMenuPage, setActiveMenuPage]);

  const renderCard = (btn) => {
    if (!btn) {
      return <View key={`empty_${Math.random()}`} style={styles.menuCardPlaceholder} />;
    }

    return (
      <TouchableOpacity
        key={btn.key}
        style={[
          styles.menuCard,
          { backgroundColor: btn.backgroundColor, opacity: btn.dimmed ? 0.6 : 1 },
        ]}
        onPress={btn.onPress}
        activeOpacity={btn.activeOpacity !== undefined ? btn.activeOpacity : 0.7}
        disabled={btn.disabled}
      >
        {btn.loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          btn.renderContent()
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginBottom: 2 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const page = Math.round(offsetX / pageWidth);
          const clampedPage = Math.max(0, Math.min(pages.length - 1, page));
          setActiveMenuPage(clampedPage);
        }}
        style={styles.menuSwipeContainer}
        contentContainerStyle={styles.menuSwipeContentContainer}
      >
        {pages.map((pageButtons, pageIndex) => {
          const topRow = [pageButtons[0], pageButtons[1]];
          const bottomRow = [pageButtons[2], pageButtons[3]];

          return (
            <View key={`page_${pageIndex}`} style={[styles.menuPageGrid, { width: pageWidth }]}>
              <View style={styles.menuRow}>
                {topRow.map((btn, idx) => renderCard(btn || null))}
              </View>
              <View style={[styles.menuRow, { marginTop: 6 }]}>
                {bottomRow.map((btn, idx) => renderCard(btn || null))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.paginationDotsContainer}>
        {pages.map((_, idx) => (
          <View
            key={`dot_${idx}`}
            style={[styles.dot, activeMenuPage === idx && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuSwipeContainer: { marginTop: 2, flexGrow: 0, marginBottom: 2 },
  menuSwipeContentContainer: { alignItems: 'center' },
  menuPageGrid: { marginHorizontal: 0 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between' },
  menuCard: {
    flex: 1,
    marginHorizontal: 3,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  menuCardPlaceholder: {
    flex: 1,
    marginHorizontal: 3,
    height: 54,
  },
  menuText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 11, flexShrink: 1 },
  sleepActiveContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  paginationDotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 8, marginBottom: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 2 },
  activeDot: { backgroundColor: '#D35400', width: 10 },
});