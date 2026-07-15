import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { AMENIDADES, COCINA_OPCIONES } from '../utils/caracteristicas';

export default function PropiedadFormScreen({ route, navigation }) {
  const existente = route.params?.propiedad;
  const c = existente?.caracteristicas || {};

  const [titulo, setTitulo] = useState(existente?.titulo || '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion || '');
  const [precio, setPrecio] = useState(existente?.precio ? String(existente.precio) : '');
  const [valorFiscal, setValorFiscal] = useState(existente?.valor_fiscal ? String(existente.valor_fiscal) : '');
  const [ubicacion, setUbicacion] = useState(existente?.ubicacion || '');
  const [mapsLink, setMapsLink] = useState(existente?.maps_link || '');
  const [tipoPropiedad, setTipoPropiedad] = useState(existente?.tipo_propiedad || '');
  const [habitaciones, setHabitaciones] = useState(c.habitaciones ? String(c.habitaciones) : '');
  const [banos, setBanos] = useState(c.banos ? String(c.banos) : '');
  const [vehiculos, setVehiculos] = useState(c.vehiculos ? String(c.vehiculos) : '');
  const [areaTerreno, setAreaTerreno] = useState(c.area_terreno ? String(c.area_terreno) : '');
  const [areaConstruccion, setAreaConstruccion] = useState(c.area_construccion ? String(c.area_construccion) : '');
  const [cocina, setCocina] = useState(c.cocina || null);
  const [amenidades, setAmenidades] = useState(() => {
    const inicial = {};
    AMENIDADES.forEach(a => { inicial[a.key] = !!c[a.key]; });
    return inicial;
  });
  const [guardando, setGuardando] = useState(false);

  const [tipos, setTipos] = useState([]);
  const [agregandoTipo, setAgregandoTipo] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');

  async function cargarTipos() {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/tipos-propiedad`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTipos(data);
    } catch (e) { /* si falla, el picker de tipos queda vacío pero el resto del formulario funciona */ }
  }

  useFocusEffect(useCallback(() => { cargarTipos(); }, []));

  async function guardarNuevoTipo() {
    const nombre = nuevoTipo.trim();
    if (!nombre) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API}/tipos-propiedad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el tipo');
      setTipos(prev => prev.some(t => t.nombre === data.nombre) ? prev : [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setTipoPropiedad(data.nombre);
      setNuevoTipo('');
      setAgregandoTipo(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  function toggleAmenidad(key) {
    setAmenidades(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function guardar() {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es requerido'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        precio: precio ? Number(precio) : null,
        valor_fiscal: valorFiscal ? Number(valorFiscal) : null,
        ubicacion: ubicacion.trim() || null,
        maps_link: mapsLink.trim() || null,
        tipo_propiedad: tipoPropiedad || null,
        caracteristicas: {
          habitaciones: habitaciones ? Number(habitaciones) : null,
          banos: banos ? Number(banos) : null,
          vehiculos: vehiculos ? Number(vehiculos) : null,
          area_terreno: areaTerreno ? Number(areaTerreno) : null,
          area_construccion: areaConstruccion ? Number(areaConstruccion) : null,
          cocina,
          ...amenidades,
        },
      };
      const url = existente ? `${API}/propiedades/${existente.id}` : `${API}/propiedades`;
      const res = await fetch(url, {
        method: existente ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la propiedad');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.label}>Título</Text>
      <TextInput style={s.input} value={titulo} onChangeText={setTitulo} placeholder="Casa en Escazú, 3 habitaciones" />

      <Text style={s.label}>Descripción</Text>
      <TextInput style={[s.input, s.textarea]} value={descripcion} onChangeText={setDescripcion} placeholder="Detalle de la propiedad" multiline />

      <Text style={s.label}>Tipo de propiedad</Text>
      <View style={s.chips}>
        {tipos.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.chip, tipoPropiedad === t.nombre && s.chipActivo]}
            onPress={() => setTipoPropiedad(t.nombre)}
          >
            <Text style={[s.chipText, tipoPropiedad === t.nombre && s.chipTextActivo]}>{t.nombre}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.chipAgregar} onPress={() => setAgregandoTipo(v => !v)}>
          <MaterialCommunityIcons name="plus" size={16} color="#3d1f0a" />
          <Text style={s.chipAgregarText}>Nuevo tipo</Text>
        </TouchableOpacity>
      </View>
      {agregandoTipo && (
        <View style={s.filaAgregarTipo}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={nuevoTipo}
            onChangeText={setNuevoTipo}
            placeholder="Ej: Casa en condominio"
            autoFocus
          />
          <TouchableOpacity style={s.btnGuardarTipo} onPress={guardarNuevoTipo}>
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>Precio de venta (₡)</Text>
          <TextInput style={s.input} value={precio} onChangeText={setPrecio} placeholder="75000000" keyboardType="numeric" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Valor fiscal (₡)</Text>
          <TextInput style={s.input} value={valorFiscal} onChangeText={setValorFiscal} placeholder="60000000" keyboardType="numeric" />
        </View>
      </View>

      <Text style={s.label}>Ubicación</Text>
      <TextInput style={s.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Escazú, San José" />

      <Text style={s.label}>Link de Google Maps</Text>
      <TextInput
        style={s.input}
        value={mapsLink}
        onChangeText={setMapsLink}
        placeholder="Pega el link que compartes desde la app de Maps"
        autoCapitalize="none"
      />

      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>Habitaciones</Text>
          <TextInput style={s.input} value={habitaciones} onChangeText={setHabitaciones} keyboardType="numeric" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Baños</Text>
          <TextInput style={s.input} value={banos} onChangeText={setBanos} keyboardType="numeric" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Vehículos</Text>
          <TextInput style={s.input} value={vehiculos} onChangeText={setVehiculos} keyboardType="numeric" />
        </View>
      </View>

      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>Área terreno (m²)</Text>
          <TextInput style={s.input} value={areaTerreno} onChangeText={setAreaTerreno} keyboardType="numeric" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Área construcción (m²)</Text>
          <TextInput style={s.input} value={areaConstruccion} onChangeText={setAreaConstruccion} keyboardType="numeric" />
        </View>
      </View>

      <Text style={s.label}>Cocina</Text>
      <View style={s.chips}>
        {COCINA_OPCIONES.map(op => (
          <TouchableOpacity
            key={op.value}
            style={[s.chip, cocina === op.value && s.chipActivo]}
            onPress={() => setCocina(cocina === op.value ? null : op.value)}
          >
            <Text style={[s.chipText, cocina === op.value && s.chipTextActivo]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Amenidades</Text>
      <View style={s.chips}>
        {AMENIDADES.map(a => (
          <TouchableOpacity
            key={a.key}
            style={[s.chip, amenidades[a.key] && s.chipActivo]}
            onPress={() => toggleAmenidad(a.key)}
          >
            <MaterialCommunityIcons name={a.icon} size={16} color={amenidades[a.key] ? '#fff' : '#3d1f0a'} />
            <Text style={[s.chipText, amenidades[a.key] && s.chipTextActivo]}>{a.label}</Text>
            {amenidades[a.key] && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      {guardando
        ? <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        : <TouchableOpacity style={s.btn} onPress={guardar}>
            <Text style={s.btnText}>{existente ? 'Guardar cambios' : 'Crear propiedad'}</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f0eb' },
  label: { fontSize: 13, fontWeight: '600', color: '#7a5c3a', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', gap: 10 },
  filaItem: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: '#3d1f0a', borderColor: '#3d1f0a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#3d1f0a' },
  chipTextActivo: { color: '#fff' },
  chipAgregar: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#3d1f0a', borderStyle: 'dashed', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipAgregarText: { fontSize: 13, fontWeight: '600', color: '#3d1f0a' },
  filaAgregarTipo: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  btnGuardarTipo: { backgroundColor: '#3d1f0a', borderRadius: 10, padding: 12 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
