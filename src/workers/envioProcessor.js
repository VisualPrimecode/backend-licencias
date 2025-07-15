const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function envioProcessor(job) {
  const envio = job.data;

  console.log(`📨 Procesando job de envío: ${envio.id} para ${envio.email_cliente}`);
  console.log('Datos del envío:', envio);

  const smtpConfig = envio.smtpConfig;

  if (!smtpConfig) {
    throw new Error(`❌ smtpConfig no está presente en el job`);
  }

  await sendEnvioCorreo({
    smtpConfig,
    to: envio.email_cliente,
    subject: `Tu envío #${envio.numero_pedido} ha sido procesado`,
    text: `Hola ${envio.nombre_cliente}, tu pedido #${envio.numero_pedido} ha sido procesado con éxito. Código de producto: ${envio.codigo}.`,
    html: 
        `<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
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
        </div>`
      
    
  });

  return { id: envio.id }; // 👈 Devuelve el id para que el listener pueda actualizar
};
