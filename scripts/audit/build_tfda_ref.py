# -*- coding: utf-8 -*-
"""重建 scripts/audit/tfdaRef.json：把库里的食材按 tfda_alias.py 的对应关系匹配到台湾食药署「食品營養成分資料集」。
用法：
  1) 下载资料集 CSV（data.gov.tw 数据集 8543；镜像 scidm.nchc.org.tw/dataset/best_wish8543），解压得到 20_2.csv
  2) 导出库里的食材：OUT=/tmp/ours.json npx vitest run tests/_exportIngredients.test.ts（见 docs/audit.md）
  3) python3 scripts/audit/build_tfda_ref.py 20_2.csv /tmp/ours.json > scripts/audit/tfdaRef.json
"""
import csv, io, json, re, sys
from tfda_alias import ALIAS
csv_path, ours_path = sys.argv[1], sys.argv[2]
rows = list(csv.reader(io.StringIO(open(csv_path, 'rb').read().decode('utf-8-sig'))))
H = {h: i for i, h in enumerate(rows[0])}
KEY = {'熱量': 'kcal', '粗蛋白': 'protein', '粗脂肪': 'fat', '總碳水化合物': 'carbs', '膳食纖維': 'fiber', '鈉': 'sodium'}
foods = {}
for r in rows[1:]:
    f = foods.setdefault(r[H['整合編號']], {'id': r[H['整合編號']], 'name': r[H['樣品名稱']], 'waste': r[H['廢棄率']] or None, 'n': {}})
    k = KEY.get(r[H['分析項']])
    if k:
        try: f['n'][k] = float(r[H['每100克含量']])
        except ValueError: pass
def base(n): return re.sub(r'\(.*?\)', '', n).replace('平均值', '')
idx = {}
for f in foods.values():
    if 'kcal' in f['n']: idx.setdefault(base(f['name']), []).append(f)
def pick(names):
    for n in names:
        xs = idx.get(n)
        if xs: return sorted(xs, key=lambda f: ('平均值' not in f['name'], len(f['name'])))[0]
out = []
for o in json.load(open(ours_path, encoding='utf-8')):
    if o['name'] not in ALIAS or not ALIAS[o['name']]: continue
    f = pick(ALIAS[o['name']])
    if not f: continue
    tw = {k: f['n'].get(k) for k in ['kcal', 'protein', 'fat', 'carbs', 'fiber']}
    out.append({'id': o['id'], 'name': o['name'], 'tw': {'id': f['id'], 'name': f['name'], **tw, 'waste': f['waste']}})
print(json.dumps(out, ensure_ascii=False, indent=0))
