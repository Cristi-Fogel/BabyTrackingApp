import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importăm ecranele din folderul src/screens
import HomeScreen from './src/screens/HomeScreen';
import MilkTrackerScreen from './src/screens/MilkTrackerScreen';
import SleepTrackerScreen from './src/screens/SleepTrackerScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MilkTracker" component={MilkTrackerScreen} />
        <Stack.Screen name="SleepTracker" component={SleepTrackerScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}