// Rutas protegidas del panel: editar textos, subir/borrar/reordenar fotos de la
// galería, reemplazar imágenes fijas, y ver las consultas de eventos corporativos. Se
// montan detrás de auth.requireAdmin en index.js. Landing más chica que la del sitio
// principal de Le Coin: sin testimonios ni redes sociales.

const express = require('express');
const multer = require('multer');
const db = require('../db');
const asyncHandler = require('../asyncHandler');
const { uploadBuffer } = require('../cloudinary');
const { ObjectId } = require('mongodb');

const router = express.Router();

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error('Formato de imagen no soportado. Usá JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  }
});

function withMulterErrors(field) {
  const mw = upload.single(field);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

// ---------- Textos ----------

router.get('/content', asyncHandler(async (req, res) => {
  const contentDoc = await db.getDb().collection('content').findOne({ _id: 'main' });
  const { _id, ...content } = contentDoc || {};
  res.json({ content });
}));

router.put('/content', asyncHandler(async (req, res) => {
  const updates = req.body || {};
  const keys = Object.keys(updates);
  if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar.' });

  const clean = {};
  for (const key of keys) clean[key] = String(updates[key] ?? '');

  await db.getDb().collection('content').updateOne({ _id: 'main' }, { $set: clean }, { upsert: true });

  res.json({ ok: true });
}));

// Reemplazar una imagen fija del contenido (banner_image, logo_image, etc.).
router.post('/content/image', withMulterErrors('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
  const cloudResult = await uploadBuffer(req.file.buffer, 'lecoin-eventos-empresariales/content');
  const url = cloudResult.secure_url;

  const { key } = req.body || {};
  if (key) {
    await db.getDb().collection('content').updateOne({ _id: 'main' }, { $set: { [key]: url } }, { upsert: true });
  }

  res.json({ ok: true, url });
}));

// ---------- Galería ----------

router.get('/gallery', asyncHandler(async (req, res) => {
  const items = await db.getDb().collection('gallery_images').find().sort({ position: 1, _id: 1 }).toArray();
  res.json({ items: items.map(({ _id, url, alt_text, position }) => ({ id: _id, url, alt: alt_text, position })) });
}));

router.post('/gallery', withMulterErrors('image'), asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
  const cloudResult = await uploadBuffer(req.file.buffer, 'lecoin-eventos-empresariales/gallery');
  const url = cloudResult.secure_url;
  const alt = (req.body && req.body.alt) || '';

  const mongo = db.getDb();
  const last = await mongo.collection('gallery_images').find().sort({ position: -1 }).limit(1).toArray();
  const nextPos = last.length > 0 ? last[0].position + 1 : 0;

  const inserted = await mongo.collection('gallery_images').insertOne({ url, alt_text: alt, position: nextPos });

  res.json({ ok: true, id: inserted.insertedId, url });
}));

router.delete('/gallery/:id', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('gallery_images').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'No existe esa imagen.' });

  // Nota: la imagen queda huérfana en Cloudinary (no se borra desde acá) - a esta
  // escala no representa un costo real (plan gratis de 25GB).

  res.json({ ok: true });
}));

// Reordenar: recibe la lista completa de ids en el orden final.
router.put('/gallery/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Falta el array "order".' });

  const ops = order.map((id, index) => ({
    updateOne: { filter: { _id: new ObjectId(id) }, update: { $set: { position: index } } }
  }));
  if (ops.length > 0) await db.getDb().collection('gallery_images').bulkWrite(ops);

  res.json({ ok: true });
}));

// ---------- Consultas (solicitudes de cotización de evento corporativo) ----------

router.get('/messages', asyncHandler(async (req, res) => {
  const items = await db.getDb().collection('contact_messages').find().sort({ created_at: -1 }).toArray();
  res.json({
    items: items.map(({ _id, empresa, contacto, email, telefono, tipo_evento, cantidad_asistentes, fecha_evento, comentarios, created_at, is_read }) =>
      ({ id: _id, empresa, contacto, email, telefono, tipo_evento, cantidad_asistentes, fecha_evento, comentarios, created_at, is_read }))
  });
}));

router.put('/messages/:id/read', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('contact_messages').updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { is_read: true } }
  );
  if (result.matchedCount === 0) return res.status(404).json({ error: 'No existe esa consulta.' });
  res.json({ ok: true });
}));

router.delete('/messages/:id', asyncHandler(async (req, res) => {
  const result = await db.getDb().collection('contact_messages').deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'No existe esa consulta.' });
  res.json({ ok: true });
}));

module.exports = router;
