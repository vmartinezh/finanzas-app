// Capa de datos. Toda la app lee de `datos` (en memoria) y escribe con
// guardar()/borrar(), que actualizan la memoria y el almacenamiento:
//   - modo local: localStorage del navegador
//   - modo nube:  Supabase (cada usuario ve solo sus filas, ver schema.sql)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { normalizarTabla, normalizarPerfil, prepararRespaldo, perfilDesdeRegistro, pasarTarjetasACuentas, mezclar, TABLAS } from './validar.js';
import { pasarAComercios } from './comercios.js';
import { pasarAPagos } from './pagos.js';

export { TABLAS };

export const datos = {
  categorias: [], movimientos: [], compromisos: [], deudas: [], eventos: [], reglas: [], personas: [], cobros: [],
  // Tus tarjetas (y más adelante tus cuentas): ver js/mis-tarjetas.js. Cada
  // deuda de tarjeta apunta a la suya con deudas.cuenta_id.
  cuentas: [],
  // Dónde gastas: ver js/comercios.js. Cada gasto apunta al suyo con movimientos.comercio_id.
  comercios: [],
  // presupuesto_deudas: total al mes para deudas (cuotas + abono extra).
  // revisado_mes: último mes ('YYYY-MM') con la revisión de fin de mes hecha.
  // tarjetas: de antes de la tabla cuentas; queda vacío después del paso (pasarTarjetas).
  perfil: { ingreso_mensual: 0, meta_ahorro: 0, presupuesto_deudas: 0, revisado_mes: null, tarjetas: [], rut: null, nombres_propios: [], fecha_nacimiento: null, ruta_cumpleanos: null },
};

export let modo = 'local';
// Tablas que la nube todavía no tiene (falta correr supabase/schema.sql): se
// ven vacías y no se puede guardar en ellas.
const tablasQueFaltan = new Set();
// 'lista' si se abrió la app desde el correo para recuperar la contraseña,
// 'vencida' si ese enlace ya no sirve, null en cualquier otro caso.
export let recuperacion = null;
let supabase = null;
let usuarioId = null;

export const PREFIJO = 'simplifica:v1:';
// La app se llamó "Lucas" al principio: sus datos guardados se traen una vez.
const PREFIJO_ANTERIOR = 'lucas:v1:';

function migrarPrefijoAnterior() {
  try {
    if (localStorage.getItem(PREFIJO + 'categorias') !== null) return;
    for (const t of [...TABLAS, 'perfil']) {
      const valor = localStorage.getItem(PREFIJO_ANTERIOR + t);
      if (valor !== null) localStorage.setItem(PREFIJO + t, valor);
    }
  } catch {
    // Sin acceso a localStorage (modo privado): la app parte vacía.
  }
}

function leerLocal(clave, porDefecto) {
  try {
    const texto = localStorage.getItem(PREFIJO + clave);
    return texto ? JSON.parse(texto) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribirLocal(clave, valor) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch (e) {
    console.error('No se pudo guardar en el navegador', e);
  }
}

export const nuevoId = () => crypto.randomUUID();

// Devuelve el usuario conectado (modo nube), null si falta iniciar sesión,
// o 'local' si no hay nube configurada.
export async function iniciar() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    modo = 'local';
    migrarPrefijoAnterior();
    for (const t of TABLAS) datos[t] = normalizarTabla(t, leerLocal(t, []));
    Object.assign(datos.perfil, normalizarPerfil(leerLocal('perfil', {})));
    await pasarTarjetas();
    await pasarPagos();
    await pasarComercios();
    return 'local';
  }

  modo = 'nube';
  // El enlace del correo para recuperar la contraseña vuelve a la app con
  // #access_token=…&type=recovery, o con #error_code=… si ya venció. Se lee
  // antes de crear el cliente, que consume esos datos para abrir la sesión.
  const enlace = new URLSearchParams(location.hash.slice(1));
  recuperacion = enlace.get('type') === 'recovery' ? 'lista' : enlace.get('error_code') ? 'vencida' : null;

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  // Los tokens no se quedan en la barra de direcciones ni en el historial.
  if (recuperacion) history.replaceState(null, '', location.pathname + location.search);
  if (!session) return null;
  usuarioId = session.user.id;

  const respuestas = await Promise.all(TABLAS.map(t => supabase.from(t).select('*')));
  respuestas.forEach((r, i) => {
    // Una tabla nueva que la base todavía no tiene (falta correr schema.sql):
    // la app abre igual y esa sección queda vacía hasta actualizar la base.
    if (r.error?.code === 'PGRST205' || r.error?.code === '42P01') {
      console.warn(`Falta la tabla ${TABLAS[i]}: corre supabase/schema.sql`);
      tablasQueFaltan.add(TABLAS[i]);
      datos[TABLAS[i]] = [];
      return;
    }
    if (r.error) throw r.error;
    datos[TABLAS[i]] = normalizarTabla(TABLAS[i], r.data);
  });
  const { data: perfil, error } = await supabase.from('perfil').select('*').maybeSingle();
  if (error) throw error;
  if (perfil) Object.assign(datos.perfil, normalizarPerfil(perfil));
  await pasarRegistro(session.user.user_metadata);
  await pasarTarjetas();
  await pasarPagos();
  await pasarComercios();
  return session.user;
}

// Tarjetas guardadas como texto en el perfil (antes de la tabla cuentas, o por
// una versión vieja de la app que siga en caché): pasan a filas de cuentas. Si
// la nube todavía no tiene la tabla, el paso se hace solo en memoria para que
// se vean, sin mover el cupo de las deudas, y se guarda cuando la base se actualice.
async function pasarTarjetas() {
  const enMemoria = tablasQueFaltan.has('cuentas');
  const paso = pasarTarjetasACuentas({ tarjetas: datos.perfil.tarjetas, cuentas: datos.cuentas, deudas: datos.deudas }, nuevoId, { moverCupo: !enMemoria });
  if (!paso) return;
  if (enMemoria) {
    for (const t of ['cuentas', 'deudas']) datos[t] = mezclar(datos[t], paso[t]);
    return;
  }
  try {
    await guardarVarios('cuentas', paso.cuentas);
    await guardarVarios('deudas', paso.deudas);
    await guardarPerfil({ tarjetas: [] });
  } catch (e) {
    // Se puede repetir: lo que ya quedó en cuentas no se duplica.
    console.warn('No se pudieron pasar tus tarjetas a cuentas; se reintenta al volver a entrar', e);
  }
}

// Los gastos sin comercio_id (de antes de la tabla comercios, o que llegaron
// solos del banco desde la última vez) se enlazan a su comercio, y lo aprendido
// en reglas pasa a la categoría del comercio. Sin la tabla en la nube no se hace
// nada: el clasificador sigue con reglas.
export async function pasarComercios() {
  if (tablasQueFaltan.has('comercios')) return;
  const paso = pasarAComercios(datos, nuevoId);
  if (!paso) return;
  // guardarVarios cambia la memoria antes de subir: si la nube falla, la memoria
  // vuelve a como estaba, para que ningún gasto apunte a un comercio que la nube no tiene.
  const antes = { comercios: [...datos.comercios], movimientos: [...datos.movimientos] };
  try {
    await guardarVarios('comercios', paso.comercios);
    await guardarVarios('movimientos', paso.movimientos);
  } catch (e) {
    Object.assign(datos, antes);
    // Se puede repetir: lo que ya quedó enlazado no se vuelve a crear.
    console.warn('No se pudieron enlazar tus gastos a sus comercios; se reintenta al volver a entrar', e);
  }
}

// Los meses marcados en compromisos.pagados (de antes, o de una versión vieja
// de la app que siga en caché) pasan a movimientos de pago. Primero los
// movimientos y después se vacía pagados: si algo falla a medias, la próxima
// carga ve que el mes ya tiene su pago y solo termina de vaciar.
export async function pasarPagos() {
  const paso = pasarAPagos(datos, nuevoId);
  if (!paso) return;
  // Si la nube falla, se revierte en memoria solo lo que no se subió.
  const avisar = e => console.warn('No se pudieron pasar tus pagos fijos a movimientos; se reintenta al volver a entrar', e);
  const movimientos = [...datos.movimientos];
  try {
    await guardarVarios('movimientos', paso.movimientos);
  } catch (e) {
    datos.movimientos = movimientos;
    return avisar(e);
  }
  const compromisos = [...datos.compromisos];
  try {
    await guardarVarios('compromisos', paso.compromisos);
  } catch (e) {
    datos.compromisos = compromisos;
    avisar(e);
  }
}

// true si la nube todavía no tiene esa tabla (falta correr supabase/schema.sql).
export const faltaTabla = tabla => modo === 'nube' && tablasQueFaltan.has(tabla);

const FALTA_TABLA = 'Falta actualizar la base de datos para guardar esto (supabase/schema.sql). No se guardó nada.';
function revisarTabla(tabla) {
  if (modo === 'nube' && tablasQueFaltan.has(tabla)) throw new Error(FALTA_TABLA);
}

// Lo que se dio al crear la cuenta (RUT, nombre y fecha de nacimiento) pasa al
// perfil la primera vez que se entra: al registrarse puede no haber sesión
// todavía, si Supabase pide confirmar el correo. Ya en el perfil (protegido por
// RLS), el RUT y la fecha se borran de la cuenta, donde viajarían en cada token
// y no se actualizarían al cambiarlos en Ajustes; queda el nombre (Display name
// del panel) y la marca en_perfil. Tus cuentas y el cumpleaños se guardan por
// separado: si la base todavía no tiene una de las columnas (falta correr
// schema.sql), lo otro se guarda igual y lo que falte se reintenta al volver a entrar.
async function pasarRegistro(registro) {
  if (!registro || registro.en_perfil || (!registro.rut && !registro.fecha_nacimiento)) return;
  const { rut, nombres_propios, fecha_nacimiento } = perfilDesdeRegistro(datos.perfil, registro) ?? {};
  // Lo que ya está en el perfil (o no se pudo usar) se borra de la cuenta; lo
  // que falló se queda para el próximo intento.
  const borrar = { rut: null, fecha_nacimiento: null };
  const pasar = async (cambios, campo) => {
    try {
      await guardarPerfil(cambios);
    } catch (e) {
      delete borrar[campo];
      console.warn(`No se pudo pasar ${campo} del registro al perfil; se reintenta al volver a entrar`, e);
    }
  };
  if (rut) await pasar({ rut, nombres_propios }, 'rut');
  if (fecha_nacimiento) await pasar({ fecha_nacimiento }, 'fecha_nacimiento');
  const listo = Object.keys(borrar).length === 2;
  const { error } = await supabase.auth.updateUser({ data: { ...borrar, ...(listo ? { en_perfil: true } : {}) } });
  if (error) console.warn('Los datos del registro quedaron en el perfil, pero no se pudieron borrar de la cuenta', error);
}

// Acceso con correo y contraseña. Crear la cuenta y entrar no envían correos;
// solo recuperar la contraseña, y para eso Supabase necesita un SMTP propio
// (el que trae por defecto solo llega a los miembros del proyecto).
// El RUT y el nombre completo (ya validados con datosDeRegistro) se guardan en
// la cuenta de Supabase solo hasta la primera entrada, cuando pasan a "Tus
// cuentas" (ver iniciar): al registrarse puede no haber sesión para escribir el perfil.
// Devuelve true si la cuenta quedó lista, o false si Supabase pide confirmar el correo.
export async function crearCuenta(email, contraseña, { rut, nombre, fecha_nacimiento = null } = {}) {
  const { data, error } = await supabase.auth.signUp({
    email, password: contraseña,
    options: { emailRedirectTo: location.origin + location.pathname, data: { full_name: nombre, rut, fecha_nacimiento } },
  });
  if (error) throw traducirError(error);
  return !!data.session;
}

export async function entrar(email, contraseña) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: contraseña });
  if (error) throw traducirError(error);
}

// Manda el correo con el enlace para crear una contraseña nueva. Supabase no
// avisa si el correo no tiene cuenta, así nadie puede averiguar quién la usa.
export async function pedirRecuperacion(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw traducirError(error);
}

// Con la sesión que abrió el enlace del correo.
export async function cambiarContraseña(nueva) {
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) throw traducirError(error);
  recuperacion = null;
}

function traducirError(error) {
  const mensajes = {
    invalid_credentials: 'Correo o contraseña incorrectos.',
    user_already_exists: 'Ya existe una cuenta con ese correo. Usa "Entrar".',
    weak_password: 'La contraseña es muy corta: usa al menos 8 caracteres.',
    email_not_confirmed: 'Falta confirmar el correo. Revisa tu bandeja de entrada.',
    over_email_send_rate_limit: 'Se alcanzó el límite de correos. Intenta en una hora.',
    same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  };
  return new Error(mensajes[error.code] || error.message);
}

export async function cerrarSesion() {
  // Los avisos de este celular son de esta cuenta: no le pueden llegar a quien entre después.
  try { await (await import('./avisos.js')).desactivarAvisos(); } catch (e) { console.warn('No se pudieron desactivar los avisos', e); }
  await supabase.auth.signOut();
  location.reload();
}

// Avisos al celular (solo modo nube): el celular queda anotado para que la nube
// le avise el día que toca cobrar. No es parte de `datos` ni de los respaldos.
export async function guardarSuscripcion({ endpoint, keys }) {
  const { error } = await supabase.rpc('anotar_suscripcion', { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth });
  if (error) throw error;
}

export async function borrarSuscripcion(endpoint) {
  const { error } = await supabase.from('suscripciones_push').delete().eq('endpoint', endpoint);
  if (error) throw error;
}

// Compras que llegan solas (fase 2, solo en la nube). fuente: 'correo' (script
// de Google) o 'wallet' (Atajo del iPhone), cada una con su propia clave. La
// clave se genera aquí, se muestra una vez y en la base queda solo su hash: ni
// la app la puede volver a leer.
export async function estadoClaveIngreso(fuente) {
  const { data, error } = await supabase.from('claves_ingreso').select('creada, ultimo_uso').eq('fuente', fuente).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function crearClaveIngreso(fuente) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const clave = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clave));
  const hash = [...new Uint8Array(resumen)].map(b => b.toString(16).padStart(2, '0')).join('');
  const { error } = await supabase.from('claves_ingreso')
    .upsert({ user_id: usuarioId, fuente, hash, creada: new Date().toISOString(), ultimo_uso: null }, { onConflict: 'user_id,fuente' });
  if (error) throw new Error(error.message);
  return clave;
}

export async function borrarClaveIngreso(fuente) {
  const { error } = await supabase.from('claves_ingreso').delete().eq('user_id', usuarioId).eq('fuente', fuente);
  if (error) throw new Error(error.message);
}

// Columnas agregadas después que la app puede mandar con valor. Si la base
// todavía no tiene una (falta correr supabase/schema.sql), la fila se guarda
// sin ella: mejor guardar el resto del cambio que perderlo entero.
const COLUMNAS_NUEVAS = ['cuenta_id', 'comercio_id', 'mes_pagado'];
async function subir(tabla, filas) {
  let { error } = await supabase.from(tabla).upsert(filas);
  const columna = error?.code === 'PGRST204' ? COLUMNAS_NUEVAS.find(c => error.message?.includes(`'${c}'`)) : null;
  if (columna) {
    console.warn(`Falta la columna ${tabla}.${columna}: corre supabase/schema.sql`);
    ({ error } = await supabase.from(tabla).upsert(filas.map(({ [columna]: _, ...f }) => f)));
  }
  if (error) throw error;
}

// Inserta o actualiza una fila (según si su id ya existe).
export async function guardar(tabla, fila) {
  revisarTabla(tabla);
  if (!fila.id) fila.id = nuevoId();
  const lista = datos[tabla];
  const i = lista.findIndex(f => f.id === fila.id);
  const anterior = i >= 0 ? lista[i] : null;
  if (i >= 0) lista[i] = { ...lista[i], ...fila };
  else lista.push(fila);

  if (modo === 'local') {
    escribirLocal(tabla, lista);
  } else {
    await subir(tabla, [sinUsuario(fila, anterior)]);
  }
  return fila;
}

export async function guardarVarios(tabla, filas) {
  revisarTabla(tabla);
  for (const f of filas) if (!f.id) f.id = nuevoId();
  const anteriores = new Map(filas.map(f => [f.id, datos[tabla].find(x => x.id === f.id) ?? null]));
  for (const f of filas) {
    const i = datos[tabla].findIndex(x => x.id === f.id);
    if (i >= 0) datos[tabla][i] = { ...datos[tabla][i], ...f };
    else datos[tabla].push(f);
  }
  if (modo === 'local') {
    escribirLocal(tabla, datos[tabla]);
  } else if (filas.length) {
    await subir(tabla, filas.map(f => sinUsuario(f, anteriores.get(f.id))));
  }
}

export async function borrar(tabla, id) {
  revisarTabla(tabla);
  datos[tabla] = datos[tabla].filter(f => f.id !== id);
  if (modo === 'local') {
    escribirLocal(tabla, datos[tabla]);
  } else {
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    if (error) throw error;
  }
}

// Columnas del perfil agregadas después: solo se mandan cuando se cambian, así
// el resto del perfil se guarda aunque la base todavía no las tenga (falta
// correr supabase/schema.sql). El upsert no toca las columnas que no se mandan.
const PERFIL_NUEVAS = ['rut', 'nombres_propios', 'fecha_nacimiento', 'ruta_cumpleanos'];

// Si la nube no lo guarda, la memoria vuelve a como estaba: la pantalla no puede
// mostrar como guardado algo que no se guardó.
export async function guardarPerfil(cambios) {
  const antes = Object.fromEntries(Object.keys(cambios).map(c => [c, datos.perfil[c]]));
  Object.assign(datos.perfil, cambios);
  if (modo === 'local') {
    escribirLocal('perfil', datos.perfil);
    return;
  }
  try {
    const fila = sinUsuario(datos.perfil);
    for (const c of PERFIL_NUEVAS) if (!(c in cambios)) delete fila[c];
    const { error } = await supabase.from('perfil').upsert({ ...fila, user_id: usuarioId });
    if (error) throw error;
  } catch (e) {
    Object.assign(datos.perfil, antes);
    throw e;
  }
}

// user_id lo pone la base de datos (default auth.uid()); no lo mandamos.
// Un cobro_id o una tarjeta vacíos tampoco: así un movimiento o una deuda se
// pueden guardar aunque la base todavía no tenga esa columna (falta correr
// supabase/schema.sql). Si la deuda tenía tarjeta (la columna existe), el
// vacío sí se manda: es soltarla de la tarjeta. Sin la tabla cuentas, la
// columna cuenta_id tampoco existe: no se manda.
function sinUsuario(fila, anterior = null) {
  const { user_id, creado, ...resto } = fila;
  if (resto.cobro_id == null) delete resto.cobro_id;
  if (resto.tarjeta == null && anterior?.tarjeta == null) delete resto.tarjeta;
  // Igual que la tarjeta: un cuenta_id vacío no se manda (la base puede no tener
  // movimientos.cuenta_id todavía), salvo que sea para soltar uno que había.
  if (tablasQueFaltan.has('cuentas') || (resto.cuenta_id == null && anterior?.cuenta_id == null)) delete resto.cuenta_id;
  if (tablasQueFaltan.has('comercios') || (resto.comercio_id == null && anterior?.comercio_id == null)) delete resto.comercio_id;
  if (resto.mes_pagado == null && anterior?.mes_pagado == null) delete resto.mes_pagado;
  return resto;
}

export function exportar() {
  const copia = { version: 1, exportado: new Date().toISOString(), perfil: datos.perfil };
  for (const t of TABLAS) copia[t] = datos[t];
  return copia;
}

// Restaura un respaldo REEMPLAZANDO los datos actuales (si no, las categorías
// que se crean al abrir la app por primera vez quedarían duplicadas). Devuelve
// cuántos enlaces se soltaron y cuántas filas del archivo no se pudieron usar.
export async function importar(copia) {
  // Un respaldo puede venir de otra persona: se valida fila por fila, se
  // descarta lo que no tenga la forma esperada y cada fila recibe un id nuevo.
  const { tablas, perfil, sueltos, descartadas } = prepararRespaldo(copia, nuevoId);
  if (modo === 'nube') {
    // En una sola transacción: si algo falla, no se borra nada (ver schema.sql).
    const { error } = await supabase.rpc('restaurar_respaldo', { respaldo: { ...tablas, perfil } });
    // PGRST202: la base todavía no tiene la función (falta correr supabase/schema.sql).
    if (error?.code === 'PGRST202') throw new Error('Falta actualizar la base de datos para restaurar respaldos. No se borró nada.');
    if (error) throw error;
  }
  for (const t of TABLAS) datos[t] = tablas[t];
  Object.assign(datos.perfil, perfil);
  if (modo === 'local') {
    for (const t of TABLAS) escribirLocal(t, datos[t]);
    escribirLocal('perfil', datos.perfil);
  }
  return { sueltos, descartadas };
}
