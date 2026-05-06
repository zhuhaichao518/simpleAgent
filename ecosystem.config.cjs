/**
 * PM2 配置
 * 用法：
 *   pm2 start ecosystem.config.cjs
 *   pm2 save              # 保存当前进程列表
 *   pm2 startup           # 让 pm2 跟随系统启动
 *   pm2 logs simple-agent # 看日志
 */
module.exports = {
  apps: [
    {
      name: 'simple-agent',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
