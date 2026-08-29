import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getCatalog, findProductInCatalog } from './integrations/sheetsCatalog.js';
import { buildOrderWhatsAppLink } from './integrations/whatsapp.js';
import { sendOrderEmail } from './integrations/email.js';
import { ensurePedidosHeadersExist, appendOrderToSheet } from './integrations/sheetsOrders.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

const orders = new Map(); // orderId → order object

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Catalog ─────────────────────────────────────────────────────────────────
app.get('/api/productos', async (_req, res) => {
  try {
    const catalog = await getCatalog();
    res.json({ empresa: 'Systisen', moneda: 'USD', simbolo: '$', categorias: catalog });
  } catch (err) {
    console.error('[catalogo] Error leyendo Google Sheets:', err.message);
    res.status(500).json({ error: 'No se pudo cargar el catálogo. Intentá de nuevo en un momento.' });
  }
});

// ─── Orders ──────────────────────────────────────────────────────────────────
app.post('/api/pedido', async (req, res) => {
  const { nombreCliente, telefonoCliente, items, notas } = req.body;

  if (!nombreCliente || !telefonoCliente || !items || items.length === 0) {
    return res.status(400).json({ error: 'Nombre, teléfono y al menos un producto son requeridos.' });
  }

  let catalog;
  try {
    catalog = await getCatalog();
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo validar el catálogo. Intentá de nuevo.' });
  }

  const validatedItems = [];
  for (const { id, qty } of items) {
    const product = findProductInCatalog(catalog, String(id));
    if (!product || !product.disponible || !(qty > 0)) continue;
    validatedItems.push({ id: product.id, nombre: product.nombre, precio: product.precio, qty });
  }

  if (validatedItems.length === 0) {
    return res.status(400).json({ error: 'Ningún producto del pedido está disponible actualmente.' });
  }

  const total = validatedItems.reduce((sum, i) => sum + i.precio * i.qty, 0);
  const order = {
    id: `PED-${Date.now()}`,
    nombreCliente,
    telefonoCliente,
    items: validatedItems,
    notas: notas || '',
    total,
    createdAt: new Date().toISOString(),
  };

  orders.set(order.id, order);

  let whatsappUrl = null;
  try {
    whatsappUrl = buildOrderWhatsAppLink(order);
  } catch (err) {
    console.error('[whatsapp] ', err.message);
  }

  sendOrderEmail(order).catch((err) => console.error('[email] Error enviando pedido:', err.message));
  appendOrderToSheet(order).catch((err) => console.error('[pedidos] Error guardando en Sheets:', err.message));

  res.status(201).json({ orderId: order.id, total, whatsappUrl });
});

app.get('/api/pedido/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  res.json(order);
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

await ensurePedidosHeadersExist();

app.listen(PORT, () => {
  console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   📦 Catálogo: http://localhost:${PORT}/`);
  console.log(`\n   Para cambiar productos editá la hoja de Google Sheets "Productos".`);
  console.log(`   Para configurar credenciales editá: .env\n`);
});
