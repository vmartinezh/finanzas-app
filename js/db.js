// Capa de datos. Toda la app lee de `datos` (en memoria) y escribe con
// guardar()/borrar(), que actualizan la memoria y el almacenamiento:
//   - modo local: localStorage del navegador
//   - modo nube:  Supabase (cada usuario ve solo sus filas, ver schema.sql)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { normalizarTabla, normalizarPerfil, soltarHuerfanas } from './validar.js';

// En orden de dependencia: las primeras son referenciadas por las siguientes.
export const TABLAS = ['categorias', 'eventos', 'deudas', 'compromisos', 'movimientos', 'reglas'];

export const datos = {
  categorias: [], movimientos: [], compromisos: [], deudas: [], eventos: [], reglas: [],
  // presupuesto_deudas: total al mes para deudas (cuotas + abono extra).
  // revisado_mes: último mes ('YYYY-MM') con la revisión de fin de mes hecha.
  // tarjetas: ids del catálogo de descuentos (js/beneficios.js) que la persona tiene.
  perfil: { ingreso_mensual: 0, meta_ahorro: 0, presupuesto_deudas: 0, revisado_mes: null, tarjetas: [] },
};

export let modo = 'local';
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
    if (r.error) throw r.error;
    datos[TABLAS[i]] = normalizarTabla(TABLAS[i], r.data);
  });
  const { data: perfil, error } = await supabase.from('perfil').select('*').maybeSingle();
  if (error) throw error;
  if (perfil) Object.assign(datos.perfil, normalizarPerfil(perfil));
  return session.user;
}

// Acceso con correo y contraseña. Crear la cuenta y entrar no envían correos;
// solo recuperar la contraseña, y para eso Supabase necesita un SMTP propio
// (el que trae por defecto solo llega a los miembros del proyecto).
// Devuelve true si la cuenta quedó lista, o false si Supabase pide confirmar el correo.
export async function crearCuenta(email, contraseña) {
  const { data, error } = await supabase.auth.signUp({
    email, password: contraseña,
    options: { emailRedirectTo: location.origin + location.pathname },
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
  await supabase.auth.signOut();
  location.reload();
}

// Inserta o actualiza una fila (según si su id ya existe).
export async function guardar(tabla, fila) {
  if (!fila.id) fila.id = nuevoId();
  const lista = datos[tabla];
  const i = lista.findIndex(f => f.id === fila.id);
  if (i >= 0) lista[i] = { ...lista[i], ...fila };
  else lista.push(fila);

  if (modo === 'local') {
    escribirLocal(tabla, lista);
  } else {
    const { error } = await supabase.from(tabla).upsert(sinUsuario(fila));
    if (error) throw error;
  }
  return fila;
}

export async function guardarVarios(tabla, filas) {
  for (const f of filas) if (!f.id) f.id = nuevoId();
  for (const f of filas) {
    const i = datos[tabla].findIndex(x => x.id === f.id);
    if (i >= 0) datos[tabla][i] = { ...datos[tabla][i], ...f };
    else datos[tabla].push(f);
  }
  if (modo === 'local') {
    escribirLocal(tabla, datos[tabla]);
  } else if (filas.length) {
    const { error } = await supabase.from(tabla).upsert(filas.map(sinUsuario));
    if (error) throw error;
  }
}

export async function borrar(tabla, id) {
  datos[tabla] = datos[tabla].filter(f => f.id !== id);
  if (modo === 'local') {
    escribirLocal(tabla, datos[tabla]);
  } else {
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    if (error) throw error;
  }
}

export async function guardarPerfil(cambios) {
  Object.assign(datos.perfil, cambios);
  if (modo === 'local') {
    escribirLocal('perfil', datos.perfil);
  } else {
    const { error } = await supabase.from('perfil').upsert({ ...sinUsuario(datos.perfil), user_id: usuarioId });
    if (error) throw error;
  }
}

// user_id lo pone la base de datos (default auth.uid()); no lo mandamos.
function sinUsuario(fila) {
  const { user_id, creado, ...resto } = fila;
  return resto;
}

export function exportar() {
  const copia = { version: 1, exportado: new Date().toISOString(), perfil: datos.perfil };
  for (const t of TABLAS) copia[t] = datos[t];
  return copia;
}

// Restaura un respaldo REEMPLAZANDO los datos actuales (si no, las categorías
// que se crean al abrir la app por primera vez quedarían duplicadas).
export async function importar(copia) {
  if (!copia || typeof copia !== 'object' || copia.version !== 1) throw new Error('El archivo no es un respaldo de Simplifica');
  // Un respaldo puede venir de otra persona: se valida fila por fila y se
  // descarta lo que no tenga la forma esperada.
  // Antes de borrar nada: si una fila apunta a algo que el respaldo no trae,
  // la base la rechazaría a mitad de camino y quedaría la restauración a medias.
  const limpio = soltarHuerfanas(Object.fromEntries(TABLAS.map(t => [t, normalizarTabla(t, copia[t])])));
  if (!limpio.categorias.length) throw new Error('El respaldo no trae categorías válidas');

  // Se borra de atrás hacia adelante y se inserta en orden de dependencia.
  for (const t of [...TABLAS].reverse()) {
    const conservar = new Set(limpio[t].map(f => f.id));
    for (const f of datos[t].filter(f => !conservar.has(f.id))) await borrar(t, f.id);
  }
  for (const t of TABLAS) await guardarVarios(t, limpio[t]);

  const { pago_extra_deudas, user_id, ...perfil } = normalizarPerfil(copia.perfil);
  // Respaldos de la primera versión guardaban solo el abono extra; se convierte al total.
  if (copia.perfil?.presupuesto_deudas == null && pago_extra_deudas) {
    perfil.presupuesto_deudas = limpio.deudas.reduce((s, d) => s + d.cuota_mensual, 0) + pago_extra_deudas;
  }
  await guardarPerfil(perfil);
}
