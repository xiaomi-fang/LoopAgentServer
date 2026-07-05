// LoginModal 超级管理员登录弹窗
(function() {
  const { useState } = React;
  const api = window.LoopAgent.api;

  function LoginModal({ onClose, onLoginSuccess, setMessage }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
      if (!username || !password) {
        setMessage({ type: 'error', content: '请输入用户名和密码' });
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: 'error', content: data.error || '登录失败' });
          return;
        }
        onLoginSuccess({ token: data.token, username: data.username, role: data.role });
        setMessage({ type: 'success', content: `欢迎回来，${data.username}！` });
        onClose();
      } catch (err) {
        setMessage({ type: 'error', content: '登录请求失败，请检查网络' });
      } finally {
        setLoading(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') handleLogin();
    };

    // 遮罩层
    return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50',
      onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
    },
      React.createElement('div', {
        className: 'bg-white rounded-lg shadow-xl p-8 w-96 max-w-full',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('h2', { className: 'text-xl font-bold mb-2 text-gray-800' }, '🔐 超级管理员登录'),
        React.createElement('p', { className: 'text-sm text-gray-500 mb-6' }, '登录后可管理所有资源（删除、编辑）'),
        React.createElement('div', { className: 'space-y-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '用户名'),
            React.createElement('input', {
              type: 'text', value: username,
              onChange: (e) => setUsername(e.target.value),
              onKeyDown: handleKeyDown,
              placeholder: '输入管理员用户名',
              className: 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400',
              autoFocus: true,
            })
          ),
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '密码'),
            React.createElement('input', {
              type: 'password', value: password,
              onChange: (e) => setPassword(e.target.value),
              onKeyDown: handleKeyDown,
              placeholder: '输入管理员密码',
              className: 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400',
            })
          ),
          React.createElement('div', { className: 'flex gap-3 mt-6' },
            React.createElement('button', {
              onClick: handleLogin, disabled: loading,
              className: 'flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm disabled:opacity-50',
            }, loading ? '登录中...' : '登录'),
            React.createElement('button', {
              onClick: onClose,
              className: 'flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition text-sm',
            }, '取消')
          )
        )
      )
    );
  }

  window.LoopAgent.LoginModal = LoginModal;
})();
