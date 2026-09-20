import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

export default function UsuariosScreen({ navigation }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      // se queda vacía si falla
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  async function toggleActivo(u) {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API}/usuarios/${u.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activo: !u.activo }),
    });
    const data = await res.json();
    if (!res.ok) { Alert.alert('Error', data.error || 'Error actualizando el usuario'); return; }
    cargar();
  }

  function confirmarBorrar(id) {
    Alert.alert('Borrar usuario', '¿Seguro que quieres borrar este usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => borrar(id) },
    ]);
  }

  async function borrar(id) {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API}/usuarios/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) { Alert.alert('Error', data.error || 'Error borrando el usuario'); return; }
    cargar();
  }

  if (loading) return <ActivityIndicator size="large" color={COLORES.acento} style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitulo}>Usuarios</Text>
        <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('UsuarioForm')}>
          <Text style={s.btnNuevaText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={usuarios}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay usuarios.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('UsuarioForm', { usuario: item })}>
            <View style={{ flex: 1 }}>
              <Text style={s.nombre}>{item.nombre}</Text>
              {!!item.email && <Text style={s.detalle}>{item.email}</Text>}
            </View>
            <View style={[s.estadoChip, item.activo ? s.estadoActivo : s.estadoInactivo]}>
              <Text style={[s.estadoChipText, item.activo ? s.estadoActivoText : s.estadoInactivoText]}>
                {item.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => toggleActivo(item)} style={{ padding: 4 }}>
              <Text style={s.btnAccionText}>{item.activo ? 'Desactivar' : 'Activar'}</Text>
            </TouchableOpacity>
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
  card: { flexDirection: 'row', backgroundColor: COLORES.superficie, borderRadius: 16, padding: 14, marginBottom: 12, gap: 10, alignItems: 'center', flexWrap: 'wrap', borderWidth: 1, borderColor: COLORES.borde },
  nombre: { fontFamily: FUENTE_TITULO, fontSize: 15, color: COLORES.tinta },
  detalle: { fontSize: 12, color: COLORES.muted, marginTop: 2 },
  estadoChip: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  estadoChipText: { fontSize: 11, fontFamily: FUENTE_CUERPO_700 },
  estadoActivo: { backgroundColor: COLORES.exitoFondo },
  estadoActivoText: { color: COLORES.exito },
  estadoInactivo: { backgroundColor: COLORES.chipFondo },
  estadoInactivoText: { color: COLORES.muted },
  btnAccionText: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.acento },
  btnBorrarText: { fontSize: 12, fontFamily: FUENTE_CUERPO_600, color: COLORES.peligro },
});
