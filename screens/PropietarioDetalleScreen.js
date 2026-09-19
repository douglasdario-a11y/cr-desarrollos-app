import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { API } from '../utils/api';
import { subirDocumentoPropietario } from '../utils/upload';

function numeroWhatsapp(telefono) {
  const digitos = (telefono || '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.length <= 8 ? `506${digitos}` : digitos;
}

export default function PropietarioDetalleScreen({ route, navigation }) {
  const { id } = route.params;
  const [propietario, setPropietario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  async function cargar() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propietarios/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando el propietario');
      setPropietario(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { cargar(); }, [id]));

  async function elegirYSubirDocumento() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (resultado.canceled) return;
    const archivo = resultado.assets[0];
    setSubiendo(true);
    try {
      const actualizado = await subirDocumentoPropietario({
        propietarioId: id,
        uri: archivo.uri,
        contentType: archivo.mimeType || 'application/octet-stream',
      });
      setPropietario(actualizado);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendo(false);
    }
  }

  function confirmarBorrarDocumento() {
    Alert.alert('Borrar documento', '¿Borrar el documento de personería jurídica?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: borrarDocumento },
    ]);
  }

  async function borrarDocumento() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/propietarios/${id}/documento`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error borrando el documento');
      setPropietario(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  if (loading || !propietario) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  const whatsapp = numeroWhatsapp(propietario.telefono);

  return (
    <View style={s.container}>
      <View style={{ padding: 16 }}>
        <View style={s.filaTitulo}>
          <Text style={s.nombre}>{propietario.nombre}</Text>
          <View style={s.badgeTipo}>
            <Text style={s.badgeTipoText}>{propietario.tipo === 'juridica' ? 'Persona jurídica' : 'Persona física'}</Text>
          </View>
        </View>

        <View style={s.accesosFila}>
          {!!propietario.telefono && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`tel:${propietario.telefono}`)}>
              <MaterialCommunityIcons name="phone" size={22} color="#3d1f0a" />
              <Text style={s.accesoTexto}>Llamar</Text>
            </TouchableOpacity>
          )}
          {!!whatsapp && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`https://wa.me/${whatsapp}`)}>
              <MaterialCommunityIcons name="whatsapp" size={22} color="#25D366" />
              <Text style={s.accesoTexto}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {!!propietario.email && (
            <TouchableOpacity style={s.accesoBoton} onPress={() => Linking.openURL(`mailto:${propietario.email}`)}>
              <MaterialCommunityIcons name="email" size={22} color="#3d1f0a" />
              <Text style={s.accesoTexto}>Correo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.seccion}>
          {!!propietario.telefono && <Text style={s.textoInfo}>📞 {propietario.telefono}</Text>}
          {!!propietario.email && <Text style={s.textoInfo}>✉️ {propietario.email}</Text>}
          {!!propietario.direccion && <Text style={s.textoInfo}>📍 {propietario.direccion}</Text>}
          {!!propietario.cedula && <Text style={s.textoInfo}>🪪 {propietario.tipo === 'juridica' ? 'Cédula jurídica' : 'Cédula'}: {propietario.cedula}</Text>}
          {!!propietario.numero_cuenta_bancaria && <Text style={s.textoInfo}>🏦 Cuenta bancaria: {propietario.numero_cuenta_bancaria}</Text>}
          {!!propietario.codigo_actividad_economica && <Text style={s.textoInfo}>🏷️ Actividad económica: {propietario.codigo_actividad_economica}</Text>}
        </View>

        {propietario.tipo === 'juridica' && !!propietario.representante_legal && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Representante legal</Text>
            <TouchableOpacity style={s.propFila} onPress={() => navigation.navigate('PropietarioDetalle', { id: propietario.representante_legal.id })}>
              <Text style={s.propFilaText}>🧑‍⚖️ {propietario.representante_legal.nombre}{propietario.representante_legal.cedula ? ` (${propietario.representante_legal.cedula})` : ''}</Text>
            </TouchableOpacity>
          </View>
        )}

        {propietario.tipo === 'fisica' && (propietario.sociedades_representadas || []).length > 0 && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Representante legal de</Text>
            {propietario.sociedades_representadas.map(soc => (
              <TouchableOpacity key={soc.id} style={s.propFila} onPress={() => navigation.navigate('PropietarioDetalle', { id: soc.id })}>
                <Text style={s.propFilaText}>🏢 {soc.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {propietario.tipo === 'juridica' && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Documento de personería jurídica</Text>
            {propietario.documento_personeria_url
              ? (
                <View style={s.docFila}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => Linking.openURL(propietario.documento_personeria_url)}>
                    <Text style={s.docLink}>📄 Ver documento</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmarBorrarDocumento}>
                    <Text style={s.btnBorrarText}>Borrar</Text>
                  </TouchableOpacity>
                </View>
              )
              : <Text style={s.vacio}>Todavía no se ha subido.</Text>
            }
            {subiendo
              ? <ActivityIndicator style={{ marginTop: 10 }} />
              : (
                <TouchableOpacity style={s.btnSubirDoc} onPress={elegirYSubirDocumento}>
                  <Text style={s.btnSubirDocText}>{propietario.documento_personeria_url ? 'Reemplazar documento' : 'Subir documento (PDF o imagen)'}</Text>
                </TouchableOpacity>
              )
            }
          </View>
        )}

        {!!propietario.notas && (
          <View style={s.seccion}>
            <Text style={s.seccionTitulo}>Notas</Text>
            <Text style={s.notas}>{propietario.notas}</Text>
          </View>
        )}

        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>Propiedades ({(propietario.propiedades || []).length})</Text>
          {(propietario.propiedades || []).length === 0
            ? <Text style={s.vacio}>Todavía no tiene propiedades asignadas.</Text>
            : propietario.propiedades.map(p => (
                <TouchableOpacity key={p.id} style={s.propFila} onPress={() => navigation.navigate('Propiedades', { screen: 'PropiedadDetalle', params: { id: p.id } })}>
                  <Text style={s.propFilaText}>🏠 {p.titulo}</Text>
                </TouchableOpacity>
              ))
          }
        </View>

        <TouchableOpacity style={s.btnSecundario} onPress={() => navigation.navigate('PropietarioForm', { propietario })}>
          <Text style={s.btnSecundarioText}>Editar información</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  nombre: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  badgeTipo: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  badgeTipoText: { fontSize: 11, fontWeight: '700', color: '#7a5c3a' },
  accesosFila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  accesoBoton: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4 },
  accesoTexto: { fontSize: 12, fontWeight: '600', color: '#3d1f0a' },
  seccion: { marginTop: 20 },
  seccionTitulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  textoInfo: { fontSize: 13, color: '#7a5c3a', marginBottom: 6 },
  notas: { fontSize: 14, color: '#333', lineHeight: 20 },
  vacio: { color: '#9a8674', fontSize: 13, marginBottom: 10 },
  docFila: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  docLink: { color: '#3d1f0a', fontSize: 14, fontWeight: '600' },
  btnBorrarText: { fontSize: 12, fontWeight: '600', color: '#b3261e' },
  btnSubirDoc: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  btnSubirDocText: { color: '#3d1f0a', fontSize: 13, fontWeight: '600' },
  propFila: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  propFilaText: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  btnSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a1a1a', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  btnSecundarioText: { color: '#1a1a1a', fontWeight: '600' },
});
