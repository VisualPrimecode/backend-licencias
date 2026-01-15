const db = require('../config/db');
const wooConfigAux = require('../models/woo_config_auxiliar');

/**
 * Crear un pedido Woo
 */
const crearPedido = async ({
  woo_config_id,
  woo_order_id,
  numero_pedido,
  status,
  total,
  currency,
  payment_method,

  // 🆕 nuevos campos
  fecha_pedido = null,
  name = null,
  email = null,
  products = null,
  extraoptions = null,

  pedido_json
}) => {
  const sql = `
    INSERT INTO woo_pedidos (
      woo_config_id,
      woo_order_id,
      numero_pedido,
      status,
      total,
      currency,
      payment_method,
      fecha_pedido,
      name,
      email,
      products,
      extraoptions,
      pedido_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    woo_config_id,
    woo_order_id,
    String(numero_pedido),
    status,
    Number(total) || 0,
    currency,
    payment_method,
    fecha_pedido,
    name,
    email,
    products,
    extraoptions,
    JSON.stringify(pedido_json)
  ]);

  return result.insertId;
};


/**
 * Crear pedidos Woo por lotes
 */
const crearPedidosBatch = async (pedidos) => {
  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    return;
  }
  console.log(`📥 Creando batch de ${pedidos} pedidos...`);

  const sql = `
    INSERT INTO woo_pedidos (
      woo_config_id,
      woo_order_id,
      numero_pedido,
      status,
      total,
      currency,
      payment_method,
      fecha_pedido,
      name,
      email,
      products,
      extraoptions,
      pedido_json
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      total = VALUES(total),
      currency = VALUES(currency),
      payment_method = VALUES(payment_method),
      fecha_pedido = VALUES(fecha_pedido),
      name = VALUES(name),
      email = VALUES(email),
      products = VALUES(products),
      extraoptions = VALUES(extraoptions),
      pedido_json = VALUES(pedido_json),
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = pedidos.map(pedido => ([
    pedido.woo_config_id,
    pedido.woo_order_id,
    String(pedido.numero_pedido),
    pedido.status,
    Number(pedido.total) || 0,
    pedido.currency,
    pedido.payment_method,
    pedido.fecha_pedido ?? null,
    pedido.name ?? null,
    pedido.email ?? null,
    pedido.products ?? null,
    pedido.extraoptions ?? null,
    JSON.stringify(pedido.pedido_json)
  ]));

  await db.query(sql, [values]);
};

const guardarPedidosDesdeWoo = async (
  woo_config_id,
  { startDate, endDate }
) => {
  console.log("📦 Iniciando guardado eficiente de pedidos desde Woo...");

  const pedidos = await wooConfigAux.getAllPedidosByDateRange(
    woo_config_id,
    { startDate, endDate }
  );

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    console.log("ℹ️ No hay pedidos para procesar");
    return;
  }

  console.log(`📄 Pedidos obtenidos desde Woo: ${pedidos.length}`);

  // 🔧 Helper para normalizar productos y extras
 const normalizarProductos = (products = []) => {
  const productosLimpios = [];
  const extraOptions = [];

  for (const product of products) {
    const { extra_options, ...productoBase } = product;

    // Producto limpio (sin extras)
    productosLimpios.push(productoBase);

    // Extras SOLO si existen
    if (Array.isArray(extra_options) && extra_options.length > 0) {
      for (const extra of extra_options) {
        if (!extra.name || !extra.value) continue;

        extraOptions.push({
          product_id: product.product_id,
          product_name: product.name,
          name: extra.name,
          value: extra.value,
          price: Number(extra.price) || 0
        });
      }
    }
  }

  return {
    products: productosLimpios,
    extraoptions: extraOptions
  };
};


  // 1️⃣ Deduplicar por ID de pedido
  const pedidosMap = new Map();

  for (const pedido of pedidos) {
    if (!pedido.id) continue;

    const { products, extraoptions } = normalizarProductos(pedido.products);
     console.log("🧪 DEBUG PRODUCT STRUCTURE:");
  console.log(
    JSON.stringify(pedido.products[0], null, 2)
  );

    pedidosMap.set(pedido.id, {
      woo_config_id,
      woo_order_id: pedido.id,
      numero_pedido: pedido.number ?? pedido.id,
      status: pedido.status,
      total: Number(pedido.total) || 0,
      currency: pedido.currency,
      payment_method: pedido.payment_method ?? null,

      // 🆕 campos nuevos
      fecha_pedido: pedido.date ?? null,
      name: pedido.customer_name ?? null,
      email: pedido.customer_email ?? null,

      products: products.length
        ? JSON.stringify(products)
        : null,

      extraoptions: extraoptions.length
        ? JSON.stringify(extraoptions)
        : null,

      // respaldo completo
      pedido_json: pedido
    });
  }

  const pedidosUnicos = [...pedidosMap.values()];
  console.log(`🧹 Pedidos únicos a guardar: ${pedidosUnicos.length}`);

  // 2️⃣ Insertar en batches
  const CHUNK_SIZE = 500;

  for (let i = 0; i < pedidosUnicos.length; i += CHUNK_SIZE) {
    const chunk = pedidosUnicos.slice(i, i + CHUNK_SIZE);

    await crearPedidosBatch(chunk);

    console.log(
      `📥 Batch ${Math.floor(i / CHUNK_SIZE) + 1} procesado (${chunk.length} pedidos)`
    );
  }

  console.log("✅ Guardado de pedidos finalizado correctamente");
};



/**
 * Obtener pedido por tienda + número
 */
const getPedidoPorNumero = async (numero_pedido, woo_config_id) => {
  const [rows] = await db.query(
    `SELECT * FROM woo_pedidos 
     WHERE numero_pedido = ? AND woo_config_id = ?
     LIMIT 1`,
    [String(numero_pedido), woo_config_id]
  );

  return rows[0] || null;
};

/**
 * Obtener pedidos por tienda
 */
const getPedidosPorTienda = async (woo_config_id) => {
  const [rows] = await db.query(
    `SELECT * FROM woo_pedidos WHERE woo_config_id = ?
     ORDER BY created_at DESC`,
    [woo_config_id]
  );

  return rows;
};

/**
 * Marcar pedido como enviado
 */
const marcarPedidoEnviado = async (id, estado_envio = 'ENVIADO') => {
  await db.query(
    `UPDATE woo_pedidos
     SET procesado_envio = 1,
         estado_envio = ?
     WHERE id = ?`,
    [estado_envio, id]
  );
};

/**
 * Registrar error de envío
 */
const registrarErrorEnvio = async (id, error) => {
  await db.query(
    `UPDATE woo_pedidos
     SET procesado_envio = 0,
         estado_envio = 'ERROR',
         ultimo_error = ?
     WHERE id = ?`,
    [error, id]
  );
};

/**
 * Obtener pedidos pendientes de envío
 */
const getPedidosPendientesEnvio = async () => {
  const [rows] = await db.query(
    `SELECT * FROM woo_pedidos
     WHERE procesado_envio = 0
     ORDER BY created_at ASC`
  );

  return rows;
};
/**
 * Verifica si un pedido Woo ya existe
 */
const existePedidoWoo = async ({
  woo_config_id,
  numero_pedido,
  woo_order_id
}) => {
  const sql = `
    SELECT id
    FROM woo_pedidos
    WHERE woo_config_id = ?
      AND (
        numero_pedido = ?
        OR woo_order_id = ?
      )
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [
    woo_config_id,
    String(numero_pedido),
    woo_order_id
  ]);

  return rows.length > 0;
};


module.exports = {
  crearPedido,
  getPedidoPorNumero,
  getPedidosPorTienda,
  marcarPedidoEnviado,
  registrarErrorEnvio,
  getPedidosPendientesEnvio,
  existePedidoWoo,
  guardarPedidosDesdeWoo
};
