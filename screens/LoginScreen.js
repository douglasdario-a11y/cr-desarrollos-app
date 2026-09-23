import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API, getEmpresa, saveEmpresa } from '../utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORES, FUENTE_TITULO, FUENTE_CUERPO_600, FUENTE_CUERPO_700 } from '../utils/theme';

export default function LoginScreen({ onLogin, onIrARegistro }) {
  const [empresa, setEmpresa] = useState(null);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getEmpresa().then(e => { setEmpresa(e); setCargandoEmpresa(false); });
  }, []);

  async function buscarEmpresas(q) {
    setBusqueda(q);
    if (!q.trim()) { setResultados([]); return; }
    try {
      const res = await fetch(`${API}/empresas/buscar?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok) setResultados(data);
    } catch (e) { /* la lista queda vacía si falla */ }
  }

  async function elegirEmpresa(e) {
    setEmpresa(e);
    await saveEmpresa(e);
    setBuscando(false);
    setResultados([]);
    setBusqueda('');
  }

  async function entrar() {
    if (loading || pin.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_slug: empresa?.slug, pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'PIN incorrecto'); setPin(''); return; }
      if (data.empresa) await saveEmpresa(data.empresa);
      await AsyncStorage.setItem('token', data.token);
      onLogin(data);
    } catch (e) {
      setError('No se pudo conectar al servidor');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  // El PIN puede tener entre 4 y 6 dígitos — no se puede saber cuándo el
  // usuario terminó de escribir con solo mirar la cantidad de dígitos, así
  // que hace falta el botón "Entrar" en vez de enviar apenas se completan 4.
  function presionar(val) {
    if (loading) return;
    if (val === 'DEL') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 6) return;
    setPin(p => p + val);
  }

  if (cargandoEmpresa) return <View style={s.container} />;

  return (
    <View style={s.container}>
      <View style={s.card}>
        <View style={s.marcaIcono}>
          <MaterialCommunityIcons name="home-city" size={22} color="#fff" />
        </View>
        <Text style={s.titulo}>CR Desarrollos</Text>

        {empresa && !buscando ? (
          <View style={s.empresaFila}>
            <Text style={s.empresaTexto}>{empresa.nombre}</Text>
            <TouchableOpacity onPress={() => setBuscando(true)}>
              <Text style={s.linkCambiar}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.buscadorEmpresa}>
            <TextInput
              style={s.inputBuscar}
              value={busqueda}
              onChangeText={buscarEmpresas}
              placeholder="Nombre de tu inmobiliaria"
              autoFocus
            />
            {resultados.length > 0 && (
              <FlatList
                data={resultados}
                keyExtractor={item => item.slug}
                style={s.listaResultados}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.resultadoItem} onPress={() => elegirEmpresa(item)}>
                    <Text style={s.resultadoTexto}>{item.nombre}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {empresa && !buscando && (
          <>
            <Text style={s.sub}>Ingresá tu PIN</Text>

            <View style={s.pinDisplay}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[s.pinDot, i < pin.length && s.pinDotFull]} />
              ))}
            </View>

            {!!error && <Text style={s.error}>{error}</Text>}

            <View style={s.teclado}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((k, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.tecla, k === '' && s.teclaVacia, k === 'DEL' && s.teclaDel]}
                  onPress={() => k && presionar(k)}
                  disabled={k === '' || loading}
                >
                  <Text style={k === 'DEL' ? s.teclaDelText : s.teclaText}>{k === 'DEL' ? '⌫' : k}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading
              ? <ActivityIndicator size="large" color={COLORES.acento} style={{ marginTop: 16 }} />
              : <TouchableOpacity style={[s.btn, pin.length < 4 && s.btnDeshabilitado]} onPress={entrar} disabled={pin.length < 4}>
                  <Text style={s.btnText}>Entrar</Text>
                </TouchableOpacity>
            }
          </>
        )}

        <TouchableOpacity onPress={onIrARegistro} style={{ marginTop: 20 }}>
          <Text style={s.linkRegistro}>¿Sos una inmobiliaria nueva? Registrate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORES.fondo },
  card: { backgroundColor: COLORES.superficie, borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#241C15', shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  marcaIcono: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORES.acento, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  titulo: { fontFamily: FUENTE_TITULO, fontSize: 19, color: COLORES.tinta, textAlign: 'center' },
  empresaFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 20 },
  empresaTexto: { fontSize: 14, color: COLORES.muted, fontFamily: FUENTE_CUERPO_600 },
  linkCambiar: { fontSize: 14, color: COLORES.acento, fontFamily: FUENTE_CUERPO_600 },
  buscadorEmpresa: { width: '100%', marginTop: 4, marginBottom: 20 },
  inputBuscar: { backgroundColor: COLORES.fondo, color: COLORES.tinta, borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 12, padding: 12, fontSize: 15 },
  listaResultados: { marginTop: 6, borderWidth: 1, borderColor: COLORES.borde, borderRadius: 12, maxHeight: 160, backgroundColor: COLORES.superficie },
  resultadoItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORES.borde },
  resultadoTexto: { fontSize: 14, color: COLORES.tinta },
  sub: { fontSize: 14, color: COLORES.muted, fontFamily: FUENTE_CUERPO_600, marginTop: 4, marginBottom: 20 },
  pinDisplay: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pinDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORES.bordeFuerte },
  pinDotFull: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  error: { color: COLORES.peligro, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  teclado: { flexDirection: 'row', flexWrap: 'wrap', width: 260, justifyContent: 'space-between', marginTop: 8 },
  tecla: { width: 76, height: 56, borderRadius: 14, backgroundColor: COLORES.fondo, borderWidth: 1, borderColor: COLORES.borde, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teclaVacia: { backgroundColor: 'transparent', borderWidth: 0 },
  teclaDel: { backgroundColor: COLORES.peligroFondo, borderColor: '#F3C6C2' },
  teclaText: { fontSize: 20, fontFamily: FUENTE_CUERPO_600, color: COLORES.tinta },
  teclaDelText: { fontSize: 18, fontFamily: FUENTE_CUERPO_600, color: COLORES.peligro },
  btn: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  btnDeshabilitado: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FUENTE_CUERPO_600 },
  linkRegistro: { fontSize: 12, color: COLORES.muted, textAlign: 'center' },
});
