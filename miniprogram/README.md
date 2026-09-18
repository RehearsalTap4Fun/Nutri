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
npm run typecheck    # 类型检查（含共用的 core/data/store）
npm run dev:h5       # 编译成 H5，本机快速看效果
```

## 和网页版共用源码，不是复制

`../src/core`、`../src/data`、`../src/store` 三个目录由两端共同引用，**小程序这边没有任何副本**。改一处两端一起变。

接法是两层：

- `tsconfig.json` 里的 `paths` 给出 `@core/*`、`@data/*`、`@store/*`，并把这三个目录纳入 `include`
- `config/index.ts` 里给 webpack 配同名 `alias`，再用 `mini.compile.include` 把这三个目录交给 babel（它们在 `sourceRoot` 之外，默认不会被编译）

另外 `src/ui/format.ts` 与 `src/ui/foodSearch.ts` 虽然放在 `ui` 目录下，但没有任何 DOM 依赖，所以也通过 `@webui/*` 直接复用，没有重写标签表和搜索排序。

现在的实测结果：`npx tsc --noEmit` 在小程序的 tsconfig 下对这三个目录**零报错**，网页版 272 个测试仍全绿，`src/` 一行未改。

## 小程序侧只写了三样东西

| 文件 | 干什么 |
|---|---|
| `src/shared/state.ts` | 把 `loadState`/`saveState` 换成 `Taro.getStorageSync`/`setStorageSync`，其余（`defaultState`/`normalizeState`/`uid`/`exportJson`）从网页版原样 re-export。附一个极简订阅 store，让四个 tab 看到同一份状态 |
| `src/shared/derive.ts` | 按 `src/App.tsx` 的同一套顺序调用 `computeTargets` → `analyze` → `planDay`，自己不含业务逻辑 |
| `src/pages/*` | 四个 tab 加一个记录页的界面 |

整份状态存在一个 key 里，和网页版一致。小程序的存储上限是单 key 1MB、总量 10MB。

## 现在能跑到哪一步

闭环已经通了：**建档案 → 看目标 → 记一笔 → 数字实时回算 → 推荐跟着调整**。

- **我的**：性别、出生年份、身高、体重、活动量、目标、饮食风格、餐数。
- **今日**：剩余热量与进度条，三大营养素「已吃／目标」，按餐次列出当天每一笔（点一笔可删），下面是基础代谢、总消耗、纤维，高血压模式下额外显示钠。
- **记一笔**：从 569 道菜里搜，可按分类筛，选份量（½ 到 2 份）后写入。没输入关键词时先给这一餐的常吃与收藏。
- **计划**：按当天剩余预算排三餐，每道菜给出份量与理由，可以「记下」一键补记，也可以「换一换」重排。

数字全部来自网页版同一套计算，菜品 569 道、食材 372 种是同一份数据。

还没搬：分析页的三张图表、健康小管家。

不打算搬：

- **说一句话录餐**。个人主体小程序没有「深度合成 / AI 问答」类目，上不了。
- **条码扫码**。小程序自带扫码，但查询目标 `world.openfoodfacts.org` 没有 ICP 备案，配不进请求白名单。
- **PWA 那一层**（service worker、安装提示、`location.protocol` 嗅探）。小程序自带包缓存，这些直接删掉。

## 待办里最费事的两块

1. **分析页的图表**：网页版是三张手写 SVG。小程序没有 svg 元素，静态图标可以转 base64 走 `image` 组件，但数据驱动的图表只能改用 canvas 重画。
2. **健康小管家**：合成逻辑（`pixelize.ts` + `catArt.ts` + `pixelpack.ts`，832 行纯数组运算）一行都不用改，要换的只有取像素和出图那几个 canvas 调用，外加 58 张 PNG 的引用方式（`import.meta.glob` 在小程序里没有，要改成静态表）。另外 `image-rendering: pixelated` 在 WXSS 里的支持不稳，是这块的主要风险。

## 一个踩过的坑：上传报 invalid file

开发者工具上传时如果报：

```
Error: invalid file: common.js, 1:1872
SyntaxError: Unexpected token .
```

那是产物里留了**可选链 `?.`**，小程序的代码校验过不了。

原因在 `babel.config.js`：不写 `targets` 时 babel 会去读 `package.json` 的 `browserslist`，脚手架给的默认值（`defaults and fully supports es6-module`）太新，`?.` 会被原样保留。共用的 `core`／`data` 里用了不少可选链，于是全落在 `common.js` 里。

现在 `babel.config.js` 显式写了 `targets: { chrome: '53', ios: '9' }`，`package.json` 的 `browserslist` 也一并调低。改动这两处之后要重新构建并确认产物干净：

```bash
npm run build
grep -rE '\?\.[A-Za-z_$([]' dist/*.js dist/pages/*/*.js   # 应当无输出
```

注意直接 `grep '?\.'` 会误报：压缩后的三元表达式 `x ? .85 : .8` 长得一样。要判断是不是真的可选链，得看 `?.` 后面跟的是标识符还是数字。

## 后端

目前完全离线，不发任何网络请求，所以不需要配置服务器域名。

以后要做同步：现有那台阿里云服务器接不进来（小程序要求 HTTPS + 已 ICP 备案的域名，不接受 IP，而线上是 `47.109.97.108` 直访）。走**微信云开发**最省事，它用微信私有协议，不需要配服务器域名也不需要自己备案域名。

同步用的加密（`src/sync/crypto.ts`）本身是可以直接搬的：它用 `@noble/ciphers` 和 `@noble/hashes` 的纯 JS 实现，没碰 Web Crypto。只需要补 `btoa`、`atob`、`TextDecoder` 三个小垫片，另外 PBKDF2 是 6 万次迭代，要先测一下在小程序引擎上的耗时。
