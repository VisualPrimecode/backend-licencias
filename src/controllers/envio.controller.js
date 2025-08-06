const Envio = require('../models/envio.model');
const envioQueue = require('../queues/envioQueue'); // Ruta a tu cola
const cotizacionQueue = require('../queues/cotizacionQueue');
const Plantilla = require('../models/plantilla.model');
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model');
const { createCotizacion } = require('../models/cotizacion.model');
const { getEmpresaNameById } = require('../models/empresa.model');
const { getProductoNameById } = require('../models/producto.model');


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
/*
exports.createEnvio = async (req, res) => {
  console.log('📦 Creando un nuevo envío...');
  console.log('Datos del envío:', req.body);

  try {
    // 🏢 Obtener nombres descriptivos
    const empresaName = await getEmpresaNameById(req.body.empresa_id);
    const productoName = await getProductoNameById(req.body.producto_id);

    // 🧩 Intentar obtener plantilla personalizada
    let plantilla = await Plantilla.getPlantillaByIdProductoWoo(req.body.producto_id, req.body.woocommerce_id);

    // 🧾 Si no existe plantilla personalizada, usar una por defecto
    if (!plantilla) {
      console.log('⚠️ No se encontró una plantilla personalizada. Usando plantilla por defecto.');
      plantilla = {
        id: null,
        empresa_id: req.body.empresa_id,
        producto_id: req.body.producto_id,
        asunto: 'Gracias por tu compra',
        encabezado: 'Gracias por confiar en nosotros',
        cuerpo_html: `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <title>Gracias por tu compra</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f8f8; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
              <h2 style="color: #2b6cb0; text-align: center;">🎉 ¡Gracias por tu compra!</h2>
              <p>Tu pedido ha sido recibido y procesado correctamente.</p>
              <p>Pronto recibirás más información sobre la entrega o activación.</p>
              <div style="margin-top: 20px; padding: 10px; background: #e6fffa; border: 1px solid #b2f5ea; border-radius: 5px;">
                ¿Tienes dudas? Escríbenos a nuestro WhatsApp y con gusto te ayudamos.
              </div>
            </div>
          </body>
          </html>
        `,
        firma: 'Equipo de soporte',
        logo_url: 'https://tusitio.com/logo-default.png',
        idioma: 'es',
        activa: 1,
        creada_en: new Date(),
        woo_id: req.body.woocommerce_id,
        motivo: 'Plantilla por defecto',
        validez_texto: 'Recuerda que este producto debe ser activado lo antes posible.'
      };
    }

    // 📨 Preparar datos del envío
    const envioData = {
      ...req.body,
      estado: 'pendiente',
      plantilla,
      empresaName,
      productoName
    };

    // 🔒 Validación básica
    if (!envioData.empresa_id || !envioData.usuario_id || !envioData.producto_id) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios (empresa_id, usuario_id, producto_id)'
      });
    }

    // 📝 Crear el envío en BD
    const id = await Envio.createEnvio(envioData);

    // 📬 Obtener configuración SMTP
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

    // 📤 Encolar para envío posterior
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
};*/
async function getPlantillaConFallback(producto_id, woo_id, empresa_id) {
  const plantilla = await Plantilla.getPlantillaByIdProductoWoo(producto_id, woo_id);
  if (plantilla) return plantilla;

  return {
    id: null,
    empresa_id,
    producto_id,
    asunto: 'Gracias por tu compra',
    encabezado: 'Gracias por confiar en nosotros',
    cuerpo_html: `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Gracias por tu compra</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🎉 ¡Gracias por tu compra!</h2>
        <p>Tu pedido ha sido procesado correctamente.</p>
        <p>Si tienes alguna duda, contáctanos por WhatsApp.</p>
      </body>
      </html>
    `,
    firma: 'Equipo de soporte',
    logo_url: 'https://tusitio.com/logo-default.png',
    idioma: 'es',
    activa: 1,
    creada_en: new Date(),
    woo_id,
    motivo: 'Plantilla por defecto',
    validez_texto: 'Recuerda activar tu producto a la brevedad.'
  };
}
/*

exports.createEnvio = async (req, res) => {
  console.log('📦 Creando nuevo envío multiproducto...');
  console.log('Datos recibidos:', req.body);

  try {
    const {
      empresa_id,
      usuario_id,
      productos,
      woocommerce_id,
      nombre_cliente,
      email_cliente,
      numero_pedido
    } = req.body;

    // ✅ Validaciones básicas
    if (!empresa_id || !usuario_id || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Faltan campos obligatorios o lista de productos vacía.' });
    }

    const empresaName = await getEmpresaNameById(empresa_id);

    const productosProcesados = [];

    for (const producto of productos) {
      const {
        producto_id,
        woo_producto_id,
        codigo,
        id_serial,
        nombre_producto
      } = producto;

      const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);

      productosProcesados.push({
        producto_id,
        woo_producto_id,
        codigo,
        id_serial,
        nombre_producto,
        plantilla  // 👈 Aquí se guarda la plantilla por producto
      });
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
      // ❌ plantilla: eliminado
    };

    // 📝 Crear envío en BD
    const id = await Envio.createEnvio(envioData);

    // 📬 Obtener configuración SMTP
    const config = await getSMTPConfigByStoreId(woocommerce_id || 3);
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

    // 📤 Encolar envío con productos y sus plantillas
    await envioQueue.add({
      id,
      ...envioData,
      smtpConfig
    });

    return res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear envío multiproducto:', error);
    return res.status(500).json({ error: 'Error interno al crear envío' });
  }
};
*/

exports.createEnvio = async (req, res) => {
  console.log('📦 Creando nuevo envío multiproducto...');
  console.log('Datos recibidos:', req.body);

  try {
    const {
      empresa_id,
      usuario_id,
      productos,
      woocommerce_id,
      nombre_cliente,
      email_cliente,
      numero_pedido
    } = req.body;

    // ✅ Validaciones básicas
    if (
      !empresa_id ||
      !usuario_id ||
      !Array.isArray(productos) ||
      productos.length === 0
    ) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios o lista de productos vacía.'
      });
    }

    const empresaName = await getEmpresaNameById(empresa_id);

    const productosProcesados = [];

    for (const producto of productos) {
      const {
        producto_id,
        woo_producto_id,
        nombre_producto,
        seriales
      } = producto;

      // 🔎 Validar seriales
      if (!Array.isArray(seriales) || seriales.length === 0) {
        return res.status(400).json({
          error: `El producto ${nombre_producto || producto_id} no contiene seriales válidos.`
        });
      }

      // 🔎 Validar que cada serial tenga los campos requeridos
      const serialesValidos = seriales.every(s => s.codigo && s.id_serial);
      if (!serialesValidos) {
        return res.status(400).json({
          error: `Seriales inválidos en el producto ${nombre_producto || producto_id}.`
        });
      }

      // 📄 Obtener plantilla asociada al producto
      const plantilla = await getPlantillaConFallback(producto_id, woocommerce_id, empresa_id);

      productosProcesados.push({
        producto_id,
        woo_producto_id,
        nombre_producto,
        plantilla,
        seriales // ✅ Se guarda la lista completa de seriales
      });
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

    // 📝 Crear envío en BD
    const id = await Envio.createEnvio(envioData);

    // 📬 Obtener configuración SMTP
    const config = await getSMTPConfigByStoreId(woocommerce_id || 3);
    if (!config) {
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

    // 📤 Encolar envío con productos y sus seriales + plantillas
    await envioQueue.add({
      id,
      ...envioData,
      smtpConfig
    });

    return res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear envío multiproducto:', error);
    return res.status(500).json({ error: 'Error interno al crear envío' });
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
