export async function onRequestPost(context) {
  const { env } = context;

  // 从数据库随机抽一条恶搞回答
  const result = await env.DB.prepare(
    "SELECT text FROM replies ORDER BY RANDOM() LIMIT 1"
  ).first();

  if (!result) {
    return new Response(JSON.stringify({ text: "数据库是空的,先去插几条数据吧。" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ text: result.text }), {
    headers: { "Content-Type": "application/json" },
  });
}