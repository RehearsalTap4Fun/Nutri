/**
 * 页内小图标。小程序没有 svg 元素，所以用位图；
 * 图由 `npm run icons` 从网页版 `src/ui/icons.tsx` 的同一组路径生成。
 *
 * 每个图标只生成用得上的颜色，`tone` 要和 scripts/genIcons.mjs 里的 WANT 对得上。
 */
import { Image } from '@tarojs/components'

export type IconName = 'bowl' | 'plus' | 'close' | 'check' | 'alert' | 'info' | 'chevron' | 'scan'
export type IconTone = 'ink' | 'muted' | 'bad' | 'accent' | 'white'

export function Icon({
  name,
  tone = 'ink',
  size = 28,
}: {
  name: IconName
  tone?: IconTone
  size?: number
}) {
  return (
    <Image
      className="icon"
      src={`/assets/icons/${name}-${tone}.png`}
      mode="aspectFit"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  )
}
