// 主应用 - 路由管理与布局框架
(function() {
  const { useState } = React;

  function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [message, setMessage] = useState({ type: '', content: '' });

    const showToast = (msg) => {
      setMessage(msg);
      setTimeout(() => setMessage({ type: '', content: '' }), 3000);
    };

    const tabs = [
      { key: 'dashboard', label: '仪表盘', icon: 'fa-chart-line' },
      { key: 'agents', label: '智能体', icon: 'fa-robot' },
      { key: 'projects', label: '项目', icon: 'fa-folder' },
      { key: 'tasks', label: '任务', icon: 'fa-tasks' },
      { key: 'products', label: '产物', icon: 'fa-box' },
    ];

    const renderContent = () => {
      const comp = window.LoopAgent;
      switch (activeTab) {
        case 'agents': return React.createElement(comp.Agents, { setMessage: showToast });
        case 'projects': return React.createElement(comp.Projects, { setMessage: showToast });
        case 'tasks': return React.createElement(comp.Tasks, { setMessage: showToast });
        case 'products': return React.createElement(comp.Products, { setMessage: showToast });
        default: return React.createElement(comp.Dashboard);
      }
    };

    return (
      <div className="flex h-screen bg-gray-100">
        {/* Toast 消息 */}
        {message.content && (
          <div className={`toast ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            <div className="flex items-center">
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
              <span>{message.content}</span>
            </div>
          </div>
        )}

        {/* 侧边栏 */}
        <div className="w-64 bg-gray-800 text-white flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold flex items-center">
              <i className="fas fa-sync-alt mr-2 text-blue-400"></i>
              LoopAgent
            </h1>
            <p className="text-xs text-gray-400 mt-1">v{window.LoopAgent.version}</p>
          </div>
          <nav className="flex-1">
            {tabs.map(tab => (
              <div key={tab.key}
                className={`sidebar-item flex items-center px-6 py-4 cursor-pointer transition-colors ${
                  activeTab === tab.key ? 'active-tab text-white' : 'text-gray-300'
                }`}
                onClick={() => setActiveTab(tab.key)}>
                <i className={`fas ${tab.icon} mr-3 w-5`}></i>
                <span>{tab.label}</span>
              </div>
            ))}
          </nav>
          <div className="p-4 text-xs text-gray-500 border-t border-gray-700">
            LoopAgent v{window.LoopAgent.version}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-auto p-8">
          {renderContent()}
        </div>
      </div>
    );
  }

  window.LoopAgent.App = App;
})();
