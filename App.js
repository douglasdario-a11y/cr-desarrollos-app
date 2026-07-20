import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import PropiedadesScreen from './screens/PropiedadesScreen';
import PropiedadDetalleScreen from './screens/PropiedadDetalleScreen';
import PropiedadFormScreen from './screens/PropiedadFormScreen';
import CambiarPinScreen from './screens/CambiarPinScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function tabIcon(name) {
  return ({ color, size }) => <MaterialCommunityIcons name={name} color={color} size={size} />;
}

function PropiedadesStack({ onLogout }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PropiedadesLista" options={{ title: 'Propiedades' }}>
        {(props) => <PropiedadesScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="PropiedadDetalle" component={PropiedadDetalleScreen} options={{ title: 'Propiedad' }} />
      <Stack.Screen name="PropiedadForm" component={PropiedadFormScreen} options={{ title: 'Propiedad' }} />
      <Stack.Screen name="CambiarPin" component={CambiarPinScreen} options={{ title: 'Cambiar PIN' }} />
    </Stack.Navigator>
  );
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
        <Tab.Screen name="Propiedades" options={{ tabBarIcon: tabIcon('home-city') }}>
          {() => <PropiedadesStack onLogout={handleLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
