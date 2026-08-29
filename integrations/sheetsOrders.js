import { google } from 'googleapis';
import { getAuth } from './sheetsCatalog.js';

const SHEET_NAME = 'Pedidos';
const HEADERS = ['Fecha', 'Pedido', 'Cliente', 'Telefono', 'Productos', 'Total', 'Notas'];

function hasCreds() {
  return (
    process.env.GOOGLE_SPREADSHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

async function ensureSheetTabExists(sheets, spreadsheetId) {
  const { data } = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = data.sheets.some((s) => s.properties.title === SHEET_NAME);
  if (exists) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] },
  });
  console.log(`[pedidos] Pestaña "${SHEET_NAME}" creada automáticamente en la hoja.`);
}

export async function ensurePedidosHeadersExist() {
  if (!hasCreds()) return;

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });

  try {
    await ensureSheetTabExists(sheets, spreadsheetId);

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:G1`,
    });
    if (!data.values || data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:G1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADERS] },
      });
      console.log('[pedidos] Encabezados creados en la hoja "Pedidos".');
    }
  } catch (err) {
    console.warn(
      '[pedidos] No se pudo preparar la hoja "Pedidos" — verificá que la cuenta de servicio tenga permiso de Editor. ' +
        err.message
    );
  }
}

export async function appendOrderToSheet(order) {
  if (!hasCreds()) return;

  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });

  const productos = order.items.map((i) => `${i.qty}x ${i.nombre}`).join(', ');

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          order.createdAt,
          order.id,
          order.nombreCliente,
          order.telefonoCliente,
          productos,
          order.total.toFixed(2),
          order.notas || '',
        ],
      ],
    },
  });
}
