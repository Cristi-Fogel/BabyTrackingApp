import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ActionModal({
  visible,
  currentTheme,
  t,
  onClose,
  onEdit,
  onDelete,
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: currentTheme.modalOverlay || 'rgba(0,0,0,0.6)' }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.modalBackground, borderColor: currentTheme.border }]}>

              {/* Antet cu întrebarea din traduceri și butonul X sus */}
              <View style={styles.modalHeader}>
                <View style={styles.titleRow}>
                  <Ionicons name="help-circle-outline" size={18} color={currentTheme.tint} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTitle, { color: currentTheme.textMain }]}>
                    {t.actionTitle || 'Ce dorești să faci?'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={currentTheme.textSub} />
                </TouchableOpacity>
              </View>

              {/* Butoane de Acțiune pre luate din traduceri */}
              <View style={styles.actionsContainer}>

                {/* Buton Editează */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#27AE60' }]}
                  onPress={() => {
                    onClose();
                    onEdit();
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.btnText}>{t.edit || 'Editează'}</Text>
                </TouchableOpacity>

                {/* Buton Șterge */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#E74C3C' }]}
                  onPress={() => {
                    onClose();
                    onDelete();
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.btnText}>{t.delete || 'Șterge'}</Text>
                </TouchableOpacity>

              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});