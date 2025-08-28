const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); // Ruta a tu cola
const cotizacionQueue = require('../queues/cotizacionQueue');
const envioProductosQueue = require('../queues/productosEnvioQueue');
const Plantilla = require('../models/plantilla.model');
const Serial = require('../models/serial.model');
const WooProductMapping = require('../models/wooProductMapping.model');
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model');
const { createCotizacion, createEnvioPersonalizado } = require('../models/cotizacion.model');
const { getEmpresaNameById } = require('../models/empresa.model');
const { getProductoInternoByNombreYWooId } = require('../models/wooProductMapping.model');
const {createEnvioError} = require('../models/enviosErrores.model');


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
}*/async function procesarProducto(producto, woocommerce_id, empresa_id, reqBody) {
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
  "🔥 selecciona acá tu antivirus mcafee antivirus plus 1 año / 1 dispositivo $6.990": 339
};
/*
async function procesarProductosExtra(extraOptions, woocommerce_id) {
  if (!Array.isArray(extraOptions)) return;

  const extrasCompraCon = extraOptions.filter(opt =>
    typeof opt.name === 'string' &&
    opt.name.toLowerCase().includes('compra con')
  );

  console.log("extras compra con:", extrasCompraCon);

  for (const extra of extrasCompraCon) {
    const nombreExtraProducto = extra.value?.trim();
    if (!nombreExtraProducto) continue;

    // 🔹 Verificar primero en el mapa personalizado
    const idForzado = mapaExtrasPersonalizado[nombreExtraProducto.toLowerCase()];
    if (idForzado) {
      console.log(`🛒 Producto extra detectado (mapa personalizado): "${nombreExtraProducto}" → ID interno: ${idForzado}`);
      continue;
    }

    // 🔹 Caso normal → buscar en la BD
    try {
      const idInternoExtra = await getProductoInternoByNombreYWooId(nombreExtraProducto, woocommerce_id);
      console.log(`🛒 Producto extra detectado: "${nombreExtraProducto}" → ID interno: ${idInternoExtra ?? 'No encontrado'}`);
    } catch (err) {
      console.error(`⚠️ Error buscando ID interno para producto extra "${nombreExtraProducto}":`, err.message);
    }
  }
}*/
/*
async function procesarProductosExtra(extraOptions, woocommerce_id, empresa_id, numero_pedido) {
  if (!Array.isArray(extraOptions)) return [];

  const extrasCompraCon = extraOptions.filter(opt =>
    typeof opt.name === 'string' &&
    opt.name.toLowerCase().includes('compra con')
  );

  const productosExtras = [];
  console.log("extras compra con:", extrasCompraCon);
  for (const extra of extrasCompraCon) {
    const nombreExtraProducto = extra.value?.trim();
    if (!nombreExtraProducto) continue;

    // 1. Resolver producto interno (mapa forzado o BD)
    let producto_id = null;
    const idForzado = mapaExtrasPersonalizado[nombreExtraProducto.toLowerCase()];
    if (idForzado) {
      producto_id = idForzado;
      console.log(`🛒 Producto extra detectado (mapa personalizado): "${nombreExtraProducto}" → ID interno: ${producto_id}`);
    } else {
      try {
        producto_id = await getProductoInternoByNombreYWooId(nombreExtraProducto, woocommerce_id);
        console.log(`🛒 Producto extra detectado: "${nombreExtraProducto}" → ID interno: ${producto_id ?? 'No encontrado'}`);
      } catch (err) {
        console.error(`⚠️ Error buscando ID interno para producto extra "${nombreExtraProducto}":`, err.message);
        continue; // si no se encuentra, saltamos este extra
      }
    }
    console.log("producto id extra:", producto_id);
    if (!producto_id) continue;

    // 2. Obtener serial (siempre 1 unidad por extra)
    const serial = await Serial.obtenerSerialDisponible2(producto_id, woocommerce_id, numero_pedido);
    if (!serial || !serial.id || !serial.codigo) {
      console.error(`❌ No hay serial válido para producto extra "${nombreExtraProducto}"`);
      continue;
    }

    const seriales = [{ id_serial: serial.id, codigo: serial.codigo }];
console.log("serial extra:", seriales);
    // 3. Obtener plantilla
    const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);
    if (!plantilla) {
      console.error(`❌ No se encontró plantilla para producto extra "${nombreExtraProducto}"`);
      continue;
    }

    // 4. Agregar al array de productos extras
    productosExtras.push({
      producto_id,
      woo_producto_id: woocommerce_id,
      nombre_producto: nombreExtraProducto,
      plantilla,
      seriales
    });
  }
  console.log("productos extras procesados:", productosExtras);
  return productosExtras;
}
*/
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

    // 🔹 Obtener serial
    let serial = null;
    if (envio_tipo === 'nuevo') {
      serial = await Serial.obtenerSerialDisponible2(producto_id, woocommerce_id, numero_pedido);
    } else if (envio_tipo === 'reenvio') {
      const serialesPrevios = await Serial.getSerialesByNumeroPedido(numero_pedido);
      serial = serialesPrevios.find(s => s.producto_id === producto_id);
    }

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

/*

// 🔹 Controlador principal con registro de errores en el catch
exports.createEnvio = async (req, res) => {
  console.log('📦 Creando nuevo envío multiproducto...', req.body);

  try {
    await validarDatosEntrada(req.body);

    const { empresa_id, usuario_id, productos, woocommerce_id, nombre_cliente, email_cliente, numero_pedido } = req.body;

    const empresaName = await getEmpresaNameById(empresa_id);

    const productosProcesados = [];
    for (const producto of productos) {
      try {
        const procesado = await procesarProducto(producto, woocommerce_id, empresa_id, req.body);
        productosProcesados.push(procesado);
      } catch (errorProducto) {
        console.error('❌ Error procesando producto:', errorProducto.message);
        // ⚠️ Si falla algún producto → rollback de seriales de todos los productos recibidos
        if (req.body?.productos) {
          await revertirSeriales(req.body.productos, req.body.woocommerce_id);
        }
        throw errorProducto;
      }
    }

    const envioData = {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      woocommerce_id,
      productos: productosProcesados,
      empresaName,
      estado: 'pendiente'
    };

    const id = await Envio.createEnvio(envioData);

    const smtpConfig = await obtenerSMTPConfig(woocommerce_id);
    await envioQueue.add({ id, ...envioData, smtpConfig });

    return res.status(201).json({ id });

  } catch (error) {
    console.error('❌ Error al crear envío multiproducto:', error);

    // ⚠️ ROLLBACK global por si no entró al bloque interno
    if (req.body?.productos) {
      await revertirSeriales(req.body.productos, req.body.woocommerce_id);
    }

    // 📌 Registro de error global
    await registrarErrorEnvio({
      reqBody: req.body,
      motivo_error: 'Error en createEnvio',
      detalles_error: error.message,
    });

    return res.status(400).json({ error: error.message || 'Error interno al crear envío' });
  }
};
*/

/*
exports.createEnvio = async (req, res) => {
  console.log('📦 Creando nuevo envío multiproducto...', req.body);

  try {
    await validarDatosEntrada(req.body);

    const { empresa_id, usuario_id, productos, woocommerce_id, nombre_cliente, email_cliente, numero_pedido } = req.body;

    const empresaName = await getEmpresaNameById(empresa_id);

    const productosProcesados = [];
    for (const producto of productos) {
      try {
        // 👇 ahora procesarProducto devuelve un array de productos (principal + extras)
        const procesados = await procesarProducto(producto, woocommerce_id, empresa_id, req.body);
        productosProcesados.push(...procesados); // ✅ aplanar en el array final
      } catch (errorProducto) {
        console.error('❌ Error procesando producto:', errorProducto.message);

        // ⚠️ Si falla algún producto → rollback de seriales de todos los productos recibidos
        if (req.body?.productos) {
          await revertirSeriales(req.body.productos, req.body.woocommerce_id);
        }
        throw errorProducto;
      }
    }

    const envioData = {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      woocommerce_id,
      productos: productosProcesados, // ✅ array plano
      empresaName,
      estado: 'pendiente'
    };

    const id = await Envio.createEnvio(envioData);

    const smtpConfig = await obtenerSMTPConfig(woocommerce_id);
    await envioQueue.add({ id, ...envioData, smtpConfig });

    return res.status(201).json({ id });

  } catch (error) {
    console.error('❌ Error al crear envío multiproducto:', error);

    // ⚠️ ROLLBACK global por si no entró al bloque interno
    if (req.body?.productos) {
      await revertirSeriales(req.body.productos, req.body.woocommerce_id);
    }

    // 📌 Registro de error global
    await registrarErrorEnvio({
      reqBody: req.body,
      motivo_error: 'Error en createEnvio',
      detalles_error: error.message,
    });

    return res.status(400).json({ error: error.message || 'Error interno al crear envío' });
  }
};
*/

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
  console.log('📝 Creando nueva cotización...');
  console.log('Datos de la cotización:', req.body);
  console.log("Datos de la cotización:", JSON.stringify(req.body, null, 2));


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
  id_usuario: cotizacionData.usuario_id,
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
      numero_pedido: cotizacionData.numero_pedido || null,
      id_empresa: cotizacionData.empresa_id,
      nombre_cliente: cotizacionData.nombre_cliente,
      email_destino: cotizacionData.email_destino,
      total,
      subtotal,
      iva,
      productos_json: productosConSerialesYPlantilla, 
      smtp_host: smtpConfig.host,
      smtp_user: smtpConfig.user,
      plantilla_usada: plantilla.id,
      asunto_correo,
      cuerpo_html,
      estado_envio: 'PENDIENTE',
      mensaje_error: null
    });

    console.log("productos con seriales:", JSON.stringify(productosConSerialesYPlantilla, null, 2));

    // ✅ Encolar el trabajo para el worker
    await envioProductosQueue.add({
      id,
      ...cotizacionData,
      productos: productosConSerialesYPlantilla,
      smtpConfig,
      plantilla
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
