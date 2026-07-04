// Agents 智能体管理模块
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Agents({ setMessage }) {
    const [agents, setAgents] = useState([]);
    const [form, setForm] = useState({ name: '', role: '', capabilities: '' });
    const [loading, setLoading] = useState(false);

    const fetchAgents = () => {
      setLoading(true);
      api.get('/agents')
        .then(res => { setAgents(res.data || []); })
        .catch(() => { setMessage({ type: 'error', content: '获取智能体列表失败' }); })
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchAgents(); }, []);

    const handleRegister = async () => {
      if (!form.name || !form.role) return;
      try {
        const caps = form.capabilities ? form.capabilities.split(',').map(s => s.trim()) : [];
        await api.post('/agents', {
          name: form.name,
          role: form.role,
          capabilities: caps,
        });
        setForm({ name: '', role: '', capabilities: '' });
        setMessage({ type: 'success', content: `智能体「${form.name}」注册成功！` });
        fetchAgents();
      } catch (err) {
        setMessage({ type: 'error', content: '注册智能体失败' });
      }
    };

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🤖 智能体管理</h1>

        {/* 注册表单 */}
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">注册新智能体</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input placeholder="名称" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="border rounded px-3 py-2 text-sm" />
            <input placeholder="角色" value={form.role} onChange={e => setForm({...form, role: e.target.value})}
              className="border rounded px-3 py-2 text-sm" />
            <input placeholder="能力（逗号分隔）" value={form.capabilities}
              onChange={e => setForm({...form, capabilities: e.target.value})}
              className="border rounded px-3 py-2 text-sm" />
            <button onClick={handleRegister}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
              ✚ 注册
            </button>
          </div>
        </div>

        {/* 智能体列表 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="card">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-gray-500 text-sm">
                  <th className="pb-3">名称</th><th className="pb-3">角色</th>
                  <th className="pb-3">能力</th><th className="pb-3">状态</th>
                </tr>
              </thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-400">暂无已注册的智能体</td></tr>
                ) : agents.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium">{a.name}</td>
                    <td className="py-3 text-gray-600">{a.role}</td>
                    <td className="py-3">
                      {(a.capabilities || []).map(c => (
                        <span key={c} className="badge bg-gray-100 text-gray-700 mr-1">{c}</span>
                      ))}
                    </td>
                    <td className="py-3">
                      <span className={`badge ${a.status === 'idle' ? 'bg-green-100 text-green-700' : a.status === 'busy' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.status === 'idle' ? '空闲' : a.status === 'busy' ? '忙碌' : a.status === 'offline' ? '离线' : a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.Agents = Agents;
})();
