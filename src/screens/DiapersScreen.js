import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  sendToSheet,
  getForceOffline,
  getTheme,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';

export default function DiapersScreen({ navigation }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Stare pentru secțiuni colapsabile (cheia este data YYYY-MM-DD, valoarea e boolean true/false pentru expandat)
  const [expandedDays, setExpandedDays] = useState({});

  // Form state pentru adăugare / editare
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState('');
  const [diaperType, setDiaperType] = useState('wet'); // 'wet' | 'dirty' | 'mixed'
  const [notes, setNotes] = useState('');

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const toggleDayExpand = (dayStr) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayStr]: !prev[dayStr],
    }));
  };

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        try {
          const themeMode = await getTheme();
          if (isMounted) setIsDarkMode(themeMode === 'dark');

          const localAll = (await getLocalEntries()) || [];
          const rawDiapers = localAll.filter((item) => item.type === 'diaper');

          // Sortare invers cronologică după data/ora completă
          const sorted = rawDiapers.sort((a, b) => {
            const timeA = new Date(a.fullDateTime || a.date || 0).getTime();
            const timeB = new Date(b.fullDateTime || b.date || 0).getTime();
            return timeB - timeA;
          });

          if (isMounted) {
            setEntries(sorted);
            // Implicit expandăm ziua de azi
            const today = getTodayStr();
            setExpandedDays((prev) => ({ ...prev, [today]: true }));
          }
        } catch (e) {
          console.error('Eroare la încărcarea datelor pentru scutece:', e);
        }
      };

      loadData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const accentColor = isDarkMode ? '#BB86FC' : '#8E44AC';
  const editIconColor = isDarkMode ? '#5DADE2' : '#2980B9';
  const deleteIconColor = isDarkMode ? '#EC7063' : '#C0392B';
  const primaryBtnBg = isDarkMode ? '#7D3C98' : '#8E44AC';

  const getTypeDetails = (type) => {
    switch (type) {
      case 'dirty':
        return { label: 'Murdar (Scaun)', icon: 'poop', color: '#D35400' };
      case 'mixed':
        return { label: 'Mixt (Umed + Scaun)', icon: 'baby', color: '#8E44AC' };
      default:
        return { label: 'Umed (Pipi)', icon: 'tint', color: '#2980B9' };
    }
  };

  const syncWithSheetIfOnline = async (item) => {
    const forcedOffline = await getForceOffline();
    if (!forcedOffline) {
      const sheetUrl = await getStoredSheetUrl();
      if (sheetUrl) {
        sendToSheet(sheetUrl, item).catch((err) => console.log('Sync error diaper:', err));
      }
    }
  };

  const handleSaveModal = async () => {
    const now = new Date();
    const dateStr = date.trim() || getTodayStr();
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    const fullDateTimeStr = `${dateStr} ${timeStr}`;

    const typeInfo = getTypeDetails(diaperType);

    const newItem = {
      id: editingId ? editingId : now.getTime().toString(),
      type: 'diaper',
      date: dateStr,
      diaperType: diaperType, // 'wet', 'dirty', 'mixed'
      value: typeInfo.label,
      notes: notes.trim(),
      fullDateTime: fullDateTimeStr,
    };

    const allLocal = (await getLocalEntries()) || [];
    const filteredOthers = allLocal.filter((item) => item.id !== newItem.id);
    const updatedLocal = [newItem, ...filteredOthers];

    await saveLocalEntries(updatedLocal);

    const rawDiapers = updatedLocal.filter((item) => item.type === 'diaper');
    setEntries(
      rawDiapers.sort((a, b) => new Date(b.fullDateTime || b.date || 0).getTime() - new Date(a.fullDateTime || a.date || 0).getTime())
    );

    // Asigură-te că ziua editată/adăugată rămâne deschisă
    setExpandedDays((prev) => ({ ...prev, [dateStr]: true }));

    await syncWithSheetIfOnline(newItem);
    closeModal();
  };

  const handleDeleteEntry = (id) => {
    Alert.alert('Ștergere', 'Sigur doriți să ștergeți această înregistrare?', [
      { text: 'Anulare', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          const updatedEntries = entries.filter((item) => item.id !== id);
          setEntries(updatedEntries);

          const allLocal = (await getLocalEntries()) || [];
          const filteredOthers = allLocal.filter((item) => item.id !== id);
          await saveLocalEntries(filteredOthers);
        },
      },
    ]);
  };

  const openModalForEdit = (item) => {
    setEditingId(item.id);
    setDate(item.date || getTodayStr());
    setDiaperType(item.diaperType || 'wet');
    setNotes(item.notes || '');
    setModalVisible(true);
  };

  const openModalForAdd = () => {
    setEditingId(null);
    setDate(getTodayStr());
    setDiaperType('wet');
    setNotes('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setDate('');
    setDiaperType('wet');
    setNotes('');
  };

  // Grupăm intrările pe zile (YYYY-MM-DD)
  const groupedByDate = entries.reduce((acc, item) => {
    const dKey = item.date || getTodayStr();
    if (!acc[dKey]) acc[dKey] = [];
    acc[dKey].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={currentTheme.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textMain }]}>Evidență Scutece (Detaliat)</Text>
        <TouchableOpacity onPress={openModalForAdd} style={[styles.addHeaderBtn, { backgroundColor: primaryBtnBg }]}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Listă Scrolabilă cu Secțiuni pe Zile (Accordion) */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {sortedDates.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>
            Nu există înregistrări. Apăsați pe „+” pentru a adăuga primul schimb de scutec.
          </Text>
        ) : (
          sortedDates.map((dayStr) => {
            const dayItems = groupedByDate[dayStr];
            const isToday = dayStr === getTodayStr();
            const isExpanded = !!expandedDays[dayStr];

            // Calculare sumar pe zi
            const wetCount = dayItems.filter((i) => i.diaperType === 'wet' || i.diaperType === 'mixed').length;
            const dirtyCount = dayItems.filter((i) => i.diaperType === 'dirty' || i.diaperType === 'mixed').length;

            return (
              <View
                key={dayStr}
                style={[styles.daySectionCard, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
              >
                {/* Header-ul Zilei (Clickabil pentru Collapse/Expand) */}
                <TouchableOpacity
                  style={styles.dayHeaderRow}
                  onPress={() => toggleDayExpand(dayStr)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayTitleText, { color: currentTheme.textMain }]}>
                      📅 {dayStr} {isToday ? '(Azi)' : ''}
                    </Text>
                    <Text style={[styles.daySummarySubText, { color: currentTheme.textSub }]}>
                      Total: {dayItems.length} schimburi ({wetCount} umede, {dirtyCount} scaun)
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={currentTheme.textSub}
                  />
                </TouchableOpacity>

                {/* Secțiunea Extinsă cu fiecare eveniment în parte */}
                {isExpanded && (
                  <View style={styles.expandedContainer}>
                    {dayItems.map((item) => {
                      const tInfo = getTypeDetails(item.diaperType);
                      const timeOnly = item.fullDateTime ? item.fullDateTime.split(' ')[1] : '';

                      return (
                        <View
                          key={item.id}
                          style={[styles.subItemRow, { borderTopColor: currentTheme.border }]}
                        >
                          <View style={styles.subItemInfo}>
                            <FontAwesome5 name={tInfo.icon} size={16} color={tInfo.color} style={{ marginRight: 8 }} />
                            <View>
                              <Text style={[styles.subItemTitle, { color: currentTheme.textMain }]}>
                                {tInfo.label} {timeOnly ? `• ${timeOnly}` : ''}
                              </Text>
                              {item.notes ? (
                                <Text style={[styles.subItemNotes, { color: currentTheme.textSub }]}>
                                  {item.notes}
                                </Text>
                              ) : null}
                            </View>
                          </View>

                          <View style={styles.actionButtons}>
                            <TouchableOpacity onPress={() => openModalForEdit(item)} style={styles.iconAction}>
                              <Ionicons name="pencil-outline" size={16} color={editIconColor} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteEntry(item.id)} style={styles.iconAction}>
                              <Ionicons name="trash-outline" size={16} color={deleteIconColor} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Adăugare / Editare cu opțiuni Wet/Dirty/Mixed */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>
              {editingId ? 'Editează Scutec' : 'Adaugă Scutec Nou'}
            </Text>

            <Text style={[styles.label, { color: currentTheme.textSub }]}>Tip scutec:</Text>
            <View style={styles.typeSelectorRow}>
              {[
                { key: 'wet', label: 'Umed (Pipi)', icon: 'tint', color: '#2980B9' },
                { key: 'dirty', label: 'Scaun', icon: 'poop', color: '#D35400' },
                { key: 'mixed', label: 'Mixt', icon: 'baby', color: '#8E44AC' },
              ].map((t) => {
                const isSelected = diaperType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeOptionBtn,
                      { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border },
                      isSelected && { borderColor: t.color, borderWidth: 2, backgroundColor: `${t.color}15` },
                    ]}
                    onPress={() => setDiaperType(t.key)}
                  >
                    <FontAwesome5 name={t.icon} size={16} color={t.color} />
                    <Text style={[styles.typeOptionText, { color: currentTheme.textMain }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Dată (YYYY-MM-DD):</Text>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              placeholder="2026-11-16"
              placeholderTextColor={currentTheme.inputPlaceholder}
              value={date}
              onChangeText={setDate}
            />

            <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Notițe opționale:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              placeholder="ex: iritație ușoară, cantitate mare..."
              placeholderTextColor={currentTheme.inputPlaceholder}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={closeModal}>
                <Text style={styles.btnText}>Anulare</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: primaryBtnBg }]} onPress={handleSaveModal}>
                <Text style={styles.btnText}>Salvează</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  addHeaderBtn: { padding: 6, borderRadius: 8 },
  scrollContent: { paddingBottom: 20 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13, paddingHorizontal: 20 },
  daySectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  dayTitleText: { fontSize: 14, fontWeight: 'bold' },
  daySummarySubText: { fontSize: 12, marginTop: 2 },
  expandedContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  subItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  subItemTitle: { fontSize: 13, fontWeight: '600' },
  subItemNotes: { fontSize: 11, marginTop: 1 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { padding: 6, marginLeft: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 16, borderRadius: 12, borderWidth: 1, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  typeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  typeOptionText: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  cancelBtn: { backgroundColor: '#7F8C8D' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});