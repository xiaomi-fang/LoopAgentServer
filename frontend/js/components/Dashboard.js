// Dashboard 仪表盘模块 - 卡片可点击跳转
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Dashboard({ onNavigate, showTaskView, showProductView }) {
    const [stats, setStats] = useState({
      agents: 0, projects: 0, products: 0,
      pendingTasks: 0, unassignedTasks: 0, inProgressTasks: 0
    });

    useEffect(() => {
      Promise.all([
        api.get('/agents'),
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/products')
      ]).then(([a, p, t, pr]) => {
        const tasks = t.data || [];
        setStats({
          agents: (a.data || []).length,
          projects: (p.data || []).length,
          products: (pr.data || []).length,
          pendingTasks: tasks.filter(t => t.status === 'pending').length,
          unassignedTasks: tasks.filter(t => t.status === 'pending' && !t.assigneeAgentId).length,
          inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
        });
      }).catch(() => {});
    }, []);

    const cards = [
      { label: '智能体总数', value: stats.agents, icon: 'fa-robot', color: 'bg-blue-500', onClick: () => onNavigate('agents') },
      { label: '活跃项目', value: stats.projects, icon: 'fa-folder', color: 'bg-green-500', onClick: () => onNavigate('projects') },
      { label: '待处理任务', value: stats.pendingTasks, icon: 'fa-tasks', color: 'bg-amber-500', onClick: () => showTaskView('pending') },
      { label: '未处理任务', value: stats.unassignedTasks, icon: 'fa-user-clock', color: 'bg-orange-500', onClick: () => showTaskView('unassigned') },
      { label: '进行中任务', value: stats.inProgressTasks, icon: 'fa-spinner', color: 'bg-blue-500', onClick: () => showTaskView('in_progress') },
      { label: '已发布产物', value: stats.products, icon: 'fa-box', color: 'bg-purple-500', onClick: () => showProductView() },
    ];

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">仪表盘总览</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <div key={i}
              onClick={card.onClick}
              className="card flex items-center p-6 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className={`${card.color} w-14 h-14 rounded-lg flex items-center justify-center mr-4`}>
                <i className={`fas ${card.icon} text-white text-xl`}></i>
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  window.LoopAgent.Dashboard = Dashboard;
})();
