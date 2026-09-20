import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { etapaLabel, estadoCita, fmtFechaHora } from '../utils/crm';

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

  return (
    <View style={s.container}>
      <View style={{ padding: 16 }}>
        <View style={s.tituloFila}>
          <Text style={[s.nombre, { flex: 1 }]}>{cliente.nombre_cliente}</Text>
          <View style={s.etapaChip}><Text style={s.etapaChipText}>{etapaLabel(cliente.etapa)}</Text></View>
        </View>

        <View style={s.accesosFila}>
          {!!cliente.telefono && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`tel:${cliente.telefono}`)}>
              <MaterialCommunityIcons name="phone" size={22} color="#3d1f0a" />
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
              <MaterialCommunityIcons name="email" size={22} color="#3d1f0a" />
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
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nombre: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  etapaChip: { backgroundColor: '#e8ddd5', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  etapaChipText: { fontSize: 11, fontWeight: '700', color: '#3d1f0a' },
  accesosFila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  accesoBoton: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4 },
  accesoTexto: { fontSize: 12, fontWeight: '600', color: '#3d1f0a' },
  seccion: { marginTop: 20 },
  seccionTitulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  textoInfo: { fontSize: 13, color: '#7a5c3a', marginBottom: 6 },
  notas: { fontSize: 14, color: '#333', lineHeight: 20 },
  vacio: { color: '#9a8674', fontSize: 13 },
  citaFila: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  citaFecha: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  citaDetalle: { fontSize: 12, color: '#7a5c3a', marginTop: 2 },
  estadoChip: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  estadoChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 24 },
  btnSecundarioText: { color: '#1a1a1a', fontWeight: '600' },
});
