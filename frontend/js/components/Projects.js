// Projects 项目管理 - 内嵌任务看板与产物列表
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Projects({ setMessage, onOpenProjectDetail }) {
    const [projects, setProjects] = useState([]);
    const [agents, setAgents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expandedProject, setExpandedProject] = useState(null);
    const [form, setForm] = useState({
      name: '',
      description: '',
      goal: '',
      acceptanceCriteria: '',
      githubUrl: '',
      creatorAgentId: ''
    });

    // 子任务表单
    const [taskForm, setTaskForm] = useState({
      projectId: '',
      title: '',
      objective: '',
      acceptanceCriteria: '',
      assigneeAgentId: '',
      reviewerAgentId: ''
    });
    const [showTaskForm, setShowTaskForm] = useState(false);

    // 产物表单
    const [prodForm, setProdForm] = useState({
      taskId: '',
      productType: 'code_repo',
      url: '',
      description: ''
    });
    const [showProdForm, setShowProdForm] = useState(false);

    const fetchData = () => {
      setLoading(true);
      Promise.all([api.get('/projects'), api.get('/agents'), api.get('/tasks'), api.get('/products')])
        .then(([p, a, t, pr]) => {
          setProjects(p.data || []);
          setAgents(a.data || []);
          setTasks(t.data || []);
          setProducts(pr.data || []);
        })
        .catch(() => setMessage({ type: 'error', content: '获取数据失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    // 创建项目
    const handleCreate = async () => {
      if (!form.name || !form.githubUrl || !form.creatorAgentId) {
        setMessage({ type: 'error', content: '项目名称、GitHub 链接和主智能体为必填项' });
        return;
      }
      try {
        await api.post('/projects', {
          name: form.name,
          description: form.description,
          goal: form.goal,
          acceptance_criteria: form.acceptanceCriteria,
          github_url: form.githubUrl,
          creator_agent_id: form.creatorAgentId
        });
        setForm({ name: '', description: '', goal: '', acceptanceCriteria: '', githubUrl: '', creatorAgentId: '' });
        setShowForm(false);
        setMessage({ type: 'success', content: '项目创建成功！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '创建项目失败' });
      }
    };

    // 创建任务
    const handleCreateTask = async () => {
      if (!taskForm.projectId || !taskForm.title || !taskForm.objective || !taskForm.acceptanceCriteria ||
          !taskForm.assigneeAgentId || !taskForm.reviewerAgentId) {
        setMessage({ type: 'error', content: '所有字段均为必填（标题、目标、验收标准、执行人、审核人）' });
        return;
      }
      // 获取项目的创建者作为 creator_agent_id
      const project = projects.find(p => p.id === taskForm.projectId);
      const creatorId = project ? project.creatorAgentId : taskForm.assigneeAgentId;
      try {
        await api.post('/tasks', {
          project_id: taskForm.projectId,
          title: taskForm.title,
          objective: taskForm.objective,
          acceptance_criteria: taskForm.acceptanceCriteria,
          creator_agent_id: creatorId,
          assignee_agent_id: taskForm.assigneeAgentId,
          reviewer_agent_id: taskForm.reviewerAgentId
        });
        setTaskForm({ projectId: '', title: '', objective: '', acceptanceCriteria: '', assigneeAgentId: '', reviewerAgentId: '' });
        setShowTaskForm(false);
        setMessage({ type: 'success', content: '任务创建成功！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '创建任务失败' });
      }
    };

    // 认领任务（由执行人认领）
    const handleClaimTask = async (taskId, agentId) => {
      try {
        await api.post('/tasks/claim', { task_id: taskId, agent_id: agentId });
        setMessage({ type: 'success', content: '任务认领成功！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '认领失败' });
      }
    };

    // 提交审核
    const handleSubmitReview = async (taskId) => {
      try {
        await api.patch(`/tasks/${taskId}/status`, { status: 'pending_review', submit_note: '提交审核' });
        setMessage({ type: 'success', content: '已提交审核！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '提交审核失败' });
      }
    };

    // 审核通过
    const handleReviewTask = async (taskId, reviewerId, result) => {
      try {
        await api.post(`/tasks/${taskId}/review`, { reviewer_id: reviewerId, result, comment: result === 'pass' ? '审核通过' : '审核拒绝' });
        setMessage({ type: 'success', content: result === 'pass' ? '审核通过！' : '已拒绝' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '审核操作失败' });
      }
    };

    // 发布产物
    const handlePublishProduct = async () => {
      if (!prodForm.taskId || !prodForm.url) {
        setMessage({ type: 'error', content: '请选择关联任务并填写 URL' });
        return;
      }
      try {
        await api.post('/products', {
          task_id: prodForm.taskId,
          product_type: prodForm.productType,
          url: prodForm.url,
          description: prodForm.description
        });
        setProdForm({ taskId: '', productType: 'code_repo', url: '', description: '' });
        setShowProdForm(false);
        setMessage({ type: 'success', content: '产物发布成功！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '发布产物失败' });
      }
    };

    const typeMap = { code_repo: '代码仓库', document: '文档', api_definition: 'API 定义', image: '图片', data_file: '数据文件' };
    const typeIcon = { code_repo: 'fa-code', document: 'fa-file-alt', api_definition: 'fa-plug', image: 'fa-image', data_file: 'fa-database' };
    const statusLabel = { pending: '待处理', in_progress: '进行中', pending_review: '待审核', completed: '已完成', failed: '失败' };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📁 项目管理</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
            {showForm ? '✕ 取消' : '✚ 新建项目'}
          </button>
        </div>

        {/* 新建项目表单 */}
        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">新建项目</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="项目名称" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <input placeholder="GitHub 仓库链接（必填）" value={form.githubUrl}
                onChange={e => setForm({...form, githubUrl: e.target.value})}
                className="border rounded px-3 py-2 text-sm" />
              <textarea placeholder="项目描述" value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" rows="3" />
              <textarea placeholder="项目目标" value={form.goal}
                onChange={e => setForm({...form, goal: e.target.value})}
                className="border rounded px-3 py-2 text-sm" rows="3" />
              <textarea placeholder="验收标准" value={form.acceptanceCriteria}
                onChange={e => setForm({...form, acceptanceCriteria: e.target.value})}
                className="border rounded px-3 py-2 text-sm" rows="3" />
              <select value={form.creatorAgentId}
                onChange={e => setForm({...form, creatorAgentId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择主智能体</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.role})</option>)}
              </select>
              <button onClick={handleCreate}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                确认创建
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const projectProducts = products.filter(p => projectTasks.some(t => t.id === p.taskId));
              const isExpanded = expandedProject === project.id;
              const mainAgent = agents.find(a => a.id === project.creatorAgentId);
              return (
                <div key={project.id} className="card">
                  {/* 项目头部 */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-800">{project.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          project.status === 'planning' ? 'bg-blue-100 text-blue-700' :
                          project.status === 'active' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {project.status === 'planning' ? '规划中' : project.status === 'active' ? '进行中' : project.status}
                        </span>
                        {project.githubUrl && (
                          <a href={project.githubUrl} target="_blank"
                            className="text-blue-500 text-sm hover:underline">
                            <i className="fab fa-github"></i>
                          </a>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>🎯 {project.goal || '无目标'}</span>
                        <span>✅ {project.acceptanceCriteria || '无验收标准'}</span>
                        <span>👤 主智能体：{mainAgent ? mainAgent.name : project.creatorAgentId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-gray-400">{projectTasks.length} 任务 / {projectProducts.length} 产物</span>
                      <button onClick={() => onOpenProjectDetail && onOpenProjectDetail(project.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition">
                        进入项目 <i className="fas fa-arrow-right ml-1"></i>
                      </button>
                      <button
                        onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                        className="text-gray-500 hover:text-gray-700 transition">
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                      </button>
                    </div>
                  </div>

                  {/* 展开区域：任务表格 + 产物列表 */}
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4">
                      {/* 操作按钮 */}
                      <div className="flex gap-2 mb-4">
                        <button onClick={() => {
                          setTaskForm({...taskForm, projectId: project.id});
                          setShowTaskForm(true);
                          setShowProdForm(false);
                        }}
                          className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 transition">
                          ✚ 创建任务
                        </button>
                        <button onClick={() => {
                          setShowProdForm(true);
                          setShowTaskForm(false);
                        }}
                          className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded hover:bg-purple-700 transition">
                          ✚ 发布产物
                        </button>
                      </div>

                      {/* 创建任务表单（内联） */}
                      {showTaskForm && taskForm.projectId === project.id && (
                        <div className="border rounded p-4 mb-4 bg-gray-50">
                          <h4 className="font-semibold text-sm mb-3">创建新任务</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input placeholder="任务标题" value={taskForm.title}
                              onChange={e => setTaskForm({...taskForm, title: e.target.value})}
                              className="border rounded px-3 py-2 text-sm" />
                            <select value={taskForm.assigneeAgentId}
                              onChange={e => setTaskForm({...taskForm, assigneeAgentId: e.target.value})}
                              className="border rounded px-3 py-2 text-sm">
                              <option value="">选择执行人</option>
                              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <textarea placeholder="任务目标" value={taskForm.objective}
                              onChange={e => setTaskForm({...taskForm, objective: e.target.value})}
                              className="border rounded px-3 py-2 text-sm" rows="2" />
                            <select value={taskForm.reviewerAgentId}
                              onChange={e => setTaskForm({...taskForm, reviewerAgentId: e.target.value})}
                              className="border rounded px-3 py-2 text-sm">
                              <option value="">选择审核人</option>
                              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <textarea placeholder="验收标准" value={taskForm.acceptanceCriteria}
                              onChange={e => setTaskForm({...taskForm, acceptanceCriteria: e.target.value})}
                              className="border rounded px-3 py-2 text-sm col-span-2" rows="2" />
                            <button onClick={handleCreateTask}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                              确认创建任务
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 发布产物表单（内联） */}
                      {showProdForm && (
                        <div className="border rounded p-4 mb-4 bg-gray-50">
                          <h4 className="font-semibold text-sm mb-3">发布新产物</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select value={prodForm.taskId}
                              onChange={e => setProdForm({...prodForm, taskId: e.target.value})}
                              className="border rounded px-3 py-2 text-sm">
                              <option value="">选择关联任务</option>
                              {projectTasks.filter(t => t.status === 'completed').map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                              ))}
                            </select>
                            <select value={prodForm.productType}
                              onChange={e => setProdForm({...prodForm, productType: e.target.value})}
                              className="border rounded px-3 py-2 text-sm">
                              <option value="code_repo">代码仓库</option>
                              <option value="document">文档</option>
                              <option value="api_definition">API 定义</option>
                              <option value="image">图片</option>
                              <option value="data_file">数据文件</option>
                            </select>
                            <input placeholder="下载链接/URL" value={prodForm.url}
                              onChange={e => setProdForm({...prodForm, url: e.target.value})}
                              className="border rounded px-3 py-2 text-sm" />
                            <input placeholder="产物描述" value={prodForm.description}
                              onChange={e => setProdForm({...prodForm, description: e.target.value})}
                              className="border rounded px-3 py-2 text-sm" />
                            <button onClick={handlePublishProduct}
                              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                              确认发布
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 任务表格 */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          📋 任务列表（{projectTasks.length}）
                        </h4>
                        {projectTasks.length === 0 ? (
                          <p className="text-gray-400 text-xs">暂无任务，请创建</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b text-gray-500">
                                  <th className="py-2 text-left">标题</th>
                                  <th className="py-2 text-left">目标</th>
                                  <th className="py-2 text-left">状态</th>
                                  <th className="py-2 text-left">执行人</th>
                                  <th className="py-2 text-left">审核人</th>
                                  <th className="py-2 text-left">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectTasks.map(task => {
                                  const assignee = agents.find(a => a.id === task.assigneeAgentId);
                                  const reviewer = agents.find(a => a.id === task.reviewerAgentId);
                                  return (
                                    <tr key={task.id} className="border-b hover:bg-gray-50">
                                      <td className="py-2 font-medium">{task.title}</td>
                                      <td className="py-2 text-gray-600 max-w-[200px] truncate">{task.objective}</td>
                                      <td className="py-2">
                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                          task.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {statusLabel[task.status] || task.status}
                                        </span>
                                      </td>
                                      <td className="py-2 text-gray-600">{assignee ? assignee.name : '-'}</td>
                                      <td className="py-2 text-gray-600">{reviewer ? reviewer.name : '-'}</td>
                                      <td className="py-2">
                                        <div className="flex gap-1">
                                          {task.status === 'pending' && (
                                            <button onClick={() => handleClaimTask(task.id, task.assigneeAgentId)}
                                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                                              认领
                                            </button>
                                          )}
                                          {task.status === 'in_progress' && (
                                            <button onClick={() => handleSubmitReview(task.id)}
                                              className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">
                                              提交审核
                                            </button>
                                          )}
                                          {task.status === 'pending_review' && task.reviewerAgentId && (
                                            <>
                                              <button onClick={() => handleReviewTask(task.id, task.reviewerAgentId, 'pass')}
                                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
                                                通过
                                              </button>
                                              <button onClick={() => handleReviewTask(task.id, task.reviewerAgentId, 'fail')}
                                                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">
                                                拒绝
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* 产物列表 */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          📦 产物列表（{projectProducts.length}）
                        </h4>
                        {projectProducts.length === 0 ? (
                          <p className="text-gray-400 text-xs">暂无产物</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {projectProducts.map(product => {
                              const relatedTask = projectTasks.find(t => t.id === product.taskId);
                              return (
                                <div key={product.id} className="border rounded p-3 bg-gray-50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <i className={`fas ${typeIcon[product.productType] || 'fa-file'} text-gray-500`}></i>
                                    <span className="badge bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                                      {typeMap[product.productType] || product.productType}
                                    </span>
                                    <a href={product.url} target="_blank"
                                      className="text-blue-500 text-xs hover:underline truncate flex-1">
                                      {product.url}
                                    </a>
                                  </div>
                                  <p className="text-xs text-gray-600 ml-5">
                                    {product.description || '无描述'}
                                    {relatedTask && <span className="ml-2 text-gray-400">← {relatedTask.title}</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
