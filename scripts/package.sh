#!/usr/bin/env bash
# 本地预编译并打包成可直接部署的 tarball
#
# 默认产物：dist-deploy/simple-agent-<时间戳>.tar.gz
# 不包含：源码 client/src、node_modules、.git、.env
# 包含：编译好的 client/dist + 后端源码 + 运行所需配置
#
# 用法：
#   ./scripts/package.sh           ← 轻量包（VPS 上还要 npm ci --omit=dev）
#   ./scripts/package.sh --bundled ← 重量包（连后端 node_modules 都打进去，零安装）

set -e
cd "$(dirname "$0")/.."
ROOT=$(pwd)

BUNDLED=false
if [[ "$1" == "--bundled" ]]; then
  BUNDLED=true
fi

TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$ROOT/dist-deploy"
STAGE_DIR="$OUT_DIR/stage-$TS"

if $BUNDLED; then
  TAR_NAME="simple-agent-bundled-$TS.tar.gz"
else
  TAR_NAME="simple-agent-$TS.tar.gz"
fi

mkdir -p "$STAGE_DIR"

echo "[1/4] 安装依赖（如果已存在会跳过）"
if [ ! -d "$ROOT/node_modules" ]; then
  npm install --silent
fi
if [ ! -d "$ROOT/client/node_modules" ]; then
  npm --prefix client install --silent
fi

echo "[2/4] 构建前端"
npm --prefix client run build --silent

echo "[3/4] 收集产物到 $STAGE_DIR"
cp -R "$ROOT/server" "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/client"
cp -R "$ROOT/client/dist" "$STAGE_DIR/client/dist"
cp "$ROOT/package.json" "$STAGE_DIR/"
[ -f "$ROOT/package-lock.json" ] && cp "$ROOT/package-lock.json" "$STAGE_DIR/"
cp "$ROOT/ecosystem.config.cjs" "$STAGE_DIR/"
cp -R "$ROOT/deploy" "$STAGE_DIR/"
cp "$ROOT/.env.example" "$STAGE_DIR/"
[ -f "$ROOT/README.md" ] && cp "$ROOT/README.md" "$STAGE_DIR/"
[ -f "$ROOT/DEPLOY.md" ] && cp "$ROOT/DEPLOY.md" "$STAGE_DIR/"

if $BUNDLED; then
  echo "    [bundled 模式] 复制后端 node_modules ..."
  # 仅复制运行时依赖。最稳妥：本地装一份纯生产依赖到临时目录再拷过来
  TMP_PROD="$OUT_DIR/_prod_modules-$TS"
  mkdir -p "$TMP_PROD"
  cp "$ROOT/package.json" "$TMP_PROD/"
  [ -f "$ROOT/package-lock.json" ] && cp "$ROOT/package-lock.json" "$TMP_PROD/"
  (cd "$TMP_PROD" && npm ci --omit=dev --silent --no-audit --no-fund 2>/dev/null \
    || npm install --omit=dev --silent --no-audit --no-fund)
  cp -R "$TMP_PROD/node_modules" "$STAGE_DIR/"
  rm -rf "$TMP_PROD"
fi

# 写一份给 VPS 看的 README
cat > "$STAGE_DIR/INSTALL.md" <<EOF
# VPS 部署（本地预编译版）

\`\`\`bash
# 1. 配置环境
cp .env.example .env
vim .env    # 填 OPENAI_API_KEY 等

EOF

if $BUNDLED; then
cat >> "$STAGE_DIR/INSTALL.md" <<EOF
# 2. （bundled 模式）依赖已自带，直接启动
mkdir -p logs
npm install -g pm2     # 仅首次
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
EOF
else
cat >> "$STAGE_DIR/INSTALL.md" <<EOF
# 2. 装运行时依赖（仅 ~30MB，不会 OOM）
npm ci --omit=dev || npm install --omit=dev

# 3. 启动
mkdir -p logs
npm install -g pm2     # 仅首次
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
EOF
fi

cat >> "$STAGE_DIR/INSTALL.md" <<EOF
\`\`\`

完成后 \`curl http://localhost:3001/api/health\` 应返回 \`{"ok":true}\`。

接 nginx 反代见 \`deploy/nginx.conf.example\`，关键：SSE 必须 \`proxy_buffering off\`。
EOF

echo "[4/4] 打包"
cd "$OUT_DIR"
mv "stage-$TS" "simple-agent"
tar -czf "$TAR_NAME" simple-agent
mv "simple-agent" "stage-$TS"   # 留个解开过的 staging 给你看

SIZE=$(du -h "$OUT_DIR/$TAR_NAME" | cut -f1)
echo ""
echo "✅ 完成"
echo "   产物: $OUT_DIR/$TAR_NAME  ($SIZE)"
echo "   解包预览: $STAGE_DIR/"
echo ""
echo "下一步："
echo "   scp $OUT_DIR/$TAR_NAME user@your-vps:~/"
echo "   ssh user@your-vps"
echo "   mkdir -p ~/simple-agent && cd ~/simple-agent"
echo "   tar -xzf ~/$TAR_NAME --strip-components=1"
echo "   cat INSTALL.md"
