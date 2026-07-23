/**
 * PM2 ecosystem — API + SQS worker as separate processes.
 *
 * Usage:
 *   npm run build
 *   pm2 start ecosystem.config.js
 *   pm2 logs
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "collarcheck-api",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "collarcheck-worker",
      script: "dist/worker/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
