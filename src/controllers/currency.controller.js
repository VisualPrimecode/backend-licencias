const Currency = require('../models/currency.model');

// Obtener todas las tasas de cambio
exports.getRates = async (req, res) => {
  console.log('Obteniendo todas las tasas de cambio...');
  try {
    const rates = await Currency.getAllRates();
    res.json(rates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las tasas de cambio' });
  }
};

// Obtener una tasa específica por par de monedas
exports.getRateByCurrency = async (req, res) => {
  try {
    const { base, target } = req.params;

    if (!base || !target) {
      return res.status(400).json({ error: 'Debe proporcionar base y target' });
    }

    const rate = await Currency.getRateByCurrency(base.toUpperCase(), target.toUpperCase());

    if (!rate) {
      return res.status(404).json({ error: 'Tasa de cambio no encontrada' });
    }

    res.json(rate);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener la tasa de cambio' });
  }
};

// Crear una nueva tasa de cambio
exports.createRate = async (req, res) => {
  try {
    const { base_currency, target_currency, rate, source } = req.body;

    if (!base_currency || !target_currency || !rate) {
      return res.status(400).json({ error: 'Faltan datos requeridos (base_currency, target_currency, rate)' });
    }

    const id = await Currency.createRate({ base_currency, target_currency, rate, source });
    res.status(201).json({ id, mensaje: 'Tasa creada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la tasa de cambio' });
  }
};

// Actualizar una tasa existente
exports.updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID de tasa requerido' });
    }

    const result = await Currency.updateRate(id, datosActualizados);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tasa no encontrada' });
    }

    res.json({ mensaje: 'Tasa actualizada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar la tasa de cambio' });
  }
};

// Eliminar una tasa
exports.deleteRate = async (req, res) => {
  console.log('Eliminando tasa de cambio...');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de tasa requerido' });
    }

    const result = await Currency.deleteRate(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tasa no encontrada' });
    }

    res.json({ mensaje: 'Tasa eliminada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la tasa de cambio' });
  }
};
