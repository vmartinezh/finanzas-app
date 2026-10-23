import { datos, guardar, borrar, guardarPerfil, modo, exportar, importar, cerrarSesion, TABLAS, PREFIJO } from '../db.js';
import { cargarEjemplo } from '../semillas.js';
import { abrirFormulario, ejecutar, avisar, confirmar, inputMonto } from '../ui.js';
import { clp, esc, hoyISO, leerMonto, NOMBRE_APP } from '../util.js';
import { correoHTML, montarCorreo } from '../correo.js';

export const titulo = 'Ajustes';

export function render() {
  const p = datos.perfil;
  const categorias = datos.categorias.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return `
    <section class="tarjeta">
      <h2>Mi mes</h2>
      <form id="form-perfil">
        <label class="campo"><span>Ingreso mensual líquido ($)</span>
          ${inputMonto({ nombre: 'ingreso_mensual', valor: p.ingreso_mensual || '', placeholder: 'ej: 1.500.000' })}
          <small>Lo que te llega a la cuenta. Si son dos sueldos en la casa, súmalos.</small>
        </label>
        <label class="campo"><span>Quiero ahorrar al mes ($)</span>
          ${inputMonto({ nombre: 'meta_ahorro', valor: p.meta_ahorro || '' })}
          <small>Se descuenta antes de calcular lo que puedes gastar. Mientras tengas deudas caras, conviene más abonarlas.</small>
        </label>
        <button class="boton primario">Guardar</button>
      </form>
    </section>

    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>Eventos</h2><button class="boton pequeño" id="nuevo-evento">+ Agregar</button></div>
      <p class="ayuda">Gastos extraordinarios que no quieres que se mezclen con un mes normal: matrimonio, viaje, mudanza.</p>
      ${datos.eventos.length ? `<ul class="lista">${datos.eventos.map(e => `
        <li><button class="fila" data-evento="${e.id}">
          <span class="fila-texto"><b>${esc(e.nombre)}</b><small>${e.palabras ? 'Palabras: ' + esc(e.palabras) : 'Sin palabras clave'}${e.activo === false ? ' · cerrado' : ''}</small></span>
        </button></li>`).join('')}</ul>` : ''}
    </section>

    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>Categorías</h2><button class="boton pequeño" id="nueva-categoria">+ Agregar</button></div>
      <ul class="lista">${categorias.map(c => `
        <li><button class="fila" data-categoria="${c.id}">
          <span class="icono-cat" aria-hidden="true">${esc(c.icono)}</span>
          <span class="fila-texto"><b>${esc(c.nombre)}</b><small>${c.tipo === 'ingreso' ? 'Ingreso' : c.tope_mensual ? 'Tope ' + clp(c.tope_mensual) : 'Sin tope'}</small></span>
        </button></li>`).join('')}</ul>
    </section>

    ${correoHTML()}

    <section class="tarjeta">
      <h2>Mis datos</h2>
      <p class="ayuda">${modo === 'local'
        ? 'Tus datos están guardados <b>solo en este navegador</b>. Si borras los datos del navegador o cambias de celular, se pierden: descarga un respaldo de vez en cuando.'
        : 'Tus datos están guardados en tu cuenta en la nube.'}</p>
      <div class="botones">
        <button class="boton secundario" id="exportar">Descargar respaldo</button>
        <label class="boton secundario">Restaurar respaldo<input type="file" id="importar" accept="application/json,.json" hidden></label>
        <button class="boton secundario" id="ejemplo">Cargar datos de ejemplo</button>
        ${modo === 'nube' ? '<button class="boton secundario" id="salir">Cerrar sesión</button>' : '<button class="boton peligro" id="borrar-todo">Borrar todo</button>'}
      </div>
    </section>

    <p class="pie">${NOMBRE_APP} es software libre · <a href="https://github.com/vmartinezh/finanzas-app" target="_blank" rel="noopener">código en GitHub</a></p>
  `;
}

async function editarCategoria(c, refrescar) {
  const nueva = !c;
  c = c || { tipo: 'gasto', tope_mensual: 0, orden: datos.categorias.length };
  const v = await abrirFormulario({
    titulo: nueva ? 'Nueva categoría' : c.nombre,
    puedeBorrar: !nueva,
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', valor: c.nombre, requerido: true },
      { nombre: 'icono', etiqueta: 'Emoji', valor: c.icono, placeholder: '🐶' },
      { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', valor: c.tipo, opciones: [['gasto', 'Gasto'], ['ingreso', 'Ingreso']] },
      { nombre: 'palabras', etiqueta: 'Palabras clave (separadas por coma)', valor: c.palabras, placeholder: 'ej: veterinaria, pet, alimento perro', ayuda: 'Si una compra o lo que escribes contiene alguna, se clasifica aquí.' },
    ],
  });
  if (!v) return;
  if (v === 'borrar') {
    const usados = datos.movimientos.filter(m => m.categoria_id === c.id).length;
    if (usados && !(await confirmar(`Hay ${usados} movimientos en esta categoría. Quedarán "sin categoría". ¿Borrar igual?`))) return;
    return ejecutar(async () => {
      for (const m of datos.movimientos.filter(m => m.categoria_id === c.id)) await guardar('movimientos', { ...m, categoria_id: null });
      for (const r of datos.reglas.filter(r => r.categoria_id === c.id)) await borrar('reglas', r.id);
      await borrar('categorias', c.id);
    }, 'Categoría borrada', refrescar);
  }
  ejecutar(() => guardar('categorias', { ...c, ...v, icono: v.icono || '•' }), 'Categoría guardada', refrescar);
}

async function editarEvento(e, refrescar) {
  const nuevo = !e;
  e = e || { activo: true };
  const v = await abrirFormulario({
    titulo: nuevo ? 'Nuevo evento' : e.nombre,
    puedeBorrar: !nuevo,
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', valor: e.nombre, requerido: true, placeholder: 'ej: Matrimonio' },
      { nombre: 'palabras', etiqueta: 'Palabras clave (separadas por coma)', valor: e.palabras, placeholder: 'ej: matri, boda, fiesta', ayuda: 'Si escribes alguna al describir una compra, se asocia a este evento.' },
      { nombre: 'activo', etiqueta: 'Activo (desmárcalo cuando termine)', tipo: 'checkbox', valor: e.activo !== false },
    ],
  });
  if (!v) return;
  if (v === 'borrar') {
    return ejecutar(async () => {
      for (const m of datos.movimientos.filter(m => m.evento_id === e.id)) await guardar('movimientos', { ...m, evento_id: null });
      await borrar('eventos', e.id);
    }, 'Evento borrado', refrescar);
  }
  ejecutar(() => guardar('eventos', { ...e, ...v }), 'Evento guardado', refrescar);
}

export function montar(raiz, refrescar) {
  raiz.querySelector('#form-perfil').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target;
    ejecutar(() => guardarPerfil({
      ingreso_mensual: Math.max(0, leerMonto(f.ingreso_mensual.value)),
      meta_ahorro: Math.max(0, leerMonto(f.meta_ahorro.value)),
    }), 'Guardado', refrescar);
  });

  montarCorreo(raiz);
  raiz.querySelector('#nueva-categoria').addEventListener('click', () => editarCategoria(null, refrescar));
  raiz.querySelectorAll('[data-categoria]').forEach(b => b.addEventListener('click', () => editarCategoria(datos.categorias.find(c => c.id === b.dataset.categoria), refrescar)));
  raiz.querySelector('#nuevo-evento').addEventListener('click', () => editarEvento(null, refrescar));
  raiz.querySelectorAll('[data-evento]').forEach(b => b.addEventListener('click', () => editarEvento(datos.eventos.find(e => e.id === b.dataset.evento), refrescar)));

  raiz.querySelector('#exportar').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportar(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `simplifika-respaldo-${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  raiz.querySelector('#importar').addEventListener('change', async ev => {
    const archivo = ev.target.files[0];
    if (!archivo) return;
    try {
      const copia = JSON.parse(await archivo.text());
      if (!(await confirmar('Esto REEMPLAZA todos tus datos actuales por los del respaldo. ¿Seguir?'))) return;
      await ejecutar(async () => {
        const { sueltos, descartadas } = await importar(copia);
        const notas = [];
        if (sueltos) notas.push(`${sueltos === 1 ? '1 dato quedó' : `${sueltos} datos quedaron`} sin su categoría, evento o deuda porque el archivo no la traía`);
        if (descartadas) notas.push(`${descartadas === 1 ? '1 fila venía repetida o incompleta y no se usó' : `${descartadas} filas venían repetidas o incompletas y no se usaron`}`);
        avisar(notas.length ? `Respaldo restaurado. ${notas.join('. ')}.` : 'Respaldo restaurado');
      }, null, refrescar);
    } catch (e) {
      avisar('No se pudo leer el archivo: ' + e.message, 'error');
    }
  });

  raiz.querySelector('#ejemplo').addEventListener('click', async () => {
    if (!(await confirmar('Se agregarán deudas, pagos y gastos ficticios para que pruebes la app. ¿Seguir?'))) return;
    ejecutar(cargarEjemplo, 'Datos de ejemplo cargados', refrescar);
  });

  raiz.querySelector('#salir')?.addEventListener('click', cerrarSesion);
  raiz.querySelector('#borrar-todo')?.addEventListener('click', async () => {
    if (!(await confirmar('Esto borra TODOS tus datos de este navegador y no se puede deshacer. ¿Descargaste un respaldo?'))) return;
    for (const t of [...TABLAS, 'perfil']) localStorage.removeItem(PREFIJO + t);
    location.reload();
  });
}
