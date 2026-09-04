/**
 * Извлечение моковых данных из легаси-сборки.
 *
 * Исходников у прежнего E-Analytic не осталось — только минифицированный
 * бандл. Все демо-данные лежат в нём объектными литералами, поэтому забираем
 * их оттуда: находим объявление по имени, вырезаем сбалансированный литерал и
 * вычисляем его в песочнице, где незнакомые идентификаторы (ссылки на иконки
 * вроде `icon:Ve`) превращаются в строку со своим именем.
 *
 * Скрипт одноразовый по смыслу, но лежит в репозитории: он документирует,
 * откуда взялись фикстуры, и позволяет перевытащить их, если понадобится ещё
 * какое-то поле.
 *
 * Запуск: node scripts/extract-legacy-data.mjs
 */

import fs from "node:fs";
import path from "node:path";

const BUNDLE = "legacy/assets/index-Ccd5aMtf.js";
const OUT_DIR = "scripts/extracted";

/** Что вытаскиваем: имя переменной в бандле → имя файла. */
const TARGETS = {
  At: "people",
  jt: "companies",
  Ur: "declarations",
  Nn: "invoices",
  Tr: "procurements",
  vr: "transactions",
  _r: "statements",
  kn: "audit",
  Vt: "assignments",
  zt: "risk-checklist-company",
  Ft: "risk-checklist-person",
  yr: "graph-a",
  Wr: "graph-b",
  Pn: "graph-c",
  Er: "graph-d",
  Pt: "risk-tags",
  On: "action-tones",
  an: "nav",
};

const src = fs.readFileSync(BUNDLE, "utf8");

/** Конец сбалансированного литерала, начинающегося на `[` или `{`. */
function balanced(s, start) {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) return i;
    } else if (c === "`") {
      // Шаблонная строка: перескакиваем целиком, внутри могут быть скобки.
      const j = s.indexOf("`", i + 1);
      if (j < 0) return i;
      i = j;
    }
  }
  return s.length;
}

/**
 * Литерал по имени переменной. Берём самое длинное совпадение: минификатор
 * переиспользует короткие имена, и первое попавшееся может оказаться чужим.
 */
function literalOf(name) {
  const re = new RegExp(`(?:^|[,;{(\\s])${name}\\s*=\\s*(?=[[{])`, "g");
  let best = null;
  for (const m of src.matchAll(re)) {
    const start = m.index + m[0].length;
    if (!"[{".includes(src[start])) continue;
    const body = src.slice(start, balanced(src, start) + 1);
    if (!best || body.length > best.length) best = body;
  }
  return best;
}

/**
 * Вычисление литерала. Незнакомые идентификаторы отдаём строкой с их именем:
 * в данных попадаются ссылки на компоненты иконок, и без этого литерал просто
 * не вычислится.
 */
const scope = new Proxy(
  {},
  {
    has: () => true,
    get: (_t, key) => (key === Symbol.unscopables ? undefined : String(key)),
  }
);

function evaluate(body) {
  // eslint-disable-next-line no-new-func
  const fn = new Function("scope", `with (scope) { return (${body}); }`);
  return fn(scope);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const report = [];
for (const [ident, file] of Object.entries(TARGETS)) {
  const body = literalOf(ident);
  if (!body) {
    report.push(`  ✗ ${ident} → ${file}: литерал не найден`);
    continue;
  }
  try {
    const value = evaluate(body);
    const count = Array.isArray(value) ? value.length : Object.keys(value).length;
    fs.writeFileSync(
      path.join(OUT_DIR, `${file}.json`),
      JSON.stringify(value, null, 2),
      "utf8"
    );
    report.push(
      `  ✓ ${ident} → ${file}.json: ${count} ${Array.isArray(value) ? "записей" : "ключей"}, ${body.length} симв.`
    );
  } catch (e) {
    report.push(`  ✗ ${ident} → ${file}: ${e.message}`);
  }
}

console.log(report.join("\n"));
