// Misma lista que el panel web (utils/caracteristicas.js) — un solo lugar
// para agregar un espacio nuevo y que aparezca en formulario + ficha.

// Espacios: características físicas de la casa, misma jerarquía que
// habitaciones/baños/vehículos (se muestran en la cuadrícula de datos).
export const ESPACIOS = [
  { key: 'terraza', label: 'Terraza', icon: 'table-chair' },
  { key: 'patio_jardin_trasero', label: 'Patio / jardín trasero', icon: 'grass' },
  { key: 'jardin_frontal', label: 'Jardín frontal', icon: 'flower' },
  { key: 'sala', label: 'Sala', icon: 'sofa' },
  { key: 'comedor', label: 'Comedor', icon: 'silverware-fork-knife' },
  { key: 'walk_in_closet', label: 'Walk-in closet', icon: 'wardrobe' },
];

// Ícono genérico para espacios que se escriben a mano (no están en la lista
// fija de arriba) — ej: bodega, ático, cuarto de pilas...
export const ICONO_ESPACIO_PERSONALIZADO = 'tag-outline';

export function espaciosPersonalizados(c) {
  return Array.isArray(c.espacios_personalizados) ? c.espacios_personalizados : [];
}

export const COCINA_OPCIONES = [
  { value: 'integrada', label: 'Integrada' },
  { value: 'independiente', label: 'Independiente' },
];

// Amenidades: extras especiales de la casa o del condominio (piscina, cine,
// gimnasio...) — no es una lista fija, se escribe la que aplique en cada
// propiedad. Estas son solo sugerencias rápidas para no tener que escribir
// las más comunes.
export const AMENIDADES_SUGERIDAS = ['Piscina', 'Jacuzzi', 'Gimnasio', 'Cine', 'Área social', 'Zona de juegos', 'Salón de eventos'];

// Propiedades creadas antes de este cambio guardaban piscina/jacuzzi como
// casillas fijas (caracteristicas.piscina/jacuzzi = true) en vez de texto
// libre. Esto arma la lista efectiva de amenidades a partir de cualquiera
// de los dos formatos, para no perder esos datos ya guardados.
export function amenidadesEfectivas(c) {
  if (Array.isArray(c.amenidades)) return c.amenidades;
  const legado = [];
  if (c.piscina) legado.push('Piscina');
  if (c.jacuzzi) legado.push('Jacuzzi');
  return legado;
}

export function fmtColones(n) {
  if (n == null || n === '') return null;
  return `₡${Math.round(Number(n)).toLocaleString('es-CR')}`;
}

export function fmtM2(n) {
  if (n == null || n === '') return null;
  return `${Number(n).toLocaleString('es-CR')} m²`;
}
