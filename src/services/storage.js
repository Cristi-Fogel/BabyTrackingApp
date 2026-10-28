import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ENTRIES: '@baby_tracker_entries',
  SHEET_URL: '@baby_tracker_sheet_url',
  BABY_NAME: '@baby_tracker_baby_name',
  DROPS_ENABLED: '@baby_tracker_drops_enabled',
};

// --- Local Storage (AsyncStorage) ---

export const getLocalEntries = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(KEYS.ENTRIES);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Eroare la citirea datelor locale:', e);
    return [];
  }
};

export const saveLocalEntries = async (entries) => {
  try {
    const jsonValue = JSON.stringify(entries);
    await AsyncStorage.setItem(KEYS.ENTRIES, jsonValue);
  } catch (e) {
    console.error('Eroare la salvarea datelor locale:', e);
  }
};

export const getStoredSheetUrl = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.SHEET_URL);
  } catch (e) {
    console.error('Eroare la preluarea URL-ului Sheet:', e);
    return null;
  }
};

export const saveSheetUrl = async (url) => {
  try {
    await AsyncStorage.setItem(KEYS.SHEET_URL, url);
  } catch (e) {
    console.error('Eroare la salvarea URL-ului Sheet:', e);
  }
};

export const getBabyName = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.BABY_NAME);
  } catch (e) {
    console.error('Eroare la citirea numelui bebelușului:', e);
    return 'Bebelușul';
  }
};

export const saveBabyName = async (name) => {
  try {
    await AsyncStorage.setItem(KEYS.BABY_NAME, name);
  } catch (e) {
    console.error('Eroare la salvarea numelui bebelușului:', e);
  }
};

export const getDropsEnabled = async () => {
  try {
    const val = await AsyncStorage.getItem(KEYS.DROPS_ENABLED);
    return val !== null ? JSON.parse(val) : false;
  } catch (e) {
    console.error('Eroare la citirea setării pentru picături:', e);
    return false;
  }
};

export const saveDropsEnabled = async (enabled) => {
  try {
    await AsyncStorage.setItem(KEYS.DROPS_ENABLED, JSON.stringify(enabled));
  } catch (e) {
    console.error('Eroare la salvarea setării pentru picături:', e);
  }
};

// --- Google Sheets Network Sync ---

export const fetchFromSheet = async (url) => {
  if (!url) return [];
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.log('Info: Google Sheet a returnat HTML (posibil eroare de deployment/permisiuni). Folosim datele locale.');
      return [];
    }

    const text = await response.text();
    if (!text || text.trim() === '') return [];

    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch (error) {
    console.log('Sincronizare Sheet indisponibilă (offline sau eroare format):', error.message);
    return [];
  }
};

export const sendToSheet = async (url, data) => {
  if (!url) return;
  try {
    const nowString = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const payload = {
      id: String(data.id || '').replace(/^'/, '').trim(),
      date: data.date || '',
      time: data.time || '',
      type: data.type || '',
      value: data.value !== undefined ? String(data.value) : '',
      amount: data.amount !== undefined ? String(data.amount) : '',
      fullDateTime: data.fullDateTime || nowString,
      drops: data.drops !== undefined ? Number(data.drops) : 0,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.log('Info: Răspuns HTML primit la POST în Sheet.');
      return { status: 'ok' };
    }

    const text = await response.text();
    return text ? JSON.parse(text) : { status: 'ok' };
  } catch (error) {
    console.log('Eroare trimitere în Sheet (se va sincroniza local):', error.message);
    return null;
  }
};


// --- HELPERE GENERICE PENTRU EDITARE ȘI ȘTERGERE ---

/**
 * Șterge o intrare (trimite o intrare goală cu același ID pe server și o elimină/marchează local)
 */
export const deleteEntryById = async (itemId, currentEntries, sheetUrl) => {
  const targetCleanId = String(itemId || '').replace(/^'/, '').trim();
  if (!targetCleanId) return currentEntries;

  const nowString = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const emptyEntry = {
    id: targetCleanId,
    date: '',
    time: '',
    type: '',
    value: '',
    fullDateTime: nowString,
  };

  // Înlocuim intrarea existentă cu cea goală (pentru anulare)
  const updatedEntries = currentEntries.map((item) => {
    const cleanId = String(item.id || '').replace(/^'/, '').trim();
    return cleanId === targetCleanId ? emptyEntry : item;
  });

  await saveLocalEntries(updatedEntries);

  if (sheetUrl) {
    sendToSheet(sheetUrl, emptyEntry).catch((err) => {
      console.log('Eroare la ștergere în fundal:', err);
    });
  }

  return updatedEntries;
};

/**
 * Actualizează valoarea unei intrări existente (înlocuiește elementul cu același ID)
 */
export const updateEntryValue = async (itemToEdit, newValue, currentEntries, sheetUrl) => {
  if (!itemToEdit) return currentEntries;

  const cleanTargetId = String(itemToEdit.id || '').replace(/^'/, '').trim();
  const nowString = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const updatedEntry = {
    ...itemToEdit,
    id: cleanTargetId,
    value: newValue,
    fullDateTime: nowString,
  };

  // Înlocuim elementul existent în loc să adăugăm unul nou
  const updatedEntries = currentEntries.map((item) => {
    const cleanId = String(item.id || '').replace(/^'/, '').trim();
    return cleanId === cleanTargetId ? updatedEntry : item;
  });

  await saveLocalEntries(updatedEntries);

  if (sheetUrl) {
    sendToSheet(sheetUrl, updatedEntry).catch((err) => {
      console.log('Eroare la salvarea modificării în fundal:', err);
    });
  }

  return updatedEntries;
};


// --- Setări Extinse (Offline & Theme) ---

export const getForceOffline = async () => {
  try {
    const val = await AsyncStorage.getItem('@baby_tracker_force_offline');
    return val !== null ? JSON.parse(val) : false;
  } catch (e) {
    console.error('Eroare la citirea setării force_offline:', e);
    return false;
  }
};

export const saveForceOffline = async (enabled) => {
  try {
    await AsyncStorage.setItem('@baby_tracker_force_offline', JSON.stringify(enabled));
  } catch (e) {
    console.error('Eroare la salvarea setării force_offline:', e);
  }
};

export const getTheme = async () => {
  try {
    const val = await AsyncStorage.getItem('@baby_tracker_theme');
    return val || 'default';
  } catch (e) {
    console.error('Eroare la citirea temei:', e);
    return 'default';
  }
};

export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem('@baby_tracker_theme', theme);
  } catch (e) {
    console.error('Eroare la salvarea temei:', e);
  }
};

// Adaugă în storage.js:
const LANGUAGE_KEY = '@baby_tracker_language';

export async function getLanguage() {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return lang || 'ro'; // Default română
  } catch (e) {
    return 'ro';
  }
}

export async function saveLanguage(lang) {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) {
    console.error('Eroare la salvarea limbii:', e);
  }
}