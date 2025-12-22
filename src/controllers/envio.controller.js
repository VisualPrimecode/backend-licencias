const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); // Ruta a tu cola
const cotizacionQueue = require('../queues/cotizacionQueue');
const correoSeguimientoQueue = require('../queues/correoSeguimientoQueue');
const envioProductosQueue = require('../queues/productosEnvioQueue');
const Plantilla = require('../models/plantilla.model');
const Serial = require('../models/serial.model');
const WooProductMapping = require('../models/wooProductMapping.model');
const currencyModel = require('../models/currency.model');
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model');
const { createCotizacion, createEnvioPersonalizado, getCotizacionById } = require('../models/cotizacion.model');
const { getEmpresaNameById } = require('../models/empresa.model');
const { getProductoInternoByNombreYWooId } = require('../models/wooProductMapping.model');
const {createEnvioError} = require('../models/enviosErrores.model');
const { createSeguimiento } = require('../models/seguimientocotizacion.model');


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
async function getPlantillaConFallback(producto_id, woo_id) {
  const plantilla = await Plantilla.getPlantillaByIdProductoWoo(producto_id, woo_id);
  return plantilla || null; // ❌ Ya no hay plantilla por defecto
}

// 🔹 Helper para registrar errores
async function registrarErrorEnvio({ reqBody, motivo_error, detalles_error }) {
  console.log("intento crea registro de registrar envio");
  console.log("datos", reqBody);

  try {
    const {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      productos
    } = reqBody;

    // Si existe al menos un producto, tomamos su ID para registrar
    const primerProducto = Array.isArray(productos) && productos.length > 0 ? productos[0] : {};
    
    await createEnvioError({
      empresa_id,
      usuario_id,
      producto_id: primerProducto.producto_id || null,
      serial_id: primerProducto.seriales?.[0]?.id || null,
      nombre_cliente,
      email_cliente,
      numero_pedido: numero_pedido || null,
      motivo_error,
      detalles_error
    });

  } catch (err) {
    console.error("⚠️ No se pudo registrar el error en BD:", err.message);
  }
}

// 🔹 Ahora es async para poder registrar errores
async function validarDatosEntrada(body) {
  const { empresa_id, usuario_id, productos } = body;
  if (!empresa_id || !usuario_id || !Array.isArray(productos) || productos.length === 0) {
    await registrarErrorEnvio({
      reqBody: body,
      motivo_error: 'Validación inicial fallida',
      detalles_error: 'Faltan campos obligatorios o lista de productos vacía'
    });
    throw new Error('Faltan campos obligatorios o lista de productos vacía.');
  }
}

// 🔹 validarSeriales ahora recibe reqBody y es async
async function validarSeriales(seriales, nombreProducto, reqBody) {
  console.log("entro en validar seriales")
  if (!Array.isArray(seriales) || seriales.length === 0) {
    await registrarErrorEnvio({
      reqBody,
      motivo_error: 'Validación de seriales',
      detalles_error: `El producto ${nombreProducto} no contiene seriales válidos.`
    });
    throw new Error(`El producto ${nombreProducto} no contiene seriales válidos.`);
  }
  if (!seriales.every(s => s.codigo )) {
    await registrarErrorEnvio({
      reqBody,
      motivo_error: 'Validación de seriales',
      detalles_error: `Seriales inválidos en el producto ${nombreProducto}.`
    });
    throw new Error(`Seriales inválidos en el producto ${nombreProducto}.`);
  }
}
/*
// 🔹 procesarProducto ahora recibe reqBody y lo pasa a validarSeriales
async function procesarProducto(producto, woocommerce_id, empresa_id, reqBody) {
  const { producto_id, woo_producto_id, nombre_producto, seriales } = producto;

  await validarSeriales(seriales, nombre_producto || producto_id, reqBody);

  const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);
  if (!plantilla) {
    
    throw new Error(`No se encontró plantilla para el producto ${nombre_producto || producto_id}.`);
  }

  await procesarProductosExtra(producto.extra_options, woocommerce_id);

  return { producto_id, woo_producto_id, nombre_producto, plantilla, seriales };
}
*/
/*
async function procesarProducto(producto, woocommerce_id, empresa_id, reqBody, numero_pedido) {
  const { producto_id, woo_producto_id, nombre_producto, seriales } = producto;

  // 1. Validar seriales del producto principal
  await validarSeriales(seriales, nombre_producto || producto_id, reqBody);

  // 2. Obtener plantilla del producto principal
  const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);
  if (!plantilla) {
    throw new Error(`No se encontró plantilla para el producto ${nombre_producto || producto_id}.`);
  }

  // 3. Procesar productos extra
  const extras = await procesarProductosExtra(producto.extra_options, woocommerce_id, empresa_id, reqBody.numero_pedido);

  // 4. Devolver producto principal + extras (todos planos en un array)
  return [
    { producto_id, woo_producto_id, nombre_producto, plantilla, seriales },
    ...extras
  ];
}*/
async function procesarProducto(producto, woocommerce_id, empresa_id, reqBody) {
  const { producto_id, woo_producto_id, nombre_producto, seriales, extra_options } = producto;
  const { numero_pedido, envio_tipo } = reqBody;

  // 🔹 Validar seriales del producto principal (ya vienen desde el front)
  await validarSeriales(seriales, nombre_producto || producto_id, reqBody);

  // 🔹 Obtener plantilla del producto principal
  const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);
  if (!plantilla) {
    throw new Error(`No se encontró plantilla para el producto ${nombre_producto || producto_id}.`);
  }

  // 🔹 Procesar productos extra
  const extrasProcesados = await procesarProductosExtra(extra_options, woocommerce_id, empresa_id, numero_pedido, envio_tipo);

  // 🔹 Devolver producto principal + extras en un mismo array
  return [
    { producto_id, woo_producto_id, nombre_producto, plantilla, seriales },
    ...extrasProcesados
  ];
}


// 🔹 resto de funciones auxiliares sin cambios
// 🔹 Mapa de excepciones temporales
const mapaExtrasPersonalizado = {
  "office 2024 pro plus": 329,
  "🔥 selecciona acá tu antivirus mcafee antivirus plus 1 año / 1 dispositivo $6.990": 339,
  "Office 2021 Professional":331,

};

async function procesarProductosExtra(extraOptions, woocommerce_id, empresa_id, numero_pedido, envio_tipo) {
  if (!Array.isArray(extraOptions)) return [];

  const productosExtrasProcesados = [];

  const extrasCompraCon = extraOptions.filter(opt =>
    typeof opt.name === 'string' &&
    opt.name.toLowerCase().includes('compra con')
  );

  console.log("extras compra con:", extrasCompraCon);

  for (const extra of extrasCompraCon) {
    const nombreExtraProducto = extra.value?.trim();
    if (!nombreExtraProducto) continue;

    // 🔹 Verificar primero en el mapa personalizado
    let producto_id = mapaExtrasPersonalizado[nombreExtraProducto.toLowerCase()];
    if (!producto_id) {
      try {
        producto_id = await getProductoInternoByNombreYWooId(nombreExtraProducto, woocommerce_id);
      } catch (err) {
        console.error(`⚠️ Error buscando ID interno para producto extra "${nombreExtraProducto}":`, err.message);
        continue;
      }
    }

    if (!producto_id) {
      console.warn(`⚠️ Producto extra no reconocido: "${nombreExtraProducto}"`);
      continue;
    }

    // 🔹 Obtener serial según tipo de envío
    let serial = null;

    if (envio_tipo === 'nuevo') {
      // Siempre pedimos uno nuevo
      serial = await Serial.obtenerSerialDisponible2(producto_id, woocommerce_id, numero_pedido);

    } else if (envio_tipo === 'reenvio') {
      // Intentar recuperar serial previo
      const serialesPrevios = await Serial.getSerialesByNumeroPedido(numero_pedido);
      serial = serialesPrevios.find(s => s.producto_id === producto_id);

      // ⚠️ Si no lo encontró → pedir uno nuevo igual que en "nuevo"
      if (!serial) {
        console.warn(`⚠️ Reenvío sin serial previo para extra "${nombreExtraProducto}", asignando uno nuevo...`);
        serial = await Serial.obtenerSerialDisponible2(producto_id, woocommerce_id, numero_pedido);
      }
    }

    // Validación de seguridad
    if (!serial || !serial.id || !serial.codigo) {
      throw new Error(`No hay serial válido para el producto extra "${nombreExtraProducto}"`);
    }

    // 🔹 Obtener plantilla
    const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);
    if (!plantilla) {
      throw new Error(`No se encontró plantilla para el producto extra "${nombreExtraProducto}"`);
    }

    // 🔹 Agregar al array de productos procesados
    productosExtrasProcesados.push({
      producto_id,
      woo_producto_id: null, // no viene de Woo directamente
      nombre_producto: nombreExtraProducto,
      plantilla,
      seriales: [{ id_serial: serial.id, codigo: serial.codigo }]
    });

    console.log(`🛒 Producto extra agregado: "${nombreExtraProducto}" con serial ${serial.codigo}`);
  }

  return productosExtrasProcesados;
}


async function obtenerSMTPConfig(woocommerce_id) {
  const config = await getSMTPConfigByStoreId(woocommerce_id || 3);
  if (!config) {
    throw new Error('No se encontró configuración SMTP activa');
  }

  return {
    host: config.smtp_host,
    port: config.smtp_port,
    secure: !!config.smtp_secure,
    user: config.smtp_username,
    pass: config.smtp_password
  };
}
// Revertir seriales a "disponible"
async function revertirSeriales(productos) {
  console.log("🔄 Iniciando reversión de seriales...");
  console.log("productos para revertir:", JSON.stringify(productos, null, 2));
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


exports.createEnvio = async (req, res) => {
  console.log('📦 Creando nuevo envío multiproducto...', req.body);

  try {
    await validarDatosEntrada(req.body);

    const { empresa_id, usuario_id, productos, woocommerce_id, nombre_cliente, email_cliente, numero_pedido } = req.body;

    const empresaName = await getEmpresaNameById(empresa_id);

    const productosProcesados = [];

    for (const producto of productos) {
      try {
        // 🔹 procesarProducto ahora devuelve un array: [productoPrincipal, ...extras]
        const procesados = await procesarProducto(producto, woocommerce_id, empresa_id, req.body);

        // 🔹 usamos spread para aplanar y evitar un array anidado
        productosProcesados.push(...procesados);

      } catch (errorProducto) {
        console.error('❌ Error procesando producto:', errorProducto.message);

        // ⚠️ rollback de seriales en caso de error
        if (req.body?.productos) {
          await revertirSeriales(req.body.productos, req.body.woocommerce_id);
        }
        throw errorProducto;
      }
    }

    // 🔹 datos completos del envío
    const envioData = {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      woocommerce_id,
      productos: productosProcesados, // ✅ ya incluye principal + extras
      empresaName,
      estado: 'pendiente'
    };

    // 🔹 guardar en BD
    const id = await Envio.createEnvio(envioData);

    // 🔹 cola de envío (correo u otro flujo)
    const smtpConfig = await obtenerSMTPConfig(woocommerce_id);
    await envioQueue.add({ id, ...envioData, smtpConfig });

    return res.status(201).json({ id });

  } catch (error) {
    console.error('❌ Error al crear envío multiproducto:', error);

    // ⚠️ rollback global por si no entró en el bloque interno
    if (req.body?.productos) {
      await revertirSeriales(req.body.productos, req.body.woocommerce_id);
    }

    // 📌 registro de error
    await registrarErrorEnvio({
      reqBody: req.body,
      motivo_error: 'Error en createEnvio',
      detalles_error: error.message,
    });

    return res.status(400).json({ error: error.message || 'Error interno al crear envío' });
  }
};

















//envio cotizacion metodo controller
exports.createCotizacion = async (req, res) => {
  console.log('📝 Creando nueva cotización44s...');
  console.log('Datos de la cotización:', JSON.stringify(req.body, null, 2));
  const descuentoPorcentaje = Number(req.body.descuento_porcentaje) || 0;


  try {
    // ✅ Obtener plantilla relacionada a la tienda y motivo 'cotizacion'
    const plantillas = await Plantilla.getPlantillaByIdWooYmotivo(
      req.body.woocommerce_id,
      'cotizacion'
    );

    if (!plantillas || plantillas.length === 0) {
      return res.status(404).json({ error: 'No se encontró plantilla para cotización en esta tienda' });
    }

    const plantilla = plantillas[0];

    // ✅ Preparar datos base
    const cotizacionData = {
      ...req.body,
      nombre_cliente: req.body.nombre_cliente || 'Cliente',
      numero_cotizacion: req.body.numero_cotizacion || 'N/A',
      store_id: req.body.woocommerce_id || 3,
      moneda: req.body.moneda || 'CLP' //valor por defecto
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

    // 🧮 Calcular subtotal e IVA base en CLP
    const totalCLP = Number(cotizacionData.total || 0);
    const subtotalCLP = Number((totalCLP / 1.19).toFixed(0));
    const ivaCLP = totalCLP - subtotalCLP;

    // 🏦 Obtener tasas de cambio
    const rates = await currencyModel.getAllRates();
    let total = totalCLP;
    let subtotal = subtotalCLP;
    let iva = ivaCLP;
    let tasaUsada = 1;
    let baseCurrency = 'CLP';
    const monedaDestino = cotizacionData.moneda;

    // 💱 Si la moneda es distinta de CLP, convertir valores
    if (monedaDestino && monedaDestino !== 'CLP') {
      const rateData = rates.find(r => r.target_currency === monedaDestino);

      if (!rateData) {
        return res.status(400).json({
          error: `No se encontró tasa de cambio para la moneda ${monedaDestino}`
        });
      }

      tasaUsada = Number(rateData.rate);
      total = Number((totalCLP * tasaUsada).toFixed(2));
      subtotal = Number((subtotalCLP * tasaUsada).toFixed(2));
      iva = Number((ivaCLP * tasaUsada).toFixed(2));

      console.log(
        `💱 Conversión aplicada: 1 ${baseCurrency} = ${tasaUsada} ${monedaDestino}`
      );

      // 🧾 También convertir precios de productos
      if (Array.isArray(cotizacionData.productos)) {
        cotizacionData.productos = cotizacionData.productos.map(p => {
          const precioCLP = Number(p.price || 0);
          const precioConvertido = Number((precioCLP * tasaUsada).toFixed(2));
          return {
            ...p,
            price_clp: precioCLP,
            price: precioConvertido
          };
        });
      }
    }
    // 💸 Aplicar descuento (si existe)
    const totalConDescuento = descuentoPorcentaje > 0
      ? Number((total - (total * (descuentoPorcentaje / 100))).toFixed(2))
      : total;

      const montoDescuento = descuentoPorcentaje > 0
      ? Number((total * (descuentoPorcentaje / 100)).toFixed(2))
      : 0;

    console.log(`Total con descuento aplicado: ${totalConDescuento} (${descuentoPorcentaje}%)`);
    console.log(`Monto de descuento: ${montoDescuento}`);
    // 🧾 Construir HTML básico con placeholders
    const cuerpo_html = plantilla.cuerpo_html || '';
    const asunto_correo = plantilla.asunto || 'Cotización';

    // 🗂️ Registrar en BD (estado PENDIENTE)
    const id = await createCotizacion({
      id_usuario: cotizacionData.usuario_id,
      id_woo: cotizacionData.woocommerce_id,
      id_empresa: cotizacionData.empresa_id,
      nombre_cliente: cotizacionData.nombre_cliente,
      email_destino: cotizacionData.email_destino,
      total,
      subtotal,
      iva,
      moneda: monedaDestino,          // 👈 nueva columna
      tasa_cambio: tasaUsada,         // 👈 nueva columna
      base_currency: baseCurrency,    // 👈 nueva columna
      productos_json: cotizacionData.productos,
      smtp_host: smtpConfig.host,
      smtp_user: smtpConfig.user,
      plantilla_usada: plantilla.id,
      asunto_correo,
      cuerpo_html,
      estado_envio: 'PENDIENTE',
      mensaje_error: null,
      descuento: descuentoPorcentaje, // 👈 nuevo campo
      
    });
const fechaActual = new Date().toISOString().split('T')[0];

    const valido_por = '15 días';
    // 📦 Encolar job para envío
    await cotizacionQueue.add({
      id,
      ...cotizacionData,
      numero_cotizacion: id,           // 👈 por claridad si quieres diferenciar
  fecha_envio: fechaActual,// 👈 nueva fecha enviada al worker
  valido_por,
      total,
      subtotal,
      iva,
      tasaUsada,
      baseCurrency,
      monedaDestino,
      smtpConfig,
      plantilla,
      descuentoPorcentaje,   // 👈 nuevo campo
  totalConDescuento,
  montoDescuento  
    });

    console.log('✅ Job de cotización encolado correctamente');
    return res.status(201).json({ cotizacion_id: id });

  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    return res.status(500).json({ error: 'Error al crear cotización' });
  }
};

exports.EnvioCorreoSeguimiento = async (req, res) => {
  console.log('Datos de la correo de seguimiento:', JSON.stringify(req.body, null, 2));
    const cotizacionData = await getCotizacionById(req.body.cotizacion_id);

  try {
    const plantillas = await Plantilla.getPlantillaByIdWooYmotivo(
      cotizacionData.id_woo,
      'correoSeguimiento'
    );

    if (!plantillas || plantillas.length === 0) {
      return res.status(404).json({ error: 'No se encontró plantilla de seguimiento en esta tienda' });
    }

    const plantilla = plantillas[0];
    

    // ✅ Preparar datos base
    const correoSeguimientoData = {
      ...req.body,
      nombre_cliente: cotizacionData.nombre_cliente || 'Cliente',
      numero_cotizacion: cotizacionData.numero_cotizacion || 'N/A',
      store_id: cotizacionData.id_woo || 3,
    };
   // console.log('datos de la cotizacion obtenidos:', cotizacionData);
    console.log('Datos de la cotización relevantes:', cotizacionData.email_destino, cotizacionData.nombre_cliente, cotizacionData.id, cotizacionData.id_woo+6
     );
    //console.log('Datos del correo de seguimiento procesados:', correoSeguimientoData);
    console.log('req body:', req.body);
    // ✅ Validación mínima
    if (
      !req.body.cotizacion_id ||
      !cotizacionData.email_destino ||
      !cotizacionData.nombre_cliente 
    ) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }

    // ✅ Obtener configuración SMTP desde la BD
    const config = await getSMTPConfigByStoreId(cotizacionData.id_woo);
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

    // 🧾 Construir HTML básico con placeholders
    const cuerpo_html = plantilla.cuerpo_html || '';
    const asunto_correo = plantilla.asunto || 'Correo de Seguimiento';

    // 🗂️ Registrar en BD (estado PENDIENTE)
     const seguimientoId = await createSeguimiento({
      cotizacion_id: cotizacionData.id,
      /* 
      correo_destinatario: cotizacionData.email_destino,*/
      correo_destinatario: 'claudiorodriguez7778@gmail.com', //para pruebas
      asunto: asunto_correo,
      cuerpo: cuerpo_html,
      fecha_programada: correoSeguimientoData.fechaProgramada,
      estado: 'pendiente'
    });
    console.log('ID de seguimiento creado:', seguimientoId);
const fechaActual = new Date().toISOString().split('T')[0];

    await correoSeguimientoQueue.add({
      seguimientoId,
      ...cotizacionData,
      ...correoSeguimientoData,
      numero_cotizacion: cotizacionData.numero_cotizacion,           
  fecha_envio: fechaActual,
      smtpConfig,
      plantilla
        });

    console.log('✅ Job de cotización encolado correctamente');
    return res.status(201).json({ seguimiento_id: seguimientoId });

  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    return res.status(500).json({ error: 'Error al crear cotización' });
  }
};

//envio de productos personalizados
exports.envioProductos = async (req, res) => { 
  console.log('📝 Creando un nuevo envio de productos...');
  console.log('Datos del envio de productos:', req.body);

  try {
    // ✅ Obtener plantilla relacionada a la tienda y motivo 'envioProductos'
    const plantillas = await Plantilla.getPlantillaByIdWooYmotivo(
      req.body.woocommerce_id,
      'envioProductos'
    );

    if (!plantillas || plantillas.length === 0) {
      return res.status(404).json({ error: 'No se encontró plantilla para cotización en esta tienda' });
    }

    const plantilla = plantillas[0];
    const cotizacionData = {
      ...req.body,
      nombre_cliente: req.body.nombre_cliente || 'Cliente',
      numero_cotizacion: req.body.numero_cotizacion || 'N/A',
      store_id: req.body.woocommerce_id || 3,
      mensaje_opcional: req.body.mensaje_opcional || null  // 👈 Nuevo campo opcional

      
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

    // ✅ Validar que haya productos
    if (!Array.isArray(cotizacionData.productos) || cotizacionData.productos.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un producto en la cotización' });
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

    // 🧮 Calcular subtotal e IVA
    const total = Number(cotizacionData.total || 0);
    const subtotal = Number((total / 1.19).toFixed(0));
    const iva = total - subtotal;

    // 🔑 Nuevo paso: Obtener seriales para cada producto (validación estricta)
    const productosConSerialesYPlantilla = await Promise.all(
      (cotizacionData.productos || []).map(async (p) => {
        // 1️⃣ Obtener producto interno
        const productoInternoId = await WooProductMapping.getProductoInternoId(
          cotizacionData.woocommerce_id,
          p.id
        );

        if (!productoInternoId) {
          throw new Error(`No se encontró mapping interno para el producto Woo ${p.id}`);
        }

        // 2️⃣ Obtener seriales
        const result = await Serial.getSerialesByWooData(
          cotizacionData.woocommerce_id,
          p.id,
          p.cantidad
        );

        // 3️⃣ Validar cantidad de seriales disponibles
        if (result.error || !Array.isArray(result.seriales) || result.seriales.length < p.cantidad) {
          throw new Error(
            `No se encontraron seriales suficientes para el producto Woo ${p.id}. ` +
            `Se esperaban ${p.cantidad}, se obtuvieron ${result.seriales ? result.seriales.length : 0}`
          );
        }

        // 4️⃣ Obtener plantilla asociada al producto
        const plantillaProd = await Plantilla.getPlantillaByIdProductoWoo(
          productoInternoId,
          cotizacionData.woocommerce_id
        );

        return {
          ...p,
          producto_interno_id: productoInternoId,
          seriales: result.seriales,
          plantilla: plantillaProd || null
        };
      })
    );
const productosParaGuardar = productosConSerialesYPlantilla.map((p) => {
  const { plantilla, ...resto } = p;  
  return resto;
});


    // 🧾 Construir HTML básico con placeholders (sin reemplazos aún)
    if (!plantilla.cuerpo_html) {
      return res.status(400).json({ error: 'La plantilla seleccionada no tiene cuerpo_html definido' });
    }

    const cuerpo_html = plantilla.cuerpo_html;
    const asunto_correo = plantilla.asunto || 'envioProductos';

    // 🗂️ Registrar en BD (con estado PENDIENTE)
    const id = await createEnvioPersonalizado({
      id_usuario: cotizacionData.user_id,
      id_woo: cotizacionData.woocommerce_id,
      id_cotizacion: cotizacionData.numero_cotizacion,
      numero_pedido: cotizacionData.numero_pedido || null,
      id_empresa: cotizacionData.empresa_id,
      nombre_cliente: cotizacionData.nombre_cliente,
      email_destino: cotizacionData.email_destino,
      total,
      subtotal,
      iva,
      productos_json: productosParaGuardar, 
      smtp_host: smtpConfig.host,
      smtp_user: smtpConfig.user,
      plantilla_usada: plantilla.id,
      asunto_correo,
      cuerpo_html,
      estado_envio: 'PENDIENTE',
      mensaje_error: null,
      mensaje_opcional: cotizacionData.mensaje_opcional // 👈 Se guarda en la BD

    });

    console.log("productos con seriales:", JSON.stringify(productosConSerialesYPlantilla, null, 2));

    // ✅ Encolar el trabajo para el worker
    await envioProductosQueue.add({
      id,
      ...cotizacionData,
      productos: productosConSerialesYPlantilla,
      smtpConfig,
      plantilla,
      
    });

    console.log('✅ Job de cotización encolado con seriales');
    return res.status(201).json({ cotizacion_id: id });

  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    return res.status(400).json({
      error: 'No se pudo crear la cotización',
      detalle: error.message || 'Error desconocido'
    });
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
  //console.log('🔍 Consultando estado del envío por Woo ID y número de pedido...');
  try {
    const { woo_id, numero_pedido } = req.query;
   // console.log('Parámetros recibidos:', { woo_id, numero_pedido });

    // Validación básica
    if (!woo_id || !numero_pedido) {
      return res.status(400).json({ error: 'Parámetros requeridos: woo_id y numero_pedido' });
    }

    const estado = await Envio.getEstadoEnvio(woo_id, numero_pedido);

    //console.log('Estado del envío:', estado);
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
