import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

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
        <View style={s.marcaIcono}>
          <MaterialCommunityIcons name="home-city" size={22} color="#fff" />
        </View>
        <Text style={s.titulo}>CR Desarrollos</Text>
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
          ? <ActivityIndicator size="large" color={COLORES.acento} style={{ marginTop: 16 }} />
          : <TouchableOpacity style={[s.btn, pin.length < 4 && s.btnDeshabilitado]} onPress={entrar} disabled={pin.length < 4}>
              <Text style={s.btnText}>Entrar</Text>
            </TouchableOpacity>
        }
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORES.fondo },
  card: { backgroundColor: COLORES.superficie, borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#241C15', shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  marcaIcono: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORES.acento, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titulo: { fontFamily: FUENTE_TITULO, fontSize: 19, color: COLORES.tinta, textAlign: 'center' },
  sub: { fontSize: 14, color: COLORES.muted, fontFamily: FUENTE_CUERPO_600, marginTop: 4, marginBottom: 20 },
  pinDisplay: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORES.bordeFuerte },
  pinDotFull: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  error: { color: COLORES.peligro, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', marginTop: 8 },
  tecla: { width: 76, height: 56, borderRadius: 14, backgroundColor: COLORES.fondo, borderWidth: 1, borderColor: COLORES.borde, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teclaVacia: { backgroundColor: 'transparent', borderWidth: 0 },
  teclaDel: { backgroundColor: COLORES.peligroFondo, borderColor: '#F3C6C2' },
  teclaText: { fontSize: 20, fontFamily: FUENTE_CUERPO_600, color: COLORES.tinta },
  teclaDelText: { fontSize: 18, fontFamily: FUENTE_CUERPO_600, color: COLORES.peligro },
  btn: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  btnDeshabilitado: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FUENTE_CUERPO_600 },
});
