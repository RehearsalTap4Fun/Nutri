// 饮食日记 · 云同步服务。零依赖，Node ≥ 18。
// 只存密文：客户端用同步码派生密钥加密整包数据后上传，存储键是同步码派生的 64 位十六进制 id。
// API（经 nginx 反代到 /nutri/api/）：
//   GET  /health                → { ok, time }
//   GET  /sync/:id              → { version, blob, updatedAt }（不存在时 version 0）
//   PUT  /sync/:id  { blob, baseVersion } → 200 { version, updatedAt }；版本不一致 409 并返回当前记录
//   DELETE /sync/:id            → 删除
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT || 18790)
const DATA = process.env.DATA_DIR || '/var/lib/nutri/sync'
const MAX_BLOB = 2 * 1024 * 1024
fs.mkdirSync(DATA, { recursive: true })

const rate = new Map()
function limited(ip) {
  const now = Date.now()
  const r = rate.get(ip) || { count: 0, ts: now }
  if (now - r.ts > 60_000) { r.count = 0; r.ts = now }
  r.count++
  rate.set(ip, r)
  if (rate.size > 5000) rate.clear()
  return r.count > 120
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}
const fileOf = (id) => path.join(DATA, id + '.json')
function readRec(id) {
  try { return JSON.parse(fs.readFileSync(fileOf(id), 'utf8')) } catch { return null }
}
function writeRec(id, rec) {
  const tmp = fileOf(id) + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(rec))
  fs.renameSync(tmp, fileOf(id))
}
const EMPTY = { version: 0, blob: null, updatedAt: 0 }

const server = http.createServer((req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?'
  if (limited(ip)) return send(res, 429, { error: 'too many requests' })
  const url = new URL(req.url || '/', 'http://local')
  if (url.pathname === '/health') return send(res, 200, { ok: true, time: Date.now() })
  const m = url.pathname.match(/^\/sync\/([a-f0-9]{64})$/)
  if (!m) return send(res, 404, { error: 'not found' })
  const id = m[1]
  if (req.method === 'GET') return send(res, 200, readRec(id) || EMPTY)
  if (req.method === 'DELETE') { try { fs.unlinkSync(fileOf(id)) } catch { /* 不存在也算成功 */ } return send(res, 200, { ok: true }) }
  if (req.method !== 'PUT') return send(res, 405, { error: 'method not allowed' })
  let body = ''
  let size = 0
  let aborted = false
  req.on('data', (c) => {
    size += c.length
    if (size > MAX_BLOB + 4096) { aborted = true; send(res, 413, { error: 'too large' }); req.destroy(); return }
    body += c
  })
  req.on('end', () => {
    if (aborted) return
    let j
    try { j = JSON.parse(body) } catch { return send(res, 400, { error: 'bad json' }) }
    if (typeof j.blob !== 'string' || j.blob.length === 0 || j.blob.length > MAX_BLOB) return send(res, 400, { error: 'bad blob' })
    const cur = readRec(id)
    const curV = cur ? cur.version : 0
    if (Number(j.baseVersion) !== curV) return send(res, 409, cur || EMPTY)
    const rec = { version: curV + 1, blob: j.blob, updatedAt: Date.now() }
    writeRec(id, rec)
    send(res, 200, { version: rec.version, updatedAt: rec.updatedAt })
  })
})
server.listen(PORT, '127.0.0.1', () => console.log(`nutri-sync listening on 127.0.0.1:${PORT}, data ${DATA}`))
