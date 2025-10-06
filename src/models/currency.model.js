const db = require('../config/db');

// Obtener todas las tasas de cambio
const getAllRates = async () => {
  console.log('Obteniendo todas las tasas de cambio...modelo');
  const [rows] = await db.query(`
    SELECT 
      id,
      base_currency,
      target_currency,
      rate,
      source,
      last_updated
    FROM currency_exchange_rates
    ORDER BY target_currency ASC
  `);
  return rows;
};

// Obtener una tasa específica (por par de monedas)
const getRateByCurrency = async (baseCurrency, targetCurrency) => {
  const [rows] = await db.query(
    `SELECT 
       id,
       base_currency,
       target_currency,
       rate,
       source,
       last_updated
     FROM currency_exchange_rates
     WHERE base_currency = ? AND target_currency = ?`,
    [baseCurrency, targetCurrency]
  );
  return rows[0];
};

// Crear una nueva tasa de cambio
const createRate = async ({ base_currency, target_currency, rate, source }) => {
  const [result] = await db.query(
    `INSERT INTO currency_exchange_rates 
      (base_currency, target_currency, rate, source)
     VALUES (?, ?, ?, ?)`,
    [base_currency, target_currency, rate, source]
  );
  return result.insertId;
};

// Actualizar una tasa existente (por ID)
const updateRate = async (id, { base_currency, target_currency, rate, source }) => {
  const campos = [];
  const valores = [];

  if (base_currency !== undefined) {
    campos.push('base_currency = ?');
    valores.push(base_currency);
  }
  if (target_currency !== undefined) {
    campos.push('target_currency = ?');
    valores.push(target_currency);
  }
  if (rate !== undefined) {
    campos.push('rate = ?');
    valores.push(rate);
  }
  if (source !== undefined) {
    campos.push('source = ?');
    valores.push(source);
  }

  if (campos.length === 0) {
    throw new Error('No se proporcionaron campos para actualizar.');
  }

  valores.push(id);
  const sql = `UPDATE currency_exchange_rates SET ${campos.join(', ')} WHERE id = ?`;
  const [result] = await db.query(sql, valores);
  return result;
};

// Eliminar una tasa (borrado físico)
const deleteRate = async (id) => {
  const [result] = await db.query(
    'DELETE FROM currency_exchange_rates WHERE id = ?',
    [id]
  );
  return result;
};

module.exports = {
  getAllRates,
  getRateByCurrency,
  createRate,
  updateRate,
  deleteRate
};
