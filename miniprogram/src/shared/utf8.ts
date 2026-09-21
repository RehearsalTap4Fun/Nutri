/**
 * 手写的 UTF-8 编解码。
 *
 * 真机的 JSCore 没有 `TextEncoder` / `TextDecoder`，`cryptoPolyfill.ts` 要拿它们去补全局。
 * 单独放一个文件是为了能测：这里不碰 Taro，也不碰任何全局，主仓库的 vitest 可以直接 import，
 * 逐个码点与内置实现对照。代理对和孤立代理是这类手写编码最容易错的地方，别省这个测试。
 */

/** UTF-8 编码。孤立代理按 U+FFFD 处理，与 `TextEncoder` 的行为一致 */
export function encodeUtf8(str: string): Uint8Array {
  const out: number[] = []
  for (let i = 0; i < str.length; i++) {
    let cp = str.charCodeAt(i)
    if (cp >= 0xd800 && cp <= 0xdbff) {
      const low = str.charCodeAt(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00)
        i++
      } else {
        cp = 0xfffd
      }
    } else if (cp >= 0xdc00 && cp <= 0xdfff) {
      cp = 0xfffd
    }
    if (cp < 0x80) {
      out.push(cp)
    } else if (cp < 0x800) {
      out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f))
    } else if (cp < 0x10000) {
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    } else {
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f))
    }
  }
  return new Uint8Array(out)
}

/** UTF-8 解码 */
export function decodeUtf8(bytes: Uint8Array): string {
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
