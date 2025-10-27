const db = require('../config/db');

/**
 * 🔹 Verifica si ya existe una alerta activa para un producto en estado 'advertencia'
 */
const existeAlertaActivaAdvertencia = async (productoId) => {
  const [rows] = await db.query(`
    SELECT id 
    FROM alertas_stock_enviadas
    WHERE producto_id = ? 
      AND estado_stock = 'advertencia'
      AND resuelta = false
    LIMIT 1
  `, [productoId]);

  return rows.length > 0;
};

/**
 * 🔹 Inserta una nueva alerta de stock
 */
const registrarAlertaStock = async ({ producto_id, producto_nombre, estado_stock, stock_disponible, promedio_diario }) => {
  await db.query(`
    INSERT INTO alertas_stock_enviadas 
      (producto_id, producto_nombre, estado_stock, stock_disponible, promedio_diario)
    VALUES (?, ?, ?, ?, ?)
  `, [producto_id, producto_nombre, estado_stock, stock_disponible, promedio_diario]);
};

/**
 * 🔹 Inserta o actualiza una alerta “crítica”
 *    (si ya existe, se actualiza la fecha y el stock)
 */
const upsertAlertaCritica = async ({ producto_id, producto_nombre, estado_stock, stock_disponible, promedio_diario }) => {
  await db.query(`
    INSERT INTO alertas_stock_enviadas 
      (producto_id, producto_nombre, estado_stock, stock_disponible, promedio_diario)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      stock_disponible = VALUES(stock_disponible),
      fecha_envio = NOW(),
      resuelta = false
  `, [producto_id, producto_nombre, estado_stock, stock_disponible, promedio_diario]);
};

/**
 * 🔹 Marca una alerta como resuelta (cuando el producto vuelve a la normalidad)
 */
const resolverAlertaProducto = async (productoId) => {
  await db.query(`
    UPDATE alertas_stock_enviadas
    SET resuelta = true, fecha_resuelta = NOW()
    WHERE producto_id = ? AND resuelta = false
  `, [productoId]);
};

module.exports = {
  existeAlertaActivaAdvertencia,
  registrarAlertaStock,
  upsertAlertaCritica,
  resolverAlertaProducto
};
