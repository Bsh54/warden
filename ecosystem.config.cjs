module.exports = {
  apps: [
    {
      name: 'warden',
      script: 'src/server.js',
      env: { PORT: 3000 },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
