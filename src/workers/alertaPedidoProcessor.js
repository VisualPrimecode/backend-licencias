const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function alertaFaltaSerialesProcessor(job) {
  const alerta = job.data;
  
  console.log("🚨 [alertaFaltaSerialesProcessor] Datos recibidos:", alerta);

  try {
    const {
      smtpConfig,
      numero_pedido,
      productos_faltantes, // [{nombre, cantidad_faltante, producto_id}]
      fecha_fallo,
      intentos,
      empresaName
    } = alerta;

    // Validar smtpConfig
    if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.pass) {
      throw new Error('❌ smtpConfig inválido');
    }

    // Construir HTML
    const htmlProductos = productos_faltantes.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${p.nombre_producto}</td>
        <td>${p.cantidad_faltante}</td>
        <td>${p.producto_id}</td>
      </tr>
    `).join('');

    const htmlFinal = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: auto; padding: 20px; border: 1px solid #e74c3c; border-radius: 10px;">
        <h2 style="color: #e74c3c;">🚨 Pedido Pendiente por Falta de Seriales</h2>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>📦 Pedido:</strong> #${numero_pedido}</p>
          <p><strong>⏰ Hora del fallo:</strong> ${new Date(fecha_fallo).toLocaleString('es-CL')}</p>
          <p><strong>🔄 Intentos:</strong> ${intentos}</p>
        </div>

        <h3>Productos sin seriales disponibles:</h3>
        <table style="width:100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #ddd;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #ddd;">#</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Producto</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Seriales Faltantes</th>
              <th style="padding: 10px; border: 1px solid #ddd;">ID Producto</th>
            </tr>
          </thead>
          <tbody>
            ${htmlProductos}
          </tbody>
        </table>

        <p style="margin-top: 20px; color: #856404;">
          ⚠️ Este pedido será reintentado automáticamente cada 5 minutos hasta que haya stock disponible.
        </p>
      </div>
    `;

    // Enviar correo
    await sendEnvioCorreo({
      smtpConfig,
      to: alerta.email_destinatario || 'alertas@miempresa.com',
      subject: `🚨 Pedido #${numero_pedido} pendiente - Falta de seriales`,
      text: `El pedido ${numero_pedido} no pudo procesarse por falta de seriales.`,
      html: htmlFinal,
      nombreEmpresa: empresaName || 'Sistema de Pedidos'
    });

    console.log(`✅ Alerta enviada para pedido ${numero_pedido}`);
    return { success: true, pedido: numero_pedido };

  } catch (error) {
    console.error('❌ Error en alertaFaltaSerialesProcessor:', error);
    throw error;
  }
};