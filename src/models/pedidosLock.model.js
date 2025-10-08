// models/PedidosLock.js
const db = require('../config/db');

/**
 * Crear un lock para un pedido
 * @param {string|number} wooId - ID de la configuración WooCommerce
 * @param {string|number} numero_pedido - Número del pedido en Woo
 * @returns {boolean} true si se adquirió el lock, false si ya existe
 */
const adquirirLock = async (wooId, numero_pedido, minutosExpira = 5) => {
  try {
    console.log(`🟢 Intentando insertar lock para pedido ${numero_pedido}, wooId ${wooId}`);
    const now = new Date();
    console.log(`⏱ Hora actual (Node.js): ${now.toISOString()}`);

    await db.query(
      `INSERT INTO pedidos_lock (woo_config_id, numero_pedido, status, updated_at)
       VALUES (?, ?, 'processing', NOW())`,
      [wooId, numero_pedido]
    );

    console.log(`✅ Lock creado exitosamente para pedido ${numero_pedido}`);
    return true;

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log(`⚠️ Lock ya existe para pedido ${numero_pedido}, verificando expiración...`);

      const [result] = await db.query(
        `UPDATE pedidos_lock
         SET status = 'processing', updated_at = NOW()
         WHERE woo_config_id = ?
           AND numero_pedido = ?
           AND (status = 'processing' OR status = 'failed')
           AND updated_at < (NOW() - INTERVAL ? MINUTE)`,
        [wooId, numero_pedido, minutosExpira]
      );

      console.log(`🕵️‍♂️ Resultado UPDATE lock expirado: ${result.affectedRows} filas afectadas`);
      return result.affectedRows > 0;
    }

    throw err;
  }
};



/**
 * Liberar o actualizar el lock de un pedido
 * @param {string|number} wooId
 * @param {string|number} numero_pedido
 * @param {'processing'|'completed'|'failed'} status
 */
const liberarLock = async (wooId, numero_pedido, status = 'completed') => {
  await db.query(
    `UPDATE pedidos_lock
     SET status = ?, updated_at = NOW()
     WHERE woo_config_id = ? AND numero_pedido = ?`,
    [status, wooId, numero_pedido]
  );
};

/**
 * Obtener un lock (para debug o validaciones)
 * @param {string|number} wooId
 * @param {string|number} numero_pedido
 * @returns {object|null} lock encontrado o null si no existe
 */
const getLock = async (wooId, numero_pedido) => {
  const [rows] = await db.query(
    `SELECT * FROM pedidos_lock WHERE woo_config_id = ? AND numero_pedido = ? LIMIT 1`,
    [wooId, numero_pedido]
  );
  return rows[0] || null;
};

/**
 * Limpiar locks viejos en estado processing (ej. procesos caídos)
 * @param {number} minutos - tiempo de expiración en minutos
 * @returns {number} cantidad de locks marcados como failed
 */
const limpiarLocksAntiguos = async (minutos = 15) => {
  const [result] = await db.query(
    `UPDATE pedidos_lock
     SET status = 'failed'
     WHERE status = 'processing' 
       AND updated_at < (NOW() - INTERVAL ? MINUTE)`,
    [minutos]
  );
  return result.affectedRows;
};


module.exports = {
  adquirirLock,
  liberarLock,
  getLock,
  limpiarLocksAntiguos
};
