// Lógica del panel de administración: login, textos, fotos, consultas y cuenta. Todo
// habla con /api/admin/*, protegido por sesión. Landing más chica que la del sitio
// principal de Le Coin: sin testimonios ni redes sociales.

const FIELD_GROUPS = [
  {
    title: 'General',
    fields: [
      { key: 'site_name', label: 'Nombre del sitio', type: 'text' },
      { key: 'site_tagline', label: 'Bajada / rubro', type: 'text' },
      { key: 'footer_text', label: 'Texto del pie de página', type: 'text' },
      { key: 'whatsapp_url', label: 'Link de WhatsApp (ej: https://wa.me/5491124615068?text=Hola!)', type: 'text' }
    ]
  },
  {
    title: 'Menú de navegación',
    fields: [
      { key: 'nav_home_label', label: 'Etiqueta "Inicio"', type: 'text' },
      { key: 'nav_servicios_label', label: 'Etiqueta "Servicios"', type: 'text' },
      { key: 'nav_instalaciones_label', label: 'Etiqueta "Instalaciones"', type: 'text' },
      { key: 'nav_contacto_label', label: 'Etiqueta "Solicitar propuesta"', type: 'text' }
    ]
  },
  {
    title: 'Portada',
    fields: [
      { key: 'banner_title', label: 'Título de la portada', type: 'text' },
      { key: 'banner_subtitle', label: 'Bajada de la portada', type: 'textarea' }
    ]
  },
  {
    title: 'Estadísticas (las 3 de la franja debajo de la portada)',
    fields: [
      { key: 'stat_1_number', label: 'Número 1', type: 'text' },
      { key: 'stat_1_label', label: 'Etiqueta 1', type: 'text' },
      { key: 'stat_2_number', label: 'Número 2', type: 'text' },
      { key: 'stat_2_label', label: 'Etiqueta 2', type: 'text' },
      { key: 'stat_3_number', label: 'Número 3', type: 'text' },
      { key: 'stat_3_label', label: 'Etiqueta 3', type: 'text' }
    ]
  },
  {
    title: 'Servicios',
    fields: [
      { key: 'servicios_heading', label: 'Título', type: 'text' },
      { key: 'servicios_subheading', label: 'Antetítulo', type: 'text' },
      { key: 'servicios_text', label: 'Servicios (uno por párrafo - dejá una línea en blanco entre cada uno)', type: 'textarea' }
    ]
  },
  {
    title: 'Instalaciones',
    fields: [
      { key: 'instalaciones_heading', label: 'Título', type: 'text' },
      { key: 'instalaciones_subheading', label: 'Antetítulo', type: 'text' },
      { key: 'instalaciones_text', label: 'Texto', type: 'textarea' }
    ]
  },
  {
    title: 'Contacto',
    fields: [
      { key: 'contact_heading', label: 'Título', type: 'text' },
      { key: 'contact_subheading', label: 'Bajada', type: 'text' },
      { key: 'contact_address', label: 'Dirección', type: 'text' },
      { key: 'contact_phone', label: 'Teléfono', type: 'text' },
      { key: 'contact_email', label: 'Email', type: 'text' },
      { key: 'contact_hours', label: 'Horario', type: 'text' }
    ]
  }
];

function apiUrl(path) {
  return (window.API_BASE || '') + path;
}

function resolveImageUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return apiUrl(url);
  return url;
}

async function api(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error inesperado.');
  return data;
}

// ---------- Login / sesión ----------

async function checkSession() {
  const { isAdmin } = await api('/api/admin/session');
  if (isAdmin) showApp();
  else showLogin();
}

function showLogin() {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('admin-app').hidden = true;
  document.getElementById('login-form').hidden = false;
  document.getElementById('recover-form').hidden = true;
}

function showApp() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('admin-app').hidden = false;
  loadContentTab();
  loadFotosTab();
  loadMensajesTab();
  initPasswordForm();
}

function initLogin() {
  const form = document.getElementById('login-form');
  const status = document.getElementById('login-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    const password = document.getElementById('login-password').value;
    try {
      await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
      document.getElementById('login-password').value = '';
      showApp();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status error';
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    showLogin();
  });
}

function initRecovery() {
  const loginForm = document.getElementById('login-form');
  const recoverForm = document.getElementById('recover-form');
  const recoverStatus = document.getElementById('recover-status');

  document.getElementById('forgot-toggle').addEventListener('click', () => {
    loginForm.hidden = true;
    recoverForm.hidden = false;
  });
  document.getElementById('recover-back').addEventListener('click', () => {
    recoverForm.hidden = true;
    loginForm.hidden = false;
    recoverStatus.textContent = '';
  });

  recoverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    recoverStatus.textContent = '';
    const key = document.getElementById('recover-key').value;
    try {
      await api('/api/admin/recover', { method: 'POST', body: JSON.stringify({ key }) });
      recoverStatus.textContent = 'Listo. Ahora entrá con la contraseña que tenga ADMIN_PASSWORD.';
      recoverStatus.className = 'form-status ok';
      document.getElementById('recover-key').value = '';
    } catch (err) {
      recoverStatus.textContent = err.message;
      recoverStatus.className = 'form-status error';
    }
  });
}

// ---------- Tabs ----------

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ---------- Textos ----------

async function loadContentTab() {
  const form = document.getElementById('content-form');
  const { content } = await api('/api/admin/content');

  form.innerHTML = '';
  FIELD_GROUPS.forEach((group) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'field-group';
    const h3 = document.createElement('h3');
    h3.textContent = group.title;
    groupEl.appendChild(h3);

    group.fields.forEach((field) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = field.label;
      label.setAttribute('for', `field-${field.key}`);
      wrap.appendChild(label);

      const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
      input.id = `field-${field.key}`;
      input.name = field.key;
      if (field.type !== 'textarea') input.type = 'text';
      input.value = content[field.key] || '';
      wrap.appendChild(input);

      groupEl.appendChild(wrap);
    });

    form.appendChild(groupEl);
  });

  const saveBar = document.createElement('div');
  saveBar.className = 'save-bar';
  const status = document.createElement('span');
  status.id = 'content-save-status';
  status.className = 'form-status';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = 'Guardar textos';
  saveBar.appendChild(status);
  saveBar.appendChild(saveBtn);
  form.appendChild(saveBar);

  form.onsubmit = async (e) => {
    e.preventDefault();
    const status = document.getElementById('content-save-status');
    status.textContent = 'Guardando...';
    status.className = 'form-status';
    const updates = {};
    FIELD_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        updates[field.key] = document.getElementById(`field-${field.key}`).value;
      });
    });
    try {
      await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(updates) });
      status.textContent = 'Guardado ✓';
      status.className = 'form-status ok';
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status error';
    }
  };
}

// ---------- Fotos ----------

async function loadFotosTab() {
  const { content } = await api('/api/admin/content');

  document.querySelectorAll('.image-replace').forEach((el) => {
    const key = el.dataset.key;
    const preview = el.querySelector('.image-preview');
    preview.src = resolveImageUrl(content[key]) || '';

    const input = el.querySelector('.image-input');
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', key);
      try {
        const data = await api('/api/admin/content/image', { method: 'POST', body: formData });
        preview.src = resolveImageUrl(data.url);
      } catch (err) {
        alert(err.message);
      } finally {
        input.value = '';
      }
    };
  });

  await loadGalleryAdmin();

  const uploadInput = document.getElementById('gallery-upload-input');
  uploadInput.onchange = async () => {
    const file = uploadInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      await api('/api/admin/gallery', { method: 'POST', body: formData });
      await loadGalleryAdmin();
    } catch (err) {
      alert(err.message);
    } finally {
      uploadInput.value = '';
    }
  };
}

async function loadGalleryAdmin() {
  const grid = document.getElementById('gallery-admin-grid');
  const { items } = await api('/api/admin/gallery');

  if (items.length === 0) {
    grid.innerHTML = '<p class="empty-state">Todavía no hay fotos en la galería.</p>';
    return;
  }

  grid.innerHTML = '';
  items.forEach((item, index) => {
    const cell = document.createElement('div');
    cell.className = 'gallery-admin-item';

    const img = document.createElement('img');
    img.src = resolveImageUrl(item.url);
    img.alt = item.alt || '';
    cell.appendChild(img);

    const actions = document.createElement('div');
    actions.className = 'gallery-admin-item-actions';

    const upBtn = document.createElement('button');
    upBtn.type = 'button';
    upBtn.textContent = '↑';
    upBtn.disabled = index === 0;
    upBtn.onclick = () => moveGalleryItem(items, index, -1);

    const downBtn = document.createElement('button');
    downBtn.type = 'button';
    downBtn.textContent = '↓';
    downBtn.disabled = index === items.length - 1;
    downBtn.onclick = () => moveGalleryItem(items, index, 1);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = 'Borrar';
    delBtn.className = 'danger';
    delBtn.onclick = async () => {
      if (!confirm('¿Borrar esta foto de la galería?')) return;
      await api(`/api/admin/gallery/${item.id}`, { method: 'DELETE' });
      await loadGalleryAdmin();
    };

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    actions.appendChild(delBtn);
    cell.appendChild(actions);
    grid.appendChild(cell);
  });
}

async function moveGalleryItem(items, index, delta) {
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= items.length) return;
  const order = items.map((i) => i.id);
  [order[index], order[newIndex]] = [order[newIndex], order[index]];
  await api('/api/admin/gallery/reorder', { method: 'PUT', body: JSON.stringify({ order }) });
  await loadGalleryAdmin();
}

// ---------- Consultas ----------

async function loadMensajesTab() {
  const list = document.getElementById('messages-list');
  const { items } = await api('/api/admin/messages');

  if (items.length === 0) {
    list.innerHTML = '<p class="empty-state">Todavía no llegó ninguna consulta.</p>';
    return;
  }

  list.innerHTML = '';
  items.forEach((msg) => {
    const el = document.createElement('div');
    el.className = 'message-item' + (msg.is_read ? '' : ' unread');

    const date = new Date(msg.created_at).toLocaleString('es-AR');
    const detalles = [];
    if (msg.tipo_evento) detalles.push(msg.tipo_evento);
    if (msg.cantidad_asistentes) detalles.push(`${msg.cantidad_asistentes} asistentes`);
    if (msg.fecha_evento) detalles.push(`fecha tentativa: ${msg.fecha_evento}`);

    el.innerHTML = `
      <div class="message-item-head">
        <strong>${escapeHtml(msg.empresa)}</strong>
        <span class="message-item-meta">${date}</span>
      </div>
      <div class="message-item-meta">
        ${escapeHtml(msg.contacto)} · ${escapeHtml(msg.email)}${msg.telefono ? ' · ' + escapeHtml(msg.telefono) : ''}
      </div>
      ${detalles.length ? `<div class="message-item-meta">${escapeHtml(detalles.join(' · '))}</div>` : ''}
      ${msg.comentarios ? `<p>${escapeHtml(msg.comentarios)}</p>` : ''}
    `;

    const actions = document.createElement('div');
    actions.className = 'message-item-actions';

    if (!msg.is_read) {
      const readBtn = document.createElement('button');
      readBtn.textContent = 'Marcar como leído';
      readBtn.onclick = async () => {
        await api(`/api/admin/messages/${msg.id}/read`, { method: 'PUT' });
        await loadMensajesTab();
      };
      actions.appendChild(readBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Borrar';
    delBtn.onclick = async () => {
      if (!confirm('¿Borrar esta consulta?')) return;
      await api(`/api/admin/messages/${msg.id}`, { method: 'DELETE' });
      await loadMensajesTab();
    };
    actions.appendChild(delBtn);

    el.appendChild(actions);
    list.appendChild(el);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ---------- Cuenta (cambiar contraseña) ----------

function initPasswordForm() {
  const form = document.getElementById('password-form');
  const status = document.getElementById('password-status');

  form.onsubmit = async (e) => {
    e.preventDefault();
    status.textContent = '';

    const currentPassword = document.getElementById('pw-current').value;
    const newPassword = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;

    if (newPassword !== confirm) {
      status.textContent = 'Las dos contraseñas nuevas no coinciden.';
      status.className = 'form-status error';
      return;
    }

    try {
      await api('/api/admin/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      status.textContent = 'Contraseña actualizada ✓ - usála la próxima vez que entres.';
      status.className = 'form-status ok';
      form.reset();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'form-status error';
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initRecovery();
  initTabs();
  checkSession();
});
