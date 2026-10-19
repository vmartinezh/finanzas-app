// Avisos al celular (notificaciones push), solo en modo nube: el día que toca
// cobrar algo de "Me deben", la nube manda "Tienes un pago por recibir hoy"
// (supabase/functions/avisar-cobros). En modo local, el aviso es la tarjeta de Inicio.
import { modo, guardarSuscripcion, borrarSuscripcion } from './db.js';
import { VAPID_PUBLIC_KEY } from './config.js';
import { base64urlABytes } from './util.js';

const registro = () => navigator.serviceWorker?.getRegistration() ?? Promise.resolve(null);
const suscripcion = async () => (await registro())?.pushManager?.getSubscription() ?? null;

// En iPhone los avisos solo funcionan con la app agregada a la pantalla de inicio.
// El iPad se presenta como Mac, pero con pantalla táctil.
const esIPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'no' (no se puede en este navegador), 'instalar' (iPhone sin instalar),
// 'bloqueados' (la persona negó el permiso), 'activos' o 'inactivos'.
export async function estadoAvisos() {
  if (modo !== 'nube' || !VAPID_PUBLIC_KEY) return 'no';
  if (!('PushManager' in window) || !('Notification' in window)) return esIPhone() && !instalada() ? 'instalar' : 'no';
  if (!(await registro())) return 'no';
  if (Notification.permission === 'denied') return 'bloqueados';
  return Notification.permission === 'granted' && (await suscripcion()) ? 'activos' : 'inactivos';
}

// Una suscripción hecha con otra clave pública (si se cambiaron las claves)
// ya no recibe avisos: la nube no puede firmarlos.
function mismaClave(sub) {
  const clave = sub.options?.applicationServerKey;
  if (!clave) return true; // el navegador no la informa: se asume que sirve
  const a = new Uint8Array(clave);
  const b = base64urlABytes(VAPID_PUBLIC_KEY);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// La suscripción de este celular con la clave actual: la que hay, o una nueva.
async function suscribir() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !mismaClave(sub)) {
    await sub.unsubscribe();
    sub = null;
  }
  return sub ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64urlABytes(VAPID_PUBLIC_KEY) });
}

// Devuelve false si la persona no dio el permiso.
export async function activarAvisos() {
  if ((await Notification.requestPermission()) !== 'granted') return false;
  const sub = await suscribir();
  try {
    await guardarSuscripcion(sub.toJSON());
  } catch (error) {
    // Si la nube no anotó el celular, tampoco queda suscrito: así el recuadro no dice "activos" sin serlo.
    await sub.unsubscribe().catch(() => {});
    throw error;
  }
  return true;
}

// Primero se desuscribe el celular, para que deje de recibir avisos aunque la
// nube no responda; si la fila queda allá, la nube la borra cuando el aviso rebota.
export async function desactivarAvisos() {
  const sub = await suscripcion();
  if (!sub) return;
  const { endpoint } = sub;
  await sub.unsubscribe();
  await borrarSuscripcion(endpoint);
}

// Al abrir la app, si los avisos están activos se vuelve a anotar el celular:
// el navegador puede cambiar la dirección sin avisar, y si cambió la clave se renueva.
export async function sincronizarAvisos() {
  try {
    if (modo !== 'nube' || !VAPID_PUBLIC_KEY || globalThis.Notification?.permission !== 'granted') return;
    const sub = await suscripcion();
    if (sub) await guardarSuscripcion((mismaClave(sub) ? sub : await suscribir()).toJSON());
  } catch (e) {
    console.warn('No se pudieron revisar los avisos', e);
  }
}
