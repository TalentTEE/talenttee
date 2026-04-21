module.exports = {
  apps: [
    {
      name: 'near-agent-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // .env is loaded by NestJS ConfigModule — PM2 just needs NODE_ENV and PORT.
      // All other env vars (DB, NEAR, JWT, etc.) come from backend/.env on the server.
      max_memory_restart: '512M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
