// Agents 智能体管理 - 含在线状态、最近参与项目、查看详情
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Agents({ setMessage, onOpenAgentDetail }) {
    const [agents, setAgents] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', role: '', capabilities: '' });

    const fetchData = () => {
      setLoading(true);
      Promise.all([api.get('/agents'), api.get('/projects'), api.get('/tasks')])
        .then(([a, p, t]) => {
          setAgents(a.data || []);
          setProjects(p.data || []);
          setTasks(t.data || []);
        })
        .catch(() => setMessage({ type: 'error', content: '获取数据失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleRegister = async () => {
      if (!form.name || !form.role) return;
      try {
        await api.post('/agents', {
          name: form.name,
          role: form.role,
          capabilities: form.capabilities.split(',').map(s => s.trim()).filter(Boolean)
        });
        setForm({ name: '', role: '', capabilities: '' });
        setShowForm(false);
        setMessage({ type: 'success', content: '智能体注册成功！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '注册失败' });
      }
    };

    // 判断在线状态：10秒内有心跳为在线
    const isOnline = (agent) => {
      if (!agent.lastHeartbeat) return false;
      const diff = Date.now() - new Date(agent.lastHeartbeat).getTime();
      return diff < 10000;
    };

    // 获取智能体最近参与的项目（通过认领任务、创建任务、审核任务）
    const getAgentProjects = (agentId) => {
      const relatedTaskIds = tasks
        .filter(t => t.assigneeAgentId === agentId || t.creatorAgentId === agentId || t.reviewerAgentId === agentId)
        .map(t => t.projectId);
      const uniqueIds = [...new Set(relatedTaskIds)];
      return projects.filter(p => uniqueIds.includes(p.id)).slice(0, 3);
    };

    const statusLabel = { idle: '空闲', busy: '忙碌', offline: '离线' };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🤖 智能体管理</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
            {showForm ? '✕ 取消' : '✚ 注册新智能体'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">注册新智能体</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input placeholder="名称" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="角色" value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="能力（逗号分隔）" value={form.capabilities}
                onChange={e => setForm({...form, capabilities: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <button onClick={handleRegister}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm">
                ✚ 注册
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-gray-600">
                  <th className="py-3 text-left">名称</th>
                  <th className="py-3 text-left">角色</th>
                  <th className="py-3 text-left">能力</th>
                  <th className="py-3 text-left">状态</th>
                  <th className="py-3 text-left">在线状态</th>
                  <th className="py-3 text-left">最近参与项目</th>
                  <th className="py-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(agent => {
                  const online = isOnline(agent);
                  const agentProjects = getAgentProjects(agent.id);
                  return (
                    <tr key={agent.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 font-medium">{agent.name}</td>
                      <td className="py-3 text-gray-600">{agent.role}</td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(agent.capabilities || []).map((cap, i) => (
                            <span key={i} className="badge bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          agent.status === 'idle' ? 'bg-green-100 text-green-700' :
                          agent.status === 'busy' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {statusLabel[agent.status] || agent.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`flex items-center gap-1 text-xs ${
                          online ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          <span className={`w-2 h-2 rounded-full inline-block ${
                            online ? 'bg-green-500' : 'bg-gray-300'
                          }`}></span>
                          {online ? '在线' : '离线'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap">
                          {agentProjects.length === 0 ? (
                            <span className="text-gray-400 text-xs">无</span>
                          ) : (
                            agentProjects.map(p => (
                              <span key={p.id} className="badge bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                                {p.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <button onClick={() => onOpenAgentDetail(agent.id)}
                          className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200">
                          查看详情
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.Agents = Agents;
})();
