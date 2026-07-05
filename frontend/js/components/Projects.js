// Projects 项目管理 - 含审核状态 + 内嵌任务树
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  const REVIEW_STATUS_MAP = {
    pending_activation: '待激活',
    planning: '规划中', planned: '规划完毕',
    under_review: '审核中', review_failed: '审核不通过', review_passed: '审核通过',
    in_development: '研发中', development_paused: '研发暂停', completed: '已完成',
  };
  const REVIEW_STATUS_COLORS = {
    pending_activation: 'bg-gray-100 text-gray-400',
    planning: 'bg-gray-100 text-gray-500', planned: 'bg-teal-100 text-teal-700',
    under_review: 'bg-yellow-100 text-yellow-700', review_failed: 'bg-red-100 text-red-600',
    review_passed: 'bg-green-100 text-green-600', in_development: 'bg-blue-100 text-blue-600',
    development_paused: 'bg-orange-100 text-orange-600', completed: 'bg-green-100 text-green-700',
  };
  const ADMIN_STATUS_OPTIONS = [
    { value: 'pending_activation', label: '待激活' },
    { value: 'planning', label: '规划中' }, { value: 'planned', label: '规划完毕' },
    { value: 'under_review', label: '审核中' }, { value: 'review_failed', label: '审核不通过' },
    { value: 'review_passed', label: '审核通过' }, { value: 'in_development', label: '研发中' },
    { value: 'development_paused', label: '研发暂停' },
  ];

  function Projects({ setMessage, onOpenProjectDetail, onOpenProjectEdit, isAdmin }) {
    const [projects, setProjects] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = () => {
      setLoading(true);
      Promise.all([api.get('/projects'), api.get('/agents')])
        .then(([p, a]) => { setProjects(p.data || []); setAgents(a.data || []); })
        .catch(() => setMessage({ type: 'error', content: '获取数据失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handleStatusChange = async (projectId, newStatus, e) => {
      e.stopPropagation();
      try { await api.put(`/projects/${projectId}`, { status: newStatus }); setMessage({ type: 'success', content: '状态已更新' }); fetchData(); }
      catch (err) { setMessage({ type: 'error', content: '更新失败' }); }
    };

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            <i className="fas fa-folder mr-2 text-gray-400"></i>项目管理
          </h1>
          <button onClick={() => onOpenProjectEdit && onOpenProjectEdit('create', null)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm flex items-center justify-center">
            <i className="fas fa-plus-circle mr-2"></i>新建项目
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <i className="fas fa-folder-open text-4xl mb-3"></i>
            <p>暂无项目</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map(project => {
              const creator = agents.find(a => a.id === project.creatorAgentId);
              return (
                <div key={project.id} className="card hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onOpenProjectDetail && onOpenProjectDetail(project.id)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{project.name}</h3>
                    </div>
                    {isAdmin ? (
                      <select value={project.status}
                        onClick={e => e.stopPropagation()}
                        onChange={e => handleStatusChange(project.id, e.target.value, e)}
                        className={`text-xs px-2 py-0.5 rounded border ${REVIEW_STATUS_COLORS[project.status] || 'bg-gray-100'} cursor-pointer`}>
                        {ADMIN_STATUS_OPTIONS.map(opt =>
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        )}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${REVIEW_STATUS_COLORS[project.status] || 'bg-gray-100'}`}>
                        {REVIEW_STATUS_MAP[project.status] || project.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{project.description || '暂无描述'}</p>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                    <span><i className="fas fa-user mr-1"></i>{creator ? creator.name : project.creatorAgentId}</span>
                    <span><i className="fas fa-calendar mr-1"></i>{new Date(project.createdAt).toLocaleDateString()}</span>
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" onClick={e => e.stopPropagation()}
                        className="text-blue-500 hover:underline"><i className="fab fa-github mr-1"></i>GitHub</a>
                    )}
                  </div>
                  {/* 管理员操作 */}
                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onOpenProjectEdit && onOpenProjectEdit('edit', project.id)}
                        className="text-xs bg-blue-100 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-200 flex items-center">
                        <i className="fas fa-edit mr-1"></i>编辑
                      </button>
                      <button onClick={async (e) => {
                        if (!confirm(`确定删除项目「${project.name}」？`)) return;
                        try { await api.delete(`/projects/${project.id}`); setMessage({ type: 'success', content: '项目已删除' }); fetchData(); }
                        catch (err) { setMessage({ type: 'error', content: '删除失败' }); }
                      }} className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded hover:bg-red-200 flex items-center">
                        <i className="fas fa-trash-alt mr-1"></i>删除
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.Projects = Projects;
})();
