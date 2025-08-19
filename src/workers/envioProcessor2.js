const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function envioProcessor(job) {
  const envio = job.data;
  const { empresaName, productos = [] } = envio;
  console.log("data envio",envio)
  try {
    const smtpConfig = envio.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ smtpConfig inválido o incompleto en el job');
    }

    if (!productos.length) {
      throw new Error('❌ No hay productos en el envío');
    }

    // ✅ Generar HTML para la sección de productos y sus seriales
    const productosHtml = productos.map(p => {
      const serialesHtml = p.seriales.map((s, index) => `
        <li>
          Serial ${index + 1}: <code>${s.codigo}</code>
        </li>
      `).join('');

      return `
        <li>
          <strong>${p.nombre_producto}</strong> (${p.seriales.length} licencia${p.seriales.length > 1 ? 's' : ''})
          <ul style="margin-top: 5px; margin-bottom: 15px;">
            ${serialesHtml}
          </ul>
        </li>
      `;
    }).join('');

    // ✅ Sección inicial del correo (resumen del pedido)
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

        <p>📄 A continuación, te dejamos las instrucciones específicas para cada producto:</p>
      </div>
    `;

    // ✅ Concatenar las instrucciones (plantillas) de cada producto
    const instruccionesHtml = productos.map((p) => {
      const cuerpo = p?.plantilla?.cuerpo_html?.trim();
      if (!cuerpo) return '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
          <h3 style="color: #007BFF;">📦 <strong>${p.nombre_producto}</strong></h3>
          ${cuerpo}
        </div>
      `;
    }).join('');

    const htmlFinal = datosPedidoHtml + instruccionesHtml;

    // ✅ Enviar correo con todas las instrucciones
    await sendEnvioCorreo({
      smtpConfig,
      to: envio.email_cliente,
      subject: `Tu pedido #${envio.numero_pedido} ha sido procesado`,
      text: `Hola ${envio.nombre_cliente}, tu pedido ha sido procesado. Revisa los pasos de activación en este correo.`,
      html: htmlFinal,
      nombreEmpresa: empresaName?.nombre || 'Mi Empresa'
    });

    console.log(`✅ Correo enviado correctamente a ${envio.email_cliente}`);
    return { id: envio.id };

  } catch (error) {
    console.error(`❌ Error al procesar el envío ${envio.id}:`, error);
    throw error;
  }
};
