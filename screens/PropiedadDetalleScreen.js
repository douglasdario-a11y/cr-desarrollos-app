import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList, Dimensions, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import MapView, { Marker } from 'react-native-maps';
import { API } from '../utils/api';
import { subirArchivo } from '../utils/upload';
import { compartirTexto, compartirArchivo, compartirArchivos } from '../utils/compartir';
import { AMENIDADES, COCINA_OPCIONES, fmtColones, fmtM2 } from '../utils/caracteristicas';

const ANCHO_PANTALLA = Dimensions.get('window').width;

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

  async function elegirYSubir(tipo) {
    let archivos;
    if (tipo === 'video') {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) { Alert.alert('Falta permiso', 'Necesito acceso a tus videos'); return; }
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.8 });
      if (resultado.canceled) return;
      archivos = [{ uri: resultado.assets[0].uri, mimeType: resultado.assets[0].mimeType || 'video/mp4' }];
    } else if (tipo === 'foto') {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) { Alert.alert('Falta permiso', 'Necesito acceso a tus fotos'); return; }
      // Fotos sí permite elegir varias de una vez — plano/certificación se
      // quedan en selección única porque son un solo archivo por propiedad.
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true });
      if (resultado.canceled) return;
      archivos = resultado.assets.map(a => ({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg' }));
    } else if (tipo === 'plano_catastro' || tipo === 'certificacion_registro') {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) { Alert.alert('Falta permiso', 'Necesito acceso a tus fotos'); return; }
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (resultado.canceled) return;
      archivos = [{ uri: resultado.assets[0].uri, mimeType: resultado.assets[0].mimeType || 'image/jpeg' }];
    } else {
      const resultado = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
      if (resultado.canceled) return;
      archivos = resultado.assets.map(a => ({ uri: a.uri, mimeType: a.mimeType }));
    }
    await subir(archivos, tipo);
  }

  async function subir(archivos, tipo) {
    setSubiendo(true);
    try {
      let yaHayFoto = tipo === 'foto' && (propiedad.media || []).some(m => m.tipo === 'foto');
      for (const archivo of archivos) {
        const contentType = archivo.mimeType || (tipo === 'video' ? 'video/mp4' : 'image/jpeg');
        const esPrincipal = tipo === 'foto' && !yaHayFoto;
        await subirArchivo({ propiedadId: id, uri: archivo.uri, tipo, contentType, esPrincipal });
        yaHayFoto = true;
      }
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

  async function marcarPrincipal(mediaId) {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propiedades/${id}/media/${mediaId}/principal`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error marcando como principal');
      await cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  function opcionesFoto(item) {
    const opciones = [
      { text: 'Compartir', onPress: () => compartirArchivo(item.url).catch(e => Alert.alert('Error', e.message)) },
      ...(item.es_principal ? [] : [{ text: 'Marcar como principal', onPress: () => marcarPrincipal(item.id) }]),
      { text: 'Borrar', style: 'destructive', onPress: () => borrarMedia(item.id) },
      { text: 'Cancelar', style: 'cancel' },
    ];
    Alert.alert('Foto', '¿Qué quieres hacer?', opciones);
  }

  function resumenTexto() {
    const c = propiedad.caracteristicas || {};
    const partes = [
      propiedad.titulo,
      propiedad.tipo_propiedad,
      propiedad.precio != null ? `Precio: ${fmtColones(propiedad.precio)}` : null,
      c.habitaciones != null ? `${c.habitaciones} habitaciones` : null,
      c.banos != null ? `${c.banos} baños` : null,
      propiedad.descripcion,
      propiedad.ubicacion ? `Ubicación: ${propiedad.ubicacion}` : null,
      propiedad.maps_link,
    ].filter(Boolean);
    return partes.join('\n');
  }

  async function compartirTodasLasFotos() {
    const fotos = (propiedad.media || []).filter(m => m.tipo === 'foto');
    if (fotos.length === 0) { Alert.alert('Sin fotos', 'Todavía no hay fotos para compartir'); return; }
    try {
      await compartirArchivos(fotos.map(f => f.url));
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
  const media = propiedad.media || [];
  const fotos = media.filter(m => m.tipo === 'foto');
  const principales = fotos.filter(m => m.es_principal);
  const otrasFotos = fotos.filter(m => !m.es_principal);
  const fotosPortada = principales.length ? principales : fotos.slice(0, 1);
  const video = media.find(m => m.tipo === 'video');
  const documentos = media.filter(m => m.tipo === 'documento');
  const planoCatastro = media.find(m => m.tipo === 'plano_catastro');
  const certificacionRegistro = media.find(m => m.tipo === 'certificacion_registro');
  const amenidadesActivas = AMENIDADES.filter(a => c[a.key]);
  const cocinaLabel = COCINA_OPCIONES.find(op => op.value === c.cocina)?.label;

  const datos = [
    { icon: 'cash', label: 'Precio de venta', valor: fmtColones(propiedad.precio) },
    { icon: 'receipt', label: 'Valor fiscal', valor: fmtColones(propiedad.valor_fiscal) },
    { icon: 'bed', label: 'Habitaciones', valor: c.habitaciones },
    { icon: 'shower', label: 'Baños', valor: c.banos },
    { icon: 'car', label: 'Vehículos', valor: c.vehiculos },
    { icon: 'terrain', label: 'Área terreno', valor: fmtM2(c.area_terreno) },
    { icon: 'ruler-square', label: 'Área construcción', valor: fmtM2(c.area_construccion) },
  ].filter(d => d.valor != null && d.valor !== '');

  return (
    <ScrollView style={s.container}>
      {/* Fotos principales */}
      {fotosPortada.length > 0 && (
        <FlatList
          horizontal
          pagingEnabled
          data={fotosPortada}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => opcionesFoto(item)}>
              <Image source={{ uri: item.url }} style={s.fotoPortada} />
            </TouchableOpacity>
          )}
        />
      )}

      <View style={{ padding: 16 }}>
        {!!propiedad.tipo_propiedad && (
          <View style={s.tipoChip}>
            <MaterialCommunityIcons name="home-variant" size={14} color="#fff" />
            <Text style={s.tipoChipText}>{propiedad.tipo_propiedad}</Text>
          </View>
        )}
        <View style={s.tituloFila}>
          <Text style={[s.titulo, { flex: 1 }]}>{propiedad.titulo}</Text>
          <TouchableOpacity style={s.btnCompartirChico} onPress={() => compartirTexto(resumenTexto())}>
            <MaterialCommunityIcons name="share-variant" size={20} color="#3d1f0a" />
          </TouchableOpacity>
        </View>
        <View style={s.ubicacionFila}>
          <MaterialCommunityIcons name="map-marker" size={16} color="#7a5c3a" />
          <Text style={s.ubicacion}>{propiedad.ubicacion}</Text>
        </View>
        {!!propiedad.descripcion && (
          <View style={s.descripcionFila}>
            <Text style={[s.descripcion, { flex: 1 }]}>{propiedad.descripcion}</Text>
            <TouchableOpacity onPress={() => compartirTexto(propiedad.descripcion)}>
              <MaterialCommunityIcons name="share-variant" size={16} color="#7a5c3a" />
            </TouchableOpacity>
          </View>
        )}

        {/* Video */}
        <View style={s.seccion}>
          <View style={s.seccionHeader}>
            <Text style={s.seccionTitulo}>Video</Text>
            {!video && (
              <TouchableOpacity onPress={() => elegirYSubir('video')} disabled={subiendo}>
                <Text style={s.agregar}>{subiendo ? 'Subiendo…' : '+ Agregar'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {video
            ? <>
                <ReproductorVideo uri={video.url} />
                <TouchableOpacity onPress={() => Alert.alert('Video', '¿Borrar este video?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => borrarMedia(video.id) }])}>
                  <Text style={s.borrarVideo}>Borrar video</Text>
                </TouchableOpacity>
              </>
            : <Text style={s.vacio}>Todavía no hay video</Text>
          }
        </View>

        {/* Grid de datos con iconos */}
        {datos.length > 0 && (
          <View style={s.gridDatos}>
            {datos.map((d, i) => (
              <View key={i} style={s.datoCard}>
                <MaterialCommunityIcons name={d.icon} size={22} color="#3d1f0a" />
                <Text style={s.datoValor}>{d.valor}</Text>
                <Text style={s.datoLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Amenidades marcadas */}
        {(amenidadesActivas.length > 0 || cocinaLabel) && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Amenidades</Text>
            <View style={s.chips}>
              {cocinaLabel && (
                <View style={s.amenidadChip}>
                  <MaterialCommunityIcons name="stove" size={16} color="#3d1f0a" />
                  <Text style={s.amenidadChipText}>Cocina {cocinaLabel.toLowerCase()}</Text>
                </View>
              )}
              {amenidadesActivas.map(a => (
                <View key={a.key} style={s.amenidadChip}>
                  <MaterialCommunityIcons name={a.icon} size={16} color="#3d1f0a" />
                  <Text style={s.amenidadChipText}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mapa */}
        {(propiedad.lat != null || propiedad.maps_link) && (
          <View style={s.seccion}>
            <View style={s.seccionHeader}>
              <Text style={s.seccionTitulo}>Ubicación en el mapa</Text>
              {!!propiedad.maps_link && (
                <TouchableOpacity onPress={() => compartirTexto(propiedad.maps_link)}>
                  <MaterialCommunityIcons name="share-variant" size={16} color="#7a5c3a" />
                </TouchableOpacity>
              )}
            </View>
            {propiedad.lat != null && propiedad.lng != null && (
              <MapView
                style={s.mapa}
                initialRegion={{ latitude: propiedad.lat, longitude: propiedad.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              >
                <Marker coordinate={{ latitude: propiedad.lat, longitude: propiedad.lng }} title={propiedad.titulo} />
              </MapView>
            )}
            {!!propiedad.maps_link && (
              <TouchableOpacity style={s.btnMaps} onPress={() => Linking.openURL(propiedad.maps_link)}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color="#fff" />
                <Text style={s.btnMapsText}>Abrir en Google Maps</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={s.btnSecundario} onPress={() => navigation.navigate('PropiedadForm', { propiedad })}>
          <Text style={s.btnSecundarioText}>Editar información</Text>
        </TouchableOpacity>

        <SeccionMedia titulo={`Fotos (${fotos.length})`} items={fotos} onAgregar={() => elegirYSubir('foto')} onItemPress={opcionesFoto} subiendo={subiendo} tipoVisual="imagen"
          extraAction={fotos.length > 0 ? { label: 'Compartir todas', onPress: compartirTodasLasFotos } : null} />
        <SeccionMedia titulo="Plano de catastro" items={planoCatastro ? [planoCatastro] : []} onAgregar={() => elegirYSubir('plano_catastro')} onItemPress={item => Alert.alert('Plano de catastro', '¿Borrar este archivo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => borrarMedia(item.id) }])} subiendo={subiendo} tipoVisual="imagen" single />
        <SeccionMedia titulo="Certificación de registro" items={certificacionRegistro ? [certificacionRegistro] : []} onAgregar={() => elegirYSubir('certificacion_registro')} onItemPress={item => Alert.alert('Certificación de registro', '¿Borrar este archivo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => borrarMedia(item.id) }])} subiendo={subiendo} tipoVisual="imagen" single />
        <SeccionMedia titulo={`Otros documentos (${documentos.length})`} items={documentos} onAgregar={() => elegirYSubir('documento')} onItemPress={item => Alert.alert('Documento', '¿Borrar este archivo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => borrarMedia(item.id) }])} subiendo={subiendo} tipoVisual="documento" />

        <TouchableOpacity style={s.btnPeligro} onPress={confirmarBorrarPropiedad}>
          <Text style={s.btnPeligroText}>Borrar propiedad</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ReproductorVideo({ uri }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  return <VideoView style={s.video} player={player} allowsFullscreen nativeControls />;
}

function SeccionMedia({ titulo, items, onAgregar, onItemPress, subiendo, tipoVisual, single, extraAction }) {
  if (single && items.length > 0) {
    // Ya hay un archivo único (plano/certificación) — se muestra grande, sin botón de agregar otro.
    return (
      <View style={s.seccion}>
        <Text style={s.seccionTitulo}>{titulo}</Text>
        <TouchableOpacity onPress={() => onItemPress(items[0])}>
          <Image source={{ uri: items[0].url }} style={s.imagenGrande} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.seccion}>
      <View style={s.seccionHeader}>
        <Text style={s.seccionTitulo}>{titulo}</Text>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          {extraAction && (
            <TouchableOpacity onPress={extraAction.onPress}>
              <Text style={s.agregar}>{extraAction.label}</Text>
            </TouchableOpacity>
          )}
          {!(single && items.length > 0) && (
            <TouchableOpacity onPress={onAgregar} disabled={subiendo}>
              <Text style={s.agregar}>{subiendo ? 'Subiendo…' : '+ Agregar'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {items.length === 0
        ? <Text style={s.vacio}>Todavía no hay nada aquí</Text>
        : <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.mediaItem} onPress={() => onItemPress(item)}>
                {tipoVisual === 'imagen'
                  ? <Image source={{ uri: item.url }} style={s.mediaImg} />
                  : <View style={s.mediaPlaceholder}>
                      <MaterialCommunityIcons name="file-document" size={28} color="#3d1f0a" />
                    </View>
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
  fotoPortada: { width: ANCHO_PANTALLA, height: 260 },
  tipoChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#3d1f0a', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 8 },
  tipoChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  titulo: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  tituloFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  btnCompartirChico: { padding: 4 },
  ubicacionFila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ubicacion: { fontSize: 14, color: '#7a5c3a' },
  descripcionFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  descripcion: { fontSize: 14, color: '#333', lineHeight: 20 },
  video: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#000' },
  borrarVideo: { color: '#b3261e', fontWeight: '600', fontSize: 13, textAlign: 'center', marginTop: 8 },
  gridDatos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  datoCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  datoValor: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  datoLabel: { fontSize: 11, color: '#7a5c3a', textAlign: 'center' },
  seccion: { marginTop: 20 },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seccionTitulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenidadChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e8ddd5', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  amenidadChipText: { fontSize: 12, fontWeight: '600', color: '#3d1f0a' },
  mapa: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  btnMaps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d1f0a', borderRadius: 10, padding: 12 },
  btnMapsText: { color: '#fff', fontWeight: '600' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 20 },
  btnSecundarioText: { color: '#1a1a1a', fontWeight: '600' },
  agregar: { color: '#3d1f0a', fontWeight: '600', fontSize: 13 },
  vacio: { color: '#9a8674', fontSize: 13 },
  mediaItem: { marginRight: 10 },
  mediaImg: { width: 100, height: 100, borderRadius: 10 },
  mediaPlaceholder: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center' },
  imagenGrande: { width: '100%', height: 200, borderRadius: 12 },
  btnPeligro: { marginTop: 32, marginBottom: 40, alignItems: 'center', padding: 12 },
  btnPeligroText: { color: '#b3261e', fontWeight: '600' },
});
