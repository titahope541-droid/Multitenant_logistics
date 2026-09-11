/**
 * PM2 ecosystem — the production process for the Meridian platform.
 *
 * ONE process is deliberate, not a shortcut:
 *   · Socket.IO rooms live in this process's memory
 *   · the in-process rate limiter counts per process
 *   · sessions live in MongoDB, so horizontal scaling later needs only
 *     a shared rate-limit store + a Socket.IO adapter (documented as
 *     deferred in docs/realtime.md) — until then: ONE instance, always.
 *
 * Usage (docs/deployment.md §pm2):
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup        # survive VPS reboots
 *   pm2 logs meridian / pm2 restart meridian / pm2 stop meridian
 */
module.exports = {
  apps: [
    {
      name: "meridian",
      script: "./node_modules/.bin/tsx",
      args: "server.ts",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      restart_delay: 1500,
      exp_backoff_restart_delay: 250,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "./logs/meridian-error.log",
      out_file: "./logs/meridian-out.log",
      time: false, // pino already timestamps; keep logs single-sourced
      kill_timeout: 6_000, // room for the graceful shutdown sequence
      listen_timeout: 15_000,
    },
  ],
};
