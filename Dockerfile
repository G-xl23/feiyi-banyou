# 非遗伴游 HeritageTravel Agents —— 生产镜像
#
# 单端口应用：Node 后端同时托管 public/ 前端静态资源，容器只需暴露 3000。
# 构建：docker build -t feiyi-banyou:1.0.0 .
# 运行：docker run -d --name feiyi-banyou -p 3000:3000 \
#         --env-file server/.env feiyi-banyou:1.0.0
#
# 说明：镜像内不包含 server/.env（密钥不进镜像），配置一律运行期注入。

FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# 1) 先只复制依赖清单并安装，充分利用 Docker 层缓存（改代码不会重装依赖）
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund

# 2) 再复制源码与前端
COPY server/ ./server/
COPY public/ ./public/

# 3) 以非 root 运行（node 镜像自带 node 用户）
USER node

EXPOSE 3000

# 容器自带健康检查（Node 18+ 内置 fetch），docker ps 可直接看到 healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/src/server.js"]
