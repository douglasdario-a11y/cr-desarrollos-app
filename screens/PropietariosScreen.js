import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

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
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('PropietarioDetalle', { id: item.id })}>
            <View style={{ flex: 1 }}>
              <View style={s.filaNombre}>
                <Text style={s.nombre}>{item.nombre}</Text>
                {item.tipo === 'juridica' && <View style={s.badgeTipo}><Text style={s.badgeTipoText}>Jurídica</Text></View>}
              </View>
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
  container: { flex: 1, backgroundColor: COLORES.fondo },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  headerTitulo: { fontFamily: FUENTE_TITULO, fontSize: 26, color: COLORES.tinta },
  btnNueva: { backgroundColor: COLORES.acento, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnNuevaText: { color: '#fff', fontFamily: FUENTE_CUERPO_600, fontSize: 13 },
  vacio: { textAlign: 'center', color: COLORES.muted, marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: COLORES.superficie, borderRadius: 16, padding: 14, marginBottom: 12, gap: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORES.borde },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { fontFamily: FUENTE_TITULO, fontSize: 15, color: COLORES.tinta },
  badgeTipo: { backgroundColor: COLORES.acento, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  badgeTipoText: { fontSize: 10, fontFamily: FUENTE_CUERPO_700, color: '#fff' },
  detalleFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' },
  detalle: { fontSize: 12, color: COLORES.muted },
  propChip: { backgroundColor: COLORES.chipFondo, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8 },
  propChipText: { fontSize: 11, fontFamily: FUENTE_CUERPO_600, color: COLORES.muted },
  btnBorrarText: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.peligro },
});
