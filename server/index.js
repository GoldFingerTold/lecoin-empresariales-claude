require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');

const db = require('./db');
const auth = require('./auth');
const asyncHandler = require('./asyncHandler');
const contentRoutes = require('./routes/content');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS_ORIGIN solo hace falta cuando el frontend vive en un dominio distinto al de este
// backend. Si no está definida (caso normal: todo en el mismo dominio), no se activa nada.
const crossOriginList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isCrossOrigin = crossOriginList.length > 0;

app.set('trust proxy', 1);

if (isCrossOrigin) {
  app.use(cors({ origin: crossOriginList, credentials: true }));
}

app.use(express.json());

app.use(
  session({
    name: 'lecoin-eventos.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-cambiar-en-produccion',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
      ...(isCrossOrigin ? { sameSite: 'none', secure: true } : {})
    }
  })
);

// Archivos estáticos: el sitio público, las imágenes semilla y lo subido desde el panel.
// Cache-Control explícito: sin esto, la CDN de Hostinger (HCDN) cachea el CSS/JS por
// muchísimo tiempo (más de una hora, visto en la práctica) sin importar el ?v=N de la
// URL ni que el archivo cambie - queda sirviendo una versión vieja a todo el mundo.
const staticOptions = {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
  }
};
app.use(express.static(path.join(__dirname, '..', 'public'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));

// API pública
app.use('/api/content', contentRoutes);
app.use('/api/contact', contactRoutes);

// Login / logout del panel
app.post('/api/admin/login', asyncHandler(auth.login));
app.post('/api/admin/logout', auth.logout);
app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});
app.post('/api/admin/recover', asyncHandler(auth.recover));

// Cambio de contraseña del panel (requiere sesión activa)
app.put('/api/admin/password', auth.requireAdmin, asyncHandler(auth.changePassword));

// Resto de la API de administración, protegida
app.use('/api/admin', auth.requireAdmin, adminRoutes);

// Handler de errores: cualquier ruta async que falle (por ejemplo, un problema de
// conexión con Mongo) cae acá en vez de colgar la respuesta o tirar el stack crudo.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

async function start() {
  await db.connect();
  app.listen(PORT, () => {
    console.log(`Sitio de Le Coin Eventos Empresariales corriendo en http://localhost:${PORT}`);
    console.log(`Panel de administración en http://localhost:${PORT}/admin`);
  });
}

start().catch((err) => {
  console.error('No se pudo arrancar el servidor:', err);
  process.exit(1);
});
