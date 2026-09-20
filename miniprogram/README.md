# 饮食日记 · 微信小程序

Taro 4.2.1 + React 18 + TypeScript，编译目标 weapp。AppID `wxe2966c64d8edc50a`。

## 怎么跑

```bash
cd miniprogram
npm install
npm run dev          # 监听式编译到 dist/
```

然后用微信开发者工具**打开 `miniprogram/` 这个目录**（不是 `dist/`，也不是仓库根目录）。`project.config.json` 里写了 `miniprogramRoot: "./dist"`，工具会自己找到产物。

仓库根目录是 Vite + React 的网页版工程，用开发者工具打开那里会编译失败。

命令行打开（需要先在开发者工具里开「设置 → 安全设置 → 服务端口」）：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "$(pwd)"
```

其他命令：

```bash
npm run build        # 出包
npm run check        # 扫产物里小程序不接受的新语法（上传前必跑）
npm run typecheck    # 类型检查（含共用的 core/data/store/sync）
npm run pixelpack    # 重新生成像素猫图层（像素包更新后跑）
npm run tabicons     # 重新生成 tabBar 图标（改图标或配色后跑）
npm run dev:h5       # 编译成 H5，本机快速看效果
```

## 和网页版共用源码，不是复制

`../src/core`、`../src/data`、`../src/store` 三个目录由两端共同引用，**小程序这边没有任何副本**。改一处两端一起变。

接法是两层：

- `tsconfig.json` 里的 `paths` 给出 `@core/*`、`@data/*`、`@store/*`，并把这三个目录纳入 `include`
- `config/index.ts` 里给 webpack 配同名 `alias`，再用 `mini.compile.include` 把这三个目录交给 babel（它们在 `sourceRoot` 之外，默认不会被编译）

另外 `src/ui/format.ts` 与 `src/ui/foodSearch.ts` 虽然放在 `ui` 目录下，但没有任何 DOM 依赖，所以也通过 `@webui/*` 直接复用，没有重写标签表和搜索排序。

现在的实测结果：`npx tsc --noEmit` 在小程序的 tsconfig 下对这三个目录**零报错**，网页版 272 个测试仍全绿，`src/` 一行未改。

## 小程序侧写了哪些东西

| 文件 | 干什么 |
|---|---|
| `src/shared/state.ts` | 把 `loadState`/`saveState` 换成 `Taro.getStorageSync`/`setStorageSync`，其余（`defaultState`/`normalizeState`/`uid`/`exportJson`）从网页版原样 re-export。附一个极简订阅 store，让四个 tab 看到同一份状态 |
| `src/shared/derive.ts` | 按 `src/App.tsx` 的同一套顺序调用 `computeTargets` → `analyze` → `planDay`，自己不含业务逻辑 |
| `src/shared/log.ts` | 记一笔 = 写记录 + 喂小管家。两个记录入口共用，保证行为一致 |
| `src/shared/sync.ts` + `cryptoPolyfill.ts` | 云同步的适配层，见下文 |
| `src/pages/*` | 四个 tab 加一个记录页的界面 |

整份状态存在一个 key 里，和网页版一致。小程序的存储上限是单 key 1MB、总量 10MB。

## 现在能跑到哪一步

闭环已经通了：**建档案 → 看目标 → 记一笔 → 数字实时回算 → 推荐跟着调整**。

- **我的**：性别、出生年份、身高、体重、活动量、目标、饮食风格、餐数。
- **今日**：剩余热量与进度条，三大营养素「已吃／目标」，按餐次列出当天每一笔（点一笔可删），下面是基础代谢、总消耗、纤维，高血压模式下额外显示钠。
- **记一笔**：从 569 道菜里搜，可按分类筛，选份量（½ 到 2 份）后写入。没输入关键词时先给这一餐的常吃与收藏。
- **计划**：按当天剩余预算排三餐，每道菜给出份量与理由，可以「记下」一键补记，也可以「换一换」重排。
- **分析**：近 7 天热量柱状图（记录不全的日子标浅色且不计入日均）、三大营养素供能比、按「数值」与「习惯」分组的结论、体重折线图与记录、以及按体重反推的 TDEE 校准开关。
- **健康小管家**：今日页顶部。记下第一笔孵化，之后每记一笔推进一阶，长出的部件、达成的称号和成长进度都在卡片里；孵化、异变、解锁称号会在记录成功的提示里说出来。
- **云同步**：在「我的」页。和网页版是同一份数据，填同一个同步码两边就合并。**自动同步**：回到前台拉一次，同步相关的数据变化后防抖 4 秒上传。
- **喝水**：今日页按杯点亮，杯数与每杯该在几点前喝完来自 `@core/water`。饮品带来的水分单独显示，不计入杯数。
- **特殊人群模式**：在「我的」页，十种模式可多选，目标、推荐与分析都跟着变。
- **血压 / 血糖**：今日页，分别在高血压、糖尿病模式下才出现。只记录和列出，不做判读。
- **图鉴与毕业**：在「我的」页。图鉴按槽位 × 进化链 × 阶排格，没见过的显示问号，现在身上这件描深色边；称号列出全部配方，没达成的只给凑法。毕业会换一颗新蛋，旧的进「毕业过的」，收集进度不清零。

数字全部来自网页版同一套计算，菜品 569 道、食材 372 种是同一份数据。

网页版还有而这边没有的：喝水记录、血压血糖。

不打算搬：

- **说一句话录餐**。个人主体小程序没有「深度合成 / AI 问答」类目，上不了。
- **条码扫码**。小程序自带扫码，但查询目标 `world.openfoodfacts.org` 没有 ICP 备案，配不进请求白名单。
- **PWA 那一层**（service worker、安装提示、`location.protocol` 嗅探）。小程序自带包缓存，这些直接删掉。

## 视觉：和网页版同一套语言

`src/app.scss` 顶部的 token 块是从网页版 `src/styles.css` 搬过来的，值一一对应。**改视觉先改那里**，组件只引用 token。

三条容易搞错的地方，第一版全踩了：

1. **卡片不画框**。`.card` 是透明的，没有圆角也没有投影，只靠标题和间距分节。真正的视觉主体是 `.lobe`——平涂色块。做成常见的白卡片堆叠就不是这套语言了。
2. **不规则圆角是签名**。`--r-lobe` 这类用的是 `a b c d / e f g h` 椭圆语法，手绘感就来自这里，换成等圆角或 `999px` 立刻变味。WXSS 支持这个语法，rpx 换算也正常。
3. **描边用 `inset box-shadow` 不用 `border`**，因为 border 会占布局盒子，而这套语言里线条是画在色块上的。

餐次各有颜色：早餐太阳黄、午餐陆地绿、晚餐浅陆地、加餐白。色块上的次级文字从对应色相里调（`--lobe-ink-sun` 这些），不用灰。三大宏量是红蓝琥珀三个分离色相，不要用一个绿色糊过去。

尺寸换算：designWidth 750，所以这里的 `1px` 等于网页版的 `0.5px`，网页版 14px 正文在这里写 28px。

**canvas 里读不到 CSS 变量**，`LineChart.tsx` 和 `PixelCat.tsx` 各自硬编码了一份颜色，改 token 时要跟着改。

tabBar 图标由 `npm run tabicons` 生成，路径直接抄自网页版 `src/ui/icons.tsx`，两端是同一组图标。小程序 tabBar 只吃位图，所以同一份 SVG 用两种颜色各渲染一张。

## 图表是怎么画的

小程序没有 svg 元素，但网页版那三张手写 SVG 里，**只有折线图真的需要 canvas**：

- **柱状图**（近 7 天热量）和**占比条**（三大营养素）用普通 `View` 加百分比高度就行，比 canvas 更清晰，也不用处理设备像素比和节点查询。
- **折线图**（体重趋势）走 `src/components/LineChart.tsx`，用的是新版 `Canvas 2D`（`type="2d"`），接口与浏览器一致，不用旧的 `wx.createCanvasContext`。

这个组件里有两处是踩过坑才加的：按设备像素比放大画布（否则真机上糊），以及节点查不到时隔 60ms 重试一次（首屏 canvas 还没布局完时 `createSelectorQuery` 会返回空）。像素猫以后也走这条路。

**另一个坑：hook 不能写在提前返回之后。** 分析页一开始把体重相关的 `useMemo` 写在了 `if (!profile) return` 下面，档案从无到有时 hook 数量会变，React 直接抛 `Rendered more hooks than during the previous render`。现在所有 hook 都在提前返回之前。

## 像素猫是怎么搬过来的

合成逻辑一行没改。`artPlanForCat` 给绘制计划、`composePlan` 把用到的图层叠成一张 64×64 的 RGBA，这两个是纯数组运算，和网页版共用同一份源码。

**真机上 Canvas 2D 的可用面比模拟器窄得多**，第一版在模拟器里正常、真机上猫是空白的。现在这版刻意只用四个最基础的接口：`drawImage`、`getImageData`、`createImageData`、`putImageData`，并避开三样东西，每一样都踩过：

| 踩的坑 | 现在的做法 |
|---|---|
| 离屏画布 `createOffscreenCanvas`，以及把它当 `drawImage` 的源 | 全程复用同一个显示 canvas 节点：先调成 64×64 解码图层，最后再调成输出尺寸 |
| base64 的 data URI：真机上 `createImage` 加载它时 onload 和 onerror 可能都不回调，画布就一直空着 | 优先加载包内 PNG 文件 `/assets/pixelpack/<id>.png`，失败或超时 2.5 秒才回退到 base64 |
| 带缩放的 `drawImage` 配 `imageSmoothingEnabled = false`：关平滑在部分机型上不生效，放大后是糊的 | 纯 JS 最近邻展开，再一次性 `putImageData`，边缘一定是硬的 |

出问题时画布上会压一行小字说明卡在哪一步（找不到节点／拿不到上下文／图层加载失败），不会再是一片空白。

`npm run pixelpack` 做三件事：把共享目录的 58 张 PNG 同步进包、生成 base64 兜底表、校验目录声明的图层是否齐全。少一张不会让构建失败，只会让某些猫在运行时画不出来，所以在生成这一步就拦掉。像素包更新后记得重跑。

## 上传报 invalid file 怎么办

开发者工具上传时如果报：

```
Error: invalid file: common.js, 1:1872
SyntaxError: Unexpected token .
```

那是产物里留了小程序不接受的新语法，通常是可选链 `?.`。**上传前跑 `npm run check`** 就能提前发现，它会指出文件、种类和出错位置的上下文。

这个坑踩过两次，原因不同：

1. **babel 没写 targets**。不写就去读 `package.json` 的 `browserslist`，脚手架给的默认值太新，可选链原样保留。现在 `babel.config.js` 显式写了 `targets: { chrome: '53', ios: '9' }`。
2. **node_modules 默认不过 babel**。同步用的加密库 `@noble` 源码里有可选链，一样会漏进产物。现在 `config/index.ts` 的 `compile.include` 把它显式纳入编译。

排查时注意：直接 `grep '?\.'` 会误报，压缩后的三元表达式 `x ? .85 : .8` 长得一模一样。要看 `?.` 后面跟的是标识符还是数字，`npm run check` 已经按这个判据写了。

## 云同步是怎么接的

**小程序和网页版是同一份数据。** 填同一个同步码，两边合并，服务端一行都没改。

做法是云函数转发。小程序的 `request` 只能发到已备案域名，而同步服务跑在 IP 上（`47.109.97.108`），配不进白名单；但**云函数在服务端出网，不受这条限制**。所以 `cloud/sync/` 这个云函数把请求原样转给现有的同步服务，HTTPS 连不上时用 HTTP 兜底（证书是 Let's Encrypt 给 IP 签的短期证书，6 天一续）。云函数只放行 `/sync/<64位十六进制>` 这一种路径，免得变成任意转发器。

加密没动。`src/sync/crypto.ts` 用的是 noble 的纯 JS 实现，本来就没碰 WebCrypto，端到端的性质也保住了：同步码只在客户端派生密钥，云函数和服务器拿到的都是密文。

小程序侧只加了两样东西：

- `src/shared/cryptoPolyfill.ts`：补 `btoa`、`atob`、`TextDecoder`，以及 noble 会找的 `crypto.getRandomValues`。**随机数是这里唯一要小心的地方**——微信只给了异步的 `Taro.getRandomValues`，而 noble 是同步调用的，所以维护一个熵池，用之前先 `await ensureEntropy()` 灌满；池子空了直接抛错，绝不退化成 `Math.random`，同步码和 AES 的 nonce 都不能用伪随机凑合。
- `src/shared/sync.ts`：一个 fetch 形状的适配器，把请求转给云函数。合并、冲突重试全部复用 `syncOnce`。

PBKDF2 是 6 万次迭代，Node 上约 140 ms，小程序引擎会慢几倍，但 `deriveKeys` 有缓存，一次会话只算一次。

**部署云函数**：开发者工具里右键 `cloud/sync` → 上传并部署（云端安装依赖）。它没有第三方依赖，上传很快。**在开发者工具里调试也必须先部署**，否则调用时会报函数不存在。改了 `BASES` 里的地址要重新部署。

**踩过的坑之二：`apiBase` 不能传空字符串。** `syncOnce` 里写的是 `opts.apiBase || './api'`，空字符串是 falsy，会被当成没传，路径变成 `./api/sync/<id>`，云函数的白名单正则不认，直接回 400。要传 `'/'`：它是 truthy，末尾斜杠又会被去掉，最终正好是 `/sync/<id>`。

**踩过的坑之一：Taro 4 没有把 `wx.cloud` 代理成 `Taro.cloud`**，取 `Taro.cloud` 会是 undefined，表现就是「调不通云函数」。现在直接取全局 `wx.cloud`，`Taro.cloud` 只作为兜底。

**同步自检**：「我的」页云同步卡片里有个「同步自检」按钮，逐环节测一遍并把结果列出来——宿主有没有 `wx.cloud`、云开发能不能初始化、随机数垫片可不可用、同步码能不能派生、云函数能不能访问到同步服务。出问题时先点它，比猜快。

## 自动同步的两个要点

写在 `src/shared/autoSync.ts`：

1. **不能一变就传**。用 `fingerprint(toSyncState(s))` 判断进同步范围的数据是否真的变了，再防抖 4 秒。切 tab、改本地偏好这类不进 `SyncState` 的变化不会触发。
2. **同步自己会写状态，写完又触发订阅**。所以推送成功后**先记下新指纹再写状态**，订阅回调看到指纹没变就不再排一次，否则会自激成死循环。

自动触发失败只记录不弹窗，状态显示在「我的」页同步卡片里；手动点「立即同步」才弹窗报错。

## 待办

- 像素猫的 base64 兜底表（58 KB）：真机已确认包内 PNG 路径可用，这张表可以删掉换体积，但留着能挡住个别机型的意外。
- 上架前要办备案与类目（个人主体选「工具 → 健康管理」，无需额外资质）。
