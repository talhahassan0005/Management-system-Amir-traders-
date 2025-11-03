module.exports = {
  apps: [
    {
      name: 'amir-traders',
      cwd: process.env.PWD || process.cwd(),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
