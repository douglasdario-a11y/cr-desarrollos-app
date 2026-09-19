import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';

export default function PropietarioFormScreen({ route, navigation }) {
  const existente = route.params?.propietario;
  const editando = !!existente;

  const [tipo, setTipo] = useState(existente?.tipo || 'fisica');
  const [nombre, setNombre] = useState(existente?.nombre || '');
  const [telefono, setTelefono] = useState(existente?.telefono || '');
  const [email, setEmail] = useState(existente?.email || '');
  const [cedula, setCedula] = useState(existente?.cedula || '');
  const [direccion, setDireccion] = useState(existente?.direccion || '');
  const [numeroCuentaBancaria, setNumeroCuentaBancaria] = useState(existente?.numero_cuenta_bancaria || '');
  const [codigoActividadEconomica, setCodigoActividadEconomica] = useState(existente?.codigo_actividad_economica || '');
  const [notas, setNotas] = useState(existente?.notas || '');
  const [propiedadIds, setPropiedadIds] = useState((existente?.propiedades || []).map(p => p.id));
  const [propiedades, setPropiedades] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const [fisicas, setFisicas] = useState([]);
  const [representanteIds, setRepresentanteIds] = useState((existente?.representantes_legales || []).map(r => r.id));
  const [agregandoNuevoRep, setAgregandoNuevoRep] = useState(false);
  const [nuevoRepNombre, setNuevoRepNombre] = useState('');
  const [nuevoRepCedula, setNuevoRepCedula] = useState('');
  const [nuevoRepTelefono, setNuevoRepTelefono] = useState('');
  const [nuevoRepEmail, setNuevoRepEmail] = useState('');
  const [nuevoRepDireccion, setNuevoRepDireccion] = useState('');

  async function cargarPropiedades() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setPropiedades(Array.isArray(data) ? data : []);
    } catch (e) { /* la lista queda vacía si falla */ }
  }

  async function cargarFisicas() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propietarios?tipo=fisica`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setFisicas(Array.isArray(data) ? data : []);
    } catch (e) { /* la lista queda vacía si falla */ }
  }

  useFocusEffect(useCallback(() => { cargarPropiedades(); cargarFisicas(); }, []));

  function toggleProp(id) {
    setPropiedadIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleRepresentante(id) {
    setRepresentanteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function guardar() {
    if (!nombre.trim()) { Alert.alert('Error', 'El nombre es requerido'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const repIds = tipo === 'juridica' ? [...representanteIds] : [];
      if (tipo === 'juridica' && agregandoNuevoRep && nuevoRepNombre.trim()) {
        const resRep = await fetch(`${API}/propietarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            tipo: 'fisica',
            nombre: nuevoRepNombre.trim(),
            cedula: nuevoRepCedula.trim() || null,
            telefono: nuevoRepTelefono.trim() || null,
            email: nuevoRepEmail.trim() || null,
            direccion: nuevoRepDireccion.trim() || null,
          }),
        });
        const rep = await resRep.json();
        if (!resRep.ok) throw new Error(rep.error || 'Error creando el representante legal');
        repIds.push(rep.id);
      }
      const body = {
        tipo,
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        cedula: cedula.trim() || null,
        representante_ids: repIds,
        direccion: direccion.trim() || null,
        numero_cuenta_bancaria: numeroCuentaBancaria.trim() || null,
        codigo_actividad_economica: codigoActividadEconomica.trim() || null,
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
      <Text style={s.label}>Tipo</Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, tipo === 'fisica' && s.chipActivo]} onPress={() => setTipo('fisica')}>
          <Text style={[s.chipText, tipo === 'fisica' && s.chipTextActivo]}>Persona física</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.chip, tipo === 'juridica' && s.chipActivo]} onPress={() => setTipo('juridica')}>
          <Text style={[s.chipText, tipo === 'juridica' && s.chipTextActivo]}>Persona jurídica</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.label}>{tipo === 'juridica' ? 'Razón social' : 'Nombre'}</Text>
      <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder={tipo === 'juridica' ? 'Nombre de la sociedad' : 'Nombre del propietario'} />

      <Text style={s.label}>Teléfono</Text>
      <TextInput style={s.input} value={telefono} onChangeText={setTelefono} placeholder="8888-8888" keyboardType="phone-pad" />

      <Text style={s.label}>Correo</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="propietario@correo.com" autoCapitalize="none" keyboardType="email-address" />

      <Text style={s.label}>{tipo === 'juridica' ? 'Cédula jurídica' : 'Número de cédula'}</Text>
      <TextInput style={s.input} value={cedula} onChangeText={setCedula} placeholder="1-2345-6789" />

      <Text style={s.label}>Dirección</Text>
      <TextInput style={s.input} value={direccion} onChangeText={setDireccion} placeholder="Dirección exacta" />

      {tipo === 'juridica' && (
        <View style={s.seccionRep}>
          <Text style={s.label}>Representantes legales</Text>
          <View style={s.chips}>
            {fisicas.map(f => (
              <TouchableOpacity key={f.id} style={[s.chip, representanteIds.includes(f.id) && s.chipActivo]} onPress={() => toggleRepresentante(f.id)}>
                <Text style={[s.chipText, representanteIds.includes(f.id) && s.chipTextActivo]}>{f.nombre}{f.cedula ? ` (${f.cedula})` : ''}</Text>
              </TouchableOpacity>
            ))}
            {fisicas.length === 0 && <Text style={s.vacio}>Todavía no hay personas físicas registradas.</Text>}
          </View>

          <TouchableOpacity style={[s.chip, { marginTop: 10, alignSelf: 'flex-start' }, agregandoNuevoRep && s.chipActivo]} onPress={() => setAgregandoNuevoRep(v => !v)}>
            <Text style={[s.chipText, agregandoNuevoRep && s.chipTextActivo]}>+ Registrar nueva persona física</Text>
          </TouchableOpacity>

          {agregandoNuevoRep && (
            <View style={{ marginTop: 10 }}>
              <TextInput style={s.input} value={nuevoRepNombre} onChangeText={setNuevoRepNombre} placeholder="Nombre del representante" />
              <TextInput style={[s.input, { marginTop: 10 }]} value={nuevoRepCedula} onChangeText={setNuevoRepCedula} placeholder="Número de cédula" />
              <TextInput style={[s.input, { marginTop: 10 }]} value={nuevoRepTelefono} onChangeText={setNuevoRepTelefono} placeholder="Teléfono" keyboardType="phone-pad" />
              <TextInput style={[s.input, { marginTop: 10 }]} value={nuevoRepEmail} onChangeText={setNuevoRepEmail} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" />
              <TextInput style={[s.input, { marginTop: 10 }]} value={nuevoRepDireccion} onChangeText={setNuevoRepDireccion} placeholder="Dirección exacta" />
            </View>
          )}
        </View>
      )}

      <Text style={s.label}>Número de cuenta bancaria</Text>
      <TextInput style={s.input} value={numeroCuentaBancaria} onChangeText={setNumeroCuentaBancaria} placeholder="IBAN o número de cuenta" />

      <Text style={s.label}>Código de actividad económica</Text>
      <TextInput style={s.input} value={codigoActividadEconomica} onChangeText={setCodigoActividadEconomica} placeholder="Ej: 682002" />

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
  seccionRep: { marginTop: 16, backgroundColor: '#efe6db', borderRadius: 12, padding: 14 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
