// ProductOverview 产物概览 - 显示所有已发布产物
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  const TYPE_MAP = {
    code_repo: '代码仓库',
    document: '文档',
    api_definition: 'API 定义',
    image: '图片',
    data_file: '数据文件'
  };

  const TYPE_ICON = {
    code_repo: 'fa-code',
    document: 'fa-file-alt',
    api_definition: 'fa-plug',
    image: 'fa-image',
    data_file: 'fa-database'
  };

  function ProductOverview({ onBack, isAdmin }) {
    const [products, setProducts] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
      Promise.all([api.get('/products'), api.get('/tasks'), api.get('/projects')])
        .then(([pr, t, p]) => {
          setProducts(pr.data || []);
          setTasks(t.data || []);
          setProjects(p.data || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const getTaskTitle = (taskId) => {
      const t = tasks.find(x => x.id === taskId);
      return t ? t.title : taskId;
    };

    const getProjectName = (taskId) => {
      const t = tasks.find(x => x.id === taskId);
      if (!t) return '-';
      const p = projects.find(x => x.id === t.projectId);
      return p ? p.name : t.projectId;
    };

    return (
      <div>
        <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center">
          <i className="fas fa-arrow-left mr-2"></i> 返回仪表盘
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          📦 已发布产物（{products.length}）
        </h1>

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-box-open text-4xl text-gray-300 mb-4"></i>
            <p className="text-gray-500">暂无已发布产物</p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-gray-500 text-sm">
                  <th className="pb-3 pl-2">类型</th>
                  <th className="pb-3">URL</th>
                  <th className="pb-3">描述</th>
                  <th className="pb-3">关联任务</th>
                  <th className="pb-3">所属项目</th>
                  {isAdmin && <th className="pb-3">操作</th>}
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pl-2">
                      <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                        <i className={`fas ${TYPE_ICON[prod.productType] || 'fa-file'} mr-1`}></i>
                        {TYPE_MAP[prod.productType] || prod.productType}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-blue-600">
                      <a href={prod.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                        {prod.url}
                      </a>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{prod.description || '-'}</td>
                    <td className="py-3 text-sm text-gray-600">{getTaskTitle(prod.taskId)}</td>
                    <td className="py-3 text-sm text-gray-600">{getProjectName(prod.taskId)}</td>
                    {isAdmin && (
                      <td className="py-3">
                        <button onClick={async () => {
                          if (!confirm('确定删除此产物？')) return;
                          try {
                            await api.delete(`/products/${prod.id}`);
                            fetchData();
                          } catch (err) {
                            console.error(err);
                          }
                        }} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.ProductOverview = ProductOverview;
})();
