// Projects 项目管理模块
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Projects({ setMessage }) {
    const [projects, setProjects] = useState([]);
    const [agents, setAgents] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', goal: '', acceptanceCriteria: '', creatorAgentId: '' });
    const [loading, setLoading] = useState(false);

    const fetchData = () => {
      setLoading(true);
      Promise.all([api.get('/projects'), api.get('/agents')])
        .then(([p, a]) => {
          setProjects(p.data || []);
          setAgents(a.data || []);
        })
        .catch(() => setMessage({ type: 'error', content: '获取数据失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async () => {
      if (!form.name || !form.creatorAgentId) return;
      try {
        await api.post('/projects', {
          name: form.name,
          description: form.description,
          goal: form.goal,
          acceptance_criteria: form.acceptanceCriteria,
          creator_agent_id: form.creatorAgentId,
        });
        setForm({ name: '', description: '', goal: '', acceptanceCriteria: '', creatorAgentId: '' });
        setShowForm(false);
        setMessage({ type: 'success', content: `项目「${form.name}」创建成功！` });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '创建项目失败' });
      }
    };

    const statusMap = { planning: '规划中', in_progress: '进行中', done: '已完成', paused: '已暂停' };
    const statusColor = { planning: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700', paused: 'bg-amber-100 text-amber-700' };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📁 项目管理</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
            {showForm ? '✕ 取消' : '✚ 新建项目'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">新建项目</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="项目名称" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <textarea placeholder="项目描述" value={form.description} rows={2}
                onChange={e => setForm({...form, description: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <input placeholder="项目目标" value={form.goal}
                onChange={e => setForm({...form, goal: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="验收标准" value={form.acceptanceCriteria}
                onChange={e => setForm({...form, acceptanceCriteria: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <select value={form.creatorAgentId}
                onChange={e => setForm({...form, creatorAgentId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择创建者（智能体）</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
              </select>
              <button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm">
                确认创建
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.length === 0 ? (
              <div className="card col-span-2 text-center py-8 text-gray-400">暂无项目，点击上方按钮新建</div>
            ) : projects.map(p => (
              <div key={p.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <span className={`badge ${statusColor[p.status] || 'bg-gray-100'}`}>
                    {statusMap[p.status] || p.status}
                  </span>
                </div>
                {p.description && <p className="text-gray-500 text-sm mb-2">{p.description}</p>}
                {p.goal && <p className="text-xs text-gray-400 mb-1">🎯 目标：{p.goal}</p>}
                <p className="text-xs text-gray-400">
                  创建者：{agents.find(a => a.id === p.creatorAgentId)?.name || p.creatorAgentId}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  创建时间：{new Date(p.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.Projects = Projects;
})();
