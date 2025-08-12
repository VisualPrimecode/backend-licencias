const Webhook = require('../models/webhook.model');
const Empresa = require('../models/empresa.model');
const Serial = require('../models/serial.model');
const WooProductMapping = require('../models/wooProductMapping.model');
const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); 
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model');
const Plantilla = require('../models/plantilla.model');
const {createEnvioError} = require('../models/enviosErrores.model');


const { getEmpresaNameById } = require('../models/empresa.model');


// Obtener todos los webhooks
exports.getAllWebhooks = async (req, res) => {
  console.log('entro aca getAllWebhooks')
  try {
    const webhooks = await Webhook.getAllWebhooks();
    res.json(webhooks);
  } catch (error) {
    console.error('Error al obtener webhooks:', error);
    res.status(500).json({ error: 'Error al obtener webhooks' });
  }
};


// Obtener un webhook por ID
exports.getWebhookById = async (req, res) => {
  console.log("entro aca 2");
  try {
    const id = parseInt(req.params.id);
    const webhook = await Webhook.getWebhookById(id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook no encontrado' });
    }

    res.json(webhook);
  } catch (error) {
    console.error('Error al obtener webhook:', error);
    res.status(500).json({ error: 'Error al obtener webhook' });
  }
};

// Obtener todos los webhooks de una configuración específica
exports.getWebhooksByConfigId = async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const webhooks = await Webhook.getWebhooksByConfigId(configId);
    res.json(webhooks);
  } catch (error) {
    console.error('Error al obtener webhooks por configuración:', error);
    res.status(500).json({ error: 'Error al obtener webhooks por configuración' });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const {
      config_id,
      nombre,
      tema,
      url_entrega,
      secreto,
      version_api = 'v3'
    } = req.body;
    console.log("datos req",req.body);
    // Validación mínima
    if (!nombre || !tema || !url_entrega || !config_id) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombre, tema, url_entrega, config_id' 
      });
    }

    // 1. Crear en WooCommerce (requiere config_id para obtener credenciales)
    const wooWebhook = await Webhook.createWebhookInWoo({
      nombre,
      topic: tema,
      url: url_entrega,
      id: config_id // <-- Nuevo parámetro dinámico
    });

    // Verificamos si WooCommerce respondió con éxito
    if (!wooWebhook?.id) {
      return res.status(502).json({ error: 'No se pudo crear el webhook en WooCommerce' });
    }

    // 2. Crear en base de datos local solo si WooCommerce fue exitoso
    const localWebhookId = await Webhook.createWebhook({
      config_id,
      nombre,
      estado: 'activo',
      tema,
      url_entrega,
      secreto,
      version_api,
      woo_id: wooWebhook.id
    });

    return res.status(201).json({
      mensaje: 'Webhook creado exitosamente en WooCommerce y base de datos',
      woo_webhook: wooWebhook,
      local_webhook_id: localWebhookId
    });

  } catch (error) {
    console.error('❌ Error al crear webhook combinado:', error);
    return res.status(500).json({ error: 'Error interno al crear webhook' });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      tema,
      url_entrega,
      estado,
      secreto,
      version_api
    } = req.body;

    // Validación mínima
    if (!nombre || !tema || !url_entrega) {
      return res.status(400).json({ error: 'Faltan campos requeridos: nombre, tema, url_entrega' });
    }

    // Mapeo de estado local (español) → WooCommerce (inglés)
    const estadoWooMap = {
      activo: 'active',
      inactivo: 'disabled',
      pausado: 'paused'
    };
    const estadoWoo = estadoWooMap[estado];

    if (!estadoWoo) {
      return res.status(400).json({ error: `Estado no válido: ${estado}` });
    }

    // 1. Obtener el webhook local
    const localWebhook = await Webhook.getWebhookById(id);
    if (!localWebhook || !localWebhook.woo_id || !localWebhook.config_id) {
      return res.status(404).json({ error: 'Webhook local no encontrado o sin datos de WooCommerce' });
    }

    const woo_id = localWebhook.woo_id;
    const configId = localWebhook.config_id;

    // 2. Actualizar en WooCommerce
    const wooResponse = await Webhook.updateWebhookInWoo({
      id: woo_id,
      data: {
        name: nombre,
        topic: tema,
        delivery_url: url_entrega,
        status: estadoWoo
      },
      configId
    });

    // 3. Actualizar en la base de datos local con el estado original (español)
    const updated = await Webhook.updateWebhook(id, {
      nombre,
      tema,
      url_entrega,
      estado,
      secreto,
      version_api
    });

    if (!updated) {
      return res.status(500).json({ error: 'Error al actualizar webhook en la base de datos' });
    }

    return res.status(200).json({
      mensaje: '✅ Webhook actualizado exitosamente en WooCommerce y base de datos',
      woo_webhook: wooResponse
    });

  } catch (error) {
    console.error('❌ Error al actualizar webhook:', error);
    return res.status(500).json({ error: 'Error interno al actualizar webhook' });
  }
};


exports.deleteWebhook = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Obtener el webhook local
    const localWebhook = await Webhook.getWebhookById(id);
    if (!localWebhook || !localWebhook.woo_id || !localWebhook.config_id) {
      return res.status(404).json({ error: 'Webhook no encontrado o sin datos de WooCommerce' });
    }

    const woo_id = localWebhook.woo_id;
    const configId = localWebhook.config_id;

    // 2. Eliminar de WooCommerce
    await Webhook.deleteWebhookInWoo({ id: woo_id, configId });

    // 3. Eliminar de la base de datos local
    const deleted = await Webhook.deleteWebhook(id);
    if (!deleted) {
      return res.status(500).json({ error: 'Error al eliminar webhook de la base de datos' });
    }

    return res.status(200).json({ mensaje: '✅ Webhook eliminado exitosamente de WooCommerce y base de datos' });

  } catch (error) {
    console.error('❌ Error al eliminar webhook:', error);
    return res.status(500).json({ error: 'Error interno al eliminar webhook' });
  }
};
/*
exports.pedidoCompletado = async (req, res) => {
  console.log('🔔 Webhook recibido: nuevo cambio de estado en un pedido');

  try {
    const wooId = req.params.wooId;
    const data = req.body;

    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Webhook sin cuerpo válido:', data);
      return res.status(400).json({ mensaje: 'Cuerpo del webhook inválido o vacío' });
    }

    if (data.status !== 'completed') {
      console.log(`⚠️ Pedido ignorado: estado = ${data.status}`);
      return res.status(200).json({ mensaje: `Pedido ignorado, estado: ${data.status}` });
    }

    // Obtener empresa y usuario
    const empresaUsuario = await Empresa.getEmpresaYUsuarioByWooConfigId(wooId);
    if (!empresaUsuario) {
      return res.status(404).json({ mensaje: 'No se encontró empresa ni usuario para esta configuración WooCommerce' });
    }

    const empresa_id = empresaUsuario.id;
    const usuario_id = empresaUsuario.usuario_id;

    // Obtener producto Woo y datos del cliente
    const producto = data.line_items?.[0] || {};
    const billing = data.billing || {};

    const woo_product_id = producto.product_id || null;
    const nombre_cliente = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
    const email_cliente = 'cl.rodriguezo@duocuc.cl'; // 📧 Estático por pruebas
    const numero_pedido = data.number || data.id || null;
    const fecha_envio = data.date_paid || new Date().toISOString();

    const yaExiste = await Envio.existeEnvioPorPedidoWoo(numero_pedido, wooId);
if (yaExiste) {
  console.warn(`📦 Pedido duplicado detectado (numero_pedido: ${numero_pedido}, woo_id: ${wooId})`);
  return res.status(200).json({ mensaje: 'Pedido ya procesado anteriormente. Ignorado para evitar duplicado.' });
}

    // Obtener producto interno
    const producto_interno_id = await WooProductMapping.getProductoInternoId(wooId, woo_product_id);
    if (!producto_interno_id) {
      return res.status(404).json({ mensaje: 'Producto no mapeado en sistema interno' });
    }

    // Obtener serial disponible
    const serial = await Serial.obtenerSerialDisponible(producto_interno_id, wooId);
    if (!serial) {
      return res.status(404).json({ mensaje: 'No hay serial disponible para este producto' });
    }

    const id_serial = serial.id;
    const codigo = serial.codigo;

    const envioData = {
      empresa_id,
      usuario_id,
      producto_id: producto_interno_id,
      id_serial, // ✅ Renombrado correctamente
      codigo,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado: 'pendiente',
      fecha_envio,
      woocommerce_id: wooId,
      woo_producto_id: woo_product_id
    };

    // Crear el envío
    const envioId = await Envio.createEnvio(envioData);

    // Encolar el envío para procesamiento
    await envioQueue.add({
      id: envioId,
      ...envioData
    });

    console.log('✅ Envío creado y encolado exitosamente:', envioId);

    return res.status(200).json({ mensaje: 'Webhook procesado correctamente ✅', envioId });

  } catch (error) {
    console.error('❌ Error al procesar webhook:', error);
    return res.status(500).json({ mensaje: 'Error interno al procesar el webhook' });
  }
};*/


// helpers/registrarEnvioError.js

async function registrarEnvioError({
  empresa_id = null,
  usuario_id = null,
  producto_id = null,
  serial_id = null,
  nombre_cliente = null,
  email_cliente = null,
  numero_pedido = null,
  estado = 'fallido',
  motivo_error = 'ERROR_DESCONOCIDO',
  detalles_error = ''
}) {
  try {
    await createEnvioError({
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      motivo_error,
      detalles_error
    });
  } catch (err) {
    console.error('❌ No se pudo registrar el error en envios_errores:', err);
  }
}


async function getPlantillaConFallback(producto_id, woo_id, empresa_id) {
  const plantilla = await Plantilla.getPlantillaByIdProductoWoo(producto_id, woo_id);
  return plantilla || null; // ❌ Ya no hay plantilla por defecto
}


exports.pedidoCompletado = async (req, res) => {
  console.log('🔔 Webhook recibido: nuevo cambio de estado en un pedido');
  console.log('id woo', req.params.wooId);

  const wooId = req.params.wooId;
  const data = req.body;

  try {
    // ✅ Validar cuerpo del webhook
    if (!data || typeof data !== 'object') {
      await registrarEnvioError({
        woo_config_id: wooId,
        motivo_error: 'INVALID_PAYLOAD',
        detalles_error: JSON.stringify(data)
      });
      console.warn('⚠️ Webhook sin cuerpo válido:', data);
      return res.status(400).json({ mensaje: 'Cuerpo del webhook inválido o vacío' });
    }

    // ✅ Solo procesar pedidos completados o en procesamiento
    if (data.status !== 'completed' && data.status !== 'processing') {
      await registrarEnvioError({
        woo_config_id: wooId,
        numero_pedido: data.number || null,
        motivo_error: 'IGNORED_STATUS',
        detalles_error: `Estado recibido: ${data.status}`
      });
      console.log(`⚠️ Pedido ignorado: estado = ${data.status}`);
      return res.status(200).json({ mensaje: `Pedido ignorado, estado: ${data.status}` });
    }

    // ✅ Obtener empresa y usuario asociado al WooCommerce
    const empresaUsuario = await Empresa.getEmpresaYUsuarioByWooConfigId(wooId);
    if (!empresaUsuario) {
      await registrarEnvioError({
        woo_config_id: wooId,
        numero_pedido: data.number || null,
        motivo_error: 'EMPRESA_NO_ENCONTRADA'
      });
      return res.status(404).json({ mensaje: 'No se encontró empresa ni usuario para esta configuración WooCommerce' });
    }

    const empresa_id = empresaUsuario.id;
    const usuario_id = empresaUsuario.usuario_id;

    // ✅ Datos del cliente
    const billing = data.billing || {};
    const nombre_cliente = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
   // const email_cliente = billing.email || null; // quitar hardcode
   const email_cliente = 'cl.rodriguezo@duocuc.cl'; 
    const numero_pedido = data.number || data.id || null;
    const fecha_envio = data.date_paid || new Date().toISOString();

    // ✅ Prevenir duplicados
    const yaExiste = await Envio.existeEnvioPorPedidoWoo(numero_pedido, wooId);
    if (yaExiste) {
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'PEDIDO_DUPLICADO'
      });
      console.warn(`📦 Pedido duplicado detectado (numero_pedido: ${numero_pedido}, woo_id: ${wooId})`);
      return res.status(200).json({ mensaje: 'Pedido ya procesado anteriormente. Ignorado para evitar duplicado.' });
    }

    // ✅ Obtener nombre de empresa
    const empresaName = await getEmpresaNameById(empresa_id);

    // ✅ Procesar productos del pedido
    const productosProcesados = [];
    const lineItems = Array.isArray(data.line_items) ? data.line_items : [];

    if (lineItems.length === 0) {
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'SIN_PRODUCTOS'
      });
      return res.status(400).json({ mensaje: 'El pedido no contiene productos.' });
    }

    for (const item of lineItems) {
      const woo_producto_id = item.product_id;
      const nombre_producto = item.name || null;

      // 🔎 Mapear producto interno
      const producto_id = await WooProductMapping.getProductoInternoId(wooId, woo_producto_id);
      if (!producto_id) {
        await registrarEnvioError({
          empresa_id,
          usuario_id,
          numero_pedido,
          motivo_error: 'PRODUCTO_NO_MAPEADO',
          detalles_error: `Woo product ID: ${woo_producto_id}`
        });
        return res.status(404).json({ mensaje: `Producto WooCommerce ${woo_producto_id} no mapeado en sistema interno` });
      }
console.log("llego hasta aquii109")

      const serial = await Serial.obtenerSerialDisponible(producto_id, wooId);
      if (!serial || !serial.id || !serial.codigo) {
        return res.status(404).json({ mensaje: `No hay serial válido para el producto ${nombre_producto || producto_id}` })
      };
      // 📄 Obtener plantilla asociada
      const plantilla = await getPlantillaConFallback(producto_id, wooId, empresa_id);
console.log("llego hasta aquii110")

      // ✅ Agregar al array procesado
      productosProcesados.push({
        producto_id,
        woo_producto_id,
        nombre_producto,
        plantilla,
         seriales: [
          { id_serial: serial.id, codigo: serial.codigo }
        ]
      });
    }

    // ✅ Construcción del objeto de envío
    const envioData = {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      woocommerce_id: wooId,
      productos: productosProcesados,
      empresaName,
      estado: 'pendiente',
      fecha_envio
    };

    // 📝 Crear envío en BD
    let id;
    try {
      id = await Envio.createEnvio(envioData);
    } catch (err) {
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'DB_ERROR',
        detalles_error: err.message
      });
      throw err; // se captura en el catch principal
    }

    // 📬 Obtener configuración SMTP
    const config = await getSMTPConfigByStoreId(wooId || 3);
    if (!config) {
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'SMTP_CONFIG_MISSING'
      });
      return res.status(500).json({
        error: 'No se encontró configuración SMTP activa'
      });
    }

    const smtpConfig = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: !!config.smtp_secure,
      user: config.smtp_username,
      pass: config.smtp_password
    };

    // 📤 Encolar envío
    try {
      await envioQueue.add({
        id,
        ...envioData,
        smtpConfig
      });
    } catch (err) {
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'ENQUEUE_FAIL',
        detalles_error: err.message
      });
      throw err;
    }

    console.log('✅ Envío creado y encolado exitosamente:', id);
    return res.status(200).json({ mensaje: 'Webhook procesado correctamente ✅', envioId: id });

  } catch (error) {
    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: data?.number || null,
      motivo_error: 'UNEXPECTED_EXCEPTION',
      detalles_error: error.stack || error.message
    });
    console.error('❌ Error al procesar webhook:', error);
    return res.status(500).json({ mensaje: 'Error interno al procesar el webhook' });
  }
};





//controladro woocomerce wehbook crud
exports.getAll = async (req, res) => {
  console.log('entro aquí getAll')
  try {
    const webhooks = await Webhook.getWebhooksFromWoo();
    res.status(200).json(webhooks);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener webhooks' });
  }
};

exports.getById = async (req, res) => {
    console.log("entro aca 3");

  try {
    const webhook = await Webhook.getWebhookByIdFromWoo(req.params.id);
    res.json(webhook);
  } catch (err) {
    res.status(500).json({ error: `Error al obtener webhook con ID ${req.params.id}` });
  }
};

exports.create = async (req, res) => {
  try {
    const webhook = await Webhook.createWebhookInWoo(req.body);
    res.json(webhook);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear webhook' });
  }
};

exports.update = async (req, res) => {
  try {
    const updated = await Webhook.updateWebhookInWoo(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar webhook' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await Webhook.deleteWebhookInWoo(req.params.id);
    res.json({ mensaje: `Webhook ${req.params.id} eliminado`, data: result });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar webhook' });
  }
};
