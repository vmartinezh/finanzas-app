import { datos, guardar, borrar } from '../db.js';
import { clasificar, aprender } from '../clasificador.js';
import { abrirFormulario, avisar, ejecutar } from '../ui.js';
import { clp, clpVisible, esc, hoyISO, mesActual, mesDe, nombreMes, sumarMeses, fechaCorta } from '../util.js';

export const titulo = 'Gastos';

let mesVisto = mesActual();
let filtro = 'todos';

const FILTROS = [['todos', 'Todos'], ['pendientes', 'Por revisar'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['eventos', 'Eventos']];

export function render() {
  const lista = datos.movimientos
    .filter(m => mesDe(m.fecha) === mesVisto)
    .filter(m => ({
      todos: true,
      pendientes: m.estado === 'pendiente',
      gastos: m.tipo === 'gasto',
      ingresos: m.tipo === 'ingreso',
      eventos: !!m.evento_id,
    })[filtro])
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const porFecha = new Map();
  for (const m of lista) {
    if (!porFecha.has(m.fecha)) porFecha.set(m.fecha, []);
    porFecha.get(m.fecha).push(m);
  }

  const totalGastos = lista.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);

  return `
    <div class="selector-mes">
      <button class="boton-icono" data-mes="-1" aria-label="Mes anterior">‹</button>
      <h2>${esc(nombreMes(mesVisto))}</h2>
      <button class="boton-icono" data-mes="1" aria-label="Mes siguiente" ${mesVisto >= mesActual() ? 'disabled' : ''}>›</button>
    </div>
    <div class="chips" role="group" aria-label="Filtrar">
      ${FILTROS.map(([v, t]) => `<button class="chip" data-filtro="${v}" aria-pressed="${filtro === v}">${t}</button>`).join('')}
    </div>
    <p class="resumen-lista">${lista.length} movimientos · ${clp(totalGastos)} en gastos</p>
    ${lista.length ? [...porFecha].map(([fecha, movs]) => `
      <h3 class="separador-fecha">${esc(fechaCorta(fecha))}</h3>
      <ul class="lista">${movs.map(filaMovimiento).join('')}</ul>`).join('')
    : `<div class="vacio">No hay movimientos ${filtro === 'todos' ? 'este mes' : 'con este filtro'}.<br>Usa el botón <b>+</b> para agregar uno.</div>`}
  `;
}

export function filaMovimiento(m) {
  const cat = datos.categorias.find(c => c.id === m.categoria_id);
  const evento = datos.eventos.find(e => e.id === m.evento_id);
  const nombre = m.descripcion || m.comercio || cat?.nombre || 'Sin descripción';
  const detalle = [
    m.estado === 'pendiente' ? '<span class="etiqueta pendiente">Por revisar</span>' : esc(cat?.nombre || 'Sin categoría'),
    m.comercio && m.descripcion ? esc(m.comercio) : '',
    evento ? `<span class="etiqueta evento">${esc(evento.nombre)}</span>` : '',
    // Llegó solo, desde el aviso de compra del banco (fase 2).
    m.origen === 'correo' ? 'del correo' : '',
  ].filter(Boolean).join(' · ');
  return `<li>
    <button class="fila" data-mov="${m.id}">
      <span class="icono-cat" aria-hidden="true">${esc(cat?.icono || (m.estado === 'pendiente' ? '❔' : '•'))}</span>
      <span class="fila-texto"><b>${esc(nombre)}</b><small>${detalle}</small></span>
      <span class="monto ${m.tipo}">${m.tipo === 'ingreso' ? '+' : ''}${clp(m.monto)}</span>
    </button>
  </li>`;
}

export function montar(raiz, refrescar) {
  raiz.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
    mesVisto = sumarMeses(mesVisto, Number(b.dataset.mes));
    refrescar();
  }));
  raiz.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    refrescar();
  }));
  montarFilas(raiz, refrescar);
}

export function montarFilas(raiz, refrescar) {
  raiz.querySelectorAll('[data-mov]').forEach(b => b.addEventListener('click', () => {
    const mov = datos.movimientos.find(m => m.id === b.dataset.mov);
    if (mov.estado === 'pendiente') darContexto(mov, refrescar);
    else editarMovimiento(mov, refrescar);
  }));
}

// Para compras que llegaron solas: escribes qué fue y la app la clasifica.
export async function darContexto(mov, refrescar) {
  const valores = await abrirFormulario({
    titulo: '¿Qué fue esta compra?',
    intro: `<b>${esc(clpVisible(mov.monto))}</b> en <b>${esc(mov.comercio || 'comercio desconocido')}</b> · ${esc(fechaCorta(mov.fecha))}`,
    campos: [{ nombre: 'descripcion', etiqueta: 'Cuéntame en tus palabras', tipo: 'textarea', placeholder: 'ej: uber al aeropuerto para lo del matri', requerido: true }],
    textoGuardar: 'Listo',
  });
  if (!valores) return;

  const guess = clasificar({ comercio: mov.comercio, descripcion: valores.descripcion });
  if (!guess.categoria_id) {
    // No supimos: abrimos el formulario completo con lo que escribió.
    return editarMovimiento({ ...mov, descripcion: valores.descripcion, evento_id: guess.evento_id }, refrescar);
  }
  const cat = datos.categorias.find(c => c.id === guess.categoria_id);
  const evento = datos.eventos.find(e => e.id === guess.evento_id);
  await ejecutar(async () => {
    await guardar('movimientos', { ...mov, descripcion: valores.descripcion, categoria_id: guess.categoria_id, evento_id: guess.evento_id || mov.evento_id || null, estado: 'clasificado' });
    await aprender(mov.comercio, guess.categoria_id);
  }, `Ah, corresponde a ${cat.icono} ${cat.nombre}${evento ? ' · ' + evento.nombre : ''}`, refrescar);
}

export async function editarMovimiento(mov, refrescar) {
  const nuevo = !mov?.id;
  const m = mov || { tipo: 'gasto', fecha: hoyISO() };

  const categorias = datos.categorias.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const opcionesCat = [
    ['', nuevo ? 'Adivinar según lo que escriba' : 'Sin categoría'],
    ...categorias.filter(c => c.tipo !== 'ingreso').map(c => [c.id, `${c.icono} ${c.nombre}`]),
    ...categorias.filter(c => c.tipo === 'ingreso').map(c => [c.id, `${c.icono} ${c.nombre} (ingreso)`]),
  ];
  const opcionesPago = [
    ['', 'No, es un gasto del día a día'],
    ...datos.compromisos.filter(c => c.activo !== false).map(c => ['c:' + c.id, `Pago fijo: ${c.nombre}`]),
    ...datos.deudas.filter(d => d.saldo > 0 || d.id === m.deuda_id).map(d => ['d:' + d.id, `Pago de deuda: ${d.nombre}`]),
  ];

  const valores = await abrirFormulario({
    titulo: nuevo ? 'Nuevo movimiento' : 'Editar movimiento',
    puedeBorrar: !nuevo,
    campos: [
      { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', valor: m.tipo, opciones: [['gasto', 'Gasto'], ['ingreso', 'Ingreso']] },
      { nombre: 'monto', etiqueta: 'Monto ($)', tipo: 'monto', valor: m.monto, requerido: true },
      { nombre: 'descripcion', etiqueta: '¿Qué fue?', tipo: 'text', valor: m.descripcion, placeholder: 'ej: almuerzo con la Cata' },
      { nombre: 'categoria_id', etiqueta: 'Categoría', tipo: 'select', valor: m.categoria_id || '', opciones: opcionesCat },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', valor: m.fecha, requerido: true },
      { nombre: 'comercio', etiqueta: 'Comercio (opcional)', tipo: 'text', valor: m.comercio },
      { nombre: 'evento_id', etiqueta: 'Evento (opcional)', tipo: 'select', valor: m.evento_id || '', opciones: [['', 'Ninguno'], ...datos.eventos.filter(e => e.activo !== false || e.id === m.evento_id).map(e => [e.id, e.nombre])] },
      { nombre: 'pago', etiqueta: '¿Es un pago planificado?', tipo: 'select', valor: m.compromiso_id ? 'c:' + m.compromiso_id : m.deuda_id ? 'd:' + m.deuda_id : '', opciones: opcionesPago, ayuda: 'Los pagos fijos y de deudas ya están descontados del disponible, así que no se cuentan dos veces.' },
    ],
  });

  if (!valores) return;
  if (valores === 'borrar') return ejecutar(() => borrar('movimientos', m.id), 'Movimiento borrado', refrescar);

  const { pago, ...resto } = valores;
  const fila = {
    ...m, ...resto,
    monto: Math.round(resto.monto || 0),
    compromiso_id: pago?.startsWith('c:') ? pago.slice(2) : null,
    deuda_id: pago?.startsWith('d:') ? pago.slice(2) : null,
    origen: m.origen || 'manual',
  };

  let mensaje = nuevo ? 'Movimiento guardado' : 'Cambios guardados';
  if (!fila.categoria_id && fila.tipo === 'gasto') {
    const guess = clasificar(fila);
    if (guess.categoria_id) {
      fila.categoria_id = guess.categoria_id;
      const cat = datos.categorias.find(c => c.id === guess.categoria_id);
      mensaje = `Guardado en ${cat.icono} ${cat.nombre} (${guess.motivo})`;
    }
    if (guess.evento_id && !fila.evento_id) fila.evento_id = guess.evento_id;
  }
  fila.estado = fila.categoria_id || fila.tipo === 'ingreso' ? 'clasificado' : 'pendiente';

  let deudaTerminada = null;
  await ejecutar(async () => {
    await guardar('movimientos', fila);
    if (fila.comercio && fila.categoria_id) await aprender(fila.comercio, fila.categoria_id);

    // Un pago nuevo de compromiso lo marca como pagado ese mes.
    if (fila.compromiso_id && (nuevo || fila.compromiso_id !== m.compromiso_id)) {
      const c = datos.compromisos.find(x => x.id === fila.compromiso_id);
      const mes = mesDe(fila.fecha);
      if (c && !(c.pagados || []).includes(mes)) await guardar('compromisos', { ...c, pagados: [...(c.pagados || []), mes] });
    }
    // Un pago nuevo de deuda baja el saldo (después lo puedes ajustar con la cartola).
    if (fila.deuda_id && (nuevo || fila.deuda_id !== m.deuda_id)) {
      const d = datos.deudas.find(x => x.id === fila.deuda_id);
      const saldo = Math.max(0, (d?.saldo || 0) - fila.monto);
      if (d) await guardar('deudas', { ...d, saldo });
      if (d?.saldo > 0 && saldo === 0) deudaTerminada = d;
    }
  }, mensaje, refrescar);

  if (deudaTerminada) return avisar(`Terminaste de pagar ${deudaTerminada.nombre}.`, 'logro');
  if (fila.estado === 'pendiente' && fila.tipo === 'gasto') avisar('Guardado. Quedó "por revisar" porque no supe la categoría.');
}
