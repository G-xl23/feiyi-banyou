'use strict';
/**
 * 结构化 JSON 日志，携带可选请求 ID。不记录任何隐私数据。
 */
const config = require('./config');

function emit(level, msg, extra) {
  const line = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(extra || {})
  };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(line, null, 0));
}

module.exports = {
  info: (msg, extra) => emit('info', msg, extra),
  warn: (msg, extra) => emit('warn', msg, extra),
  error: (msg, extra) => emit('error', msg, extra)
};
