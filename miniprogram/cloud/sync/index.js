/**
 * 同步代理云函数。
 *
 * 小程序的 request 只能发到已备案域名，现有的同步服务跑在 IP 上（47.109.97.108），
 * 配不进白名单。云函数在服务端出网，不受这条限制，所以让它转发一手。
 * 好处是**小程序和网页版读写同一份数据**，服务端一行都不用改。
 *
 * 转发的是已经加密好的密文：同步码只在客户端派生密钥，云函数和服务器都解不开。
 */
const http = require('node:http')
const https = require('node:https')
const { URL } = require('node:url')

/** 同步服务地址。证书是 Let's Encrypt 给 IP 签的短期证书，续签失败时用 HTTP 兜底 */
const BASES = ['https://47.109.97.108/nutri/api', 'http://47.109.97.108/nutri/api']

const TIMEOUT_MS = 8000

function once(base, method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(base + path)
    const mod = url.protocol === 'https:' ? https : http
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body))
    const req = mod.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': payload.length }
          : {},
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString('utf8') }),
        )
      },
    )
    req.on('timeout', () => req.destroy(new Error('请求超时')))
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

exports.main = async (event) => {
  const method = String(event && event.method ? event.method : 'GET').toUpperCase()
  const path = String(event && event.path ? event.path : '')
  // 只放行同步接口，避免这个云函数被当成任意转发器
  if (!/^\/sync\/[a-f0-9]{64}(\?.*)?$/.test(path)) {
    return { status: 400, text: JSON.stringify({ error: '路径不合法' }) }
  }
  if (!['GET', 'PUT', 'DELETE'].includes(method)) {
    return { status: 405, text: JSON.stringify({ error: '方法不允许' }) }
  }

  let lastErr = null
  for (const base of BASES) {
    try {
      return await once(base, method, path, event.body)
    } catch (e) {
      lastErr = e
    }
  }
  return { status: 0, text: '', error: lastErr ? String(lastErr.message || lastErr) : '连不上同步服务' }
}
