const Envio = require('../models/envioProductos.model');

// Obtener todos los envíos
exports.getEnvios = async (req, res) => {
  console.log("👉 entro en getEnvios");
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
  console.log("👉 entro en getEnvioById");
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

// Obtener un envío por ID
exports.getEnviosByIdwoo = async (req, res) => {
  console.log("👉 entro en getEnviosByIdwoo");
  try {
    const { id_woo } = req.params;
    const envio = await Envio.getEnviosByIdWoo(id_woo);

    if (!envio) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json(envio);
  } catch (error) {
    console.error('❌ Error al obtener envío:', error);
    res.status(500).json({ error: 'Error al obtener envío' });
  }
};


// Crear un nuevo envío
exports.createEnvio = async (req, res) => {
  console.log('variables', req.body);
  try {
    const {
      id_usuario,
      id_woo,
      id_empresa,
      nombre_cliente,
      email_destino,
      total,
      subtotal,
      iva,
      productos_json,
      smtp_host,
      smtp_user,
      plantilla_usada,
      asunto_correo,
      cuerpo_html,
      estado_envio,
      mensaje_error,
      fecha_envio
    } = req.body;

    if (!nombre_cliente || !email_destino) {
      return res.status(400).json({ error: 'Faltan campos requeridos (nombre_cliente, email_destino)' });
    }

    const id = await Envio.createEnvio({
      id_usuario,
      id_woo,
      id_empresa,
      nombre_cliente,
      email_destino,
      total,
      subtotal,
      iva,
      productos_json,
      smtp_host,
      smtp_user,
      plantilla_usada,
      asunto_correo,
      cuerpo_html,
      estado_envio,
      mensaje_error,
      fecha_envio
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear envío:', error);
    res.status(500).json({ error: 'Error al crear envío' });
  }
};

// Actualizar un envío
exports.updateEnvio = async (req, res) => {
  try {
    const { id } = req.params;

    const envio = await Envio.getEnvioById(id);
    if (!envio) {
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
