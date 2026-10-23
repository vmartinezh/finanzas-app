// Pantalla de carga: el globo del logo "escribe" (tres puntos, como cuando
// alguien te responde), los puntos se vuelven la k y cae la moneda.
// Completa solo la primera vez del día; las demás veces el logo sale quieto y
// se va apenas cargan los datos. Quieta con "reducir movimiento".
import { hoyISO } from './util.js';
import { sinMovimiento } from './ui.js';

const CLAVE = 'simplifica-carga-dia';
// Por si el navegador no avisa el fin de la animación (pestaña en segundo plano).
const ESPERA_MAXIMA = 2600;
// Puede faltar si el celular mezcla un index.html viejo de la caché con este archivo:
// sin pantalla de carga, la app arranca igual.
const carga = document.getElementById('carga');
let animacion = Promise.resolve();

export function iniciarCarga() {
  if (!carga) return;
  let primeraDelDia = false;
  try { primeraDelDia = localStorage.getItem(CLAVE) !== hoyISO(); } catch { /* sin almacenamiento: quieta */ }
  // La del día solo se gasta si de verdad se va a ver.
  if (!primeraDelDia || sinMovimiento() || document.hidden) {
    carga.classList.add('quieta');
    return;
  }
  try { localStorage.setItem(CLAVE, hoyISO()); } catch { /* se verá de nuevo, no importa */ }
  carga.classList.add('animada');
  // Termina cuando el globo da su saltito: la última animación del CSS.
  animacion = new Promise(listo => {
    carga.querySelector('.globo').addEventListener('animationend', e => {
      if (e.animationName === 'globo-salta') listo();
    });
    setTimeout(listo, ESPERA_MAXIMA);
  });
}

// Se llama cuando la app ya dibujó su primera pantalla: espera a que termine la
// animación (si la hay) y se desvanece dejando ver la app.
export async function terminarCarga() {
  if (!carga) return;
  await animacion;
  carga.classList.add('saliendo');
  setTimeout(() => carga.remove(), 300);
}
