import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { PROVINCIAS, cantonesDe, distritosDe } from '../utils/ubicacionCR';

function fmtPrecio(n) {
  if (n == null) return 'Precio a consultar';
  return `₡${Math.round(Number(n)).toLocaleString('es-CR')}`;
}

const FILTROS_VACIOS = {
  operacion: '', tipo: '', habitacionesMin: '', precioMin: '', precioMax: '',
  provincia: '', canton: '', distrito: '',
};

export default function PropiedadesScreen({ navigation, onLogout }) {
  const [propiedades, setPropiedades] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [modoBorrar, setModoBorrar] = useState(false);
  const [modoEditar, setModoEditar] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [borrando, setBorrando] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

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

  async function cargarTipos() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/tipos-propiedad`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTipos(data);
    } catch (e) { /* el filtro de tipo queda vacío si falla */ }
  }

  useFocusEffect(useCallback(() => { cargar(); cargarTipos(); }, []));

  function actualizarFiltro(campo, valor) {
    setFiltros(prev => {
      const next = { ...prev, [campo]: prev[campo] === valor ? '' : valor };
      if (campo === 'provincia') { next.canton = ''; next.distrito = ''; }
      if (campo === 'canton') { next.distrito = ''; }
      return next;
    });
  }

  const hayFiltrosActivos = Object.values(filtros).some(v => v !== '');

  const propiedadesFiltradas = useMemo(() => {
    return propiedades.filter(p => {
      const c = p.caracteristicas || {};
      if (filtros.operacion === 'venta' && !p.en_venta) return false;
      if (filtros.operacion === 'alquiler' && !p.en_alquiler) return false;
      if (filtros.tipo && p.tipo_propiedad !== filtros.tipo) return false;
      if (filtros.habitacionesMin && !(Number(c.habitaciones) >= Number(filtros.habitacionesMin))) return false;
      if (filtros.precioMin && !(Number(p.precio) >= Number(filtros.precioMin))) return false;
      if (filtros.precioMax && !(Number(p.precio) <= Number(filtros.precioMax))) return false;
      if (filtros.provincia && p.provincia !== filtros.provincia) return false;
      if (filtros.canton && p.canton !== filtros.canton) return false;
      if (filtros.distrito && p.distrito !== filtros.distrito) return false;
      return true;
    });
  }, [propiedades, filtros]);

  function toggleModoBorrar() {
    setModoBorrar(v => !v);
    setModoEditar(false);
    setSeleccionadas([]);
  }

  function toggleModoEditar() {
    setModoEditar(v => !v);
    setModoBorrar(false);
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
          ) : modoEditar ? (
            <TouchableOpacity onPress={toggleModoEditar}>
              <Text style={s.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
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
                <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
                  <View>
                    <MaterialCommunityIcons name="filter-variant" size={22} color={hayFiltrosActivos ? '#b3261e' : '#3d1f0a'} />
                    {hayFiltrosActivos && <View style={s.puntoFiltro} />}
                  </View>
                </TouchableOpacity>
              )}
              {propiedades.length > 0 && (
                <TouchableOpacity onPress={toggleModoEditar}>
                  <MaterialCommunityIcons name="pencil-outline" size={22} color="#3d1f0a" />
                </TouchableOpacity>
              )}
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
      {modoEditar && <Text style={s.avisoModo}>Toca una propiedad para editarla</Text>}
      <FlatList
        data={propiedadesFiltradas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => { setRefrescando(true); cargar(); }} />}
        ListEmptyComponent={<Text style={s.vacio}>{propiedades.length === 0 ? 'Aún no hay propiedades. Toca "+ Nueva" para agregar la primera.' : 'Ninguna propiedad coincide con esos filtros.'}</Text>}
        renderItem={({ item }) => {
          const seleccionada = seleccionadas.includes(item.id);
          return (
            <TouchableOpacity
              style={[s.card, modoBorrar && seleccionada && s.cardSeleccionada]}
              onPress={() => {
                if (modoBorrar) toggleSeleccion(item.id);
                else if (modoEditar) navigation.navigate('PropiedadForm', { propiedad: item });
                else navigation.navigate('PropiedadDetalle', { id: item.id });
              }}
            >
              {item.portada_url
                ? <Image source={{ uri: item.portada_url }} style={s.foto} />
                : <View style={s.fotoVacia}><Text style={{ fontSize: 24 }}>🏠</Text></View>
              }
              <View style={{ flex: 1 }}>
                <View style={s.chipsFila}>
                  {item.tipo_propiedad && <View style={s.tipoChip}><Text style={s.tipoChipText}>{item.tipo_propiedad}</Text></View>}
                  {item.en_venta && <View style={s.tipoChip}><Text style={s.tipoChipText}>En venta</Text></View>}
                  {item.en_alquiler && <View style={s.tipoChip}><Text style={s.tipoChipText}>En alquiler</Text></View>}
                </View>
                <Text style={s.titulo}>{item.titulo}</Text>
                <Text style={s.detalle}>{item.ubicacion}</Text>
                {item.en_venta && <Text style={s.precio}>{fmtPrecio(item.precio)}</Text>}
                {item.en_alquiler && <Text style={s.precio}>{fmtPrecio(item.precio_alquiler)} / mes</Text>}
              </View>
              {modoBorrar && (
                <View style={[s.checkCirculo, seleccionada && s.checkCirculoActivo]}>
                  {seleccionada && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
              )}
              {modoEditar && (
                <View style={s.editOverlay}>
                  <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={mostrarFiltros} animationType="slide" onRequestClose={() => setMostrarFiltros(false)}>
        <View style={s.filtrosContainer}>
          <View style={s.filtrosHeader}>
            <Text style={s.filtrosTitulo}>Filtros</Text>
            <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
              <MaterialCommunityIcons name="close" size={26} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={s.label}>Operación</Text>
            <View style={s.chips}>
              {[{ v: 'venta', l: 'En venta' }, { v: 'alquiler', l: 'En alquiler' }].map(op => (
                <TouchableOpacity key={op.v} style={[s.chip, filtros.operacion === op.v && s.chipActivo]} onPress={() => actualizarFiltro('operacion', op.v)}>
                  <Text style={[s.chipText, filtros.operacion === op.v && s.chipTextActivo]}>{op.l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Tipo de propiedad</Text>
            <View style={s.chips}>
              {tipos.map(t => (
                <TouchableOpacity key={t.id} style={[s.chip, filtros.tipo === t.nombre && s.chipActivo]} onPress={() => actualizarFiltro('tipo', t.nombre)}>
                  <Text style={[s.chipText, filtros.tipo === t.nombre && s.chipTextActivo]}>{t.nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Habitaciones (mínimo)</Text>
            <TextInput style={s.input} value={filtros.habitacionesMin} onChangeText={v => setFiltros(prev => ({ ...prev, habitacionesMin: v }))} keyboardType="numeric" placeholder="Ej: 2" />

            <View style={s.fila}>
              <View style={s.filaItem}>
                <Text style={s.label}>Precio mínimo (₡)</Text>
                <TextInput style={s.input} value={filtros.precioMin} onChangeText={v => setFiltros(prev => ({ ...prev, precioMin: v }))} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={s.filaItem}>
                <Text style={s.label}>Precio máximo (₡)</Text>
                <TextInput style={s.input} value={filtros.precioMax} onChangeText={v => setFiltros(prev => ({ ...prev, precioMax: v }))} keyboardType="numeric" placeholder="Sin límite" />
              </View>
            </View>

            <Text style={s.label}>Provincia</Text>
            <View style={s.chips}>
              {PROVINCIAS.map(p => (
                <TouchableOpacity key={p} style={[s.chip, filtros.provincia === p && s.chipActivo]} onPress={() => actualizarFiltro('provincia', p)}>
                  <Text style={[s.chipText, filtros.provincia === p && s.chipTextActivo]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!!filtros.provincia && (
              <>
                <Text style={s.label}>Cantón</Text>
                <View style={s.chips}>
                  {cantonesDe(filtros.provincia).map(c2 => (
                    <TouchableOpacity key={c2} style={[s.chip, filtros.canton === c2 && s.chipActivo]} onPress={() => actualizarFiltro('canton', c2)}>
                      <Text style={[s.chipText, filtros.canton === c2 && s.chipTextActivo]}>{c2}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {!!filtros.canton && (
              <>
                <Text style={s.label}>Distrito</Text>
                <View style={s.chips}>
                  {distritosDe(filtros.provincia, filtros.canton).map(d => (
                    <TouchableOpacity key={d} style={[s.chip, filtros.distrito === d && s.chipActivo]} onPress={() => actualizarFiltro('distrito', d)}>
                      <Text style={[s.chipText, filtros.distrito === d && s.chipTextActivo]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {hayFiltrosActivos && (
              <TouchableOpacity onPress={() => setFiltros(FILTROS_VACIOS)} style={{ marginTop: 20, marginBottom: 20 }}>
                <Text style={s.btnLimpiarText}>Limpiar filtros</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <View style={s.filtrosFooter}>
            <TouchableOpacity style={s.btnAplicar} onPress={() => setMostrarFiltros(false)}>
              <Text style={s.btnAplicarText}>Ver {propiedadesFiltradas.length} propiedad{propiedadesFiltradas.length === 1 ? '' : 'es'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  avisoModo: { textAlign: 'center', color: '#7a5c3a', fontSize: 12, paddingHorizontal: 16, paddingTop: 10 },
  vacio: { textAlign: 'center', color: '#9a8674', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center' },
  cardSeleccionada: { borderWidth: 2, borderColor: '#b3261e' },
  checkCirculo: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#b3261e', alignItems: 'center', justifyContent: 'center' },
  checkCirculoActivo: { backgroundColor: '#b3261e' },
  editOverlay: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#3d1f0a', alignItems: 'center', justifyContent: 'center' },
  foto: { width: 64, height: 64, borderRadius: 10 },
  fotoVacia: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#e8ddd5', alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  detalle: { fontSize: 12, color: '#7a5c3a', marginTop: 2 },
  precio: { fontSize: 13, fontWeight: '600', color: '#3d1f0a', marginTop: 4 },
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  tipoChip: { backgroundColor: '#3d1f0a', borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  tipoChipText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  puntoFiltro: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: '#b3261e' },
  filtrosContainer: { flex: 1, backgroundColor: '#f5f0eb' },
  filtrosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff' },
  filtrosTitulo: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', color: '#1a1a1a', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  fila: { flexDirection: 'row', gap: 10 },
  filaItem: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: '#3d1f0a', borderColor: '#3d1f0a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#3d1f0a' },
  chipTextActivo: { color: '#fff' },
  btnLimpiarText: { color: '#b3261e', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  filtrosFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0d8cd' },
  btnAplicar: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnAplicarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
