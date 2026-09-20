import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold, PublicSans_700Bold } from '@expo-google-fonts/public-sans';
import LoginScreen from './screens/LoginScreen';
import PropiedadesScreen from './screens/PropiedadesScreen';
import PropiedadDetalleScreen from './screens/PropiedadDetalleScreen';
import PropiedadFormScreen from './screens/PropiedadFormScreen';
import CambiarPinScreen from './screens/CambiarPinScreen';
import ClientesScreen from './screens/ClientesScreen';
import ClienteDetalleScreen from './screens/ClienteDetalleScreen';
import ClienteFormScreen from './screens/ClienteFormScreen';
import PropietariosScreen from './screens/PropietariosScreen';
import PropietarioDetalleScreen from './screens/PropietarioDetalleScreen';
import PropietarioFormScreen from './screens/PropietarioFormScreen';
import CitasScreen from './screens/CitasScreen';
import CitaFormScreen from './screens/CitaFormScreen';
import UsuariosScreen from './screens/UsuariosScreen';
import UsuarioFormScreen from './screens/UsuarioFormScreen';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600 } from './utils/theme';

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function tabIcon(name) {
  return ({ color, size }) => <MaterialCommunityIcons name={name} color={color} size={size} />;
}

// Encabezados de los stacks: mismo look en todas las pantallas (fondo claro,
// tinta oscura, título en la tipografía de marca) en vez del header nativo
// gris por defecto.
const opcionesStack = {
  headerStyle: { backgroundColor: COLORES.superficie },
  headerShadowVisible: false,
  headerTintColor: COLORES.tinta,
  headerTitleStyle: { fontFamily: FUENTE_TITULO, fontSize: 18, color: COLORES.tinta },
};

function PropiedadesStack({ onLogout }) {
  return (
    <Stack.Navigator screenOptions={opcionesStack}>
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
    <Stack.Navigator screenOptions={opcionesStack}>
      <Stack.Screen name="ClientesLista" component={ClientesScreen} options={{ title: 'Clientes' }} />
      <Stack.Screen name="ClienteDetalle" component={ClienteDetalleScreen} options={{ title: 'Cliente' }} />
      <Stack.Screen name="ClienteForm" component={ClienteFormScreen} options={{ title: 'Cliente' }} />
    </Stack.Navigator>
  );
}

function PropietariosStack() {
  return (
    <Stack.Navigator screenOptions={opcionesStack}>
      <Stack.Screen name="PropietariosLista" component={PropietariosScreen} options={{ title: 'Propietarios' }} />
      <Stack.Screen name="PropietarioDetalle" component={PropietarioDetalleScreen} options={{ title: 'Propietario' }} />
      <Stack.Screen name="PropietarioForm" component={PropietarioFormScreen} options={{ title: 'Propietario' }} />
    </Stack.Navigator>
  );
}

function CitasStack() {
  return (
    <Stack.Navigator screenOptions={opcionesStack}>
      <Stack.Screen name="CitasLista" component={CitasScreen} options={{ title: 'Citas' }} />
      <Stack.Screen name="CitaForm" component={CitaFormScreen} options={{ title: 'Cita' }} />
    </Stack.Navigator>
  );
}

function UsuariosStack() {
  return (
    <Stack.Navigator screenOptions={opcionesStack}>
      <Stack.Screen name="UsuariosLista" component={UsuariosScreen} options={{ title: 'Usuarios' }} />
      <Stack.Screen name="UsuarioForm" component={UsuarioFormScreen} options={{ title: 'Usuario' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [fuentesListas] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  const alListo = useCallback(async () => {
    if (fuentesListas) await SplashScreen.hideAsync();
  }, [fuentesListas]);

  useEffect(() => { alListo(); }, [alListo]);

  async function handleLogout() {
    await AsyncStorage.removeItem('token');
    setUsuario(null);
  }

  if (!fuentesListas) return null;

  if (!usuario) return <LoginScreen onLogin={setUsuario} />;

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORES.acento,
        tabBarInactiveTintColor: COLORES.muted,
        tabBarStyle: { backgroundColor: COLORES.superficie, borderTopColor: COLORES.borde },
        tabBarLabelStyle: { fontFamily: FUENTE_CUERPO_600, fontSize: 11 },
      }}>
        <Tab.Screen name="Propiedades" options={{ tabBarIcon: tabIcon('home-city') }}>
          {() => <PropiedadesStack onLogout={handleLogout} />}
        </Tab.Screen>
        <Tab.Screen name="Clientes" component={ClientesStack} options={{ tabBarIcon: tabIcon('account-multiple') }} />
        <Tab.Screen name="Propietarios" component={PropietariosStack} options={{ tabBarIcon: tabIcon('account-tie') }} />
        <Tab.Screen name="Citas" component={CitasStack} options={{ tabBarIcon: tabIcon('calendar-month') }} />
        <Tab.Screen name="Usuarios" component={UsuariosStack} options={{ tabBarIcon: tabIcon('key-variant') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
