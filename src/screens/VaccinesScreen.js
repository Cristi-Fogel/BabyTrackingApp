import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export default function VaccinesScreen({ navigation }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('vaccines'); // 'vaccines' sau 'treatments'
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState(false);

  // Câmpuri specifice pentru Tratamente
  const [illness, setIllness] = useState('');
  const [duration, setDuration] = useState('');

  const defaultVaccines = [
    { id: 'v1', title: 'Hepatita B (la naștere)', date: '2026-01-01', status: true, type: 'vaccine' },
    { id: 'v2', title: 'BCG (Tuberculoză)', date: '2026-01-03', status: true, type: 'vaccine' },
    { id: 'v3', title: 'Hexaxim + Pneumococ (2 luni)', date: '2026-03-01', status: false, type: 'vaccine' },
    { id: 'v4', title: 'Hexaxim + Pneumococ (4 luni)', date: '2026-05-01', status: false, type: 'vaccine' },
    { id: 'v5', title: 'Hexaxim + Pneumococ (6 luni)', date: '2026-07-01', status: false, type: 'vaccine' },
  ];

  // Sortare invers cronologică (cele mai recente / viitoare sus)
  const sortEntriesByDateDesc = (itemArray) => {
    return [...itemArray].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  };

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        try {
          const themeMode = await getTheme();
          if (isMounted) {
            setIsDarkMode(themeMode === 'dark');
          }

          const localAll = (await getLocalEntries()) || [];
          let medEntries = localAll.filter(
            (item) => item.type === 'vaccine' || item.type === 'treatment'
          );

          // Verificăm ce vaccinuri default lipsesc și le adăugăm automat fără a le afecta pe cele existente
          let mergedEntries = [...medEntries];
          let missingDefaults = [];

          for (const defVal of defaultVaccines) {
            const exists = mergedEntries.some((item) => item.id === defVal.id || item.title === defVal.title);
            if (!exists) {
              missingDefaults.push(defVal);
            }
          }

          if (missingDefaults.length > 0) {
            mergedEntries = [...mergedEntries, ...missingDefaults];
            // Salvăm în stocarea locală combinând elementele noi cu cele vechi din alte module
            const otherModuleEntries = localAll.filter(
              (item) => item.type !== 'vaccine' && item.type !== 'treatment'
            );
            await saveLocalEntries([...otherModuleEntries, ...mergedEntries]);
          }

          if (isMounted) {
            setEntries(sortEntriesByDateDesc(mergedEntries));
          }
        } catch (e) {
          console.error('Eroare la încărcarea datelor:', e);
        }
      };

      loadData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  const handleSaveEntry = async () => {
    if (!title.trim()) {
      Alert.alert(
        'Eroare',
        activeTab === 'vaccines'
          ? 'Te rog introdu denumirea vaccinului.'
          : 'Te rog introdu denumirea tratamentului / medicamentului.'
      );
      return;
    }

    const now = new Date();
    const dateStr = date.trim() || now.toISOString().split('T')[0];

    let valueStr = `${title.trim()} - Data: ${dateStr}`;
    if (activeTab === 'treatments') {
      if (illness.trim()) valueStr += ` | Boală: ${illness.trim()}`;
      if (duration.trim()) valueStr += ` | Durată: ${duration.trim()}`;
    }

    const newItem = {
      id: editingId ? editingId : now.getTime().toString(),
      type: activeTab === 'vaccines' ? 'vaccine' : 'treatment',
      title: title.trim(),
      date: dateStr,
      status: activeTab === 'vaccines' ? status : true,
      illness: activeTab === 'treatments' ? illness.trim() : '',
      duration: activeTab === 'treatments' ? duration.trim() : '',
      value: valueStr,
      fullDateTime: `${dateStr} ${now.toTimeString().split(' ')[0]}`,
    };

    let updatedEntries;
    if (editingId) {
      updatedEntries = entries.map((item) => (item.id === editingId ? newItem : item));
    } else {
      updatedEntries = [newItem, ...entries];
    }

    const sortedUpdated = sortEntriesByDateDesc(updatedEntries);
    setEntries(sortedUpdated);

    const allLocal = (await getLocalEntries()) || [];
    const filteredOthers = allLocal.filter((item) => item.id !== newItem.id);
    await saveLocalEntries([newItem, ...filteredOthers]);

    const forcedOffline = await getForceOffline();
    if (!forcedOffline) {
      const sheetUrl = await getStoredSheetUrl();
      if (sheetUrl) {
        sendToSheet(sheetUrl, newItem).catch((err) => console.log('Sync error:', err));
      }
    }

    closeModal();
  };

  const handleDeleteEntry = async (id) => {
    Alert.alert('Ștergere', 'Sigur doriți să ștergeți această înregistrare?', [
      { text: 'Anulare', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          const updated = entries.filter((item) => item.id !== id);
          setEntries(updated);

          const allLocal = (await getLocalEntries()) || [];
          const filteredOthers = allLocal.filter((item) => item.id !== id);
          await saveLocalEntries(filteredOthers);
        },
      },
    ]);
  };

  const openModalForEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setDate(item.date || '');
    setStatus(!!item.status);
    setIllness(item.illness || '');
    setDuration(item.duration || '');
    setActiveTab(item.type === 'treatment' ? 'treatments' : 'vaccines');
    setModalVisible(true);
  };

  const openModalForAdd = () => {
    setEditingId(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus(false);
    setIllness('');
    setDuration('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle('');
    setDate('');
    setIllness('');
    setDuration('');
  };

  const filteredList = entries.filter((item) =>
    activeTab === 'vaccines' ? item.type === 'vaccine' : item.type === 'treatment'
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={currentTheme.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textMain }]}>Vaccinuri & Tratamente</Text>
        <TouchableOpacity onPress={openModalForAdd} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Opțiuni Filtrare / Tab-uri */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border },
            activeTab === 'vaccines' && styles.activeFilterTab,
          ]}
          onPress={() => setActiveTab('vaccines')}
        >
          <Ionicons
            name="medical-outline"
            size={16}
            color={activeTab === 'vaccines' ? '#FFF' : currentTheme.textMain}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.filterText, { color: activeTab === 'vaccines' ? '#FFF' : currentTheme.textMain }]}>
            Schema Vaccinuri
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border },
            activeTab === 'treatments' && styles.activeFilterTab,
          ]}
          onPress={() => setActiveTab('treatments')}
        >
          <Ionicons
            name="fitness-outline"
            size={16}
            color={activeTab === 'treatments' ? '#FFF' : currentTheme.textMain}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.filterText, { color: activeTab === 'treatments' ? '#FFF' : currentTheme.textMain }]}>
            Tratamente / Meds
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listă Elemente */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredList.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>
            Nu există înregistrări în această secțiune. Apăsați pe „+” pentru adăugare.
          </Text>
        ) : (
          filteredList.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
            >
              {activeTab === 'vaccines' && (
                <TouchableOpacity
                  style={[styles.checkbox, item.status && styles.checkboxChecked]}
                  onPress={async () => {
                    const updated = entries.map((e) => (e.id === item.id ? { ...e, status: !e.status } : e));
                    setEntries(updated);

                    const allLocal = (await getLocalEntries()) || [];
                    const filteredOthers = allLocal.filter((e) => e.id !== item.id);
                    const targetItem = updated.find((e) => e.id === item.id);
                    await saveLocalEntries([targetItem, ...filteredOthers]);
                  }}
                >
                  {item.status && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </TouchableOpacity>
              )}

              <View style={{ flex: 1, marginLeft: activeTab === 'vaccines' ? 10 : 0 }}>
                <Text style={[styles.cardTitle, { color: currentTheme.textMain }]}>
                  {item.title || 'Fără titlu'}
                </Text>

                {item.type === 'treatment' && (
                  <>
                    {item.illness ? (
                      <Text style={[styles.cardSubText, { color: currentTheme.textMain }]}>🦠 Boală: {item.illness}</Text>
                    ) : null}
                    {item.duration ? (
                      <Text style={[styles.cardSubText, { color: currentTheme.textMain }]}>⏱️ Durată: {item.duration}</Text>
                    ) : null}
                  </>
                )}

                <Text style={[styles.cardDate, { color: currentTheme.textSub }]}>📅 Dată: {item.date}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => openModalForEdit(item)} style={styles.iconAction}>
                  <Ionicons name="pencil-outline" size={18} color="#2980B9" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteEntry(item.id)} style={styles.iconAction}>
                  <Ionicons name="trash-outline" size={18} color="#C0392B" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Adăugare / Editare */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>
              {editingId ? 'Editează înregistrare' : `Adaugă ${activeTab === 'vaccines' ? 'Vaccin' : 'Tratament'}`}
            </Text>

            <Text style={[styles.label, { color: currentTheme.textSub }]}>
              {activeTab === 'vaccines' ? 'Nume Vaccin:' : 'Nume Tratament / Medicament:'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              placeholder={activeTab === 'vaccines' ? 'ex: Hexaxim...' : 'ex: Nurofen 2.5ml...'}
              placeholderTextColor={currentTheme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
            />

            {activeTab === 'treatments' && (
              <>
                <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 8 }]}>Boala / Afecțiunea:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  placeholder="ex: Febră / Roșu în gât..."
                  placeholderTextColor={currentTheme.inputPlaceholder}
                  value={illness}
                  onChangeText={setIllness}
                />

                <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 8 }]}>Durata tratamentului:</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  placeholder="ex: 5 zile..."
                  placeholderTextColor={currentTheme.inputPlaceholder}
                  value={duration}
                  onChangeText={setDuration}
                />
              </>
            )}

            <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 8 }]}>Dată (YYYY-MM-DD):</Text>
            <TextInput
              style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
              placeholder="2026-11-15"
              placeholderTextColor={currentTheme.inputPlaceholder}
              value={date}
              onChangeText={setDate}
            />

            {activeTab === 'vaccines' && (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setStatus(!status)}
              >
                <View style={[styles.checkbox, status && styles.checkboxChecked]} />
                <Text style={[styles.checkboxLabel, { color: currentTheme.textMain }]}>Vaccin administrat (făcut)</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={closeModal}>
                <Text style={styles.btnText}>Anulare</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSaveEntry}>
                <Text style={styles.btnText}>Salvează</Text>
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  addBtn: { backgroundColor: '#27AE60', padding: 6, borderRadius: 8 },
  filterContainer: { flexDirection: 'row', marginBottom: 10 },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderWidth: 1, borderRadius: 8, marginHorizontal: 3 },
  activeFilterTab: { backgroundColor: '#16A085', borderColor: '#16A085' },
  filterText: { fontSize: 12, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 20 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8, elevation: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#16A085', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#16A085' },
  cardTitle: { fontSize: 14, fontWeight: 'bold' },
  cardSubText: { fontSize: 12, marginTop: 2 },
  cardDate: { fontSize: 11, marginTop: 2 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { padding: 6, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 16, borderRadius: 12, borderWidth: 1, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  checkboxLabel: { marginLeft: 8, fontSize: 13, fontWeight: '500' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  cancelBtn: { backgroundColor: '#7F8C8D' },
  saveBtn: { backgroundColor: '#27AE60' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});