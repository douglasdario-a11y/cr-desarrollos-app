import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, ScrollView, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { PROVINCIAS, cantonesDe, distritosDe } from '../utils/ubicacionCR';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

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
  const [vista, setVista] = useState('activa'); // 'activa' | 'inactiva' | 'todas'

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
      if (vista !== 'todas' && (p.estado || 'activa') !== vista) return false;
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
  }, [propiedades, filtros, vista]);

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
                <MaterialCommunityIcons name="cog" size={24} color={COLORES.acento} />
              </TouchableOpacity>
              {propiedades.length > 0 && (
                <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
                  <View>
                    <MaterialCommunityIcons name="filter-variant" size={22} color={hayFiltrosActivos ? COLORES.peligro : COLORES.acento} />
                    {hayFiltrosActivos && <View style={s.puntoFiltro} />}
                  </View>
                </TouchableOpacity>
              )}
              {propiedades.length > 0 && (
                <TouchableOpacity onPress={toggleModoEditar}>
                  <MaterialCommunityIcons name="pencil-outline" size={22} color={COLORES.acento} />
                </TouchableOpacity>
              )}
              {propiedades.length > 0 && (
                <TouchableOpacity onPress={toggleModoBorrar}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={COLORES.peligro} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.btnNueva} onPress={() => navigation.navigate('PropiedadForm')}>
                <Text style={s.btnNuevaText}>+ Nueva</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {!modoBorrar && !modoEditar && (
        <View style={s.vistaChips}>
          {[{ v: 'activa', l: 'Activas' }, { v: 'inactiva', l: 'Inactivas' }, { v: 'todas', l: 'Todas' }].map(op => (
            <TouchableOpacity key={op.v} style={[s.vistaChip, vista === op.v && s.vistaChipActivo]} onPress={() => setVista(op.v)}>
              <Text style={[s.vistaChipText, vista === op.v && s.vistaChipTextActivo]}>{op.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
                  {item.estado === 'inactiva' && <View style={s.chipInactiva}><Text style={s.tipoChipText}>Inactiva</Text></View>}
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
              <MaterialCommunityIcons name="close" size={26} color={COLORES.tinta} />
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
  container: { flex: 1, backgroundColor: COLORES.fondo },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  headerTitulo: { fontFamily: FUENTE_TITULO, fontSize: 26, color: COLORES.tinta },
  btnNueva: { backgroundColor: COLORES.acento, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnNuevaText: { color: '#fff', fontFamily: FUENTE_CUERPO_600, fontSize: 13 },
  btnCancelarText: { color: COLORES.tinta, fontFamily: FUENTE_CUERPO_600, fontSize: 13 },
  btnBorrarConfirmar: { backgroundColor: COLORES.peligro, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  btnBorrarConfirmarText: { color: '#fff', fontFamily: FUENTE_CUERPO_600, fontSize: 13 },
  btnDeshabilitado: { opacity: 0.4 },
  avisoModo: { textAlign: 'center', color: COLORES.muted, fontSize: 12, paddingHorizontal: 16, paddingTop: 10 },
  vistaChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  vistaChip: { backgroundColor: COLORES.superficie, borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16 },
  vistaChipActivo: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  vistaChipText: { fontSize: 13, fontFamily: FUENTE_CUERPO_600, color: COLORES.muted },
  vistaChipTextActivo: { color: '#fff' },
  chipInactiva: { backgroundColor: COLORES.peligro, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  vacio: { textAlign: 'center', color: COLORES.muted, marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: COLORES.superficie, borderRadius: 16, padding: 12, marginBottom: 12, gap: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORES.borde },
  cardSeleccionada: { borderWidth: 2, borderColor: COLORES.peligro },
  checkCirculo: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORES.peligro, alignItems: 'center', justifyContent: 'center' },
  checkCirculoActivo: { backgroundColor: COLORES.peligro },
  editOverlay: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORES.acento, alignItems: 'center', justifyContent: 'center' },
  foto: { width: 64, height: 64, borderRadius: 12 },
  fotoVacia: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORES.chipFondo, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: FUENTE_TITULO, fontSize: 15, color: COLORES.tinta },
  detalle: { fontSize: 12, color: COLORES.muted, marginTop: 2 },
  precio: { fontFamily: FUENTE_CUERPO_700, fontSize: 14, color: COLORES.acento, marginTop: 4 },
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  tipoChip: { backgroundColor: COLORES.acento, borderRadius: 20, paddingVertical: 2, paddingHorizontal: 8 },
  tipoChipText: { color: '#fff', fontSize: 10, fontFamily: FUENTE_CUERPO_700 },
  puntoFiltro: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORES.peligro },
  filtrosContainer: { flex: 1, backgroundColor: COLORES.fondo },
  filtrosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: COLORES.superficie },
  filtrosTitulo: { fontFamily: FUENTE_TITULO, fontSize: 18, color: COLORES.tinta },
  label: { fontSize: 13, fontFamily: FUENTE_CUERPO_600, color: COLORES.muted, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: COLORES.superficie, color: COLORES.tinta, borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 12, padding: 12, fontSize: 15 },
  fila: { flexDirection: 'row', gap: 10 },
  filaItem: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORES.superficie, borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  chipText: { fontSize: 13, fontFamily: FUENTE_CUERPO_600, color: COLORES.muted },
  chipTextActivo: { color: '#fff' },
  btnLimpiarText: { color: COLORES.peligro, fontFamily: FUENTE_CUERPO_600, fontSize: 13, textAlign: 'center' },
  filtrosFooter: { padding: 16, backgroundColor: COLORES.superficie, borderTopWidth: 1, borderTopColor: COLORES.borde },
  btnAplicar: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center' },
  btnAplicarText: { color: '#fff', fontSize: 16, fontFamily: FUENTE_CUERPO_600 },
});
