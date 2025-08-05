const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function envioProcessor(job) {
  const envio = job.data;
  const { plantilla, empresaName, productos = [] } = envio;

  try {
    const smtpConfig = envio.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ smtpConfig inválido o incompleto en el job');
    }

    if (!plantilla?.cuerpo_html) {
      throw new Error('❌ La plantilla no contiene un cuerpo_html válido');
    }

    // ✅ Usar nombre_producto directamente
    const productosHtml = productos.map(p => `
      <li>
        <strong>${p.nombre_producto}</strong><br>
        Serial: <code>${p.codigo}</code>
      </li>
    `).join('');

    const datosPedidoHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4CAF50;">¡Tu pedido ha sido procesado! 🎉</h2>
        <p>Hola <strong>${envio.nombre_cliente}</strong>,</p>
        <p>Nos complace informarte que tu pedido <strong>#${envio.numero_pedido}</strong> ha sido procesado correctamente.</p>
        
        <h3>🔍 Detalles del Pedido:</h3>
        <ul style="line-height: 1.6;">
          <li><strong>Empresa:</strong> ${empresaName?.nombre}</li>
          <li><strong>Tienda:</strong> ${empresaName?.dominio_web}</li>
        </ul>

        <h3>📦 Productos incluidos:</h3>
        <ul style="line-height: 1.6;">
          ${productosHtml}
        </ul>

        <p>📄 A continuación, te dejamos las instrucciones:</p>
      </div>
    `;

    const htmlFinal = datosPedidoHtml + plantilla.cuerpo_html;

    await sendEnvioCorreo({
      smtpConfig,
      to: envio.email_cliente,
      subject: plantilla?.asunto || `Tu pedido #${envio.numero_pedido} ha sido procesado`,
      text: `Hola ${envio.nombre_cliente}, tu pedido ha sido procesado. Revisa los pasos de activación en este correo.`,
      html: htmlFinal,
      nombreEmpresa: empresaName?.nombre || 'Mi Empresa' // 👈 nombre dinámico

    });

    console.log(`✅ Correo enviado correctamente a ${envio.email_cliente}`);
    return { id: envio.id };

  } catch (error) {
    console.error(`❌ Error al procesar el envío ${envio.id}:`, error);
    throw error;
  }
};
