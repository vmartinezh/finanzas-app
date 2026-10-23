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

export const REVISADO = '2026-10-13';

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
  { tarjeta: 'santander', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [4], tope: 15000, hasta: '2026-10-31', nota: 'En mesón y AutoKing, no en el tótem.', fuente: SANTANDER + 'burger-king-3' },
  { tarjeta: 'santander', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-10-31', nota: 'Solo con crédito.', fuente: SANTANDER + 'just-burger-3' },
  { tarjeta: 'santander', comercio: 'Melt Pizzas', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-10-31', fuente: SANTANDER + 'melt' },
  { tarjeta: 'santander', comercio: 'Santa Brasa', rubro: 'restaurante', descuento: '50%', dias: [2], tope: 50000, hasta: '2026-11-30', fuente: SANTANDER + 'santa-brasa-3' },
  { tarjeta: 'santander', comercio: 'Rishtedar', rubro: 'restaurante', descuento: '40%', dias: [5], hasta: '2026-10-31', nota: 'Solo con crédito.', fuente: SANTANDER + 'rishtedar-2' },
  { tarjeta: 'santander', comercio: 'Petrizzio', rubro: 'restaurante', descuento: '25%', dias: [1, 2, 3, 6, 7], hasta: '2026-10-31', fuente: SANTANDER + 'petrizzio' },
  { tarjeta: 'santander', comercio: 'Farmacias Knop', rubro: 'farmacia', descuento: '25%', dias: [2, 4], hasta: '2026-10-31', fuente: SANTANDER + 'farmacias-knop-2' },
  { tarjeta: 'santander', comercio: 'PedidosYa Market', rubro: 'delivery', descuento: '30%', dias: [], hasta: '2026-10-31', fuente: SANTANDER + 'pedidosya-market' },
  { tarjeta: 'santander', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [1], hasta: '2026-10-31', nota: 'En delivery.', fuente: SANTANDER + 'superzoo-2' },

  // ── Banco de Chile ──
  { tarjeta: 'banco-de-chile', comercio: 'Domino’s Pizza', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-12-31', fuente: CHILE + 'dominos-pizza' },
  { tarjeta: 'banco-de-chile', comercio: 'Mamut', rubro: 'restaurante', descuento: 'hasta 40%', dias: [2], hasta: '2026-12-31', fuente: CHILE + 'mamut' },
  { tarjeta: 'banco-de-chile', comercio: 'Doggis', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-12-31', fuente: CHILE + 'doggis' },
  { tarjeta: 'banco-de-chile', comercio: 'Juan Maestro', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-12-31', fuente: CHILE + 'juan-maestro' },
  { tarjeta: 'banco-de-chile', comercio: 'Tommy Beans', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: '2026-12-31', fuente: CHILE + 'tommy-beans' },
  { tarjeta: 'banco-de-chile', comercio: 'KFC', rubro: 'comida-rapida', descuento: '30%', dias: [4], hasta: '2026-12-31', fuente: CHILE + 'kfc' },
  { tarjeta: 'banco-de-chile', comercio: 'Wendy’s', rubro: 'comida-rapida', descuento: '30%', dias: [1], hasta: '2026-12-31', fuente: CHILE + 'wendy-dto' },
  { tarjeta: 'banco-de-chile', comercio: 'China Wok', rubro: 'comida-rapida', descuento: '30%', dias: [5], hasta: '2026-12-31', fuente: CHILE + 'china-wok' },
  { tarjeta: 'banco-de-chile', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '30%', dias: [5], tope: 9000, hasta: '2026-10-31', nota: 'Pidiendo por Rappi.', fuente: CHILE + 'rappi-dto-mcdonalds' },
  { tarjeta: 'banco-de-chile', comercio: 'Dunkin’', rubro: 'cafe', descuento: '30%', dias: [1, 3], hasta: '2026-12-31', fuente: CHILE + 'dunkin-dto' },
  { tarjeta: 'banco-de-chile', comercio: 'Starbucks', rubro: 'cafe', descuento: '30%', dias: [5], hasta: '2026-12-31', fuente: CHILE + 'starbucks' },
  { tarjeta: 'banco-de-chile', comercio: 'Petrizzio', rubro: 'restaurante', descuento: '30%', dias: [4, 5], hasta: '2027-06-30', fuente: CHILE + 'petrizzio' },
  { tarjeta: 'banco-de-chile', comercio: 'Farmacias Cruz Verde', rubro: 'farmacia', descuento: 'hasta 40%', dias: [1], hasta: '2027-02-15', fuente: CHILE + 'farmacias-cruz-verde' },
  { tarjeta: 'banco-de-chile', comercio: 'Farmacias Knop', rubro: 'farmacia', descuento: '20%', dias: [], hasta: '2027-08-31', fuente: CHILE + 'farmacias-knop' },
  { tarjeta: 'banco-de-chile', comercio: 'Cinépolis', rubro: 'cine', descuento: 'hasta 25%', dias: [], hasta: '2026-12-31', nota: 'En entradas.', fuente: CHILE + 'cinepolis' },
  { tarjeta: 'banco-de-chile', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], tope: 5000, hasta: '2026-10-31', fuente: CHILE + 'pedidosya' },
  { tarjeta: 'banco-de-chile', comercio: 'Rappi', rubro: 'delivery', descuento: 'hasta 25%', dias: [], tope: 5000, hasta: '2026-10-31', fuente: CHILE + 'rappi-dto' },

  // ── Bci ──
  { tarjeta: 'bci', comercio: 'Starbucks', rubro: 'cafe', descuento: '30%', dias: [1], hasta: '2026-12-31', fuente: BCI + 'tu-cafe-favorito-y-el-momento-perfecto-para-recargar-tu-dia.-8nywci7' },
  { tarjeta: 'bci', comercio: 'KFC', rubro: 'comida-rapida', descuento: '30%', dias: [1], hasta: '2026-12-31', nota: 'En el combo Chicken Share.', fuente: BCI + 'todos-los-lunes-en-combo-chicken-share-alitas-us5tjzf' },
  { tarjeta: 'bci', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-12-31', nota: 'Pidiendo en la app de McDonald’s.', fuente: BCI + 'todos-los-martes-en-tu-app-de-mcdonalds-nf4vg4m' },
  { tarjeta: 'bci', comercio: 'Juan Valdez', rubro: 'cafe', descuento: '40%', dias: [3], hasta: '2026-12-31', nota: 'Solo con crédito, en bebidas preparadas en barra.', fuente: BCI + '40-por-ciento-de-descuento-en-bebidas-preparadas-en-barra-5h1tty' },
  { tarjeta: 'bci', comercio: 'China Wok', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-12-31', nota: 'En el combo Wok 1 pollo teriyaki.', fuente: BCI + 'todos-los-miercoles-en-combo-wok-1-pollo-tereyaki-kr43pym' },
  { tarjeta: 'bci', comercio: 'Wendy’s', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-12-31', nota: 'En el combo Baconator doble.', fuente: BCI + 'todos-los-miercoles-en-combo-boconator-doble-zqw9icg' },
  { tarjeta: 'bci', comercio: 'Copec', rubro: 'bencina', descuento: '$100 por litro', dias: [4], hasta: '2026-10-31', nota: 'Pagando con la App Copec.', fuente: 'https://appcopec.cl/beneficios-appcopec/combustible/banco-bci/' },
  { tarjeta: 'bci', comercio: 'Cinépolis', rubro: 'cine', descuento: '50%', dias: [4, 5, 6, 7], hasta: '2026-10-31', nota: 'En entradas.', fuente: BCI + 'descuento-2d-feeifz7' },
  { tarjeta: 'bci', comercio: 'Salcobrand', rubro: 'farmacia', descuento: '20%', dias: [], hasta: '2026-12-31', fuente: BCI + 'bienestar-y-cuidado-personal-para-ti-y-tu-familia.-todo-lo-que-necesitas-en-un-lugar.-y0nmflq' },
  { tarjeta: 'bci', comercio: 'PedidosYa Market', rubro: 'delivery', descuento: '30%', dias: [], tope: 8000, hasta: '2026-12-31', nota: 'Solo con crédito.', fuente: BCI + 'tu-pedido-en-tu-casa-ya-no-tienes-que-ir-al-supermercado-con-pedidosya-hjjwl2' },

  // ── CMR Falabella (el banco no publica la vigencia) ──
  { tarjeta: 'cmr', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: null, nota: 'En el McCombo del mes.', fuente: CMR + 'mccombodelmes' },
  { tarjeta: 'cmr', comercio: 'Doggis', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: null, fuente: CMR + 'doggis' },
  { tarjeta: 'cmr', comercio: 'Juan Maestro', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: null, fuente: CMR + 'juan-maestro' },
  { tarjeta: 'cmr', comercio: 'Tommy Beans', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: null, fuente: CMR + 'tommybeans' },
  { tarjeta: 'cmr', comercio: 'Mamut', rubro: 'restaurante', descuento: 'hasta 40%', dias: [1], hasta: null, fuente: CMR + 'mamut' },
  { tarjeta: 'cmr', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: null, fuente: CMR + 'papa-johns' },
  { tarjeta: 'cmr', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: null, fuente: CMR + 'just-burger' },
  { tarjeta: 'cmr', comercio: 'Dunkin’', rubro: 'cafe', descuento: '40%', dias: [2], hasta: null, fuente: CMR + 'dunkin' },
  { tarjeta: 'cmr', comercio: 'Domino’s Pizza', rubro: 'comida-rapida', descuento: '40%', dias: [3], hasta: null, fuente: CMR + 'dominos-pizza' },
  { tarjeta: 'cmr', comercio: 'Juan Valdez', rubro: 'cafe', descuento: '40%', dias: [5], hasta: null, fuente: CMR + 'juan-valdez' },
  { tarjeta: 'cmr', comercio: 'Cinemark', rubro: 'cine', descuento: '20%', dias: [1, 2, 3], hasta: null, nota: 'En combos de confitería.', fuente: CMR + 'cinemark-combo-banco-falabella' },
  { tarjeta: 'cmr', comercio: 'Farmacias Ahumada', rubro: 'farmacia', descuento: '25%', dias: [1, 6, 7], hasta: null, fuente: 'https://www.bancofalabella.cl/descuentos' },
  { tarjeta: 'cmr', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [5], hasta: null, nota: 'Compras online.', fuente: CMR + 'superzoo' },

  // ── BancoEstado ──
  { tarjeta: 'bancoestado', comercio: 'Doggis', rubro: 'comida-rapida', descuento: '30%', dias: [2], tope: 16000, hasta: '2026-12-31', fuente: ESTADO + 'doggis---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Juan Maestro', rubro: 'comida-rapida', descuento: '30%', dias: [2], tope: 16000, hasta: '2026-12-31', fuente: ESTADO + 'juan-maestro---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [2], tope: 10000, hasta: '2026-12-31', nota: 'Solo con crédito Visa BancoEstado.', fuente: 'https://www.bancoestado.cl/content/bancoestado-public/cl/es/home/home/todosuma---bancoestado-personas/un-mes-de-sabores---bancoestado-personas.html#just-burger' },
  { tarjeta: 'bancoestado', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [3], hasta: '2026-12-31', fuente: ESTADO + 'superzoo---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Domino’s Pizza', rubro: 'comida-rapida', descuento: '40%', dias: [4], hasta: '2026-12-31', fuente: ESTADO + 'domino-s-pizza---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [7], hasta: '2026-11-29', fuente: ESTADO + 'burger-king---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '25%', dias: [7], hasta: '2026-12-27', nota: 'Solo con crédito Mastercard BancoEstado.', fuente: ESTADO + 'papa-john-s---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'Farmacias Ahumada', rubro: 'farmacia', descuento: '30%', dias: [], tope: 20000, hasta: '2026-10-31', fuente: ESTADO + 'farmacias-ahumada---beneficios-bancoestado.html' },
  { tarjeta: 'bancoestado', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], tope: 5000, hasta: '2026-10-31', nota: 'Hasta 3 usos al mes.', fuente: ESTADO + 'pedidosya.html' },
  { tarjeta: 'bancoestado', comercio: 'Rappi', rubro: 'delivery', descuento: '$5.000', dias: [1, 3, 5], hasta: '2026-10-31', nota: 'Solo con crédito Visa BancoEstado, 2 usos al mes.', fuente: ESTADO + 'rappi---beneficios-bancoestado.html' },

  // ── Scotiabank ──
  { tarjeta: 'scotiabank', comercio: 'Copec', rubro: 'bencina', descuento: 'hasta $100 por litro', dias: [3], hasta: '2026-10-31', nota: 'Solo con crédito, pagando con la App Copec.', fuente: SCOTIA },
  { tarjeta: 'scotiabank', comercio: 'Shell', rubro: 'bencina', descuento: 'hasta $200 por litro', dias: [4], hasta: '2026-10-31', nota: 'Pagando por la app.', fuente: SCOTIA },
  { tarjeta: 'scotiabank', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [7], hasta: '2026-10-31', nota: 'Compras online.', fuente: SCOTIA },
  { tarjeta: 'scotiabank', comercio: 'Jumbo', rubro: 'super', descuento: '20%', dias: [], hasta: '2026-10-31', nota: 'Compras online, como devolución.', fuente: SCOTIA },
  { tarjeta: 'scotiabank', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], hasta: '2026-10-31', nota: 'Solo con crédito.', fuente: SCOTIA },

  // ── Tarjeta Cencosud Scotiabank ──
  { tarjeta: 'cencosud', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [1], tope: 15000, hasta: '2026-10-31', fuente: CENCOSUD + 'burger-king' },
  { tarjeta: 'cencosud', comercio: 'Copec', rubro: 'bencina', descuento: '$100 por litro', dias: [1], hasta: '2026-10-31', nota: 'Pagando con la App Copec. Tope de $10.000 al mes.', fuente: 'https://appcopec.cl/beneficios-appcopec/combustible/cencosud-scotiabank/' },
  { tarjeta: 'cencosud', comercio: 'Jumbo', rubro: 'super', descuento: '5%', dias: [1], hasta: null, fuente: CENCOSUD + 'descuentos-cencosud' },
  { tarjeta: 'cencosud', comercio: 'Melt Pizzas', rubro: 'comida-rapida', descuento: '35%', dias: [3], tope: 40000, hasta: '2026-10-31', fuente: CENCOSUD + 'melt-pizzas' },
  { tarjeta: 'cencosud', comercio: 'Rappi', rubro: 'delivery', descuento: '$10.000', dias: [4], hasta: '2026-10-31', fuente: CENCOSUD + 'rappi' },
  { tarjeta: 'cencosud', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [5], tope: 10000, hasta: '2026-10-31', fuente: CENCOSUD + 'pedidos-ya' },
  { tarjeta: 'cencosud', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '25%', dias: [7], tope: 15000, hasta: '2026-10-31', nota: 'Compras online.', fuente: CENCOSUD + 'papa-johns' },

  // ── Banco Ripley ──
  { tarjeta: 'ripley', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '50%', dias: [1, 2, 3], tope: 15000, hasta: '2026-10-31', nota: 'Pagando con Google Pay o Apple Pay, en compras sobre $3.500.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [1], hasta: null, fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Aramco', rubro: 'bencina', descuento: '$150 por litro', dias: [3], hasta: '2026-10-31', nota: 'Tope de $8.000 al mes.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Mamut', rubro: 'restaurante', descuento: '40%', dias: [4], tope: 15000, hasta: null, fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '40%', dias: [4], hasta: null, fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Cinépolis', rubro: 'cine', descuento: '2x1', dias: [5], hasta: null, nota: 'En entradas.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'SuperZoo', rubro: 'mascotas', descuento: '20%', dias: [6], hasta: null, fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Farmacias Ahumada', rubro: 'farmacia', descuento: '20%', dias: [], tope: 10000, hasta: null, fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'Castaño', rubro: 'cafe', descuento: '30%', dias: [], tope: 10000, hasta: null, nota: 'Solo en locales.', fuente: RIPLEY },
  { tarjeta: 'ripley', comercio: 'PedidosYa', rubro: 'delivery', descuento: '30%', dias: [], tope: 4000, hasta: null, fuente: RIPLEY },

  // ── Itaú ──
  { tarjeta: 'itau', comercio: 'Copec', rubro: 'bencina', descuento: '$100 por litro', dias: [2], hasta: null, nota: 'Solo Itaú Legend.', fuente: ITAU + 'viajes/copec-martes-13/' },
  { tarjeta: 'itau', comercio: 'Cinépolis', rubro: 'cine', descuento: '2x1', dias: [3], hasta: null, nota: 'En entradas. Solo algunas tarjetas, como Legend y Black.', fuente: ITAU + 'tiempo-libre/cinepolis/' },
  { tarjeta: 'itau', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [6], tope: 20000, hasta: '2026-12-31', nota: 'Solo crédito Legend, Black, Signature y Blue.', fuente: ITAU + 'restaurantes/burger-king-2/' },

  // ── Lider Bci ──
  { tarjeta: 'lider-bci', comercio: 'KFC', rubro: 'comida-rapida', descuento: '30%', dias: [1], hasta: null, fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Starbucks', rubro: 'cafe', descuento: '30%', dias: [1], hasta: '2026-10-31', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Papa John’s', rubro: 'comida-rapida', descuento: '30%', dias: [1, 5], tope: 15000, hasta: '2026-10-31', nota: 'En compras sobre $15.000.', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'McDonald’s', rubro: 'comida-rapida', descuento: '40%', dias: [2], hasta: '2026-10-31', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Burger King', rubro: 'comida-rapida', descuento: '40%', dias: [3], tope: 7000, hasta: '2026-10-31', nota: 'En compras sobre $3.000.', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'China Wok', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: null, fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Wendy’s', rubro: 'comida-rapida', descuento: '30%', dias: [3], hasta: '2026-10-31', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Just Burger', rubro: 'comida-rapida', descuento: '40%', dias: [4], tope: 10000, hasta: '2026-10-31', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Cinépolis', rubro: 'cine', descuento: '50%', dias: [4, 5, 6, 7], hasta: null, nota: 'En entradas, 2 cupones al mes.', fuente: LIDER },
  { tarjeta: 'lider-bci', comercio: 'Salcobrand', rubro: 'farmacia', descuento: '20%', dias: [], tope: 20000, hasta: '2026-10-31', fuente: LIDER },
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

// Los descuentos de tus tarjetas que sirven en una fecha: primero los que
// son solo de ese día (los que hay que aprovechar), después los de todos los
// días; dentro de cada grupo, los más altos primero.
export function beneficiosDelDia(tarjetas, fechaISO) {
  const dia = diaSemana(fechaISO);
  const mias = new Set(tarjetas.map(t => String(t).split(':')[0]));
  return BENEFICIOS
    .filter(b => mias.has(b.tarjeta) && (!b.hasta || b.hasta >= fechaISO))
    .filter(b => !b.dias.length || b.dias.includes(dia))
    .sort((a, b) => (!a.dias.length - !b.dias.length) || valor(b) - valor(a) || a.comercio.localeCompare(b.comercio, 'es'));
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
