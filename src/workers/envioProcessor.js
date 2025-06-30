const { sendEnvioCorreo } = require('../utils/mailer');
const { updateEstadoEnvio } = require('../models/envio.model'); // 👈 nuevo

module.exports = async function envioProcessor(job) {
  const envio = job.data;
  console.log(`📨 Procesando job de envío: ${envio.id} para ${envio.email_cliente}`);

  try {
    await sendEnvioCorreo({
      to: envio.email_cliente,
      subject: `Tu envío #${envio.numero_pedido}`,
      text: `Hola ${envio.nombre_cliente}, tu pedido ha sido procesado con éxito.`,
      html: `
        <p>Hola <strong>${envio.nombre_cliente}</strong>,</p>
        <p>Tu pedido <strong>#${envio.numero_pedido}</strong> ha sido procesado.</p>
        <p>Gracias por confiar en nosotros.</p>
      `
    });

    // ✅ Actualizar estado a "enviado"
    await updateEstadoEnvio(envio.id, 'enviado');
    console.log(`✅ Correo enviado correctamente a ${envio.email_cliente}`);
  } catch (err) {
    console.error(`❌ Error al enviar correo a ${envio.email_cliente}:`, err);
    // ❌ Actualizar estado a "fallido"
    await updateEstadoEnvio(envio.id, 'fallido');
    throw err; // para que Bull pueda reintentar si aplica
  }
};
