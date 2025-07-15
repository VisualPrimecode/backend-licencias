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
   console.log('entro en plantill by id empresa')
  try {
    const { id } = req.params;
    const plantilla = await Plantilla.getPlantillaByIdEmpresa(id);

    if (!plantilla) {
      return res.status(404).json({ error: 'Plantillas no encontrada' });
    }

    res.json(plantilla);
  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error);
    res.status(500).json({ error: 'Error al obtener las plantillas' });
  }
};

// Crear una nueva plantilla
exports.createPlantilla = async (req, res) => {
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
      activa
    } = req.body;

    // Validación mínima
    if (!empresa_id || !producto_id || !asunto || !cuerpo_html) {
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
      activa: activa ? 1 : 0
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
