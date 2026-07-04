// API 客户端模块
(function() {
  const BASE_URL = 'http://localhost:3000';

  window.LoopAgent.api = {
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
    }
  };
})();
