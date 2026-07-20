import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';

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
    <View style={s.container}>
      <Text style={s.label}>PIN actual</Text>
      <TextInput style={s.input} value={actual} onChangeText={t => setActual(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

      <Text style={s.label}>PIN nuevo (4 a 6 dígitos)</Text>
      <TextInput style={s.input} value={nuevo} onChangeText={t => setNuevo(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

      <Text style={s.label}>Confirmar PIN nuevo</Text>
      <TextInput style={s.input} value={confirmar} onChangeText={t => setConfirmar(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>Guardar PIN nuevo</Text>
          </TouchableOpacity>
      }
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb', padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', color: '#1a1a1a', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
