// 主应用 - 路由管理与布局框架（移动端响应式）
(function() {
  const { useState } = React;
  const api = window.LoopAgent.api;

  function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewState, setViewState] = useState(null);
    const [navStack, setNavStack] = useState([]);
    const [forwardStack, setForwardStack] = useState([]);
    const [message, setMessage] = useState({ type: '', content: '' });
    const [isAdmin, setIsAdmin] = useState(api.isLoggedIn());
    const [showLogin, setShowLogin] = useState(!api.isLoggedIn());
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const showToast = (msg) => {
      setMessage(msg);
      setTimeout(() => setMessage({ type: '', content: '' }), 3000);
    };

    // 带历史记录的导航
    const pushHistory = (newTab, newViewState) => {
      setForwardStack([]); // 新导航时清除前进栈
      setNavStack(prev => {
        const entry = { tab: activeTab, viewState };
        // 避免连续重复
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (last.tab === entry.tab && last.viewState?.type === entry.viewState?.type &&
              last.viewState?.id === entry.viewState?.id && last.viewState?.filter === entry.viewState?.filter) {
            return prev;
          }
        }
        return [...prev, entry];
      });
      if (newTab !== undefined) setActiveTab(newTab);
      setViewState(newViewState);
      setSidebarOpen(false);
    };

    const navigateTo = (tab) => pushHistory(tab, null);

    const openAgentDetail = (agentId) => pushHistory('agents', { type: 'agentDetail', id: agentId });
    const openProjectDetail = (projectId) => pushHistory('projects', { type: 'projectDetail', id: projectId });
    const showTaskView = (filter) => pushHistory('projects', { type: 'taskOverview', filter });
    const showProductView = () => pushHistory('projects', { type: 'productOverview' });

    // 全屏编辑器：也推入历史，返回时自动还原上一页
    const openProjectEdit = (mode, projectId) => {
      pushHistory(undefined, { type: 'projectEdit', mode, projectId });
    };
    const openTaskEdit = (mode, projectId, taskId) => {
      pushHistory(undefined, { type: 'taskEdit', mode, projectId, taskId });
    };

    // 返回：从历史栈中弹出
    const goBack = () => {
      setNavStack(prev => {
        if (prev.length === 0) {
          setViewState(null);
          return prev;
        }
        const newStack = [...prev];
        const entry = newStack.pop();
        // 将当前状态推入前进栈
        setForwardStack(fw => [...fw, { tab: activeTab, viewState }]);
        setActiveTab(entry.tab);
        setViewState(entry.viewState);
        return newStack;
      });
    };

    // 前进：从前进栈中恢复
    const goForward = () => {
      setForwardStack(prev => {
        if (prev.length === 0) return prev;
        const newFw = [...prev];
        const entry = newFw.pop();
        // 将当前状态推回后退栈
        setNavStack(ns => [...ns, { tab: activeTab, viewState }]);
        setActiveTab(entry.tab);
        setViewState(entry.viewState);
        return newFw;
      });
    };

    const showBackBtn = navStack.length > 0;
    const showForwardBtn = forwardStack.length > 0;

    // 登录处理
    const handleLogin = async (username, password) => {
      try {
        await api.login(username, password);
        setIsAdmin(true);
        setShowLogin(false);
        showToast({ type: 'success', content: '登录成功！' });
      } catch (err) {
        showToast({ type: 'error', content: '登录失败：用户名或密码错误' });
      }
    };

    // 登出处理
    const handleLogout = () => {
      api.logout();
      setIsAdmin(false);
      setShowLogin(false);
      showToast({ type: 'success', content: '已退出登录' });
    };

    const tabs = [
      { key: 'dashboard', label: '仪表盘', icon: 'fa-chart-line' },
      { key: 'agents', label: '智能体', icon: 'fa-robot' },
      { key: 'projects', label: '项目', icon: 'fa-folder' },
    ];

    const renderContent = () => {
      const comp = window.LoopAgent;

      if (viewState) {
        if (viewState.type === 'agentDetail') {
          return React.createElement(comp.AgentDetail, {
            agentId: viewState.id, onBack: goBack,
            setMessage: showToast, openProjectDetail, isAdmin,
          });
        }
        if (viewState.type === 'projectDetail') {
          return React.createElement(comp.ProjectDetail, {
            projectId: viewState.id, onBack: goBack,
            setMessage: showToast, isAdmin,
            onOpenProjectEdit: openProjectEdit,
            onOpenTaskEdit: openTaskEdit,
          });
        }
        if (viewState.type === 'taskOverview') {
          return React.createElement(comp.TaskOverview, {
            filter: viewState.filter, onBack: goBack,
          });
        }
        if (viewState.type === 'productOverview') {
          return React.createElement(comp.ProductOverview, {
            onBack: goBack, isAdmin,
          });
        }
        // 全屏编辑器
        if (viewState.type === 'projectEdit') {
          return React.createElement(comp.ProjectEdit, {
            mode: viewState.mode, projectId: viewState.projectId,
            onClose: (refreshed) => { goBack(); },
            setMessage: showToast, isAdmin,
          });
        }
        if (viewState.type === 'taskEdit') {
          return React.createElement(comp.TaskEdit, {
            mode: viewState.mode, projectId: viewState.projectId, taskId: viewState.taskId,
            onClose: (refreshed) => { goBack(); },
            setMessage: showToast, isAdmin,
          });
        }
        if (viewState.type === 'projectCreate') {
          return React.createElement(comp.ProjectEdit, {
            mode: 'create', projectId: null,
            onClose: (refreshed) => { goBack(); },
            setMessage: showToast, isAdmin,
          });
        }
      }

      switch (activeTab) {
        case 'agents':
          return React.createElement(comp.Agents, {
            setMessage: showToast, onOpenAgentDetail: openAgentDetail, isAdmin,
          });
        case 'projects':
          return React.createElement(comp.Projects, {
            setMessage: showToast, onOpenProjectDetail: openProjectDetail,
            onOpenProjectEdit: openProjectEdit, isAdmin,
          });
        default:
          return React.createElement(comp.Dashboard, {
            onNavigate: navigateTo, showTaskView, showProductView,
          });
      }
    };

    const toastColor = message.type === 'success' ? 'bg-green-600' : message.type === 'error' ? 'bg-red-600' : 'bg-blue-600';

    // 登录弹窗
    const LoginModal = () => {
      const [user, setUser] = useState('');
      const [pass, setPass] = useState('');
      const [logging, setLogging] = useState(false);

      const submit = async () => {
        if (!user || !pass) return;
        setLogging(true);
        await handleLogin(user, pass);
        setLogging(false);
      };

      return React.createElement('div', {
        className: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50',
      }, React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl p-8 w-96 max-w-[90vw]',
      },
        React.createElement('div', { className: 'text-center mb-6' },
          React.createElement('i', { className: 'fas fa-shield-alt text-4xl text-blue-500 mb-3' }),
          React.createElement('h2', { className: 'text-xl font-bold text-gray-800' }, '超级管理员登录'),
          React.createElement('p', { className: 'text-sm text-gray-500 mt-1' }, '登录后可管理所有资源'),
        ),
        React.createElement('input', {
          placeholder: '用户名', value: user,
          onChange: (e) => setUser(e.target.value),
          className: 'w-full border rounded px-3 py-2 mb-3 text-sm',
          onKeyDown: (e) => e.key === 'Enter' && submit(),
        }),
        React.createElement('input', {
          type: 'password', placeholder: '密码', value: pass,
          onChange: (e) => setPass(e.target.value),
          className: 'w-full border rounded px-3 py-2 mb-4 text-sm',
          onKeyDown: (e) => e.key === 'Enter' && submit(),
        }),
        React.createElement('button', {
          onClick: submit, disabled: logging,
          className: 'w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition text-sm',
        }, logging ? '登录中...' : '登录'),
        React.createElement('button', {
          onClick: () => setShowLogin(false),
          className: 'w-full text-gray-500 py-2 mt-2 text-sm hover:text-gray-700',
        }, '暂不登录'),
      ));
    };

    // 侧边栏遮罩（移动端）
    const SidebarOverlay = () =>
      sidebarOpen && React.createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden',
        onClick: () => setSidebarOpen(false),
      });

    return React.createElement('div', { className: 'min-h-screen bg-gray-100 flex' },
      showLogin && !isAdmin && React.createElement(LoginModal),

      /* Toast */
      message.content && React.createElement('div', {
        className: `fixed top-4 right-4 z-50 ${toastColor} text-white px-4 py-3 rounded shadow-lg text-sm max-w-[90vw]`,
      },
        React.createElement('div', { className: 'flex items-center' },
          React.createElement('i', {
            className: `fas ${message.type === 'success' ? 'fa-check-circle' : message.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2`,
          }),
          message.content,
        ),
      ),

      /* 移动端顶部导航栏 */
      React.createElement('div', { className: 'lg:hidden fixed top-0 left-0 right-0 z-30 bg-gray-800 text-white flex items-center justify-between px-3 h-12' },
        React.createElement('button', {
          onClick: () => setSidebarOpen(!sidebarOpen),
          className: 'text-white text-lg w-8 h-8 flex items-center justify-center',
        }, React.createElement('i', { className: `fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}` })),
        /* 后退/前进按钮（移动端） */
        React.createElement('div', { className: 'flex items-center gap-1' },
          React.createElement('button', {
            onClick: showBackBtn ? goBack : undefined,
            disabled: !showBackBtn,
            className: 'w-8 h-8 flex items-center justify-center rounded transition ' +
              (showBackBtn ? 'text-white opacity-70 hover:opacity-100' : 'text-gray-500 opacity-40'),
          }, React.createElement('i', { className: 'fas fa-arrow-left' })),
          React.createElement('button', {
            onClick: showForwardBtn ? goForward : undefined,
            disabled: !showForwardBtn,
            className: 'w-8 h-8 flex items-center justify-center rounded transition ' +
              (showForwardBtn ? 'text-white opacity-70 hover:opacity-100' : 'text-gray-500 opacity-40'),
          }, React.createElement('i', { className: 'fas fa-arrow-right' })),
        ),
        React.createElement('span', { className: 'font-bold text-sm' }, 'LoopEngineeringManager'),
      ),

      /* 侧边栏遮罩 */
      React.createElement(SidebarOverlay),

      /* 侧边栏 */
      React.createElement('div', {
        className: `fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white flex flex-col flex-shrink-0 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`,
      },
        React.createElement('div', { className: 'p-6' },
          React.createElement('h1', { className: 'text-xl font-bold flex items-center' },
            React.createElement('i', { className: 'fas fa-sync-alt mr-2 text-blue-400' }),
            'LoopEngineeringManager',
          ),
          React.createElement('p', { className: 'text-xs text-gray-400 mt-1' }, 'v' + window.LoopAgent.version),
        ),

        /* 管理员状态栏 */
        React.createElement('div', {
          className: `px-6 py-3 border-t border-b border-gray-700 flex items-center justify-between ${isAdmin ? 'bg-blue-900' : ''}`,
        },
          React.createElement('span', { className: 'text-xs flex items-center' },
            isAdmin
              ? React.createElement(React.Fragment, null,
                  React.createElement('i', { className: 'fas fa-shield-alt text-blue-300 mr-2' }),
                  React.createElement('span', { className: 'text-blue-200' }, '管理员：' + api.getUsername()),
                )
              : React.createElement(React.Fragment, null,
                  React.createElement('i', { className: 'fas fa-user text-gray-500 mr-2' }),
                  React.createElement('span', { className: 'text-gray-500' }, '游客'),
                ),
          ),
          isAdmin
            ? React.createElement('button', { onClick: handleLogout, className: 'text-xs text-gray-400 hover:text-white transition' }, '退出')
            : React.createElement('button', { onClick: () => setShowLogin(true), className: 'text-xs text-blue-400 hover:text-blue-300 transition' }, '登录'),
        ),

        React.createElement('nav', { className: 'flex-1' },
          tabs.map(tab =>
            React.createElement('div', {
              key: tab.key,
              className: `sidebar-item flex items-center px-6 py-4 cursor-pointer transition-colors ${
                activeTab === tab.key && !viewState ? 'active-tab text-white' : 'text-gray-300 hover:bg-gray-700'
              }`,
              onClick: () => navigateTo(tab.key),
            },
              React.createElement('i', { className: `fas ${tab.icon} mr-3 w-5` }),
              React.createElement('span', null, tab.label),
            ),
          ),
        ),
        React.createElement('div', { className: 'p-4 text-xs text-gray-500 border-t border-gray-700 hidden lg:block' }, 'LoopEngineeringManager 管理后台'),
      ),

      /* 主内容区 */
      React.createElement('div', {
        className: 'flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8',
      },
        /* 历史导航按钮（← →） — 仅桌面端显示，移动端在顶部栏 */
        React.createElement('div', { className: 'hidden lg:flex items-center gap-1 mb-4' },
          /* 后退按钮 */
          React.createElement('button', {
            onClick: showBackBtn ? goBack : undefined,
            disabled: !showBackBtn,
            className: 'flex items-center gap-1 px-2 py-1 rounded transition ' +
              (showBackBtn ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer' : 'text-gray-300 cursor-default'),
            title: '后退',
          },
            React.createElement('i', { className: 'fas fa-arrow-left text-xs' }),
          ),
          /* 前进按钮 */
          React.createElement('button', {
            onClick: showForwardBtn ? goForward : undefined,
            disabled: !showForwardBtn,
            className: 'flex items-center gap-1 px-2 py-1 rounded transition ' +
              (showForwardBtn ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer' : 'text-gray-300 cursor-default'),
            title: '前进',
          },
            React.createElement('i', { className: 'fas fa-arrow-right text-xs' }),
          ),
        ),
        renderContent(),
      ),
    );
  }

  window.LoopAgent.App = App;
})();
