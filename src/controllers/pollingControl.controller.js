// 📦 controllers/pollingControl.controller.js
const PollingControl = require('../models/pollingControl');

// 🟢 Obtener el estado actual del polling
exports.getPollingStatus = async (req, res) => {
  console.log('🔍 Consultando estado del polling...');
  try {
    const estado = await PollingControl.getPollingStatus();

    if (!estado) {
      return res.status(404).json({ error: 'No se encontró registro de control del polling' });
    }

    res.json({
      activo: !!estado.activo,
      descripcion: estado.descripcion,
      actualizado_por: estado.actualizado_por,
      actualizado_en: estado.actualizado_en
    });
  } catch (error) {
    console.error('❌ Error al obtener el estado del polling:', error);
    res.status(500).json({ error: 'Error al obtener el estado del polling' });
  }
};

// 🆕 Crear registro inicial de control (solo una vez)
exports.createPollingControl = async (req, res) => {
  console.log('🆕 Creando registro de control del polling...');
  try {
    const { usuario } = req.body || {};
    const id = await PollingControl.createDefaultPolling(usuario || 'sistema');
    res.status(201).json({ id, mensaje: 'Registro de control creado correctamente' });
  } catch (error) {
    console.error('❌ Error al crear registro de control del polling:', error);
    res.status(500).json({ error: 'Error al crear registro de control del polling' });
  }
};

// ⚙️ Actualizar estado (activar / pausar)
exports.updatePollingStatus = async (req, res) => {
  console.log('⚙️ Actualizando estado del polling...');
  try {
    const { activo, usuario } = req.body;

    if (activo === undefined) {
      return res.status(400).json({ error: 'Se requiere el campo "activo" (true o false)' });
    }

    const result = await PollingControl.updatePollingStatus(!!activo, usuario || 'admin');

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se encontró registro para actualizar' });
    }

    res.json({ mensaje: `Polling ${activo ? 'activado' : 'pausado'} correctamente ✅` });
  } catch (error) {
    console.error('❌ Error al actualizar el estado del polling:', error);
    res.status(500).json({ error: 'Error al actualizar el estado del polling' });
  }
};

// 🗑 Eliminar registro (opcional)
exports.deletePollingRecord = async (req, res) => {
  console.log('🗑 Eliminando registro de control del polling...');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID requerido para eliminar' });
    }

    const result = await PollingControl.deletePollingRecord(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({ mensaje: 'Registro de control de polling eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar registro de control del polling:', error);
    res.status(500).json({ error: 'Error al eliminar registro de control del polling' });
  }
};
