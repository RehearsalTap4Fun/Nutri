---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/styles.css","src/ui/Today.tsx","src/ui/Plan.tsx","src/ui/Analysis.tsx","src/ui/Me.tsx","src/ui/LogSheet.tsx"]
---

# 私人营养师 应用外壳（今日 / 推荐 / 分析 / 我的 + 录餐抽屉）

模式：Operate。用户：开发者本人，手机竖屏，一天三四次半分钟操作；家人偶尔借用。任务：看余量、记一笔、接受或换掉一餐、周度回顾。保留底部四页签与全部功能文案，浅色为主。

## Direction contract

THESIS: 一天的饮食是一张导览图，余量是陆地中间的湖；拒绝同类应用的白卡片加圆环加投影。
OWN-WORLD: 米色纸底当水、苹果绿平涂色地当陆地，无渐变无投影无颗粒；珊瑚 / 池塘蓝 / 琥珀只做标签与三宏量数据色；一款系统无衬线两档字重；胶囊控件带一颗圆片，激活时圆片滑到头端，边缘微微起伏像岸线。
STORY: 打开就看见今天这块陆地和湖，知道还能吃多少；沿岸是吃过的东西；记一笔后陆地涨、湖缩，超标湖消失岸线变珊瑚。
FIRST VIEWPORT: 上半屏陆地色地从左上涨到右下、岸线出画，湖在中间写着余量；陆地上三条等比宏量条；下半屏水面上的地名式记录；右下黄色胶囊记一笔；底部描边胶囊页签条。
FORM: 挑战牌 aww2-zoo-gardens-guide-map（动物园与植物园导览图），用户在 4 张全卡里选定；我的七候选第 5 位被掷中，用户否决；seed e1ca1482。
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
