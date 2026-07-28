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
import ClientesScreen from './screens/ClientesScreen';
import ClienteFormScreen from './screens/ClienteFormScreen';
import PropietariosScreen from './screens/PropietariosScreen';
import PropietarioFormScreen from './screens/PropietarioFormScreen';
import CitasScreen from './screens/CitasScreen';
import CitaFormScreen from './screens/CitaFormScreen';
import UsuariosScreen from './screens/UsuariosScreen';
import UsuarioFormScreen from './screens/UsuarioFormScreen';
import MapaTestScreen from './screens/_MapaTestScreen';

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

function ClientesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ClientesLista" component={ClientesScreen} options={{ title: 'Clientes' }} />
      <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Cliente' }} />
    </Stack.Navigator>
  );
}

function PropietariosStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PropietariosLista" component={PropietariosScreen} options={{ title: 'Propietarios' }} />
      <Stack.Screen name="PropietarioForm" component={PropietarioFormScreen} options={{ title: 'Propietario' }} />
    </Stack.Navigator>
  );
}

function CitasStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CitasLista" component={CitasScreen} options={{ title: 'Citas' }} />
      <Stack.Screen name="CitaForm" component={CitaFormScreen} options={{ title: 'Cita' }} />
    </Stack.Navigator>
  );
}

function UsuariosStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="UsuariosLista" component={UsuariosScreen} options={{ title: 'Usuarios' }} />
      <Stack.Screen name="UsuarioForm" component={UsuarioFormScreen} options={{ title: 'Usuario' }} />
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
        <Tab.Screen name="Clientes" component={ClientesStack} options={{ tabBarIcon: tabIcon('account-multiple') }} />
        <Tab.Screen name="Propietarios" component={PropietariosStack} options={{ tabBarIcon: tabIcon('account-tie') }} />
        <Tab.Screen name="Citas" component={CitasStack} options={{ tabBarIcon: tabIcon('calendar-month') }} />
        <Tab.Screen name="Usuarios" component={UsuariosStack} options={{ tabBarIcon: tabIcon('key-variant') }} />
        <Tab.Screen name="MapaTest" component={MapaTestScreen} options={{ tabBarIcon: tabIcon('map'), title: 'Mapa (test)' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
