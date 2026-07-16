import AsyncStorage from '@react-native-async-storage/async-storage';
// API "legacy" — ver utils/compartir.js, es la que conserva uploadAsync tal
// como lo necesitamos aquí.
import * as FileSystem from 'expo-file-system/legacy';
import { API } from './api';

// Sube un archivo local (foto/video/documento) directo a R2 usando una URL
// prefirmada que pide el backend — el archivo nunca pasa por el servidor.
export async function subirArchivo({ propiedadId, uri, tipo, contentType, esPrincipal }) {
  const token = await AsyncStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const resSolicitud = await fetch(`${API}/propiedades/${propiedadId}/media/solicitar-subida`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tipo, content_type: contentType }),
  });
  const solicitud = await resSolicitud.json();
  if (!resSolicitud.ok) throw new Error(solicitud.error || 'No se pudo iniciar la subida');

  // FileSystem.uploadAsync sube el archivo directo desde el disco del
  // celular sin cargarlo entero en memoria de JavaScript — con fetch()+blob()
  // un video pesado podía tumbar la app por falta de memoria sin ni siquiera
  // mostrar un error (Douglas lo reportó: "se cerró la app" al subir video).
  const resSubida = await FileSystem.uploadAsync(solicitud.uploadUrl, uri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': contentType },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (resSubida.status < 200 || resSubida.status >= 300) throw new Error('No se pudo subir el archivo');

  const resConfirmar = await fetch(`${API}/propiedades/${propiedadId}/media/confirmar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key: solicitud.key, tipo, es_principal: !!esPrincipal }),
  });
  const media = await resConfirmar.json();
  if (!resConfirmar.ok) throw new Error(media.error || 'No se pudo guardar el archivo');
  return media;
}
