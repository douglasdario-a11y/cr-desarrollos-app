import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { estadoCita, fmtFechaHora } from '../utils/crm';
import { borrarCitaVinculada } from '../utils/calendarSync';

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function aClaveFecha(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function generarDiasMes(mesActual) {
  const anio = mesActual.getFullYear();
  const mes = mesActual.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const dias = [];
  for (let i = 0; i < primerDia.getDay(); i++) dias.push(null);
  for (let d = 1; d <= diasEnMes; d++) dias.push(new Date(anio, mes, d));
  return dias;
}

export default function CitasScreen({ navigation }) {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [mesActual, setMesActual] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/citas`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCitas(Array.isArray(data) ? data : []);
    } catch (e) {
      // se queda vacía si falla
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function cambiarEstado(id, estado) {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API}/citas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado }),
    });
    cargar();
  }

  function confirmarBorrar(id) {
    Alert.alert('Borrar cita', '¿Seguro que quieres borrar esta cita?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => borrar(id) },
    ]);
  }

  async function borrar(id) {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API}/citas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    borrarCitaVinculada(id);
    cargar();
  }

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const porDia = {};
  citas.forEach(c => {
    const clave = (c.fecha_hora || '').slice(0, 10);
    if (!porDia[clave]) porDia[clave] = [];
    porDia[clave].push(c);
  });

  const pendientes = citas
    .filter(c => c.estado === 'pendiente' || c.estado === 'confirmada')
    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
  const historial = citas
    .filter(c => c.estado === 'hecha' || c.estado === 'cancelada')
    .sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));

  const dias = generarDiasMes(mesActual);
  const hoyClave = aClaveFecha(new Date());

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
    >
      <View style={s.header}>
        <Text style={s.headerTitulo}>Citas</Text>
        <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('CitaForm')}>
          <Text style={s.btnNuevaText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <View style={s.calendario}>
        <View style={s.calHeader}>
          <TouchableOpacity onPress={() => setMesActual(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>
            <Text style={s.navMes}>‹</Text>
          </TouchableOpacity>
          <Text style={s.mesTexto}>{MESES[mesActual.getMonth()]} {mesActual.getFullYear()}</Text>
          <TouchableOpacity onPress={() => setMesActual(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>
            <Text style={s.navMes}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={s.calGrid}>
          {DIAS_SEMANA.map((d, i) => (
            <View key={i} style={s.calCelda}><Text style={s.calDiaSemana}>{d}</Text></View>
          ))}
          {dias.map((dia, i) => {
            if (!dia) return <View key={i} style={s.calCelda} />;
            const clave = aClaveFecha(dia);
            const citasDia = porDia[clave] || [];
            return (
              <View key={i} style={s.calCelda}>
                <TouchableOpacity
                  style={[s.calDia, clave === hoyClave && s.calDiaHoy]}
                  onPress={() => navigation.navigate('CitaForm', { fecha: clave })}
                >
                  <Text style={s.calDiaTexto}>{dia.getDate()}</Text>
                  {citasDia.length > 0 && (
                    <View style={s.calPunto}><Text style={s.calPuntoTexto}>{citasDia.length}</Text></View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      <SeccionCitas titulo="Pendientes" citas={pendientes} vacio="No hay citas pendientes."
        onCambiarEstado={cambiarEstado} onBorrar={confirmarBorrar} navigation={navigation} />
      <SeccionCitas titulo="Historial" citas={historial} vacio="Todavía no hay citas hechas o canceladas."
        onCambiarEstado={cambiarEstado} onBorrar={confirmarBorrar} navigation={navigation} />
    </ScrollView>
  );
}

function SeccionCitas({ titulo, citas, vacio, onCambiarEstado, onBorrar, navigation }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={s.seccionTitulo}>{titulo}</Text>
      {citas.length === 0
        ? <Text style={s.vacio}>{vacio}</Text>
        : citas.map(c => {
            const est = estadoCita(c.estado);
            return (
              <TouchableOpacity key={c.id} style={s.fila} onPress={() => navigation.navigate('CitaForm', { cita: c })}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fecha}>{fmtFechaHora(c.fecha_hora)}</Text>
                  <View style={s.detalleFila}>
                    {!!c.nombre_cliente && <Text style={s.detalle}>👤 {c.nombre_cliente}</Text>}
                    {!!c.propiedad_titulo && <Text style={s.detalle}>🏠 {c.propiedad_titulo}</Text>}
                  </View>
                  <View style={s.accionesFila}>
                    <View style={[s.estadoChip, { backgroundColor: est.color }]}><Text style={s.estadoChipText}>{est.label}</Text></View>
                    {c.estado === 'pendiente' && (
                      <TouchableOpacity style={s.btnAccion} onPress={() => onCambiarEstado(c.id, 'confirmada')}>
                        <Text style={s.btnAccionText}>Confirmar</Text>
                      </TouchableOpacity>
                    )}
                    {(c.estado === 'pendiente' || c.estado === 'confirmada') && (
                      <>
                        <TouchableOpacity style={s.btnAccion} onPress={() => onCambiarEstado(c.id, 'hecha')}>
                          <Text style={s.btnAccionText}>Marcar hecha</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnAccion} onPress={() => onCambiarEstado(c.id, 'cancelada')}>
                          <Text style={s.btnAccionCancelarText}>Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity onPress={() => onBorrar(c.id)}>
                      <Text style={s.btnBorrarText}>Borrar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
      }
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitulo: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  btnNueva: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnNuevaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  calendario: { backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  calHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 10 },
  navMes: { fontSize: 22, color: '#3d1f0a', paddingHorizontal: 10 },
  mesTexto: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', minWidth: 150, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCelda: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  calDiaSemana: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9a8674' },
  calDia: { flex: 1, backgroundColor: '#f5f0eb', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calDiaHoy: { backgroundColor: '#e8ddd5' },
  calDiaTexto: { fontSize: 13, color: '#1a1a1a' },
  calPunto: { position: 'absolute', bottom: 3, right: 3, backgroundColor: '#3d1f0a', borderRadius: 8, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  calPuntoTexto: { color: '#fff', fontSize: 9, fontWeight: '700' },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  vacio: { color: '#9a8674', fontSize: 13 },
  fila: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  fecha: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  detalleFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  detalle: { fontSize: 12, color: '#7a5c3a' },
  accionesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 },
  estadoChip: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  estadoChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  btnAccion: { borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  btnAccionText: { fontSize: 12, fontWeight: '600', color: '#3d1f0a' },
  btnAccionCancelarText: { fontSize: 12, fontWeight: '600', color: '#b3261e' },
  btnBorrarText: { fontSize: 12, fontWeight: '600', color: '#b3261e' },
});
