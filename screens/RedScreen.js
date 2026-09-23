import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API } from '../utils/api';
import { fmtColones } from '../utils/caracteristicas';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

export default function RedScreen() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/red/propiedades`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPropiedades(Array.isArray(data) ? data : []);
    } catch (e) {
      // se queda vacía si falla
    } finally {
      setLoading(false);
      setRefrescando(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, []));

  if (loading) return <ActivityIndicator size="large" color={COLORES.acento} style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <Text style={s.subtitulo}>Propiedades que otras inmobiliarias compartieron con la red. Contactalas directamente para coordinar.</Text>
      <FlatList
        data={propiedades}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>Todavía no hay propiedades compartidas por otras inmobiliarias.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.chipsFila}>
              {item.tipo_propiedad && <View style={s.chip}><Text style={s.chipText}>{item.tipo_propiedad}</Text></View>}
              {item.en_venta && <View style={s.chip}><Text style={s.chipText}>En venta</Text></View>}
              {item.en_alquiler && <View style={s.chip}><Text style={s.chipText}>En alquiler</Text></View>}
            </View>
            <Text style={s.titulo}>{item.titulo}</Text>
            <Text style={s.ubicacion}>{item.ubicacion}</Text>
            {item.en_venta && <Text style={s.precio}>{fmtColones(item.precio) || 'Precio de venta a consultar'}</Text>}
            {item.en_alquiler && <Text style={s.precio}>{fmtColones(item.precio_alquiler) || 'Precio de alquiler a consultar'} / mes</Text>}
            <View style={s.empresaFila}>
              <Text style={s.empresaNombre}>{item.empresa_nombre}</Text>
              {!!item.empresa_telefono && <Text style={s.empresaContacto}>📞 {item.empresa_telefono}</Text>}
              {!!item.empresa_email && <Text style={s.empresaContacto}>✉️ {item.empresa_email}</Text>}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.fondo },
  subtitulo: { fontSize: 12, color: COLORES.muted, paddingHorizontal: 16, paddingTop: 12 },
  vacio: { textAlign: 'center', color: COLORES.muted, marginTop: 40 },
  card: { backgroundColor: COLORES.superficie, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORES.borde },
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  chip: { backgroundColor: COLORES.acento, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  chipText: { fontSize: 11, fontFamily: FUENTE_CUERPO_700, color: '#fff' },
  titulo: { fontFamily: FUENTE_TITULO, fontSize: 15, color: COLORES.tinta },
  ubicacion: { fontSize: 12, color: COLORES.muted, marginTop: 2 },
  precio: { fontSize: 16, fontFamily: FUENTE_CUERPO_700, color: COLORES.acento, marginTop: 8 },
  empresaFila: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORES.borde },
  empresaNombre: { fontSize: 13, fontFamily: FUENTE_CUERPO_600, color: COLORES.tinta },
  empresaContacto: { fontSize: 12, color: COLORES.muted, marginTop: 2 },
});
