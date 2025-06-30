const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); // Ruta a tu cola


// Obtener todos los envíos
exports.getEnvios = async (req, res) => {
  try {
    const envios = await Envio.getAllEnvios();
    res.json(envios);
  } catch (error) {
    console.error('❌ Error al obtener envíos:', error);
    res.status(500).json({ error: 'Error al obtener envíos' });
  }
};

// Obtener un envío por ID
exports.getEnvioById = async (req, res) => {
  try {
    const { id } = req.params;
    const envio = await Envio.getEnvioById(id);

    if (!envio) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json(envio);
  } catch (error) {
    console.error('❌ Error al obtener envío:', error);
    res.status(500).json({ error: 'Error al obtener envío' });
  }
};

exports.createEnvio = async (req, res) => {
  console.log('📦 Creando un nuevo envío...');
  console.log('Datos del envío:', req.body);

  try {
    const envioData = {
      ...req.body,
      estado: 'pendiente' // 🔄 asignar estado por defecto aquí
    };

    if (!envioData.empresa_id || !envioData.usuario_id || !envioData.producto_id) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios (empresa_id, usuario_id, producto_id)'
      });
    }

    const id = await Envio.createEnvio(envioData);

    // ✅ Encolamos el trabajo para procesarlo en segundo plano
    await envioQueue.add({
      id,
      ...envioData
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear envío:', error);
    res.status(500).json({ error: 'Error al crear envío' });
  }
};


// Actualizar un envío existente
exports.updateEnvio = async (req, res) => {
  try {
    const { id } = req.params;
    const envioExistente = await Envio.getEnvioById(id);

    if (!envioExistente) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await Envio.updateEnvio(id, req.body);
    res.json({ mensaje: 'Envío actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar envío:', error);
    res.status(500).json({ error: 'Error al actualizar envío' });
  }
};

// Eliminar un envío
exports.deleteEnvio = async (req, res) => {
  try {
    const { id } = req.params;
    const envio = await Envio.getEnvioById(id);

    if (!envio) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await Envio.deleteEnvio(id);
    res.json({ mensaje: 'Envío eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar envío:', error);
    res.status(500).json({ error: 'Error al eliminar envío' });
  }
};
