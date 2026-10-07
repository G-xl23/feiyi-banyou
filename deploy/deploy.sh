#!/usr/bin/env bash
#
# 非遗伴游 HeritageTravel Agents —— 公网部署一键脚本（Ubuntu 22.04 / 24.04）
#
# 在【项目根目录】执行（脚本会把当前目录部署到 /opt/feiyi-banyou）：
#   sudo bash deploy/deploy.sh                # 默认：PM2 常驻（推荐，日志友好）
#   sudo bash deploy/deploy.sh --systemd      # 备选：systemd 服务（更规范、可加固）
#   sudo bash deploy/deploy.sh --docker       # 备选：Docker Compose（环境最一致）
#   sudo PORT=8080 bash deploy/deploy.sh      # 自定义对外端口（默认 3000）
#
# 流程：基础工具与 Node 20 → 同步代码到 /opt/feiyi-banyou → 安装生产依赖
#      → 生成 server/.env（已存在则不动）→ 放行 ufw 端口 → 启动服务 → 自检并打印访问地址
#
# 注意：阿里云轻量应用服务器还需在【控制台 → 实例详情 → 防火墙】放行 TCP 端口，
#       这一步脚本无法代劳，漏做会导致公网打不开。
#
set -euo pipefail

APP_NAME="feiyi-banyou"
APP_USER="heritage"
APP_DIR="/opt/feiyi-banyou"
PORT="${PORT:-3000}"
MODE="pm2"

for arg in "$@"; do
  case "$arg" in
    --pm2)     MODE="pm2" ;;
    --systemd) MODE="systemd" ;;
    --docker)  MODE="docker" ;;
    -h|--help) sed -n '3,16p' "$0"; exit 0 ;;
    *) echo "未知参数：$arg（可用：--pm2 / --systemd / --docker）"; exit 1 ;;
  esac
done

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
step() { echo; echo -e "\033[1;36m==> $*\033[0m"; }

[[ $EUID -eq 0 ]] || { echo "请用 root 执行：sudo bash deploy/deploy.sh"; exit 1; }
[[ -f "$SRC_DIR/server/package.json" ]] || { echo "未找到 server/package.json，请在项目根目录执行本脚本"; exit 1; }

# ---------- 1. 基础工具与 Node.js ----------
step "1/6 检查基础工具与 Node.js（要求 >= 18）"
apt-get update -y >/dev/null 2>&1 || true
apt-get install -y --no-install-recommends curl ca-certificates rsync >/dev/null 2>&1 || true

NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  CUR="$(node -v)"; MAJOR="${CUR#v}"; MAJOR="${MAJOR%%.*}"
  if [[ "$MAJOR" -ge 18 ]]; then echo "已安装 Node $CUR，跳过安装"; NEED_NODE=0; fi
fi
if [[ $NEED_NODE -eq 1 ]]; then
  echo "正在安装 Node.js 20（NodeSource 源）…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "已安装 Node $(node -v)"
fi
if ! command -v rsync >/dev/null 2>&1; then
  echo "缺少 rsync，无法同步代码；请执行 apt-get install -y rsync 后重试"; exit 1
fi

# ---------- 2. 运行用户与目录 ----------
step "2/6 准备运行目录 $APP_DIR"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home "$APP_DIR" "$APP_USER"
mkdir -p "$APP_DIR"

# ---------- 3. 同步代码 ----------
step "3/6 同步代码（保留服务器上已有的 server/.env 与 logs/，不会覆盖你的密钥）"
rsync -a --delete \
  --exclude 'node_modules' --exclude '.git' --exclude 'logs' \
  --exclude 'server/.env' --exclude 'tmp-*' --exclude '*.log' \
  "$SRC_DIR"/ "$APP_DIR"/

# ---------- 4. 生产依赖 ----------
step "4/6 安装生产依赖"
cd "$APP_DIR/server"
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev --no-audit --no-fund
else
  npm install --omit=dev --no-audit --no-fund
fi

# ---------- 5. 环境变量 ----------
step "5/6 准备 server/.env"
if [[ -f "$APP_DIR/server/.env" ]]; then
  echo "server/.env 已存在，保持不动（不会覆盖你的密钥）"
else
  # 注意：这里刻意"不直接复制 .env.example"。
  # 因为 .env.example 里 LLM_BASE_URL / LLM_MODEL 有默认值而 LLM_API_KEY 为空，
  # 应用会判定为"大模型半配置"并拒绝启动。所以只写入最小必要配置（纯离线模板模式）。
  cat > "$APP_DIR/server/.env" <<ENVEOF
# —— 由 deploy/deploy.sh 生成的最小配置：离线模板模式，全部功能可演示 ——
# 要启用大模型（智能对话由大模型接管），把下面几行取消注释并填写后重启服务：
# LLM_BASE_URL=https://你的网关地址/v1
# LLM_API_KEY=你的密钥
# LLM_MODEL=模型名
# LLM_TIMEOUT_MS=60000
PORT=${PORT}
NODE_ENV=production
ENVEOF
  echo "已生成最小可用的 server/.env（离线模板模式）"
fi
echo '提示：若启动日志出现"LLM 配置不完整"，说明 .env 处于半配置状态（填了地址/模型但没填密钥），补全密钥或注释掉即可。'

# ---------- 6. 防火墙 ----------
step "6/6 放行系统防火墙端口 $PORT"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${PORT}/tcp" >/dev/null && echo "已放行 ufw ${PORT}/tcp"
else
  echo "ufw 未启用，跳过（Ubuntu 默认关闭，一般无需处理）"
fi
echo -e "\033[1;33m提醒：仍需在阿里云控制台「实例详情 → 防火墙」添加规则：TCP ${PORT}\033[0m"

# ---------- 启动 ----------
case "$MODE" in
  pm2)
    step "启动服务（PM2）"
    command -v pm2 >/dev/null 2>&1 || npm install -g pm2 --no-audit --no-fund
    cd "$APP_DIR"
    mkdir -p logs
    pm2 start ecosystem.config.js --update-env
    pm2 save
    pm2 startup systemd -u "$(id -un)" --hp "$HOME" >/dev/null 2>&1 || true
    pm2 save >/dev/null 2>&1 || true
    ;;
  systemd)
    step "启动服务（systemd）"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    NODE_BIN="$(command -v node)"
    sed "s#^ExecStart=.*#ExecStart=${NODE_BIN} server/src/server.js#" \
      "$APP_DIR/deploy/heritage-travel.service" > "/etc/systemd/system/${APP_NAME}.service"
    systemctl daemon-reload
    systemctl enable --now "$APP_NAME"
    ;;
  docker)
    step "启动服务（Docker Compose）"
    if ! command -v docker >/dev/null 2>&1; then
      echo "未检测到 Docker。二选一："
      echo "  · 在阿里云控制台把实例的应用镜像换成带 Docker 的，或"
      echo "  · 执行：curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun"
      echo "装好后重新执行：sudo bash deploy/deploy.sh --docker"
      exit 1
    fi
    cd "$APP_DIR"
    if docker compose version >/dev/null 2>&1; then
      docker compose up -d --build
    elif command -v docker-compose >/dev/null 2>&1; then
      docker-compose up -d --build
    else
      echo "未找到 docker compose 插件，请安装 docker-compose-plugin 后重试"; exit 1
    fi
    ;;
esac

# ---------- 自检 ----------
step "等待服务就绪并自检"
sleep 3
PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
[[ -n "$PUBLIC_IP" ]] || PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if curl -fsS --max-time 5 "http://127.0.0.1:${PORT}/api/ready" >/dev/null 2>&1; then
  echo -e "\033[1;32m本机自检通过：服务已在 127.0.0.1:${PORT} 正常响应\033[0m"
else
  echo -e "\033[1;31m本机自检失败，请先看日志排查\033[0m"
fi

cat <<EOF

============================================================
 部署完成（方式：${MODE}）
============================================================
 访问地址（前提：阿里云防火墙已放行 TCP ${PORT}）：
   http://${PUBLIC_IP}:${PORT}
 状态接口（可看大模型模式与数据规模）：
   http://${PUBLIC_IP}:${PORT}/api/ready

 常用命令：
$( [[ "$MODE" == "pm2" ]] && echo "   pm2 logs ${APP_NAME}            # 实时日志
   pm2 restart ${APP_NAME}         # 改完 server/.env 后重启
   pm2 status                      # 运行状态" )
$( [[ "$MODE" == "systemd" ]] && echo "   journalctl -u ${APP_NAME} -f     # 实时日志
   systemctl restart ${APP_NAME}   # 改完 server/.env 后重启
   systemctl status ${APP_NAME}    # 运行状态" )
$( [[ "$MODE" == "docker" ]] && echo "   docker compose logs -f          # 实时日志
   docker compose restart          # 改完 server/.env 后重启
   docker compose ps               # 运行状态" )

 后续接入公网大模型（可选）：
   sudo nano ${APP_DIR}/server/.env    # 填 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
   然后重启服务即可；启动日志会打印连通性自检结果。
   ⚠ 校园网关 myai.bupt.edu.cn 解析到内网地址 10.3.19.2，公网不可达，请改用公网 API。
============================================================
EOF
