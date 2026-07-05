// AgentDetail 智能体详情 - 显示参与项目及关联任务/产物
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function AgentDetail({ agentId, onBack, setMessage, openProjectDetail, isAdmin }) {
    const [agent, setAgent] = useState(null);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedProject, setExpandedProject] = useState(null);

    useEffect(() => {
      setLoading(true);
      Promise.all([api.get('/agents'), api.get('/projects'), api.get('/tasks'), api.get('/products')])
        .then(([a, p, t, pr]) => {
          const agents = a.data || [];
          const agent = agents.find(x => x.id === agentId);
          setAgent(agent);

          const allTasks = t.data || [];
          const allProducts = pr.data || [];

          // 过滤出该智能体参与的任务
          const relatedTasks = allTasks.filter(
            task => task.assigneeAgentId === agentId || task.creatorAgentId === agentId || task.reviewerAgentId === agentId
          );
          setTasks(relatedTasks);

          // 过滤出相关项目
          const projectIds = [...new Set(relatedTasks.map(t => t.projectId))];
          const relatedProjects = (p.data || []).filter(proj => projectIds.includes(proj.id));
          setProjects(relatedProjects);

          // 过滤出相关任务的产物
          const taskIds = relatedTasks.map(t => t.id);
          const relatedProducts = allProducts.filter(prod => taskIds.includes(prod.taskId));
          setProducts(relatedProducts);
        })
        .catch(() => setMessage({ type: 'error', content: '获取详情失败' }))
        .finally(() => setLoading(false));
    }, [agentId]);

    if (loading) {
      return <div className="text-center py-8 text-gray-500">加载中...</div>;
    }
    if (!agent) {
      return <div className="text-center py-8 text-red-500">未找到智能体</div>;
    }

    const statusLabel = { idle: '空闲', busy: '忙碌', offline: '离线' };

    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 transition text-sm">
            <i className="fas fa-arrow-left mr-1"></i>返回
          </button>
          <h1 className="text-2xl font-bold text-gray-800">🤖 {agent.name} 详情</h1>
          {isAdmin && (
            <button onClick={async () => {
              if (!confirm(`确定删除智能体「${agent.name}」？`)) return;
              try {
                await api.delete(`/agents/${agent.id}`);
                setMessage({ type: 'success', content: `智能体「${agent.name}」已删除` });
                onBack();
              } catch (err) {
                setMessage({ type: 'error', content: '删除失败：' + err.message });
              }
            }} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 ml-auto">
              <i className="fas fa-trash-alt mr-1"></i>删除智能体
            </button>
          )}
        </div>

        {/* 基本信息 */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">基本信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">角色</span>
              <p className="font-medium">{agent.role}</p>
            </div>
            <div>
              <span className="text-gray-500">状态</span>
              <p className="font-medium">{statusLabel[agent.status] || agent.status}</p>
            </div>
            <div>
              <span className="text-gray-500">能力</span>
              <div className="flex gap-1 flex-wrap mt-1">
                {(agent.capabilities || []).map((c, i) => (
                  <span key={i} className="badge bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-gray-500">最后心跳</span>
              <p className="font-medium">{agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : '无'}</p>
            </div>
          </div>
        </div>

        {/* 参与项目列表 */}
        <h3 className="font-semibold text-gray-700 mb-3">参与项目（{projects.length}）</h3>
        {projects.length === 0 ? (
          <div className="card text-gray-400 text-center py-6">暂未参与任何项目</div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const projectProducts = products.filter(p => projectTasks.some(t => t.id === p.taskId));
              const isExpanded = expandedProject === project.id;
              return (
                <div key={project.id} className="card">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  >
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        {project.name}
                        {project.githubUrl && (
                          <a href={project.githubUrl} target="_blank" className="ml-2 text-blue-500 text-xs"
                            onClick={e => e.stopPropagation()}>
                            <i className="fab fa-github"></i>
                          </a>
                        )}
                      </h4>
                      <p className="text-xs text-gray-500">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{projectTasks.length} 任务</span>
                      <span>{projectProducts.length} 产物</span>
                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} transition-transform`}></i>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-6">
                      {/* 任务列表 */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">📋 任务列表</h5>
                        {projectTasks.length === 0 ? (
                          <p className="text-gray-400 text-xs">暂无任务</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b text-gray-500">
                                <th className="py-2 text-left">标题</th>
                                <th className="py-2 text-left">状态</th>
                                <th className="py-2 text-left">执行人</th>
                                <th className="py-2 text-left">审核人</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectTasks.map(task => (
                                <tr key={task.id} className="border-b hover:bg-gray-50">
                                  <td className="py-2">{task.title}</td>
                                  <td className="py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                      task.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {task.status === 'completed' ? '已完成' :
                                       task.status === 'in_progress' ? '进行中' :
                                       task.status === 'pending_review' ? '待审核' :
                                       task.status === 'pending' ? '待处理' : task.status}
                                    </span>
                                  </td>
                                  <td className="py-2 text-gray-600">{task.assigneeAgentId ? '已分配' : '-'}</td>
                                  <td className="py-2 text-gray-600">{task.reviewerAgentId ? '已分配' : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {/* 产物列表 */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">📦 产物列表</h5>
                        {projectProducts.length === 0 ? (
                          <p className="text-gray-400 text-xs">暂无产物</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {projectProducts.map(product => (
                              <div key={product.id} className="border rounded p-3 bg-gray-50">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="badge bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                                    {product.productType === 'code_repo' ? '代码仓库' :
                                     product.productType === 'document' ? '文档' :
                                     product.productType === 'api_definition' ? 'API 定义' : product.productType}
                                  </span>
                                  <a href={product.url} target="_blank"
                                    className="text-blue-500 text-xs hover:underline truncate">
                                    {product.url}
                                  </a>
                                </div>
                                <p className="text-xs text-gray-600">{product.description || '无描述'}</p>
                              </div>
                            ))}
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

  window.LoopAgent.AgentDetail = AgentDetail;
})();
