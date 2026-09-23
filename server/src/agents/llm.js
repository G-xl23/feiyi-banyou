'use strict';
/**
 * LLM 接入层：兼容任意 OpenAI 风格 /chat/completions 接口。
 * 设计原则：LLM 是"可选增强"，任何失败都静默降级（返回 null），
 * 由上层 Agent 用本地模板兜底，保证系统无 Key 也能完整运行。
 */
const config = require('../config');
const logger = require('../logger');

async function chat(messages, opts) {
  if (!config.llm.enabled) return null;
  const options = Object.assign({ temperature: 0.8, maxTokens: 900, timeoutMs: config.llm.timeoutMs }, opts || {});
  try {
    const res = await fetch(config.llm.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + config.llm.apiKey
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens
      }),
      signal: AbortSignal.timeout(options.timeoutMs)
    });
    if (!res.ok) {
      logger.warn('LLM 响应异常', { status: res.status });
      return null;
    }
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return (content || '').trim() || null;
  } catch (err) {
    logger.warn('LLM 调用失败，降级为本地生成', { detail: String(err && err.message) });
    return null;
  }
}

module.exports = { chat, isAvailable: () => config.llm.enabled };
