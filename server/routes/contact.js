// Ruta pública: recibe la solicitud de cotización de evento corporativo. A diferencia
// de un formulario de contacto genérico, pide los datos que hacen falta para calificar
// un lead de evento de empresa (tipo de evento, cantidad de asistentes, fecha) - no
// envía email, se guarda para verse desde el panel (pestaña "Consultas").

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_EVENTO = new Set([
  'Fin de año',
  'Lanzamiento de producto',
  'Capacitación / Convención',
  'Aniversario de empresa',
  'Otro'
]);

router.post('/', asyncHandler(async (req, res) => {
  const {
    empresa,
    contacto,
    email,
    telefono,
    tipo_evento,
    cantidad_asistentes,
    fecha_evento,
    comentarios,
    website // honeypot
  } = req.body || {};

  // Campo "website" es un honeypot: un campo oculto por CSS que ningún humano completa,
  // pero que los bots de formularios suelen rellenar solos.
  if (website) {
    return res.json({ ok: true });
  }

  if (!empresa || !empresa.trim()) return res.status(400).json({ error: 'Falta el nombre de la empresa.' });
  if (!contacto || !contacto.trim()) return res.status(400).json({ error: 'Falta el nombre de contacto.' });
  if (!email || !EMAIL_RE.test(email.trim())) return res.status(400).json({ error: 'El email no es válido.' });
  if (tipo_evento && !TIPOS_EVENTO.has(tipo_evento)) {
    return res.status(400).json({ error: 'Tipo de evento inválido.' });
  }

  let asistentes = null;
  if (cantidad_asistentes !== undefined && cantidad_asistentes !== null && cantidad_asistentes !== '') {
    const n = Number(cantidad_asistentes);
    if (!Number.isInteger(n) || n < 1) {
      return res.status(400).json({ error: 'La cantidad de asistentes tiene que ser un número entero mayor a 0.' });
    }
    asistentes = n;
  }

  await db.getDb().collection('contact_messages').insertOne({
    empresa: empresa.trim(),
    contacto: contacto.trim(),
    email: email.trim(),
    telefono: (telefono || '').trim(),
    tipo_evento: tipo_evento || '',
    cantidad_asistentes: asistentes,
    fecha_evento: (fecha_evento || '').trim(),
    comentarios: (comentarios || '').trim(),
    created_at: new Date(),
    is_read: false
  });

  res.json({ ok: true });
}));

module.exports = router;
