import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    if (loading || pin.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'PIN incorrecto'); setPin(''); return; }
      await AsyncStorage.setItem('token', data.token);
      onLogin(data);
    } catch (e) {
      setError('No se pudo conectar al servidor');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  // El PIN puede tener entre 4 y 6 dígitos — no se puede saber cuándo el
  // usuario terminó de escribir con solo mirar la cantidad de dígitos, así
  // que hace falta el botón "Entrar" en vez de enviar apenas se completan 4.
  function presionar(val) {
    if (loading) return;
    if (val === 'DEL') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    setPin(p => p + val);
  }

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.titulo}>Sistema de Registro Inmobiliario</Text>
        <Text style={s.sub}>Ingresá tu PIN</Text>

        <View style={s.pinDisplay}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[s.pinDot, i < pin.length && s.pinDotFull]} />
          ))}
        </View>

        {!!error && <Text style={s.error}>{error}</Text>}

        <View style={s.teclado}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((k, i) => (
            <TouchableOpacity
              key={i}
              style={[s.tecla, k === '' && s.teclaVacia, k === 'DEL' && s.teclaDel]}
              onPress={() => k && presionar(k)}
              disabled={k === '' || loading}
            >
              <Text style={k === 'DEL' ? s.teclaDelText : s.teclaText}>{k === 'DEL' ? '⌫' : k}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading
          ? <ActivityIndicator size="large" color="#1a1a1a" style={{ marginTop: 16 }} />
          : <TouchableOpacity style={[s.btn, pin.length < 4 && s.btnDeshabilitado]} onPress={entrar} disabled={pin.length < 4}>
              <Text style={s.btnText}>Entrar</Text>
            </TouchableOpacity>
        }
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f5f0eb' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  titulo: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  sub: { fontSize: 14, color: '#7a5c3a', fontWeight: '500', marginTop: 4, marginBottom: 20 },
  pinDisplay: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#b8a99a' },
  pinDotFull: { backgroundColor: '#3d1f0a', borderColor: '#3d1f0a' },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', marginTop: 8 },
  tecla: { width: 76, height: 56, borderRadius: 10, backgroundColor: '#f5f0eb', borderWidth: 1, borderColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teclaVacia: { backgroundColor: 'transparent', borderWidth: 0 },
  teclaDel: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  teclaText: { fontSize: 20, fontWeight: '600', color: '#3d1f0a' },
  teclaDelText: { fontSize: 18, fontWeight: '600', color: '#ef4444' },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  btnDeshabilitado: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
