module.exports = {
  apps: [
    {
      name: 'BassTuner',
      port: '3001',
      exec_mode: 'cluster',
      instances: 1,
      script: './.output/server/index.mjs',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
