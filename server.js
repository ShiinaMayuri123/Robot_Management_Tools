// server.js - 后端入口文件
// 使用 Express 提供 RESTful API，SQLite 作为持久化存储，实现多用户数据共享。

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'; // 采用 sqlite 的 promise 接口
import { Server as SocketIOServer } from 'socket.io'; // 如需实时同步，可在后续启用

const app = express();
const PORT = 3000; // 后端监听端口

app.use(cors());
app.use(bodyParser.json());

// 初始化 SQLite 数据库并确保表结构存在
async function initDb() {
  const db = await open({
    filename: './db/robot.db',
    driver: sqlite3.Database,
  });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS robot_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mac TEXT UNIQUE,
      data TEXT,
      updated_at TEXT
    );
  `);
  return db;
}

const dbPromise = initDb();

// GET /api/robot?mac=xxxx   - 获取指定 MAC 的机器人数据
app.get('/api/robot', async (req, res) => {
  const mac = req.query.mac;
  if (!mac) {
    return res.status(400).json({ error: 'Missing mac parameter' });
  }
  const db = await dbPromise;
  const row = await db.get('SELECT data FROM robot_data WHERE mac = ?', mac);
  if (row) {
    try {
      const parsed = JSON.parse(row.data);
      return res.json(parsed);
    } catch (e) {
      return res.json({});
    }
  }
  return res.json({}); // 未找到返回空对象
});

// PUT /api/robot?mac=xxxx   - 保存或更新机器人数据
app.put('/api/robot', async (req, res) => {
  const mac = req.query.mac;
  const payload = req.body; // { fields: [...], updatedAt: '...' }
  if (!mac || !payload) {
    return res.status(400).json({ error: 'Missing mac or body' });
  }
  const dataStr = JSON.stringify(payload);
  const updatedAt = new Date().toISOString();
  const db = await dbPromise;
  await db.run(
    `INSERT INTO robot_data (mac, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(mac) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`,
    mac,
    dataStr,
    updatedAt
  );
  // 如需实时推送，可在此 emit 事件给前端（后续实现）
  io.emit('dataUpdated', { mac, payload });
  return res.json({ success: true });
});

// 启动 HTTP 服务器并绑定 Socket.IO
const httpServer = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
io.on('connection', (socket) => {
  console.log('🟢 Client connected', socket.id);
});
