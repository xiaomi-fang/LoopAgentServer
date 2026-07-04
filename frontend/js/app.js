// 主应用 - 路由管理与布局框架
(function() {
  const { useState } = React;

  function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewState, setViewState] = useState(null); // { type: 'agentDetail'|'projectDetail', id: string }
    const [message, setMessage] = useState({ type: '', content: '' });

    const showToast = (msg) => {
      setMessage(msg);
      setTimeout(() => setMessage({ type: '', content: '' }), 3000);
    };

    const navigateTo = (tab) => {
      setViewState(null);
      setActiveTab(tab);
    };

    const openAgentDetail = (agentId) => {
      setViewState({ type: 'agentDetail', id: agentId });
    };

    const openProjectDetail = (projectId) => {
      setViewState({ type: 'projectDetail', id: projectId });
    };

    const showTaskView = (filter) => {
      setViewState({ type: 'taskOverview', filter });
    };

    const showProductView = () => {
      setViewState({ type: 'productOverview' });
    };

    const goBack = () => {
      setViewState(null);
    };

    const tabs = [
      { key: 'dashboard', label: '仪表盘', icon: 'fa-chart-line' },
      { key: 'agents', label: '智能体', icon: 'fa-robot' },
      { key: 'projects', label: '项目', icon: 'fa-folder' },
    ];

    const renderContent = () => {
      const comp = window.LoopAgent;

      // If in detail view
      if (viewState) {
        if (viewState.type === 'agentDetail') {
          return React.createElement(comp.AgentDetail, {
            agentId: viewState.id,
            onBack: goBack,
            setMessage: showToast,
            openProjectDetail,
          });
        }
        if (viewState.type === 'projectDetail') {
          return React.createElement(comp.ProjectDetail, {
            projectId: viewState.id,
            onBack: goBack,
            setMessage: showToast,
          });
        }
        if (viewState.type === 'taskOverview') {
          return React.createElement(comp.TaskOverview, {
            filter: viewState.filter,
            onBack: goBack,
          });
        }
        if (viewState.type === 'productOverview') {
          return React.createElement(comp.ProductOverview, {
            onBack: goBack,
          });
        }
      }

      // Normal tab views
      switch (activeTab) {
        case 'agents':
          return React.createElement(comp.Agents, {
            setMessage: showToast,
            onOpenAgentDetail: openAgentDetail,
          });
        case 'projects':
          return React.createElement(comp.Projects, {
            setMessage: showToast,
            onOpenProjectDetail: openProjectDetail,
          });
        default:
          return React.createElement(comp.Dashboard, {
            onNavigate: navigateTo,
            showTaskView,
            showProductView,
          });
      }
    };

    const toastColor = message.type === 'success' ? 'bg-green-600' : message.type === 'error' ? 'bg-red-600' : 'bg-blue-600';

    return (
      <div className="flex h-screen bg-gray-100">
        {/* Toast 消息 */}
        {message.content && (
          <div className={`fixed top-4 right-4 z-50 ${toastColor} text-white px-4 py-3 rounded shadow-lg transition-all`}>
            <div className="flex items-center">
              <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : message.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2`}></i>
              <span>{message.content}</span>
            </div>
          </div>
        )}

        {/* 侧边栏 */}
        <div className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0">
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
                  activeTab === tab.key && !viewState ? 'active-tab text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
                onClick={() => navigateTo(tab.key)}>
                <i className={`fas ${tab.icon} mr-3 w-5`}></i>
                <span>{tab.label}</span>
              </div>
            ))}
          </nav>
          <div className="p-4 text-xs text-gray-500 border-t border-gray-700">
            LoopAgent 管理后台
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
