import * as Calendar from 'expo-calendar/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_KEY = 'citaEventMap';
const CAL_KEY = 'calendarioDestinoId';

async function leerMapa() {
  const raw = await AsyncStorage.getItem(MAP_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function guardarMapa(mapa) {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(mapa));
}

// Elige a qué calendario del teléfono escribir los eventos: prioriza uno de
// Google (para que la sincronización con Google Calendar la haga el propio
// Android), y recuerda la elección para no volver a preguntar cada vez.
async function obtenerCalendarioDestino() {
  const guardadoId = await AsyncStorage.getItem(CAL_KEY);
  const calendarios = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (guardadoId && calendarios.some(c => c.id === guardadoId && c.allowsModifications)) {
    return guardadoId;
  }
  const modificables = calendarios.filter(c => c.allowsModifications);
  const preferido =
    modificables.find(c => (c.source?.name || '').toLowerCase().includes('google')) ||
    modificables.find(c => c.isPrimary) ||
    modificables[0];
  if (!preferido) return null;
  await AsyncStorage.setItem(CAL_KEY, preferido.id);
  return preferido.id;
}

// Crea o actualiza el evento de calendario que corresponde a una cita.
// Devuelve { ok: true } o { error } para poder avisar si algo falló.
export async function sincronizarCita(citaId, { titulo, notas, fecha }) {
  if (!citaId || !fecha) return { error: 'Faltan datos de la cita.' };
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      return { error: 'No se concedió permiso para acceder al calendario.' };
    }
    const calendarId = await obtenerCalendarioDestino();
    if (!calendarId) {
      return { error: 'El teléfono no tiene ningún calendario disponible para escribir.' };
    }

    const inicio = new Date(fecha);
    const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
    const detalles = {
      title: titulo,
      notes: notas || '',
      startDate: inicio,
      endDate: fin,
      timeZone: 'America/Costa_Rica',
    };

    const mapa = await leerMapa();
    const eventoId = mapa[citaId];
    if (eventoId) {
      try {
        await Calendar.updateEventAsync(eventoId, detalles);
        return { ok: true };
      } catch (e) {
        // el evento ya no existe en el calendario (lo borraron a mano): se crea uno nuevo
      }
    }

    const nuevoId = await Calendar.createEventAsync(calendarId, detalles);
    mapa[citaId] = nuevoId;
    await guardarMapa(mapa);
    return { ok: true };
  } catch (e) {
    return { error: e.message || 'No se pudo sincronizar con el calendario.' };
  }
}

export async function borrarCitaVinculada(citaId) {
  try {
    const mapa = await leerMapa();
    const eventoId = mapa[citaId];
    if (!eventoId) return;
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      await Calendar.deleteEventAsync(eventoId).catch(() => {});
    }
    delete mapa[citaId];
    await guardarMapa(mapa);
  } catch (e) {
    // sin permiso o sin calendario disponible: se ignora
  }
}
