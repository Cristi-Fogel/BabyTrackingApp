# BabyTrackApp - Setup & Configuration Summary

## 📌 Context & Scope
This project was re-initialized to create a clean, stable React Native development environment compatible with Expo SDK 57 (aligning with Expo Go 57.0.9 and Android tooling) after resolving dependency conflicts from a previous build.

---

## 🛠️ Environment & Tools
* OS / Path: Windows (D:\BabyTrackApp)
* Framework: React Native / Expo (SDK 57)
* Android Studio Path: D:\soft\AndroidStudio\bin
* Package Managers: npm, npx expo

---

## 🚀 Steps Completed & Verified Working

### 1. Fresh Project Initialization
Created a clean template aligned with Expo SDK 57:
> npx expo create-expo-app BabyTrackApp --template blank@57

### 2. Dependency Management & Icon Support
* Resolved bundle errors ("Unable to resolve @expo/vector-icons") by installing the package explicitly:
  > npx expo install @expo/vector-icons
* Installed essential components (AsyncStorage, Slider, React Navigation).

### 3. Native Prebuild & Android Integration
Generated native code (/android directory) for standalone compilation:
> npx expo prebuild

Opened the native project directly in Android Studio via CLI / Command Prompt:
> "D:\soft\AndroidStudio\bin\studio64.exe" "D:\BabyTrackApp\android"

### 4. Running the App
* Development Server (Metro Bundler):
  > npx expo start --clear
* Compiling/Testing on Android Device/Emulator:
  > npx expo run:android

---

## 📦 Building Standalone APK (Offline / Cable-Free)

To generate a fully standalone .apk executable that runs without Metro or an active server connection:

1. Navigate to the native Android directory:
   > cd D:\BabyTrackApp\android

2. Build the release APK locally using Gradle:
   > .\gradlew assembleRelease

3. Output Location:
   D:\BabyTrackApp\android\app\build\outputs\apk\release\app-release.apk

---

## ✅ Current Status
* Application builds successfully with zero bundling errors.
* @expo/vector-icons and UI components render as expected.
* Ready for feature additions, local testing, and offline distribution.


----

Google Drive spreadsheet setup:
1. create empty file;
2. Deschizi Extensii > Apps Script
3. Paste following script:
```
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  // Sărim peste primul rând dacă conține headere (Data, Ora, Activitate, Valori, ID)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] !== "" || row[1] !== "") {
      result.push({
        id: row[4] ? String(row[4]) : (row[0] + "_" + row[1] + "_" + row[2] + "_" + row[3]),
        date: String(row[0]),
        time: String(row[1]),
        type: String(row[2]),
        value: String(row[3])
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var contents = JSON.parse(e.postData.contents);
    
    // Suportă atât o singură intrare, cât și un array de intrări (la sincronizare de grup)
    var items = Array.isArray(contents) ? contents : [contents];
    
    // Dacă sheet-ul e gol, adăugăm headerele
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Data", "Ora", "Activitate", "Valori", "ID"]);
    }
    
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      sheet.appendRow([
        item.date || "",
        item.time || "",
        item.type || "",
        item.value || "",
        item.id || ""
      ]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", added: items.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

------
USEFULL COMMANDS: 

run:
npx expo run:android

or
cd D:\BabyTrackApp\android
.\gradlew assembleRelease
.\gradlew installRelease

[//]: # ( grab from D:\BabyTrackApp\android\app\build\outputs\apk\release)