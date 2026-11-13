import React, { useState, useCallback, useRef } from 'react';
import {
StyleSheet,
Text,
View,
TouchableOpacity,
SafeAreaView,
StatusBar,
Platform,
Alert,
TextInput,
ScrollView,
KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
scheduleExactAlarm,
getRecentNotifications,
deleteNotification,
cancelAllNotifications
} from '../services/notificationService';
import { getTheme, getLanguage } from '../services/storage';
import { lightTheme } from '../theme/lightTheme';
import { darkTheme } from '../theme/darkTheme';
import { translations } from '../services/translations';

export default function ReminderScreen({ navigation }) {
const [currentTheme, setCurrentTheme] = useState(lightTheme);
const [currentLang, setCurrentLang] = useState('ro');

const [reminderTitle, setReminderTitle] = useState('🍼 Reminder Masă Bebe');
const [reminderBody, setReminderBody] = useState('A sosit ora programată pentru reminder!');
const [date, setDate] = useState(new Date(Date.now() + 3 * 3600 * 1000));
const [showPicker, setShowPicker] = useState(false);
const [pickerMode, setPickerMode] = useState('date');
const [loading, setLoading] = useState(false);
const [recentNotifications, setRecentNotifications] = useState([]);

const bodyInputRef = useRef(null);

const t = translations[currentLang] || translations.ro;

useFocusEffect(
useCallback(() => {
let isMounted = true;
const initScreen = async () => {
try {
const themeMode = await getTheme();
const langCode = await getLanguage();
const recent = await getRecentNotifications();

if (isMounted) {
setCurrentTheme(themeMode === 'dark' ? darkTheme : lightTheme);
setCurrentLang(langCode || 'ro');
setRecentNotifications(recent);
}
} catch (e) {
console.error(e);
}
};

initScreen();

return () => {
isMounted = false;
};
}, [])
);

const onChangePicker = (event, selectedDate) => {
if (Platform.OS === 'android') {
setShowPicker(false);
}
if (selectedDate) {
setDate(selectedDate);
}
};

const onDismissPicker = () => {
setShowPicker(false);
};

const openPicker = (mode) => {
setPickerMode(mode);
setShowPicker(true);
};

const handleQuickReminder = async (value, type) => {
setLoading(true);
try {
const targetTime = new Date();

if (type === 'minutes') {
targetTime.setTime(targetTime.getTime() + value * 60 * 1000);
} else if (type === 'hours') {
targetTime.setTime(targetTime.getTime() + value * 3600 * 1000);
} else if (type === 'tomorrow') {
targetTime.setDate(targetTime.getDate() + 1);
targetTime.setHours(9, 0, 0, 0);
}

const success = await scheduleExactAlarm(
targetTime,
'🍼 Reminder Bebe',
type === 'tomorrow' ? 'Reminder programat pentru mâine!' : 'Reminder setat cu succes!',
'time-outline'
);

if (success) {
const updated = await getRecentNotifications();
setRecentNotifications(updated);
Alert.alert('Succes', 'Reminder setat cu succes!');
}
} catch (e) {
Alert.alert('Eroare', 'Nu s-a putut seta reminderul.');
} finally {
setLoading(false);
}
};

const handleCustomReminder = async () => {
setLoading(true);
try {
if (date.getTime() <= Date.now()) {
Alert.alert('Atenție', 'Ora selectată trebuie să fie în viitor!');
setLoading(false);
return;
}

const success = await scheduleExactAlarm(
date,
reminderTitle || '⏰ Notificare Bebe',
reminderBody || 'A sosit ora programată pentru reminder!',
'notifications-outline'
);

if (success) {
const updated = await getRecentNotifications();
setRecentNotifications(updated);
Alert.alert('Succes', `Reminder personalizat setat pentru ${date.toLocaleString()}!`);
}
} catch (e) {
Alert.alert('Eroare', 'Nu s-a putut seta reminderul personalizat.');
} finally {
setLoading(false);
}
};

const handleDeleteItem = async (id) => {
const updated = await deleteNotification(id);
setRecentNotifications(updated);
};

const handleCancelAll = async () => {
Alert.alert(
'Anulare Remindere',
'Ești sigur că vrei să ștergi și să anulezi toate notificările programate?',
[
{ text: 'Renunță', style: 'cancel' },
{
text: 'Șterge Tot',
style: 'destructive',
onPress: async () => {
const updated = await cancelAllNotifications();
setRecentNotifications(updated);
}
}
]
);
};

return (
<SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background }]}>
<StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} translucent={false} />

<KeyboardAvoidingView
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
style={{ flex: 1 }}
>
<ScrollView
contentContainerStyle={styles.container}
keyboardShouldPersistTaps="handled"
>
{/* Buton Înapoi Mare */}
<TouchableOpacity
style={[
styles.backButtonLarge,
{
backgroundColor: currentTheme.cardBackground,
borderColor: currentTheme.border,
},
]}
onPress={() => navigation.goBack()}
>
<Ionicons name="arrow-back-outline" size={20} color={currentTheme.textMain} style={{ marginRight: 8 }} />
<Text style={[styles.backButtonLargeText, { color: currentTheme.textMain }]}>
Înapoi la Meniu
</Text>
</TouchableOpacity>

<Text style={[styles.title, { color: currentTheme.textMain }]}>Setare Remindere 🔔</Text>

{/* 1. Secțiune Custom (Sus) */}
<View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
<Text style={styles.sectionTitle}>Reminder Personalizat</Text>

<Text style={[styles.label, { color: currentTheme.textSub }]}>Titlu Notificare:</Text>
<TextInput
style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
value={reminderTitle}
onChangeText={setReminderTitle}
placeholder="Introduceți titlul..."
placeholderTextColor={currentTheme.inputPlaceholder}
returnKeyType="next"
onSubmitEditing={() => bodyInputRef.current?.focus()}
blurOnSubmit={false}
/>

<Text style={[styles.label, { color: currentTheme.textSub, marginTop: 4 }]}>Mesaj Notificare:</Text>
<TextInput
ref={bodyInputRef}
style={[styles.input, { backgroundColor: currentTheme.inputBackground, color: currentTheme.inputText, borderColor: currentTheme.border }]}
value={reminderBody}
onChangeText={setReminderBody}
placeholder="Introduceți mesajul..."
placeholderTextColor={currentTheme.inputPlaceholder}
returnKeyType="done"
/>

<Text style={[styles.label, { color: currentTheme.textSub, marginTop: 4 }]}>Selectează Data și Ora:</Text>
<View style={styles.dateTimeRow}>
<TouchableOpacity
style={[styles.dateTimeBox, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
onPress={() => openPicker('date')}
>
<Ionicons name="calendar-outline" size={15} color="#2980B9" style={{ marginRight: 6 }} />
<Text style={{ fontWeight: 'bold', fontSize: 12, color: currentTheme.textMain }}>
{date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}
</Text>
</TouchableOpacity>

<TouchableOpacity
style={[styles.dateTimeBox, { backgroundColor: currentTheme.inputBackground, borderColor: currentTheme.border }]}
onPress={() => openPicker('time')}
>
<Ionicons name="time-outline" size={15} color="#2980B9" style={{ marginRight: 6 }} />
<Text style={{ fontWeight: 'bold', fontSize: 12, color: currentTheme.textMain }}>
{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
</Text>
</TouchableOpacity>
</View>

{showPicker && (
<DateTimePicker
value={date}
mode={pickerMode}
is24Hour={false}
display={Platform.OS === 'ios' ? 'spinner' : 'default'}
onChange={onChangePicker}
onDismiss={onDismissPicker}
/>
)}

<TouchableOpacity
style={styles.customSaveBtn}
onPress={handleCustomReminder}
disabled={loading}
>
<Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
<Text style={styles.customSaveBtnText}>Programează Reminder</Text>
</TouchableOpacity>
</View>

{/* 2. Secțiune Presete Rapide (Compacte jos) */}
<View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
<Text style={styles.sectionTitle}>Presete rapide</Text>
<View style={styles.buttonContainer}>
<TouchableOpacity
style={styles.presetBtn}
onPress={() => handleQuickReminder(30, 'minutes')}
disabled={loading}
>
<Ionicons name="time-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
<Text style={styles.presetText}>30 min</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.presetBtn}
onPress={() => handleQuickReminder(1, 'hours')}
disabled={loading}
>
<Ionicons name="time-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
<Text style={styles.presetText}>1 oră</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.presetBtn}
onPress={() => handleQuickReminder(null, 'tomorrow')}
disabled={loading}
>
<Ionicons name="calendar-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
<Text style={styles.presetText}>Mâine</Text>
</TouchableOpacity>
</View>
</View>

{/* 3. Secțiune Ultimele Notificări Programate */}
<View style={[styles.card, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}>
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
<Text style={styles.sectionTitle}>Ultimele Notificări 📋</Text>
{recentNotifications.length > 0 && (
<TouchableOpacity onPress={handleCancelAll}>
<Text style={{ color: '#E74C3C', fontSize: 12, fontWeight: 'bold' }}>Șterge tot</Text>
</TouchableOpacity>
)}
</View>

{recentNotifications.length === 0 ? (
<Text style={{ color: currentTheme.textSub, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginVertical: 6 }}>
Nu există notificări programate recent.
</Text>
) : (
recentNotifications.map((item, index) => (
<View
key={item.id || index}
style={[styles.notificationItem, { borderBottomColor: currentTheme.border }]}
>
<Ionicons name="notifications-outline" size={18} color="#2980B9" style={{ marginRight: 8 }} />
<View style={{ flex: 1 }}>
<Text style={{ fontWeight: 'bold', fontSize: 13, color: currentTheme.textMain }}>
{item.title}
</Text>
<Text style={{ fontSize: 11, color: currentTheme.textSub }}>
{item.body}
</Text>
</View>
<Text style={{ fontSize: 11, fontWeight: '600', color: '#E67E22', marginRight: 10 }}>
{item.time}
</Text>
<TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
<Ionicons name="trash-outline" size={18} color="#E74C3C" />
</TouchableOpacity>
</View>
))
)}
</View>
</ScrollView>
</KeyboardAvoidingView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
safeArea: {
flex: 1,
paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 10,
},
container: {
padding: 16,
flexGrow: 1,
paddingBottom: 50,
},
backButtonLarge: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
paddingVertical: 10,
paddingHorizontal: 16,
borderRadius: 12,
marginBottom: 10,
borderWidth: 1,
elevation: 1,
},
backButtonLargeText: {
fontWeight: 'bold',
fontSize: 13,
},
title: { fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
card: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12, elevation: 1 },
sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#2980B9', marginBottom: 8 },
buttonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
presetBtn: {
backgroundColor: '#2980B9',
paddingVertical: 8,
paddingHorizontal: 8,
borderRadius: 8,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
flex: 1,
marginHorizontal: 3,
},
presetText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
label: { fontSize: 11, fontWeight: 'bold', marginBottom: 3 },
input: { borderWidth: 1, borderRadius: 8, padding: 7, fontSize: 12, marginBottom: 6 },
dateTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
dateTimeBox: {
flex: 1,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
paddingVertical: 8,
borderWidth: 1,
borderRadius: 8,
marginHorizontal: 3,
},
customSaveBtn: {
backgroundColor: '#27AE60',
flexDirection: 'row',
paddingVertical: 10,
borderRadius: 8,
justifyContent: 'center',
alignItems: 'center',
},
customSaveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
notificationItem: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: 7,
borderBottomWidth: 1,
},
});