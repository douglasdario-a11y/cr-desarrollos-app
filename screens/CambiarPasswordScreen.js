import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';

export default function CambiarPasswordScreen({ navigation }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!actual || !nueva) { Alert.alert('Error', 'Completá todos los campos'); return; }
    if (nueva !== confirmar) { Alert.alert('Error', 'La contraseña nueva no coincide en ambos campos'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password_actual: actual, password_nuevo: nueva }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando la contraseña');
      Alert.alert('Listo', 'Tu contraseña se actualizó', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.label}>Contraseña actual</Text>
      <TextInput style={s.input} value={actual} onChangeText={setActual} secureTextEntry />

      <Text style={s.label}>Contraseña nueva</Text>
      <TextInput style={s.input} value={nueva} onChangeText={setNueva} secureTextEntry />

      <Text style={s.label}>Confirmar contraseña nueva</Text>
      <TextInput style={s.input} value={confirmar} onChangeText={setConfirmar} secureTextEntry />

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>Guardar contraseña nueva</Text>
          </TouchableOpacity>
      }
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb', padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
