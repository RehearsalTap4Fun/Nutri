import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// 起一个真的同步服务进程（临时数据目录 + 随机端口），用 HTTP 打它
const PORT = 20000 + Math.floor(Math.random() * 20000)
const BASE = `http://127.0.0.1:${PORT}`
const ID = 'a'.repeat(64)
let dir = ''
let proc: ChildProcess

const put = (body: string) => fetch(`${BASE}/sync/${ID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body })

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'nutri-sync-'))
  proc = spawn(process.execPath, [path.resolve('server/sync-server.mjs')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: path.join(dir, 'sync'), CONTRIB_DIR: path.join(dir, 'contrib') },
    stdio: 'ignore',
  })
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`${BASE}/health`)).ok) return } catch { /* 还没起来 */ }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('同步服务没起来')
})
afterAll(() => {
  proc?.kill()
  rmSync(dir, { recursive: true, force: true })
})

describe('同步服务', () => {
  it('请求体是合法 JSON 但不是对象（null / 数字 / 字符串）时回 400，进程不退出', async () => {
    for (const body of ['null', '1', '"x"']) {
      expect((await put(body)).status).toBe(400)
      expect((await fetch(`${BASE}/contribute`, { method: 'POST', body })).status).toBe(400)
    }
    expect(proc.exitCode).toBeNull()
    expect((await fetch(`${BASE}/health`)).ok).toBe(true)
  })
  it('正常的推送、版本冲突、读取、删除', async () => {
    const r1 = await put(JSON.stringify({ blob: 'v1.x', baseVersion: 0 }))
    expect(r1.status).toBe(200)
    expect((await r1.json()).version).toBe(1)
    expect((await put(JSON.stringify({ blob: 'v1.y', baseVersion: 0 }))).status).toBe(409)
    expect((await (await fetch(`${BASE}/sync/${ID}`)).json()).blob).toBe('v1.x')
    await fetch(`${BASE}/sync/${ID}`, { method: 'DELETE' })
    expect((await (await fetch(`${BASE}/sync/${ID}`)).json()).version).toBe(0)
  })
})
