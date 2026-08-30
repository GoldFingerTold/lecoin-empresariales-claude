// Subida de imágenes a Cloudinary en vez de al disco local: el disco de la app en
// Hostinger no sobrevive a un redeploy (mismo problema que tuvo la base de datos antes
// de migrarla a Mongo, pero para archivos). Las imágenes semilla en public/img/seed
// siguen viajando con el código sin cambios - esto es solo para lo que se sube desde
// el panel (banner, escuela, galería, etc.).

const cloudinary = require('cloudinary').v2;

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error(
    'Faltan las variables de entorno de Cloudinary (CLOUDINARY_CLOUD_NAME, ' +
    'CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Copiá .env.example a .env y completalas.'
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Sube un buffer en memoria (viene de multer con memoryStorage, no diskStorage) y
// devuelve el resultado de Cloudinary - lo que importa es result.secure_url.
function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
}

module.exports = { uploadBuffer };
