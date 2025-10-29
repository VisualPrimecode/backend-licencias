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

async function revertirSeriales(productos, woocommerce_id) {
  if (!Array.isArray(productos)) return;

  for (const producto of productos) {
    if (!Array.isArray(producto.seriales)) continue;

    for (const serial of producto.seriales) {
      try {
        await Serial.updateSerial2(serial.id_serial, {
          codigo: serial.codigo,
          producto_id: producto.producto_id,
          estado: 'disponible', // 👈 revertimos solo el estado
          observaciones: 'Rollback por error en envío',
          usuario_id: null,     // lo podés decidir: mantener o resetear
          woocommerce_id        // 👈 se pasa desde arriba, no desde el serial
        });
      } catch (err) {
        console.error(`❌ Error revirtiendo serial ${serial.id_serial}:`, err);
      }
    }
  }
}

const mapaExtrasPersonalizado = {
  "office 2024 pro plus": 329,
  "🔥 selecciona acá tu antivirus mcafee antivirus plus 1 año / 1 dispositivo $6.990": 339
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
  let productosExtrasProcesados = [];

  // 1️⃣ Validar que haya productos
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    await registrarEnvioError({
      empresa_id,
      usuario_id,
      numero_pedido,
      motivo_error: 'SIN_PRODUCTOS',
      detalles_error: 'El pedido no contiene productos en el payload recibido',
    });
    const err = new Error('El pedido no contiene productos.');
    err.statusCode = 400;
    throw err;
  }

  // 2️⃣ Validar precios si corresponde
  await validarPreciosProductos(
    lineItems,
    currency,
    registrarEnvioError,
    empresa_id,
    usuario_id,
    numero_pedido
  );

  try {
    // 3️⃣ Iterar productos del pedido (productos principales)
    for (const item of lineItems) {
      const woo_producto_id = item.product_id;
      const nombre_producto = item.name || null;
      const cantidad = item.quantity || 1;

      // 3.1 Verificar mapeo
      const producto_id = await WooProductMapping.getProductoInternoId(
        wooId,
        woo_producto_id
      );

      if (!producto_id) {
        await registrarEnvioError({
          empresa_id,
          usuario_id,
          numero_pedido,
          motivo_error: 'PRODUCTO_NO_MAPEADO',
          detalles_error: `Woo product ID: ${woo_producto_id}`,
        });
        const err = new Error(
          `Producto WooCommerce ${woo_producto_id} no mapeado en sistema interno`
        );
        err.statusCode = 404;
        throw err;
      }

      // -------------------------------
      // 🚩 Seriales de este producto
      const serialesAsignados = [];

      try {
        // 3.2 Asignar seriales del producto
        for (let i = 0; i < cantidad; i++) {
          const serial = await Serial.obtenerSerialDisponible2(
            producto_id,
            wooId,
            numero_pedido
          );

          if (!serial || !serial.id || !serial.codigo) {
            const err = new Error(
              `No hay serial válido para la unidad ${i + 1} del producto ${nombre_producto || producto_id}`
            );
            err.statusCode = 404;
            throw err;
          }

          serialesAsignados.push({
            id_serial: serial.id,
            codigo: serial.codigo,
          });
        }

        console.log(
          `✅ Seriales asignados para producto ${nombre_producto || producto_id}:`,
          serialesAsignados
        );

        // 3.3 Obtener plantilla asociada
        const plantilla = await getPlantillaConFallback(
          producto_id,
          wooId,
          empresa_id
        );

        // 3.4 Confirmar producto
        productosProcesados.push({
          producto_id,
          woo_producto_id,
          nombre_producto,
          plantilla,
          seriales: serialesAsignados,
        });
      } catch (errProducto) {
        // ❌ Fallo durante asignación de este producto
        console.error(
          `❌ Error asignando seriales para producto ${woo_producto_id}, iniciando rollback parcial...`,
          errProducto
        );

        // 🚨 DETECTAR SI ES ERROR DE FALTA DE SERIALES Y ENCOLAR ALERTA
        if (errProducto.statusCode === 404 && errProducto.message.includes('No hay serial válido')) {
          console.log('🚨 Detectado error de falta de seriales, encolando alerta...');
          
          try {
            // 📊 Obtener configuración SMTP
            const smtpConfig = await obtenerSMTPConfig(wooId);
            
            if (smtpConfig) {
              // 📦 Preparar datos de la alerta
              const alertaPedidoQueue = require('../queues/alertaPedidoQueue');
              
              const jobData = {
                wooId,
                numero_pedido,
                nombre_cliente: nombre_cliente || 'Cliente no especificado',
                email_cliente: email_cliente || null,
                productos_faltantes: [{
                  producto_id,
                  woo_producto_id,
                  nombre_producto: nombre_producto || `Producto ID: ${producto_id}`,
                  cantidad_solicitada: cantidad,
                  cantidad_asignada: serialesAsignados.length,
                  cantidad_faltante: cantidad - serialesAsignados.length
                }],
                fecha_fallo: new Date(),
                intentos: 1,
                empresaName: empresaName || await getEmpresaNameById(empresa_id),
                smtpConfig,
                email_destinatario: ['alertas@miempresa.com'] // Configura según tu caso
              };

              // 📬 Encolar job de alerta
              const job = await alertaPedidoQueue.add(jobData, {
                attempts: 3,
                removeOnComplete: true,
                removeOnFail: false,
                priority: 1,
                jobId: `alerta-falta-seriales-${numero_pedido}-${woo_producto_id}-${Date.now()}`
              });

              console.log(`📨 Alerta de falta de seriales encolada (Job ID: ${job.id})`);
            } else {
              console.warn('⚠️ No se encontró SMTP config, no se enviará alerta');
            }
          } catch (alertError) {
            console.error('❌ Error encolando alerta de falta de seriales:', alertError);
            // No re-lanzamos el error para no interrumpir el flujo principal
          }
        }

        // 🔄 Rollback de seriales ya asignados
        if (serialesAsignados.length > 0) {
          await revertirSeriales(
            [{ producto_id, seriales: serialesAsignados }],
            wooId
          );
          console.log(
            `↩️ Rollback completado para producto ${woo_producto_id}`
          );
        }

        throw errProducto; // re-lanzamos para manejar más arriba
      }
    }

// 4️⃣ Procesar productos "Compra Con" (productos extra opcionales)
let extraOptions = [];

try {
  console.log("🧩 Iniciando detección de productos extra 'Compra Con'...");

  // Detectamos si el pedido viene desde WooCommerce (webhook)
  // Si los lineItems tienen 'meta_data' con '_tmcartepo_data', asumimos webhook Woo
  const esWebhookWoo = Array.isArray(lineItems) && lineItems.some(item =>
    Array.isArray(item.meta_data) &&
    item.meta_data.some(m => m.key === "_tmcartepo_data")
  );

  for (const [index, item] of lineItems.entries()) {
    console.log(`📦 Analizando producto [${index}] → ${item.name || item.product_id}`);

    let extrasEncontrados = [];

    if (esWebhookWoo) {
      // 🔹 CASO: WEBHOOK DE WOO (datos en meta_data)
      const metaExtra = item.meta_data?.find(m => m.key === "_tmcartepo_data");

      if (metaExtra && Array.isArray(metaExtra.value)) {
        extrasEncontrados = metaExtra.value.filter(opt =>
          typeof opt.name === "string" && opt.name.toLowerCase().includes("compra con")
        );
      }

      if (extrasEncontrados.length > 0) {
        console.log(`🛒 [WEBHOOK] ${extrasEncontrados.length} extras 'Compra Con' encontrados en ${item.name}`);
      }
    } else {
      // 🔹 CASO: PEDIDO INTERNO / NO WOO (datos en extra_options)
      if (Array.isArray(item.extra_options)) {
        extrasEncontrados = item.extra_options.filter(opt =>
          typeof opt.name === "string" && opt.name.toLowerCase().includes("compra con")
        );
        if (extrasEncontrados.length > 0) {
          console.log(`🛒 [INTERNO] ${extrasEncontrados.length} extras 'Compra Con' encontrados en ${item.name}`);
        }
      }
    }

    // Si encontramos extras, los agregamos al array principal
    if (extrasEncontrados.length > 0) {
      extraOptions.push(...extrasEncontrados);
    }
  }

  if (extraOptions.length === 0) {
    console.log("ℹ️ No se detectaron productos extra 'Compra Con' en este pedido.");
  } else {
    console.log(`✅ Total extras detectados: ${extraOptions.length}`);
  }

} catch (errExtra) {
  console.error("❌ Error al inspeccionar productos extra (Compra Con):", errExtra);
  extraOptions = [];
}

// 4.1️⃣ Si hay extras, procesarlos automáticamente
if (extraOptions.length > 0) {
  try {
    console.log("🚀 Procesando productos extra (Compra Con)...");
    productosExtrasProcesados = await procesarProductosExtraAutomatico(
      extraOptions,
      wooId,
      empresa_id,
      numero_pedido
    );
  } catch (errProcesarExtras) {
    console.error("❌ Error procesando productos extra (Compra Con):", errProcesarExtras);
    throw errProcesarExtras;
  }
}

      

    // 5️⃣ Combinar todos los productos (principales + extras)
    const todosLosProductos = [...productosProcesados, ...productosExtrasProcesados];

    console.log(`✅ Total productos procesados (incluyendo extras): ${todosLosProductos.length}`);
    return todosLosProductos;

  } catch (error) {
    // 🔄 Rollback global (productos + extras)
    const todosAsignados = [...productosProcesados, ...productosExtrasProcesados];
    if (todosAsignados.length > 0) {
      console.log('⚠️ Error global, revirtiendo todos los seriales (productos + extras)...');
      await revertirSeriales(todosAsignados, wooId);
      console.log('↩️ Rollback global completado');
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
      registrarEnvioError
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
