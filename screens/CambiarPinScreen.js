import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';
import { COLORES, ESTILOS_FORM } from '../utils/theme';

export default function CambiarPinScreen({ navigation }) {
  const [actual, setActual] = useState('');
  const [nuevo, setNuevo] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!actual || !nuevo) { Alert.alert('Error', 'Completá todos los campos'); return; }
    if (!/^\d{4,6}$/.test(nuevo)) { Alert.alert('Error', 'El PIN nuevo debe tener entre 4 y 6 dígitos numéricos'); return; }
    if (nuevo !== confirmar) { Alert.alert('Error', 'El PIN nuevo no coincide en ambos campos'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/auth/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin_actual: actual, pin_nuevo: nuevo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando el PIN');
      Alert.alert('Listo', 'Tu PIN se actualizó', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={[s.container, { padding: 16 }]}>
      <Text style={s.label}>PIN actual</Text>
      <TextInput style={s.input} value={actual} onChangeText={t => setActual(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

      <Text style={s.label}>PIN nuevo (4 a 6 dígitos)</Text>
      <TextInput style={s.input} value={nuevo} onChangeText={t => setNuevo(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

      <Text style={s.label}>Confirmar PIN nuevo</Text>
      <TextInput style={s.input} value={confirmar} onChangeText={t => setConfirmar(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

      {guardando
        ? <ActivityIndicator size="large" color={COLORES.acento} style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>Guardar PIN nuevo</Text>
          </TouchableOpacity>
      }
    </View>
  );
}

const s = StyleSheet.create({
  ...ESTILOS_FORM,
});
