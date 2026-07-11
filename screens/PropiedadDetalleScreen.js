import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { API } from '../utils/api';
import { subirArchivo } from '../utils/upload';

function fmtPrecio(n) {
  if (n == null) return 'Precio a consultar';
  return `$${Number(n).toLocaleString('en-US')}`;
}

export default function PropiedadDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const [propiedad, setPropiedad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando la propiedad');
      setPropiedad(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, [id]));

  async function agregarFoto() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert('Falta permiso', 'Necesito acceso a tus fotos'); return; }
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (resultado.canceled) return;
    await subir(resultado.assets[0], 'foto');
  }

  async function agregarVideo() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert('Falta permiso', 'Necesito acceso a tus videos'); return; }
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
    if (resultado.canceled) return;
    await subir(resultado.assets[0], 'video');
  }

  async function agregarDocumento() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (resultado.canceled) return;
    const archivo = resultado.assets[0];
    await subir({ uri: archivo.uri, mimeType: archivo.mimeType }, 'documento');
  }

  async function subir(archivo, tipo) {
    setSubiendo(true);
    try {
      const contentType = archivo.mimeType || (tipo === 'foto' ? 'image/jpeg' : tipo === 'video' ? 'video/mp4' : 'application/octet-stream');
      await subirArchivo({ propiedadId: id, uri: archivo.uri, tipo, contentType });
      await cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarMedia(mediaId) {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades/${id}/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error borrando el archivo');
      await cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  function confirmarBorrarPropiedad() {
    Alert.alert('Borrar propiedad', '¿Seguro que quieres borrar esta propiedad y todo su material?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: borrarPropiedad },
    ]);
  }

  async function borrarPropiedad() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error borrando la propiedad');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  if (loading || !propiedad) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const c = propiedad.caracteristicas || {};
  const fotos = propiedad.media.filter(m => m.tipo === 'foto');
  const videos = propiedad.media.filter(m => m.tipo === 'video');
  const documentos = propiedad.media.filter(m => m.tipo === 'documento');

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.titulo}>{propiedad.titulo}</Text>
      <Text style={s.precio}>{fmtPrecio(propiedad.precio)}</Text>
      <Text style={s.ubicacion}>{propiedad.ubicacion}</Text>
      {!!propiedad.descripcion && <Text style={s.descripcion}>{propiedad.descripcion}</Text>}

      <View style={s.caracteristicas}>
        {c.tipo && <Text style={s.chip}>{c.tipo}</Text>}
        {c.habitaciones != null && <Text style={s.chip}>{c.habitaciones} hab.</Text>}
        {c.banos != null && <Text style={s.chip}>{c.banos} baños</Text>}
        {c.area_m2 != null && <Text style={s.chip}>{c.area_m2} m²</Text>}
      </View>

      <TouchableOpacity style={s.btnSecundario} onPress={() => navigation.navigate('PropiedadForm', { propiedad })}>
        <Text style={s.btnSecundarioText}>Editar información</Text>
      </TouchableOpacity>

      <SeccionMedia titulo={`Fotos (${fotos.length})`} items={fotos} onAgregar={agregarFoto} onBorrar={borrarMedia} subiendo={subiendo} tipo="foto" />
      <SeccionMedia titulo={`Videos (${videos.length})`} items={videos} onAgregar={agregarVideo} onBorrar={borrarMedia} subiendo={subiendo} tipo="video" />
      <SeccionMedia titulo={`Documentos (${documentos.length})`} items={documentos} onAgregar={agregarDocumento} onBorrar={borrarMedia} subiendo={subiendo} tipo="documento" />

      <TouchableOpacity style={s.btnPeligro} onPress={confirmarBorrarPropiedad}>
        <Text style={s.btnPeligroText}>Borrar propiedad</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SeccionMedia({ titulo, items, onAgregar, onBorrar, subiendo, tipo }) {
  return (
    <View style={s.seccion}>
      <View style={s.seccionHeader}>
        <Text style={s.seccionTitulo}>{titulo}</Text>
        <TouchableOpacity onPress={onAgregar} disabled={subiendo}>
          <Text style={s.agregar}>{subiendo ? 'Subiendo…' : '+ Agregar'}</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0
        ? <Text style={s.vacio}>Sin {tipo === 'foto' ? 'fotos' : tipo === 'video' ? 'videos' : 'documentos'} todavía</Text>
        : <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.mediaItem} onLongPress={() => onBorrar(item.id)}>
                {tipo === 'foto'
                  ? <Image source={{ uri: item.url }} style={s.mediaImg} />
                  : <View style={s.mediaPlaceholder}><Text style={s.mediaPlaceholderText}>{tipo === 'video' ? '🎬' : '📄'}</Text></View>
                }
              </TouchableOpacity>
            )}
          />
      }
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  titulo: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  precio: { fontSize: 18, fontWeight: '600', color: '#3d1f0a', marginTop: 4 },
  ubicacion: { fontSize: 14, color: '#7a5c3a', marginTop: 2 },
  descripcion: { fontSize: 14, color: '#333', marginTop: 12, lineHeight: 20 },
  caracteristicas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { backgroundColor: '#e8ddd5', color: '#3d1f0a', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, fontSize: 12, fontWeight: '600' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16 },
  btnSecundarioText: { color: '#1a1a1a', fontWeight: '600' },
  seccion: { marginTop: 24 },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seccionTitulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  agregar: { color: '#3d1f0a', fontWeight: '600', fontSize: 13 },
  vacio: { color: '#9a8674', fontSize: 13 },
  mediaItem: { marginRight: 10 },
  mediaImg: { width: 100, height: 100, borderRadius: 10 },
  mediaPlaceholder: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center' },
  mediaPlaceholderText: { fontSize: 28 },
  btnPeligro: { marginTop: 32, marginBottom: 40, alignItems: 'center', padding: 12 },
  btnPeligroText: { color: '#b3261e', fontWeight: '600' },
});
