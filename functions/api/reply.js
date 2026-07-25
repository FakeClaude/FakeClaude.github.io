// lang -> 表名 的白名单映射（表名不能用参数绑定，必须在这里做白名单校验后再拼接 SQL）
const TABLE_MAP = {
  en: "replies",
  es: "replies_es",
  pt: "replies_pt",
  de: "replies_de",
  zh: "replies_zh",
  ja: "replies_ja",
};
const DEFAULT_TABLE = TABLE_MAP.en; // 保底用 en

export async function onRequestPost(context) {
  const { env, request } = context;

  let lang;
  try {
    const body = await request.json();
    lang = body?.lang;
  } catch {
    // 没有 body 或不是合法 JSON，走默认语言
  }

  const table = TABLE_MAP[lang] ?? DEFAULT_TABLE;

  // 从数据库随机抽一条恶搞回答
  let result = await env.DB.prepare(
    `SELECT text FROM ${table} ORDER BY RANDOM() LIMIT 1`
  ).first();

  // 如果该语言对应的表还没建、或者恰好是空的，回退到默认的 en 表兜底
  if (!result && table !== DEFAULT_TABLE) {
    result = await env.DB.prepare(
      `SELECT text FROM ${DEFAULT_TABLE} ORDER BY RANDOM() LIMIT 1`
    ).first();
  }

  if (!result) {
    return new Response(JSON.stringify({ text: "数据库是空的,先去插几条数据吧。" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ text: result.text }), {
    headers: { "Content-Type": "application/json" },
  });
}
