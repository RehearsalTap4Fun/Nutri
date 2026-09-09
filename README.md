# 饮食日记

个人版饮食管家：按身体数据算目标，按规则推荐每日餐食，录餐后根据近 7 天的实际吃法调整推荐并给出结构建议。纯前端、本地存储。推荐与分析全部是本地规则；唯一可选的联网功能是「说一句话录餐」，用自己的 API key 浏览器直连 Claude Opus 5 或 DeepSeek V4 Flash。

## 运行

```bash
npm install
npm run dev        # 开发，手机同一 Wi-Fi 下可用局域网地址访问
npm run build      # 构建：dist/ 下是单文件 index.html + manifest + 图标 + sw.js
npm run release    # release/饮食日记.html 单机版；release/pwa/ 整目录上传静态托管即为 PWA
npm run preview    # 本机预览 dist（service worker 需要 http 或 https，file:// 下不注册）
npm test           # vitest
npm run validate   # 校验食材与菜品数据（--list 打印每道菜营养值）
```

## 部署到自己的服务器

`scripts/deploy.sh` 一条命令：构建 → rsync `release/pwa` 到服务器 → reload nginx。服务器地址等写在项目根目录的 `.deploy.env`（已 gitignore）。nginx 站点配置模板见 `deploy/nginx-nutri.conf`；服务器上实际生效的是 `/etc/nginx/conf.d/nutri.conf`，站点目录 `/var/www/nutri`。

当前已部署在阿里云轻量服务器（成都），IP 直访，路径 `/nutri/`，**HTTPS 已开**：`https://47.109.97.108/nutri/`（HTTP 保留作兜底）。没有域名也能上 HTTPS，靠的是 Let's Encrypt 直接给 IP 签的短期证书（`shortlived` 档，6 天有效）：服务器上 admin 用户的 `~/.acme.sh` 用 HTTP-01 验证（挑战目录 `/var/www/acme`，nginx 里 `/.well-known/acme-challenge/` 指过去），证书写到 `/etc/nginx/ssl/nutri.{crt,key}`，cron 每天检查、满 3 天自动续签并 reload nginx。站点公共段抽在 `/etc/nginx/conf.d/nutri-site.inc`，80 与 443 两个 server 都 include 它。以后绑了已备案的域名，把 `server_name` 换成域名、用同一套 acme.sh 按域名再签一张（普通 90 天档）即可。注意内地服务器域名走 80/443 必须先 ICP 备案，IP 直访不需要。根路径是项目列表页 `/var/www/index.html`，以后每个项目一个子目录加一段 `location`（模板见服务器上的 `/etc/nginx/conf.d/nutri.conf` 注释）。构建用相对路径，清单的 start_url / scope 与 sw.js 作用域都随所在目录解析，所以子目录不需要改代码。内地地域绑域名需要备案，绑了域名后用 certbot 加证书即可启用 HTTPS，离线缓存随之生效。

### 版本号与「检查更新」

「我的」页底部显示 `v<package 版本> · 构建 <时间> · <git 短哈希>`，由 `vite.config.ts` 在构建时通过 `define` 注入（`src/version.ts`）。「检查更新」会拉服务器上的 `version.json`（构建时与 `sw.js` 同一个构建号）和当前页面比对，不一致时给刷新按钮。测试云端是否为最新：看这一行的构建时间是否等于最近一次 `npm run deploy` 打印的版本。

## 云同步

`server/sync-server.mjs` 是零依赖 Node 服务（systemd 单元 `nutri-sync`，监听 127.0.0.1:18790，数据目录 `/var/lib/nutri/sync`），nginx 以 `location /nutri/api/` 反代到它（模板见 `deploy/nginx-nutri.conf`）；每天 03:30 由 `deploy/backup-sync.sh` 做备份。服务器只存密文：客户端用同步码（6 组 × 4 字符，字母表去掉 0/O/1/I）经 PBKDF2-SHA256 派生 AES-GCM 密钥和记录 id（`src/sync/crypto.ts`），同步码丢了云端数据就解不开。合并按条目 id 取 `updatedAt` 较新者，删除用墓碑保留 90 天，档案/设置按 `meta` 时间戳整体取新（`src/sync/merge.ts`）；`src/sync/client.ts` 走乐观版本号，409 时拉下来再合并重推。App 内状态指纹变化后 4 秒防抖上传，切回前台时拉一次。同步码和 API key 一样只存本机，导出文件不带。接入流程：A 机「我的 → 云同步 → 生成同步码并开启」，B 机「输入已有同步码 → 接入」，接入后两边合并、互不覆盖。本地开发时 `vite.config.ts` 把 `/api` 代理到线上服务。

## 装到手机（PWA）

`release/pwa/` 整目录上传到任意静态托管（GitHub Pages、Cloudflare Pages、Vercel、阿里云 OSS 静态站点都行，支持子路径），用手机浏览器打开后：

- iPhone：Safari 分享 → 添加到主屏幕。主屏幕 Web App 不受 Safari 7 天清空存储的限制。
- Android：Chrome 会弹「安装」，或菜单 → 安装应用；「我的」页里也有安装按钮。

离线：`scripts/swPlugin.ts` 在构建时生成 `sw.js`，预缓存应用壳，同源请求网络优先、断网回退缓存；模型接口的跨域请求不经过缓存。每次构建缓存名带时间戳，旧缓存自动清理；用户回到前台时检查更新，有新版本弹 toast「刷新」。

数据仍只存在该设备该网址的浏览器存储里；同一网址下主屏幕图标与浏览器标签共用一份，换网址或换设备要导出导入。

## 结构

```
src/core/      纯逻辑，可单测
  types.ts       档案 / 营养 / 食材 / 菜品 / 记录 类型
  energy.ts      BMR(Katch-McArdle / Mifflin) · TDEE · 目标热量与宏量 · 餐次占比
  nutrition.ts   菜品营养由食材构成推导；蔬菜份数、过敏原、素食判断
  analysis.ts    近 7 天滚动统计 → 调整信号 → 结构建议；体重反推实际消耗
  openFoodFacts.ts 条码 → Open Food Facts 产品解析（每 100 g 营养、份量），查询直连、可注入 fetch 测试
  budget.ts      「用剩下的预算还能吃什么」：按剩余热量与蛋白/脂肪/碳水/纤维的缺口、超额挑放得下的菜
  planner.ts     每日推荐：按饮食风格模板选菜、按目标收敛份量、避重、贴近实际吃法
  rng.ts dates.ts
src/data/
  ingredients.ts 234 条基础食材（中国食物成分表 / USDA 常见值归并）+ ingredientsUsda.ts 130 条（USDA FoodData Central SR Legacy 按 fdcId 提取，公有领域，带 source 标记）
  dishes/        564 道菜：中式家常 cnMain + cnMore · 主食早餐小食饮品 staplesAndMore · 西式外卖便利店 westTakeout · 更多外卖餐馆 takeout2 · 更多便利店包装 convenience2
src/llm/mealParser.ts  说一句话录餐：目录 + 规则 → 结构化输出（zod schema），支持 Anthropic / DeepSeek 两家，营养值仍由本地库推导
src/store/storage.ts  localStorage 持久化、导入导出（导出不含 API key）
src/ui/        React 界面：今日 / 推荐 / 分析 / 我的 + 录餐面板 + 图表
scripts/validateData.ts  数据校验
tests/         energy · nutrition · analysis · planner
```

## 关键规则

- 有体脂率用 Katch-McArdle，否则 Mifflin-St Jeor；减脂 −18%，不低于 BMR 与 1200/1500 千卡下限；增肌 +10%。
- 蛋白按瘦体重 1.8~2.2 g/kg（无体脂率按体重 1.2~1.6 g/kg）；脂肪 28% 热量；低碳风格碳水固定 25%。
- 推荐只有近 7 天 ≥ 2 个完整记录日才启用调整信号：蛋白低 / 钠高 / 油高 / 纤维蔬菜少 / 热量超 / 加工多 / 午餐外卖为主 / 不吃早餐 / 夜宵。
- 午餐连续 3 天外卖时，推荐改为从外卖里挑相对清淡的一份，而不是硬塞家常菜。
- 自适应消耗：近 4 周 ≥ 10 个完整记录日 + 跨度 ≥ 10 天的 ≥ 3 次体重，TDEE ≈ 平均摄入 − 体重斜率 × 7700，限制在公式值 ±30% 内。

## 说一句话录餐

「我的」里选服务商并填入 API key 后，录餐面板出现「说一句话 ✨」入口。两家都是浏览器直连（DeepSeek 接口已实测允许跨域），key 只存本机 localStorage，导出数据时剥离。

- **Anthropic**：`claude-opus-5`，`effort: low`，结构化输出按 zod schema 强约束 `{slot, time, items[{dish_id, name, portion, note, estimate}]}`；系统提示带完整菜品目录（约 4K token）并打 `cache_control`；默认开启服务端 `fallbacks: "default"`（beta `server-side-fallback-2026-07-01`），并检查 `stop_reason === "refusal"`。单次约 $0.02。
- **DeepSeek**：`deepseek-v4-flash`，OpenAI 兼容 `chat/completions` + `response_format: json_object`，系统提示里附 JSON 示例，返回文本经 `parseLooseJson` 宽松解析（去围栏、数字字符串转数）后再过同一 schema。单次约 $0.002（高峰价，闲时减半）。
- 匹配到目录的条目用库值；匹配不到的落为「估算」自定义条目并标注。界面显示本次 token 与费用。
- 解析跑在后台任务里（`App.tsx` 的 `speakJob`，类型见 `src/llm/mealParser.ts` 的 `SpeakJob`），不挂在弹窗组件上：关掉弹窗、切到别的页签都不影响结果送达，跑完/出错会在所有页签顶部出现常驻提示条（`src/ui/SpeakJobBanner.tsx`），点一下回到结果（自动切回发起解析时看的那一天）继续编辑或记为已吃；同一时刻只跑一个任务。

真机验证脚本：

```bash
ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/tryParse.ts "中午吃了一碗兰州拉面加个卤蛋"
LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=sk-... npx tsx scripts/tryParse.ts "早上豆浆油条一杯拿铁"
```

## 饮水

今日页有饮水卡：目标按《中国居民膳食指南（2022）》成年男 1700 ml、女 1500 ml，孕中晚期 ≥1700、哺乳期 2100、痛风 ≥2000、老年人按 1700 提醒、训练日 +500（`computeTargets` 的 `waterMl`）。每格 200 ml，点 +100/+200/+300 或自定义即记，可撤销；餐食记录里饮品类的液体量单列显示、不计入白水。分析页在有 3 天以上记录后给日均对比与「喝水偏少」提醒。数据模型 `WaterEntry`，存 `AppState.water`，逻辑在 `src/core/water.ts`。

## 目标的数据来源

每项每日目标的计算规则与出处集中在 `src/core/sources.ts`：`SOURCES` 是参考文献表（中国居民膳食指南 2022、DRIs 2023、Mifflin-St Jeor、Katch-McArdle、FAO/WHO/UNU 活动系数、ISSN 蛋白立场声明、DGA 纤维、DASH/AHA 钠、中国高血压/糖尿病/痛风/脂肪肝/反流指南、国际 PCOS 指南、Wishnofsky 7700 千卡、中国食物成分表、USDA），`targetBasis()` 按当前档案生成逐项「规则 + 依据」。界面上：「我的」档案卡与建档预览下方的「这些目标怎么来的」、饮水卡的「为什么是 X ml」、营养模式卡的「这些模式的规则出自哪里」、分析页日均对比下方、「关于 · 参考文献」。改算法时同步改 `sources.ts`，`tests/sources.test.ts` 会校验每项目标都有说明且引用存在。

### 食物库审计与数据来源标注

- 食材条目的 `source` 字段：`usda:<fdcId>`（USDA SR Legacy，公有领域）、`tfda:<整合編號>`（台湾食药署「食品營養成分資料集」，政府資料開放授權條款第 1 版，本项目注明出处）、`mext:<番号>`（日本食品標準成分表 2020 八訂）、`cfct6`（中国食物成分表第 6 版公开常见值）；未标注的为早期归并值。
- `tests/dataAudit.test.ts` 把 275 个食材与台湾实测值逐条比对，超阈值的偏差必须在 `scripts/audit/accepted.json` 写明理由；另有纯肉禽类碳水、植物性纤维、4/9/4 自洽等结构性规则。方法、阈值与本次修正清单见 `docs/audit.md`。

## 特殊人群模式

入口在「我的 → 营养模式」卡（点一下即时生效），首次建档表单里也有同一组选择器；今日页没开模式时会显示「有特殊情况？设营养模式」直达。可勾选 孕期（分孕早/中/晚）、哺乳期、备孕/多囊、高血压、糖尿病、脂肪肝、痛风/高尿酸、胃食管反流、老年人、健身增肌，可多选（孕期与哺乳期互斥，男性不显示这两项；孕期 + 糖尿病即妊娠期糖尿病）。纯素作为饮食风格单独一档。选择器组件是 `src/ui/ModesPicker.tsx`，规则集中在 `src/core/conditions.ts`，三处接入：

| 模式 | 目标调整 | 推荐 | 分析 |
|---|---|---|---|
| 孕期 | 孕中期 +250 千卡 / +15 g 蛋白，孕晚期 +400 / +30；奶类 500 g；减脂目标改维持 | 排除酒精、生食、含咖啡因；奶类与鱼虾加权，高汞鱼降权 | 奶类是否达标、每周鱼虾次数、咖啡因、饮酒、热量不足 |
| 哺乳期 | +400 千卡 / +25 g 蛋白；奶类 500 g | 同孕期 | 同孕期 |
| 高血压 | 钠 ≤1500 mg；蔬菜 5 份、水果 300 g | 排除腌腊与单菜钠 >700 mg；按钠量连续衰减选同类最淡；外卖与重油降权 | 钠 vs 1500、蔬果（钾）、腌腊次数 |
| 糖尿病 | 碳水 50%、蛋白 ≥18%、纤维 ≥30 g；碳水按餐均分 | 排除含糖饮料与甜食；主食粗粮 ×2.5、精制主食 ×0.15；单餐碳水上限 = 目标 × 餐次占比 × 1.15 | 含糖饮料、精制 vs 粗粮、碳水是否集中在某一餐、纤维 |
| 脂肪肝 | 碳水 48%、蛋白 ≥20%、纤维 ≥30 g、水果 200 g；超重且未减脂时建议改减脂 | 排除酒精、含糖饮料与甜食；粗粮 ×2、精制 ×0.3；肥肉 ×0.4、油炸 ×0.3；低脂蛋白加权 | 含糖、饮酒、脂肪供能比 >35%、油炸与肥肉次数 |
| 痛风/高尿酸 | 奶类 400 g、水果 200 g；减脂缺口放缓到 10% | 排除高嘌啉（内脏、贝壳虾蟹、鱿鱼、干海鲜、浓汤火锅、卤味、腐竹黄豆）、酒精、含糖；中嘌啉肉类 ×0.5；蛋奶豆腐加权；汤 ×0.3 | 高嘌啉食物、饮酒、含糖饮料、肉类日均 >150 g、奶类偏少 |
| 老年人 | 蛋白 ≥1.2 g/kg、奶类 400 g；减脂缺口放缓到 10% | 早餐必配蛋白；炖煮汤类与易消化蛋白加权；油炸 ×0.4、辛辣 ×0.5、坚硬食物与外卖降权 | 早餐蛋白占比 <20%、蛋白不足、奶类、吃得偏少、油炸 |
| 备孕/多囊 | 碳水 45%、蛋白 ≥20%、纤维 30 g、蔬菜 5 份；超重且未减脂时建议改减脂 | 排除酒精、生食、含糖；粗粮 ×2、精制 ×0.3；深绿叶菜 ×1.5（叶酸）；咖啡因 ×0.4 | 含糖、饮酒、深绿叶菜 <150 g、精制 vs 粗粮、咖啡因 |
| 胃食管反流 | 脂肪 25%；建议三餐加一顿、晚餐早 | 排除辛辣、油炸、咖啡浓茶、酒精、碳酸饮料、辣酱；高脂 ×0.4、番茄柑橘 ×0.6、葱蒜 ×0.7；清淡低脂 ×1.4 | 21 点后进食、单餐超全天一半、诱因食物次数、脂肪 >32% |
| 健身增肌 | 蛋白 2 g/kg；「今日」可标训练日，当天 +300 千卡（落到碳水） | 高蛋白菜 ×1.6、瘦肉蛋白 ×1.4、粗粮主食 ×1.3、油炸 ×0.5 | 蛋白 <90% 目标、单餐蛋白 <25 g 的比例、热量偏低 |
| 纯素（饮食风格） | 蛋白 +10%，奶类目标 0，提示 B12 | 排除一切肉禽水产、蛋、奶、蜂蜜 | 沿用通用分析 |

依据：中国居民膳食指南(2022)及老年人分册、DRIs(2023)、高血压与 2 型糖尿病防治指南的膳食部分、DASH、中国高尿酸血症与痛风诊疗指南、非酒精性脂肪性肝病防治指南的膳食部分。嘌啉分级见 `conditions.ts` 的 `PURINE_HIGH` / `PURINE_MEDIUM`。界面上对这些模式有单独的免责声明：只做日常饮食辅助，不替代产检、内分泌科与临床营养科的个体化方案。

## 能不能吃

「今日」页的「能不能吃」卡：搜一个菜或自建食物，按当前人群模式与今天已吃的量给出 不建议 / 少吃点 / 可以吃 三档建议加具体理由。规则不重新发明，直接复用 `conditions.ts` 里推荐用的排除/加权判定（酒精、生食、腌腊、含糖、嘌呤分级等），只是把同一套规则讲成一句话，逻辑集中在 `src/core/verdict.ts`：命中人群模式的硬排除（如高血压腌腊、痛风高嘌呤、糖尿病含糖饮料）直接判不建议；软性加权命中（中嘌呤、精制主食、偏酸、油炸等）判少吃点；再叠加当天预算——这份加上去会不会让热量/钠（高血压）/碳水（糖尿病）超过今天剩下的额度。自建的「按食材搭配」菜有完整食材构成，判断和菜品库一样准；「按成分表」自定义食物没有食材构成，判不了酒精、生食、腌制、嘌呤，只按热量与宏量粗判，界面会注明。菜品搜索逻辑（`src/ui/foodSearch.ts`）与「记一笔」共用同一套排序。

## 视觉与交互

参考了 Emil Kowalski 的动效规范（进出场 `cubic-bezier(.23,1,.32,1)`、抽屉 `cubic-bezier(.32,.72,0,1)`、按压 `scale(.97)`）、number-flow 的数字滚动、vaul 的抽屉手感、shadcn 的卡片层级与空状态、uhabits 的达标日历，全部手写零依赖。配色为「瓷白 + 翡翠绿」，三大宏量用红/蓝/琥珀（蛋白/脂肪/碳水），明暗两套都过了 dataviz 校验（色弱可辨、对比度 ≥3:1）。所有 token 在 `src/styles.css` 顶部。

## 钠的标定与少盐做法

- 家常菜按「一人份」调味：盐当量不超过 2 g（钠 800 mg），调味钠超过类别上限（荤菜 700、素菜 650、汤 600、主食早餐 450）的菜已等比缩减调味料；高汤按家庭无盐高汤计（80 mg/100 g），菜里的盐另算。外卖与便利店按实际口味不设限。校验脚本会对超标的家常菜给 warning。
- 即便如此，两道家常菜加一碗汤仍接近 2000 mg 的指南上限。这是真实水平：中国居民日均盐摄入约 9~10 g，是指南的两倍。
- 「少盐做法」「少油做法」：录家常菜时可勾选，钠按调味料减半、脂肪与热量按烹调油减半计；推荐里全天钠或脂肪压不进目标时会自动给家常菜打上这两个标记并在说明里写明，一键记为已吃时随之带上。实现见 `nutrition.ts` 的 `condimentSodium / oilFat / canLowSalt / canLowOil / dishNutrientsFor`，`LogEntry` 与 `PlanItem` 的 `lowSalt / lowOil`。

## 推荐的全天收敛

单餐只按热量与蛋白收敛，三餐叠起来脂肪和钠会跑偏（减脂档案实测：脂肪超目标 40%、钠 3400~4300 mg）。`planner.ts` 的 `balanceDay` 在三餐选完后再做一轮全天收敛：

1. 蛋白与热量先到位（加瘦蛋白份量、调主食）。
2. 两轮「钠 → 脂肪」：钠超上限先按少盐做法计，仍超 10% 就把最咸的菜换成同角色更淡的菜；脂肪超 10% 先换菜，再按少油做法计。换菜时不允许另一项明显变差，蛋白菜换菜必须保住 80% 蛋白。
3. 仍超就压份量，先压非蛋白菜。
4. 蛋白不低于 85%，脂肪有余量再补到 90%；最后只用主食把热量调进 −5%~+5%。
5. 糖尿病模式复核单餐碳水上限。
6. 压不进去的差距如实写进说明（如「今天推荐约 2400 mg 钠，仍高于上限 2000」）。

选菜权重也加了静态的钠连续衰减与脂肪供能比惩罚。减脂档案 20 个种子实测：热量 −5%~0、脂肪均值 54 g（目标 57）、蛋白均值 122 g（目标 127）、钠均值 2320 mg（上限 2000，家常菜按少盐计后的现实下限）。

## 自定义食物

录餐面板搜不到时可自定义，两种录法：

- **按食材搭配**（默认）：搜食材、填一人份克重，营养、蔬菜/水果/奶类份数、少盐少油都和菜品库同一套逻辑推导；保存为自建菜（id 以 `custom_` 开头，存 `AppState.customDishes`），以后搜索、推荐、分析一视同仁。四季豆炒肉这类家常菜用这个。
- **按成分表**：看包装填一份的热量与三大宏量，可选填「含蔬菜 g / 含水果 g」，否则份数统计里算 0。扫码命中的包装食品走这条。

说一句话录餐里目录匹配不到的条目，模型会连蔬菜与水果克数一起估（schema 的 `veg_g / fruit_g`）。

## 加菜

在 `src/data/dishes/` 对应分组里用 `D(id, 名称, 类别, 菜系, 做法, 餐次, 份量描述, [[食材id, 克], ...], {aliases, tags})` 追加，然后 `npm run validate`。新食材加到 `ingredients.ts`，注明来源。

## 贡献食物给食品库

个人本地数据样本有限，食品库要健康地变大得靠用户逐步贡献，而不是单个人闭门造车。「我的」页「帮食品库变大」卡收集库里没有的自建菜（`customDishes`）与自定义食物（`customFoods`），逐条生成可读 JSON 草稿（名称、营养值、自建菜带食材构成、条码若有）。两条路都不碰加密云同步、不共享任何密钥：

- **直接提交**：`POST /nutri/api/contribute`（`src/sync/contribute.ts`），明文、匿名（不带 ip、不带任何用户标识），服务器只管追加进 `CONTRIB_DIR/contributions.jsonl`（默认 `/var/lib/nutri/sync` 同级的 `contrib/` 目录），跟 `/sync` 的密文存储是完全独立的文件与端点，见 `server/sync-server.mjs`。
- **手动复制**：复制生成的 JSON 粘贴成 GitHub Issue 或发给作者，纯本地生成，不联网。

两条路作者收到后都是人工审核数值合理再手动整理进 `dishes/*.ts`。标记「已贡献」只是本地状态，避免重复提示，随云同步的 `settings` 一起走 LWW。核心逻辑在 `src/core/contribute.ts`，界面在 `src/ui/Contribute.tsx`。

## 边界

数值为估算，不构成医疗建议。孕期、哺乳期、糖尿病、肾病、进食障碍、未成年人请咨询医生或注册营养师。

## 扫条码

录餐抽屉第三个入口「扫码」：支持 BarcodeDetector 的浏览器（Chrome / Android / 桌面 Chrome，需 https 或本机地址）可以开相机扫或拍照识别，其余环境手输条码数字。先查本机已录过的条码，再直连 [Open Food Facts](https://world.openfoodfacts.org/)（ODbL 开放数据库，`world.openfoodfacts.org/api/v2/product/{条码}`）。查到后按这次吃的克数换算成一条自定义食物并记住条码；查不到（国内商品收录少）就转「按成分表录入」，录完同样记住条码，下次直接命中。
