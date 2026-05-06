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
for arg in "$@"; do
  if [[ "$arg" == "--bundled" ]]; then
    BUNDLED=true
  fi
done

# BASE_PATH 让整个应用挂在某个子路径下，建议用全小写（如 /simpleagent）
# 用法：BASE_PATH=/simpleagent npm run package:bundled
# 注意：nginx location 大小写敏感，BASE_PATH 与 nginx 配置必须完全一致
BASE_PATH_RAW="${BASE_PATH:-}"
BASE_PATH_NORM="${BASE_PATH_RAW%/}"   # 去掉末尾斜杠

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

echo "[2/4] 构建前端  base=${BASE_PATH_NORM:-/}"
BASE_PATH="$BASE_PATH_NORM" npm --prefix client run build --silent

echo "[3/4] 收集产物到 $STAGE_DIR"
cp -R "$ROOT/server" "$STAGE_DIR/"
mkdir -p "$STAGE_DIR/client"
cp -R "$ROOT/client/dist" "$STAGE_DIR/client/dist"
cp "$ROOT/package.json" "$STAGE_DIR/"
[ -f "$ROOT/package-lock.json" ] && cp "$ROOT/package-lock.json" "$STAGE_DIR/"
cp "$ROOT/ecosystem.config.cjs" "$STAGE_DIR/"

# 如果指定了 BASE_PATH，把它写进 ecosystem.config.cjs 的 env 段
if [ -n "$BASE_PATH_NORM" ]; then
  ECO_PATH="$STAGE_DIR/ecosystem.config.cjs" \
  ECO_BASE_PATH="$BASE_PATH_NORM" \
  node <<'NODESCRIPT'
const fs = require('fs');
const p = process.env.ECO_PATH;
const base = process.env.ECO_BASE_PATH;
let s = fs.readFileSync(p, 'utf8');
const re = /(PORT:\s*\d+,)/;
if (re.test(s)) {
  s = s.replace(re, `$1\n        BASE_PATH: ${JSON.stringify(base)},`);
  fs.writeFileSync(p, s);
  console.log(`    [ecosystem] 已注入 BASE_PATH=${base}`);
} else {
  console.warn('    [ecosystem] 警告：未找到 PORT 段，BASE_PATH 未注入，请手动加');
}
NODESCRIPT
fi
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

挂载路径：\`${BASE_PATH_NORM:-/}\`
（启动时务必把同样的 BASE_PATH 传给 server，前后端必须保持一致）

\`\`\`bash
# 1. 配置环境
cp .env.example .env
vim .env    # 填 OPENAI_API_KEY 等
EOF

if [ -n "$BASE_PATH_NORM" ]; then
cat >> "$STAGE_DIR/INSTALL.md" <<EOF

# 注意：本包构建时已固定 BASE_PATH=${BASE_PATH_NORM}
# 启动时也必须用同样的值（已写入 ecosystem.config.cjs）
EOF
fi

if $BUNDLED; then
cat >> "$STAGE_DIR/INSTALL.md" <<'EOF'

# 2. （bundled 模式）依赖已自带，直接启动
mkdir -p logs
npm install -g pm2     # 仅首次
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
EOF
else
cat >> "$STAGE_DIR/INSTALL.md" <<'EOF'

# 2. 装运行时依赖（仅 ~30MB，不会 OOM）
npm ci --omit=dev || npm install --omit=dev

# 3. 启动
mkdir -p logs
npm install -g pm2     # 仅首次
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
EOF
fi

if [ -n "$BASE_PATH_NORM" ]; then
HEALTH_URL="http://localhost:3001${BASE_PATH_NORM}/api/health"
else
HEALTH_URL="http://localhost:3001/api/health"
fi

cat >> "$STAGE_DIR/INSTALL.md" <<EOF
\`\`\`

完成后 \`curl ${HEALTH_URL}\` 应返回 \`{"ok":true}\`。

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
