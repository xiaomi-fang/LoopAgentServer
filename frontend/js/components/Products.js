// Products 产物列表模块
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function Products({ setMessage }) {
    const [products, setProducts] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ taskId: '', productType: 'code_repo', url: '', description: '' });

    const fetchData = () => {
      setLoading(true);
      Promise.all([api.get('/products'), api.get('/tasks')])
        .then(([p, t]) => {
          setProducts(p.data || []);
          setTasks(t.data || []);
        })
        .catch(() => setMessage({ type: 'error', content: '获取产物数据失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    const handlePublish = async () => {
      if (!form.taskId || !form.url) return;
      try {
        await api.post('/products', {
          task_id: form.taskId,
          product_type: form.productType,
          url: form.url,
          description: form.description,
        });
        setForm({ taskId: '', productType: 'code_repo', url: '', description: '' });
        setShowForm(false);
        setMessage({ type: 'success', content: '产物发布成功！' });
        fetchData();
      } catch (err) {
        setMessage({ type: 'error', content: '发布产物失败' });
      }
    };

    const typeMap = { code_repo: '代码仓库', document: '文档', api_definition: 'API 定义', image: '图片', data_file: '数据文件' };
    const typeIcon = { code_repo: 'fa-code', document: 'fa-file-alt', api_definition: 'fa-plug', image: 'fa-image', data_file: 'fa-database' };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📦 产物管理</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
            {showForm ? '✕ 取消' : '✚ 发布产物'}
          </button>
        </div>

        {showForm && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold mb-4">发布新产物</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={form.taskId} onChange={e => setForm({...form, taskId: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="">选择关联任务</option>
                {tasks.filter(t => t.status === 'completed').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <select value={form.productType} onChange={e => setForm({...form, productType: e.target.value})}
                className="border rounded px-3 py-2 text-sm">
                <option value="code_repo">代码仓库</option>
                <option value="document">文档</option>
                <option value="api_definition">API 定义</option>
                <option value="image">图片</option>
                <option value="data_file">数据文件</option>
              </select>
              <input placeholder="下载链接/URL" value={form.url}
                onChange={e => setForm({...form, url: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <textarea placeholder="产物描述" value={form.description} rows={2}
                onChange={e => setForm({...form, description: e.target.value})}
                className="border rounded px-3 py-2 text-sm col-span-2" />
              <button onClick={handlePublish} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-sm col-span-2">
                确认发布
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        ) : (
          <div className="card">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-gray-500 text-sm">
                  <th className="pb-3">类型</th><th className="pb-3">URL</th>
                  <th className="pb-3">描述</th><th className="pb-3">关联任务</th><th className="pb-3">发布时间</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-400">暂无已发布的产物</td></tr>
                ) : products.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">
                      <span className="badge bg-gray-100 text-gray-700">
                        <i className={`fas ${typeIcon[p.productType] || 'fa-file'} mr-1`}></i>
                        {typeMap[p.productType] || p.productType}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-blue-600">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.url}</a>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{p.description || '-'}</td>
                    <td className="py-3 text-sm">{tasks.find(t => t.id === p.taskId)?.title || p.taskId}</td>
                    <td className="py-3 text-sm text-gray-400">{new Date(p.createdAt).toLocaleString('zh-CN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  window.LoopAgent.Products = Products;
})();
