/**
 * 同步用的加密垫片。
 *
 * `src/sync/crypto.ts` 是纯 JS 实现（noble），本身不依赖 WebCrypto，但用到了四个
 * 小程序环境里没有的全局：`btoa`、`atob`、`TextDecoder`，以及 noble 取随机数时会找的
 * `crypto.getRandomValues`。这里把它们补上，补完之后那个文件一行都不用改。
 *
 * 随机数是这里唯一需要小心的地方：微信只给了异步的 `Taro.getRandomValues`，
 * 而 noble 是同步调用的。所以维护一个熵池，用之前先 `await ensureEntropy()` 灌满，
 * 同步取用时从池子里拿。**池子空了直接抛错，绝不退化成 Math.random** —— 同步码和
 * AES 的 nonce 都不能用伪随机凑合。
 */
import Taro from '@tarojs/taro'

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

/** UTF-8 解码。只需要 decode 这一个方法，noble 那边也只用到它 */
function decodeUtf8(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i]
    let cp: number
    if (b < 0x80) {
      cp = b
      i += 1
    } else if (b < 0xe0) {
      cp = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f)
      i += 2
    } else if (b < 0xf0) {
      cp = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)
      i += 3
    } else {
      cp =
        ((b & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f)
      i += 4
    }
    if (cp > 0xffff) {
      cp -= 0x10000
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff))
    } else {
      out += String.fromCharCode(cp)
    }
  }
  return out
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
