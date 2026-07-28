import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { etapaLabel } from '../utils/crm';

function numeroWhatsapp(telefono) {
  const digitos = (telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.length <= 8 ? `506${digitos}` : digitos;
}

export default function ClienteDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/clientes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando el cliente');
      setCliente(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, [id]));

  if (loading || !cliente) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const whatsapp = numeroWhatsapp(cliente.telefono);

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
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 24 },
  btnSecundarioText: { color: '#1a1a1a', fontWeight: '600' },
});
