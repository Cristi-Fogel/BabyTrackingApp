import AsyncStorage from '@react-native-async-storage/async-storage';

const SHEET_URL_KEY = '@sheet_url';
const LOGS_KEY = '@baby_logs';
const ACTIVE_SLEEP_KEY = '@active_sleep';

export const saveSheetUrl = async (url) => {
  await AsyncStorage.setItem(SHEET_URL_KEY, url);
};

export const getSheetUrl = async () => {
  return await AsyncStorage.getItem(SHEET_URL_KEY);
};

export const saveLog = async (logEntry) => {
  try {
    // 1. Salvare locală (Offline First)
    const existing = await AsyncStorage.getItem(LOGS_KEY);
    const logs = existing ? JSON.parse(existing) : [];
    const newLogs = [logEntry, ...logs];
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(newLogs));

    // 2. Trimitere către Google Sheets
    const url = await getSheetUrl();
    if (url) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch((err) => console.log('Sync offline note:', err));
    }
    return newLogs;
  } catch (error) {
    console.error('Eroare salvare log:', error);
  }
};

export const getLogs = async () => {
  const existing = await AsyncStorage.getItem(LOGS_KEY);
  return existing ? JSON.parse(existing) : [];
};

export const setActiveSleep = async (sleepData) => {
  if (sleepData) {
    await AsyncStorage.setItem(ACTIVE_SLEEP_KEY, JSON.stringify(sleepData));
  } else {
    await AsyncStorage.removeItem(ACTIVE_SLEEP_KEY);
  }
};

export const getActiveSleep = async () => {
  const data = await AsyncStorage.getItem(ACTIVE_SLEEP_KEY);
  return data ? JSON.parse(data) : null;
};