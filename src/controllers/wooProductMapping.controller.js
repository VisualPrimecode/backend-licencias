const WooProductMapping = require('../models/wooProductMapping.model');
const {createEnvioError} = require('../models/enviosErrores.model');


// Obtener todos los mapeos
exports.getMappings = async (req, res) => {
  console.log('Iniciando solicitud para obtener todos los mapeos');
  try {
    const mappings = await WooProductMapping.getAllMappings();
    res.json(mappings);
  } catch (error) {
    console.error('❌ Error al obtener los mapeos:', error);
    res.status(500).json({ error: 'Error al obtener los mapeos' });
  }
};

// Obtener un mapeo por ID
exports.getMappingById = async (req, res) => {
  console.log('Iniciando solicitud para obtener mapeo por ID');
  try {
    const { id } = req.params;
    const mapping = await WooProductMapping.getMappingById(id);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('❌ Error al obtener el mapeo:', error);
    res.status(500).json({ error: 'Error al obtener el mapeo' });
  }
};

// Obtener un mapeo por ID woocomerce
exports.getMappingByIdWoocomerce = async (req, res) => {
  console.log('Iniciando solicitud para obtener mapeo por ID de WooCommerce');
  try {
    const { woocomerce_id } = req.params;
    const mapping = await WooProductMapping.getMappingByIdWoo(woocomerce_id);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    res.json(mapping);
  } catch (error) {
    console.error('❌ Error al obtener el mapeo:', error);
    res.status(500).json({ error: 'Error al obtener el mapeo' });
  }
};


// Crear un nuevo mapeo
exports.createMapping = async (req, res) => {
  console.log('Iniciando solicitud para crear un nuevo mapeo');
  try {
    const { empresa_id, woocommerce_id, woo_product_id, producto_interno_id, nombre_producto, precio, producto_externo_nombre } = req.body;
    console.log('nombre producto exterrno:', producto_externo_nombre);
    // Validación simple
    if (!empresa_id || !woocommerce_id || !woo_product_id || !producto_interno_id) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const id = await WooProductMapping.createMapping({
      empresa_id,
      woocommerce_id,
      woo_product_id,
      producto_interno_id,
      nombre_producto,
      precio,
      producto_externo_nombre
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear el mapeo:', error);
    res.status(500).json({ error: 'Error al crear el mapeo' });
  }
};

// Actualizar un mapeo
exports.updateMapping = async (req, res) => {
  console.log('Iniciando solicitud para actualizar mapeo por ID');
  try {
    const { id } = req.params;
    const { empresa_id, woocommerce_id, woo_product_id, producto_interno_id, nombre_producto, precio, producto_externo_nombre } = req.body;

    const existing = await WooProductMapping.getMappingById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    await WooProductMapping.updateMapping(id, {
      empresa_id,
      woocommerce_id,
      woo_product_id,
      producto_interno_id,
      nombre_producto,
      precio,
      producto_externo_nombre
    });

    res.json({ message: 'Mapeo actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar el mapeo:', error);
    res.status(500).json({ error: 'Error al actualizar el mapeo' });
  }
};

// Eliminar un mapeo
exports.deleteMapping = async (req, res) => {
  console.log('Iniciando solicitud para eliminar mapeo por ID');
  try {
    const { id } = req.params;

    const existing = await WooProductMapping.getMappingById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Mapeo no encontrado' });
    }

    await WooProductMapping.deleteMapping(id);
    res.json({ message: 'Mapeo eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar el mapeo:', error);
    res.status(500).json({ error: 'Error al eliminar el mapeo' });
  }
};
async function registrarErrorEnvio({ reqBody, motivo_error, detalles_error }) {
  console.log("Intento de crear registro de error...");
  console.log(reqBody);
  console.log(motivo_error);
  console.log(detalles_error);
  try {
    const {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      numeroPedido, // <-- soportar camelCase
      producto_id
    } = reqBody;

    await createEnvioError({
      empresa_id,
      usuario_id,
      producto_id: producto_id || null, // <-- ahora también guarda producto
      serial_id: null, // no disponible en este flujo
      nombre_cliente,
      email_cliente,
      numero_pedido: numero_pedido || numeroPedido || null, // soporta ambas formas
      motivo_error,
      detalles_error
    });
  } catch (err) {
    console.error("⚠️ No se pudo registrar el error en BD:", err.message);
  }
}


// Obtener el producto interno asociado a un producto WooCommerce
exports.getProductoInternoByWoo = async (req, res) => {
  console.log('Iniciando solicitud para obtener producto interno por WooCommerce ID y Woo Product ID');
  
  try {
    const { woocommerce_id, woo_product_id, numero_pedido, numeroPedido } = req.query;
    const numeroPedidoNormalizado = numero_pedido || numeroPedido || null;

    console.log(req.query);
    console.log('Recibiendo solicitud para obtener producto interno por WooCommerce ID:', woocommerce_id, 'y Woo Product ID:', woo_product_id);

    if (!woocommerce_id || !woo_product_id) {
      // Registrar el error en BD
      await registrarErrorEnvio({
        reqBody: {
          empresa_id: woocommerce_id,
          usuario_id: null,
          nombre_cliente: null,
          email_cliente: null,
          numero_pedido: numeroPedidoNormalizado,
          producto_id: woo_product_id // aquí no tenemos producto interno todavía
        },
        motivo_error: 'Parámetros requeridos faltantes',
        detalles_error: `woocommerce_id=${woocommerce_id || 'null'} woo_product_id=${woo_product_id || 'null'}`
      });

      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const productoInternoId = await WooProductMapping.getProductoInternoId(
      parseInt(woocommerce_id),
      parseInt(woo_product_id)
    );

    console.log('Producto interno ID obtenido:', productoInternoId);

    if (productoInternoId) {
      res.json({ producto_interno_id: productoInternoId });
    } else {
      // Registrar el error en BD
      await registrarErrorEnvio({
        reqBody: {
          empresa_id: woocommerce_id,
          usuario_id: null,
          nombre_cliente: null,
          email_cliente: null,
          numero_pedido: numeroPedidoNormalizado,
          producto_id: woo_product_id // aquí no tenemos producto interno todavía
        },
        motivo_error: 'Producto interno no encontrado',
        detalles_error: `No se encontró mapeo para woocommerce_id=${woocommerce_id} y woo_product_id=${woo_product_id}`
      });

      res.status(404).json({ error: 'No se encontró un mapeo para los IDs proporcionados' });
    }
  } catch (error) {
    console.error('❌ Error en getProductoInternoByWoo:', error.message);

    // Registrar el error en BD
    await registrarErrorEnvio({
      reqBody: {
        empresa_id: woocommerce_id,
        usuario_id: null,
        nombre_cliente: null,
        email_cliente: null,
        numero_pedido: req.query.numero_pedido || req.query.numeroPedido || null,
          producto_id: woo_product_id // aquí no tenemos producto interno todavía
      },
      motivo_error: 'Error interno en getProductoInternoByWoo',
      detalles_error: error.message
    });

    res.status(500).json({ error: 'Error al obtener producto interno' });
  }
};

exports.getProductoInternoByNombreYWoo = async (req, res) => {
  console.log('Iniciando solicitud para obtener producto interno por nombre y WooCommerce ID');

  try {
    const { nombre_producto, woocommerce_id } = req.query;

    console.log('Parámetros recibidos:', { nombre_producto, woocommerce_id });

    if (!nombre_producto || !woocommerce_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos: nombre_producto y woocommerce_id' });
    }

    const productoInternoId = await WooProductMapping.getProductoInternoByNombreYWooId(
      nombre_producto,
      parseInt(woocommerce_id)
    );

    console.log('Producto interno ID obtenido:', productoInternoId);

    if (productoInternoId) {
      res.json({ producto_interno_id: productoInternoId });
    } else {
      res.status(404).json({ error: 'No se encontró un producto interno para los datos proporcionados' });
    }

  } catch (error) {
    console.error('❌ Error en getProductoInternoByNombreYWoo:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};