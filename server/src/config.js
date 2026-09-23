'use strict';
/**
 * 集中配置：全部来自环境变量，启动时校验，快速失败。
 * 零依赖加载 server/.env（若存在）：已存在的进程环境变量优先级更高，不会被覆盖。
 */
const fs = require('fs');
const path = require('path');

(function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  let text = '';
  try {
    text = fs.readFileSync(envPath, 'utf8');
  } catch (_) {
    return; // 读取失败视为未配置，走离线模板模式
  }
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq <= 0) return;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const quoted = val.length >= 2 && ((val[0] === '"' && val.endsWith('"')) || (val[0] === "'" && val.endsWith("'")));
    if (quoted) val = val.slice(1, -1);
    if (process.env[key] === undefined || process.env[key] === '') process.env[key] = val;
  });
})();

function readEnv(key, def) {
  const v = process.env[key];
  return v === undefined || v === '' ? def : v;
}

const config = {
  port: Number(readEnv('PORT', '3000')),
  env: readEnv('NODE_ENV', 'development'),
  llm: {
    baseUrl: readEnv('LLM_BASE_URL', ''),
    apiKey: readEnv('LLM_API_KEY', ''),
    model: readEnv('LLM_MODEL', ''),
    timeoutMs: Number(readEnv('LLM_TIMEOUT_MS', '30000'))
  }
};

// 校验：LLM 三项要么都配要么都不配，避免半配置状态
const llmFields = [config.llm.baseUrl, config.llm.apiKey, config.llm.model];
const llmConfigured = llmFields.every(Boolean);
const llmPartial = llmFields.some(Boolean);
if (llmPartial && !llmConfigured) {
  throw new Error('[启动失败] LLM 配置不完整：LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 必须同时提供，或全部留空（离线模板模式）');
}
config.llm.enabled = llmConfigured;

module.exports = config;
