// Dashboard 仪表盘模块
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Dashboard() {
    const [stats, setStats] = useState({ agents: 0, projects: 0, tasks: 0, products: 0 });

    useEffect(() => {
      Promise.all([
        api.get('/agents'),
        api.get('/projects'),
        api.get('/tasks'),
        api.get('/products')
      ]).then(([a, p, t, pr]) => {
        setStats({
          agents: (a.data || []).length,
          projects: (p.data || []).length,
          tasks: (t.data || []).length,
          products: (pr.data || []).length
        });
      }).catch(() => {});
    }, []);

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">仪表盘总览</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: '智能体总数', value: stats.agents, icon: 'fa-robot', color: 'bg-blue-500' },
            { label: '活跃项目', value: stats.projects, icon: 'fa-folder', color: 'bg-green-500' },
            { label: '待处理任务', value: stats.tasks, icon: 'fa-tasks', color: 'bg-amber-500' },
            { label: '已发布产物', value: stats.products, icon: 'fa-box', color: 'bg-purple-500' }
          ].map(item => (
            <div key={item.label} className="card flex items-center">
              <div className={`${item.color} text-white p-4 rounded-lg mr-4`}>
                <i className={`fas ${item.icon} text-xl`}></i>
              </div>
              <div>
                <p className="text-gray-500 text-sm">{item.label}</p>
                <p className="text-3xl font-bold">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  window.LoopAgent.Dashboard = Dashboard;
})();
