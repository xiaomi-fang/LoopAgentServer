// 项目详情 - 任务管理 + 产物管理
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function ProjectDetail({ projectId, onBack, setMessage }) {
    const [project, setProject] = useState(null);
    const [agents, setAgents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', objective: '', acceptanceCriteria: '', assigneeAgentId: '', reviewerAgentId: '' });
    const [showProductForm, setShowProductForm] = useState(false);
    const [productForm, setProductForm] = useState({ taskId: '', productType: 'code_repo', url: '', description: '' });

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

    // 创建任务（必须指定执行者和审核者）
    const handleCreateTask = async () => {
      if (!taskForm.title || !taskForm.assigneeAgentId || !taskForm.reviewerAgentId) {
        setMessage({ type: 'error', content: '标题、执行者和审核者为必填项' });
        return;
      }
      try {
        await api.post('/tasks', {
          project_id: projectId,
          title: taskForm.title,
          objective: taskForm.objective,
          acceptance_criteria: taskForm.acceptanceCriteria,
          creator_agent_id: project.creatorAgentId,
          assignee_agent_id: taskForm.assigneeAgentId,
          reviewer_agent_id: taskForm.reviewerAgentId,
        });
        setTaskForm({ title: '', objective: '', acceptanceCriteria: '', assigneeAgentId: '', reviewerAgentId: '' });
        setShowTaskForm(false);
        setMessage({ type: 'success', content: `任务「${taskForm.title}」创建成功！` });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '创建任务失败' });
      }
    };

    // 认领任务
    const handleClaim = async (taskId) => {
      try {
        await api.post('/tasks/claim', { task_id: taskId, agent_id: project.creatorAgentId });
        setMessage({ type: 'success', content: '任务已认领' });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '认领失败' }); }
    };

    // 提交审核
    const handleSubmitReview = async (taskId) => {
      try {
        await api.patch(`/tasks/${taskId}/status`, { status: 'pending_review', submit_note: '开发完成，提交审核' });
        setMessage({ type: 'success', content: '已提交审核' });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '提交审核失败' }); }
    };

    // 审核通过
    const handleApprove = async (taskId, reviewerId) => {
      try {
        await api.post(`/tasks/${taskId}/review`, { reviewer_id: reviewerId, result: 'pass', comment: '审核通过' });
        setMessage({ type: 'success', content: '审核通过！' });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '审核失败' }); }
    };

    // 发布产物
    const handlePublishProduct = async () => {
      if (!productForm.taskId || !productForm.url) return;
      try {
        await api.post('/products', {
          task_id: productForm.taskId,
          product_type: productForm.productType,
          url: productForm.url,
          description: productForm.description,
        });
        setProductForm({ taskId: '', productType: 'code_repo', url: '', description: '' });
        setShowProductForm(false);
        setMessage({ type: 'success', content: '产物发布成功！' });
        fetchData();
      } catch (err) { setMessage({ type: 'error', content: '发布产物失败' }); }
    };

    const statusMap = { planning: '规划中', in_progress: '进行中', completed: '已完成', paused: '已暂停' };
    const taskStatusMap = { pending: '待处理', in_progress: '进行中', pending_review: '待审核', completed: '已完成' };
    const taskStatusColor = { pending: 'border-l-gray-300', in_progress: 'border-l-blue-500', pending_review: 'border-l-amber-500', completed: 'border-l-green-500' };
    const typeMap = { code_repo: '代码仓库', document: '文档', api_definition: 'API 定义', image: '图片', data_file: '数据文件' };
    const typeIcon = { code_repo: 'fa-code', document: 'fa-file-alt', api_definition: 'fa-plug', image: 'fa-image', data_file: 'fa-database' };

    if (loading) {
      return <div className="text-center py-8 text-gray-500">加载中...</div>;
    }

    if (!project) {
      return <div className="text-center py-8 text-red-500">项目不存在</div>;
    }

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const reviewTasks = tasks.filter(t => t.status === 'pending_review');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const creator = agents.find(a => a.id === project.creatorAgentId);

    return (
      <div>
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center">
          <i className="fas fa-arrow-left mr-2"></i> 返回项目列表
        </button>

        {/* 项目基本信息 */}
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{project.name}</h2>
              <p className="text-gray-500 mt-1">{project.description}</p>
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">{statusMap[project.status] || project.status}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <span className="text-gray-400">主智能体：</span>
              <span className="font-medium">{creator ? creator.name : project.creatorAgentId}</span>
            </div>
            <div>
              <span className="text-gray-400">目标：</span>
              <span>{project.goal || '未设置'}</span>
            </div>
            <div>
              <span className="text-gray-400">验收标准：</span>
              <span>{project.acceptanceCriteria || '未设置'}</span>
            </div>
            {project.githubUrl && (
              <div className="col-span-3">
                <span className="text-gray-400">GitHub 链接：</span>
                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {project.githubUrl} <i className="fas fa-external-link-alt text-xs"></i>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 工具条 */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => setShowTaskForm(!showTaskForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm flex items-center">
            <i className="fas fa-plus-circle mr-2"></i> {showTaskForm ? '取消' : '创建任务'}
          </button>
          <button onClick={() => setShowProductForm(!showProductForm)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm flex items-center">
            <i className="fas fa-box mr-2"></i> {showProductForm ? '取消' : '发布产物'}
          </button>
        </div>

        {/* 创建任务表单 */}
        {showTaskForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">创建新任务</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="任务标题" value={taskForm.title}
                onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <textarea placeholder="任务目标" value={taskForm.objective} rows={2}
                onChange={e => setTaskForm({...taskForm, objective: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <textarea placeholder="验收标准" value={taskForm.acceptanceCriteria} rows={2}
                onChange={e => setTaskForm({...taskForm, acceptanceCriteria: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <select value={taskForm.assigneeAgentId} onChange={e => setTaskForm({...taskForm, assigneeAgentId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择执行者 *</option>
                {agents.filter(a => a.status === 'idle').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
              <select value={taskForm.reviewerAgentId} onChange={e => setTaskForm({...taskForm, reviewerAgentId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择审核者 *</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
              <button onClick={handleCreateTask}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                确认创建
              </button>
            </div>
          </div>
        )}

        {/* 发布产物表单 */}
        {showProductForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">发布新产物</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={productForm.taskId} onChange={e => setProductForm({...productForm, taskId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择关联任务</option>
                {tasks.filter(t => t.status === 'completed').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <select value={productForm.productType} onChange={e => setProductForm({...productForm, productType: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="code_repo">代码仓库</option>
                <option value="document">文档</option>
                <option value="api_definition">API 定义</option>
                <option value="image">图片</option>
                <option value="data_file">数据文件</option>
              </select>
              <input placeholder="下载链接/URL" value={productForm.url}
                onChange={e => setProductForm({...productForm, url: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <input placeholder="产物描述" value={productForm.description}
                onChange={e => setProductForm({...productForm, description: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <button onClick={handlePublishProduct}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                确认发布
              </button>
            </div>
          </div>
        )}

        {/* 任务看板 */}
        <h3 className="text-lg font-semibold text-gray-700 mb-4">任务看板（{tasks.length}）</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { key: 'pending', label: '📋 待处理', tasks: pendingTasks },
            { key: 'in_progress', label: '🔧 进行中', tasks: inProgressTasks },
            { key: 'pending_review', label: '👀 待审核', tasks: reviewTasks },
            { key: 'completed', label: '✅ 已完成', tasks: completedTasks },
          ].map(col => (
            <div key={col.key}>
              <h4 className="font-semibold text-gray-700 mb-3 text-sm bg-gray-200 rounded px-3 py-2">
                {col.label}（{col.tasks.length}）
              </h4>
              <div className="space-y-3">
                {col.tasks.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm border rounded bg-white">空</div>
                ) : col.tasks.map(task => {
                  const taskProducts = products.filter(p => p.taskId === task.id);
                  return (
                    <div key={task.id} className={`card p-3 border-l-4 ${taskStatusColor[task.status] || ''}`}>
                      <div className="font-medium text-sm mb-1">{task.title}</div>
                      <div className="text-xs text-gray-500 mb-2">{task.objective}</div>
                      <div className="text-xs text-gray-400 mb-1">
                        执行：{agents.find(a => a.id === task.assigneeAgentId)?.name || task.assigneeAgentId || '-'}
                      </div>
                      {taskProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {taskProducts.map(prod => (
                            <a key={prod.id} href={prod.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded hover:bg-purple-100">
                              <i className={`fas ${typeIcon[prod.productType] || 'fa-file'} mr-1`}></i>
                              {typeMap[prod.productType] || prod.productType}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {task.status === 'pending' && (
                          <button onClick={() => handleClaim(task.id)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                            认领
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button onClick={() => handleSubmitReview(task.id)}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">
                            提交审核
                          </button>
                        )}
                        {task.status === 'pending_review' && (
                          <button onClick={() => handleApprove(task.id, task.reviewerAgentId)}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                            通过
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 产物列表 */}
        {(products.filter(p => tasks.some(t => t.id === p.taskId)).length > 0) && (
          <>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">项目产物</h3>
            <div className="card">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b text-gray-500 text-sm">
                    <th className="pb-3">类型</th><th className="pb-3">URL</th><th className="pb-3">描述</th><th className="pb-3">关联任务</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => tasks.some(t => t.id === p.taskId)).map(prod => (
                    <tr key={prod.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3">
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          <i className={`fas ${typeIcon[prod.productType] || 'fa-file'} mr-1`}></i>
                          {typeMap[prod.productType] || prod.productType}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-blue-600">
                        <a href={prod.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{prod.url}</a>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{prod.description || '-'}</td>
                      <td className="py-3 text-sm">{tasks.find(t => t.id === prod.taskId)?.title || prod.taskId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  window.LoopAgent.ProjectDetail = ProjectDetail;
})();
