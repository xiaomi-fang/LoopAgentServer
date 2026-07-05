// API 客户端模块 - 含超级管理员认证
(function() {
  const BASE_URL = 'http://localhost:3000';
  let authToken = localStorage.getItem('admin_token') || null;
  let authUsername = localStorage.getItem('admin_username') || null;

  window.LoopAgent.api = {
    // 基础请求方法（自动携带 token）
    async request(url, options = {}) {
      const headers = { ...options.headers };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      const res = await fetch(`${BASE_URL}${url}`, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      return { data, status: res.status };
    },

    async get(url) {
      const res = await fetch(`${BASE_URL}${url}`);
      return { data: await res.json() };
    },

    async post(url, body) {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { data: await res.json() };
    },

    async patch(url, body) {
      const res = await fetch(`${BASE_URL}${url}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return { data: await res.json() };
    },

    // ---- 超级管理员认证方法 ---- //

    // 登录
    async login(username, password) {
      const result = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (result.data.token) {
        authToken = result.data.token;
        authUsername = result.data.username;
        localStorage.setItem('admin_token', authToken);
        localStorage.setItem('admin_username', authUsername);
      }
      return result.data;
    },

    // 登出
    logout() {
      authToken = null;
      authUsername = null;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
    },

    // 检查是否已登录
    isLoggedIn() {
      return !!authToken;
    },

    // 获取当前用户名
    getUsername() {
      return authUsername || 'admin';
    },

    // ---- 管理员操作（自动携带 token） ---- //

    async delete(url) {
      return this.request(url, { method: 'DELETE' });
    },

    async put(url, body) {
      return this.request(url, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
  };
})();
