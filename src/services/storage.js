import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@baby_track_entries';
const SHEET_URL_KEY = '@baby_track_sheet_url';

// Link-ul tău de Google Apps Script setat ca fallback/default
export const DEFAULT_SHEET_URL =
  'https://script.google.com/macros/s/AKfycbytwNQpRP8H0Pdps832B9rhPEBreWDIN1aMZ7aOxLvjCbLRS63gfj48L4o9MGoP7MEeEw/exec';

export const getStoredSheetUrl = async () => {
  try {
    const url = await AsyncStorage.getItem(SHEET_URL_KEY);
    return url !== null ? url : DEFAULT_SHEET_URL;
  } catch (e) {
    console.error('Eroare citire Sheet URL:', e);
    return DEFAULT_SHEET_URL;
  }
};

export const saveSheetUrl = async (url) => {
  try {
    await AsyncStorage.setItem(SHEET_URL_KEY, url);
  } catch (e) {
    console.error('Eroare salvare Sheet URL:', e);
  }
};

export const getLocalEntries = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Eroare citire intrări locale:', e);
    return [];
  }
};

export const saveLocalEntries = async (entries) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Eroare salvare intrări locale:', e);
  }
};

// Preluare date din Google Sheet (GET) cu suport de urmărire redirect
export const fetchFromSheet = async (sheetUrl) => {
  const targetUrl = sheetUrl || DEFAULT_SHEET_URL;
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow', // OBLIGATORIU pentru Google Apps Script redirects
    });

    const responseText = await response.text();

    // Verificăm dacă răspunsul este într-adevăr JSON și nu HTML de eroare
    if (responseText.trim().startsWith('<')) {
      throw new Error(
        'Răspunsul primit este o pagină HTML (posibil permisiuni Apps Script incorecte sau login cerut).'
      );
    }

    const data = JSON.parse(responseText);
    return data;
  } catch (e) {
    console.error('Eroare fetch din Sheet:', e);
    throw e;
  }
};

// Trimitere date către Google Sheet (POST) - CORECTAT
export const sendToSheet = async (sheetUrl, items) => {
  const targetUrl = sheetUrl || DEFAULT_SHEET_URL;
  try {
    if (!targetUrl) return false;

    // Ne asigurăm că trimitem un Array cu obiectele noastre
    const payload = Array.isArray(items) ? items : [items];

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (e) {
    console.error('Eroare sendToSheet:', e);
    return false;
  }
};

const BABY_NAME_KEY = '@baby_name';

export const getBabyName = async () => {
  try {
    return (await AsyncStorage.getItem(BABY_NAME_KEY)) || 'Bebelușul'; // Valoare implicită
  } catch (e) {
    return 'Bebelușul';
  }
};

export const saveBabyName = async (name) => {
  try {
    await AsyncStorage.setItem(BABY_NAME_KEY, name);
  } catch (e) {
    console.error('Eroare la salvarea numelui', e);
  }
};