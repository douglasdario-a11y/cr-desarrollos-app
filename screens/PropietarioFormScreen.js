import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';

export default function PropietarioFormScreen({ route, navigation }) {
  const existente = route.params?.propietario;
  const editando = !!existente;

  const [nombre, setNombre] = useState(existente?.nombre || '');
  const [telefono, setTelefono] = useState(existente?.telefono || '');
  const [email, setEmail] = useState(existente?.email || '');
  const [notas, setNotas] = useState(existente?.notas || '');
  const [propiedadIds, setPropiedadIds] = useState((existente?.propiedades || []).map(p => p.id));
  const [propiedades, setPropiedades] = useState([]);
  const [guardando, setGuardando] = useState(false);

  async function cargarPropiedades() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setPropiedades(Array.isArray(data) ? data : []);
    } catch (e) { /* la lista queda vacía si falla */ }
  }

  useFocusEffect(useCallback(() => { cargarPropiedades(); }, []));

  function toggleProp(id) {
    setPropiedadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function guardar() {
    if (!nombre.trim()) { Alert.alert('Error', 'El nombre es requerido'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        notas: notas.trim() || null,
        propiedad_ids: propiedadIds,
      };
      const url = editando ? `${API}/propietarios/${existente.id}` : `${API}/propietarios`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el propietario');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.label}>Nombre</Text>
      <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Nombre del propietario" />

      <Text style={s.label}>Teléfono</Text>
      <TextInput style={s.input} value={telefono} onChangeText={setTelefono} placeholder="8888-8888" keyboardType="phone-pad" />

      <Text style={s.label}>Correo</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="propietario@correo.com" autoCapitalize="none" keyboardType="email-address" />

      <Text style={s.label}>Propiedades que posee</Text>
      <View style={s.chips}>
        {propiedades.map(p => (
          <TouchableOpacity key={p.id} style={[s.chip, propiedadIds.includes(p.id) && s.chipActivo]} onPress={() => toggleProp(p.id)}>
            <Text style={[s.chipText, propiedadIds.includes(p.id) && s.chipTextActivo]}>{p.titulo}</Text>
          </TouchableOpacity>
        ))}
        {propiedades.length === 0 && <Text style={s.vacio}>Todavía no hay propiedades creadas.</Text>}
      </View>

      <Text style={s.label}>Notas</Text>
      <TextInput style={[s.input, s.textarea]} value={notas} onChangeText={setNotas} placeholder="Detalles adicionales" multiline />

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>{editando ? 'Guardar cambios' : 'Crear propietario'}</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', color: '#1a1a1a', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: '#3d1f0a', borderColor: '#3d1f0a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#3d1f0a' },
  chipTextActivo: { color: '#fff' },
  vacio: { color: '#9a8674', fontSize: 13 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
