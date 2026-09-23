import AsyncStorage from '@react-native-async-storage/async-storage';

export const API = 'https://cr-desarrollos-backend-production.up.railway.app';

// Empresa recordada en este dispositivo, para no pedirla de nuevo en cada
// login — solo el PIN, como antes. Se guarda al iniciar sesión o registrarse.
export async function getEmpresa() {
  const raw = await AsyncStorage.getItem('empresa');
  return raw ? JSON.parse(raw) : null;
}

export async function saveEmpresa(empresa) {
  await AsyncStorage.setItem('empresa', JSON.stringify(empresa));
}
