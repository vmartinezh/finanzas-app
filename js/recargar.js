// Deslizar hacia abajo para actualizar, en la app instalada (en el navegador ya
// lo hace el propio navegador). Al soltar, borra la copia de la app guardada en
// el teléfono y recarga: se ven los cambios nuevos de inmediato, sin la segunda
// carga que pide sw.js, y sin borrar el acceso directo. Sin conexión no borra
// nada: la app sigue funcionando con la copia que tiene.
import { avisar } from './ui.js';

// Cuánto hay que tirar (en px, ya amortiguado) para que al soltar actualice.
const UMBRAL = 70;
const MAXIMO = 110;

const instalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// Si el dedo parte en algo con su propio desplazamiento (una lista, un cuadro
// de texto) que no está arriba del todo, el gesto es para eso y no para la app.
function dentroDeAlgoDesplazado(el) {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return true;
  }
  return false;
}

async function actualizar() {
  try {
    const respuesta = await fetch('./', { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(respuesta.status);
  } catch {
    return false;
  }
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    await registro?.update();
    await Promise.all((await caches.keys()).map(c => caches.delete(c)));
  } catch { /* igual recarga: lo peor es ver la versión guardada una vez más */ }
  location.reload();
  return true;
}

export function activarRecarga() {
  if (!instalada() || !('ontouchstart' in window)) return;
  const indicador = document.createElement('div');
  indicador.className = 'tirar-actualizar';
  indicador.setAttribute('aria-hidden', 'true');
  indicador.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg><span></span>';
  document.body.append(indicador);
  const texto = indicador.querySelector('span');

  let desde = null;
  let tiron = 0;
  let ocupado = false;

  const mostrar = () => {
    indicador.style.transform = `translate(-50%, ${tiron - 60}px)`;
    indicador.style.opacity = Math.min(tiron / UMBRAL, 1);
    const listo = tiron >= UMBRAL;
    indicador.classList.toggle('listo', listo);
    texto.textContent = listo ? 'Suelta para actualizar' : 'Desliza para actualizar';
  };
  const esconder = () => {
    desde = null;
    tiron = 0;
    indicador.classList.remove('listo', 'activo');
    indicador.style.transform = '';
    indicador.style.opacity = '';
  };

  addEventListener('touchstart', e => {
    desde = null;
    if (ocupado || window.scrollY > 0 || e.touches.length !== 1) return;
    if (document.querySelector('dialog[open]') || dentroDeAlgoDesplazado(e.target)) return;
    desde = e.touches[0].clientY;
  }, { passive: true });

  addEventListener('touchmove', e => {
    if (desde === null) return;
    const distancia = e.touches[0].clientY - desde;
    if (distancia <= 0 || window.scrollY > 0) { if (tiron) esconder(); return; }
    tiron = Math.min(distancia * 0.5, MAXIMO);
    indicador.classList.add('activo');
    mostrar();
  }, { passive: true });

  const soltar = async () => {
    if (desde === null) return;
    if (tiron < UMBRAL) { esconder(); return; }
    ocupado = true;
    desde = null;
    // Sin los estilos del arrastre, la píldora vuelve a su lugar fijo mientras actualiza.
    indicador.style.transform = '';
    indicador.style.opacity = '';
    indicador.classList.remove('activo');
    indicador.classList.add('actualizando');
    texto.textContent = 'Actualizando…';
    if (!(await actualizar())) {
      avisar('Sin conexión: sigues viendo la última versión que tenías.', 'error');
      indicador.classList.remove('actualizando');
      esconder();
      ocupado = false;
    }
  };
  addEventListener('touchend', soltar);
  addEventListener('touchcancel', esconder);
}
