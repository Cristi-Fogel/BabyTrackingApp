import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EditEntryModal({
  visible,
  currentTheme,
  t,
  entryItem,
  onClose,
  onSave,
}) {
  const [editedDate, setEditedDate] = useState('');
  const [editedTime, setEditedTime] = useState('');
  const [editedValue, setEditedValue] = useState('');
  const [milkAmount, setMilkAmount] = useState('');
  const [milkSource, setMilkSource] = useState('');

  const milkAmountInputRef = useRef(null);
  const generalValueInputRef = useRef(null);

  useEffect(() => {
    if (visible && entryItem) {
      setEditedDate(entryItem.date || '');
      setEditedTime(entryItem.time || '');

      const typeLower = String(entryItem.type || '').toLowerCase();
      const isMilk = typeLower === 'milk' || typeLower === 'lapte';

      if (isMilk) {
        const valStr = String(entryItem.value || '');
        const mlMatch = valStr.match(/(\d+)\s*ml/i);
        const rawNumMatch = valStr.match(/^(\d+)/);

        if (mlMatch) {
          setMilkAmount(mlMatch[1]);
        } else if (rawNumMatch) {
          setMilkAmount(rawNumMatch[1]);
        } else {
          setMilkAmount('');
        }

        const sourceMatch = valStr.match(/\((.*?)\)/);
        if (sourceMatch) {
          setMilkSource(sourceMatch[1]);
        } else {
          const cleanedSource = valStr.replace(/[\d\s]+ml/gi, '').trim();
          setMilkSource(cleanedSource || valStr);
        }
      } else {
        // 💡 Pentru somn, creștere și alte tipuri, preluăm direct valoarea existentă
        setEditedValue(entryItem.value || '');
      }

      setTimeout(() => {
        if (isMilk) {
          milkAmountInputRef.current?.focus();
        } else {
          generalValueInputRef.current?.focus();
        }
      }, 150);
    }
  }, [visible, entryItem]);

  const handleConfirm = () => {
    const typeLower = entryItem ? String(entryItem.type || '').toLowerCase() : '';
    const isMilk = typeLower === 'milk' || typeLower === 'lapte';

    let finalValue = editedValue;
    if (isMilk) {
      const isPureBreastFeeding = milkSource === 'Sân Stâng' || milkSource === 'Sân Drept' || milkSource === 'Ambii Sâni';
      finalValue = isPureBreastFeeding
        ? `${milkSource} (Alăptare directă)`
        : `${milkAmount || 0} ml (${milkSource || 'Lapte praf'})`;
    }

    const updatedData = {
      ...(entryItem || {}),
      date: editedDate,
      time: editedTime,
      value: finalValue, // 💡 Valoarea editată corect pentru somn sau alte tipuri
      fullDateTime: `${editedDate} ${editedTime}`,
    };

    onSave(updatedData);
  };

  const typeLower = entryItem ? String(entryItem.type || '').toLowerCase() : '';
  const isMilkEntry = typeLower === 'milk' || typeLower === 'lapte';

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={[styles.modalOverlay, { backgroundColor: currentTheme.modalOverlay }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.modalContent, { backgroundColor: currentTheme.modalBackground, borderColor: currentTheme.border }]}>

            {/* Antet cu Titlu și Buton X de închidere */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>
                {t.editTitle || 'Editează Înregistrarea'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={currentTheme.textSub} />
              </TouchableOpacity>
            </View>

            {/* Rând dublu: Data și Ora */}
            <View style={styles.rowContainer}>
              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>Data (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  value={editedDate}
                  onChangeText={setEditedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </View>

              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>Ora</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  value={editedTime}
                  onChangeText={setEditedTime}
                  placeholder="ex: 11:23 AM"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </View>
            </View>

            {/* Câmpuri Lapte vs General (Somn, etc.) */}
            {isMilkEntry ? (
              <>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>Cantitate (ml)</Text>
                <TextInput
                  ref={milkAmountInputRef}
                  style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  value={String(milkAmount || '')}
                  onChangeText={setMilkAmount}
                  keyboardType="numeric"
                  placeholder="Ex: 90"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />

                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>Sursă / Detalii</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  value={milkSource}
                  onChangeText={setMilkSource}
                  placeholder="Lapte praf"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>Valoare / Detalii (ex: Interval somn)</Text>
                <TextInput
                  ref={generalValueInputRef}
                  style={[styles.modalInput, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
                  value={editedValue}
                  onChangeText={setEditedValue}
                  placeholder={t.editPlaceholder || 'Valoare'}
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </>
            )}

            {/* Buton Salvează */}
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#27AE60' }]} onPress={handleConfirm}>
              <Text style={styles.buttonText}>{t.save || 'Salvează'}</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  modalContent: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: 'bold' },
  closeBtn: {
    padding: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfField: {
    flex: 1,
    marginRight: 6,
  },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 },
  saveBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});