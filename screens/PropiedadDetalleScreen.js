import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList, Dimensions, Linking, Modal } from 'react-native';
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
import { ESPACIOS, COCINA_OPCIONES, fmtColones, fmtM2, amenidadesEfectivas, espaciosPersonalizados, ICONO_ESPACIO_PERSONALIZADO } from '../utils/caracteristicas';

const ANCHO_PANTALLA = Dimensions.get('window').width;

export default function PropiedadDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const [propiedad, setPropiedad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoVisible, setFotoVisible] = useState(null);

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
    } else if (tipo === 'foto' || tipo === 'plano_catastro' || tipo === 'certificacion_registro') {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) { Alert.alert('Falta permiso', 'Necesito acceso a tus fotos'); return; }
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true });
      if (resultado.canceled) return;
      archivos = resultado.assets.map(a => ({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg' }));
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

  function confirmarBorrarFoto(item) {
    Alert.alert('Borrar archivo', '¿Seguro que quieres borrar este archivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => { setFotoVisible(null); borrarMedia(item.id); } },
    ]);
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

  if (loading || !propiedad) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const c = propiedad.caracteristicas || {};
  const media = propiedad.media || [];
  const fotos = media.filter(m => m.tipo === 'foto');
  const principales = fotos.filter(m => m.es_principal);
  const fotosPortada = principales.length ? principales : fotos.slice(0, 1);
  const video = media.find(m => m.tipo === 'video');
  const documentos = media.filter(m => m.tipo === 'documento');
  const planosCatastro = media.filter(m => m.tipo === 'plano_catastro');
  const certificacionesRegistro = media.filter(m => m.tipo === 'certificacion_registro');
  const amenidades = amenidadesEfectivas(c);
  const cocinaLabel = COCINA_OPCIONES.find(op => op.value === c.cocina)?.label;
  const espaciosActivos = ESPACIOS.filter(e => c[e.key]);
  const espaciosExtra = espaciosPersonalizados(c);

  const datos = [
    ...(propiedad.en_venta ? [{ icon: 'cash', label: 'Precio de venta', valor: fmtColones(propiedad.precio) }] : []),
    ...(propiedad.en_alquiler ? [{ icon: 'key-variant', label: 'Precio de alquiler', valor: fmtColones(propiedad.precio_alquiler) }] : []),
    { icon: 'receipt', label: 'Valor fiscal', valor: fmtColones(propiedad.valor_fiscal) },
    { icon: 'bed', label: 'Habitaciones', valor: c.habitaciones },
    { icon: 'shower', label: 'Baños', valor: c.banos },
    { icon: 'car', label: 'Vehículos', valor: c.vehiculos },
    ...(cocinaLabel ? [{ icon: 'stove', label: 'Cocina', valor: cocinaLabel }] : []),
  ].filter(d => d.valor != null && d.valor !== '');

  // Espacios (terraza, sala... y los escritos a mano) se unen a la misma
  // cuadrícula que precio/habitaciones/baños — misma jerarquía visual.
  const todosLosDatos = [
    ...datos,
    ...espaciosActivos.map(e => ({ icon: e.icon, label: '', valor: e.label })),
    ...espaciosExtra.map(e => ({ icon: ICONO_ESPACIO_PERSONALIZADO, label: '', valor: e })),
  ];

  const areasTexto = [
    fmtM2(c.area_terreno) ? `Área de terreno: ${fmtM2(c.area_terreno)}` : null,
    fmtM2(c.area_construccion) ? `Área de construcción: ${fmtM2(c.area_construccion)}` : null,
  ].filter(Boolean).join('  ·  ');

  return (
    <>
    <ScrollView style={s.container}>
      {/* Fotos principales */}
      {fotosPortada.length > 0 && (
        <FlatList
          horizontal
          pagingEnabled
          data={fotosPortada}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setFotoVisible(item)}>
              <Image source={{ uri: item.url }} style={s.fotoPortada} />
            </TouchableOpacity>
          )}
        />
      )}

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {!!propiedad.tipo_propiedad && (
            <View style={s.tipoChip}>
              <MaterialCommunityIcons name="home-variant" size={14} color="#fff" />
              <Text style={s.tipoChipText}>{propiedad.tipo_propiedad}</Text>
            </View>
          )}
          {!!propiedad.en_venta && (
            <View style={s.tipoChip}><Text style={s.tipoChipText}>En venta</Text></View>
          )}
          {!!propiedad.en_alquiler && (
            <View style={s.tipoChip}><Text style={s.tipoChipText}>En alquiler</Text></View>
          )}
        </View>
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
        {(propiedad.distrito || propiedad.canton || propiedad.provincia) && (
          <Text style={s.ubicacionAdmin}>
            {[propiedad.distrito, propiedad.canton, propiedad.provincia].filter(Boolean).join(', ')}
          </Text>
        )}
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

        {!!areasTexto && <Text style={s.areasTexto}>{areasTexto}</Text>}

        {/* Grid de datos con iconos (precio, habitaciones, baños... y espacios) */}
        {todosLosDatos.length > 0 && (
          <View style={s.gridDatos}>
            {todosLosDatos.map((d, i) => (
              <View key={i} style={s.datoCard}>
                <MaterialCommunityIcons name={d.icon} size={22} color="#3d1f0a" />
                <Text style={s.datoValor}>{d.valor}</Text>
                {!!d.label && <Text style={s.datoLabel}>{d.label}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Amenidades especiales (texto libre) */}
        {amenidades.length > 0 && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Amenidades</Text>
            <View style={s.chips}>
              {amenidades.map(a => (
                <View key={a} style={s.amenidadChip}>
                  <MaterialCommunityIcons name="star-four-points-outline" size={16} color="#3d1f0a" />
                  <Text style={s.amenidadChipText}>{a}</Text>
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
              <View style={s.mapaContenedor} collapsable={false}>
                <MapView
                  style={s.mapa}
                  renderToHardwareTextureAndroid
                  initialRegion={{ latitude: Number(propiedad.lat), longitude: Number(propiedad.lng), latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                >
                  <Marker coordinate={{ latitude: Number(propiedad.lat), longitude: Number(propiedad.lng) }} title={propiedad.titulo} />
                </MapView>
              </View>
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

        <SeccionMedia titulo={`Fotos (${fotos.length})`} items={fotos} onAgregar={() => elegirYSubir('foto')} onItemPress={item => setFotoVisible(item)} subiendo={subiendo} tipoVisual="imagen"
          extraAction={fotos.length > 0 ? { label: 'Compartir todas', onPress: compartirTodasLasFotos } : null} />
        <SeccionMedia titulo={`Plano de catastro (${planosCatastro.length})`} items={planosCatastro} onAgregar={() => elegirYSubir('plano_catastro')} onItemPress={item => setFotoVisible(item)} subiendo={subiendo} tipoVisual="imagen" />
        <SeccionMedia titulo={`Certificación de registro (${certificacionesRegistro.length})`} items={certificacionesRegistro} onAgregar={() => elegirYSubir('certificacion_registro')} onItemPress={item => setFotoVisible(item)} subiendo={subiendo} tipoVisual="imagen" />
        <SeccionMedia titulo={`Otros documentos (${documentos.length})`} items={documentos} onAgregar={() => elegirYSubir('documento')} onItemPress={item => Alert.alert('Documento', '¿Borrar este archivo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Borrar', style: 'destructive', onPress: () => borrarMedia(item.id) }])} subiendo={subiendo} tipoVisual="documento" />

        {(propiedad.numero_finca || propiedad.numero_catastro || propiedad.nis_agua || propiedad.nis_electricidad) && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Registro y servicios</Text>
            {!!propiedad.numero_finca && <Text style={s.textoInfo}>📜 Número de Finca: {propiedad.numero_finca}</Text>}
            {!!propiedad.numero_catastro && <Text style={s.textoInfo}>🗺️ Número de Catastro: {propiedad.numero_catastro}</Text>}
            {!!propiedad.nis_agua && <Text style={s.textoInfo}>💧 NIS Agua: {propiedad.nis_agua}</Text>}
            {!!propiedad.nis_electricidad && <Text style={s.textoInfo}>⚡ NIS Electricidad: {propiedad.nis_electricidad}</Text>}
          </View>
        )}

        {(propiedad.propietarios || []).length > 0 && (
          <View style={[s.seccion, { marginBottom: 40 }]}>
            <Text style={s.seccionTitulo}>{propiedad.propietarios.length > 1 ? 'Propietarios' : 'Propietario'}</Text>
            {propiedad.propietarios.map(pr => (
              <Text key={pr.id} style={s.textoInfo}>🧑‍💼 {pr.nombre}{pr.telefono ? ` — ${pr.telefono}` : ''}</Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>

    <Modal visible={!!fotoVisible} transparent animationType="fade" onRequestClose={() => setFotoVisible(null)}>
      <View style={s.visorFondo}>
        <TouchableOpacity style={s.visorCerrar} onPress={() => setFotoVisible(null)}>
          <MaterialCommunityIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {fotoVisible && <Image source={{ uri: fotoVisible.url }} style={s.visorImagen} resizeMode="contain" />}
        {fotoVisible && (
          <View style={s.visorAcciones}>
            <TouchableOpacity style={s.visorBoton} onPress={() => compartirArchivo(fotoVisible.url).catch(e => Alert.alert('Error', e.message))}>
              <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
              <Text style={s.visorBotonText}>Compartir</Text>
            </TouchableOpacity>
            {fotoVisible.tipo === 'foto' && !fotoVisible.es_principal && (
              <TouchableOpacity style={s.visorBoton} onPress={() => { marcarPrincipal(fotoVisible.id); setFotoVisible(null); }}>
                <MaterialCommunityIcons name="star-outline" size={20} color="#fff" />
                <Text style={s.visorBotonText}>Principal</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.visorBoton} onPress={() => confirmarBorrarFoto(fotoVisible)}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#fff" />
              <Text style={s.visorBotonText}>Borrar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
    </>
  );
}

function ReproductorVideo({ uri }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  return <VideoView style={s.video} player={player} allowsFullscreen nativeControls />;
}

function SeccionMedia({ titulo, items, onAgregar, onItemPress, subiendo, tipoVisual, extraAction }) {
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
          <TouchableOpacity onPress={onAgregar} disabled={subiendo}>
            <Text style={s.agregar}>{subiendo ? 'Subiendo…' : '+ Agregar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {items.length === 0
        ? <Text style={s.vacio}>Todavía no hay nada aquí</Text>
        : <View style={s.mediaGrid}>
            {items.map(item => (
              <TouchableOpacity key={item.id} style={s.mediaItem} onPress={() => onItemPress(item)}>
                {tipoVisual === 'imagen'
                  ? <Image source={{ uri: item.url }} style={s.mediaImg} />
                  : <View style={s.mediaPlaceholder}>
                      <MaterialCommunityIcons name="file-document" size={28} color="#3d1f0a" />
                    </View>
                }
              </TouchableOpacity>
            ))}
          </View>
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
  ubicacionAdmin: { fontSize: 12, color: '#9a8674', marginTop: 2, marginLeft: 20 },
  ubicacion: { fontSize: 14, color: '#7a5c3a' },
  descripcionFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  descripcion: { fontSize: 14, color: '#333', lineHeight: 20 },
  areasTexto: { fontSize: 13, color: '#7a5c3a', marginTop: 10 },
  textoInfo: { fontSize: 13, color: '#7a5c3a', marginBottom: 4 },
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
  mapaContenedor: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  mapa: { width: '100%', height: '100%' },
  btnMaps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3d1f0a', borderRadius: 10, padding: 12 },
  btnMapsText: { color: '#fff', fontWeight: '600' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 20 },
  btnSecundarioText: { color: '#1a1a1a', fontWeight: '600' },
  agregar: { color: '#3d1f0a', fontWeight: '600', fontSize: 13 },
  vacio: { color: '#9a8674', fontSize: 13 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mediaItem: {},
  mediaImg: { width: 100, height: 100, borderRadius: 10 },
  mediaPlaceholder: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center' },
  visorFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  visorCerrar: { position: 'absolute', top: 48, right: 20, zIndex: 1, padding: 8 },
  visorImagen: { width: '100%', height: '75%' },
  visorAcciones: { flexDirection: 'row', justifyContent: 'space-evenly', paddingVertical: 24 },
  visorBoton: { alignItems: 'center', gap: 6 },
  visorBotonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
