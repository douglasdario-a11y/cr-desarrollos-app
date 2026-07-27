import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';

export default function UsuarioFormScreen({ route, navigation }) {
  const existente = route.params?.usuario;
  const editando = !!existente;

  const [nombre, setNombre] = useState(existente?.nombre || '');
  const [email, setEmail] = useState(existente?.email || '');
  const [pin, setPin] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar() {
    setError('');
    if (!nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!editando && !/^\d{4,6}$/.test(pin)) { setError('El PIN debe tener entre 4 y 6 dígitos numéricos'); return; }
    if (editando && pin && !/^\d{4,6}$/.test(pin)) { setError('El PIN debe tener entre 4 y 6 dígitos numéricos'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = { nombre: nombre.trim(), email: email.trim() || null };
      if (pin) body.pin = pin;
      const url = editando ? `${API}/usuarios/${existente.id}` : `${API}/usuarios`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el usuario');
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.label}>Nombre</Text>
      <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Nombre del usuario" />

      <Text style={s.label}>Correo (opcional)</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" autoCapitalize="none" keyboardType="email-address" />

      <Text style={s.label}>{editando ? 'PIN nuevo (dejar en blanco para no cambiarlo)' : 'PIN (4 a 6 dígitos)'}</Text>
      <TextInput
        style={s.input}
        value={pin}
        onChangeText={t => setPin(t.replace(/\D/g, ''))}
        placeholder="Ej: 1234"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
      />

      {!!error && <Text style={s.error}>{error}</Text>}

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>{editando ? 'Guardar cambios' : 'Crear usuario'}</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', color: '#1a1a1a', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 12 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
