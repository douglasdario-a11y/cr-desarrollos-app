// Lista central de amenidades tipo "casilla" — un solo lugar para agregar
// una nueva (icono + etiqueta + llave en el JSON de caracteristicas) y que
// aparezca tanto en el formulario como en la ficha de la propiedad.
export const AMENIDADES = [
  { key: 'terraza', label: 'Terraza', icon: 'table-chair' },
  { key: 'patio_jardin_trasero', label: 'Patio / jardín trasero', icon: 'grass' },
  { key: 'jardin_frontal', label: 'Jardín frontal', icon: 'flower' },
  { key: 'sala', label: 'Sala', icon: 'sofa' },
  { key: 'comedor', label: 'Comedor', icon: 'silverware-fork-knife' },
  { key: 'walk_in_closet', label: 'Walk-in closet', icon: 'wardrobe' },
  { key: 'jacuzzi', label: 'Jacuzzi', icon: 'hot-tub' },
  { key: 'piscina', label: 'Piscina', icon: 'pool' },
];

export const COCINA_OPCIONES = [
  { value: 'integrada', label: 'Integrada' },
  { value: 'independiente', label: 'Independiente' },
];

export function fmtColones(n) {
  if (n == null || n === '') return null;
  return `₡${Math.round(Number(n)).toLocaleString('es-CR')}`;
}

export function fmtM2(n) {
  if (n == null || n === '') return null;
  return `${Number(n).toLocaleString('es-CR')} m²`;
}
