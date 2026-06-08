module.exports = {
  apps: [
    {
      name: 'amkcircle-api',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',   // SQLite doesn't support multi-process writes
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_PATH: '/data/amkcircle.db',
        JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        DB_PATH: './amkcircle-dev.db',
      },

      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/amkcircle-error.log',
      out_file:   './logs/amkcircle-out.log',
      merge_logs: true,

      // Graceful shutdown — let in-flight requests complete
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
}
