import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import PropiedadesScreen from './screens/PropiedadesScreen';

const Tab = createBottomTabNavigator();

function tabIcon(name) {
  return ({ color, size }) => <MaterialCommunityIcons name={name} color={color} size={size} />;
}

export default function App() {
  const [usuario, setUsuario] = useState(null);

  async function handleLogout() {
    await AsyncStorage.removeItem('token');
    setUsuario(null);
  }

  if (!usuario) return <LoginScreen onLogin={setUsuario} />;

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1a1a1a' }}>
        <Tab.Screen name="Propiedades"
          options={{ tabBarIcon: tabIcon('home-city') }}>
          {() => <PropiedadesScreen usuario={usuario} onLogout={handleLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
