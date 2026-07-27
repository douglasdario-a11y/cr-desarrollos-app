import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { etapaLabel } from '../utils/crm';
import { borrarContactoVinculado } from '../utils/contactosSync';

export default function ClientesScreen({ navigation }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/clientes`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) {
      // se queda vacía si falla
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  function confirmarBorrar(id) {
    Alert.alert('Borrar cliente', '¿Seguro que quieres borrar este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => borrar(id) },
    ]);
  }

  async function borrar(id) {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API}/clientes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    borrarContactoVinculado(id);
    cargar();
  }

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitulo}>Clientes</Text>
        <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('ClienteForm')}>
          <Text style={s.btnNuevaText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={clientes}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay clientes. Toca "+ Nuevo" para agregar el primero.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('ClienteForm', { cliente: item })}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.nombre_cliente}</Text>
              <View style={s.detalleFila}>
                {!!item.telefono && <Text style={s.detalle}>📞 {item.telefono}</Text>}
                {!!item.propiedad_titulo && <Text style={s.detalle}>🏠 {item.propiedad_titulo}</Text>}
                {!!item.vendedor_nombre && <Text style={s.detalle}>🧑‍💼 {item.vendedor_nombre}</Text>}
              </View>
            </View>
            <View style={s.etapaChip}><Text style={s.etapaChipText}>{etapaLabel(item.etapa)}</Text></View>
            <TouchableOpacity onPress={() => confirmarBorrar(item.id)} style={{ padding: 4 }}>
              <Text style={s.btnBorrarText}>Borrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  headerTitulo: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  btnNueva: { backgroundColor: '#1a1a1a', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnNuevaText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  vacio: { textAlign: 'center', color: '#9a8674', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, gap: 10, alignItems: 'center' },
  nombre: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  detalleFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  detalle: { fontSize: 12, color: '#7a5c3a' },
  etapaChip: { backgroundColor: '#e8ddd5', borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10 },
  etapaChipText: { fontSize: 11, fontWeight: '700', color: '#3d1f0a' },
  btnBorrarText: { fontSize: 12, fontWeight: '600', color: '#b3261e' },
});
