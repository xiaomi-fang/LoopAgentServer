// ProjectEdit - 全屏沉浸式项目编辑
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  const STATUS_OPTIONS = [
    { value: 'planning', label: '规划中' },
    { value: 'planned', label: '规划完毕' },
    { value: 'under_review', label: '审核中' },
    { value: 'review_failed', label: '审核不通过' },
    { value: 'review_passed', label: '审核通过' },
    { value: 'in_development', label: '研发中' },
    { value: 'development_paused', label: '研发暂停' },
  ];

  function ProjectEdit({ mode, projectId, onClose, setMessage, isAdmin }) {
    const [form, setForm] = useState({
      name: '', description: '', goal: '', githubUrl: '', creatorAgentId: '', status: 'planning',
    });
    const [agents, setAgents] = useState([]);
    const [saving, setSaving] = useState(false);
    const isEdit = mode === 'edit';

    useEffect(() => {
      api.get('/agents').then(r => setAgents(r.data || [])).catch(() => {});
      if (isEdit && projectId) {
        api.get('/projects').then(r => {
          const p = (r.data || []).find(x => x.id === projectId);
          if (p) {
            setForm({
              name: p.name || '',
              description: p.description || '',
              goal: p.goal || '',
              githubUrl: p.githubUrl || '',
              creatorAgentId: p.creatorAgentId || '',
              status: p.status || 'planning',
            });
          }
        }).catch(() => setMessage({ type: 'error', content: '获取项目信息失败' }));
      }
    }, [mode, projectId]);

    const handleSave = async () => {
      if (!form.name || !form.githubUrl || !form.creatorAgentId) {
        setMessage({ type: 'error', content: '项目名称、GitHub 链接和主智能体为必填项' });
        return;
      }
      setSaving(true);
      try {
        if (isEdit) {
          await api.put(`/projects/${projectId}`, {
            name: form.name, description: form.description, goal: form.goal,
            github_url: form.githubUrl, status: form.status,
          });
          setMessage({ type: 'success', content: '项目已更新' });
        } else {
          await api.post('/projects', {
            name: form.name, description: form.description, goal: form.goal,
            github_url: form.githubUrl, creator_agent_id: form.creatorAgentId,
          });
          setMessage({ type: 'success', content: '项目创建成功！' });
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
        <div className="bg-white border-b px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => onClose(false)}
              className="text-gray-400 hover:text-gray-600 transition text-lg sm:text-xl p-1">
              <i className="fas fa-times"></i>
            </button>
            <h2 className="text-base sm:text-xl font-bold text-gray-800">
              <i className={`fas ${isEdit ? 'fa-edit' : 'fa-plus-circle'} mr-1 sm:mr-2 text-blue-500`}></i>
              {isEdit ? '编辑项目' : '新建项目'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onClose(false)}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-500 hover:text-gray-700 border rounded transition">
              取消
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 sm:px-6 py-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50 flex items-center gap-1 sm:gap-2">
              {saving ? <><i className="fas fa-spinner fa-spin"></i><span className="hidden sm:inline">保存中...</span></> : <><i className="fas fa-save"></i><span className="hidden sm:inline">保存</span></>}
            </button>
          </div>
        </div>

        {/* 编辑区 */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
                <i className="fas fa-info-circle text-blue-400"></i>基本信息
              </h3>

              <div className="space-y-5">
                {/* 项目名称 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">项目名称 <span className="text-red-500">*</span></label>
                  <input value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition"
                    placeholder="请输入项目名称" autoFocus />
                </div>

                {/* GitHub 链接 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">GitHub 链接 <span className="text-red-500">*</span></label>
                  <input value={form.githubUrl}
                    onChange={e => setForm({...form, githubUrl: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition"
                    placeholder="https://github.com/username/repo" />
                </div>

                {/* 主智能体 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">主智能体 <span className="text-red-500">*</span></label>
                  <select value={form.creatorAgentId}
                    onChange={e => setForm({...form, creatorAgentId: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition bg-white"
                    disabled={isEdit}>
                    <option value="">请选择主智能体</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}（{a.role}）</option>
                    ))}
                  </select>
                  {isEdit && <p className="text-xs text-gray-400 mt-1">创建后不可修改</p>}
                </div>

                {/* 目标 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">项目目标</label>
                  <textarea value={form.goal}
                    onChange={e => setForm({...form, goal: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition"
                    placeholder="描述项目的核心目标" rows={3} />
                </div>

                {/* 描述 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">项目描述</label>
                  <textarea value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition"
                    placeholder="详细描述项目内容" rows={4} />
                </div>

                {/* 状态 */}
                {isEdit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">审核状态</label>
                    <select value={form.status}
                      onChange={e => setForm({...form, status: e.target.value})}
                      className="w-full border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition bg-white">
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.LoopAgent.ProjectEdit = ProjectEdit;
})();
