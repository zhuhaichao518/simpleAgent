import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * 通过环境变量 BASE_PATH 控制部署子路径
 * - 默认 '/'（挂在根）
 * - 设为 '/simpleAgent' 时整个 app 与所有 fetch 都会走 /simpleAgent/* 前缀
 *
 * 同样的 BASE_PATH 也喂给后端 server/index.js，保持一致。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // 优先吃 process.env，方便 CI/部署脚本注入
  const raw = process.env.BASE_PATH ?? env.BASE_PATH ?? '';
  const base = raw ? (raw.endsWith('/') ? raw : raw + '/') : '/';

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // dev 模式下 vite 自动代理 /api → 3001
        // 注意：dev 默认还是根挂载（BASE_PATH 留空跑），所以 proxy 用 /api 即可
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
