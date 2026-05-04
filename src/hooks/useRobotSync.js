// useRobotSync.js
// 自定义 Hook：实现机器人数据自动同步
// 参数 mac 为机器人的 MAC 地址，用于唯一标识并从后端获取实时数据。
import { useState, useEffect } from 'react';

/**
 * useRobotSync - 同步机器人状态数据
 * @param {string} mac - 机器人的 MAC 地址
 * @returns {{ data: object, isSyncing: boolean }}
 *   data: 最近一次从 API 获得的完整响应对象（默认 {}）
 *   isSyncing: 正在请求期间为 true，可用于页面加载指示器
 */
export default function useRobotSync(mac) {
  // 存储机器人实时状态
  const [data, setData] = useState({});
  // 同步状态，用于前端展示加载小图标（如 spinner）
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 如果未提供 MAC 地址，则不启动同步任务
    if (!mac) return;

    // 拉取最新数据的核心函数
    const fetchLatestData = async () => {
      setIsSyncing(true);
      try {
        // 请求路径指向已部署的 Cloudflare Pages Function 接口
        const response = await fetch(`/api/robot?mac=${encodeURIComponent(mac)}`);
        if (response.ok) {
          const json = await response.json();
          setData(json); // 将云端最新数据同步到前端
        }
      } catch (err) {
        console.error('同步失败：网络异常或 API 报错', err);
      } finally {
        setIsSyncing(false);
      }
    };

    // 初始执行：页面加载时立即同步一次
    fetchLatestData();
    // 每隔 5 秒自动拉取一次最新状态（可根据业务需求自行调整）
    const timer = setInterval(fetchLatestData, 5000);
    // 清理定时器，防止内存泄漏或页面切换后仍持续请求
    return () => clearInterval(timer);
  }, [mac]); // 仅当 MAC 地址改变时重启同步逻辑

  return { data, isSyncing };
}
