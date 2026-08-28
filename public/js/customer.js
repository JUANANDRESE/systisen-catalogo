// ── State ──────────────────────────────────────────────────────────────────
const cart = new Map(); // itemId → { item, qty }
let menuData = null;
let isMobileCartOpen = false;

// ── Boot ───────────────────────────────────────────────────────────────────
async function init() {
  const menu = await fetch('/api/productos').then(r => r.json());

  menuData = menu;

  document.getElementById('restauranteName').textContent = menu.empresa;
  document.getElementById('restauranteSlogan').textContent = menu.slogan || '';
  document.title = `${menu.empresa} — Catálogo`;

  renderCategories(menu.categorias);
  renderMenu(menu.categorias);
}

// ── Render menu ─────────────────────────────────────────────────────────────
function renderCategories(categorias) {
  const nav = document.getElementById('categoryNav');
  categorias.forEach((cat, i) => {
    const btn = document.createElement('button');
    btn.className = 'cat-tab' + (i === 0 ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.textContent = `${cat.icono} ${cat.nombre}`;
    btn.dataset.cat = cat.nombre;
    btn.onclick = () => scrollToCategory(cat.nombre, btn);
    nav.appendChild(btn);
  });
}

function renderMenu(categorias) {
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = '';

  categorias.forEach(cat => {
    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = `cat-${cat.nombre.replace(/\s+/g, '-')}`;

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.innerHTML = `<span>${cat.icono}</span> ${cat.nombre}`;
    section.appendChild(title);

    const itemGrid = document.createElement('div');
    itemGrid.className = 'menu-grid';

    cat.items.forEach(item => {
      itemGrid.appendChild(buildCard(item));
    });

    section.appendChild(itemGrid);
    grid.appendChild(section);
  });
}

function buildCard(item) {
  const card = document.createElement('div');
  card.className = 'menu-card' + (item.disponible === false ? ' unavailable' : '');
  card.id = `card-${item.id}`;

  const qty = cart.has(item.id) ? cart.get(item.id).qty : 0;

  const media = item.foto
    ? `<img class="item-photo" src="${item.foto}" alt="${item.nombre}" loading="lazy" />`
    : `<div class="item-emoji">${item.emoji || '📦'}</div>`;

  const sinPrecio = !item.precio || item.precio <= 0;

  card.innerHTML = `
    ${media}
    <div class="item-name">${item.nombre}</div>
    <div class="item-desc">${item.descripcion || ''}</div>
    <div class="item-footer">
      <span class="item-price">${sinPrecio ? 'Consultar precio' : formatPrice(item.precio)}</span>
      <div class="item-controls">
        ${sinPrecio ? '' : qty > 0 ? `
          <button class="btn-qty btn-minus" onclick="changeQty('${item.id}', -1)" aria-label="Quitar uno">−</button>
          <span class="qty-display">${qty}</span>
        ` : `<button class="btn-qty btn-add" onclick="changeQty('${item.id}', 1)" aria-label="Agregar">+</button>`}
      </div>
    </div>
    ${item.disponible === false && !sinPrecio ? '<span class="unavailable-tag">No disponible</span>' : ''}
  `;
  return card;
}

function refreshCard(itemId) {
  const item = findItem(itemId);
  if (!item) return;
  const old = document.getElementById(`card-${itemId}`);
  if (!old) return;
  old.replaceWith(buildCard(item));
}

function findItem(id) {
  for (const cat of menuData.categorias) {
    const item = cat.items.find(i => i.id === id);
    if (item) return item;
  }
  return null;
}

// ── Cart logic ──────────────────────────────────────────────────────────────
window.changeQty = function changeQty(itemId, delta) {
  const item = findItem(itemId);
  if (!item) return;

  const current = cart.has(itemId) ? cart.get(itemId).qty : 0;
  const next = current + delta;

  if (next <= 0) {
    cart.delete(itemId);
  } else {
    cart.set(itemId, { item, qty: next });
  }

  refreshCard(itemId);
  renderCartPanel();
}

window.removeCartItem = function removeCartItem(itemId) {
  cart.delete(itemId);
  refreshCard(itemId);
  renderCartPanel();
}

function renderCartPanel() {
  const items = [...cart.values()];
  const total = items.reduce((s, { item, qty }) => s + item.precio * qty, 0);
  const count = items.reduce((s, { qty }) => s + qty, 0);

  document.getElementById('cartCount').textContent = count;

  const listEl = document.getElementById('cartList');
  const emptyEl = document.getElementById('cartEmpty');
  const footerEl = document.getElementById('cartFooter');
  const fabEl = document.getElementById('cartFab');

  if (items.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = '';
    footerEl.style.display = 'none';
    fabEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  footerEl.style.display = '';
  fabEl.style.display = '';

  listEl.innerHTML = items.map(({ item, qty }) => `
    <li class="cart-item">
      <span class="cart-item-emoji">${item.emoji || '🍽️'}</span>
      <span class="cart-item-name">${item.nombre}</span>
      <span class="cart-item-qty">${qty}x</span>
      <span class="cart-item-price">${formatPrice(item.precio * qty)}</span>
      <button class="cart-item-remove" onclick="removeCartItem('${item.id}')" aria-label="Quitar">✕</button>
    </li>
  `).join('');

  document.getElementById('cartTotal').textContent = formatPrice(total);
  document.getElementById('fabCount').textContent = count;
  document.getElementById('fabTotal').textContent = formatPrice(total);
}

// ── Confirm modal ───────────────────────────────────────────────────────────
window.openConfirmModal = function () {
  if (cart.size === 0) return;

  const items = [...cart.values()];
  const total = items.reduce((s, { item, qty }) => s + item.precio * qty, 0);

  document.getElementById('modalItems').innerHTML = items.map(({ item, qty }) => `
    <li>
      <span class="mi-name">${qty}× ${item.nombre}</span>
      <span class="mi-price">${formatPrice(item.precio * qty)}</span>
    </li>
  `).join('');

  document.getElementById('modalTotal').textContent = formatPrice(total);

  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('confirmModal').classList.add('open');
};

window.closeConfirmModal = function () {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('confirmModal').classList.remove('open');
};

window.sendOrder = async function () {
  const nombreCliente = document.getElementById('nombreInput').value.trim();
  const telefonoCliente = document.getElementById('telefonoInput').value.trim();

  if (!nombreCliente || !telefonoCliente) {
    alert('Ingresá tu nombre y teléfono para continuar.');
    return;
  }

  const btn = document.getElementById('btnSendOrder');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const items = [...cart.values()].map(({ item, qty }) => ({ id: item.id, qty }));
  const notas = document.getElementById('notasInput').value.trim();

  try {
    const res = await fetch('/api/pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreCliente, telefonoCliente, items, notas }),
    });

    if (!res.ok) throw new Error((await res.json()).error || 'Error desconocido');

    const { orderId, total, whatsappUrl } = await res.json();

    closeConfirmModal();
    showSuccess(orderId, total, whatsappUrl);

  } catch (err) {
    alert('Error al enviar el pedido. Intentá de nuevo.\n' + err.message);
    btn.disabled = false;
    btn.textContent = 'Enviar pedido';
  }
};

function showSuccess(orderId, total, whatsappUrl) {
  document.getElementById('successOrderId').textContent = `Pedido: ${orderId}`;
  const btnWhatsapp = document.getElementById('btnWhatsapp');
  if (whatsappUrl) {
    btnWhatsapp.href = whatsappUrl;
    btnWhatsapp.style.display = '';
  } else {
    btnWhatsapp.style.display = 'none';
  }
  document.getElementById('successOverlay').style.display = 'flex';

  // Reset cart
  cart.clear();
  renderCartPanel();
  if (menuData) renderMenu(menuData.categorias);
}

// ── Mobile cart ─────────────────────────────────────────────────────────────
window.toggleCartMobile = function () {
  const panel = document.getElementById('cartPanel');
  isMobileCartOpen = !isMobileCartOpen;
  panel.classList.toggle('mobile-open', isMobileCartOpen);
};

// ── Category scroll ─────────────────────────────────────────────────────────
function scrollToCategory(name, btn) {
  const el = document.getElementById(`cat-${name.replace(/\s+/g, '-')}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Highlight active category on scroll
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const name = entry.target.id.replace('cat-', '').replace(/-/g, ' ');
      document.querySelectorAll('.cat-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === name);
      });
    }
  }
}, { rootMargin: '-30% 0px -60% 0px' });

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(n) {
  const sym = menuData?.simbolo || '$';
  return `${sym}${n.toLocaleString('es-AR')}`;
}

// ── Start ────────────────────────────────────────────────────────────────────
init().then(() => {
  document.querySelectorAll('.category-section').forEach(s => observer.observe(s));
});
