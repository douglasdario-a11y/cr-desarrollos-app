// Etapas del embudo de venta para un cliente interesado en una propiedad.
export const ETAPAS_CLIENTE = [
  { value: 'contactado', label: 'Contactado' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'pidio_fotos', label: 'Pidió fotos' },
  { value: 'pidio_docs', label: 'Pidió documentos' },
  { value: 'visita_agendada', label: 'Visita agendada' },
  { value: 'visita_hecha', label: 'Visita hecha' },
  { value: 'seguimiento', label: 'En seguimiento' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'perdido', label: 'Perdido' },
];

export function etapaLabel(value) {
  return ETAPAS_CLIENTE.find(e => e.value === value)?.label || value;
}

export const ESTADOS_CITA = [
  { value: 'pendiente', label: 'Pendiente', color: '#b8860b' },
  { value: 'confirmada', label: 'Confirmada', color: '#1a6b3a' },
  { value: 'hecha', label: 'Hecha', color: '#3d1f0a' },
  { value: 'cancelada', label: 'Cancelada', color: '#b3261e' },
];

export function estadoCita(value) {
  return ESTADOS_CITA.find(e => e.value === value) || ESTADOS_CITA[0];
}

// citas.fecha_hora se guarda como "YYYY-MM-DDTHH:MM" (hora local de Costa
// Rica, sin zona horaria) para no complicarse con conversiones — se separa
// y se junta tal cual en los inputs date/time del formulario.
export function partirFechaHora(fechaHora) {
  if (!fechaHora) return { fecha: '', hora: '' };
  const [fecha, hora] = fechaHora.split('T');
  return { fecha: fecha || '', hora: (hora || '').slice(0, 5) };
}

export function fmtFechaHora(fechaHora) {
  if (!fechaHora) return '';
  const { fecha, hora } = partirFechaHora(fechaHora);
  const [anio, mes, dia] = fecha.split('-');
  if (!anio) return fechaHora;
  const fechaTexto = `${dia}/${mes}/${anio}`;
  return hora ? `${fechaTexto} ${hora}` : fechaTexto;
}
