const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); // Ruta a tu cola
const cotizacionQueue = require('../queues/cotizacionQueue');
const Plantilla = require('../models/plantilla.model');
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model');
const { createCotizacion } = require('../models/cotizacion.model');


// Obtener todos los envíos
exports.getEnvios = async (req, res) => {
  console.log('📦 Obteniendo todos los envíos...');
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
  console.log('🔍 Obteniendo envío por ID...');
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
      estado: 'pendiente'
    };

    if (!envioData.empresa_id || !envioData.usuario_id || !envioData.producto_id) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios (empresa_id, usuario_id, producto_id)'
      });
    }

    const id = await Envio.createEnvio(envioData);

    // 📬 Obtener SMTP desde la BD
    const config = await getSMTPConfigByStoreId(envioData.store_id || 3);
    if (!config) {
      return res.status(500).json({ error: 'No se encontró configuración SMTP activa' });
    }

    const smtpConfig = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: !!config.smtp_secure,
      user: config.smtp_username,
      pass: config.smtp_password
    };

    await envioQueue.add({
      id,
      ...envioData,
      smtpConfig
    });

    return res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear envío:', error);
    return res.status(500).json({ error: 'Error al crear envío' });
  }
};

exports.createCotizacion = async (req, res) => {
  console.log('📝 Creando nueva cotización...');
  console.log('Datos de la cotización:', req.body);

  try {
    // ✅ Obtener plantilla relacionada a la tienda y motivo 'cotizacion'
    const plantillas = await Plantilla.getPlantillaByIdWooYmotivo(req.body.woocommerce_id, 'cotizacion');

    if (!plantillas || plantillas.length === 0) {
      return res.status(404).json({ error: 'No se encontró plantilla para cotización en esta tienda' });
    }

    const plantilla = plantillas[0]; // asumes que usas la primera encontrada
    const cotizacionData = {
      ...req.body,
      nombre_cliente: req.body.nombre_cliente || 'Cliente',
      numero_cotizacion: req.body.numero_cotizacion || 'N/A',
      store_id: req.body.woocommerce_id || 3
    };

    console.log('Datos de la cotización procesados:', cotizacionData);

    // ✅ Validación mínima
    if (
      !cotizacionData.email_destino ||
      !cotizacionData.nombre_cliente ||
      !cotizacionData.numero_cotizacion ||
      !cotizacionData.store_id
    ) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios (email_destino, nombre_cliente, numero_cotizacion, store_id)'
      });
    }


    // ✅ Obtener configuración SMTP desde la BD
    const config = await getSMTPConfigByStoreId(cotizacionData.store_id);
    if (!config) {
      return res.status(404).json({ error: 'No se encontró configuración SMTP activa para la tienda' });
    }

    const smtpConfig = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: !!config.smtp_secure,
      user: config.smtp_username,
      pass: config.smtp_password
    };
    //console.log('datos enviados a cotizacionProcessor:');
    // ✅ Encolar el trabajo para el worker
   /* console.log('cotizacionData:', cotizacionData);
    console.log('smtpConfig:', smtpConfig);
    console.log('plantilla:', plantilla);*/

    // 🧮 Calcular subtotal e IVA
const total = Number(cotizacionData.total || 0);
const subtotal = Number((total / 1.19).toFixed(0));
const iva = total - subtotal;

// 🧾 Construir HTML básico con placeholders (opcional si quieres guardarlo sin reemplazos)
const cuerpo_html = plantilla.cuerpo_html || '';
const asunto_correo = plantilla.asunto || 'Cotización';

// 🗂️ Registrar en BD (con estado PENDIENTE)
const id = await createCotizacion({
  id_usuario: cotizacionData.id_usuario,
  id_woo: cotizacionData.woocommerce_id,
  id_empresa: cotizacionData.empresa_id,
  nombre_cliente: cotizacionData.nombre_cliente,
  email_destino: cotizacionData.email_destino,
  total,
  subtotal,
  iva,
  productos_json: cotizacionData.productos,
  smtp_host: smtpConfig.host,
  smtp_user: smtpConfig.user,
  plantilla_usada: plantilla.id, // o plantilla.asunto si prefieres
  asunto_correo,
  cuerpo_html, // sin reemplazos aún
  estado_envio: 'PENDIENTE', 
  mensaje_error: null
});

    await cotizacionQueue.add({
      id,
      ...cotizacionData,
      smtpConfig,
      plantilla // 👈 añadimos la plantilla que recuperamos
    });

    console.log('✅ Job de cotización encolado');
return res.status(201).json({ cotizacion_id: id });

  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    return res.status(500).json({ error: 'Error al crear cotización' });
  }
};


// Actualizar un envío existente
exports.updateEnvio = async (req, res) => {
  console.log('🔄 Actualizando envío...');
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

//actulizar estado de un envío

// EnvioController.js
exports.updateEstadoEnvio = async (req, res) => {
  console.log('🔄 Actualizando estado del envío...');
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'El campo "estado" es requerido' });
    }

    const envioExistente = await Envio.getEnvioById(id);

    if (!envioExistente) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    await Envio.updateEstadoEnvio(id, estado);
    res.json({ mensaje: 'Estado del envío actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar el estado del envío:', error);
    res.status(500).json({ error: 'Error al actualizar el estado del envío' });
  }
};

// Eliminar un envío
exports.deleteEnvio = async (req, res) => {
  console.log('🗑️ Eliminando envío...');
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
// Consultar estado del envío por woo_id y numero_pedido
exports.consultarEstadoEnvio = async (req, res) => {
  console.log('🔍 Consultando estado del envío por Woo ID y número de pedido...');
  try {
    const { woo_id, numero_pedido } = req.query;
   // console.log('Parámetros recibidos:', { woo_id, numero_pedido });

    // Validación básica
    if (!woo_id || !numero_pedido) {
      return res.status(400).json({ error: 'Parámetros requeridos: woo_id y numero_pedido' });
    }

    const estado = await Envio.getEstadoEnvio(woo_id, numero_pedido);

    console.log('Estado del envío:', estado);
    if (!estado) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json({ estado });
  } catch (error) {
    console.error('❌ Error en consultarEstadoEnvio:', error.message);
    res.status(500).json({ error: 'Error al consultar estado del envío' });
  }
};

// Verificar si existe un envío por número de pedido y WooCommerce ID
exports.verificarEnvioPorPedidoWoo = async (req, res) => {
  console.log('🔍 Verificando si existe un envío por número de pedido y WooCommerce ID...');
  try {
    const { numero_pedido, woo_id } = req.query;

    // Validación básica
    if (!numero_pedido || !woo_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos: numero_pedido y woo_id' });
    }

    const existe = await Envio.existeEnvioPorPedidoWoo(numero_pedido, woo_id);
    res.json({ existe });
  } catch (error) {
    console.error('❌ Error al verificar envío:', error);
    res.status(500).json({ error: 'Error al verificar envío' });
  }
};
