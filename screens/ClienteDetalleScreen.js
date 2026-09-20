import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { etapaLabel, etapaColores, estadoCita, fmtFechaHora } from '../utils/crm';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

function numeroWhatsapp(telefono) {
  const digitos = (telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.length <= 8 ? `506${digitos}` : digitos;
}

export default function ClienteDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const [cliente, setCliente] = useState(null);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [res, resCitas] = await Promise.all([
        fetch(`${API}/clientes/${id}`, { headers }),
        fetch(`${API}/citas`, { headers }),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando el cliente');
      setCliente(data);
      const dataCitas = await resCitas.json();
      setCitas(resCitas.ok && Array.isArray(dataCitas) ? dataCitas.filter(c => String(c.cliente_id) === String(id)) : []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, [id]));

  if (loading || !cliente) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const whatsapp = numeroWhatsapp(cliente.telefono);
  const citasOrdenadas = [...citas].sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
  const et = etapaColores(cliente.etapa);

  return (
    <View style={s.container}>
      <View style={{ padding: 16 }}>
        <View style={s.tituloFila}>
          <Text style={[s.nombre, { flex: 1 }]}>{cliente.nombre_cliente}</Text>
          <View style={[s.etapaChip, { backgroundColor: et.bg }]}><Text style={[s.etapaChipText, { color: et.color }]}>{etapaLabel(cliente.etapa)}</Text></View>
        </View>

        <View style={s.accesosFila}>
          {!!cliente.telefono && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`tel:${cliente.telefono}`)}>
              <MaterialCommunityIcons name="phone" size={22} color={COLORES.acento} />
              <Text style={s.accesoTexto}>Llamar</Text>
            </TouchableOpacity>
          )}
          {!!whatsapp && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}>
              <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
              <Text style={s.accesoTexto}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {!!cliente.email && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`mailto:${cliente.email}`)}>
              <MaterialCommunityIcons name="email" size={22} color={COLORES.acento} />
              <Text style={s.accesoTexto}>Correo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.seccion}>
          {!!cliente.telefono && <Text style={s.textoInfo}>📞 {cliente.telefono}</Text>}
          {!!cliente.email && <Text style={s.textoInfo}>✉️ {cliente.email}</Text>}
          {!!cliente.propiedad_titulo && <Text style={s.textoInfo}>🏠 {cliente.propiedad_titulo}</Text>}
          {!!cliente.vendedor_nombre && <Text style={s.textoInfo}>🧑‍💼 {cliente.vendedor_nombre}</Text>}
        </View>

        {!!cliente.notas && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Notas</Text>
            <Text style={s.notas}>{cliente.notas}</Text>
          </View>
        )}

        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Citas ({citasOrdenadas.length})</Text>
          {citasOrdenadas.length === 0
            ? <Text style={s.vacio}>Todavía no hay citas con este cliente.</Text>
            : citasOrdenadas.map(c => {
                const est = estadoCita(c.estado);
                return (
                  <TouchableOpacity key={c.id} style={s.citaFila} onPress={() => navigation.navigate('CitaForm', { cita: c })}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.citaFecha}>{fmtFechaHora(c.fecha_hora)}</Text>
                      {!!c.propiedad_titulo && <Text style={s.citaDetalle}>🏠 {c.propiedad_titulo}</Text>}
                    </View>
                    <View style={[s.estadoChip, { backgroundColor: est.color }]}>
                      <Text style={s.estadoChipText}>{est.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
          }
        </View>

        <TouchableOpacity style={s.btnSecundario} onPress={() => navigation.navigate('ClienteForm', { cliente })}>
          <Text style={s.btnSecundarioText}>Editar información</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.fondo },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nombre: { fontFamily: FUENTE_TITULO, fontSize: 22, color: COLORES.tinta },
  etapaChip: { backgroundColor: COLORES.chipFondo, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  etapaChipText: { fontSize: 11, fontFamily: FUENTE_CUERPO_700, color: COLORES.muted },
  accesosFila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  accesoBoton: { flex: 1, backgroundColor: COLORES.superficie, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORES.borde },
  accesoTexto: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.tinta },
  seccion: { marginTop: 20 },
  seccionTitulo: { fontFamily: FUENTE_TITULO, fontSize: 16, color: COLORES.tinta, marginBottom: 8 },
  textoInfo: { fontSize: 13, color: COLORES.muted, marginBottom: 6 },
  notas: { fontSize: 14, color: COLORES.tinta, lineHeight: 20 },
  vacio: { color: COLORES.muted, fontSize: 13 },
  citaFila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORES.superficie, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORES.borde },
  citaFecha: { fontSize: 14, fontFamily: FUENTE_CUERPO_700, color: COLORES.tinta },
  citaDetalle: { fontSize: 12, color: COLORES.muted, marginTop: 2 },
  estadoChip: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  estadoChipText: { color: '#fff', fontSize: 11, fontFamily: FUENTE_CUERPO_700 },
  btnSecundario: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 24 },
  btnSecundarioText: { color: '#fff', fontFamily: FUENTE_CUERPO_600, fontSize: 14 },
});
