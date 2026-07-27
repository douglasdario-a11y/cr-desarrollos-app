import React, { useCallback, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';

function fmtPrecio(n) {
  if (n == null) return 'Precio a consultar';
  return `₡${Math.round(Number(n)).toLocaleString('es-CR')}`;
}

export default function PropiedadesScreen({ navigation, onLogout }) {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modoBorrar, setModoBorrar] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [borrando, setBorrando] = useState(false);

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

  function toggleModoBorrar() {
    setModoBorrar(v => !v);
    setSeleccionadas([]);
  }

  function toggleSeleccion(id) {
    setSeleccionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function confirmarBorrarSeleccionadas() {
    const plural = seleccionadas.length > 1;
    Alert.alert(
      'Borrar propiedades',
      `¿Borrar ${seleccionadas.length} propiedad${plural ? 'es' : ''} y todas sus fotos, videos y documentos? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: borrarSeleccionadas },
      ]
    );
  }

  async function borrarSeleccionadas() {
    setBorrando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      for (const id of seleccionadas) {
        await fetch(`${API}/propiedades/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      }
      setSeleccionadas([]);
      setModoBorrar(false);
      await cargar();
    } catch (e) {
      Alert.alert('Error', 'No se pudieron borrar las propiedades');
    } finally {
      setBorrando(false);
    }
  }

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitulo}>Propiedades</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {modoBorrar ? (
            <>
              <TouchableOpacity onPress={toggleModoBorrar} disabled={borrando}>
                <Text style={s.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnBorrarConfirmar, (borrando || seleccionadas.length === 0) && s.btnDeshabilitado]}
                onPress={confirmarBorrarSeleccionadas} disabled={borrando || seleccionadas.length === 0}>
                <Text style={s.btnBorrarConfirmarText}>{borrando ? 'Borrando...' : `Borrar (${seleccionadas.length})`}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => Alert.alert('Cuenta', '¿Qué quieres hacer?', [
                { text: 'Cambiar PIN', onPress: () => navigation.navigate('CambiarPin') },
                { text: 'Cerrar sesión', style: 'destructive', onPress: onLogout },
                { text: 'Cancelar', style: 'cancel' },
              ])}>
                <MaterialCommunityIcons name="cog" size={24} color="#3d1f0a" />
              </TouchableOpacity>
              {propiedades.length > 0 && (
                <TouchableOpacity onPress={toggleModoBorrar}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color="#b3261e" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('PropiedadForm')}>
                <Text style={s.btnNuevaText}>+ Nueva</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      <FlatList
        data={propiedades}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>Aún no hay propiedades. Toca "+ Nueva" para agregar la primera.</Text>}
        renderItem={({ item }) => {
          const seleccionada = seleccionadas.includes(item.id);
          return (
            <TouchableOpacity
              style={[s.card, modoBorrar && seleccionada && s.cardSeleccionada]}
              onPress={() => modoBorrar ? toggleSeleccion(item.id) : navigation.navigate('PropiedadDetalle', { id: item.id })}
            >
              {item.portada_url
                ? <Image source={{ uri: item.portada_url }} style={s.foto} />
                : <View style={s.fotoVacia}><Text style={{ fontSize: 24 }}>🏠</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={s.titulo}>{item.titulo}</Text>
                <Text style={s.detalle}>{item.ubicacion}</Text>
                <Text style={s.precio}>{fmtPrecio(item.precio)}</Text>
              </View>
              {modoBorrar && (
                <View style={[s.checkCirculo, seleccionada && s.checkCirculoActivo]}>
                  {seleccionada && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
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
  btnCancelarText: { color: '#1a1a1a', fontWeight: '600', fontSize: 13 },
  btnBorrarConfirmar: { backgroundColor: '#b3261e', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnBorrarConfirmarText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnDeshabilitado: { opacity: 0.4 },
  vacio: { textAlign: 'center', color: '#9a8674', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center' },
  cardSeleccionada: { borderWidth: 2, borderColor: '#b3261e' },
  checkCirculo: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#b3261e', alignItems: 'center', justifyContent: 'center' },
  checkCirculoActivo: { backgroundColor: '#b3261e' },
  foto: { width: 64, height: 64, borderRadius: 10 },
  fotoVacia: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  detalle: { fontSize: 12, color: '#7a5c3a', marginTop: 2 },
  precio: { fontSize: 13, fontWeight: '600', color: '#3d1f0a', marginTop: 4 },
});
