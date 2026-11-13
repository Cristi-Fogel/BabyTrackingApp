import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
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
  const [loadingAction, setLoadingAction] = useState(null); // 'edit' sau 'delete'

  const handleEditPress = () => {
    if (loadingAction) return;
    setLoadingAction('edit');
    // Mică întârziere opțională pentru a lăsa utilizatorul să vadă animația,
    // apoi executăm acțiunea și închidem modalul
    setTimeout(() => {
      onEdit();
      setLoadingAction(null);
      onClose();
    }, 150);
  };

  const handleDeletePress = () => {
    if (loadingAction) return;
    setLoadingAction('delete');
    setTimeout(() => {
      onDelete();
      setLoadingAction(null);
      onClose();
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onShow={() => setLoadingAction(null)} // Resetăm starea la deschidere
    >
      <TouchableWithoutFeedback onPress={loadingAction ? null : onClose}>
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
                {!loadingAction && (
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={currentTheme.textSub} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Butoane de Acțiune preluate din traduceri */}
              <View style={styles.actionsContainer}>

                {/* Buton Editează */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#27AE60', opacity: loadingAction === 'delete' ? 0.5 : 1 }]}
                  onPress={handleEditPress}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === 'edit' ? (
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="create-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                  )}
                  <Text style={styles.btnText}>{t.edit || 'Editează'}</Text>
                </TouchableOpacity>

                {/* Buton Șterge */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#E74C3C', opacity: loadingAction === 'edit' ? 0.5 : 1 }]}
                  onPress={handleDeletePress}
                  disabled={loadingAction !== null}
                >
                  {loadingAction === 'delete' ? (
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="trash-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                  )}
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