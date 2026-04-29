import React, { useState, useEffect, useCallback } from 'react';

/**
 * 工具函数：生成唯一 ID（用于动态字段的 key）
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  // ===================== 状态管理 =====================

  /**
   * mac: 当前机器人的 MAC 地址，从 URL 参数 ?mac= 中读取
   * 作用：用于唯一识别这台机器人，也是从 KV 存取数据的 key
   */
  const [mac, setMac] = useState('');

  /**
   * fields: 机器人信息的动态字段数组
   * 结构：[{ id: 'abc123', label: 'MAC 地址', value: 'AA:BB:CC' }, ...]
   * 用户可以自由添加/删除/修改这些字段
   */
  const [fields, setFields] = useState([]);

  /** 页面是否正在加载数据 */
  const [loading, setLoading] = useState(true);

  /** 是否正在保存数据到云端 */
  const [saving, setSaving] = useState(false);

  /** 是否存在未保存的修改（用于显示保存按钮的状态） */
  const [hasChanges, setHasChanges] = useState(false);

  /** 工具箱中"配置本地路径"区域的折叠/展开状态 */
  const [configOpen, setConfigOpen] = useState(false);

  /**
   * PuduInstaller 的本地路径
   * 持久化在 localStorage 中，因为这是每台电脑独立的配置
   */
  const [exePath, setExePath] = useState(() => {
    return localStorage.getItem('pudu_exe_path') || 'C:\\Pudu\\PuduInstaller.exe';
  });

  /** Toast 提示框的状态 */
  const [toast, setToast] = useState({ show: false, text: '' });

  /** 当前正在"已复制"状态的字段 ID（用于复制按钮动画） */
  const [copiedId, setCopiedId] = useState(null);

  /** 手动输入的 MAC 地址（无参数时的落地页用） */
  const [manualMac, setManualMac] = useState('');

  /** 已保存的设备列表 */
  const [deviceList, setDeviceList] = useState([]);

  /**
   * 设备类型检测：判断是否为 PC 端
   * 用于 PuduInstaller 按钮的权限控制
   */
  const isPC = !/Mobi|Android|iPhone/i.test(navigator.userAgent);

  // ===================== Toast 提示 =====================

  /** 显示底部 Toast 提示，2秒后自动消失 */
  const showToast = useCallback((text) => {
    setToast({ show: true, text });
    setTimeout(() => setToast({ show: false, text: '' }), 2500);
  }, []);

  // ===================== 数据加载与保存 =====================

  /**
   * 初始化：从 URL 参数中读取 MAC 地址，然后从 API 获取数据
   * 如果 URL 没有 ?mac= 参数，则显示落地页并加载设备列表
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const macParam = params.get('mac');
    if (macParam) {
      setMac(macParam);
      fetchData(macParam);
    } else {
      // 加载设备列表
      loadDeviceList();
      setLoading(false);
    }
  }, []);

  /** 每次修改 exePath 时，自动保存到 localStorage */
  useEffect(() => {
    localStorage.setItem('pudu_exe_path', exePath);
  }, [exePath]);

  /**
   * 从 Cloudflare API 获取机器人数据
   * 输入：macAddr — 机器人的 MAC 地址
   * 行为：成功则填充 fields，失败则回退到 localStorage
   */
  const fetchData = async (macAddr) => {
    try {
      const res = await fetch(`/api/robot?mac=${encodeURIComponent(macAddr)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.fields && data.fields.length > 0) {
          setFields(data.fields);
        } else {
          initDefaultFields(macAddr);
        }
      } else {
        initDefaultFields(macAddr);
      }
    } catch {
      // API 不可用（本地开发时），尝试从 localStorage 读取
      const saved = localStorage.getItem(`robot_${macAddr}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFields(parsed.fields || []);
        } catch {
          initDefaultFields(macAddr);
        }
      } else {
        initDefaultFields(macAddr);
      }
    }
    setLoading(false);
  };

  /**
   * 初始化默认字段（新机器人首次被访问时使用）
   * 自动创建 4 个常用字段，MAC 地址从 URL 参数预填
   * 并自动保存到 localStorage
   */
  const initDefaultFields = (macAddr) => {
    const newFields = [
      { id: generateId(), label: 'MAC 地址', value: macAddr },
      { id: generateId(), label: '安装固件版本', value: '' },
      { id: generateId(), label: '本体APK版本', value: '' },
      { id: generateId(), label: '建图工具版本', value: '' },
    ];
    setFields(newFields);

    // 自动保存新设备数据
    const payload = { fields: newFields, updatedAt: new Date().toISOString() };
    localStorage.setItem(`robot_${macAddr}`, JSON.stringify(payload));

    // 添加到设备列表
    addToDeviceList(macAddr);
  };

  /**
   * 将设备添加到设备列表（去重）
   */
  const addToDeviceList = (macAddr) => {
    const normalizedMac = macAddr.toUpperCase();
    const listStr = localStorage.getItem('robot_list');
    let list = [];

    if (listStr) {
      try {
        list = JSON.parse(listStr);
      } catch {
        list = [];
      }
    }

    // 去重：检查是否已存在（不区分大小写）
    if (!list.some(item => item.mac.toUpperCase() === normalizedMac)) {
      list.push({
        mac: normalizedMac,
        addedAt: new Date().toISOString()
      });
      localStorage.setItem('robot_list', JSON.stringify(list));
    }
  };

  /**
   * 从 localStorage 加载设备列表
   */
  const loadDeviceList = () => {
    const listStr = localStorage.getItem('robot_list');
    if (listStr) {
      try {
        const list = JSON.parse(listStr);
        setDeviceList(list);
      } catch {
        setDeviceList([]);
      }
    } else {
      setDeviceList([]);
    }
  };

  /**
   * 从设备列表中删除设备
   */
  const deleteDevice = (macAddr) => {
    const normalizedMac = macAddr.toUpperCase();
    const listStr = localStorage.getItem('robot_list');
    if (listStr) {
      try {
        let list = JSON.parse(listStr);
        list = list.filter(item => item.mac.toUpperCase() !== normalizedMac);
        localStorage.setItem('robot_list', JSON.stringify(list));
        setDeviceList(list);

        // 同时删除设备数据
        localStorage.removeItem(`robot_${macAddr}`);
        showToast('🗑️ 设备已删除');
      } catch {
        showToast('❌ 删除失败');
      }
    }
  };

  /**
   * 保存数据到 Cloudflare KV（通过 API）
   * 如果 API 不可用，回退保存到 localStorage
   */
  const saveData = async () => {
    setSaving(true);
    const payload = { fields, updatedAt: new Date().toISOString() };
    try {
      const res = await fetch(`/api/robot?mac=${encodeURIComponent(mac)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast('✅ 数据已保存到云端');
      } else {
        throw new Error('API error');
      }
    } catch {
      // API 不可用时回退到 localStorage
      localStorage.setItem(`robot_${mac}`, JSON.stringify(payload));
      showToast('💾 已保存到本地（API 离线）');
    }
    setSaving(false);
    setHasChanges(false);

    // 确保设备在列表中
    addToDeviceList(mac);
  };

  // ===================== 字段操作 =====================

  /**
   * 修改某个字段的标签（名称）
   * 输入：id — 字段 ID，newLabel — 新的标签名称
   */
  const updateFieldLabel = (id, newLabel) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, label: newLabel } : f));
    setHasChanges(true);
  };

  /**
   * 修改某个字段的值
   * 输入：id — 字段 ID，newValue — 新的值
   */
  const updateFieldValue = (id, newValue) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value: newValue } : f));
    setHasChanges(true);
  };

  /**
   * 删除某个字段
   * 输入：id — 要删除的字段 ID
   */
  const deleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    setHasChanges(true);
  };

  /** 添加一个新的空白字段 */
  const addField = () => {
    setFields(prev => [...prev, { id: generateId(), label: '新字段', value: '' }]);
    setHasChanges(true);
  };

  /**
   * 复制某个字段的值到剪贴板
   * 输入：id — 字段 ID，value — 要复制的值
   */
  const handleCopy = (id, value) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    showToast('已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ===================== 工具箱操作 =====================

  /**
   * 生成并下载 .reg 注册表文件
   * 作用：在 Windows 上注册 pudu:// 协议，使浏览器能唤起本地 PuduInstaller
   */
  const generateRegFile = () => {
    const formattedPath = exePath.replace(/\\/g, '\\\\');
    const regContent = `Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\pudu]
@="URL:Pudu Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\pudu\\shell]

[HKEY_CLASSES_ROOT\\pudu\\shell\\open]

[HKEY_CLASSES_ROOT\\pudu\\shell\\open\\command]
@="\\"${formattedPath}\\""`;

    const blob = new Blob([regContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'setup_pudu_protocol.reg';
    link.click();
    showToast('📥 注册表脚本已下载');
  };

  /**
   * 打开 PuduInstaller
   * 仅 PC 端可用，通过自定义协议 pudu://open 唤起
   */
  const handleOpenInstaller = () => {
    if (isPC) {
      window.location.href = 'pudu://open';
    } else {
      showToast('⚠️ 只有PC端才能使用此功能');
    }
  };

  /**
   * 手动跳转到指定 MAC 的机器人页面
   * 用于落地页的手动输入功能
   */
  const handleManualNavigate = () => {
    if (manualMac.trim()) {
      window.location.href = `?mac=${encodeURIComponent(manualMac.trim())}`;
    }
  };

  // ===================== 渲染：加载状态 =====================

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">正在加载机器人数据...</p>
        </div>
      </div>
    );
  }

  // ===================== 渲染：落地页（无 MAC 参数） =====================

  if (!mac) {
    return (
      <div className="app-container">
        <div className="app-content">
          <header className="app-header">
            <h1>Robot_Management_Terminal</h1>
            <div className="header-line" />
          </header>

          <div className="card landing-card">
            <div className="landing-icon">📱</div>
            <h2 className="landing-title">请扫描机器人二维码</h2>
            <p className="landing-desc">扫描贴在机器人上的二维码，即可查看该机器人的详细信息</p>

            <div className="landing-divider">
              <span>或</span>
            </div>

            <label className="landing-label">手动输入 MAC 地址（查看或添加设备）</label>
            <div className="landing-input-group">
              <input
                className="landing-input"
                placeholder="例如：AA:BB:CC:DD:EE:FF"
                value={manualMac}
                onChange={(e) => setManualMac(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualNavigate()}
                id="manual-mac-input"
              />
              <button
                className="landing-go-btn"
                onClick={handleManualNavigate}
                disabled={!manualMac.trim()}
                id="manual-go-btn"
              >
                GO
              </button>
            </div>
          </div>

          {/* 已保存的设备列表 */}
          {deviceList.length > 0 && (
            <div className="card device-list-card">
              <div className="card-title">
                <span className="icon">📋</span>
                已保存的设备 ({deviceList.length})
              </div>
              <div className="device-list">
                {deviceList.map((device) => (
                  <div className="device-item" key={device.mac}>
                    <div className="device-info">
                      <div className="device-mac">{device.mac}</div>
                      <div className="device-time">
                        添加于 {new Date(device.addedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="device-actions">
                      <button
                        className="device-btn view-btn"
                        onClick={() => window.location.href = `?mac=${encodeURIComponent(device.mac)}`}
                      >
                        查看
                      </button>
                      <button
                        className="device-btn delete-btn"
                        onClick={() => deleteDevice(device.mac)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== 渲染：主页面（有 MAC 参数） =====================

  return (
    <div className="app-container">
      <div className="app-content">

        {/* 页面标题 */}
        <header className="app-header">
          <div className="header-top">
            <h1>Robot_Management_Terminal</h1>
            <button
              className="back-home-btn"
              onClick={() => window.location.href = '/'}
              title="返回主页"
            >
              ← 返回主页
            </button>
          </div>
          <div className="header-line" />
        </header>

        {/* 主要内容区：PC端两栏，手机端单栏 */}
        <div className="main-layout">

          {/* ===== 左栏：机器人信息 ===== */}
          <section className="card info-card" id="robot-info-card">
            <div className="card-title">
              <span className="icon">🤖</span>
              机器人信息
            </div>

            {/* 动态字段列表 */}
            <div className="info-grid">
              {fields.map((field) => (
                <div className="field-row" key={field.id}>
                  {/* 标签（可编辑） */}
                  <input
                    className="field-label"
                    value={field.label}
                    onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                    title="点击编辑字段名称"
                    id={`label-${field.id}`}
                  />
                  {/* 值（可编辑） */}
                  <div className="field-value-group">
                    <input
                      className="field-value"
                      value={field.value}
                      onChange={(e) => updateFieldValue(field.id, e.target.value)}
                      placeholder="待填写"
                      id={`value-${field.id}`}
                    />
                    {/* 复制按钮 */}
                    <button
                      className={`copy-btn ${copiedId === field.id ? 'copied' : ''}`}
                      onClick={() => handleCopy(field.id, field.value)}
                      title="复制"
                    >
                      {copiedId === field.id ? '✓' : '⧉'}
                    </button>
                    {/* 删除按钮 */}
                    <button
                      className="delete-btn"
                      onClick={() => deleteField(field.id)}
                      title="删除此行"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 添加新字段 */}
            <button className="add-field-btn" onClick={addField} id="add-field-btn">
              <span>＋</span> 添加信息字段
            </button>

            {/* 保存按钮 */}
            <button
              className={`save-btn ${hasChanges ? 'has-changes' : ''}`}
              onClick={saveData}
              disabled={saving || !hasChanges}
              id="save-btn"
            >
              {saving ? (
                <>
                  <span className="save-spinner" />
                  保存中...
                </>
              ) : hasChanges ? (
                <>💾 保存修改</>
              ) : (
                <>✅ 已是最新</>
              )}
            </button>
          </section>

          {/* ===== 右栏：工具箱 ===== */}
          <section className="card toolbox-card" id="toolbox-card">
            <div className="card-title">
              <span className="icon">🔧</span>
              工具箱
            </div>

            {/* 可折叠：配置本地路径 */}
            <div className="toolbox-section">
              <button
                className="config-toggle"
                onClick={() => setConfigOpen(!configOpen)}
                id="config-toggle-btn"
              >
                <span className="config-toggle-left">
                  <span className="icon">⚙️</span>
                  配置本地应用路径（仅需一次）
                </span>
                <span className={`config-chevron ${configOpen ? 'open' : ''}`}>▼</span>
              </button>

              <div className={`config-body ${configOpen ? 'open' : ''}`}>
                <input
                  className="config-input"
                  placeholder="例如: C:\Tools\PuduInstaller.exe"
                  value={exePath}
                  onChange={(e) => setExePath(e.target.value)}
                  id="exe-path-input"
                />
                <button
                  className="config-download-btn"
                  onClick={generateRegFile}
                  id="download-reg-btn"
                >
                  📥 生成并下载环境修复脚本
                </button>
              </div>
            </div>

            {/* 工具按钮列表 */}
            <div className="toolbox-actions">
              <button
                className="action-btn primary"
                onClick={handleOpenInstaller}
                id="open-installer-btn"
              >
                <img src="/icon-installer.svg" alt="PuduInstaller" className="btn-icon" />
                打开 PuduInstaller
              </button>

              <a
                href="https://cs-internal.pudutech.com/equipmentCenter/product-library"
                target="_blank"
                rel="noopener noreferrer"
                className="action-btn secondary"
                id="jump-pudutech-btn"
              >
                <img src="/icon-pudu.svg" alt="PUDU" className="btn-icon btn-icon-pudu" />
                跳转到 pudutech
              </a>

              <button
                className="action-btn ghost"
                onClick={() => showToast('功能待完善~~~')}
                id="open-on-pc-btn"
              >
                <span className="action-icon">💻</span>
                在我的电脑上打开此网页
              </button>
            </div>
          </section>

        </div>
      </div>

      {/* Toast 通知 */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>
        {toast.text}
      </div>
    </div>
  );
}

export default App;