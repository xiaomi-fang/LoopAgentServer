// TaskEdit - 全屏沉浸式任务编辑
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function TaskEdit({ mode, projectId, taskId, onClose, setMessage, isAdmin }) {
    const [form, setForm] = useState({
      title: '', objective: '', acceptanceCriteria: '', assigneeAgentId: '', reviewerAgentId: '',
    });
    const [agents, setAgents] = useState([]);
    const [saving, setSaving] = useState(false);
    const isEdit = mode === 'edit';

    useEffect(() => {
      api.get('/agents').then(r => setAgents(r.data || [])).catch(() => {});
      if (isEdit && taskId) {
        api.get('/tasks').then(r => {
          const t = (r.data || []).find(x => x.id === taskId);
          if (t) {
            setForm({
              title: t.title || '',
              objective: t.objective || '',
              acceptanceCriteria: t.acceptanceCriteria || '',
              assigneeAgentId: t.assigneeAgentId || '',
              reviewerAgentId: t.reviewerAgentId || '',
            });
          }
        }).catch(() => setMessage({ type: 'error', content: '获取任务信息失败' }));
      }
    }, [mode, taskId]);

    const handleSave = async () => {
      if (!form.title) {
        setMessage({ type: 'error', content: '任务标题为必填项' });
        return;
      }
      if (!form.assigneeAgentId) {
        setMessage({ type: 'error', content: '请选择执行者' });
        return;
      }
      if (!form.reviewerAgentId) {
        setMessage({ type: 'error', content: '请选择审核者' });
        return;
      }
      setSaving(true);
      try {
        if (isEdit) {
          await api.put(`/tasks/${taskId}`, {
            title: form.title, objective: form.objective,
            acceptance_criteria: form.acceptanceCriteria,
            assignee_agent_id: form.assigneeAgentId,
            reviewer_agent_id: form.reviewerAgentId,
          });
          setMessage({ type: 'success', content: '任务已更新' });
        } else {
          await api.post('/tasks', {
            project_id: projectId, title: form.title, objective: form.objective,
            acceptance_criteria: form.acceptanceCriteria,
            creator_agent_id: form.assigneeAgentId,
            assignee_agent_id: form.assigneeAgentId,
            reviewer_agent_id: form.reviewerAgentId,
          });
          setMessage({ type: 'success', content: '任务创建成功！' });
        }
        onClose(true);
      } catch (err) {
        setMessage({ type: 'error', content: isEdit ? '更新失败' : '创建失败' });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-gray-50">
        {/* 顶栏 */}
        <div className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600 transition text-xl">
              <i className="fas fa-times"></i>
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              <i className={`fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} mr-2 text-indigo-500`}></i>
              {isEdit ? '编辑任务' : '新建任务'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onClose(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded transition">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded transition disabled:opacity-50 flex items-center gap-2">
              {saving ? <><i className="fas fa-spinner fa-spin"></i>保存中...</> : <><i className="fas fa-save"></i>保存</>}
            </button>
          </div>
        </div>

        {/* 编辑区 */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-8">
            <div className="bg-white rounded-xl shadow-sm border p-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
                <i className="fas fa-tasks text-indigo-400"></i>任务信息
              </h3>

              <div className="space-y-5">
                {/* 任务标题 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">任务标题 <span className="text-red-500">*</span></label>
                  <input value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    placeholder="请输入任务标题" autoFocus />
                </div>

                {/* 任务目标 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">任务目标</label>
                  <textarea value={form.objective}
                    onChange={e => setForm({...form, objective: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    placeholder="描述任务的目标" rows={3} />
                </div>

                {/* 验收标准 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">验收标准</label>
                  <textarea value={form.acceptanceCriteria}
                    onChange={e => setForm({...form, acceptanceCriteria: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                    placeholder="描述任务的验收标准" rows={3} />
                </div>

                {/* 执行者 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">执行者 <span className="text-red-500">*</span></label>
                  <select value={form.assigneeAgentId}
                    onChange={e => setForm({...form, assigneeAgentId: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition bg-white">
                    <option value="">请选择执行者</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}（{a.role}）</option>
                    ))}
                  </select>
                </div>

                {/* 审核者 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">审核者 <span className="text-red-500">*</span></label>
                  <select value={form.reviewerAgentId}
                    onChange={e => setForm({...form, reviewerAgentId: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition bg-white">
                    <option value="">请选择审核者</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}（{a.role}）</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.LoopAgent.TaskEdit = TaskEdit;
})();
