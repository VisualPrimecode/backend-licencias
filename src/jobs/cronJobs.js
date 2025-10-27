// jobs/cronJobs.js
const cron = require("node-cron");
const axios = require("axios");

// Programar tarea diaria (a las 3 AM por ejemplo)
cron.schedule("00 08 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Ejecutando tarea programada...`);

  try {
    //ruta en local
    //const response = await axios.post("http://localhost:3000/api/alertaStock/stock");
    //ruta en producción
    const response = await axios.post("https://backend-licencias-node-mysql.onrender.com/api/alertaStock/stock");

    console.log("✅ Tarea completada:", response.status);
  } catch (err) {
    console.error("❌ Error al ejecutar tarea:", err.message);
  }
}, {
  timezone: "America/Santiago", // Ajusta según tu zona horaria
});

console.log("🕒 Cron job registrado correctamente.");
