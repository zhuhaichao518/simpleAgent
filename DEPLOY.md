# 部署指南

> ⚠️ 这个项目不是纯静态站，**必须有 Node.js 后端**：OpenRouter key 不能暴露给浏览器，
> 且 `/api/chat` 用了 SSE 流式响应。所以 GitHub Pages / Netlify 静态托管都不行。

## 一、推荐方案速选


| 方案                                | 难度  | 适合                   | 费用     |
| --------------------------------- | --- | -------------------- | ------ |
| **本地预编译 + scp 到 VPS**（⭐ 弱 VPS 首选） | ⭐   | VPS 内存 ≤1G、跑不动 build | VPS 月费 |
| **VPS 直接 git clone + build**      | ⭐⭐  | VPS 内存 ≥2G           | VPS 月费 |
| **Docker / Docker Compose**       | ⭐⭐  | 自己服务器但不想装 Node       | 同上     |
| **Railway / Render / Fly.io**     | ⭐   | 最快上线                 | 有免费额度  |
| **Vercel**                        | ⭐⭐⭐ | 已有 vercel 账号         | 免费     |


---

## 子路径部署（重要）

如果你的主域名根路径或 `/api` 已经被别的服务占了，想把整个应用挂在 `/simpleagent` 这种子路径下，**前端构建 + 后端启动 + nginx 反代** 三处 BASE_PATH 必须一致。

> ⚠️ **强烈建议子路径用全小写**（如 `/simpleagent`），不要用驼峰（如 `/simpleAgent`）：
> - URL 路径全小写是 web 通用最佳实践，对 SEO / 缓存 / 用户书签更友好
> - 浏览器、CDN、某些反代会把路径转小写后再匹配，驼峰路径在多层架构下可能命中错误的 location 块导致 SSE 失效等隐蔽问题
> - nginx 的 `location` 大小写敏感，驼峰一旦写错一处就会绕过精确匹配

```bash
# 本地打包：把子路径告诉构建脚本
BASE_PATH=/simpleagent npm run package:bundled
```

打出来的 tarball 会：
- 前端 asset 路径自动是 `/simpleagent/assets/...`
- `ecosystem.config.cjs` 自动注入 `BASE_PATH=/simpleagent`，VPS 上启动时后端跟着挂到子路径

VPS 上解压、配 .env、`pm2 start` 流程不变。

Nginx 配置参考 `deploy/nginx.conf.example` 文件末尾「场景 B」那几段 location，把它们贴进你已有的 server 块里即可（不需要拷整个 server 块）。访问 `https://your-domain.com/simpleagent/` 就能用，主域名根路径和 `/api` 都不会被影响。

> 验证：`curl https://your-domain.com/simpleagent/api/health` 应返回 `{"ok":true,"basePath":"/simpleagent"}`。
> 如果返回 404，多半是 nginx 没把前缀转过去，或后端启动时 BASE_PATH 漏了。
> 如果返回主站 SPA 首页，说明请求被主站 fallback 兜底吞掉了 —— 检查 nginx location 大小写是否一致。

---

## 国内 VPS 出海代理（避免 OpenRouter 403）

国内 VPS 直连 OpenAI / Anthropic / OpenRouter 经常被服务方按 IP 拒绝：

```
[LLM 调用失败] 403 This model is not available in your region.
```

如果你 VPS 上已有出海 HTTP 代理（如本地 Clash 在 `127.0.0.1:7897`），在 VPS 上的 `.env` 里加一行即可，**不需要改任何代码**：

```bash
LLM_PROXY=http://127.0.0.1:7897
```

启动时进程会打印 `[llm] 出口走代理: ...`，之后所有 LLM/RAG 等出向 fetch 都会走这个代理。

支持的环境变量优先级（任选其一）：
`LLM_PROXY` > `HTTPS_PROXY` > `HTTP_PROXY` > `ALL_PROXY`（大小写都吃）。

> 验证代理本身能通：
> `curl -x http://127.0.0.1:7897 https://ipinfo.io/ip` 应返回美/日/新加坡等海外 IP。
> 如果 OpenRouter 仍 403，多半是代理出口 IP 也在黑名单（换节点）或 key 本身没有对应模型权限。

改完 `.env` 后只要 `pm2 restart simple-agent` 就生效；不需要重新打包上传。

---

## 二、本地预编译 + 上传 VPS（弱 VPS 首选 ⭐）

适合：你的 VPS 配置很弱（1G 内存以下），跑 `npm run build` 会 OOM；或你不想在生产机上装一堆开发依赖。

### 1. 本地一键打包

```bash
npm run install:all          # 仅首次

# 选一种打包方式：
npm run package              # 轻量包 ~100KB（VPS 上还要 npm ci 装运行时依赖 ~30MB）
npm run package:bundled      # 重量包 ~2.5MB（已含 node_modules，VPS 零安装直接跑）
```

产物在 `dist-deploy/simple-agent-*.tar.gz`。

> ⚠️ 强烈建议用 `package:bundled`：本仓库后端依赖全是纯 JS（无 native binding），
> macOS / Linux / Windows 都能直接跨平台用，VPS 上完全不用 `npm install`。

### 2. 传到 VPS

```bash
scp dist-deploy/simple-agent-bundled-*.tar.gz user@vps:~/
ssh user@vps

mkdir -p ~/simple-agent && cd ~/simple-agent
tar -xzf ~/simple-agent-bundled-*.tar.gz --strip-components=1
cat INSTALL.md                  # 解压后会带一个简短的 VPS 步骤说明
```

### 3. VPS 上启动（弱机也跑得动）

```bash
cp .env.example .env
vim .env                        # 填 OPENAI_API_KEY 等

mkdir -p logs
sudo npm install -g pm2          # 仅首次
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

完事。`curl http://localhost:3001/api/health` 应返回 `{"ok":true}`。Nginx 反代见 §三 第 4 步。

### 4. 后续更新

每次本地改完代码：

```bash
# 本地
npm run package:bundled

# 上传 + 替换（保留 .env / logs）
scp dist-deploy/simple-agent-bundled-*.tar.gz user@vps:~/
ssh user@vps "cd ~/simple-agent \
  && cp .env /tmp/.env.bak \
  && tar -xzf ~/simple-agent-bundled-*.tar.gz --strip-components=1 \
  && cp /tmp/.env.bak .env \
  && pm2 restart simple-agent"
```

---

## 三、VPS 部署（直接 git clone + 现场 build，需要 ≥2G 内存）

适合：你有一台云主机（阿里云/腾讯云/AWS/Vultr...）+ 一个域名。

### 1. 服务器准备

```bash
# 装 Node 20（用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 20

# 装 pm2 全局
npm install -g pm2

# 装 nginx（如果没装）
sudo apt update && sudo apt install -y nginx
```

### 2. 拉代码 + 构建

```bash
cd ~
git clone https://github.com/zhuhaichao518/simpleAgent.git
cd simpleAgent

npm run install:all   # 装前后端依赖
npm run build         # 构建前端到 client/dist

# 配置 .env
cp .env.example .env
vim .env              # 填上 OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL
```

### 3. 用 PM2 启动

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup     # 跟着系统重启自启（按提示再执行一行 sudo 命令）
pm2 logs simple-agent     # 看日志
```

此时本机 `curl http://localhost:3001/api/health` 应该返回 `{"ok":true}`。

### 4. Nginx 反代 + HTTPS

把 `deploy/nginx.conf.example` 复制成站点配置，改掉域名，软链接进来：

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/simple-agent
sudo sed -i 's/your-domain.com/agent.your-real-domain.com/g' /etc/nginx/sites-available/simple-agent
sudo ln -s /etc/nginx/sites-available/simple-agent /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

申请 Let's Encrypt 证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d agent.your-real-domain.com
```

certbot 会自动改 nginx 配置加上证书路径并打开 443。完事。

> **SSE 的关键**：nginx 那段 `proxy_buffering off` 和 `proxy_read_timeout 300s` 不能漏，
> 否则 chat 接口会"卡到天荒地老才一次性吐字"——已经替你写在 `nginx.conf.example` 里。

> **必须 HTTPS**：`LG.tts`（朗读）、`navigator.vibrate` 这些 API 在浏览器侧 http 下被限制。

### 5. 更新版本

```bash
cd ~/simpleAgent
git pull
npm run install:all
npm run build
pm2 restart simple-agent
```

---

## 四、Docker 部署（更干净）

```bash
# 构建镜像
docker build -t simple-agent .

# 跑起来（注意把 .env 挂进去）
docker run -d \
  --name simple-agent \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  simple-agent
```

或用 `docker-compose.yml`（如果想加上 nginx + certbot）：

```yaml
version: '3.8'
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    expose:
      - "3001"
    networks:
      - web
networks:
  web:
    external: true   # 让 nginx 容器也能连进来
```

然后 nginx 反代到 `http://app:3001` 即可（SSE 配置同前）。

---

## 五、Railway / Render（最省事）

这俩都识别 `package.json`，0 配置：

### Railway

1. 浏览器上 [https://railway.app/new](https://railway.app/new) → 导入 GitHub 仓库
2. Variables 标签：加 `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`
3. Settings → Networking → Generate Domain，得到一个 `*.up.railway.app` 子域
4. 完事，访问就能用

构建命令默认会跑 `npm install`，但要构建前端，需要在 Settings → Build 里把构建命令改成：

```
npm run install:all && npm run build
```

启动命令保持 `npm start`。

### Render

类似 Railway。Web Service → 选 Node → 把构建命令设成上面那条 → 启动命令 `npm start`。免费 tier 闲置 15 分钟会冷启动，演示场景可以接受。

---

## 六、Vercel（如果你已经在用）

Vercel 默认是 Serverless 模型，原版 Express 跑不舒服，但可以这么干：

1. 改一下：把 `server/index.js` 包一层导出 `export default app;`
2. 加 `vercel.json` 把所有路由打到这个函数

Vercel 已经支持 SSE，`response_format: stream` 没问题。

但说实话，对这个项目，Vercel 不如 Railway 直接。如果你 Vercel 有 Pro 以上才考虑。

---

## 七、踩坑清单


| 现象                       | 原因                 | 解决                                              |
| ------------------------ | ------------------ | ----------------------------------------------- |
| 对话不出字，30 秒后才一口气出来        | Nginx 缓冲了 SSE      | 加 `proxy_buffering off`                         |
| LG.tts 不响、LG.vibrate 没反应 | http 下被浏览器限制       | 上 HTTPS                                         |
| 502 Bad Gateway          | server 没跑/端口不对     | `pm2 status` / `curl localhost:3001/api/health` |
| 502 但偶尔能通                | LLM 调用超时被 nginx 切断 | 把 `proxy_read_timeout` 调到 300s                  |
| GitHub Actions 想自动部署     | /                  | 看下面 §七                                          |
| 接入私域用户太多想限速              | /                  | 在 `server/index.js` 加 `express-rate-limit`      |


---

## 八、可选：GitHub Actions 自动部署

主仓库 `.github/workflows/deploy.yml`（自己加）：

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: SSH and pull
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd ~/simpleAgent
            git pull
            npm run install:all
            npm run build
            pm2 restart simple-agent
```

然后 `git push` 就自动部署。

---

## 九、安全 / 成本建议

- **OpenRouter key 限额**：在 OpenRouter 后台给这个 key 设个月度上限（10-50 美刀），万一被刷不至于破产
- **加 rate limit**：装 `express-rate-limit`，对 `/api/chat` 和 `/api/sandbox/llm` 限速，比如 IP 30 次/分钟
- **不要把 `.env` push 到仓库**：已经在 `.gitignore`，但部署时也别 cp 错
- **浏览器侧依然要登录鉴权？** 可以在 server 加最简单的 Cookie / Bearer token 校验；现在是公开的，不适合放在公网长期裸奔

