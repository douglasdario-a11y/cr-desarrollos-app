import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { API } from '../utils/api';
import { ESPACIOS, COCINA_OPCIONES, AMENIDADES_SUGERIDAS, amenidadesEfectivas, espaciosPersonalizados } from '../utils/caracteristicas';

export default function PropiedadFormScreen({ route, navigation }) {
  const existente = route.params?.propiedad;
  const c = existente?.caracteristicas || {};

  const [titulo, setTitulo] = useState(existente?.titulo || '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion || '');
  const [enVenta, setEnVenta] = useState(existente ? !!existente.en_venta : true);
  const [enAlquiler, setEnAlquiler] = useState(!!existente?.en_alquiler);
  const [precio, setPrecio] = useState(existente?.precio ? String(existente.precio) : '');
  const [precioAlquiler, setPrecioAlquiler] = useState(existente?.precio_alquiler ? String(existente.precio_alquiler) : '');
  const [valorFiscal, setValorFiscal] = useState(existente?.valor_fiscal ? String(existente.valor_fiscal) : '');
  const [ubicacion, setUbicacion] = useState(existente?.ubicacion || '');
  const [mapsLink, setMapsLink] = useState(existente?.maps_link || '');
  const [nisAgua, setNisAgua] = useState(existente?.nis_agua || '');
  const [nisElectricidad, setNisElectricidad] = useState(existente?.nis_electricidad || '');
  const [numeroFinca, setNumeroFinca] = useState(existente?.numero_finca || '');
  const [numeroCatastro, setNumeroCatastro] = useState(existente?.numero_catastro || '');
  const [tipoPropiedad, setTipoPropiedad] = useState(existente?.tipo_propiedad || '');
  const [habitaciones, setHabitaciones] = useState(c.habitaciones ? String(c.habitaciones) : '');
  const [banos, setBanos] = useState(c.banos ? String(c.banos) : '');
  const [vehiculos, setVehiculos] = useState(c.vehiculos ? String(c.vehiculos) : '');
  const [areaTerreno, setAreaTerreno] = useState(c.area_terreno ? String(c.area_terreno) : '');
  const [areaConstruccion, setAreaConstruccion] = useState(c.area_construccion ? String(c.area_construccion) : '');
  const [cocina, setCocina] = useState(c.cocina || null);
  const [espacios, setEspacios] = useState(() => {
    const inicial = {};
    ESPACIOS.forEach(e => { inicial[e.key] = !!c[e.key]; });
    return inicial;
  });
  const [espaciosExtra, setEspaciosExtra] = useState(() => espaciosPersonalizados(c));
  const [nuevoEspacio, setNuevoEspacio] = useState('');
  const [amenidades, setAmenidades] = useState(() => amenidadesEfectivas(c));
  const [nuevaAmenidad, setNuevaAmenidad] = useState('');
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

  function toggleEspacio(key) {
    setEspacios(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function agregarEspacioExtra(texto) {
    const val = texto.trim();
    if (!val || espaciosExtra.includes(val)) { setNuevoEspacio(''); return; }
    setEspaciosExtra(prev => [...prev, val]);
    setNuevoEspacio('');
  }

  function quitarEspacioExtra(val) {
    setEspaciosExtra(prev => prev.filter(e => e !== val));
  }

  function agregarAmenidad(texto) {
    const val = texto.trim();
    if (!val || amenidades.includes(val)) { setNuevaAmenidad(''); return; }
    setAmenidades(prev => [...prev, val]);
    setNuevaAmenidad('');
  }

  function quitarAmenidad(val) {
    setAmenidades(prev => prev.filter(a => a !== val));
  }

  async function guardar() {
    if (!titulo.trim()) { Alert.alert('Error', 'El título es requerido'); return; }
    setGuardando(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const body = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        en_venta: enVenta,
        en_alquiler: enAlquiler,
        precio: precio ? Number(precio) : null,
        precio_alquiler: precioAlquiler ? Number(precioAlquiler) : null,
        valor_fiscal: valorFiscal ? Number(valorFiscal) : null,
        ubicacion: ubicacion.trim() || null,
        maps_link: mapsLink.trim() || null,
        nis_agua: nisAgua.trim() || null,
        nis_electricidad: nisElectricidad.trim() || null,
        numero_finca: numeroFinca.trim() || null,
        numero_catastro: numeroCatastro.trim() || null,
        tipo_propiedad: tipoPropiedad || null,
        caracteristicas: {
          habitaciones: habitaciones ? Number(habitaciones) : null,
          banos: banos ? Number(banos) : null,
          vehiculos: vehiculos ? Number(vehiculos) : null,
          area_terreno: areaTerreno ? Number(areaTerreno) : null,
          area_construccion: areaConstruccion ? Number(areaConstruccion) : null,
          cocina,
          ...espacios,
          espacios_personalizados: espaciosExtra,
          amenidades,
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

      <Text style={s.label}>¿Qué se hace con esta propiedad?</Text>
      <View style={s.chips}>
        <TouchableOpacity style={[s.chip, enVenta && s.chipActivo]} onPress={() => setEnVenta(v => !v)}>
          <Text style={[s.chipText, enVenta && s.chipTextActivo]}>En venta</Text>
          {enVenta && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity style={[s.chip, enAlquiler && s.chipActivo]} onPress={() => setEnAlquiler(v => !v)}>
          <Text style={[s.chipText, enAlquiler && s.chipTextActivo]}>En alquiler</Text>
          {enAlquiler && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={s.fila}>
        {enVenta && (
          <View style={s.filaItem}>
            <Text style={s.label}>Precio de venta (₡)</Text>
            <TextInput style={s.input} value={precio} onChangeText={setPrecio} placeholder="75000000" keyboardType="numeric" />
          </View>
        )}
        {enAlquiler && (
          <View style={s.filaItem}>
            <Text style={s.label}>Precio de alquiler (₡/mes)</Text>
            <TextInput style={s.input} value={precioAlquiler} onChangeText={setPrecioAlquiler} placeholder="450000" keyboardType="numeric" />
          </View>
        )}
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

      <Text style={s.label}>Espacios de la casa</Text>
      <View style={s.chips}>
        {ESPACIOS.map(e => (
          <TouchableOpacity
            key={e.key}
            style={[s.chip, espacios[e.key] && s.chipActivo]}
            onPress={() => toggleEspacio(e.key)}
          >
            <MaterialCommunityIcons name={e.icon} size={16} color={espacios[e.key] ? '#fff' : '#3d1f0a'} />
            <Text style={[s.chipText, espacios[e.key] && s.chipTextActivo]}>{e.label}</Text>
            {espacios[e.key] && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>
      {espaciosExtra.length > 0 && (
        <View style={[s.chips, { marginTop: 8 }]}>
          {espaciosExtra.map(e => (
            <View key={e} style={s.chipQuitable}>
              <Text style={s.chipQuitableText}>{e}</Text>
              <TouchableOpacity onPress={() => quitarEspacioExtra(e)}>
                <MaterialCommunityIcons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={s.filaAgregarTipo}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={nuevoEspacio}
          onChangeText={setNuevoEspacio}
          placeholder="Otro espacio (ej: bodega, ático...)"
          onSubmitEditing={() => agregarEspacioExtra(nuevoEspacio)}
        />
        <TouchableOpacity style={s.btnGuardarTipo} onPress={() => agregarEspacioExtra(nuevoEspacio)}>
          <MaterialCommunityIcons name="check" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={s.label}>Amenidades especiales (de la casa o del condominio)</Text>
      {amenidades.length > 0 && (
        <View style={s.chips}>
          {amenidades.map(a => (
            <View key={a} style={s.chipQuitable}>
              <Text style={s.chipQuitableText}>{a}</Text>
              <TouchableOpacity onPress={() => quitarAmenidad(a)}>
                <MaterialCommunityIcons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={[s.chips, { marginTop: amenidades.length > 0 ? 8 : 0 }]}>
        {AMENIDADES_SUGERIDAS.filter(sug => !amenidades.includes(sug)).map(sug => (
          <TouchableOpacity key={sug} style={s.chipAgregar} onPress={() => agregarAmenidad(sug)}>
            <MaterialCommunityIcons name="plus" size={16} color="#3d1f0a" />
            <Text style={s.chipAgregarText}>{sug}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.filaAgregarTipo}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          value={nuevaAmenidad}
          onChangeText={setNuevaAmenidad}
          placeholder="Ej: Cine, cancha de tenis..."
          onSubmitEditing={() => agregarAmenidad(nuevaAmenidad)}
        />
        <TouchableOpacity style={s.btnGuardarTipo} onPress={() => agregarAmenidad(nuevaAmenidad)}>
          <MaterialCommunityIcons name="check" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>Número de Finca</Text>
          <TextInput style={s.input} value={numeroFinca} onChangeText={setNumeroFinca} placeholder="Ej: SJ-123456-000" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>Número de Catastro</Text>
          <TextInput style={s.input} value={numeroCatastro} onChangeText={setNumeroCatastro} placeholder="Ej: SJ-1234567-2020" />
        </View>
      </View>

      <View style={s.fila}>
        <View style={s.filaItem}>
          <Text style={s.label}>NIS Agua</Text>
          <TextInput style={s.input} value={nisAgua} onChangeText={setNisAgua} placeholder="Número de cuenta de AyA" />
        </View>
        <View style={s.filaItem}>
          <Text style={s.label}>NIS Electricidad</Text>
          <TextInput style={s.input} value={nisElectricidad} onChangeText={setNisElectricidad} placeholder="Número de cuenta eléctrica" />
        </View>
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
  input: { backgroundColor: '#fff', color: '#1a1a1a', borderWidth: 1, borderColor: '#e0d8cd', borderRadius: 10, padding: 12, fontSize: 15 },
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
  chipQuitable: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3d1f0a', borderRadius: 20, paddingVertical: 8, paddingLeft: 14, paddingRight: 10 },
  chipQuitableText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  filaAgregarTipo: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  btnGuardarTipo: { backgroundColor: '#3d1f0a', borderRadius: 10, padding: 12 },
  btn: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
