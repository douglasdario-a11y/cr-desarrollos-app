import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './api';

// Sube un archivo local (foto/video/documento) directo a R2 usando una URL
// prefirmada que pide el backend — el archivo nunca pasa por el servidor.
export async function subirArchivo({ propiedadId, uri, tipo, contentType }) {
  const token = await AsyncStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const resSolicitud = await fetch(`${API}/propiedades/${propiedadId}/media/solicitar-subida`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tipo, content_type: contentType }),
  });
  const solicitud = await resSolicitud.json();
  if (!resSolicitud.ok) throw new Error(solicitud.error || 'No se pudo iniciar la subida');

  const archivo = await fetch(uri);
  const blob = await archivo.blob();
  const resSubida = await fetch(solicitud.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!resSubida.ok) throw new Error('No se pudo subir el archivo');

  const resConfirmar = await fetch(`${API}/propiedades/${propiedadId}/media/confirmar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ key: solicitud.key, tipo }),
  });
  const media = await resConfirmar.json();
  if (!resConfirmar.ok) throw new Error(media.error || 'No se pudo guardar el archivo');
  return media;
}
