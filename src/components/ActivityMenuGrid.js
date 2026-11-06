import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getLocalEntries,
  saveLocalEntries,
  getStoredSheetUrl,
  sendToSheet,
  getForceOffline,
} from '../services/storage';

const { width } = Dimensions.get('window');
const pageWidth = width - 24;

export default function ActivityMenuGrid({ navigation, t, activeMenuPage, setActiveMenuPage, currentTheme, onEntryAdded }) {

  const handleQuickSleepTap = async () => {
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
          await sendToSheet(sheetUrl, newEntry);
        }
      }

      if (onEntryAdded) {
        onEntryAdded();
      }
    } catch (e) {
      console.error('Eroare la adăugarea rapidă a somnului:', e);
    }
  };

  return (
    <View style={{ marginBottom: 2 }}>
      <Text style={[styles.sectionHeader, { color: currentTheme.textSub }]}>
        {t.menuHeader || 'Meniu Activități'}
      </Text>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const page = Math.round(offsetX / pageWidth);
          setActiveMenuPage(page);
        }}
        style={styles.menuSwipeContainer}
        contentContainerStyle={styles.menuSwipeContentContainer}
      >
        {/* Pagina 1 */}
        <View style={[styles.menuPageGrid, { width: pageWidth }]}>
          <View style={styles.menuRow}>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#E67E22' }]} onPress={() => navigation.navigate('MilkTracker')}>
              <FontAwesome5 name="wine-bottle" size={18} color="#FFF" />
              <Text style={styles.menuText}>{t.milk}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#2980B9' }]} onPress={handleQuickSleepTap}>
              <Ionicons name="moon-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>{t.sleep || 'Somn'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.menuRow, { marginTop: 6 }]}>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#27AE60' }]} onPress={() => navigation.navigate('GrowthTracker')}>
              <MaterialCommunityIcons name="ruler" size={20} color="#FFF" />
              <Text style={styles.menuText}>{t.growth}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#D81B60' }]} onPress={() => navigation.navigate('Mama')}>
              <Ionicons name="woman-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>{t.mama}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pagina 2 */}
        <View style={[styles.menuPageGrid, { width: pageWidth }]}>
          <View style={styles.menuRow}>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#8E44AD' }]} onPress={() => Alert.alert('În curând', 'Modulul Scutec va fi disponibil în curând.')}>
              <MaterialCommunityIcons name="baby-face-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Scutec</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#16A085' }]} onPress={() => Alert.alert('În curând', 'Modulul Achiziții va fi disponibil în curând.')}>
              <Ionicons name="cart-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Achiziții</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.menuRow, { marginTop: 6 }]}>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#D35400' }]} onPress={() => Alert.alert('În curând', 'Modulul Note va fi disponibil în curând.')}>
              <Ionicons name="book-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuCard, { backgroundColor: '#7F8C8D' }]} onPress={() => Alert.alert('În curând', 'Modulul Custom va fi disponibil în curând.')}>
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pagina 3 */}
        <View style={[styles.menuPageGrid, { width: pageWidth }]}>
          <View style={styles.menuRow}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#2980B9' }]}
              onPress={() => navigation.navigate ? navigation.navigate('Reminders') : Alert.alert('Remindere', 'Ecranul de remindere se va deschide aici.')}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Remindere</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#C0392B' }]}
              onPress={() => navigation.navigate ? navigation.navigate('Alarms') : Alert.alert('Alarme', 'Ecranul de alarme se va deschide aici.')}
            >
              <Ionicons name="alarm-outline" size={20} color="#FFF" />
              <Text style={styles.menuText}>Alarme</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.menuRow, { marginTop: 6 }]}>
            <TouchableOpacity
              style={[styles.menuCard, { backgroundColor: '#1B4F72', flex: 1 }]}
              onPress={() => navigation.navigate('SleepTracker')}
            >
              <Ionicons name="moon" size={18} color="#FFF" />
              <Text style={styles.menuText}>Sleep Tracker Detaliat</Text>
            </TouchableOpacity>

            <View style={[styles.menuCard, { backgroundColor: 'transparent', borderWidth: 0, elevation: 0, flex: 1, marginHorizontal: 3 }]} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.paginationDotsContainer}>
        <View style={[styles.dot, activeMenuPage === 0 && styles.activeDot]} />
        <View style={[styles.dot, activeMenuPage === 1 && styles.activeDot]} />
        <View style={[styles.dot, activeMenuPage === 2 && styles.activeDot]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { fontSize: 12, fontWeight: 'bold', marginVertical: 2, marginLeft: 2 },
  menuSwipeContainer: { flexGrow: 0, marginBottom: 2 },
  menuSwipeContentContainer: { alignItems: 'center' },
  menuPageGrid: { marginHorizontal: 0 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between' },
  menuCard: { flex: 1, marginHorizontal: 3, height: 62, borderRadius: 10, alignItems: 'center', justifyContent: 'center', elevation: 1, flexDirection: 'row' },
  menuText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: 11 },
  paginationDotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: 8, marginBottom: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 2 },
  activeDot: { backgroundColor: '#D35400', width: 10 },
});