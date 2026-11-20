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

const ALLERGY_TYPES = [
  'Erupție cutanată / Roșeață',
  'Urticarie',
  'Disconfort digestiv / Vărsături',
  'Diaree',
  'Altă reacție',
];

const isDiversificationType = (typeStr) => {
  const clean = String(typeStr || '').toLowerCase();
  return clean === 'diversification' || clean === 'food' || clean === 'solid';
};

const detectInitialReaction = (item) => {
  const reaction = String(
    item?.reaction || item?.allergenStatus || ''
  ).toLowerCase();
  const allergyType = String(item?.allergyType || '').toLowerCase();
  const rawValue = String(item?.value || '').toLowerCase();

  if (reaction.trim() === 'ok' && !allergyType && !rawValue.includes('alerg')) {
    return 'OK';
  }

  const combined = `${reaction} ${allergyType} ${rawValue}`;
  const hasAllergy =
    combined.includes('alerg') ||
    combined.includes('reacț') ||
    combined.includes('react') ||
    combined.includes('erupț') ||
    combined.includes('erupt') ||
    combined.includes('urticar') ||
    combined.includes('diaree') ||
    combined.includes('vărsătur') ||
    combined.includes('varsatur');

  return hasAllergy ? 'Alergie' : 'OK';
};

const extractInitialAllergyDetails = (item) => {
  let rawDetail = '';
  if (item?.allergyType && String(item.allergyType).trim()) {
    rawDetail = String(item.allergyType).trim();
  } else {
    const match = String(item?.value || '').match(/alergie\s*:\s*(.+)$/i);
    if (match && match[1]) {
      rawDetail = match[1].trim();
    }
  }

  if (!rawDetail) {
    return { selectedType: ALLERGY_TYPES[0], customText: '' };
  }

  const matchedPreset = ALLERGY_TYPES.find(
    (opt) => opt.toLowerCase() === rawDetail.toLowerCase()
  );

  if (matchedPreset) {
    return {
      selectedType: matchedPreset,
      customText: matchedPreset === 'Altă reacție' ? '' : '',
    };
  }

  return {
    selectedType: 'Altă reacție',
    customText: rawDetail,
  };
};

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
  const [editedReaction, setEditedReaction] = useState('OK');
  const [selectedAllergyType, setSelectedAllergyType] = useState(
    ALLERGY_TYPES[0]
  );
  const [customAllergyText, setCustomAllergyText] = useState('');
  const [allergyDropdownOpen, setAllergyDropdownOpen] = useState(false);

  const milkAmountInputRef = useRef(null);
  const generalValueInputRef = useRef(null);

  useEffect(() => {
    if (visible && entryItem) {
      setEditedDate(entryItem.date || '');
      setEditedTime(entryItem.time || '');
      setAllergyDropdownOpen(false);

      const typeLower = String(entryItem.type || '').toLowerCase();
      const isMilk = typeLower === 'milk' || typeLower === 'lapte';
      const isDiv = isDiversificationType(typeLower);

      const initialReaction = isDiv ? detectInitialReaction(entryItem) : 'OK';
      setEditedReaction(initialReaction);

      if (isDiv) {
        const { selectedType, customText } =
          extractInitialAllergyDetails(entryItem);
        setSelectedAllergyType(selectedType);
        setCustomAllergyText(customText);
      } else {
        setSelectedAllergyType(ALLERGY_TYPES[0]);
        setCustomAllergyText('');
      }

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

  const handleSelectReaction = (nextReaction) => {
    setEditedReaction(nextReaction);
    if (nextReaction !== 'Alergie') {
      setAllergyDropdownOpen(false);
    }
  };

  const handleSelectAllergyType = (typeOption) => {
    setSelectedAllergyType(typeOption);
    setAllergyDropdownOpen(false);
  };

  const handleConfirm = () => {
    const typeLower = entryItem ? String(entryItem.type || '').toLowerCase() : '';
    const isMilk = typeLower === 'milk' || typeLower === 'lapte';
    const isDiv = isDiversificationType(typeLower);

    let finalValue = editedValue;
    if (isMilk) {
      const isPureBreastFeeding =
        milkSource === 'Sân Stâng' ||
        milkSource === 'Sân Drept' ||
        milkSource === 'Ambii Sâni';
      finalValue = isPureBreastFeeding
        ? `${milkSource} (Alăptare directă)`
        : `${milkAmount || 0} ml (${milkSource || 'Lapte praf'})`;
    }

    let updatedAllergyType = '';

    if (isDiv) {
      const baseVal = String(finalValue || '')
        .replace(/\s*-\s*Alergie(?:\s*:\s*.*)?$/i, '')
        .trim();

      if (editedReaction === 'OK') {
        finalValue = baseVal;
        updatedAllergyType = '';
      } else {
        const trimmedCustom = customAllergyText.trim();
        updatedAllergyType =
          selectedAllergyType === 'Altă reacție'
            ? trimmedCustom || 'Altă reacție'
            : selectedAllergyType;

        finalValue = updatedAllergyType
          ? `${baseVal} - Alergie: ${updatedAllergyType}`
          : `${baseVal} - Alergie`;
      }
    }

    const updatedData = {
      ...(entryItem || {}),
      date: editedDate,
      time: editedTime,
      value: finalValue,
      ...(isDiv
        ? {
            reaction: editedReaction,
            allergenStatus: editedReaction,
            allergyType: updatedAllergyType,
          }
        : {}),
      fullDateTime: `${editedDate} ${editedTime}`,
    };

    onSave(updatedData);
  };

  const typeLower = entryItem ? String(entryItem.type || '').toLowerCase() : '';
  const isMilkEntry = typeLower === 'milk' || typeLower === 'lapte';
  const isDiversificationEntry = isDiversificationType(typeLower);

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={[
          styles.modalOverlay,
          { backgroundColor: currentTheme.modalOverlay },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: currentTheme.modalBackground,
                borderColor: currentTheme.border,
              },
            ]}
          >
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
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>
                  Data (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.inputText,
                      borderColor: currentTheme.border,
                    },
                  ]}
                  value={editedDate}
                  onChangeText={setEditedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </View>

              <View style={styles.halfField}>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>
                  Ora
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.inputText,
                      borderColor: currentTheme.border,
                    },
                  ]}
                  value={editedTime}
                  onChangeText={setEditedTime}
                  placeholder="ex: 11:23 AM"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </View>
            </View>

            {/* Câmpuri Lapte vs General (Somn, Diversificare, etc.) */}
            {isMilkEntry ? (
              <>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>
                  Cantitate (ml)
                </Text>
                <TextInput
                  ref={milkAmountInputRef}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.inputText,
                      borderColor: currentTheme.border,
                    },
                  ]}
                  value={String(milkAmount || '')}
                  onChangeText={setMilkAmount}
                  keyboardType="numeric"
                  placeholder="Ex: 90"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />

                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>
                  Sursă / Detalii
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.inputText,
                      borderColor: currentTheme.border,
                    },
                  ]}
                  value={milkSource}
                  onChangeText={setMilkSource}
                  placeholder="Lapte praf"
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>
                  Valoare / Detalii (ex: Interval somn)
                </Text>
                <TextInput
                  ref={generalValueInputRef}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.inputText,
                      borderColor: currentTheme.border,
                    },
                  ]}
                  value={editedValue}
                  onChangeText={setEditedValue}
                  placeholder={t.editPlaceholder || 'Valoare'}
                  placeholderTextColor={currentTheme.inputPlaceholder}
                />
              </>
            )}

            {/* Selector Stare / Reacție pentru Diversificare */}
            {isDiversificationEntry && (
              <View style={styles.reactionSection}>
                <Text style={[styles.fieldLabel, { color: currentTheme.textSub }]}>
                  Stare / Reacție
                </Text>
                <View style={styles.reactionRow}>
                  <TouchableOpacity
                    style={[
                      styles.reactionOptionBtn,
                      {
                        backgroundColor:
                          editedReaction === 'OK'
                            ? '#E8F8F5'
                            : currentTheme.inputBackground,
                        borderColor:
                          editedReaction === 'OK'
                            ? '#27AE60'
                            : currentTheme.border,
                      },
                    ]}
                    onPress={() => handleSelectReaction('OK')}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={17}
                      color={
                        editedReaction === 'OK' ? '#27AE60' : currentTheme.textSub
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.reactionOptionText,
                        {
                          color:
                            editedReaction === 'OK'
                              ? '#117A65'
                              : currentTheme.textMain,
                        },
                      ]}
                    >
                      OK
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.reactionOptionBtn,
                      {
                        backgroundColor:
                          editedReaction === 'Alergie'
                            ? '#FDEDEC'
                            : currentTheme.inputBackground,
                        borderColor:
                          editedReaction === 'Alergie'
                            ? '#E74C3C'
                            : currentTheme.border,
                      },
                    ]}
                    onPress={() => handleSelectReaction('Alergie')}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={17}
                      color={
                        editedReaction === 'Alergie'
                          ? '#E74C3C'
                          : currentTheme.textSub
                      }
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.reactionOptionText,
                        {
                          color:
                            editedReaction === 'Alergie'
                              ? '#C0392B'
                              : currentTheme.textMain,
                        },
                      ]}
                    >
                      Alergie
                    </Text>
                  </TouchableOpacity>
                </View>

                {editedReaction === 'Alergie' && (
                  <View style={styles.allergyPickerBlock}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: currentTheme.textSub, marginTop: 10 },
                      ]}
                    >
                      Tip alergie
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.dropdownTrigger,
                        {
                          backgroundColor: currentTheme.inputBackground,
                          borderColor: currentTheme.border,
                        },
                      ]}
                      onPress={() => setAllergyDropdownOpen((prev) => !prev)}
                    >
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          { color: currentTheme.inputText },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedAllergyType}
                      </Text>
                      <Ionicons
                        name={allergyDropdownOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={currentTheme.textSub}
                      />
                    </TouchableOpacity>

                    {allergyDropdownOpen && (
                      <View
                        style={[
                          styles.dropdownList,
                          {
                            backgroundColor: currentTheme.inputBackground,
                            borderColor: currentTheme.border,
                          },
                        ]}
                      >
                        {ALLERGY_TYPES.map((typeOption, idx) => {
                          const isSelected = selectedAllergyType === typeOption;
                          return (
                            <TouchableOpacity
                              key={`${typeOption}_${idx}`}
                              style={[
                                styles.dropdownItem,
                                { borderBottomColor: currentTheme.border },
                                isSelected && styles.dropdownItemActive,
                              ]}
                              onPress={() => handleSelectAllergyType(typeOption)}
                            >
                              <Text
                                style={[
                                  styles.dropdownItemText,
                                  { color: currentTheme.textMain },
                                  isSelected && styles.dropdownItemTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {typeOption}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {selectedAllergyType === 'Altă reacție' && (
                      <View style={{ marginTop: 8 }}>
                        <Text
                          style={[
                            styles.fieldLabel,
                            { color: currentTheme.textSub },
                          ]}
                        >
                          Descrie reacția
                        </Text>
                        <TextInput
                          style={[
                            styles.modalInput,
                            {
                              backgroundColor: currentTheme.inputBackground,
                              color: currentTheme.inputText,
                              borderColor: currentTheme.border,
                              marginBottom: 4,
                            },
                          ]}
                          value={customAllergyText}
                          onChangeText={setCustomAllergyText}
                          placeholder="Ex: Roșeață în jurul gurii..."
                          placeholderTextColor={currentTheme.inputPlaceholder}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Buton Salvează */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#27AE60' }]}
              onPress={handleConfirm}
            >
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
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    marginBottom: 10,
  },
  reactionSection: {
    marginTop: 2,
    marginBottom: 4,
  },
  reactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reactionOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reactionOptionText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  allergyPickerBlock: {
    marginTop: 2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  dropdownList: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(211, 84, 0, 0.08)',
  },
  dropdownItemText: {
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: '#D35400',
    fontWeight: 'bold',
  },
  saveBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});