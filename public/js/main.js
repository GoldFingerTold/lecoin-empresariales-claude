// Trae el contenido de /api/content y arma toda la página con eso.

function apiUrl(path) {
  return (window.API_BASE || '') + path;
}

function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return apiUrl(url);
  return url;
}

// Un solo acento de color para todos los íconos de servicios (mismo criterio que el
// sitio principal de Le Coin: un color consistente, no uno random por ícono).
const SERVICE_ICONS = [
  '<path d="M12 3 3 7v6c0 5 4 8.5 9 10 5-1.5 9-5 9-10V7l-9-4Z"/>', // capacidad
  '<path d="M4 21c0-4 4-6 8-6s8 2 8 6M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/>', // catering
  '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 18v3"/>', // audiovisual/pantalla
  '<circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>', // iluminación
  '<path d="M3 12h18M3 6h18M3 18h18"/>' // logística
];

function iconSvg(index) {
  const path = SERVICE_ICONS[index % SERVICE_ICONS.length];
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function paragraphs(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function renderServicios(text) {
  const el = document.getElementById('servicios-list');
  if (!el) return;
  el.innerHTML = '';
  paragraphs(text).forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'servicio-card';
    const icon = document.createElement('div');
    icon.className = 'servicio-icon';
    icon.innerHTML = iconSvg(index);
    const p = document.createElement('p');
    p.textContent = item;
    card.appendChild(icon);
    card.appendChild(p);
    el.appendChild(card);
  });
}

function renderGallery(items) {
  const el = document.getElementById('gallery');
  if (!el) return;
  el.innerHTML = '';
  items.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const img = document.createElement('img');
    img.src = resolveImageUrl(item.url);
    img.alt = item.alt || 'Foto del salón';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', () => openLightbox(items, index));
    el.appendChild(btn);
  });
}

function renderWhatsapp(url) {
  const waFloat = document.getElementById('whatsapp-float');
  const heroWa = document.getElementById('hero-whatsapp');

  if (url) {
    if (waFloat) { waFloat.href = url; waFloat.hidden = false; }
    if (heroWa) { heroWa.href = url; heroWa.hidden = false; }
  } else {
    if (waFloat) waFloat.hidden = true;
    if (heroWa) heroWa.hidden = true;
  }
}

function renderNavLabels(content) {
  document.querySelectorAll('[data-nav-label]').forEach((el) => {
    const key = el.getAttribute('data-nav-label');
    if (content[key]) el.textContent = content[key];
  });
}

// ---------- Lightbox ----------

let lightboxItems = [];
let lightboxIndex = 0;

function openLightbox(items, index) {
  lightboxItems = items;
  lightboxIndex = index;
  updateLightboxImage();
  document.getElementById('lightbox').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').hidden = true;
  document.body.style.overflow = '';
}
function updateLightboxImage() {
  const item = lightboxItems[lightboxIndex];
  const img = document.getElementById('lightbox-img');
  img.src = resolveImageUrl(item.url);
  img.alt = item.alt || '';
}
function stepLightbox(delta) {
  lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
  updateLightboxImage();
}
function initLightbox() {
  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', () => stepLightbox(-1));
  document.getElementById('lightbox-next').addEventListener('click', () => stepLightbox(1));
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('lightbox').hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });
}

// ---------- Nav móvil ----------

function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ---------- Formulario de solicitud de cotización ----------

function initContactForm() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = 'Enviando...';
    status.className = 'form-status';

    const payload = {
      empresa: form.empresa.value.trim(),
      contacto: form.contacto.value.trim(),
      email: form.email.value.trim(),
      telefono: form.telefono.value.trim(),
      tipo_evento: form.tipo_evento.value,
      cantidad_asistentes: form.cantidad_asistentes.value || null,
      fecha_evento: form.fecha_evento.value,
      comentarios: form.comentarios.value.trim(),
      website: form.website.value // honeypot
    };

    try {
      const res = await fetch(apiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar la solicitud.');

      status.textContent = '¡Gracias! Recibimos tu solicitud, te vamos a contactar a la brevedad con una propuesta.';
      status.className = 'form-status ok';
      form.reset();
    } catch (err) {
      status.textContent = err.message || 'Ocurrió un error al enviar la solicitud.';
      status.className = 'form-status error';
    }
  });
}

// ---------- Carga inicial ----------

async function loadSite() {
  const res = await fetch(apiUrl('/api/content'));
  const { content, gallery } = await res.json();

  document.title = content.site_name || 'Le Coin Eventos Empresariales';
  setText('footer-brand', content.site_name);
  setText('footer-text', content.footer_text);
  document.getElementById('footer-year').textContent = String(new Date().getFullYear());

  const navLogo = document.getElementById('nav-logo');
  if (navLogo && content.logo_image) navLogo.src = resolveImageUrl(content.logo_image);

  const banner = document.getElementById('banner-image');
  if (banner) banner.src = resolveImageUrl(content.banner_image) || '';
  setText('banner-title', content.banner_title);
  setText('banner-subtitle', content.banner_subtitle);

  setText('stat-1-number', content.stat_1_number);
  setText('stat-1-label', content.stat_1_label);
  setText('stat-2-number', content.stat_2_number);
  setText('stat-2-label', content.stat_2_label);
  setText('stat-3-number', content.stat_3_number);
  setText('stat-3-label', content.stat_3_label);

  setText('servicios-heading', content.servicios_heading);
  setText('servicios-subheading', content.servicios_subheading);
  renderServicios(content.servicios_text);

  setText('instalaciones-heading', content.instalaciones_heading);
  setText('instalaciones-subheading', content.instalaciones_subheading);
  setText('instalaciones-text', content.instalaciones_text);

  setText('contact-heading', content.contact_heading);
  setText('contact-subheading', content.contact_subheading);
  setText('contact-address', content.contact_address);
  setText('contact-phone', content.contact_phone);
  setText('contact-email', content.contact_email);
  setText('contact-hours', content.contact_hours);

  renderNavLabels(content);
  renderGallery(gallery);
  renderWhatsapp(content.whatsapp_url);
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initLightbox();
  initContactForm();
  loadSite().catch((err) => {
    console.error('No se pudo cargar el contenido del sitio:', err);
  });
});
