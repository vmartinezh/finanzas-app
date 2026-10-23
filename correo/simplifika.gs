// Simplifika · gastos desde tu correo
//
// Corre en TU cuenta de Google: nadie más lee tus correos. Cada 10 minutos
// busca los avisos de compra de tu banco que llegaron en los últimos días y
// los manda a tu cuenta de Simplifika, donde quedan como gastos "por revisar".
// Solo mira correos de bancos (BANCOS, abajo). Recuerda cada mensaje que ya
// mandó (el banco suele juntar sus avisos en una sola conversación) y le pone
// la etiqueta "Simplifika" a la conversación, para que la reconozcas.
//
// Cómo instalarlo (también está explicado en Simplifika → Ajustes):
//   1. Entra a script.google.com con tu cuenta de Gmail → Nuevo proyecto.
//   2. Borra lo que trae y pega este archivo completo (la app ya le puso tu clave).
//   3. Arriba, elige la función "instalar" y toca Ejecutar. Google te pedirá
//      permiso para leer tu Gmail: es tu propio script, por eso dice "no verificado".
//
// Para dejar de usarlo: en script.google.com → Activadores, borra el activador
// (o cambia la clave en Simplifika: la vieja deja de funcionar).

const URL_SIMPLIFIKA = '{{URL}}';
const CLAVE = '{{CLAVE}}';

const BANCOS = {{DOMINIOS}};
const ETIQUETA = 'Simplifika';
const MAX_RECORDADOS = 500;

function instalar() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'revisarCorreo')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('revisarCorreo').timeBased().everyMinutes(10).create();
  revisarCorreo();
}

function revisarCorreo() {
  const etiqueta = GmailApp.getUserLabelByName(ETIQUETA) || GmailApp.createLabel(ETIQUETA);
  const propiedades = PropertiesService.getUserProperties();
  const enviados = JSON.parse(propiedades.getProperty('enviados') || '[]');
  const remitentes = BANCOS.map(d => 'from:' + d).join(' OR ');
  const hilos = GmailApp.search('(' + remitentes + ') newer_than:3d', 0, 30);

  hilos.forEach(hilo => {
    hilo.getMessages().forEach(mensaje => {
      if (enviados.includes(mensaje.getId())) return;
      const respuesta = UrlFetchApp.fetch(URL_SIMPLIFIKA, {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify({
          clave: CLAVE,
          id: mensaje.getId(),
          remitente: mensaje.getFrom(),
          asunto: mensaje.getSubject(),
          texto: mensaje.getPlainBody().slice(0, 20000),
          fecha: Utilities.formatDate(mensaje.getDate(), 'America/Santiago', 'yyyy-MM-dd'),
        }),
      });
      // Si algo falla (sin conexión, clave cambiada), se reintenta en la próxima vuelta.
      if (respuesta.getResponseCode() === 200) {
        enviados.push(mensaje.getId());
        hilo.addLabel(etiqueta);
      } else {
        console.warn('Simplifika respondió ' + respuesta.getResponseCode() + ': ' + respuesta.getContentText().slice(0, 200));
      }
    });
  });
  propiedades.setProperty('enviados', JSON.stringify(enviados.slice(-MAX_RECORDADOS)));
}
