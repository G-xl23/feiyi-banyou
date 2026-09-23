'use strict';
/**
 * 服务器入口：静态托管前端 + API 路由 + 健康检查 + 优雅停机。
 */
const http = require('http');
const express = require('express');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { requestLogger, errorHandler, notFoundHandler } = require('./errors');
const routes = require('./routes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

// 安全头（轻量自实现，避免引入额外依赖）
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// 健康检查（供部署平台探活）
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/readyz', (_req, res) => res.json({ ok: true, ready: true }));

// API
app.use('/api', routes);

// 前端静态资源
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// 404 与全局错误
app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
server.listen(config.port, () => {
  logger.info('非遗伴游服务已启动', {
    port: config.port,
    llmMode: config.llm.enabled ? 'remote-llm(' + config.llm.model + ')' : 'offline-template'
  });
});

// 优雅停机
function shutdown(signal) {
  logger.info('收到 ' + signal + '，开始优雅停机');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
