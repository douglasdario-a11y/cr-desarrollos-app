import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API, saveEmpresa } from '../utils/api';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, ESTILOS_FORM } from '../utils/theme';

export default function RegistroScreen({ onLogin, onVolver }) {
  const [empresaNombre, setEmpresaNombre] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [pin, setPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function registrar() {
    setError('');
    if (!empresaNombre.trim()) { setError('El nombre de tu inmobiliaria es requerido'); return; }
    if (!adminNombre.trim()) { setError('Tu nombre es requerido'); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError('El PIN debe tener entre 4 y 6 dígitos numéricos'); return; }
    if (pin !== confirmarPin) { setError('El PIN no coincide en ambos campos'); return; }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/empresas/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_nombre: empresaNombre.trim(), admin_nombre: adminNombre.trim(), admin_pin: pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error registrando la empresa'); return; }
      await saveEmpresa(data.empresa);
      await AsyncStorage.setItem('token', data.token);
      onLogin(data);
    } catch (e) {
      setError('No se pudo conectar al servidor');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
      <View style={s.card}>
        <View style={s.marcaIcono}>
          <MaterialCommunityIcons name="home-city" size={22} color="#fff" />
        </View>
        <Text style={s.titulo}>Registrá tu inmobiliaria</Text>
        <Text style={s.sub}>Creá tu propio espacio, aislado del de otras empresas.</Text>

        <Text style={ESTILOS_FORM.label}>Nombre de tu inmobiliaria</Text>
        <TextInput style={ESTILOS_FORM.input} value={empresaNombre} onChangeText={setEmpresaNombre} placeholder="Ej: Propiedades del Valle" />

        <Text style={ESTILOS_FORM.label}>Tu nombre</Text>
        <TextInput style={ESTILOS_FORM.input} value={adminNombre} onChangeText={setAdminNombre} placeholder="Tu nombre" />

        <Text style={ESTILOS_FORM.label}>PIN (4 a 6 dígitos)</Text>
        <TextInput style={ESTILOS_FORM.input} value={pin} onChangeText={t => setPin(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

        <Text style={ESTILOS_FORM.label}>Confirmar PIN</Text>
        <TextInput style={ESTILOS_FORM.input} value={confirmarPin} onChangeText={t => setConfirmarPin(t.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} />

        {!!error && <Text style={s.error}>{error}</Text>}

        {guardando
          ? <ActivityIndicator size="large" color={COLORES.acento} style={{ marginTop: 20 }} />
          : <TouchableOpacity style={s.btn} onPress={registrar}>
              <Text style={s.btnText}>Crear mi inmobiliaria</Text>
            </TouchableOpacity>
        }

        <TouchableOpacity onPress={onVolver} style={{ marginTop: 16 }}>
          <Text style={s.linkVolver}>Ya tengo una cuenta</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.fondo },
  card: { backgroundColor: COLORES.superficie, borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center' },
  marcaIcono: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORES.acento, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titulo: { fontFamily: FUENTE_TITULO, fontSize: 18, color: COLORES.tinta, textAlign: 'center' },
  sub: { fontSize: 13, color: COLORES.muted, fontFamily: FUENTE_CUERPO_600, marginTop: 4, marginBottom: 16, textAlign: 'center' },
  error: { color: COLORES.peligro, fontSize: 13, marginTop: 12, textAlign: 'center' },
  btn: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center', width: '100%', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FUENTE_CUERPO_600 },
  linkVolver: { fontSize: 12, color: COLORES.muted, textAlign: 'center' },
});
