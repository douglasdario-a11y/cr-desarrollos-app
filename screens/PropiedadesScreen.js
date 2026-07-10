import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';

export default function PropiedadesScreen() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPropiedades(Array.isArray(data) ? data : []);
    } catch (e) {
      // TODO: mostrar error una vez exista el endpoint /propiedades
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <FlatList
        data={propiedades}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay propiedades. Se agregarán aquí.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.titulo}>{item.titulo}</Text>
            <Text style={s.detalle}>{item.ubicacion}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb', padding: 16 },
  vacio: { textAlign: 'center', color: '#9a8674', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  titulo: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  detalle: { fontSize: 13, color: '#7a5c3a', marginTop: 4 },
});
