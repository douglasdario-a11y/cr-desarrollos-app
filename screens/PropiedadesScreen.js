import React, { useCallback, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';

function fmtPrecio(n) {
  if (n == null) return 'Precio a consultar';
  return `₡${Math.round(Number(n)).toLocaleString('es-CR')}`;
}

export default function PropiedadesScreen({ navigation }) {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPropiedades(Array.isArray(data) ? data : []);
    } catch (e) {
      // Backend puede no estar disponible todavía; la lista queda vacía.
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitulo}>Propiedades</Text>
        <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('PropiedadForm')}>
          <Text style={s.btnNuevaText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={propiedades}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay propiedades. Toca "+ Nueva" para agregar la primera.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('PropiedadDetalle', { id: item.id })}>
            {item.portada_url
              ? <Image source={{ uri: item.portada_url }} style={s.foto} />
              : <View style={s.fotoVacia}><Text style={{ fontSize: 24 }}>🏠</Text></View>
            }
            <View style={{ flex: 1 }}>
              <Text style={s.titulo}>{item.titulo}</Text>
              <Text style={s.detalle}>{item.ubicacion}</Text>
              <Text style={s.precio}>{fmtPrecio(item.precio)}</Text>
            </View>
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
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center' },
  foto: { width: 64, height: 64, borderRadius: 10 },
  fotoVacia: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  detalle: { fontSize: 12, color: '#7a5c3a', marginTop: 2 },
  precio: { fontSize: 13, fontWeight: '600', color: '#3d1f0a', marginTop: 4 },
});
