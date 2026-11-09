// Catálogo de descuentos por día de las tarjetas más usadas en Chile.
//
// Se revisa a mano cada semana contra la página de beneficios de cada banco
// (el link de cada descuento es su ficha oficial) y se publica con un commit.
// Al revisar: actualiza REVISADO, borra lo vencido y agrega lo nuevo.
//
// dias: 1 = lunes … 7 = domingo. Vacío = todos los días.
// descuento: texto tal como lo anuncia el banco ("40%", "$100 por litro", "2x1").
// tope: descuento máximo en pesos, si el banco lo informa.
// hasta: último día de vigencia ('YYYY-MM-DD'); null si el banco no la publica.
import { normalizar } from './util.js';
// El mismo reconocimiento de bancos que usa el servidor con los avisos de compra.
import { bancoPorNombre } from '../supabase/functions/recibir-compra/bancos.js';
import { claveExacta } from './comercios.js';

export const REVISADO = '2026-11-09';

export const TARJETAS = [
  { id: 'santander', nombre: 'Santander', detalle: 'Tarjetas de crédito y débito Santander' },
  { id: 'banco-de-chile', nombre: 'Banco de Chile', detalle: 'También Banco Edwards' },
  { id: 'bci', nombre: 'Bci', detalle: 'Tarjetas de crédito y débito Bci' },
  { id: 'cmr', nombre: 'CMR Falabella', detalle: 'Banco Falabella' },
  { id: 'bancoestado', nombre: 'BancoEstado', detalle: 'Incluye CuentaRUT' },
  { id: 'scotiabank', nombre: 'Scotiabank', detalle: 'Tarjetas Scotiabank' },
  { id: 'cencosud', nombre: 'Tarjeta Cencosud', detalle: 'Cencosud Scotiabank' },
  { id: 'ripley', nombre: 'Banco Ripley', detalle: 'Tarjetas Ripley' },
  { id: 'itau', nombre: 'Itaú', detalle: 'Tarjetas de crédito Itaú' },
  { id: 'lider-bci', nombre: 'Lider Bci', detalle: 'Tarjeta Lider Bci' },
];

export const RUBROS = {
  'comida-rapida': '🍔', cafe: '☕', restaurante: '🍽️', delivery: '🛵',
  farmacia: '💊', cine: '🎬', bencina: '⛽', super: '🛒', mascotas: '🐾',
};

const SANTANDER = 'https://banco.santander.cl/beneficios/promociones/';
const CHILE = 'https://sitiospublicos.bancochile.cl/personas/beneficios/detalle/';
const BCI = 'https://www.bci.cl/beneficios/beneficios-bci/detalle/';
const CMR = 'https://www.bancofalabella.cl/descuentos/detalle/';
const ESTADO = 'https://www.bancoestado.cl/content/bancoestado-public/cl/es/home/home/todosuma---bancoestado-personas/todos-beneficios/';
const SCOTIA = 'https://www.scotiarewards.cl/scclubfront/categoria/mundos/descuentos';
const CENCOSUD = 'https://www.tarjetacencosud.cl/publico/beneficios/landing/';
const RIPLEY = 'https://www.bancoripley.cl/beneficios-y-promociones';
const ITAU = 'https://itaubeneficios.cl/';
const LIDER = 'https://www.liderbci.cl/descuentos';

export const BENEFICIOS = [
  // ── Santander ──
  { tarjeta: 'santander', comercio: 'Santa Brasa', rubro: 'restaurante', descuento: '50%', dias: [2], tope: 50000, hasta: '2026-11-30', nota: 'Solo con crédito American Express Santander, en el local de Alonso de Córdova (Vitacura).', fuente: SANTANDER + 'santa-brasa-3' },
  { tarjeta: 'santander', comercio: 'Petrizzio', rubro: 'restaurante', descuento: '25%', dias: [1, 2, 3, 6, 7], hasta: '2026-11-30', nota: 'Compras online.', fuente: SANTANDER + 'petrizzio' },
  { tarjeta: 'santander', comercio: 'Farmacias Knop', rubro: 'farmacia', descuento: '25%', dias: [2, 4], hasta: '2026-11-30', nota: 'Solo en productos PharmaKnop y Knop Laboratorios.', fuente: SANTANDER + 'farmacias-knop-2' },
  { tarjeta: 'santander', comercio: 'PedidosYa Market', rubro: 'delivery', descuento: '40%', dias: [], hasta: '2026-11-30', nota: 'Solo con crédito Santander, compras online.', fuente: SANTANDER + 'pedidosya-market' },
  { tarjeta: 'santander', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [1], hasta: '2026-11-30', fuente: SANTANDER + 'superzoo-2' },

  // ── Banco de Chile ──
  { tarjeta: 'banco-de-chile', comercio: 'Domino’s Pizza', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-12-31', fuente: CHILE + 'dominos-pizza' },
  { tarjeta: 'banco-de-chile', comercio: 'Mamut', rubro: 'restaurante', descuento: 'hasta 40%', dias: [2], hasta: '2026-12-31', fuente: CHILE + 'mamut' },
  { tarjeta: 'banco-de-chile', comercio: 'Doggis', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-12-31', fuente: CHILE + 'doggis' },
  { tarjeta: 'banco-de-chile', comercio: 'Juan Maestro', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-12-31', fuente: CHILE + 'juan-maestro' },
  { tarjeta: 'banco-de-chile', comercio: 'Tommy Beans', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-12-31', fuente: CHILE + 'tommy-beans' },
  { tarjeta: 'banco-de-chile', comercio: 'KFC', rubro: 'comida-rapida', descuento: '30%', dias: [4], hasta: '2026-12-31', fuente: CHILE + 'kfc' },
  { tarjeta: 'banco-de-chile', comercio: 'Wendy’s', rubro: 'comida-rapida', descuento: '30%', dias: [1], hasta: '2026-12-31', fuente: CHILE + 'wendy-dto' },
  { tarjeta: 'banco-de-chile', comercio: 'China Wok', rubro: 'comida-rapida', descuento: '30%', dias: [5], hasta: '2026-12-31', fuente: CHILE + 'china-wok' },
  { tarjeta: 'banco-de-chile', comercio: 'Dunkin’', rubro: 'cafe', descuento: '30%', dias: [1, 3], hasta: '2026-12-31', fuente: CHILE + 'dunkin-dto' },
  { tarjeta: 'banco-de-chile', comercio: 'Starbucks', rubro: 'cafe', descuento: '30%', dias: [5], hasta: '2026-12-31', fuente: CHILE + 'starbucks' },
  { tarjeta: 'banco-de-chile', comercio: 'Petrizzio', rubro: 'restaurante', descuento: '30%', dias: [4, 5], hasta: '2027-06-30', fuente: CHILE + 'petrizzio' },
  { tarjeta: 'banco-de-chile', comercio: 'Farmacias Cruz Verde', rubro: 'farmacia', descuento: '25%', dias: [1], hasta: '2027-02-15', nota: 'En medicamentos y vitaminas. En noviembre hay hasta 40% en productos seleccionados.', fuente: CHILE + 'farmacias-cruz-verde' },
  { tarjeta: 'banco-de-chile', comercio: 'Farmacias Knop', rubro: 'farmacia', descuento: 'hasta 20%', dias: [], hasta: '2027-08-31', fuente: CHILE + 'farmacias-knop' },
  { tarjeta: 'banco-de-chile', comercio: 'Cinépolis', rubro: 'cine', descuento: 'hasta 25%', dias: [], hasta: '2026-12-31', nota: 'En entradas.', fuente: CHILE + 'cinepolis' },

  // ── Bci ──
  { tarjeta: 'bci', comercio: 'Starbucks', rubro: 'cafe', descuento: '30%', dias: [1], hasta: '2026-12-31', fuente: BCI + 'tu-cafe-favorito-y-el-momento-perfecto-para-recargar-tu-dia.-8nywci7' },
  { tarjeta: 'bci', comercio: 'KFC', rubro: 'comida-rapida', descuento: '30%', dias: [1], hasta: '2026-12-31', nota: 'En el combo Chicken Share.', fuente: BCI + 'todos-los-lunes-en-combo-chicken-share-alitas-us5tjzf' },
  { tarjeta: 'bci', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-12-31', nota: 'Pidiendo en la app de McDonald’s.', fuente: BCI + 'todos-los-martes-en-tu-app-de-mcdonalds-nf4vg4m' },
  { tarjeta: 'bci', comercio: 'Juan Valdez', rubro: 'cafe', descuento: '40%', dias: [3], hasta: '2026-12-31', nota: 'Solo con crédito, en bebidas preparadas en barra.', fuente: BCI + '40-por-ciento-de-descuento-en-bebidas-preparadas-en-barra-5h1tty' },
  { tarjeta: 'bci', comercio: 'China Wok', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-12-31', nota: 'En el combo Wok 1 pollo teriyaki.', fuente: BCI + 'todos-los-miercoles-en-combo-wok-1-pollo-tereyaki-kr43pym' },
  { tarjeta: 'bci', comercio: 'Wendy’s', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-12-31', nota: 'En el combo Baconator doble.', fuente: BCI + 'todos-los-miercoles-en-combo-boconator-doble-zqw9icg' },
  { tarjeta: 'bci', comercio: 'Salcobrand', rubro: 'farmacia', descuento: '20%', dias: [], hasta: '2026-12-31', nota: 'En el primer artículo del programa MiSalcobrand, con crédito o débito Bci.', fuente: BCI + 'bienestar-y-cuidado-personal-para-ti-y-tu-familia.-todo-lo-que-necesitas-en-un-lugar.-y0nmflq' },
  { tarjeta: 'bci', comercio: 'Starbucks', rubro: 'cafe', descuento: '50%', dias: [2, 3, 4], hasta: '2026-11-30', nota: 'En bebidas en barra, solo con crédito Infinite, Signature, Black y Platinum.', fuente: BCI + '50-por-ciento-mgcj0mn' },
  { tarjeta: 'bci', comercio: 'Mamut', rubro: 'restaurante', descuento: '40%', dias: [5], tope: 30000, hasta: '2026-12-31', nota: 'Solo con crédito, compras presenciales.', fuente: BCI + 'viernes-presencial-v5scbgu' },
  { tarjeta: 'bci', comercio: 'Cinépolis', rubro: 'cine', descuento: '50%', dias: [4, 5, 6, 7], hasta: '2026-11-30', nota: 'En entradas 2D de sala tradicional, con crédito o débito Bci.', fuente: BCI + 'descuento-2d-43kx8sd' },
  { tarjeta: 'bci', comercio: 'Cinépolis', rubro: 'cine', descuento: '20%', dias: [], hasta: '2026-11-30', nota: 'En el Combo Bci (Box Pop y 2 bebidas medianas), solo con crédito, presencial.', fuente: BCI + 'combo-bci-xae6vxt' },
  { tarjeta: 'bci', comercio: 'Copec', rubro: 'bencina', descuento: '7% de cashback', dias: [4], hasta: '2026-12-31', nota: 'Solo con crédito, pagando en la App Copec. Tope diario de $7.000 de cashback.', fuente: BCI + 'mas-kilometros-y-mas-lucas-en-tu-bolsillo-desde-app-copec.-sx48lyr' },
  { tarjeta: 'bci', comercio: 'Unimarc', rubro: 'super', descuento: 'hasta 10% de cashback', dias: [], hasta: '2026-12-31', nota: 'Pagando con QR de la App Bci, presencial, en la primera compra del mes.', fuente: BCI + '10-por-ciento-de-cb-en-unimarc-en-tu-primera-compra-del-mes-y97xpdm' },
  { tarjeta: 'bci', comercio: 'PedidosYa Market', rubro: 'delivery', descuento: '30%', dias: [], tope: 8000, hasta: '2026-12-31', nota: 'Solo con crédito. Dos compras al mes.', fuente: BCI + 'tu-pedido-en-tu-casa-ya-no-tienes-que-ir-al-supermercado-con-pedidosya-hjjwl2' },

  // ── CMR Falabella ──
  { tarjeta: 'cmr', comercio: 'Doggis', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: '2026-11-30', nota: 'Con CMR o débito Banco Falabella, con los 6 primeros dígitos de la tarjeta como cupón.', fuente: CMR + 'doggis' },
  { tarjeta: 'cmr', comercio: 'Juan Maestro', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: '2026-11-30', nota: 'Con CMR o débito Banco Falabella, con los 6 primeros dígitos de la tarjeta como cupón.', fuente: CMR + 'juan-maestro' },
  { tarjeta: 'cmr', comercio: 'Tommy Beans', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: '2026-11-30', nota: 'Con CMR o débito Banco Falabella, con los 6 primeros dígitos de la tarjeta como cupón.', fuente: CMR + 'tommybeans' },
  { tarjeta: 'cmr', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: '2026-11-30', nota: 'En el combo del mes, en mesón y McAuto.', fuente: CMR + 'mccombodelmes' },
  { tarjeta: 'cmr', comercio: 'Dunkin’', rubro: 'cafe', descuento: '40%', dias: [2], hasta: '2026-11-30', nota: 'Con CMR o débito Banco Falabella, con los 6 primeros dígitos de la tarjeta como cupón.', fuente: CMR + 'dunkin' },
  { tarjeta: 'cmr', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-11-30', nota: 'Compras en el sitio web, sin tope.', fuente: CMR + 'papa-johns' },
  { tarjeta: 'cmr', comercio: 'Juan Valdez', rubro: 'cafe', descuento: '40%', dias: [5], hasta: '2026-11-30', nota: 'En bebidas preparadas en barra, solo presencial.', fuente: CMR + 'juan-valdez' },
  { tarjeta: 'cmr', comercio: 'Shell', rubro: 'bencina', descuento: '$100 por litro', dias: [3], hasta: '2026-11-30', nota: 'Solo con CMR, pagando en la App Shell. Hasta 2 cargas por cliente, de 70 litros cada una.', fuente: CMR + 'shell' },

  // ── BancoEstado ──
  { tarjeta: 'bancoestado', comercio: 'Doggis', rubro: 'comida-rapida', descuento: '30%', dias: [2], tope: 16000, hasta: '2026-12-31', fuente: ESTADO + 'doggis---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Juan Maestro', rubro: 'comida-rapida', descuento: '30%', dias: [2], tope: 16000, hasta: '2026-12-31', fuente: ESTADO + 'juan-maestro---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [2], tope: 10000, hasta: '2026-12-31', nota: 'Solo con crédito Visa BancoEstado.', fuente: 'https://www.bancoestado.cl/content/bancoestado-public/cl/es/home/home/todosuma---bancoestado-personas/un-mes-de-sabores---bancoestado-personas.html#just-burger' },
  { tarjeta: 'bancoestado', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '50%', dias: [], tope: 10000, hasta: '2026-11-30', nota: 'Compras online, solo con crédito Visa BancoEstado.', fuente: 'https://www.bancoestado.cl/content/bancoestado-public/cl/es/home/home/todosuma---bancoestado-personas/un-mes-de-sabores---bancoestado-personas.html#just-burger-online' },
  { tarjeta: 'bancoestado', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [3], hasta: '2026-12-31', fuente: ESTADO + 'superzoo---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Domino’s Pizza', rubro: 'comida-rapida', descuento: '40%', dias: [4], hasta: '2026-12-31', fuente: ESTADO + 'domino-s-pizza---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [7], hasta: '2026-11-29', fuente: ESTADO + 'burger-king---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '25%', dias: [7], hasta: '2026-12-27', nota: 'Solo con crédito Mastercard BancoEstado.', fuente: ESTADO + 'papa-john-s---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Farmacias Ahumada', rubro: 'farmacia', descuento: '30%', dias: [], hasta: '2026-11-30', fuente: ESTADO + 'farmacias-ahumada---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], hasta: '2026-11-30', nota: 'En la app. Con CuentaRUT, solo en PedidosYa Market.', fuente: ESTADO + 'pedidosya.html' },

  // ── Scotiabank ──
  { tarjeta: 'scotiabank', comercio: 'Copec', rubro: 'bencina', descuento: 'hasta $100 por litro', dias: [3], hasta: '2026-11-30', nota: 'Con crédito y débito, pagando con la App Copec. El descuento por litro varía según la tarjeta.', fuente: 'https://www.scotiarewards.cl/scclubfront/categoria/mundos/descuentos?beneficio=APPCOPECAON25' },
  { tarjeta: 'scotiabank', comercio: 'Shell', rubro: 'bencina', descuento: 'hasta $200 por litro', dias: [4], hasta: '2026-11-30', nota: 'Pagando por la app. El descuento por litro varía según la tarjeta.', fuente: 'https://www.scotiarewards.cl/scclubfront/categoria/mundos/descuentos?beneficio=APPSHELLAON26' },
  { tarjeta: 'scotiabank', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [7], hasta: '2026-11-30', nota: 'En la primera compra en superzoo.cl.', fuente: 'https://www.scotiarewards.cl/scclubfront/categoria/mundos/descuentos?beneficio=SUPERZOOAON26' },
  { tarjeta: 'scotiabank', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], tope: 4000, hasta: '2026-11-30', nota: 'Solo con crédito.', fuente: 'https://www.scotiarewards.cl/scclubfront/categoria/mundos/descuentos?beneficio=PEDIDOSYA30' },
  { tarjeta: 'scotiabank', comercio: 'Farmacias Cruz Verde', rubro: 'farmacia', descuento: '25%', dias: [4], hasta: '2026-11-30', nota: 'En medicamentos y vitaminas, siendo socio del Club Cruz Verde.', fuente: 'https://www.scotiarewards.cl/scclubfront/categoria/mundos/descuentos?beneficio=CRUZVERDEAON25' },

  // ── Tarjeta Cencosud Scotiabank ──
  { tarjeta: 'cencosud', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-11-30', nota: 'En la app de McDonald’s, solo con Mastercard.', fuente: CENCOSUD + 'mcdonalds' },

  { tarjeta: 'cencosud', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: '2026-11-30', nota: 'En locales Burger King y Auto King.', fuente: CENCOSUD + 'burger-king' },
  { tarjeta: 'cencosud', comercio: 'Copec', rubro: 'bencina', descuento: '$100 por litro', dias: [1], hasta: '2026-11-30', nota: 'Pagando en la App Copec.', fuente: CENCOSUD + 'copec' },
  { tarjeta: 'cencosud', comercio: 'Farmacias Cruz Verde', rubro: 'farmacia', descuento: '25%', dias: [4], hasta: '2026-11-30', nota: 'En medicamentos y vitaminas, solo socios del Club Cruz Verde.', fuente: CENCOSUD + 'cruz-verde' },
  { tarjeta: 'cencosud', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [5], hasta: '2026-11-30', fuente: CENCOSUD + 'pedidos-ya' },

  // ── Banco Ripley ──
  { tarjeta: 'ripley', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '50%', dias: [1, 2, 3], tope: 15000, hasta: '2026-11-30', nota: 'Pagando con Google Pay o Apple Pay, en compras sobre $3.500.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: '2026-11-30', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Aramco', rubro: 'bencina', descuento: '$100 por litro', dias: [3], hasta: '2026-11-30', nota: 'Hasta $150 para clientes Gold. Tope de $8.000 al mes.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Mamut', rubro: 'restaurante', descuento: '40%', dias: [4], tope: 15000, hasta: '2026-11-30', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '40%', dias: [4], hasta: '2026-11-30', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Cinépolis', rubro: 'cine', descuento: '2x1', dias: [5], hasta: '2026-11-30', nota: 'En entradas 2D y 3D, con el código de la app Banco Ripley. No aplica en festivos.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [6], hasta: '2026-11-30', nota: 'Solo en la primera compra web.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Farmacias Ahumada', rubro: 'farmacia', descuento: '20%', dias: [], tope: 10000, hasta: '2026-11-30', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Castaño', rubro: 'cafe', descuento: '30%', dias: [], tope: 10000, hasta: null, nota: 'Solo en locales.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], tope: 4000, hasta: '2026-11-30', nota: 'En restaurantes, con el código RIPLEYOCT26. Una compra al mes.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Unimarc', rubro: 'super', descuento: '6%', dias: [1], hasta: '2026-11-30', nota: '15% con Mastercard Black.', fuente: RIPLEY },

  // ── Itaú ──
  { tarjeta: 'itau', comercio: 'Cinépolis', rubro: 'cine', descuento: '2x1', dias: [3], hasta: '2026-11-30', nota: 'En salas VIP. Solo algunas tarjetas, como Legend y Black.', fuente: ITAU + 'tiempo-libre/cinepolis/' },
  { tarjeta: 'itau', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [6], tope: 20000, hasta: '2026-12-31', nota: 'Solo crédito Legend, Black, Signature y Blue.', fuente: ITAU + 'restaurantes/burger-king-2/' },

  // ── Lider Bci ──
  { tarjeta: 'lider-bci', comercio: 'KFC', rubro: 'comida-rapida', descuento: '30%', dias: [1], hasta: '2026-11-30', nota: 'En el combo Chicken Share Mixo.', fuente: LIDER + '/kfc' },
  { tarjeta: 'lider-bci', comercio: 'Starbucks', rubro: 'cafe', descuento: '30%', dias: [1], hasta: '2026-11-30', nota: 'En bebidas preparadas en barra, solo en locales.', fuente: LIDER + '/starbucks' },
  { tarjeta: 'lider-bci', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '30%', dias: [1, 5], tope: 15000, hasta: '2026-11-30', nota: 'En compras sobre $15.000.', fuente: LIDER + '/papa-johns' },
  { tarjeta: 'lider-bci', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-11-30', nota: 'En la app de McDonald’s, en compras sobre $12.000.', fuente: LIDER + '/mcdonalds' },
  { tarjeta: 'lider-bci', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [3], tope: 7000, hasta: '2026-11-30', nota: 'Solo en locales, en compras sobre $3.000.', fuente: LIDER + '/burger-king' },
  { tarjeta: 'lider-bci', comercio: 'China Wok', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-11-30', nota: 'En el combo Wok Pollo Teriyaki.', fuente: LIDER + '/china-wok' },
  { tarjeta: 'lider-bci', comercio: 'Wendy’s', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-11-30', nota: 'En el combo Baconator doble.', fuente: LIDER + '/wendys' },
  { tarjeta: 'lider-bci', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [4], tope: 10000, hasta: '2026-11-30', fuente: LIDER + '/just-burger' },
  { tarjeta: 'lider-bci', comercio: 'Cinépolis', rubro: 'cine', descuento: '50%', dias: [4, 5, 6, 7], hasta: '2026-11-30', nota: 'En entradas 2D, 2 cupones al mes.', fuente: LIDER + '/cinepolis' },
  { tarjeta: 'lider-bci', comercio: 'Salcobrand', rubro: 'farmacia', descuento: '20%', dias: [], hasta: '2026-11-30', nota: 'En la primera unidad de productos Mi Salcobrand, con la app de Salcobrand.', fuente: LIDER + '/salcobrand' },
  { tarjeta: 'lider-bci', comercio: 'Copec', rubro: 'bencina', descuento: '$100 por litro', dias: [2], hasta: '2026-11-30', nota: 'Pagando con la App Copec.', fuente: LIDER + '/copec' },
];

export const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Día de la semana de una fecha 'YYYY-MM-DD': 1 = lunes … 7 = domingo.
export function diaSemana(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  return new Date(a, m - 1, d).getDay() || 7;
}

// Para ordenar: el primer porcentaje del texto ("hasta 40%" → 40). Los que no
// son porcentaje ("$100 por litro", "2x1") quedan al final.
const valor = b => Number(/(\d+)%/.exec(b.descuento)?.[1] ?? 0);

// Una tarjeta del perfil es 'banco', 'banco:tipo' ('cmr:elite', ver
// js/tarjetas.js) y, si la persona los puso, con los últimos 4 dígitos
// ('cmr:elite#1234'): así se distinguen dos tarjetas iguales.
export const separarTarjeta = id => {
  const [resto, terminacion = null] = String(id).split('#');
  const [banco, tipo = null] = resto.split(':');
  return { banco, tipo, terminacion };
};

export const armarTarjeta = ({ banco, tipo = null, terminacion = null }) =>
  banco + (tipo ? `:${tipo}` : '') + (/^\d{4}$/.test(terminacion ?? '') ? `#${terminacion}` : '');

// Agrega una tarjeta a la lista del perfil. Si había una del mismo banco con
// menos datos (sin tipo, como las de antes de que existieran los tipos, o del
// mismo tipo sin los 4 dígitos), la completa en su lugar en vez de repetirla.
export function agregarTarjeta(lista, id) {
  if (lista.includes(id)) return lista;
  const nueva = separarTarjeta(id);
  const completa = t => {
    const vieja = separarTarjeta(t);
    return vieja.banco === nueva.banco && !vieja.terminacion && t !== id
      && (!vieja.tipo || (vieja.tipo === nueva.tipo && nueva.terminacion));
  };
  const i = lista.findIndex(completa);
  if (i >= 0) return lista.map((t, j) => (j === i ? id : t));
  return [...lista, id];
}

// Cambiar el tipo o los dígitos de una tarjeta: queda en su mismo lugar. Si
// la nueva ya estaba en la lista, queda una sola.
export function reemplazarTarjeta(lista, vieja, nueva) {
  if (vieja === nueva) return lista;
  if (lista.includes(nueva)) return lista.filter(t => t !== vieja);
  return lista.map(t => (t === vieja ? nueva : t));
}

// Para unir una deuda anotada con una de tus tarjetas: primero por los 4
// dígitos que aparezcan en su nombre; si no, por el banco, solo si tienes una
// sola tarjeta de ese banco (con dos, no adivina). null si no hay calce.
export function sugerirTarjeta(deuda, mias) {
  const texto = normalizar(`${deuda.nombre ?? ''} ${deuda.acreedor ?? ''}`);
  const porDigitos = mias.filter(t => {
    const { terminacion } = separarTarjeta(t);
    return terminacion && new RegExp(`(?<!\\d)${terminacion}(?!\\d)`).test(texto);
  });
  if (porDigitos.length === 1) return porDigitos[0];
  const banco = bancoPorNombre(texto);
  const delBanco = banco ? mias.filter(t => separarTarjeta(t).banco === banco) : [];
  return delBanco.length === 1 ? delBanco[0] : null;
}

// Los descuentos de tus tarjetas que sirven en una fecha: primero los que
// son solo de ese día (los que hay que aprovechar), después los de todos los
// días; dentro de cada grupo, los más altos primero.
export function beneficiosDelDia(tarjetas, fechaISO) {
  const dia = diaSemana(fechaISO);
  return vigentes(tarjetas, fechaISO)
    .filter(b => !b.dias.length || b.dias.includes(dia))
    .sort((a, b) => (!a.dias.length - !b.dias.length) || valor(b) - valor(a) || a.comercio.localeCompare(b.comercio, 'es'));
}

// Los descuentos de tus tarjetas (sus bancos) que no han vencido en esa fecha.
function vigentes(tarjetas, fechaISO) {
  const mias = new Set(tarjetas.map(t => separarTarjeta(t).banco));
  return BENEFICIOS.filter(b => mias.has(b.tarjeta) && (!b.hasta || b.hasta >= fechaISO));
}

// La clave de comercio de cada descuento, calculada una vez.
const CLAVE_DESCUENTO = new Map(BENEFICIOS.map(b => [b, claveExacta(b.comercio)]));

// Los descuentos de tus tarjetas en un comercio (patrones: sus claves, ver
// js/comercios.js) que siguen vigentes, cualquier día. Calza si el nombre del
// descuento es una de las formas de escribir el comercio o está dentro de una
// ("santa brasa" en "santa brasa la dehesa"); "PedidosYa Market" no calza con
// cualquier pedido de PedidosYa.
export function descuentosEn(patrones, tarjetas, fechaISO) {
  const calza = clave => !!clave && patrones.some(p => p === clave || (' ' + p + ' ').includes(' ' + clave + ' '));
  return vigentes(tarjetas, fechaISO)
    .filter(b => calza(CLAVE_DESCUENTO.get(b)))
    .sort((a, b) => valor(b) - valor(a));
}

// Texto corto para los días: "jueves", "lunes y viernes", "todos los días".
export function textoDias(dias) {
  if (!dias.length) return 'todos los días';
  const nombres = dias.map(d => DIAS[d - 1]);
  return nombres.length === 1 ? nombres[0] : nombres.slice(0, -1).join(', ') + ' y ' + nombres.at(-1);
}

// El catálogo se revisa cada semana: pasadas dos sin revisión, se avisa.
export function catalogoAntiguo(hoy) {
  const dias = (new Date(hoy) - new Date(REVISADO)) / 864e5;
  return dias > 14;
}
