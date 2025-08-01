const Plantilla = require('../models/plantilla.model');

// Obtener todas las plantillas
exports.getPlantillas = async (req, res) => {
  try {
    const plantillas = await Plantilla.getAllPlantillas();
    res.json(plantillas);
  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
};

// Obtener una plantilla por ID
exports.getPlantillaById = async (req, res) => {
  console.log('entro en plantill by id')
  try {
    const { id } = req.params;
    const plantilla = await Plantilla.getPlantillaById(id);

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json(plantilla);
  } catch (error) {
    console.error('❌ Error al obtener plantilla:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
};


// Obtener una plantilla por ID de empresa
exports.getPlantillaByIdEmpresa = async (req, res) => {
  // console.log('entro en plantill by id empresa',req.params);
  try {
    const { id } = req.params;
    const plantilla = await Plantilla.getPlantillaByIdEmpresa(id);
    //console.log('plantilla:', plantilla);

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantillas no encontrada' });
    }

    res.json(plantilla);
  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener las plantillas' });
  }
};


// Obtener una plantilla por ID de producto y id woo
exports.getPlantillaByIdProductoWooController = async (req, res) => {
   console.log('entro en plantill by id producto woo')
  try {
    const { producto_id, woo_id } = req.params;

    if (!producto_id || !woo_id) {
      return res.status(400).json({ error: 'woo_id y producto_id son requeridos' });
    }

    const plantilla = await Plantilla.getPlantillaByIdProductoWoo(producto_id, woo_id);


    if (!plantilla) {
      return res.status(404).json({ error: 'Plantillas no encontrada' });
    }

    res.json(plantilla);
  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener las plantillas' });
  }
};


// Obtener una plantilla por ID de woo
exports.getPlantillaByWooAndMotivo = async (req, res) => {
  try {
    const { woo_id, motivo } = req.params;

    if (!woo_id || !motivo) {
      return res.status(400).json({ error: 'woo_id y motivo son requeridos' });
    }

    const plantillas = await Plantilla.getPlantillaByIdWooYmotivo(woo_id, motivo);

    if (plantillas.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron plantillas' });
    }

    res.json(plantillas);
  } catch (error) {
    console.error('❌ Error al obtener plantilla por woo_id y motivo:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
};


// Crear una nueva plantilla
exports.createPlantilla = async (req, res) => {
  console.log('Iniciando solicitud para crear una nueva plantilla');
  console.log('Datos recibidos:', req.body);
  try {
    const {
      empresa_id,
      producto_id,
      asunto,
      encabezado,
      cuerpo_html,
      firma,
      logo_url,
      idioma,
      activa,
      woocommerce_id,
      motivo,
      validez_texto
    } = req.body;

    // Validación mínima
    if (!empresa_id || !producto_id || !asunto || !cuerpo_html  || !woocommerce_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const id = await Plantilla.createPlantilla({
      empresa_id,
      producto_id,
      asunto,
      encabezado,
      cuerpo_html,
      firma,
      logo_url,
      idioma,
      activa: activa ? 1 : 0,
      woocommerce_id,
      motivo,
      validez_texto
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear plantilla:', error);
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
};

// Actualizar plantilla existente
exports.updatePlantilla = async (req, res) => {
  try {
    const { id } = req.params;

    const plantillaExistente = await Plantilla.getPlantillaById(id);
    if (!plantillaExistente) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const {
      empresa_id,
      producto_id,
      asunto,
      encabezado,
      cuerpo_html,
      firma,
      logo_url,
      idioma,
      activa
    } = req.body;

    await Plantilla.updatePlantilla(id, {
      empresa_id,
      producto_id,
      asunto,
      encabezado,
      cuerpo_html,
      firma,
      logo_url,
      idioma,
      activa
    });

    res.json({ mensaje: 'Plantilla actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar plantilla:', error);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
};

// Eliminar plantilla
exports.deletePlantilla = async (req, res) => {
  try {
    const { id } = req.params;

    const plantilla = await Plantilla.getPlantillaById(id);
    if (!plantilla) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    await Plantilla.deletePlantilla(id);
    res.json({ mensaje: 'Plantilla eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar plantilla:', error);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
};
