const { sendEnvioCorreo } = require('../utils/mailer2');
const { updateEstadoEnvio } = require('../models/envio.model');
const { getSMTPConfigByStoreId } = require('../models/correosConfig.model'); // 👈 Asumimos que lo exportas desde aquí

module.exports = async function envioProcessor(job) {
  const envio = job.data;

  console.log(`📨 Procesando job de envío: ${envio.id} para ${envio.email_cliente}`);
  console.log('Datos del envío:', envio);

  try {
    // 1. Obtener configuración SMTP desde el store_id
    console.log(`Obteniendo configuración SMTP para store_id: ${envio.store_id}`);
    const config = await getSMTPConfigByStoreId(envio.store_id); // 👈 Asegúrate que `store_id` viene en `envio`
    console.log('configuración SMTP obtenida:', config);
    if (!config) {
      throw new Error(`❌ No se encontró configuración SMTP activa para store_id: ${envio.store_id}`);
    }

    // 2. Adaptar a estructura esperada por mailer.js
    
    const smtpConfig = {
      host: config.smtp_host,
      port: config.smtp_port,
      secure: !!config.smtp_secure,
      user: config.smtp_username,
      pass: config.smtp_password
    };
    console.log('Configuración SMTP adaptada:', smtpConfig);
    // 3. Enviar el correo usando smtpConfig personalizado
    await sendEnvioCorreo({
      smtpConfig, // 👈 nuevo argumento
      to: envio.email_cliente,
      subject: `Tu envío #${envio.numero_pedido} ha sido procesado`,
      text: `Hola ${envio.nombre_cliente}, tu pedido #${envio.numero_pedido} ha sido procesado con éxito. Código de producto: ${envio.codigo}.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4CAF50;">¡Tu pedido ha sido procesado! 🎉</h2>
          <p>Hola <strong>${envio.nombre_cliente}</strong>,</p>
          <p>Nos complace informarte que tu pedido <strong>#${envio.numero_pedido}</strong> ha sido procesado correctamente.</p>
          
          <h3>🔍 Detalles del envío:</h3>
          <ul style="line-height: 1.6;">
            <li><strong>Empresa ID:</strong> ${envio.empresa_id}</li>
            <li><strong>Producto ID:</strong> ${envio.producto_id}</li>
            <li><strong>Código Serial:</strong> <code>${envio.codigo}</code></li>
            <li><strong>ID Serial:</strong> ${envio.id_serial}</li>
            <li><strong>WooCommerce ID:</strong> ${envio.woocommerce_id}</li>
          </ul>

          <p>📦 Tu producto está en camino. Te mantendremos informado con futuras actualizaciones.</p>
          <p style="margin-top: 30px;">Gracias por confiar en nosotros.</p>
          <p>— El equipo de logística</p>
        </div>
      `
    });

    // ✅ Actualizar estado a "enviado"
    await updateEstadoEnvio(envio.id, 'enviado');
    console.log(`✅ Correo enviado correctamente a ${envio.email_cliente}`);

  } catch (err) {
    console.error(`❌ Error al enviar correo a ${envio.email_cliente}:`, err);
    await updateEstadoEnvio(envio.id, 'fallido');
    throw err; // para que Bull pueda reintentar si aplica
  }
};
