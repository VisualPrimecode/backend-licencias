const Webhook = require('../models/webhook.model');
const Empresa = require('../models/empresa.model');
const Serial = require('../models/serial.model');
const WooConfig = require('../models/woocommerce_config.model');
const { calcularStockRestantePorHora } = require('../controllers/informes.controller');

const WooProductMapping = require('../models/wooProductMapping.model');
const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); 
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model');
const Plantilla = require('../models/plantilla.model');
const {createEnvioError} = require('../models/enviosErrores.model');
const { getEmpresaNameById } = require('../models/empresa.model');


const { updatePollingStatus } = require('../models/pollingControl'); // ✅ nuevo import

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



exports.toggleAllWebhooks = async (req, res) => {
  const { action } = req.params;
  const validActions = { activar: 'activo', pausar: 'pausado' };
  console.log("accion recibida",action);


  if (!validActions[action]) {
    return res.status(400).json({ error: "Acción no válida. Usa 'activar' o 'pausar'." });
  }

  const estadoObjetivo = validActions[action];
  const activar = action === 'activar';
  const emoji = activar ? '🚀' : '🔄';

  console.log(`${emoji} Iniciando proceso para ${action} todos los sistemas (webhooks + polling)...`);

  try {
    // 1️⃣ Obtener todas las tiendas
    const tiendas = await WooConfig.getAllConfigs();
    if (!tiendas || tiendas.length === 0) {
      return res.status(404).json({ error: "No se encontraron tiendas configuradas." });
    }

    let resultados = [];

    // 2️⃣ Iterar por cada tienda y actualizar sus webhooks
    for (const tienda of tiendas) {
      console.log(`📦 Tienda: ${tienda.nombre_alias} (config_id=${tienda.id})`);

      const webhooks = await Webhook.getWebhooksByConfigId(tienda.id);
      if (!webhooks || webhooks.length === 0) {
        console.log(`⚠️ No hay webhooks en la tienda ${tienda.nombre_alias}`);
        continue;
      }
      console.log(`🔍 Webhooks encontrados: ${webhooks.length}`);

      const resultadosTienda = await Promise.allSettled(
        webhooks.map(async (wh) => {
          const result = await Webhook.syncWebhookStatus(wh.id, estadoObjetivo, tienda.id);
          return {
            tienda: tienda.nombre_alias,
            webhook_local_id: wh.id,
            woo_id: wh.woo_id,
            status: result.ok ? `✅ ${estadoObjetivo}` : "❌ error",
            detalle: result.error || null
          };
        })
      );

      resultados.push(...resultadosTienda.map(r => r.value || r.reason));
    }

    // 3️⃣ Resumen de webhooks
    const total = resultados.length;
   
    // 4️⃣ Actualizar también el estado del polling
    let pollingResultado;
    try {
      await updatePollingStatus(activar, 'admin');
      pollingResultado = {
        nuevo_estado: activar ? 'ACTIVO' : 'PAUSADO',
        resultado: '✅ actualizado'
      };
      console.log(`🛰️ Polling actualizado a estado: ${pollingResultado.nuevo_estado}`);
    } catch (pollingError) {
      console.error('💥 Error al actualizar estado de polling:', pollingError);
      pollingResultado = {
        nuevo_estado: activar ? 'ACTIVO' : 'PAUSADO',
        resultado: '❌ error',
        detalle: pollingError.message || pollingError
      };
    }

    // 5️⃣ Respuesta global
    return res.status(200).json({
      mensaje: `✅ Proceso de ${action} completado`,
      resumen: {
        webhooks: { total },
        polling: pollingResultado
      },
      detalles_webhooks: resultados
    });

  } catch (error) {
    console.error(`💥 Error global en ${action}AllWebhooks:`, error);
    return res.status(500).json({ error: `Error interno al ${action} webhooks y polling` });
  }
};




exports.updateWebhook = async (req, res) => {
  console.log("entro aca update");
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
    console.log("datos req update",req.body);
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
/*
async function validarPedidoWebhook(data, wooId, registrarEnvioError) {
  console.log("señal de webhook entrante a validar de tienda numero", wooId)
  console.log("datos del pedido a validar", data);
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
}*/

async function validarPedidoWebhook(data, wooId, registrarEnvioError) {
  console.log("📥 Validando pedido entrante de tienda", wooId);
  console.log("numeroPedido:", data.numerber || data.id);

  // 1. Detectar payload vacío o test
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    console.warn(`⚠️ Payload vacío recibido (wooId: ${wooId}) → probablemente test de WooCommerce`);

    const err = new Error("Payload vacío o test de conexión");
    err.statusCode = 200;
    err.isIgnored = true;
    throw err;
  }

  // 2. Obtener identificador del pedido (webhook = number, polling = id)
  const numeroPedido = data.number || data.id || null;

  // 3. Estado del pedido (existe en ambos casos)
  const estadoPedido = data.status || null;

  if (!numeroPedido || !estadoPedido) {
    console.warn(`⚠️ Payload incompleto recibido (wooId: ${wooId})`, data);

    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: numeroPedido,
      motivo_error: "INCOMPLETE_PAYLOAD",
      detalles_error: "Payload incompleto o sin número de pedido/estado",
    });

    const err = new Error("Webhook/Polling incompleto");
    err.statusCode = 200;
    err.isIgnored = true;
    throw err;
  }

  // 4. Validar estado del pedido
  if (estadoPedido !== "completed" && estadoPedido !== "processing") {
    console.log(`⚠️ Pedido ignorado: estado = ${estadoPedido}`);

    const err = new Error(`Pedido ignorado, estado: ${estadoPedido}`);
    err.statusCode = 200;
    err.isIgnored = true;
    throw err;
  }

  // 5. Todo correcto
  return estadoPedido;
}


async function verificarDuplicado(numero_pedido, wooId, empresa_id, usuario_id, registrarEnvioError) {
  const yaExiste = await Envio.existeEnvioPorPedidoWoo(numero_pedido, wooId, registrarEnvioError);

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

async function revertirSeriales(productos) {
  console.log("🔄 Iniciando reversión de seriales...");
  if (!Array.isArray(productos)) return;

  for (const producto of productos) {
    if (!Array.isArray(producto.seriales)) continue;

    for (const serial of producto.seriales) {
      try {
        console.log(`🔄 Revirtiendo serial ${serial.id_serial} (${serial.codigo})`);

        await Serial.updateSerial2(serial.id_serial, {
          estado: 'disponible',
          numero_pedido: null
        });

        console.log(`✔ Serial ${serial.id_serial} revertido exitosamente`);

      } catch (err) {
        console.error(`❌ Error revirtiendo serial ${serial.id_serial}:`, err);
      }
    }
  }
}
// 👉 Método de prueba para updateSerial2
exports.testUpdateSerial = async (req, res) => {
  try {
    const { id } = req.params;  // ID del serial desde la URL
    const data = req.body;      // Campos a actualizar desde el body

    if (!id) {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar el ID del serial en la URL"
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        ok: false,
        message: "Debes enviar un objeto JSON con los campos a actualizar"
      });
    }

    console.log("🧪 Test Update Serial → ID:", id, "Data:", data);

    const result = await Serial.updateSerial2(id, data);

    return res.json({
      ok: true,
      message: "Serial actualizado correctamente",
      updateResult: result
    });

  } catch (err) {
    console.error("❌ Error en testUpdateSerial:", err);
    return res.status(500).json({
      ok: false,
      message: "Error ejecutando updateSerial2",
      error: err.message
    });
  }
};


const mapaExtrasPersonalizado = {
  "office 2024 pro plus": 329,
  "🔥 selecciona acá tu antivirus mcafee antivirus plus 1 año / 1 dispositivo $6.990": 339,
  "Office 2021 Professional":331,
};

async function procesarProductosExtraAutomatico(extraOptions, wooId, empresa_id, numero_pedido) {
  console.log("🔍 Iniciando procesamiento de productos extra automáticos...");
  console.log("📦 Extra options recibidos:", JSON.stringify(extraOptions, null, 2));

  if (!Array.isArray(extraOptions)) {
    console.warn("⚠️ extraOptions no es un array o está vacío, no se procesarán productos extra.");
    return [];
  }

  const productosExtrasProcesados = [];

  // 🔹 Filtrar solo las opciones tipo "Compra con"
  const extrasCompraCon = extraOptions.filter(opt =>
    typeof opt.name === 'string' &&
    opt.name.toLowerCase().includes('compra con')
  );

  console.log(`🧩 Extras tipo 'compra con' detectados: ${extrasCompraCon.length}`);

  for (const extra of extrasCompraCon) {
    try {
      console.log("➡️ Procesando extra:", JSON.stringify(extra, null, 2));

      const nombreExtraProducto = extra.value?.trim();
      if (!nombreExtraProducto) {
        console.warn("⚠️ Extra sin nombre válido, se omite:", extra);
        continue;
      }

      console.log(`🔎 Buscando ID interno para producto extra: "${nombreExtraProducto}"`);

      // 1️⃣ Intentar mapear producto interno exactamente como viene
      let producto_id = mapaExtrasPersonalizado[nombreExtraProducto.toLowerCase()];
      console.log("🗺️ Resultado mapa personalizado:", producto_id);

      if (!producto_id) {
        try {
          producto_id = await getProductoInternoByNombreYWooId(nombreExtraProducto, wooId);
          console.log("🔁 ID interno obtenido desde base:", producto_id);
        } catch (err) {
          console.error(`❌ Error al buscar producto extra "${nombreExtraProducto}" en BD:`, err.message);
          continue;
        }
      }

      if (!producto_id) {
        console.warn(`⚠️ Producto extra no reconocido: "${nombreExtraProducto}", se omite.`);
        continue;
      }

      // 2️⃣ Asignar serial
      console.log(`🎯 Asignando serial para producto extra ID interno: ${producto_id}`);
      const serial = await Serial.obtenerSerialDisponible2(producto_id, wooId, numero_pedido);
      console.log("📟 Resultado de obtenerSerialDisponible2:", serial);

      if (!serial || !serial.id || !serial.codigo) {
        console.error(`❌ No hay serial válido para el producto extra "${nombreExtraProducto}"`);
        const err = new Error(`No hay serial válido para el producto extra "${nombreExtraProducto}"`);
        err.statusCode = 404;
        throw err;
      }

      // 3️⃣ Obtener plantilla
      console.log(`📄 Buscando plantilla para producto extra ${producto_id} (wooId: ${wooId})`);
      const plantilla = await getPlantillaConFallback(producto_id, wooId, empresa_id);
      console.log("🧩 Plantilla encontrada:", plantilla ? "✅ Sí" : "❌ No");

      if (!plantilla) {
        const err = new Error(`No se encontró plantilla para el producto extra "${nombreExtraProducto}"`);
        err.statusCode = 404;
        throw err;
      }

      // 4️⃣ Agregar producto extra procesado
      const productoProcesado = {
        producto_id,
        woo_producto_id: null,
        nombre_producto: nombreExtraProducto,
        plantilla,
        seriales: [{ id_serial: serial.id, codigo: serial.codigo }]
      };

      productosExtrasProcesados.push(productoProcesado);

      console.log(`🛒 Producto extra procesado correctamente: "${nombreExtraProducto}"`);
      console.log("📋 Detalle del producto extra procesado:", JSON.stringify(productoProcesado, null, 2));
    } catch (errExtra) {
      console.error("❌ Error procesando un producto extra:", errExtra);
    }
  }

  console.log(`✅ Finalizado procesamiento de productos extra. Total procesados: ${productosExtrasProcesados.length}`);
  console.log("📦 Productos extras procesados:", JSON.stringify(productosExtrasProcesados, null, 2));

  return productosExtrasProcesados;
}
/*
async function procesarProductos(
  lineItems, wooId, empresa_id, usuario_id, numero_pedido,
  registrarEnvioError, currency
) {
  const productosProcesados = [];
  let productosExtrasProcesados = [];

  // 🧩 1️⃣ Validar productos
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    await registrarEnvioError({
      empresa_id, usuario_id, numero_pedido,
      motivo_error: 'SIN_PRODUCTOS',
      detalles_error: 'El pedido no contiene productos en el payload recibido',
    });
    throw Object.assign(new Error('El pedido no contiene productos.'), { statusCode: 400 });
  }

  // 💰 2️⃣ Validar precios
  await validarPreciosProductos(lineItems, currency, registrarEnvioError, empresa_id, usuario_id, numero_pedido);

  try {
    // 🔁 3️⃣ Procesar productos principales
    for (const item of lineItems) {
      const { product_id: woo_producto_id, name: nombre_producto = null, quantity: cantidad = 1 } = item;
      const producto_id = await WooProductMapping.getProductoInternoId(wooId, woo_producto_id);

      if (!producto_id) {
        await registrarEnvioError({
          empresa_id, usuario_id, numero_pedido,
          motivo_error: 'PRODUCTO_NO_MAPEADO',
          detalles_error: `Woo product ID: ${woo_producto_id}`,
        });
        throw Object.assign(new Error(`Producto WooCommerce ${woo_producto_id} no mapeado`), { statusCode: 404 });
      }

      try {
        // 🔢 Seriales
        const serialesAsignados = await Promise.all(
          Array.from({ length: cantidad }, async (_, i) => {
            const s = await Serial.obtenerSerialDisponible2(producto_id, wooId, numero_pedido);
            if (!s?.id || !s?.codigo)
              throw Object.assign(new Error(`No hay serial válido para la unidad ${i + 1} del producto ${nombre_producto || producto_id}`), { statusCode: 404 });
            return { id_serial: s.id, codigo: s.codigo };
          })
        );

        const plantilla = await getPlantillaConFallback(producto_id, wooId, empresa_id);
        productosProcesados.push({ producto_id, woo_producto_id, nombre_producto, plantilla, seriales: serialesAsignados });
      } catch (err) {
        await manejarErrorProducto(err, { producto_id, woo_producto_id, nombre_producto, cantidad, serialesAsignados: [], numero_pedido, wooId });
        throw err;
      }
    }

    // 🧩 4️⃣ Procesar productos "Compra Con"
    const extraOptions = detectarProductosExtra(lineItems);
    if (extraOptions.length) {
      productosExtrasProcesados = await procesarProductosExtraAutomatico(extraOptions, wooId, empresa_id, numero_pedido);
    }

    // ✅ 5️⃣ Resultado final
    const todos = [...productosProcesados, ...productosExtrasProcesados];
    console.log(`✅ Total productos procesados: ${todos.length}`);
    return todos;

  } catch (error) {
    // 🔄 Rollback global
    const todosAsignados = [...productosProcesados, ...productosExtrasProcesados];
    if (todosAsignados.length > 0) {
      console.log('⚠️ Error global, revirtiendo seriales...');
      await revertirSeriales(todosAsignados, wooId);
    }
    throw error;
  }
}*/
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
  const erroresDetectados = [];
  let productosExtrasProcesados = [];

  // 🧩 1️⃣ Validar entrada
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    await registrarEnvioError({
      empresa_id, usuario_id, numero_pedido,
      motivo_error: 'SIN_PRODUCTOS',
      detalles_error: 'El pedido no contiene productos en el payload recibido',
    });
    throw Object.assign(new Error('El pedido no contiene productos.'), { statusCode: 400 });
  }

  // 💰 2️⃣ Validar precios
  await validarPreciosProductos(lineItems, currency, registrarEnvioError, empresa_id, usuario_id, numero_pedido);

  // 🚀 3️⃣ Procesar productos principales
  for (const item of lineItems) {

    const {
      product_id: woo_producto_id,
      name: nombre_producto = null,
      quantity: cantidad = 1
    } = item;

    let serialesAsignados = [];

    try {
      // 🔍 Obtener ID interno
      const producto_id = await WooProductMapping.getProductoInternoId(wooId, woo_producto_id);
      if (!producto_id) {
        throw Object.assign(
          new Error(`Producto WooCommerce ${woo_producto_id} no mapeado`),
          { statusCode: 404 }
        );
      }

      console.log(`📦 Procesando producto ${nombre_producto} (${woo_producto_id}) - Cantidad: ${cantidad}`);

      // 🔢 3.1 ASIGNACIÓN SECURE DE SERIALES (NO Promise.all)
      for (let i = 0; i < cantidad; i++) {
        const s = await Serial.obtenerSerialDisponible2(producto_id, wooId, numero_pedido);

        if (!s?.id || !s?.codigo) {
          // ❗Error crítico: no hay serial para esta unidad
          throw Object.assign(
            new Error(
              `No hay serial válido para la unidad ${i + 1} del producto ${nombre_producto || producto_id}`
            ),
            { statusCode: 404, serialesAsignados }
          );
        }

        serialesAsignados.push({
          id_serial: s.id,
          codigo: s.codigo
        });
      }

      // 🧩 3.2 Obtener plantilla
      const plantilla = await getPlantillaConFallback(producto_id, wooId, empresa_id);

      // 🟢 3.3 Producto procesado correctamente
      productosProcesados.push({
        producto_id,
        woo_producto_id,
        nombre_producto,
        plantilla,
        seriales: serialesAsignados
      });

      console.log(`✅ Producto ${woo_producto_id} procesado con ${serialesAsignados.length} serial(es)`);

    } catch (err) {

      // ⚠️ Recuperamos seriales parciales si vienen dentro del error
      const serialesFallidos = err.serialesAsignados || serialesAsignados || [];

      console.warn(`⚠️ Error procesando producto ${woo_producto_id}:`, err.message);

      const errorProducto = await manejarErrorProducto(err, {
        producto_id: item.product_id,
        woo_producto_id,
        nombre_producto,
        cantidad,
        serialesAsignados: serialesFallidos,   // 👈 AHORA SÍ pasan los seriales reales
        numero_pedido,
        wooId
      });

      erroresDetectados.push(errorProducto);

      // ⚠️ No re-lanzamos error para continuar con otros productos
    }
  }

  // 🧩 4️⃣ Procesar productos "Compra Con"
  try {
    const extraOptions = detectarProductosExtra(lineItems);
    if (extraOptions.length) {
      productosExtrasProcesados = await procesarProductosExtraAutomatico(
        extraOptions,
        wooId,
        empresa_id,
        numero_pedido
      );
    }
  } catch (errExtras) {
    console.warn('⚠️ Error procesando productos extra:', errExtras.message);
  }

  // 🧮 5️⃣ Consolidar resultados
  const todosProcesados = [...productosProcesados, ...productosExtrasProcesados];
  const totalProductos = todosProcesados.length + erroresDetectados.length;

  console.log(
    `🧾 Resumen procesamiento → OK: ${todosProcesados.length}, Error: ${erroresDetectados.length}, Total: ${totalProductos}`
  );

  // 🔙 6️⃣ Retornar resultado final
  return {
    productosProcesados: todosProcesados,
    erroresDetectados
  };
}

/* -----------------------------------------
   🔧 FUNCIONES AUXILIARES SIMPLIFICADAS
------------------------------------------*/

// Detección de extras "Compra Con"
function detectarProductosExtra(lineItems = []) {
  const esWebhookWoo = lineItems.some(i => i.meta_data?.some(m => m.key === "_tmcartepo_data"));
  const extras = [];

  for (const item of lineItems) {
    const fuente = esWebhookWoo
      ? item.meta_data?.find(m => m.key === "_tmcartepo_data")?.value
      : item.extra_options;
    const encontrados = (fuente || []).filter(o => o.name?.toLowerCase().includes("compra con"));
    extras.push(...encontrados);
  }
  console.log(`🛒 Extras 'Compra Con' detectados: ${extras.length}`);
  return extras;
}
/*
// Manejo y alerta ante error de seriales
async function manejarErrorProducto(err, { producto_id, woo_producto_id, nombre_producto, cantidad, serialesAsignados, numero_pedido, wooId }) {
  console.error(`❌ Error en producto ${woo_producto_id}:`, err);

  if (err.statusCode === 404 && err.message.includes('No hay serial válido')) {
    try {
      const { crearControlSiNoExiste, estaBloqueado, bloquearProducto } = require('../models/controlAlertasStockModel');
      await crearControlSiNoExiste(producto_id, 1);

      if (!(await estaBloqueado(producto_id))) {
        const smtp = await obtenerSMTPConfig(wooId);
        if (smtp) {
          const alertaPedidoQueue = require('../queues/alertaPedidoQueue');
          await alertaPedidoQueue.add({
            wooId,
            numero_pedido,
            productos_faltantes: [{
              producto_id, woo_producto_id, nombre_producto,
              cantidad_solicitada: cantidad,
              cantidad_asignada: serialesAsignados.length,
              cantidad_faltante: cantidad - serialesAsignados.length
            }],
            fecha_fallo: new Date(),
            intentos: 1,
            smtpConfig: smtp,
            email_destinatario: ['claudiorodriguez7778@gmail.com','cleon@cloudi.cl','dtorres@cloudi.cl']
          }, { attempts: 3, removeOnComplete: true, priority: 1 });
          await bloquearProducto(producto_id, `Alerta enviada para pedido ${numero_pedido}. Esperando reposición.`);
        } else console.warn('⚠️ No se encontró configuración SMTP.');
      }
    } catch (alertError) {
      console.error('❌ Error procesando alerta de seriales:', alertError);
    }
  }

  if (serialesAsignados?.length) {
    await revertirSeriales([{ producto_id, seriales: serialesAsignados }], wooId);
    console.log(`↩️ Rollback de seriales completado para producto ${woo_producto_id}`);
  }
}
*/
async function manejarErrorProducto(err, contexto) {
  const {
    producto_id,
    woo_producto_id,
    nombre_producto,
    cantidad,
    serialesAsignados = [],
    numero_pedido,
    wooId
  } = contexto;

  console.error(`❌ Error en producto ${woo_producto_id} (${nombre_producto}):`, err);

  // 🧱 1️⃣ Definir estructura de reporte
  const errorInfo = {
    producto_id,
    woo_producto_id,
    nombre_producto,
    cantidad_solicitada: cantidad,
    cantidad_asignada: serialesAsignados.length,
    cantidad_faltante: Math.max(cantidad - serialesAsignados.length, 0),
    motivo_error: 'ERROR_PRODUCTO',
    mensaje_error: err.message,
    fecha_fallo: new Date(),
    numero_pedido,
    wooId
  };

  try {
    // 🧩 2️⃣ Caso especial: sin serial válido
    if (err.statusCode === 404 && err.message.includes('No hay serial válido')) {
      const { crearControlSiNoExiste } = require('../models/controlAlertasStockModel');
      await crearControlSiNoExiste(producto_id, 1);
      errorInfo.motivo_error = 'SIN_SERIAL_VALIDO';
    }
  } catch (controlErr) {
    console.warn('⚠️ Error registrando control de stock:', controlErr.message);
  }

  try {
    // 🔄 3️⃣ Rollback de seriales (si corresponde)
    if (serialesAsignados?.length > 0) {
      await revertirSeriales([{ producto_id, seriales: serialesAsignados }], wooId);
      console.log(`↩️ Rollback completado para producto ${woo_producto_id}`);
    }
  } catch (rollbackErr) {
    console.error('⚠️ Error durante rollback de seriales:', rollbackErr.message);
    errorInfo.rollback_error = rollbackErr.message;
  }

  // 🪄 4️⃣ Devolver información estructurada del error
  return errorInfo;
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
  console.log("currency en validarPreciosProductos",currency);
  if (currency !== 'MXN') return;

  for (const item of lineItems) {
    console.log("item en validarPreciosProductos",item);
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

const PedidosLock = require('../models/pedidosLock.model');
/*
async function procesarPedidoWoo(data, wooId, registrarEnvioError) {
  const numero_pedido = data.number || data.id;
  try {
      await validarPedidoWebhook(data, wooId, registrarEnvioError);

  } catch (error) {
    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: data?.number || null,
      motivo_error: 'ERROR_PROCESAR_PEDIDO',
      detalles_error: error.stack || error.message
    });

    console.error(`❌ Error procesando pedido ${data.number}:`, error);
    throw error;
  }
  // 0. Intentar adquirir lock en BD
  const lockAdquirido = await PedidosLock.adquirirLock(wooId, numero_pedido);
  if (!lockAdquirido) {
    const err = new Error(`Pedido ${numero_pedido} ya está en proceso`);
    err.isIgnored = true;
    err.statusCode = 202; // aceptado pero no reprocesado
    throw err;
  }

  try {
    // 1. Validar datos básicos

    // 2. Obtener empresa y usuario
    const empresaUsuario = await obtenerEmpresaYUsuario(wooId, data.number, registrarEnvioError);
    if (!empresaUsuario) {
      throw new Error(`No se encontró empresa/usuario para wooId ${wooId}, pedido ${data.number}`);
    }
    const empresa_id = empresaUsuario.id;
    const usuario_id = empresaUsuario.usuario_id;

    // 3. Datos del cliente
    const billing = data.billing || {};
    const nombre_cliente = (
      `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
      data.customer_name || ''
    );
    const email_cliente = billing.email || data.customer_email || null;

    const fecha_envio = data.date_paid || new Date();

    // 4. Prevenir duplicados ya registrados
    await verificarDuplicado(numero_pedido, wooId, empresa_id, usuario_id, registrarEnvioError);

    // 5. Nombre de empresa
    const empresaName = await getEmpresaNameById(empresa_id);

    // 6. Procesar productos
    const productosRaw = data.line_items || data.products || [];
    if (!productosRaw.length) {
      await registrarEnvioError({
        woo_config_id: wooId,
        numero_pedido,
        motivo_error: 'SIN_PRODUCTOS',
        detalles_error: 'El pedido no contiene productos en el payload recibido'
      });
      throw new Error(`Pedido ${numero_pedido} sin productos`);
    }

    const productosProcesados = await procesarProductos(
      productosRaw,
      wooId,
      empresa_id,
      usuario_id,
      numero_pedido,
      registrarEnvioError,
      
    );
    
    // 7. Construcción del objeto envío
   function formatFechaMySQL(dateInput = new Date()) {
  const date = (dateInput instanceof Date)
    ? dateInput
    : new Date(dateInput); // si viene string, lo convierte

  if (isNaN(date.getTime())) {
    // fallback si la fecha no es válida
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

    const envioData = {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado: 'pendiente',
      fecha_envio: formatFechaMySQL(fecha_envio),
      woocommerce_id: wooId,
      woo_idproduct: null
    };

    // 8. Configuración SMTP
    const smtpConfig = await obtenerSMTPConfig(wooId, numero_pedido, registrarEnvioError);
    if (!smtpConfig) {
      throw new Error('No se encontró configuración SMTP activa');
    }

    // 9. Registrar en BD
    const id = await Envio.createEnvio(envioData);
    console.log("productos procesados antes de encolar",productosProcesados);
    // 10. Encolar para envío
    await encolarEnvio(
      id,
      { ...envioData, productos: productosProcesados, empresaName },
      smtpConfig,
      empresa_id,
      usuario_id,
      numero_pedido,
      registrarEnvioError
    );

    console.log(`✅ Pedido ${numero_pedido} procesado y encolado exitosamente`);

    // =========================
// 🔥 11. Evaluar alerta predictiva
// =========================

try {
    console.log("🚨 Evaluando alerta predictiva de stock...");

  // ✅ Obtener hora actual de Chile en formato HH:mm
  const ahoraChile = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
  const fechaChile = new Date(ahoraChile);
  const horaChile = fechaChile.toTimeString().slice(0, 5); // "HH:mm"

  // ✅ Extraer IDs de productos únicos del pedido
  const productoIds = [
    ...new Set(
      productosProcesados
        .map(p => p.producto_id)
        .filter(id => id != null)
    )
  ];
  console.log("Producto IDs para alerta predictiva:", productoIds);

  // ✅ Solo ejecutamos si hay productos válidos
  if (productoIds.length > 0) {

    console.log("🔎 Ejecutando alerta predictiva para productos:", productoIds);

    await calcularStockRestantePorHora({
      body: {
        hora_actual: horaChile,
        productoIds
      }
    }, {
      status: () => ({ json: () => {} })  // 📌 mock de response para compatibilidad
    });

  }

} catch (alertError) {
  console.error("⚠️ Error ejecutando alerta predictiva:", alertError);
}

    await PedidosLock.liberarLock(wooId, numero_pedido, 'completed');
//await verificarStockProductos(productosProcesados);

    return id;

  } catch (error) {
    // 11b. Si falla → marcar lock como failed
    await PedidosLock.liberarLock(wooId, numero_pedido, 'failed');

    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido: data?.number || null,
      motivo_error: 'ERROR_PROCESAR_PEDIDO',
      detalles_error: error.stack || error.message
    });

    console.error(`❌ Error procesando pedido ${data.number}:`, error);
    throw error;
  }
}*/
 

function formatFechaMySQL(dateInput = new Date()) {
  const date = (dateInput instanceof Date)
    ? dateInput
    : new Date(dateInput); // si viene string, lo convierte

  if (isNaN(date.getTime())) {
    // fallback si la fecha no es válida
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function procesarPedidoWoo(data, wooId, registrarEnvioError) {
  const numero_pedido = data.number || data.id;

  try {
    await validarPedidoWebhook(data, wooId, registrarEnvioError);
  } catch (error) {
    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido,
      motivo_error: 'ERROR_PROCESAR_PEDIDO',
      detalles_error: error.stack || error.message
    });
    console.error(`❌ Error procesando pedido ${numero_pedido}:`, error);
    throw error;
  }

  // 🔒 0️⃣ Intentar adquirir lock
  const lockAdquirido = await PedidosLock.adquirirLock(wooId, numero_pedido);
  if (!lockAdquirido) {
    const err = new Error(`Pedido ${numero_pedido} ya está en proceso`);
    err.isIgnored = true;
    err.statusCode = 202;
    throw err;
  }

  try {
    // 1️⃣ Obtener datos de empresa y usuario
    const empresaUsuario = await obtenerEmpresaYUsuario(wooId, numero_pedido, registrarEnvioError);
    if (!empresaUsuario) {
      throw new Error(`No se encontró empresa/usuario para wooId ${wooId}, pedido ${numero_pedido}`);
    }

    const empresa_id = empresaUsuario.id;
    const usuario_id = empresaUsuario.usuario_id;

    // 2️⃣ Datos del cliente
    const billing = data.billing || {};
    const nombre_cliente = (
      `${billing.first_name || ''} ${billing.last_name || ''}`.trim() ||
      data.customer_name || ''
    );
    const email_cliente = billing.email || data.customer_email || null;
    const fecha_envio = data.date_paid || new Date();

    // 3️⃣ Evitar duplicados
    await verificarDuplicado(numero_pedido, wooId, empresa_id, usuario_id, registrarEnvioError);

    // 4️⃣ Obtener nombre de empresa
    const empresaName = await getEmpresaNameById(empresa_id);

    // 5️⃣ Procesar productos
    const productosRaw = data.line_items || data.products || [];
    const { productosProcesados, erroresDetectados } = await procesarProductos(
      productosRaw,
      wooId,
      empresa_id,
      usuario_id,
      numero_pedido,
      registrarEnvioError,
      data.currency
    );

    // 6️⃣ Registrar envío SOLO si no hubo errores
    let envioId = null;

    if (productosProcesados.length > 0 && erroresDetectados.length === 0) {

      const envioData = {
        empresa_id,
        usuario_id,
        nombre_cliente,
        email_cliente,
        numero_pedido,
        estado: 'pendiente',
        fecha_envio: formatFechaMySQL(fecha_envio),
        woocommerce_id: wooId,
        woo_idproduct: null
      };

      const smtpConfig = await obtenerSMTPConfig(wooId, numero_pedido, registrarEnvioError);
      if (!smtpConfig) throw new Error('No se encontró configuración SMTP activa');

      envioId = await Envio.createEnvio(envioData);

      console.log(`📦 Pedido ${numero_pedido}: encolando ${productosProcesados.length} productos procesados`);

      await encolarEnvio(
        envioId,
        { ...envioData, productos: productosProcesados, empresaName },
        smtpConfig,
        empresa_id,
        usuario_id,
        numero_pedido,
        registrarEnvioError
      );

    } else if (erroresDetectados.length > 0) {
  console.warn(`🚫 Pedido ${numero_pedido} NO SE ENVIARÁ debido a errores en productos.`);

  try {

    // 🕒 Validación horaria (Chile): NO enviar alertas entre 23:00 y 08:00
    const ahora = new Date();
    const horaChile = ahora.toLocaleString("en-US", { timeZone: "America/Santiago" });
    const hora = new Date(horaChile).getHours();
    console.log(`🕰️ Hora actual en Chile: ${hora}:00`);
    console.log('hora en chile', horaChile);

    const horarioRestringido = (hora >= 23 || hora < 8);

    if (horarioRestringido) {
      console.log(`⏰ Pedido ${numero_pedido} con errores detectados (${erroresDetectados.length}), pero NO se registrará ni enviará alerta porque estamos en horario restringido (23:00 - 08:00).`);
    
    } else {

      // 7️⃣ Alerta consolidada si hubo errores
      console.log(`🚨 Pedido ${numero_pedido} con ${erroresDetectados.length} errores detectados. Verificando alerta...`);

      const { crearSiNoExisteAlertaPedido } = require('../models/alertasPedidosModel');

      // 📌 1. Revisar si ya existe alerta para este pedido
      const { creada } = await crearSiNoExisteAlertaPedido({
        numero_pedido,
        woo_config_id: wooId,
        empresa_id,
        motivo: `Pedido con errores (${erroresDetectados.length})`
      });

      if (creada) {
        // 📌 2. Enviar alerta solo si fue creada recién (no existía)
        console.log(`📧 Enviando alerta consolidada para pedido ${numero_pedido}...`);

        const smtp = await obtenerSMTPConfig(wooId);
        if (smtp) {

          const alertaPedidoQueue = require('../queues/alertaPedidoQueue');

          await alertaPedidoQueue.add({
            wooId,
            numero_pedido,
            empresa_id,
            productos_afectados: erroresDetectados,
            total_productos_fallidos: erroresDetectados.length,
            total_productos_ok: productosProcesados.length,
            fecha_fallo: new Date(),
            smtpConfig: smtp,
            email_destinatario: [
              'claudiorodriguez7778@gmail.com',
              // 'cleon@cloudi.cl',
              // 'dtorres@cloudi.cl'
            ]
          }, { attempts: 3, removeOnComplete: true, priority: 1 });

          // 🧱 Bloqueo opcional de productos fallidos
          const { bloquearProducto } = require('../models/controlAlertasStockModel');
          for (const err of erroresDetectados) {
            try {
              await bloquearProducto(err.producto_id, `Pedido ${numero_pedido} en alerta. Esperando reposición.`);
            } catch (e) {
              console.warn(`⚠️ No se pudo bloquear producto ${err.producto_id}:`, e.message);
            }
          }

        } else {
          console.warn('⚠️ No se encontró configuración SMTP para enviar alerta de pedido.');
        }

      } else {
        // 📌 Ya existía alerta → no enviar nuevamente
        console.log(`ℹ️ Alerta para el pedido ${numero_pedido} ya existía. No se enviará nuevamente.`);
      }

    } // ← cierre del if horario

    // 7️⃣ Siempre rollback de seriales (independiente del horario)
    console.log('productosProcesados en rollback', productosProcesados);
    console.log('wooId en rollback', wooId);

    await revertirSeriales(productosProcesados, wooId);
    console.log(`🔄 Rollback de seriales realizado correctamente para pedido ${numero_pedido}`);

  } catch (rollbackError) {
    console.error(`❌ Error realizando rollback de seriales del pedido ${numero_pedido}:`, rollbackError);
  }


}


    // 8️⃣ Liberar lock
    let estadoFinal = 'completed';

    if (erroresDetectados.length > 0) {
      estadoFinal = productosProcesados.length > 0 ? 'partial' : 'failed';
    }

    await PedidosLock.liberarLock(wooId, numero_pedido, estadoFinal);

    // 9️⃣ Retornar resultado
    return {
      envioId,
      productosProcesados: productosProcesados.length,
      erroresDetectados: erroresDetectados.length
    };

  } catch (error) {
    await PedidosLock.liberarLock(wooId, numero_pedido, 'failed');

    await registrarEnvioError({
      woo_config_id: wooId,
      numero_pedido,
      motivo_error: 'ERROR_PROCESAR_PEDIDO',
      detalles_error: error.stack || error.message
    });

    console.error(`❌ Error procesando pedido ${numero_pedido}:`, error);
    throw error;
  }
}


exports.pedidoCompletado = async (req, res) => {
  console.log('🔔 Webhook recibido: nuevo cambio de estado en un pedido');

  const wooId = req.params.wooId;
  const data = req.body;

  try {
    const envioId = await procesarPedidoWoo(data, wooId, registrarEnvioError);
    return res.status(200).json({ mensaje: 'Webhook procesado correctamente ✅', envioId });
  } catch (error) {
    if (error.isIgnored) {
      return res.status(error.statusCode || 200).json({ mensaje: error.message });
    }
    return res.status(500).json({ mensaje: 'Error interno al procesar el webhook' });
  }
};

// controllers/pollingController.js

exports.ejecutarPolling = async (req, res) => {
  console.log('⏱️ Ejecutando polling de WooCommerce desde API...');
  
  try {
    
    const tiendas = await WooConfig.getAllConfigs();
/*
const tiendas = [
      {
        id: 5,
        empresa_id: 12,
        nombre_alias: 'Licencias Digitales',
        url: 'https://www.licenciasdigitales.cl/',
        clave_cliente: 'ck_3011579aa50320e6e40c6c86e691e749dd22842d',
        clave_secreta: 'cs_07044e0ddcae0647767e0c632ea4a606da0662aa',
        estado: 'activa',
        ultima_verificacion: null,
        notas: 'licencias digitales',
        queryStringAuth: 1,
        creado_en: new Date("2025-07-16T21:43:46.000Z")
      },
      
    ];
   */
    for (const tienda of tiendas) {
      console.log(`📦 Revisando pedidos de tienda: ${tienda.id}`);

      const pedidos = await WooConfig.getPedidos(tienda.id, {
        per_page: 50,
        orderby: "date",
        order: "desc",
      });

      for (const pedido of pedidos) {
        const numero_pedido = pedido.number || pedido.id;

        // 🔎 Verificar si ya existe en nuestra BD
        const existe = await Envio.existeEnvioPorPedidoWoo(numero_pedido, tienda.id);

        if (!existe) {
          console.log(`⚡ Pedido ${numero_pedido} de tienda ${tienda.id} no procesado, intentando lock...`);

          try {
            // 👉 Usar el mismo método genérico de procesar con lock
            await procesarPedidoWoo(pedido, tienda.id, registrarEnvioError);

          } catch (err) {
            // Caso especial: pedido ya estaba siendo procesado por otro flujo
            if (err.isIgnored && err.statusCode === 202) {
              console.log(`⏸ Pedido ${numero_pedido} ya estaba en proceso, lo ignoramos en polling.`);
              continue;
            }

            console.error(`❌ Error procesando pedido ${numero_pedido} en polling:`, err);

            await registrarEnvioError({
              woo_config_id: tienda.id,
              numero_pedido,
              motivo_error: 'ERROR_POLLING_ENVIO',
              detalles_error: err.stack || err.message,
            });
          }
        }
      }
    }

    console.log('✅ Polling finalizado correctamente');
    return res.status(200).json({ mensaje: 'Polling ejecutado correctamente ✅' });

  } catch (error) {
    console.error('❌ Error en ejecutarPolling:', error);
    return res.status(500).json({ mensaje: 'Error interno en el polling' });
  }
};
// controllers/webhook_controller.js




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
