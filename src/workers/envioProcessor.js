const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function envioProcessor(job) {
  const envio = job.data;
  const plantilla = envio.plantilla;
  const empresaName = envio.empresaName; // Nombre de la empresa
  const productoName = envio.productoName; // Nombre del producto

  console.log(`📨 Procesando job de envío: ${envio.id} para ${envio.email_cliente}`);
  console.log('Datos del envío:', envio);

  try {
    const smtpConfig = envio.smtpConfig;

    // Validación de configuración SMTP
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error(`❌ smtpConfig inválido o incompleto en el job`);
    }

    // Validación de plantilla
    const instruccionesHtml = plantilla?.cuerpo_html;
    if (!instruccionesHtml) {
      throw new Error(`❌ La plantilla no contiene un cuerpo_html válido`);
    }

    // Sección HTML con datos del pedido
    const datosPedidoHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4CAF50;">¡Tu pedido ha sido procesado! 🎉</h2>
        <p>Hola <strong>${envio.nombre_cliente}</strong>,</p>
        <p>Nos complace informarte que tu pedido <strong>#${envio.numero_pedido}</strong> ha sido procesado correctamente.</p>
        
        <h3>🔍 Detalles del Pedido:</h3>
        <ul style="line-height: 1.6;">
          <li><strong>Empresa:</strong> ${empresaName.nombre}</li>
          <li><strong>Producto: </strong> ${productoName.nombre}</li>
          <li><strong>Tienda:</strong> ${empresaName.dominio_web}</li>
          <li><strong>Código Serial:</strong> <code>${envio.codigo}</code></li>
        </ul>

        <p>📦 A continuación, te dejamos las instrucciones importantes:</p>
      </div>
    `;

    // Concatenar datos del pedido + instrucciones
    const htmlFinal = datosPedidoHtml + instruccionesHtml;

    await sendEnvioCorreo({
      smtpConfig,
      to: envio.email_cliente,
      subject: plantilla?.asunto || `Tu envío #${envio.numero_pedido} ha sido procesado`,
      text: `Hola ${envio.nombre_cliente}, tu pedido ha sido procesado. Consulta las instrucciones en el correo.`, // texto simple
      html: htmlFinal
    });

    console.log(`✅ Correo enviado correctamente a ${envio.email_cliente}`);
    return { id: envio.id };

  } catch (error) {
    console.error(`❌ Error al procesar el envío ${envio.id}:`, error);
    throw error;
  }
};
