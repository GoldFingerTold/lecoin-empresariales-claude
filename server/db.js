// Conexión a MongoDB Atlas + contenido semilla. Mismo patrón que Le Coin Recepciones,
// pero esta es una landing aparte (con su propio panel) enfocada en eventos corporativos:
// menos secciones que el sitio principal (sin testimonios ni redes sociales), y el
// formulario de contacto pide los datos de una cotización de evento de empresa en vez de
// un mensaje genérico.
//
// El contenido de acá abajo es un placeholder razonable para arrancar - Matías (el que
// maneja las ventas corporativas de Le Coin) lo va a completar con el material real desde
// el panel de admin, así que no hace falta que estos textos sean definitivos.

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    'Falta la variable de entorno MONGODB_URI (el connection string de MongoDB Atlas). ' +
    'Copiá .env.example a .env y completala antes de arrancar el servidor.'
  );
}

const client = new MongoClient(uri);
let db = null;

function getDb() {
  if (!db) throw new Error('La base de datos todavía no está conectada. Llamá a connect() primero.');
  return db;
}

async function connect() {
  await client.connect();
  db = client.db();
  await ensureIndexes();
  await seedIfEmpty();
  console.log('Conectado a MongoDB Atlas.');
}

async function ensureIndexes() {
  await db.collection('gallery_images').createIndex({ position: 1 });
  await db.collection('contact_messages').createIndex({ created_at: -1 });
}

// --- Contenido semilla (placeholder - Matías lo reemplaza desde el panel) ---
const DEFAULT_CONTENT = {
  site_name: 'Le Coin Eventos Empresariales',
  logo_image: '/img/seed/logo.png',
  site_tagline: 'Eventos corporativos',

  nav_home_label: 'Inicio',
  nav_servicios_label: 'Servicios',
  nav_instalaciones_label: 'Instalaciones',
  nav_contacto_label: 'Solicitar propuesta',

  whatsapp_url: '',

  banner_image: '/img/seed/banquete.png',
  banner_title: 'Eventos corporativos en Le Coin',
  banner_subtitle: 'Fiestas de fin de año, lanzamientos, capacitaciones y aniversarios de empresa en un espacio pensado para grupos grandes.',

  stat_1_number: '120',
  stat_1_label: 'Invitados de capacidad',
  stat_2_number: '10',
  stat_2_label: 'Años de trayectoria',
  stat_3_number: '50+',
  stat_3_label: 'Eventos realizados',

  servicios_heading: 'Todo resuelto para tu evento de empresa',
  servicios_subheading: 'Servicios',
  servicios_text: [
    'Espacio climatizado con capacidad para 120 personas, ideal para fiestas de fin de año, lanzamientos y convenciones.',
    'Catering ejecutivo personalizado, adaptado al formato del evento (cena, cóctel, coffee break).',
    'Equipamiento audiovisual: pantalla de proyección, sonido profesional y micrófono para presentaciones.',
    'Iluminación y ambientación a medida, con suite privada para organizadores.',
    'Estacionamiento y coordinación logística para grupos grandes.'
  ].join('\n\n'),

  instalaciones_heading: 'Nuestro espacio',
  instalaciones_subheading: 'Instalaciones',
  instalaciones_text: 'Un salón versátil que se adapta tanto a un formato de gala como a una convención de trabajo, con toda la infraestructura necesaria para que el evento salga sin sobresaltos.',

  contact_heading: 'Solicitá tu propuesta a medida',
  contact_subheading: 'Contacto corporativo',
  contact_address: 'Dr. Ramón Carrillo 2486, San Martín',
  contact_phone: '11 2461-5068',
  contact_email: 'eventos@lecoineventos.com',
  contact_hours: 'Lunes a Viernes, 09:00 a 18:00 hs',

  footer_text: 'Le Coin Eventos Empresariales'
};

const DEFAULT_GALLERY = [
  { url: '/img/seed/banquete.png', alt_text: 'Salón preparado para un evento' }
];

async function seedIfEmpty() {
  const contentDoc = await db.collection('content').findOne({ _id: 'main' });
  if (!contentDoc) {
    await db.collection('content').insertOne({ _id: 'main', ...DEFAULT_CONTENT });
  } else {
    const missing = {};
    for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
      if (!(key in contentDoc)) missing[key] = value;
    }
    if (Object.keys(missing).length > 0) {
      await db.collection('content').updateOne({ _id: 'main' }, { $set: missing });
    }
  }

  const galleryCount = await db.collection('gallery_images').countDocuments();
  if (galleryCount === 0) {
    await db.collection('gallery_images').insertMany(
      DEFAULT_GALLERY.map((item, i) => ({ ...item, position: i }))
    );
  }

  const adminDoc = await db.collection('admin_user').findOne({ _id: 'admin' });
  if (!adminDoc) {
    const password = process.env.ADMIN_PASSWORD || 'cambiar-esta-clave';
    const hash = bcrypt.hashSync(password, 10);
    await db.collection('admin_user').insertOne({ _id: 'admin', password_hash: hash });
    if (!process.env.ADMIN_PASSWORD) {
      console.warn(
        '[aviso] No hay ADMIN_PASSWORD en .env: se creó el usuario admin con la clave por defecto ' +
        '"cambiar-esta-clave". Copiá .env.example a .env y definí una clave propia antes de publicar el sitio.'
      );
    }
  }
}

module.exports = { connect, getDb, ObjectId };
