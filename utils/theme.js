// Paleta y tipografía compartidas — antes cada pantalla definía sus propios
// hex sueltos, lo que hacía imposible mantener consistencia al rediseñar.
export const COLORES = {
  fondo: '#FBF7F2',
  superficie: '#FFFFFF',
  tinta: '#241C15',
  muted: '#6B5D4E',
  acento: '#B85526',
  acentoSuave: '#B855261a',
  borde: '#F0E8DC',
  bordeFuerte: '#E7DCCB',
  chipFondo: '#F3E9DC',
  alquiler: '#4C6E8F',
  peligro: '#B3261E',
  peligroFondo: '#FBEAEA',
  exito: '#2F6B45',
  exitoFondo: '#E1EEE3',
};

export const FUENTE_TITULO = 'Fraunces_700Bold';
export const FUENTE_TITULO_600 = 'Fraunces_600SemiBold';
export const FUENTE_CUERPO = 'PublicSans_400Regular';
export const FUENTE_CUERPO_MEDIA = 'PublicSans_500Medium';
export const FUENTE_CUERPO_600 = 'PublicSans_600SemiBold';
export const FUENTE_CUERPO_700 = 'PublicSans_700Bold';

// Los formularios (Propiedad/Cliente/Propietario/Cita/Usuario/Cambiar PIN)
// comparten casi exactamente los mismos estilos base — se centralizan acá
// en vez de repetirlos en cada archivo; cada pantalla solo agrega lo suyo.
export const ESTILOS_FORM = {
  container: { flex: 1, backgroundColor: COLORES.fondo },
  label: { fontSize: 13, fontFamily: FUENTE_CUERPO_600, color: COLORES.muted, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: COLORES.superficie, color: COLORES.tinta, borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 12, padding: 12, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  fila: { flexDirection: 'row', gap: 10 },
  filaItem: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORES.superficie, borderWidth: 1, borderColor: COLORES.bordeFuerte, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActivo: { backgroundColor: COLORES.acento, borderColor: COLORES.acento },
  chipText: { fontSize: 13, fontFamily: FUENTE_CUERPO_600, color: COLORES.muted },
  chipTextActivo: { color: '#FFFFFF' },
  vacio: { color: COLORES.muted, fontSize: 13 },
  btn: { backgroundColor: COLORES.acento, borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 28, marginBottom: 40 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: FUENTE_CUERPO_600 },
};
