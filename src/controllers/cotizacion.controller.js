const Cotizacion = require('../models/cotizacion.model');
const currencyModel = require('../models/currency.model');
// Obtener todas las cotizaciones enviadas
exports.getCotizaciones = async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.getAllCotizaciones();
    res.json(cotizaciones);
  } catch (error) {
    console.error('❌ Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

// Obtener una cotización por ID
exports.getCotizacionById = async (req, res) => {
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.getCotizacionById(id);

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(cotizacion);
  } catch (error) {
    console.error('❌ Error al obtener cotización por ID:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

// Obtener una cotización por ID Woocommerce
exports.getCotizacionesByIdWooController = async (req, res) => {
  console.log("Obteniendo cotización por ID WooCommerce...");
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.getCotizacionByIdWoo(id);

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(cotizacion);
  } catch (error) {
    console.error('❌ Error al obtener cotización por ID:', error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};
//parece que no se ocupa
/*
exports.createCotizacion = async (req, res) => {
  console.log('📝 Creando nueva cotización22...');
  console.log('Datos de la cotización:', JSON.stringify(req.body, null, 2));

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
      moneda: req.body.moneda || 'CLP' // 👈 nueva moneda con valor por defecto
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
      console.log(`💱 Convirtiendo de CLP a ${monedaDestino}...`);
      const rateData = rates.find(r => r.target_currency === monedaDestino);

      if (!rateData) {
        console.error(`❌ No se encontró tasa de cambio para la moneda ${monedaDestino}`);
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
        console.log('💱 Convirtiendo precios de productos...');
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
    console.log('Totales finales:', { total, subtotal, iva, monedaDestino, tasaUsada });
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
      mensaje_error: null
    });

    // 📦 Encolar job para envío
    await cotizacionQueue.add({
      id,
      ...cotizacionData,
      total,
      subtotal,
      iva,
      tasaUsada,
      baseCurrency,
      monedaDestino,
      smtpConfig,
      plantilla
    });

    console.log('✅ Job de cotización encolado correctamente');
    return res.status(201).json({ cotizacion_id: id });

  } catch (error) {
    console.error('❌ Error al crear cotización:', error);
    return res.status(500).json({ error: 'Error al crear cotización' });
  }
};*/


// Eliminar cotización por ID (opcional)
exports.deleteCotizacion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Cotizacion.deleteCotizacion(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ mensaje: 'Cotización eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar cotización:', error);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
};

// Actualizar estado de envío o mensaje de error (opcional)
exports.updateCotizacionEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_envio, mensaje_error } = req.body;

    if (!estado_envio) {
      return res.status(400).json({ error: 'estado_envio es requerido' });
    }

    const result = await Cotizacion.updateCotizacionEstado(id, {
      estado_envio,
      mensaje_error: mensaje_error || null
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ mensaje: 'Estado de cotización actualizado' });
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado de cotización' });
  }
};

// Actualizar estado de envío de productos personalizado o mensaje de error (opcional)
exports.updateEnvioPersonalizadoEstado = async (req, res) => {
  console.log("Actualizando estado de envío personalizado...");
  console.log("Datos del request:", req.body);
  console.log("ID del request:", req.params.id);
  try {
    const { id } = req.params;
    const { estado_envio, mensaje_error } = req.body;

    if (!estado_envio) {
      return res.status(400).json({ error: 'estado_envio es requerido' });
    }

    const result = await Cotizacion.updateEnvioPersonalizadoEstado(id, {
      estado_envio,
      mensaje_error: mensaje_error || null
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({ mensaje: 'Estado de cotización actualizado' });
  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar estado de cotización' });
  }
};