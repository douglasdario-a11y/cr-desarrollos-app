import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ShareMenu from 'react-native-share';

// Comparte texto (descripción, ubicación, resumen de la propiedad) con el
// menú nativo de compartir (WhatsApp, Gmail, SMS, etc.)
export async function compartirTexto(mensaje) {
  await Share.share({ message: mensaje });
}

// Descarga un archivo remoto (foto/video/documento en R2) a una carpeta
// temporal del celular — el menú nativo de compartir necesita el archivo
// en el dispositivo, no puede compartir directo una URL de internet.
async function descargarTemporal(url) {
  const nombre = url.split('/').pop().split('?')[0];
  const destino = `${FileSystem.cacheDirectory}${nombre}`;
  const info = await FileSystem.getInfoAsync(destino);
  if (!info.exists) {
    await FileSystem.downloadAsync(url, destino);
  }
  return destino;
}

// Comparte un solo archivo (una foto, un documento).
export async function compartirArchivo(url) {
  const local = await descargarTemporal(url);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(local);
  }
}

// Comparte varios archivos a la vez (todas las fotos de una propiedad) en
// un solo menú de compartir — requiere react-native-share porque expo-sharing
// solo soporta un archivo por vez.
export async function compartirArchivos(urls) {
  const locales = await Promise.all(urls.map(descargarTemporal));
  await ShareMenu.open({ urls: locales.map(uri => `file://${uri.replace('file://', '')}`) });
}
