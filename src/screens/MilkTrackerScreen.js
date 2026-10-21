    import React, { useState } from 'react';
    import {
      View,
      Text,
      StyleSheet,
      TouchableOpacity,
      TextInput,
      Alert,
      ScrollView,
      ActivityIndicator,
    } from 'react-native';
    import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
    import { Slider } from '@miblanchard/react-native-slider';
    import { useNavigation } from '@react-navigation/native';
    import {
      getLocalEntries,
      saveLocalEntries,
      getStoredSheetUrl,
      sendToSheet,
    } from '../services/storage';

    export default function MilkTrackerScreen() {
      const navigation = useNavigation();
      const [amount, setAmount] = useState(90);
      const [milkSource, setMilkSource] = useState('Lapte praf');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [time, setTime] = useState(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );

      const quickAmounts = [30, 60, 90, 120, 150, 180, 210];

      const handleBack = () => {
        if (navigation && navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Home');
        }
      };

      const handleSave = async () => {
        if (isSubmitting) return; // Prevenim salvările duble
        setIsSubmitting(true);

        try {
          const now = new Date();
          const nowIsoString = now.toISOString().replace('T', ' ').substring(0, 19);

          // Concatenăm valoarea numerică curentă cu unitatea 'ml' și sursa selectată
          const formattedValue = `${amount || 0} ml (${milkSource})`;

          const newEntry = {
            id: now.getTime().toString(),
            date: now.toISOString().split('T')[0], // YYYY-MM-DD
            time: time,
            type: 'milk',
            value: formattedValue,
            fullDateTime: nowIsoString,
          };

          // 1. Salvăm local
          const currentEntries = await getLocalEntries();
          const updatedEntries = [newEntry, ...(Array.isArray(currentEntries) ? currentEntries : [])];
          await saveLocalEntries(updatedEntries);

          // 2. Trimitere în Google Sheet
          const sheetUrl = await getStoredSheetUrl();
          if (sheetUrl) {
            const success = await sendToSheet(sheetUrl, newEntry);
            if (!success) {
              console.log('Salvat doar local, se va sincroniza ulterior.');
            }
          }

          // Navigăm automat înapoi către HomeScreen
          handleBack();
        } catch (e) {
          console.error('Eroare la salvarea din MilkTracker:', e);
          Alert.alert('Eroare', 'Nu s-a putut salva înregistrarea.');
          setIsSubmitting(false); // Reactivăm butonul doar în caz de eroare
        }
      };

      return (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header cu buton înapoi */}
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* 1. Ora înregistrării */}
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <TextInput
              style={styles.timeInput}
              value={time}
              onChangeText={setTime}
            />
          </View>

          {/* 2. Selecție Tip Lapte / Sursă */}
          <Text style={styles.sectionTitle}>Sursă / Tip Hrănire</Text>
          <View style={styles.sourceGrid}>
            {[
              { label: 'Lapte praf', icon: 'baby-carriage' },
              { label: 'Lapte pompat', icon: 'wine-bottle' },
              { label: 'Sân Stâng', icon: 'female' },
              { label: 'Sân Drept', icon: 'female' },
              { label: 'Ambii Sâni', icon: 'heart' },
              { label: 'Lapte praf + Sân Stâng', icon: 'female' },
              { label: 'Lapte praf + Sân Drept', icon: 'female' },
            ].map((item) => {
              const isSelected = milkSource === item.label;
              return (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.sourceOption,
                    isSelected && styles.sourceOptionSelected,
                  ]}
                  onPress={() => setMilkSource(item.label)}
                >
                  <FontAwesome5
                    name={item.icon}
                    size={14}
                    color={isSelected ? '#FFF' : '#555'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sourceText, isSelected && styles.sourceTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Input pur numeric + 'ml' adăugat automat vizual */}
          <View style={styles.displayBadge}>
            <TextInput
              style={styles.amountInput}
              keyboardType="numeric"
              value={String(amount)}
              onChangeText={(val) => {
                // Păstrăm strict caracterele numerice
                const numericValue = val.replace(/[^0-9]/g, '');
                setAmount(numericValue ? parseInt(numericValue, 10) : '');
              }}
            />
            <Text style={styles.unitText}>ml</Text>
          </View>

          {/* 4. Selecție Rapidă Cantitate */}
          <View style={styles.quickAmountContainer}>
            {quickAmounts.map((qty) => (
              <TouchableOpacity
                key={qty}
                style={[
                  styles.quickBtn,
                  amount === qty && styles.quickBtnActive,
                ]}
                onPress={() => setAmount(qty)}
              >
                <Text
                  style={[
                    styles.quickBtnText,
                    amount === qty && styles.quickBtnTextActive,
                  ]}
                >
                  {qty} ml
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 5. Slider pentru ajustare fină */}
          <View style={styles.sliderContainer}>
            <Slider
              value={typeof amount === 'number' ? amount : 0}
              onValueChange={(val) => setAmount(Array.isArray(val) ? val[0] : val)}
              minimumValue={10}
              maximumValue={300}
              step={5}
              minimumTrackTintColor="#D35400"
              thumbTintColor="#D35400"
            />
          </View>

          {/* Buton Confirmare */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              isSubmitting && styles.confirmBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="checkmark" size={32} color="#FFF" />
            )}
          </TouchableOpacity>
        </ScrollView>
      );
    }

    const styles = StyleSheet.create({
      container: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#FAF6F0',
        flexGrow: 1,
        justifyContent: 'space-between',
      },
      backBtn: { alignSelf: 'flex-start', marginTop: 10, padding: 10 },
      timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        elevation: 1,
        marginBottom: 15,
      },
      timeInput: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' },
      sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#555', marginBottom: 10 },
      sourceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 15,
      },
      sourceOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EAEAEA',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
        margin: 4,
      },
      sourceOptionSelected: { backgroundColor: '#D35400' },
      sourceText: { fontSize: 12, fontWeight: '600', color: '#555' },
      sourceTextSelected: { color: '#FFF' },

      displayBadge: {
        backgroundColor: '#D35400',
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
      },
      amountInput: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        minWidth: 50,
        textAlign: 'center',
      },
      unitText: { fontSize: 20, color: '#FFF', marginLeft: 6, fontWeight: '600' },

      quickAmountContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginVertical: 10,
      },
      quickBtn: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        margin: 4,
      },
      quickBtnActive: { backgroundColor: '#D35400', borderColor: '#D35400' },
      quickBtnText: { fontSize: 13, color: '#555', fontWeight: 'bold' },
      quickBtnTextActive: { color: '#FFF' },

      sliderContainer: { width: '100%', paddingHorizontal: 20, marginVertical: 10 },

      confirmBtn: {
        backgroundColor: '#D35400',
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 20,
        elevation: 4,
      },
      confirmBtnDisabled: {
        backgroundColor: '#A0A0A0',
      },
    });