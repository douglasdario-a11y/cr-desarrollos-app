import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAP_KEY = 'clienteContactMap';

async function leerMapa() {
  const raw = await AsyncStorage.getItem(MAP_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function guardarMapa(mapa) {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(mapa));
}

// Crea o actualiza el contacto nativo del teléfono para que quede alineado
// con los datos del cliente en el CRM. Falla en silencio: la sincronización
// con la agenda nunca debe bloquear el guardado del cliente.
export async function sincronizarContacto(clienteId, nombre, telefono) {
  if (!clienteId || !nombre || !telefono) return;
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return;

    const mapa = await leerMapa();
    const contactId = mapa[clienteId];
    const partes = nombre.trim().split(' ');
    const campos = {
      [Contacts.Fields.FirstName]: partes[0] || nombre,
      [Contacts.Fields.LastName]: partes.slice(1).join(' '),
      [Contacts.Fields.PhoneNumbers]: [{ number: telefono, isPrimary: true, label: 'mobile' }],
      [Contacts.Fields.Company]: 'CR Desarrollos Inmobiliarios',
    };

    if (contactId) {
      try {
        await Contacts.updateContactAsync({ id: contactId, ...campos });
        return;
      } catch (e) {
        // el contacto ya no existe en el teléfono (lo borraron a mano): se crea uno nuevo
      }
    }

    const nuevoId = await Contacts.addContactAsync(campos);
    mapa[clienteId] = nuevoId;
    await guardarMapa(mapa);
  } catch (e) {
    // sin permiso o sin agenda disponible: se ignora
  }
}

export async function borrarContactoVinculado(clienteId) {
  try {
    const mapa = await leerMapa();
    const contactId = mapa[clienteId];
    if (!contactId) return;
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      await Contacts.deleteContactAsync(contactId).catch(() => {});
    }
    delete mapa[clienteId];
    await guardarMapa(mapa);
  } catch (e) {
    // sin permiso o sin agenda disponible: se ignora
  }
}

// Abre el selector nativo de contactos y devuelve { nombre, telefono } o null si se canceló.
export async function elegirDeContactos() {
  try {
    const contacto = await Contacts.presentContactPickerAsync();
    if (!contacto) return null;
    const nombre = contacto.name || [contacto.firstName, contacto.lastName].filter(Boolean).join(' ');
    const telefono = contacto.phoneNumbers?.[0]?.number || '';
    return { nombre, telefono };
  } catch (e) {
    return null;
  }
}
