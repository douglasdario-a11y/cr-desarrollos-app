import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '../utils/api';

export default function PropiedadFormScreen({ route, navigation }) {
  const existente = route.params?.propiedad;
  const [titulo, setTitulo] = useState(existente?.titulo || '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion || '');
  const [precio, setPrecio] = useState(existente?.precio ? String(existente.precio) : '');
  const [ubicacion, setUbicacion] = useState(existente?.ubicacion || '');
  const [tipo, setTipo] = useState(existente?.caracteristicas?.tipo || '');
  const [habitaciones, setHabitaciones] = useState(existente?.caracteristicas?.habitaciones ? String(existente.caracteristicas.habitaciones) : '');
  const [banos, setBanos] = useState(existente?.caracteristicas?.banos ? String(existente.caracteristicas.banos) : '');
  const [areaM2, setAreaM2] = useState(existente?.caracteristicas?.area_m2 ? String(existente.caracteristicas.area_m2) : '');
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es requerido'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        precio: precio ? Number(precio) : null,
        ubicacion: ubicacion.trim() || null,
        caracteristicas: {
          tipo: tipo.trim() || null,
          habitaciones: habitaciones ? Number(habitaciones) : null,
          banos: banos ? Number(banos) : null,
          area_m2: areaM2 ? Number(areaM2) : null,
        },
      };
      const url = existente ? `${API}/propiedades/${existente.id}` : `${API}/propiedades`;
      const res = await fetch(url, {
        method: existente ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la propiedad');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.label}>Título</Text>
      <TextInput style={s.input} value={titulo} onChangeText={setTitulo} placeholder="Casa en Escazú, 3 habitaciones" />

      <Text style={s.label}>Descripción</Text>
      <TextInput style={[s.input, s.textarea]} value={descripcion} onChangeText={setDescripcion} placeholder="Detalle de la propiedad" multiline />

      <Text style={s.label}>Precio (₡ colones)</Text>
      <TextInput style={s.input} value={precio} onChangeText={setPrecio} placeholder="75000000" keyboardType="numeric" />

      <Text style={s.label}>Ubicación</Text>
      <TextInput style={s.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Escazú, San José" />

      <Text style={s.label}>Tipo</Text>
      <TextInput style={s.input} value={tipo} onChangeText={setTipo} placeholder="Casa, apartamento, lote..." />

      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>Habitaciones</Text>
          <TextInput style={s.input} value={habitaciones} onChangeText={setHabitaciones} keyboardType="numeric" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Baños</Text>
          <TextInput style={s.input} value={banos} onChangeText={setBanos} keyboardType="numeric" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Área m²</Text>
          <TextInput style={s.input} value={areaM2} onChangeText={setAreaM2} keyboardType="numeric" />
        </View>
      </View>

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>{existente ? 'Guardar cambios' : 'Crear propiedad'}</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', gap: 10 },
  filaItem: { flex: 1 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
