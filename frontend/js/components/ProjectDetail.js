// 项目详情 - 审核状态 + 任务树 + 产物管理
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  const REVIEW_STATUS_MAP = {
    planning: '规划中',
    planned: '规划完毕',
    under_review: '审核中',
    review_failed: '审核不通过',
    review_passed: '审核通过',
    in_development: '研发中',
    development_paused: '研发暂停',
    completed: '已完成',
  };
  const REVIEW_STATUS_COLORS = {
    planning: 'bg-gray-100 text-gray-600',
    planned: 'bg-teal-100 text-teal-700',
    under_review: 'bg-yellow-100 text-yellow-700',
    review_failed: 'bg-red-100 text-red-600',
    review_passed: 'bg-green-100 text-green-600',
    in_development: 'bg-blue-100 text-blue-600',
    development_paused: 'bg-orange-100 text-orange-600',
    completed: 'bg-green-100 text-green-700',
  };

  // 管理员可选的审核状态
  const ADMIN_STATUS_OPTIONS = [
    { value: 'planning', label: '规划中' },
    { value: 'planned', label: '规划完毕' },
    { value: 'under_review', label: '审核中' },
    { value: 'review_failed', label: '审核不通过' },
    { value: 'review_passed', label: '审核通过' },
    { value: 'in_development', label: '研发中' },
    { value: 'development_paused', label: '研发暂停' },
  ];

  function ProjectDetail({ projectId, onBack, setMessage, isAdmin, onOpenProjectEdit, onOpenTaskEdit }) {
    const [project, setProject] = useState(null);
    const [agents, setAgents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'products'

    const fetchData = () => {
      setLoading(true);
      Promise.all([
        api.get('/projects'),
        api.get('/agents'),
        api.get('/tasks'),
        api.get('/products'),
      ]).then(([p, a, t, pr]) => {
        const proj = (p.data || []).find(x => x.id === projectId);
        setProject(proj);
        setAgents(a.data || []);
        setTasks((t.data || []).filter(x => x.projectId === projectId));
        setProducts(pr.data || []);
      }).catch(() => setMessage({ type: 'error', content: '获取数据失败' }))
      .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [projectId]);

    // 管理员更改项目审核状态
    const handleStatusChange = async (e) => {
      const newStatus = e.target.value;
      try {
        await api.put(`/projects/${projectId}`, { status: newStatus });
        setMessage({ type: 'success', content: `项目状态已更新为「${REVIEW_STATUS_MAP[newStatus] || newStatus}」` });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '更新状态失败' });
      }
    };

    const typeMap = { code_repo: '代码仓库', document: '文档', api_definition: 'API 定义', image: '图片', data_file: '数据文件' };
    const typeIcon = { code_repo: 'fa-code', document: 'fa-file-alt', api_definition: 'fa-plug', image: 'fa-image', data_file: 'fa-database' };

    if (loading) {
      return React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '加载中...');
    }
    if (!project) {
      return React.createElement('div', { className: 'text-center py-8 text-red-500' }, '项目不存在');
    }

    const creator = agents.find(a => a.id === project.creatorAgentId);

    // 产品列表表格
    const renderProductTable = () => {
      const projectProducts = products.filter(p => tasks.some(t => t.id === p.taskId));
      return React.createElement('div', { className: 'card' },
        React.createElement('table', { className: 'w-full text-left text-sm' },
          React.createElement('thead', null,
            React.createElement('tr', { className: 'border-b text-gray-500' },
              React.createElement('th', { className: 'pb-3' }, '类型'),
              React.createElement('th', { className: 'pb-3' }, 'URL'),
              React.createElement('th', { className: 'pb-3' }, '描述'),
              React.createElement('th', { className: 'pb-3' }, '关联任务'),
              isAdmin && React.createElement('th', { className: 'pb-3' }, '操作'),
            ),
          ),
          React.createElement('tbody', null,
            projectProducts.length === 0
              ? React.createElement('tr', null,
                  React.createElement('td', { colSpan: isAdmin ? 5 : 4, className: 'py-6 text-center text-gray-400' }, '暂无产物')
                )
              : projectProducts.map(prod => {
                  const taskTitle = tasks.find(t => t.id === prod.taskId)?.title || prod.taskId;
                  return React.createElement('tr', { key: prod.id, className: 'border-b last:border-0 hover:bg-gray-50' },
                    React.createElement('td', { className: 'py-3' },
                      React.createElement('span', { className: 'bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded' },
                        React.createElement('i', { className: `fas ${typeIcon[prod.productType] || 'fa-file'} mr-1` }),
                        typeMap[prod.productType] || prod.productType,
                      ),
                    ),
                    React.createElement('td', { className: 'py-3 text-blue-600' },
                      React.createElement('a', { href: prod.url, target: '_blank', className: 'hover:underline break-all' }, prod.url),
                    ),
                    React.createElement('td', { className: 'py-3 text-gray-600' }, prod.description || '-'),
                    React.createElement('td', { className: 'py-3 text-gray-600' }, taskTitle),
                    isAdmin && React.createElement('td', { className: 'py-3' },
                      React.createElement('button', {
                        onClick: async () => {
                          if (!confirm('确定删除此产物？')) return;
                          try {
                            await api.delete(`/products/${prod.id}`);
                            setMessage({ type: 'success', content: '产物已删除' });
                            fetchData();
                          } catch (err) {
                            setMessage({ type: 'error', content: '删除失败' });
                          }
                        },
                        className: 'text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200',
                      }, React.createElement('i', { className: 'fas fa-trash-alt' })),
                    ),
                  );
                }),
          ),
        ),
      );
    };

    return React.createElement('div', { className: 'space-y-6' },
      /* 返回按钮 */
      React.createElement('button', {
        onClick: onBack,
        className: 'text-sm text-blue-600 hover:text-blue-800 flex items-center',
      },
        React.createElement('i', { className: 'fas fa-arrow-left mr-2' }),
        '返回项目列表'
      ),

      /* 项目信息头 */
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-start justify-between gap-3' },
          React.createElement('div', { className: 'flex-1' },
            React.createElement('h2', { className: 'text-xl sm:text-2xl font-bold text-gray-800' }, project.name),
            React.createElement('p', { className: 'text-gray-500 mt-1 text-sm' }, project.description),
          ),
          React.createElement('div', { className: 'flex items-center gap-2 flex-shrink-0' },
            isAdmin
              ? React.createElement('select', {
                  value: project.status,
                  onChange: handleStatusChange,
                  className: `text-xs px-2 py-1 rounded border ${REVIEW_STATUS_COLORS[project.status] || 'bg-gray-100'} cursor-pointer`,
                },
                  ADMIN_STATUS_OPTIONS.map(opt =>
                    React.createElement('option', { key: opt.value, value: opt.value }, opt.label)
                  ),
                )
              : React.createElement('span', {
                  className: `text-xs px-3 py-1 rounded-full ${REVIEW_STATUS_COLORS[project.status] || 'bg-gray-100'}`,
                }, REVIEW_STATUS_MAP[project.status] || project.status),
            isAdmin && React.createElement('button', {
              onClick: () => onOpenProjectEdit && onOpenProjectEdit('edit', projectId),
              className: 'text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 mr-1',
            }, React.createElement('i', { className: 'fas fa-edit mr-1' }), '编辑'),
            isAdmin && React.createElement('button', {
              onClick: async () => {
                if (!confirm(`确定删除项目「${project.name}」及其所有任务、产物？`)) return;
                try {
                  await api.delete(`/projects/${project.id}`);
                  setMessage({ type: 'success', content: '项目已删除' });
                  onBack();
                } catch (err) {
                  setMessage({ type: 'error', content: '删除失败' });
                }
              },
              className: 'text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200',
            }, React.createElement('i', { className: 'fas fa-trash-alt mr-1' }), '删除'),
          ),
        ),
        React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm' },
          React.createElement('div', null,
            React.createElement('span', { className: 'text-gray-400' }, '主智能体：'),
            React.createElement('span', { className: 'font-medium ml-1' }, creator ? creator.name : project.creatorAgentId),
          ),
          React.createElement('div', null,
            React.createElement('span', { className: 'text-gray-400' }, '目标：'),
            React.createElement('span', { className: 'ml-1' }, project.goal || '未设置'),
          ),
          React.createElement('div', null,
            React.createElement('span', { className: 'text-gray-400' }, '验收标准：'),
            React.createElement('span', { className: 'ml-1' }, project.acceptanceCriteria || '未设置'),
          ),
          project.githubUrl && React.createElement('div', { className: 'sm:col-span-3' },
            React.createElement('span', { className: 'text-gray-400' }, 'GitHub：'),
            React.createElement('a', { href: project.githubUrl, target: '_blank', className: 'text-blue-600 hover:underline ml-1' },
              project.githubUrl, React.createElement('i', { className: 'fas fa-external-link-alt text-xs ml-1' }),
            ),
          ),
        ),
      ),

      /* Tab 切换 */
      React.createElement('div', { className: 'flex border-b gap-0' },
        [
          { key: 'tasks', label: '任务树', icon: 'fa-sitemap' },
          { key: 'products', label: '产物', icon: 'fa-box' },
        ].map(tab =>
          React.createElement('button', {
            key: tab.key,
            onClick: () => setActiveTab(tab.key),
            className: `px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`,
          },
            React.createElement('i', { className: `fas ${tab.icon} mr-2` }),
            tab.label,
          ),
        ),
      ),

      /* 任务树面板 */
      activeTab === 'tasks' && React.createElement('div', null,
        React.createElement(window.LoopAgent.TaskTree, {
          projectId,
          creatorAgentId: project.creatorAgentId,
          agents,
          products,
          setMessage,
          isAdmin,
          onEditTask: onOpenTaskEdit,
        }),
      ),

      /* 产物面板 */
      activeTab === 'products' && React.createElement('div', null,
        React.createElement('div', { className: 'flex justify-end mb-3' },
          React.createElement('button', {
            onClick: () => setMessage({ type: 'info', content: '产物需在任务完成后通过任务发布' }),
            className: 'text-sm text-blue-600 hover:text-blue-800',
          },
            React.createElement('i', { className: 'fas fa-info-circle mr-1' }),
            '发布新产物需在任务完成后操作'
          ),
        ),
        renderProductTable(),
      ),
    );
  }

  window.LoopAgent.ProjectDetail = ProjectDetail;
})();
