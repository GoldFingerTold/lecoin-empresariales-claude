// Ruta pública: todo lo que necesita la página principal en una sola llamada.
// Landing más chica que la del sitio principal de Le Coin: sin testimonios ni redes
// sociales, solo textos + galería.

const express = require('express');
const db = require('../db');
const asyncHandler = require('../asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const mongo = db.getDb();

  const contentDoc = await mongo.collection('content').findOne({ _id: 'main' });
  const { _id, ...content } = contentDoc || {};

  const gallery = await mongo
    .collection('gallery_images')
    .find({}, { projection: { url: 1, alt_text: 1 } })
    .sort({ position: 1, _id: 1 })
    .toArray();

  res.json({
    content,
    gallery: gallery.map(({ _id, url, alt_text }) => ({ id: _id, url, alt: alt_text }))
  });
}));

module.exports = router;
