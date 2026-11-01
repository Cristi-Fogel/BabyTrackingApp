import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Modal } from 'react-native';

export default function EditEntryModal({
  visible,
  currentTheme,
  t,
  editedValue,
  setEditedValue,
  onClose,
  onConfirm,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
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
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#95A5A6' }]} onPress={onClose}>
              <Text style={styles.buttonText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#27AE60', marginLeft: 8 }]} onPress={onConfirm}>
              <Text style={styles.buttonText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 15 },
  modalContent: { width: '100%', padding: 15, borderRadius: 10, elevation: 4 },
  modalTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  modalInput: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 13, marginBottom: 12 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
});