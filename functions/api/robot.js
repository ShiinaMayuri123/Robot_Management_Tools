/**
 * Cloudflare Pages Function — 机器人数据 API
 *
 * 功能：通过 MAC 地址存取机器人信息（存储在 Cloudflare KV 中）
 *
 * 请求方式：
 *   GET  /api/robot?mac=AA:BB:CC:DD:EE:FF  → 读取该机器人的数据
 *   PUT  /api/robot?mac=AA:BB:CC:DD:EE:FF  → 保存该机器人的数据（body = JSON）
 *
 * 环境绑定：
 *   需要在 Cloudflare Pages 设置中绑定一个 KV Namespace，变量名为 ROBOT_DATA
 */

/**
 * 处理 GET 请求 — 读取机器人数据
 * 输入：URL 参数 mac（机器人的 MAC 地址）
 * 输出：该机器人的 JSON 数据，如果不存在则返回空对象
 */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const mac = url.searchParams.get('mac');

  // MAC 地址是必需的查询参数
  if (!mac) {
    return new Response(JSON.stringify({ error: '缺少 mac 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 从 KV 中读取数据，key 为 MAC 地址
    const data = await context.env.ROBOT_DATA.get(mac);

    // 如果没找到该机器人的数据，返回空对象（前端会显示默认字段）
    if (!data) {
      return new Response('{}', {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(data, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '读取失败', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 处理 PUT 请求 — 保存机器人数据
 * 输入：URL 参数 mac + 请求体 JSON（包含 fields 数组和 updatedAt 时间戳）
 * 输出：保存成功或失败的响应
 */
export async function onRequestPut(context) {
  const url = new URL(context.request.url);
  const mac = url.searchParams.get('mac');

  if (!mac) {
    return new Response(JSON.stringify({ error: '缺少 mac 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 读取请求体中的 JSON 数据
    const body = await context.request.text();

    // 将数据写入 KV，key 为 MAC 地址
    await context.env.ROBOT_DATA.put(mac, body);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: '保存失败', detail: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
