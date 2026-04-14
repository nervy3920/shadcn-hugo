const app = require('./app');
const config = require('./config');
const { testConnection, ensureSchema } = require('./db');

async function bootstrap() {
  try {
    await testConnection();
    console.log('[boot] MySQL connection ready');
    await ensureSchema();
    console.log('[boot] Database schema ready');

    app.listen(config.port, () => {
      console.log(`[boot] shortlink-server running at http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('[boot] failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();
