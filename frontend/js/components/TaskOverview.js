// TaskOverview 任务概览 - 按状态过滤显示任务列表
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  const STATUS_LABELS = {
    pending: '待处理',
    unassigned: '未处理',
    in_progress: '进行中',
    pending_review: '待审核',
    completed: '已完成'
  };

  const STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-700',
    unassigned: 'bg-orange-100 text-orange-700',
    in_progress: 'bg-blue-100 text-blue-700',
    pending_review: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700'
  };

  function TaskOverview({ filter, onBack }) {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      Promise.all([api.get('/tasks'), api.get('/projects'), api.get('/agents')])
        .then(([t, p, a]) => {
          const allTasks = t.data || [];
          let filtered = allTasks;
          if (filter === 'unassigned') {
            filtered = allTasks.filter(t => t.status === 'pending' && !t.assigneeAgentId);
          } else {
            filtered = allTasks.filter(t => t.status === filter);
          }
          setTasks(filtered);
          setProjects(p.data || []);
          setAgents(a.data || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [filter]);

    const getProjectName = (projectId) => {
      const p = projects.find(x => x.id === projectId);
      return p ? p.name : projectId;
    };

    const getAgentName = (agentId) => {
      const a = agents.find(x => x.id === agentId);
      return a ? a.name : agentId;
    };

    const statusLabel = STATUS_LABELS[filter] || filter;

    return (
      <div>
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center">
          <i className="fas fa-arrow-left mr-2"></i> 返回仪表盘
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
          📋 {statusLabel}任务列表（{tasks.length}）
        </h1>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-check-circle text-4xl text-green-300 mb-4"></i>
            <p className="text-gray-500">暂无{statusLabel}任务</p>
          </div>
        ) : (
          <div>
            {/* 桌面端表格 */}
            <div className="hidden md:block card overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3 pl-2">标题</th>
                    <th className="pb-3">所属项目</th>
                    <th className="pb-3">状态</th>
                    <th className="pb-3">执行人</th>
                    <th className="pb-3">审核人</th>
                    <th className="pb-3">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pl-2 font-medium text-sm">{task.title}</td>
                      <td className="py-3 text-sm text-gray-600">{getProjectName(task.projectId)}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[task.status] || 'bg-gray-100'}`}>
                          {STATUS_LABELS[task.status] || task.status}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{task.assigneeAgentId ? getAgentName(task.assigneeAgentId) : '-'}</td>
                      <td className="py-3 text-sm text-gray-600">{task.reviewerAgentId ? getAgentName(task.reviewerAgentId) : '-'}</td>
                      <td className="py-3 text-sm text-gray-400">{new Date(task.createdAt).toLocaleString('zh-CN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* 移动端卡片 */}
            <div className="md:hidden space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="card">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-gray-800 truncate mr-2">{task.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${STATUS_COLORS[task.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[task.status] || task.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{getProjectName(task.projectId)}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{task.assigneeAgentId ? `执行：${getAgentName(task.assigneeAgentId)}` : ''}</span>
                    <span>{new Date(task.createdAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.TaskOverview = TaskOverview;
})();
