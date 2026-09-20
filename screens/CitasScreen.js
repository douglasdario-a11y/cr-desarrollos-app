import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { estadoCita, fmtFechaHora } from '../utils/crm';
import { borrarCitaVinculada } from '../utils/calendarSync';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function aClaveFecha(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function tituloDia(clave) {
  if (!clave) return '';
  const [anio, mes, dia] = clave.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]} ${anio}`;
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
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

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
  const citasDelDia = diaSeleccionado
    ? (porDia[diaSeleccionado] || []).slice().sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
    : [];

  return (
    <>
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
                  onPress={() => {
                    if (citasDia.length > 0) setDiaSeleccionado(clave);
                    else navigation.navigate('CitaForm', { fecha: clave });
                  }}
                >
                  <Text style={[s.calDiaTexto, clave === hoyClave && { color: '#fff', fontFamily: FUENTE_CUERPO_700 }]}>{dia.getDate()}</Text>
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

    <Modal
      visible={!!diaSeleccionado}
      transparent
      animationType="slide"
      onRequestClose={() => setDiaSeleccionado(null)}
    >
      <View style={s.modalFondo}>
        <View style={s.modalContenido}>
          <Text style={s.modalTitulo}>{tituloDia(diaSeleccionado)}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {citasDelDia.map(c => {
              const est = estadoCita(c.estado);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={s.modalFila}
                  onPress={() => { setDiaSeleccionado(null); navigation.navigate('CitaForm', { cita: c }); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.fecha}>{fmtFechaHora(c.fecha_hora)}</Text>
                    <View style={s.detalleFila}>
                      {!!c.nombre_cliente && <Text style={s.detalle}>👤 {c.nombre_cliente}</Text>}
                      {!!c.propiedad_titulo && <Text style={s.detalle}>🏠 {c.propiedad_titulo}</Text>}
                    </View>
                  </View>
                  <View style={[s.estadoChip, { backgroundColor: est.color }]}><Text style={s.estadoChipText}>{est.label}</Text></View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={s.btnNuevaModal}
            onPress={() => { const f = diaSeleccionado; setDiaSeleccionado(null); navigation.navigate('CitaForm', { fecha: f }); }}
          >
            <Text style={s.btnNuevaText}>+ Nueva cita este día</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnCerrarModal} onPress={() => setDiaSeleccionado(null)}>
            <Text style={s.btnCerrarModalText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
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
  container: { flex: 1, backgroundColor: COLORES.fondo },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitulo: { fontFamily: FUENTE_TITULO, fontSize: 26, color: COLORES.tinta },
  btnNueva: { backgroundColor: COLORES.acento, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnNuevaText: { color: '#fff', fontFamily: FUENTE_CUERPO_600, fontSize: 13 },
  calendario: { backgroundColor: COLORES.superficie, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: COLORES.borde },
  calHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 10 },
  navMes: { fontSize: 22, color: COLORES.muted, paddingHorizontal: 10 },
  mesTexto: { fontFamily: FUENTE_CUERPO_700, fontSize: 15, color: COLORES.tinta, minWidth: 150, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCelda: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  calDiaSemana: { textAlign: 'center', fontSize: 11, fontFamily: FUENTE_CUERPO_700, color: COLORES.muted },
  calDia: { flex: 1, backgroundColor: COLORES.fondo, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calDiaHoy: { backgroundColor: COLORES.acento },
  calDiaTexto: { fontSize: 13, color: COLORES.tinta },
  calPunto: { position: 'absolute', bottom: 3, right: 3, backgroundColor: COLORES.acento, borderRadius: 8, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  calPuntoTexto: { color: '#fff', fontSize: 9, fontFamily: FUENTE_CUERPO_700 },
  seccionTitulo: { fontFamily: FUENTE_TITULO, fontSize: 16, color: COLORES.tinta, marginBottom: 10 },
  vacio: { color: COLORES.muted, fontSize: 13 },
  fila: { backgroundColor: COLORES.superficie, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORES.borde },
  fecha: { fontSize: 14, fontFamily: FUENTE_CUERPO_700, color: COLORES.tinta },
  detalleFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  detalle: { fontSize: 12, color: COLORES.muted },
  accionesFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 8 },
  estadoChip: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  estadoChipText: { color: '#fff', fontSize: 11, fontFamily: FUENTE_CUERPO_700 },
  btnAccion: { borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10 },
  btnAccionText: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.tinta },
  btnAccionCancelarText: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.peligro },
  btnBorrarText: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.peligro },
  modalFondo: { flex: 1, backgroundColor: 'rgba(36,28,21,0.45)', justifyContent: 'flex-end' },
  modalContenido: { backgroundColor: COLORES.fondo, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
  modalTitulo: { fontFamily: FUENTE_TITULO, fontSize: 17, color: COLORES.tinta, marginBottom: 14, textTransform: 'capitalize' },
  modalFila: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORES.superficie, borderRadius: 16, padding: 14, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: COLORES.borde },
  btnNuevaModal: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 14 },
  btnCerrarModal: { alignItems: 'center', padding: 12, marginTop: 6 },
  btnCerrarModalText: { color: COLORES.muted, fontFamily: FUENTE_CUERPO_600, fontSize: 13 },
});
