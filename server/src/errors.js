'use strict';
/**
 * 类型化错误体系：业务错误只携带规范化信息，不向客户端泄露堆栈。
 */
class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const errors = {
  badRequest: (msg) => new AppError(400, 'BAD_REQUEST', msg),
  notFound: (msg) => new AppError(404, 'NOT_FOUND', msg),
  internal: (msg) => new AppError(500, 'INTERNAL', msg || '服务器内部错误')
};

// 404 处理
function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', message: '接口不存在: ' + req.method + ' ' + req.path });
}

// 全局错误处理中间件
function errorHandler(err, req, res, _next) {
  // 识别两类业务错误：AppError 实例，以及任何带 statusCode 的错误对象
  const isApp = err instanceof AppError || (err && typeof err.statusCode === 'number');
  const status = isApp ? err.statusCode : 500;
  const code = isApp ? (err.code || 'BAD_REQUEST') : 'INTERNAL';
  req.log && req.log(status >= 500 ? 'error' : 'warn', '请求处理失败', { code, detail: String(err && err.message) });
  res.status(status).json({
    ok: false,
    code,
    message: isApp ? err.message : '服务器内部错误，请稍后重试'
  });
}

// 请求 ID + 访问日志
function requestLogger(req, res, next) {
  req.requestId = Math.random().toString(36).slice(2, 10);
  req.log = (level, msg, extra) => require('./logger')[level](msg, Object.assign({ requestId: req.requestId }, extra));
  res.on('finish', () => req.log('info', 'HTTP', { method: req.method, path: req.originalUrl, status: res.statusCode }));
  next();
}

module.exports = { AppError, errors, notFoundHandler, errorHandler, requestLogger };
