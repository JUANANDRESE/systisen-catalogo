import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHEET_NAME = 'Productos';
const RANGE = `${SHEET_NAME}!A2:H`; // Categoria, ID, Nombre, Descripcion, Precio, Emoji, Foto, Disponible

const CACHE_TTL_MS = 60_000;
let cache = null;
let cacheAt = 0;

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en .env');
  }
  return new google.auth.JWT(email, undefined, key.replace(/\\n/g, '\n'), [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ]);
}

function rowsToCatalog(rows) {
  const categorias = new Map();

  for (const row of rows) {
    const [categoria, id, nombre, descripcion, precio, emoji, foto, disponible] = row;
    if (!id || !nombre) continue;

    if (!categorias.has(categoria)) {
      categorias.set(categoria, { nombre: categoria || 'Productos', icono: emoji || '📦', items: [] });
    }

    categorias.get(categoria).items.push({
      id: String(id),
      nombre,
      descripcion: descripcion || '',
      precio: Number(precio) || 0,
      emoji: emoji || '📦',
      foto: foto || null,
      disponible: String(disponible).trim().toUpperCase() !== 'FALSE',
    });
  }

  return [...categorias.values()];
}

function loadSeedCatalog() {
  const path = join(__dirname, 'seed-productos.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function getCatalog({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cache && now - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const hasCreds = spreadsheetId && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;

  if (!hasCreds) {
    // Sin credenciales de Google Sheets configuradas: se usa el catálogo local
    // de prueba (integrations/seed-productos.json) para poder probar el sistema.
    console.warn('[catalogo] Google Sheets no configurado — usando catálogo local de prueba.');
    cache = loadSeedCatalog();
    cacheAt = now;
    return cache;
  }

  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGE });

  cache = rowsToCatalog(data.values || []);
  cacheAt = now;
  return cache;
}

export function findProductInCatalog(catalog, id) {
  for (const cat of catalog) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return item;
  }
  return null;
}
