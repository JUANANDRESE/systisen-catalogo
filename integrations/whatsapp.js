export function buildOrderWhatsAppLink(order) {
  const numero = (process.env.PROVEEDOR_WHATSAPP || '').replace(/[^\d]/g, '');
  if (!numero) {
    throw new Error('Falta PROVEEDOR_WHATSAPP en .env');
  }
  const texto = encodeURIComponent(orderToText(order));
  return `https://wa.me/${numero}?text=${texto}`;
}

export function orderToText(order) {
  const lineas = order.items.map(
    (i) => `${i.qty}x ${i.nombre} — $${i.precio.toFixed(2)} c/u`
  );
  return [
    `🛒 Nuevo pedido — ${order.nombreCliente} (${order.telefonoCliente})`,
    `Pedido: ${order.id}`,
    '',
    ...lineas,
    '',
    `Total: $${order.total.toFixed(2)}`,
    order.notas ? `Notas: ${order.notas}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
