import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importăm ecranele din folderul src/screens
import HomeScreen from './src/screens/HomeScreen';
import MilkTrackerScreen from './src/screens/MilkTrackerScreen';
import SleepTrackerScreen from './src/screens/SleepTrackerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MamaScreen from './src/screens/MamaScreen';
import GrowthTrackerScreen from './src/screens/GrowthTrackerScreen';
import ReminderScreen from './src/screens/ReminderScreen'
import AlarmsScreen from './src/screens/AlarmsScreen';

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
        <Stack.Screen name="Mama" component={MamaScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GrowthTracker" component={GrowthTrackerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Reminders" component={ReminderScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Alarms" component={AlarmsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}