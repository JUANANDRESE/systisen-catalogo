# Catálogo interactivo — Systisen

## Qué hace

Catálogo web de productos (`/`) donde el cliente elige productos y cantidades desde un carrito, en vez de mandar capturas de pantalla por WhatsApp. Al confirmar el pedido:

- Se valida cada ítem contra el catálogo (precio y disponibilidad reales, no lo que mande el navegador).
- Se genera un link `wa.me` con el pedido prellenado — el cliente lo abre y lo envía al WhatsApp del proveedor con un toque.
- Se envía una copia por email al proveedor (si hay SMTP configurado).

## Cómo correr

```bash
npm install
copy .env.example .env   # completar credenciales reales
npm run dev
# http://localhost:3000
```

## Archivos clave

| Archivo | Rol |
|---|---|
| `server.js` | Express: sirve el catálogo estático + `/api/productos` + `/api/pedido` |
| `integrations/sheetsCatalog.js` | Lee productos desde Google Sheets (hoja "Productos"), cachea 60s |
| `integrations/whatsapp.js` | Arma el texto del pedido y el link `wa.me` |
| `integrations/email.js` | Envía copia del pedido por SMTP (nodemailer) |
| `public/index.html` + `public/js/customer.js` | Catálogo + carrito + modal de confirmación |

## Catálogo (Google Sheets)

Hoja llamada **Productos**, columnas A–H (sin encabezado, empieza en fila 2):

```
Categoria | ID | Nombre | Descripcion | Precio | Emoji | Foto (URL) | Disponible (TRUE/FALSE)
```

El proveedor edita esta hoja directamente — el catálogo se actualiza solo (con hasta 60s de caché).

**`productos-systisen.csv`** — 45 productos reales extraídos del catálogo público de systisen.com
(vía su API pública de WooCommerce), listos para importar directamente a la hoja "Productos"
(Archivo → Importar → Reemplazar hoja actual, en Google Sheets).

## Probar sin Google Sheets configurado

Si `GOOGLE_SPREADSHEET_ID`/credenciales no están en `.env`, `integrations/sheetsCatalog.js` cae
automáticamente a `integrations/seed-productos.json` (los mismos 45 productos reales, ya
estructurados) — así se puede levantar y probar todo el flujo (catálogo → carrito → pedido →
WhatsApp/email) sin depender de la hoja real. En cuanto se configuren las credenciales, el
catálogo pasa a leer de Sheets automáticamente.

## Pedido → proveedor

`POST /api/pedido` recibe `{ nombreCliente, telefonoCliente, items: [{id, qty}], notas }`, valida contra el catálogo real, y devuelve `{ orderId, total, whatsappUrl }`. El frontend abre `whatsappUrl` para que el cliente lo envíe.

Si más adelante el proveedor obtiene acceso a la API de WhatsApp Business de Meta, se puede reemplazar el link `wa.me` por un envío automático (ver `src/integrations/metaWhatsapp.ts` en el proyecto `bot autoexonerado` como referencia de ese patrón).
