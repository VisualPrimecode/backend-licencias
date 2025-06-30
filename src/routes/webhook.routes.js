// routes/webhook.routes.js
const express = require('express');
const router = express.Router();
//webhook en general debe evolucionar para tener un crud ya que habran que gestionar varios webhooks para muchas emrpesas
router.post('/pedido-completado', async (req, res) => {
  console.log('🔔 Webhook recibido: Order updated');

  try {
    const data = req.body;

    // Validar estado del pedido
    if (data.status !== 'completed') {
      console.log(`⚠️ Pedido ignorado: estado = ${data.status}`);
      return res.status(200).json({ mensaje: `Pedido ignorado, estado: ${data.status}` });
    }

    // Valores estáticos
    const empresa_id = 7;
    const usuario_id = 1;
    const serial_id = 30;

    // Extracción de campos
    const producto = data.line_items?.[0] || {};
    const billing = data.billing || {};

    const producto_id = producto.product_id || null;
    const nombre_cliente = `${billing.first_name || ''} ${billing.last_name || ''}`.trim();
    const email_cliente = billing.email || null;
    const numero_pedido = data.number || data.id || null;
    const fecha_envio = data.date_paid || new Date().toISOString();

    //mostrar datos crudos
    console.log("webhook completo",data);
    // Mostrar los datos listos para uso
    console.log('✅ Datos listos para createEnvio:');
    console.log({
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado: 'pendiente',
      fecha_envio
    });

    res.status(200).json({ mensaje: 'Webhook válido, datos extraídos correctamente ✅' });
  } catch (error) {
    console.error('❌ Error al procesar webhook:', error);
    res.status(500).json({ mensaje: 'Error interno al procesar el webhook' });
  }
});


router.get('/pedido-completado', (req, res) => {
  res.status(200).send('Webhook activo');
});

module.exports = router;
