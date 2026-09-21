/**
 * 同步用的加密垫片。
 *
 * `src/sync/crypto.ts` 是纯 JS 实现（noble），本身不依赖 WebCrypto，但用到了几个
 * 小程序环境里没有的全局：`btoa`、`atob`、`TextDecoder`、`TextEncoder`，以及 noble
 * 取随机数时会找的 `crypto.getRandomValues`。这里把它们补上，补完之后那个文件一行都不用改。
 *
 * 要补哪些不能只看自己的源码：`TextEncoder` 是 `@noble/hashes` 的 `utf8ToBytes` 在用，
 * 我们自己一处都没写，所以第一版漏了。开发者工具跑在 Chromium 里，这些全局都有，
 * 漏了也测不出来；真机的 JSCore 没有，正式版 1.0.2 同步时就抛了 `TextEncoder is not defined`。
 * 现在由 `scripts/checkSyntax.mjs` 扫产物兜底：它从本文件解析出补了哪些全局，
 * 再去产物里找 `new X` / `X(`，对不上就让构建失败。加全局请只改本文件，别绕过它。
 *
 * 随机数是这里唯一需要小心的地方：微信只给了异步的 `Taro.getRandomValues`，
 * 而 noble 是同步调用的。所以维护一个熵池，用之前先 `await ensureEntropy()` 灌满，
 * 同步取用时从池子里拿。**池子空了直接抛错，绝不退化成 Math.random** —— 同步码和
 * AES 的 nonce 都不能用伪随机凑合。
 */
import Taro from '@tarojs/taro'
import { decodeUtf8, encodeUtf8 } from './utf8'

const POOL_TARGET = 512
let pool = new Uint8Array(0)
let cursor = 0

function remaining(): number {
  return pool.length - cursor
}

/** 灌满熵池。每次同步动作之前调用一次就够了 */
export async function ensureEntropy(need = 128): Promise<void> {
  if (remaining() >= need) return
  const res = await Taro.getRandomValues({ length: POOL_TARGET })
  const fresh = new Uint8Array(res.randomValues)
  const left = pool.subarray(cursor)
  const merged = new Uint8Array(left.length + fresh.length)
  merged.set(left, 0)
  merged.set(fresh, left.length)
  pool = merged
  cursor = 0
}

function drawInto(target: Uint8Array): Uint8Array {
  if (remaining() < target.length) {
    throw new Error('随机数不够了：调用前要先 await ensureEntropy()')
  }
  target.set(pool.subarray(cursor, cursor + target.length))
  cursor += target.length
  return target
}

let installed = false

/** 幂等。在任何用到 sync/crypto 的地方之前调用 */
export function installCryptoPolyfill(): void {
  if (installed) return
  const g = globalThis as unknown as Record<string, unknown>

  if (typeof g.btoa !== 'function') {
    g.btoa = (s: string): string => {
      const bytes = new Uint8Array(s.length)
      for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff
      return Taro.arrayBufferToBase64(bytes.buffer as ArrayBuffer)
    }
  }

  if (typeof g.atob !== 'function') {
    g.atob = (b64: string): string => {
      const bytes = new Uint8Array(Taro.base64ToArrayBuffer(b64))
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) {
        s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)))
      }
      return s
    }
  }

  // noble 拿到返回值后会 copy 一份再把原数组抹零，所以每次都得给一个新的 Uint8Array
  if (typeof g.TextEncoder !== 'function') {
    g.TextEncoder = class {
      readonly encoding = 'utf-8'
      encode(input = ''): Uint8Array {
        return encodeUtf8(input)
      }
    }
  }

  if (typeof g.TextDecoder !== 'function') {
    g.TextDecoder = class {
      decode(input: Uint8Array): string {
        return decodeUtf8(input)
      }
    }
  }

  const existing = g.crypto as { getRandomValues?: unknown } | undefined
  if (!existing || typeof existing.getRandomValues !== 'function') {
    g.crypto = {
      ...(existing || {}),
      getRandomValues: (arr: Uint8Array) => drawInto(arr),
    }
  }

  installed = true
}
