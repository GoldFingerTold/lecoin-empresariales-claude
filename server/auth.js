// Login de administrador: una sola cuenta, sesión por cookie, con un límite simple de
// intentos fallidos por IP para frenar fuerza bruta (suficiente para un sitio con un
// único admin, sin necesidad de infraestructura extra).

const bcrypt = require('bcryptjs');
const db = require('./db');

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const attemptsByIp = new Map();

function isRateLimited(ip) {
  const entry = attemptsByIp.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailedAttempt(ip) {
  const entry = attemptsByIp.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attemptsByIp.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  attemptsByIp.delete(ip);
}

async function login(req, res) {
  const ip = req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Falta la contraseña.' });
  }

  const user = await db.getDb().collection('admin_user').findOne({ _id: 'admin' });
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    registerFailedAttempt(ip);
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  clearAttempts(ip);
  req.session.isAdmin = true;
  res.json({ ok: true });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
}

// Cambiar la contraseña del panel. Solo se llega acá ya logueado (requireAdmin), pero
// igual se pide la contraseña actual como confirmación extra antes de reemplazarla.
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Faltan datos.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'La contraseña nueva tiene que tener al menos 8 caracteres.' });
  }

  const user = await db.getDb().collection('admin_user').findOne({ _id: 'admin' });
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.getDb().collection('admin_user').updateOne({ _id: 'admin' }, { $set: { password_hash: newHash } });

  res.json({ ok: true });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'No autenticado.' });
}

// Recuperación sin email: si se perdió la contraseña, esto la resetea al valor que
// tenga la variable de entorno ADMIN_PASSWORD en este momento (podés cambiarla en el
// panel de tu hosting cuando la necesites, y reiniciar la app para que tome el valor
// nuevo). Solo funciona si ADMIN_RECOVERY_KEY está definida - si no, la vía queda
// deshabilitada por completo, para no dejar una puerta trasera abierta sin querer.
async function recover(req, res) {
  const ip = req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
  }

  const recoveryKey = process.env.ADMIN_RECOVERY_KEY;
  if (!recoveryKey) {
    return res.status(404).json({ error: 'La recuperación no está habilitada en este servidor.' });
  }

  const { key } = req.body || {};
  if (!key || key !== recoveryKey) {
    registerFailedAttempt(ip);
    return res.status(401).json({ error: 'La clave de recuperación no es correcta.' });
  }

  clearAttempts(ip);
  const newPassword = process.env.ADMIN_PASSWORD || 'cambiar-esta-clave';
  const newHash = bcrypt.hashSync(newPassword, 10);
  await db.getDb().collection('admin_user').updateOne({ _id: 'admin' }, { $set: { password_hash: newHash } });

  res.json({ ok: true });
}

module.exports = { login, logout, requireAdmin, changePassword, recover };
