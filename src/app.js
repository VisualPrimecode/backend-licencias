// ✅ Debe ser lo primero de todo
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors'); // <-- ⬅️ Agrega esta línea


// 🔁 Importación de rutas

const usuarioRoutes = require('./routes/usuario.routes');
const authRoutes = require('./routes/auth.routes');
const empresaRoutes = require('./routes/empresa.routes');
const productoRoutes = require('./routes/producto.routes');
const plantillaRoutes = require('./routes/plantilla.routes');
const serialRoutes = require('./routes/serial.routes');
const envioRoutes = require('./routes/envio.routes');
const webhookRoutes = require('./routes/webhook.routes');
//rutas auxliares para intereactuar con la api de woocomerse
const wooRoutes = require('./routes/woocomerce.routes');
//rutas para crud de datos de configuracion de woocomerce
const wooConfigRoutes = require('./routes/woocommerce_config.routes');

const webhooksRoutes = require('./routes/webhooks.routes');
const MappingProdcutsRoutes = require('./routes/wooProductMapping.routes');
const correosConfigRoutes = require('./routes/correosConfig.routes');
const dbConnectionConfigRoutes = require('./routes/dbConnectionConfig.routes');
const informesRoutes = require('./routes/informes.routes');
const cotizacionRoutes = require('./routes/cotizacion.routes');
const envioerrores = require('./routes/enviosErrores.routes');
const envioProductos = require('./routes/envioProducto.routes');
const currencyRoutes = require('./routes/currency.routes');


const app = express();
app.use(cors()); // <-- ⬅️ Esta línea es clave

app.use(express.json());

// 📦 Rutas API

app.use('/api/woocommerce-config', wooConfigRoutes);
app.use('/api/map-products', MappingProdcutsRoutes);
//app.use('/api/woocommerce', wooRoutes);
//webhook de prueba
//app.use('/api/webhooks', webhookRoutes);
//nuevo endpoint para un crud de webhook 
app.use('/api/webhooks-crud', webhooksRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/plantillas', plantillaRoutes);
app.use('/api/seriales', serialRoutes);
app.use('/api/envios', envioRoutes);
app.use('/api/correos', correosConfigRoutes);
app.use('/api/db-configs', dbConnectionConfigRoutes);
app.use('/api/informes', informesRoutes);
app.use('/api/cotizacion', cotizacionRoutes);
app.use('/api/errorEnvio', envioerrores);
app.use('/api/envioProductos', envioProductos);
app.use('/api/currency', currencyRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.send('API de Licencias funcionando 🚀');
});

module.exports = app;
