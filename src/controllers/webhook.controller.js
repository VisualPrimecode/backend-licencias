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

async function validarPedidoWebhook(data, wooId, registrarEnvioError) {
  console.log("señal de webhook entrante a validar de tienda numero", wooId)
  // 1. Detectar payload vacío o test de conexión
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    console.warn(`⚠️ Webhook vacío recibido (wooId: ${wooId}) → probablemente test de WooCommerce`);

    // No registrar como error, solo loguear
    const err = new Error('Webhook vacío o test de conexión');
    err.statusCode = 200;
    err.isIgnored = true; // para que el controlador sepa ignorarlo
    throw err;
  }

  // 2. Detectar si faltan campos críticos (por ejemplo, numero de pedido o status)
  if (!data.number || !data.status) {
    console.warn(`⚠️ Webhook incompleto recibido (wooId: ${wooId})`, data);

    // Registrar como "ignorado" pero no como error real
    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: data.number || null,
      motivo_error: 'INCOMPLETE_PAYLOAD',
      detalles_error: 'Payload incompleto o sin número de pedido/estado'
    });

    const err = new Error('Webhook incompleto');
    err.statusCode = 200;
    err.isIgnored = true;
    throw err;
  }

  // 3. Validar estado del pedido
  if (data.status !== 'completed' && data.status !== 'processing') {
   
    console.log(`⚠️ Pedido ignorado: estado = ${data.status}`);

    const err = new Error(`Pedido ignorado, estado: ${data.status}`);
    err.statusCode = 200;
    err.isIgnored = true;
    throw err;
  }

  // 4. Si todo es válido, continuar
  return data.status;
}

async function verificarDuplicado(numero_pedido, wooId, empresa_id, usuario_id, registrarEnvioError) {
  const yaExiste = await Envio.existeEnvioPorPedidoWoo(numero_pedido, wooId);

  if (yaExiste) {

    console.warn(`📦 Pedido duplicado detectado (numero_pedido: ${numero_pedido}, woo_id: ${wooId})`);

    const err = new Error('Pedido ya procesado anteriormente. Ignorado para evitar duplicado.');
    err.statusCode = 200;
    err.isIgnored = true; // Igual que en la validación de estado
    throw err;
  }

  return false; // No es duplicado
}
// Revertir seriales a "disponible"
// revertirSeriales puede recibir:
// - un array plano de { id_serial, codigo, producto_id }
// - o un array de "productos" con .seriales -> { seriales: [{ id_serial, codigo }], producto_id }
async function revertirSeriales(serialesOrProductos, options = {}) {
  const {
    wooId = null,
    numero_pedido = null,
    empresa_id = null,
    usuario_id = null,
    registrarEnvioError = null,
    // concurrencyLimit opcional si quieres limitar paralelismo
  } = options || {};

  // Normalizar a lista plana
  const seriales = [];
  if (!Array.isArray(serialesOrProductos)) return;
  for (const p of serialesOrProductos) {
    if (p && p.id_serial) {
      // ya es plano
      seriales.push({
        id_serial: p.id_serial,
        codigo: p.codigo,
        producto_id: p.producto_id ?? p.productoId ?? null
      });
    } else if (p && Array.isArray(p.seriales)) {
      for (const s of p.seriales) {
        seriales.push({
          id_serial: s.id_serial ?? s.id ?? null,
          codigo: s.codigo ?? null,
          producto_id: p.producto_id ?? p.productoId ?? null
        });
      }
    }
  }

  if (seriales.length === 0) return;

  // Ejecutar reversiones en paralelo y capturar resultados
  const promises = seriales.map(s => (async () => {
    try {
      const payload = {
        codigo: s.codigo,
        producto_id: s.producto_id,
        estado: 'disponible',
        observaciones: `Rollback por error en envío${numero_pedido ? ` - pedido ${numero_pedido}` : ''}${wooId ? ` - woo ${wooId}` : ''}`,
        usuario_id: null,
        woocommerce_id: null
      };
      await updateSerial2(s.id_serial, payload);
      return { id_serial: s.id_serial, ok: true };
    } catch (err) {
      console.error(`❌ Error revirtiendo serial ${s.id_serial}:`, err);
      // registrar fallo de rollback si se pasó la función
      if (typeof registrarEnvioError === 'function') {
        try {
          await registrarEnvioError({
            empresa_id,
            usuario_id,
            numero_pedido,
            motivo_error: 'ROLLBACK_SERIAL_FAIL',
            detalles_error: `serial ${s.id_serial} - ${err.message || err.toString()}`
          });
        } catch (regErr) {
          console.error('❌ Error registrando fallo de rollback:', regErr);
        }
      }
      return { id_serial: s.id_serial, ok: false, error: err.message || err.toString() };
    }
  })());

  const results = await Promise.allSettled(promises);

  // resumen (log)
  const failed = results.filter(r => r.status === 'fulfilled' ? r.value && !r.value.ok : true);
  if (failed.length) {
    console.warn(`⚠️ ${failed.length} serial(es) no pudieron revertirse correctamente.`);
  } else {
    console.log(`↩️ Rollback de ${seriales.length} serial(es) completado correctamente.`);
  }
}


/*




async function procesarProductos(lineItems, wooId, empresa_id, usuario_id, numero_pedido, registrarEnvioError) {
  const productosProcesados = [];
  const items = Array.isArray(lineItems) ? lineItems : [];

  // 1. Validar que haya productos
  if (items.length === 0) {
    await registrarEnvioError({
      empresa_id,
      usuario_id,
      numero_pedido,
      motivo_error: 'SIN_PRODUCTOS'
    });
    const err = new Error('El pedido no contiene productos.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Procesar cada producto
  for (const item of items) {
    const woo_producto_id = item.product_id;
    const nombre_producto = item.name || null;
    const cantidad = item.quantity || 1;

    // 2.1 Mapear producto interno
    const producto_id = await WooProductMapping.getProductoInternoId(wooId, woo_producto_id);
    if (!producto_id) {
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'PRODUCTO_NO_MAPEADO',
        detalles_error: `Woo product ID: ${woo_producto_id}`
      });
      const err = new Error(`Producto WooCommerce ${woo_producto_id} no mapeado en sistema interno`);
      err.statusCode = 404;
      throw err;
    }

    // 2.2 Obtener seriales para cada unidad
    const seriales = [];
    for (let i = 0; i < cantidad; i++) {
      const serial = await Serial.obtenerSerialDisponible2(producto_id, wooId, numero_pedido);
      if (!serial || !serial.id || !serial.codigo) {
        const err = new Error(`No hay serial válido para la unidad ${i + 1} del producto ${nombre_producto || producto_id}`);
        err.statusCode = 404;
        throw err;
      }
      seriales.push({ id_serial: serial.id, codigo: serial.codigo });
    }

    console.log(`✅ Seriales asignados para producto ${nombre_producto || producto_id}:`, seriales);
    // 2.3 Obtener plantilla asociada
    const plantilla = await getPlantillaConFallback(producto_id, wooId, empresa_id);

    // 2.4 Agregar al array final
    productosProcesados.push({
      producto_id,
      woo_producto_id,
      nombre_producto,
      plantilla,
      seriales
    });
  }

  // 3. Devolver lista final
  return productosProcesados;
}


*/
async function procesarProductos(
  lineItems,
  wooId,
  empresa_id,
  usuario_id,
  numero_pedido,
  registrarEnvioError,
  currency
) {
  const productosProcesados = [];
  const items = Array.isArray(lineItems) ? lineItems : [];

  // 1. Validar que haya productos
  if (items.length === 0) {
    await registrarEnvioError({
      empresa_id,
      usuario_id,
      numero_pedido,
      motivo_error: 'SIN_PRODUCTOS'
    });
    const err = new Error('El pedido no contiene productos.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Validar precios (si aplica)
  await validarPreciosProductos(items, currency, registrarEnvioError, empresa_id, usuario_id, numero_pedido);

  try {
    // 3. Procesar cada producto, garantizando rollback inmediato si falla algo
    for (const item of items) {
      // objeto temporal para este producto (incluye seriales parciales)
      const productoProcesado = {
        producto_id: null,
        woo_producto_id: item.product_id,
        nombre_producto: item.name || null,
        plantilla: null,
        seriales: []
      };

      try {
        const woo_producto_id = item.product_id;
        const cantidad = item.quantity || 1;

        // 3.1 Mapear producto interno (puede lanzar)
        const producto_id = await WooProductMapping.getProductoInternoId(wooId, woo_producto_id);
        if (!producto_id) {
          await registrarEnvioError({
            empresa_id,
            usuario_id,
            numero_pedido,
            motivo_error: 'PRODUCTO_NO_MAPEADO',
            detalles_error: `Woo product ID: ${woo_producto_id}`
          });
          const err = new Error(`Producto WooCommerce ${woo_producto_id} no mapeado en sistema interno`);
          err.statusCode = 404;
          throw err;
        }
        productoProcesado.producto_id = producto_id;

        // 3.2 Reservar seriales para la cantidad (se van acumulando en productoProcesado.seriales)
        for (let i = 0; i < cantidad; i++) {
          const serial = await Serial.obtenerSerialDisponible2(producto_id, wooId, numero_pedido);
          if (!serial || !serial.id || !serial.codigo) {
            const err = new Error(
              `No hay serial válido para la unidad ${i + 1} del producto ${productoProcesado.nombre_producto || producto_id}`
            );
            err.statusCode = 404;
            throw err;
          }
          // guardamos el serial reservado (parcial o completo)
          productoProcesado.seriales.push({ id_serial: serial.id, codigo: serial.codigo });
        }

        // 3.3 Obtener plantilla (puede lanzar)
        productoProcesado.plantilla = await getPlantillaConFallback(producto_id, wooId, empresa_id);

        // 3.4 Si todo OK → push a array final
        productosProcesados.push(productoProcesado);

      } catch (errProducto) {
        // Si falla en este producto, revertimos:
        // - los seriales ya asignados para este producto (productoProcesado.seriales)
        // - los seriales de productos previos (productosProcesados)
        try {
          const toRevert = [];
          if (productosProcesados.length) toRevert.push(...productosProcesados);
          if (productoProcesado.seriales && productoProcesado.seriales.length) toRevert.push(productoProcesado);

          if (toRevert.length) {
            await revertirSeriales(toRevert);
            console.log('↩️ Rollback de seriales completado tras error en producto');
          }
        } catch (rollbackErr) {
          // Si el rollback falla, lo registramos (no queremos ocultar el fallo original)
          console.error('⚠️ Error durante rollback de seriales:', rollbackErr);
          await registrarEnvioError({
            empresa_id,
            usuario_id,
            numero_pedido,
            motivo_error: 'ROLLBACK_FALLIDO',
            detalles_error: rollbackErr.stack || rollbackErr.message
          });
        }

        // Re-lanzamos el error original del producto para que el flujo superior lo maneje
        throw errProducto;
      }
    }

    // 4. Devolver lista final si todo salió bien
    return productosProcesados;

  } catch (error) {
    // En el catch superior (por si algo no previsto sucede)
    // Aseguramos que todo lo que estuviera en productosProcesados también intente revertirse
    try {
      if (productosProcesados.length) {
        await revertirSeriales(productosProcesados);
        console.log('↩️ Rollback de seriales completado en catch superior');
      }
    } catch (rollbackErr) {
      console.error('⚠️ Error durante rollback en catch superior:', rollbackErr);
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'ROLLBACK_FALLIDO_CATCH',
        detalles_error: rollbackErr.stack || rollbackErr.message
      });
    }
    throw error;
  }
}


async function getPlantillaConFallback(producto_id, woo_id) {
  const plantilla = await Plantilla.getPlantillaByIdProductoWoo(producto_id, woo_id);
  return plantilla || null; // ❌ Ya no hay plantilla por defecto
}
async function obtenerEmpresaYUsuario(wooId, numero_pedido, registrarEnvioError) {
  const empresaUsuario = await Empresa.getEmpresaYUsuarioByWooConfigId(wooId);

  if (!empresaUsuario) {
    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: numero_pedido || null,
      motivo_error: 'EMPRESA_NO_ENCONTRADA'
    });
    return null;
  }

  return empresaUsuario;
}




async function obtenerSMTPConfig(wooId, numero_pedido, registrarEnvioError) {
  const config = await getSMTPConfigByStoreId(wooId);

  if (!config) {
    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: numero_pedido,
      motivo_error: 'SMTP_CONFIG_MISSING'
    });
    return null;
  }

  return {
    host: config.smtp_host,
    port: config.smtp_port,
    secure: !!config.smtp_secure,
    user: config.smtp_username,
    pass: config.smtp_password
  };
}

async function encolarEnvio(id, envioData, smtpConfig, empresa_id, usuario_id, numero_pedido, registrarEnvioError) {
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
}

async function validarPreciosProductos(lineItems, currency, registrarEnvioError, empresa_id, usuario_id, numero_pedido) {
  // Solo aplica si es moneda mexicana
  if (currency !== 'MXN') return;

  for (const item of lineItems) {
    const nombre = item.name || `Producto ${item.product_id}`;
    const precioUnitario = item.price || (parseFloat(item.total) / (item.quantity || 1));
    console.log(`🔍 Validando precio de ${nombre}: ${precioUnitario} MXN`);

    if (precioUnitario < 10) {
      console.warn(`❌ Precio inválido detectado para ${nombre}: ${precioUnitario} MXN`);
      // Registrar error en BD/logs
      await registrarEnvioError({
        empresa_id,
        usuario_id,
        numero_pedido,
        motivo_error: 'PRODUCTO_PRECIO_INVALIDO',
        detalles_error: `Producto ${nombre} con precio inválido: ${precioUnitario} MXN`
      });

      const err = new Error(
        `El producto "${nombre}" tiene un precio inválido (${precioUnitario} MXN). No se puede procesar el pedido.`
      );
      err.statusCode = 400;
      throw err;
    }
  }
}

exports.pedidoCompletado = async (req, res) => {
  console.log('🔔 Webhook recibido: nuevo cambio de estado en un pedido');
  console.log('id woo', req.params.wooId);

  const wooId = req.params.wooId;
  const data = req.body;

  try {
    // ✅ Validar cuerpo del webhook
      await validarPedidoWebhook(data, wooId, registrarEnvioError);
      console.log('✅ Webhook validado correctamente');
      console.log('data despues de validar',data);


    // ✅ Obtener empresa y usuario asociado al WooCommerce
  const empresaUsuario = await obtenerEmpresaYUsuario(wooId, data.number, registrarEnvioError);
if (!empresaUsuario) {
  return res.status(404).json({
    mensaje: 'No se encontró empresa ni usuario para esta configuración WooCommerce'
  });
}

    const empresa_id = empresaUsuario.id;
    const usuario_id = empresaUsuario.usuario_id;

    // ✅ Datos del cliente
    const currency = data.currency || null;
    console.log("moneda del pedido",currency);
    const billing = data.billing || {};
    const nombre_cliente = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
    const email_cliente = billing.email || null; // quitar hardcode
   //const email_cliente = 'cl.rodriguezo@duocuc.cl'; 
    const numero_pedido = data.number || data.id || null;
    const fecha_envio = data.date_paid || new Date().toISOString();

    // ✅ Prevenir duplicados
    await verificarDuplicado(numero_pedido, wooId, empresa_id, usuario_id, registrarEnvioError);


    // ✅ Obtener nombre de empresa
    const empresaName = await getEmpresaNameById(empresa_id);

    // ✅ Procesar productos del pedido
   const productosProcesados = await procesarProductos(
  data.line_items,
  wooId,
  empresa_id,
  
  usuario_id,
  numero_pedido,
  registrarEnvioError,
  currency
);

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
  const smtpConfig = await obtenerSMTPConfig(wooId, numero_pedido, registrarEnvioError);
if (!smtpConfig) {
  return res.status(500).json({ error: 'No se encontró configuración SMTP activa' });
}

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
 

    // 📤 Encolar envío
   await encolarEnvio(id, envioData, smtpConfig, empresa_id, usuario_id, numero_pedido, registrarEnvioError);

    console.log('✅ Envío creado y encolado exitosamente:', id);
    return res.status(200).json({ mensaje: 'Webhook procesado correctamente ✅', envioId: id });

  } catch (error) {
  // Caso especial: error esperado (payload vacío, test de WooCommerce, estado ignorado, etc.)
  if (error.isIgnored) {
    console.log(`ℹ Webhook ignorado: ${error.message}`);
    return res.status(error.statusCode || 200).json({ mensaje: error.message });
  }

  // Caso normal: error real
  await registrarEnvioError({
    woo_config_id: wooId,
    numero_pedido: data?.number || null,
    motivo_error: 'ERROR_ENVIO_AUTOMATICO',
    detalles_error: error.stack || error.message
  });
  
  console.error('❌ Error al procesar webhook:', error);
  return res.status(error.statusCode || 500).json({ mensaje: 'Error interno al procesar el webhook' });
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
