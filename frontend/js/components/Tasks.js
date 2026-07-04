// Tasks 任务看板模块
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Tasks({ setMessage }) {
    const [tasks, setTasks] = useState([]);
    const [agents, setAgents] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ projectId: '', title: '', objective: '', acceptanceCriteria: '', creatorAgentId: '', reviewerAgentId: '' });

    const fetchData = () => {
      setLoading(true);
      Promise.all([api.get('/tasks'), api.get('/agents'), api.get('/projects')])
        .then(([t, a, p]) => {
          setTasks(t.data || []);
          setAgents(a.data || []);
          setProjects(p.data || []);
        })
        .catch(() => setMessage({ type: 'error', content: '获取任务数据失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async () => {
      if (!form.title || !form.projectId || !form.creatorAgentId) return;
      try {
        await api.post('/tasks', {
          project_id: form.projectId,
          title: form.title,
          objective: form.objective,
          acceptance_criteria: form.acceptanceCriteria,
          creator_agent_id: form.creatorAgentId,
          reviewer_agent_id: form.reviewerAgentId || undefined,
        });
        setForm({ projectId: '', title: '', objective: '', acceptanceCriteria: '', creatorAgentId: '', reviewerAgentId: '' });
        setShowForm(false);
        setMessage({ type: 'success', content: `任务「${form.title}」创建成功！` });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '创建任务失败' });
      }
    };

    const handleClaim = async (taskId) => {
      const idleAgent = agents.find(a => a.status === 'idle');
      if (!idleAgent) { setMessage({ type: 'error', content: '没有空闲智能体可认领任务' }); return; }
      try {
        await api.post('/tasks/claim', { task_id: taskId, agent_id: idleAgent.id });
        setMessage({ type: 'success', content: `任务已由「${idleAgent.name}」认领` });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '认领失败' }); }
    };

    const handleSubmitReview = async (taskId) => {
      try {
        await api.patch(`/tasks/${taskId}/status`, { status: 'pending_review', submit_note: '提交审核' });
        setMessage({ type: 'success', content: '任务已提交审核' });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '提交审核失败' }); }
    };

    const handleReview = async (taskId, reviewerId, result) => {
      try {
        await api.post(`/tasks/${taskId}/review`, { reviewer_id: reviewerId, result, comment: result === 'pass' ? '审核通过' : '审核不通过' });
        setMessage({ type: 'success', content: `审核${result === 'pass' ? '通过' : '不通过'}` });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '审核操作失败' }); }
    };

    const statusMap = {
      pending: { label: '待处理', color: 'border-l-amber-400 bg-amber-50' },
      in_progress: { label: '进行中', color: 'border-l-blue-400 bg-blue-50' },
      pending_review: { label: '待审核', color: 'border-l-purple-400 bg-purple-50' },
      completed: { label: '已完成', color: 'border-l-green-400 bg-green-50' },
      failed: { label: '失败', color: 'border-l-red-400 bg-red-50' },
    };

    const columns = ['pending', 'in_progress', 'pending_review', 'completed'];
    const columnLabels = { pending: '📋 待处理', in_progress: '🔧 进行中', pending_review: '👀 待审核', completed: '✅ 已完成' };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📋 任务看板</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
            {showForm ? '✕ 取消' : '✚ 创建任务'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">创建新任务</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择所属项目</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input placeholder="任务标题" value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <textarea placeholder="任务目标" value={form.objective} rows={2}
                onChange={e => setForm({...form, objective: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <textarea placeholder="验收标准" value={form.acceptanceCriteria} rows={2}
                onChange={e => setForm({...form, acceptanceCriteria: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <select value={form.creatorAgentId} onChange={e => setForm({...form, creatorAgentId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择创建者</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={form.reviewerAgentId} onChange={e => setForm({...form, reviewerAgentId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择审核者（可选）</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <button onClick={handleCreate} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                确认创建
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {columns.map(col => {
              const colTasks = tasks.filter(t => t.status === col);
              return (
                <div key={col}>
                  <h3 className="font-semibold text-gray-700 mb-3 text-sm bg-gray-200 rounded px-3 py-2">
                    {columnLabels[col]}（{colTasks.length}）
                  </h3>
                  <div className="space-y-3">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm border rounded bg-white">空</div>
                    ) : colTasks.map(task => (
                      <div key={task.id} className={`card p-3 border-l-4 ${statusMap[task.status]?.color || ''}`}>
                        <div className="font-medium text-sm mb-1">{task.title}</div>
                        <div className="text-xs text-gray-500 mb-2 truncate">{task.objective}</div>
                        {task.assigneeAgentId && (
                          <div className="text-xs text-gray-400 mb-1">
                            执行人：{agents.find(a => a.id === task.assigneeAgentId)?.name || task.assigneeAgentId}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          {task.status === 'pending' && (
                            <button onClick={() => handleClaim(task.id)}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                              认领
                            </button>
                          )}
                          {task.status === 'in_progress' && (
                            <button onClick={() => handleSubmitReview(task.id)}
                              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">
                              提交审核
                            </button>
                          )}
                          {task.status === 'pending_review' && (
                            <>
                              <button onClick={() => handleReview(task.id, '54b284b1-dd19-43b7-b50c-625a16de0828', 'pass')}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                                通过
                              </button>
                              <button onClick={() => handleReview(task.id, '54b284b1-dd19-43b7-b50c-625a16de0828', 'fail')}
                                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">
                                拒绝
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.Tasks = Tasks;
})();
