import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { ETAPAS_CLIENTE } from '../utils/crm';
import { sincronizarContacto, elegirDeContactos } from '../utils/contactosSync';
import { COLORES, ESTILOS_FORM } from '../utils/theme';

export default function ClienteFormScreen({ route, navigation }) {
  const existente = route.params?.cliente;
  const editando = !!existente;

  const [nombreCliente, setNombreCliente] = useState(existente?.nombre_cliente || '');
  const [telefono, setTelefono] = useState(existente?.telefono || '');
  const [email, setEmail] = useState(existente?.email || '');
  const [propiedadId, setPropiedadId] = useState(existente?.propiedad_id || '');
  const [etapa, setEtapa] = useState(existente?.etapa || 'contactado');
  const [vendedorId, setVendedorId] = useState(existente?.vendedor_id || '');
  const [notas, setNotas] = useState(existente?.notas || '');
  const [propiedades, setPropiedades] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [guardando, setGuardando] = useState(false);

  async function cargarListas() {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [resP, resU] = await Promise.all([
        fetch(`${API}/propiedades`, { headers }),
        fetch(`${API}/usuarios`, { headers }),
      ]);
      const dataP = await resP.json();
      const dataU = await resU.json();
      if (resP.ok) setPropiedades(Array.isArray(dataP) ? dataP : []);
      if (resU.ok) setVendedores(Array.isArray(dataU) ? dataU.filter(u => u.activo) : []);
    } catch (e) { /* los selectores quedan vacíos si falla */ }
  }

  useFocusEffect(useCallback(() => { cargarListas(); }, []));

  async function alElegirDeContactos() {
    const contacto = await elegirDeContactos();
    if (!contacto) return;
    if (contacto.error) { Alert.alert('Contactos', contacto.error); return; }
    if (contacto.nombre) setNombreCliente(contacto.nombre);
    if (contacto.telefono) setTelefono(contacto.telefono);
  }

  async function guardar() {
    if (!nombreCliente.trim()) { Alert.alert('Error', 'El nombre es requerido'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const nombreFinal = nombreCliente.trim();
      const telefonoFinal = telefono.trim();
      const body = {
        nombre_cliente: nombreFinal,
        telefono: telefonoFinal || null,
        email: email.trim() || null,
        propiedad_id: propiedadId || null,
        etapa,
        vendedor_id: vendedorId || null,
        notas: notas.trim() || null,
      };
      const url = editando ? `${API}/clientes/${existente.id}` : `${API}/clientes`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el cliente');
      if (telefonoFinal) {
        const resultadoContacto = await sincronizarContacto(editando ? existente.id : data.id, nombreFinal, telefonoFinal);
        if (resultadoContacto?.error) {
          Alert.alert('Contactos', `El cliente se guardó, pero no se pudo sincronizar con la agenda: ${resultadoContacto.error}`);
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity style={s.btnContactos} onPress={alElegirDeContactos}>
        <Text style={s.btnContactosText}>📇 Elegir de contactos</Text>
      </TouchableOpacity>

      <Text style={s.label}>Nombre</Text>
      <TextInput style={s.input} value={nombreCliente} onChangeText={setNombreCliente} placeholder="Nombre del cliente" />

      <Text style={s.label}>Teléfono</Text>
      <TextInput style={s.input} value={telefono} onChangeText={setTelefono} placeholder="8888-8888" keyboardType="phone-pad" />

      <Text style={s.label}>Correo</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="cliente@correo.com" autoCapitalize="none" keyboardType="email-address" />

      <Text style={s.label}>Propiedad de interés</Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, !propiedadId && s.chipActivo]} onPress={() => setPropiedadId('')}>
          <Text style={[s.chipText, !propiedadId && s.chipTextActivo]}>Ninguna en particular</Text>
        </TouchableOpacity>
        {propiedades.map(p => (
          <TouchableOpacity key={p.id} style={[s.chip, propiedadId === p.id && s.chipActivo]} onPress={() => setPropiedadId(p.id)}>
            <Text style={[s.chipText, propiedadId === p.id && s.chipTextActivo]}>{p.titulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Etapa</Text>
      <View style={s.chips}>
        {ETAPAS_CLIENTE.map(op => (
          <TouchableOpacity key={op.value} style={[s.chip, etapa === op.value && s.chipActivo]} onPress={() => setEtapa(op.value)}>
            <Text style={[s.chipText, etapa === op.value && s.chipTextActivo]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Vendedor</Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, !vendedorId && s.chipActivo]} onPress={() => setVendedorId('')}>
          <Text style={[s.chipText, !vendedorId && s.chipTextActivo]}>Sin asignar</Text>
        </TouchableOpacity>
        {vendedores.map(v => (
          <TouchableOpacity key={v.id} style={[s.chip, vendedorId === v.id && s.chipActivo]} onPress={() => setVendedorId(v.id)}>
            <Text style={[s.chipText, vendedorId === v.id && s.chipTextActivo]}>{v.nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Notas</Text>
      <TextInput style={[s.input, s.textarea]} value={notas} onChangeText={setNotas} placeholder="Detalles de la conversación, preferencias, etc." multiline />

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>{editando ? 'Guardar cambios' : 'Crear cliente'}</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  ...ESTILOS_FORM,
  btnContactos: { alignSelf: 'flex-start', backgroundColor: COLORES.chipFondo, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnContactosText: { fontSize: 13, fontFamily: ESTILOS_FORM.label.fontFamily, color: COLORES.muted },
});
