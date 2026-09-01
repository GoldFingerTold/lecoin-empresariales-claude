// Aviso por email cuando llega una consulta nueva por algún formulario del sitio. Usa
// Resend (resend.com) - a diferencia de Cloudinary o Mongo, esto es OPCIONAL: si falta
// RESEND_API_KEY o NOTIFY_EMAIL, el sitio sigue funcionando normal, simplemente no manda
// el aviso (el mensaje ya quedó guardado en la base de todas formas, visible en el
// panel). El remitente vive en el dominio de FrontyBack (no en el del cliente), así no
// hace falta verificar un dominio nuevo por cada sitio que se suma.

let resendClient = null;
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn(
    '[aviso] No hay RESEND_API_KEY en .env: los avisos por email de consultas nuevas ' +
    'están desactivados (el sitio funciona igual, solo no manda el aviso).'
  );
}

const FROM = process.env.NOTIFY_FROM || 'FrontyBack <avisos@frontyback.com>';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Arma el cuerpo del email a partir de pares [etiqueta, valor] - salta los que vienen
// vacíos (ej: teléfono opcional que no completaron) para no dejar renglones en blanco.
function renderFields(pairs) {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
    .join('\n');
}

// Nunca lanza - un error al mandar el email no puede tirar abajo la respuesta al
// formulario público (el dato importante, guardarlo en la base, ya se hizo antes de
// llamar a esto).
async function notify(subject, html) {
  const to = process.env.NOTIFY_EMAIL;
  if (!resendClient || !to) return;
  try {
    await resendClient.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('No se pudo enviar el email de aviso:', err.message);
  }
}

module.exports = { notify, renderFields, escapeHtml };
