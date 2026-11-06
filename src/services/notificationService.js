import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

const NOTIFICATIONS_STORAGE_KEY = '@baby_track_recent_notifications';

// Setăm comportamentul notificărilor în foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Solicitare permisiuni
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    Alert.alert('Atenție', 'Notificările locale funcționează pe un telefon fizic.');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permisiune refuzată', 'Activează permisiunile pentru notificări din setările telefonului.');
    return false;
  }

  return true;
}

// Obține ultimele notificări salvate local (maxim 5)
export async function getRecentNotifications() {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Eroare la citirea notificărilor recente:', e);
    return [];
  }
}

// Salvează o notificare în istoric incluzând iconița și ID-ul de sistem
async function saveRecentNotification(title, body, triggerTime, iconName, notificationId) {
  try {
    const currentList = await getRecentNotifications();
    const newNotification = {
      id: notificationId || Date.now().toString(),
      title,
      body,
      iconName: iconName || 'notifications-outline',
      time: triggerTime
        ? new Date(triggerTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
        : new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
    };

    const updatedList = [newNotification, ...currentList].slice(0, 5);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    console.error('Eroare la salvarea notificării recente:', e);
    return [];
  }
}

// Șterge o notificare din istoric și o anulează din sistemul telefonului
export async function deleteNotification(id) {
  try {
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    const currentList = await getRecentNotifications();
    const updatedList = currentList.filter(item => item.id !== id);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    console.error('Eroare la ștergerea notificării:', e);
    return await getRecentNotifications();
  }
}

// Anulează toate notificările programate
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
    return [];
  } catch (e) {
    console.error('Eroare la anularea notificărilor:', e);
    return [];
  }
}

// Programare notificare la o dată/oră exactă folosind noul standard Expo
export async function scheduleExactAlarm(date, title, body, iconName = 'notifications-outline') {
  try {
    const hasPermission = await registerForPushNotificationsAsync();
    if (!hasPermission) return false;

    const triggerDate = new Date(date);

    if (triggerDate.getTime() <= Date.now()) {
      Alert.alert('Eroare', 'Ora selectată trebuie să fie în viitor!');
      return false;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title || '🍼 Reminder Bebe',
        body: body || 'A sosit ora stabilită!',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    await saveRecentNotification(title, body, triggerDate, iconName, notificationId);
    return true;
  } catch (error) {
    console.error('Eroare programare notificare:', error);
    Alert.alert('Eroare sistem', `Nu s-a putut programa: ${error.message}`);
    return false;
  }
}