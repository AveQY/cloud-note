module.exports = {
  apps: [{
    name: 'cloud-note-api',
    script: './server.js',
    interpreter: '/home/ubuntu/.nvm/versions/node/v22.22.2/bin/node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: 3001 }
  }]
};
