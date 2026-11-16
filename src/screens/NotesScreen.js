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
  getTheme,
} from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';

export default function NotesScreen({ navigation }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [entries, setEntries] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Form state pentru adăugare / editare notiță
  const [editingId, setEditingId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [mood, setMood] = useState('neutral'); // 'happy' | 'neutral' | 'sad'
  const [date, setDate] = useState('');

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Sortare invers cronologică (cele mai recente sus)
  const sortNotesDesc = (itemArray) => {
    return [...itemArray].sort((a, b) => {
      const timeA = new Date(a.fullDateTime || a.date || 0).getTime();
      const timeB = new Date(b.fullDateTime || b.date || 0).getTime();
      return timeB - timeA;
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      const loadData = async () => {
        try {
          const themeMode = await getTheme();
          if (isMounted) setIsDarkMode(themeMode === 'dark');

          const localAll = (await getLocalEntries()) || [];
          const noteEntries = localAll.filter((item) => item.type === 'note');

          if (isMounted) {
            setEntries(sortNotesDesc(noteEntries));
          }
        } catch (e) {
          console.error('Eroare la încărcarea notițelor:', e);
        }
      };

      loadData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Culori adaptate pentru temă
  const accentColor = isDarkMode ? '#BB86FC' : '#8E44AC';
  const primaryBtnBg = isDarkMode ? '#7D3C98' : '#8E44AC';
  const editIconColor = isDarkMode ? '#5DADE2' : '#2980B9';
  const deleteIconColor = isDarkMode ? '#EC7063' : '#C0392B';

  const getMoodIcon = (m) => {
    switch (m) {
      case 'happy':
        return { name: 'smile', color: '#27AE60', label: 'Fericit' };
      case 'sad':
        return { name: 'frown', color: '#C0392B', label: 'Supărat' };
      default:
        return { name: 'meh', color: '#F39C12', label: 'Neutru' };
    }
  };

  // Salvare notiță (nouă sau editată) - strict local
  const handleSaveModal = async () => {
    if (!noteText.trim()) {
      Alert.alert('Eroare', 'Te rog introdu textul notiței.');
      return;
    }

    const now = new Date();
    const dateStr = date.trim() || getTodayStr();
    const nowIso = `${dateStr} ${now.toTimeString().split(' ')[0]}`;

    const newNote = {
      id: editingId ? editingId : now.getTime().toString(),
      type: 'note',
      date: dateStr,
      text: noteText.trim(),
      mood: mood,
      value: noteText.trim(),
      fullDateTime: nowIso,
    };

    const allLocal = (await getLocalEntries()) || [];
    const filteredOthers = allLocal.filter((item) => item.id !== newNote.id);
    const updatedLocal = [newNote, ...filteredOthers];

    await saveLocalEntries(updatedLocal);
    setEntries(sortNotesDesc(updatedLocal.filter((item) => item.type === 'note')));
    closeModal();
  };

  const handleDeleteEntry = (id) => {
    Alert.alert('Ștergere', 'Sigur doriți să ștergeți această notiță?', [
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
    setNoteText(item.text || item.value || '');
    setMood(item.mood || 'neutral');
    setDate(item.date || getTodayStr());
    setModalVisible(true);
  };

  const openModalForAdd = () => {
    setEditingId(null);
    setNoteText('');
    setMood('neutral');
    setDate(getTodayStr());
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setNoteText('');
    setMood('neutral');
    setDate('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={currentTheme.textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.textMain }]}>Notițe Bebeluș</Text>
        <TouchableOpacity onPress={openModalForAdd} style={[styles.addHeaderBtn, { backgroundColor: primaryBtnBg }]}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Listă Scrolabilă */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <Text style={[styles.emptyText, { color: currentTheme.textSub }]}>
            Nu există notițe salvate. Apăsați pe butonul „+” de sus pentru adăugare.
          </Text>
        ) : (
          entries.map((item) => {
            const moodInfo = getMoodIcon(item.mood);
            return (
              <View
                key={item.id}
                style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.moodContainer}>
                    <FontAwesome5 name={moodInfo.name} size={18} color={moodInfo.color} style={{ marginRight: 6 }} />
                    <Text style={[styles.cardDate, { color: currentTheme.textMain }]}>📅 {item.date}</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => openModalForEdit(item)} style={styles.iconAction}>
                      <Ionicons name="pencil-outline" size={18} color={editIconColor} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEntry(item.id)} style={styles.iconAction}>
                      <Ionicons name="trash-outline" size={18} color={deleteIconColor} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={[styles.cardText, { color: currentTheme.textMain }]}>{item.text || item.value}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Adăugare / Editare cu KeyboardAvoidingView */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>
                {editingId ? 'Editează Notița' : 'Adaugă Notiță Nouă'}
              </Text>

              {/* Selector Stare de spirit */}
              <Text style={[styles.label, { color: currentTheme.textSub }]}>Starea bebelușului:</Text>
              <View style={styles.moodSelectorRow}>
                {[
                  { key: 'happy', icon: 'smile', color: '#27AE60', label: 'Fericit' },
                  { key: 'neutral', icon: 'meh', color: '#F39C12', label: 'Neutru' },
                  { key: 'sad', icon: 'frown', color: '#C0392B', label: 'Supărat' },
                ].map((m) => {
                  const isSelected = mood === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.moodOptionBtn,
                        { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border },
                        isSelected && { borderColor: m.color, borderWidth: 2, backgroundColor: `${m.color}15` },
                      ]}
                      onPress={() => setMood(m.key)}
                    >
                      <FontAwesome5 name={m.icon} size={20} color={m.color} />
                      <Text style={[styles.moodOptionText, { color: currentTheme.textMain }]}>{m.label}</Text>
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

              <Text style={[styles.label, { color: currentTheme.textSub, marginTop: 10 }]}>Notiță:</Text>
              <TextInput
                style={[styles.textAreaInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                placeholder="Scrie detalii despre starea de spirit, activități, mese..."
                placeholderTextColor={currentTheme.inputPlaceholder}
                multiline={true}
                numberOfLines={4}
                value={noteText}
                onChangeText={setNoteText}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={closeModal}>
                  <Text style={styles.btnText}>Anulare</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: primaryBtnBg }]} onPress={handleSaveModal}>
                  <Text style={styles.btnText}>Salvează</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: { fontSize: 13, fontWeight: 'bold' },
  cardText: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  actionButtons: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { padding: 6, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 16, borderRadius: 12, borderWidth: 1, elevation: 5, maxHeight: '85%' },
  modalScrollContent: { paddingBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  moodSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  moodOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  moodOptionText: { fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  textAreaInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, height: 90, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  cancelBtn: { backgroundColor: '#7F8C8D' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
});