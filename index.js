// index.js

const app = require('./src/app');
require('./src/jobs/cronJobs');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
