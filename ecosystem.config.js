module.exports = {
  apps: [
    {
      name: 'command-center',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/ubuntu/.command-center',
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3200,
      },
    },
  ],
}
