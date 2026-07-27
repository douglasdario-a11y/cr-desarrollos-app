import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API } from '../utils/api';
import { ESTADOS_CITA, partirFechaHora } from '../utils/crm';
import { sincronizarCita } from '../utils/calendarSync';

function fechaInicial(existente, fechaParam) {
  if (existente?.fecha_hora) return new Date(existente.fecha_hora);
  if (fechaParam) return new Date(`${fechaParam}T09:00`);
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

export default function CitaFormScreen({ route, navigation }) {
  const existente = route.params?.cita;
  const fechaParam = route.params?.fecha;
  const editando = !!existente;

  const [fechaHora, setFechaHora] = useState(() => fechaInicial(existente, fechaParam));
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [mostrarHora, setMostrarHora] = useState(false);
  const [clienteId, setClienteId] = useState(existente?.cliente_id || '');
  const [propiedadId, setPropiedadId] = useState(existente?.propiedad_id || '');
  const [estado, setEstado] = useState(existente?.estado || 'pendiente');
  const [notas, setNotas] = useState(existente?.notas || '');
  const [clientes, setClientes] = useState([]);
  const [propiedades, setPropiedades] = useState([]);
  const [guardando, setGuardando] = useState(false);

  async function cargarListas() {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [resC, resP] = await Promise.all([
        fetch(`${API}/clientes`, { headers }),
        fetch(`${API}/propiedades`, { headers }),
      ]);
      const dataC = await resC.json();
      const dataP = await resP.json();
      if (resC.ok) setClientes(Array.isArray(dataC) ? dataC : []);
      if (resP.ok) setPropiedades(Array.isArray(dataP) ? dataP : []);
    } catch (e) { /* los selectores quedan vacíos si falla */ }
  }

  useFocusEffect(useCallback(() => { cargarListas(); }, []));

  // Si se elige un cliente que tiene una propiedad de interés guardada, se
  // sugiere esa propiedad para no tener que buscarla de nuevo.
  function alElegirCliente(nuevoId) {
    setClienteId(nuevoId);
    if (!propiedadId && nuevoId) {
      const c = clientes.find(x => String(x.id) === String(nuevoId));
      if (c?.propiedad_id) setPropiedadId(c.propiedad_id);
    }
  }

  function cambiarFecha(event, seleccionada) {
    setMostrarFecha(Platform.OS === 'ios');
    if (seleccionada) {
      const nueva = new Date(fechaHora);
      nueva.setFullYear(seleccionada.getFullYear(), seleccionada.getMonth(), seleccionada.getDate());
      setFechaHora(nueva);
    }
  }

  function cambiarHora(event, seleccionada) {
    setMostrarHora(Platform.OS === 'ios');
    if (seleccionada) {
      const nueva = new Date(fechaHora);
      nueva.setHours(seleccionada.getHours(), seleccionada.getMinutes(), 0, 0);
      setFechaHora(nueva);
    }
  }

  function aFechaHoraString(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function guardar() {
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        fecha_hora: aFechaHoraString(fechaHora),
        cliente_id: clienteId || null,
        propiedad_id: propiedadId || null,
        estado,
        notas: notas.trim() || null,
      };
      const url = editando ? `${API}/citas/${existente.id}` : `${API}/citas`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la cita');
      const clienteNombre = clientes.find(c => c.id === clienteId)?.nombre_cliente;
      const propiedadTitulo = propiedades.find(p => p.id === propiedadId)?.titulo;
      const titulo = ['Cita', clienteNombre, propiedadTitulo].filter(Boolean).join(' - ');
      sincronizarCita(editando ? existente.id : data.id, { titulo, notas: notas.trim(), fecha: fechaHora });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  const { fecha: fechaTexto, hora: horaTexto } = partirFechaHora(aFechaHoraString(fechaHora));
  const [anio, mes, dia] = fechaTexto.split('-');

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>Fecha</Text>
          <TouchableOpacity style={s.input} onPress={() => setMostrarFecha(true)}>
            <Text style={s.inputTexto}>{`${dia}/${mes}/${anio}`}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Hora</Text>
          <TouchableOpacity style={s.input} onPress={() => setMostrarHora(true)}>
            <Text style={s.inputTexto}>{horaTexto}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {mostrarFecha && (
        <DateTimePicker value={fechaHora} mode="date" display="default" onChange={cambiarFecha} />
      )}
      {mostrarHora && (
        <DateTimePicker value={fechaHora} mode="time" display="default" is24Hour onChange={cambiarHora} />
      )}

      <Text style={s.label}>Cliente</Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, !clienteId && s.chipActivo]} onPress={() => alElegirCliente('')}>
          <Text style={[s.chipText, !clienteId && s.chipTextActivo]}>Sin asignar</Text>
        </TouchableOpacity>
        {clientes.map(c => (
          <TouchableOpacity key={c.id} style={[s.chip, clienteId === c.id && s.chipActivo]} onPress={() => alElegirCliente(c.id)}>
            <Text style={[s.chipText, clienteId === c.id && s.chipTextActivo]}>{c.nombre_cliente}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Propiedad</Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, !propiedadId && s.chipActivo]} onPress={() => setPropiedadId('')}>
          <Text style={[s.chipText, !propiedadId && s.chipTextActivo]}>Sin asignar</Text>
        </TouchableOpacity>
        {propiedades.map(p => (
          <TouchableOpacity key={p.id} style={[s.chip, propiedadId === p.id && s.chipActivo]} onPress={() => setPropiedadId(p.id)}>
            <Text style={[s.chipText, propiedadId === p.id && s.chipTextActivo]}>{p.titulo}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Estado</Text>
      <View style={s.chips}>
        {ESTADOS_CITA.map(op => (
          <TouchableOpacity key={op.value} style={[s.chip, estado === op.value && s.chipActivo]} onPress={() => setEstado(op.value)}>
            <Text style={[s.chipText, estado === op.value && s.chipTextActivo]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Notas</Text>
      <TextInput style={[s.input, s.textarea]} value={notas} onChangeText={setNotas} placeholder="Detalles de la visita" multiline />

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>{editando ? 'Guardar cambios' : 'Crear cita'}</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, justifyContent: 'center' },
  inputTexto: { color: '#1a1a1a', fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', gap: 10 },
  filaItem: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: '#3d1f0a', borderColor: '#3d1f0a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#3d1f0a' },
  chipTextActivo: { color: '#fff' },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
