import { datos, guardarVarios, guardarPerfil, nuevoId } from './db.js';
import { mesActual, hoyISO, diasDelMes } from './util.js';

const CATEGORIAS_BASE = [
  ['Supermercado', '🛒'], ['Comida fuera', '🍔'], ['Transporte', '🚗'], ['Hogar', '🏠'],
  ['Salud', '💊'], ['Entretención', '🎬'], ['Ropa', '👕'], ['Regalos', '🎁'],
  ['Suscripciones', '📺'], ['Viajes', '✈️'], ['Otros', '📦'],
];

// Crea las categorías por defecto la primera vez que alguien abre la app.
export async function sembrarCategorias() {
  if (datos.categorias.length) return;
  const filas = CATEGORIAS_BASE.map(([nombre, icono], orden) => ({ id: nuevoId(), nombre, icono, tipo: 'gasto', tope_mensual: 0, orden }));
  filas.push({ id: nuevoId(), nombre: 'Sueldo', icono: '💼', tipo: 'ingreso', tope_mensual: 0, orden: 100 });
  filas.push({ id: nuevoId(), nombre: 'Otros ingresos', icono: '💰', tipo: 'ingreso', tope_mensual: 0, orden: 101 });
  await guardarVarios('categorias', filas);
}

// Datos ficticios para probar la app (Ajustes → "Cargar ejemplo").
export async function cargarEjemplo() {
  await sembrarCategorias();
  const cat = nombre => datos.categorias.find(c => c.nombre === nombre)?.id;
  const topes = { 'Supermercado': 280000, 'Comida fuera': 90000, 'Transporte': 80000, 'Entretención': 40000, 'Ropa': 30000, 'Regalos': 30000, 'Otros': 40000 };
  await guardarVarios('categorias', datos.categorias.filter(c => topes[c.nombre]).map(c => ({ ...c, tope_mensual: topes[c.nombre] })));

  await guardarPerfil({ ingreso_mensual: 1800000, meta_ahorro: 50000, presupuesto_deudas: 335000 });

  const deudas = [
    { id: nuevoId(), nombre: 'Tarjeta CMR', acreedor: 'Falabella', saldo: 1200000, cuota_mensual: 85000, cae: 45, dia_pago: 5, cupo_total: 1500000 },
    { id: nuevoId(), nombre: 'Crédito de consumo', acreedor: 'Banco', saldo: 3500000, cuota_mensual: 160000, cae: 22, dia_pago: 10 },
    { id: nuevoId(), nombre: 'Línea de crédito', acreedor: 'Banco', saldo: 600000, cuota_mensual: 40000, cae: 30, dia_pago: 1 },
  ];
  await guardarVarios('deudas', deudas);

  const mes = mesActual();
  await guardarVarios('compromisos', [
    { id: nuevoId(), nombre: 'Arriendo', monto: 450000, dia_pago: 5, categoria_id: cat('Hogar'), activo: true, pagados: [mes] },
    { id: nuevoId(), nombre: 'Gastos comunes', monto: 60000, dia_pago: 10, categoria_id: cat('Hogar'), activo: true, pagados: [mes] },
    { id: nuevoId(), nombre: 'Internet y celular', monto: 35000, dia_pago: 15, categoria_id: cat('Suscripciones'), activo: true, pagados: [] },
    { id: nuevoId(), nombre: 'Luz y agua', monto: 45000, dia_pago: 20, categoria_id: cat('Hogar'), activo: true, pagados: [] },
    { id: nuevoId(), nombre: 'Spotify', monto: 6590, dia_pago: 25, categoria_id: cat('Suscripciones'), activo: true, pagados: [] },
  ]);

  const evento = { id: nuevoId(), nombre: 'Matrimonio', palabras: 'matri, boda, casamiento, fiesta', activo: true };
  await guardarVarios('eventos', [evento]);

  const hoy = Number(hoyISO().slice(8));
  const ultimo = Math.min(hoy, diasDelMes(mes));
  const fecha = d => `${mes}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
  const g = (dia, monto, comercio, categoria, extra = {}) => ({
    id: nuevoId(), fecha: fecha(dia), monto, tipo: 'gasto', comercio, descripcion: '', categoria_id: cat(categoria), origen: 'manual', estado: 'clasificado', ...extra,
  });
  await guardarVarios('movimientos', [
    { id: nuevoId(), fecha: fecha(1), monto: 1800000, tipo: 'ingreso', comercio: '', descripcion: 'Sueldo', categoria_id: cat('Sueldo'), origen: 'manual', estado: 'clasificado' },
    g(1, 64300, 'LIDER EXPRESS', 'Supermercado'),
    g(2, 12990, 'UBER', 'Transporte', { descripcion: 'uber al aeropuerto para lo del matri', evento_id: evento.id }),
    g(3, 8900, 'STARBUCKS', 'Comida fuera'),
    g(4, 35000, 'COPEC', 'Transporte'),
    g(5, 89000, 'JUMBO', 'Supermercado'),
    g(6, 120000, 'FALABELLA', 'Regalos', { descripcion: 'regalo para los padrinos del matri', evento_id: evento.id }),
    g(7, 18500, 'SUSHI HOME', 'Comida fuera'),
    g(8, 4590, 'CRUZ VERDE', 'Salud'),
    g(9, 15990, 'CINEMARK', 'Entretención'),
    g(10, 52000, 'UNIMARC', 'Supermercado'),
    g(11, 22400, 'PEDIDOSYA', 'Comida fuera'),
    g(12, 9800, 'UBER', 'Transporte'),
    { ...g(12, 27990, 'MERCADOPAGO*TIENDA', null), categoria_id: null, origen: 'correo', estado: 'pendiente' },
    { ...g(12, 6200, 'COMERCIO 4521', null), categoria_id: null, origen: 'correo', estado: 'pendiente' },
  ]);
}
