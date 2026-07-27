import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';

export default function PropietariosScreen({ navigation }) {
  const [propietarios, setPropietarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propietarios`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPropietarios(Array.isArray(data) ? data : []);
    } catch (e) {
      // se queda vacía si falla
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  function confirmarBorrar(id) {
    Alert.alert('Borrar propietario', '¿Seguro que quieres borrar este propietario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => borrar(id) },
    ]);
  }

  async function borrar(id) {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${API}/propietarios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    cargar();
  }

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitulo}>Propietarios</Text>
        <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('PropietarioForm')}>
          <Text style={s.btnNuevaText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={propietarios}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay propietarios. Toca "+ Nuevo" para agregar el primero.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('PropietarioForm', { propietario: item })}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.nombre}</Text>
              <View style={s.detalleFila}>
                {!!item.telefono && <Text style={s.detalle}>📞 {item.telefono}</Text>}
                {(item.propiedades || []).map(pr => (
                  <View key={pr.id} style={s.propChip}><Text style={s.propChipText}>🏠 {pr.titulo}</Text></View>
                ))}
              </View>
            </View>
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
  detalleFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' },
  detalle: { fontSize: 12, color: '#7a5c3a' },
  propChip: { backgroundColor: '#e8ddd5', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  propChipText: { fontSize: 11, fontWeight: '600', color: '#3d1f0a' },
  btnBorrarText: { fontSize: 12, fontWeight: '600', color: '#b3261e' },
});
