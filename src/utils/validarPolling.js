const axios = require('axios');

/**
 * Valida si el polling de WooCommerce está activo mediante una consulta HTTP a la API.
 * Si está pausado, lanza un error controlado para detener el proceso.
 */
async function validarEstadoPolling() {
  try {
    console.log('🔍 Consultando estado del polling vía API...');

    // ⚙️ URL del backend (usa variable de entorno para evitar hardcodear)
    //en local

    //const API_BASE_URL ='http://localhost:3000';

    //en produccion
    const API_BASE_URL ='https://backend-licencias-node-mysql.onrender.com';
    const url = `${API_BASE_URL}/api/polling-control`;

    // Llamada HTTP al endpoint que devuelve el estado
    const { data } = await axios.get(url);

    if (!data) {
      console.warn('⚠️ No se obtuvo respuesta del endpoint de polling — se asume activo por defecto');
      return true;
    }

    // Validar estado del polling
    if (!data.activo) {
      console.log('⏸ Polling pausado manualmente — ejecución detenida.');
      const err = new Error('El polling está actualmente pausado');
      err.code = 'POLLING_PAUSADO';
      err.details = { origen: 'validarEstadoPolling', fecha: new Date().toISOString() };
      throw err;
    }

    console.log('✅ Polling activo — continuando proceso...');
    return true;

  } catch (error) {
    // Si el servidor no responde o da error, lo logueamos
    console.error('❌ Error al validar estado del polling vía API:', error.message);

    // Si la API no está disponible, puedes decidir si quieres detener el polling o asumir activo
    if (error.response && error.response.status === 404) {
      console.warn('⚠️ No se encontró registro de control — se asume activo por seguridad');
      return true;
    }

    // Re-lanzar error para que el worker lo maneje
    throw error;
  }
}

module.exports = { validarEstadoPolling };
