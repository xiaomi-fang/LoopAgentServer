// 工作流编辑器 - DAG 可视化
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  function WorkflowEditor({ projectId, onBack, setMessage, isAdmin }) {
    const [dag, setDag] = useState(null);
    const [layers, setLayers] = useState(null);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    const fetchAll = () => {
      Promise.all([
        api.get(`/api/workflows/${projectId}/dag`),
        api.get(`/api/workflows/${projectId}/progress`),
      ]).then(([d, p]) => {
        setDag(d.data);
        setProgress(p.data);
        // 按层级分组
        if (d.data && d.data.nodes && d.data.edges) {
          const layers = buildLayers(d.data.nodes, d.data.edges);
          setLayers(layers);
        }
      }).catch(err => {
        setMessage({ type: 'error', content: '获取工作流数据失败' });
      }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchAll(); }, [projectId]);

    const buildLayers = (nodes, edges) => {
      // 简单分层：从无依赖节点开始，逐层剥离
      const nodeSet = new Map(nodes.map(n => [n.id, n]));
      const remaining = new Set(nodes.map(n => n.id));
      const layers = [];

      while (remaining.size > 0) {
        const layer = [];
        for (const id of remaining) {
          const node = nodeSet.get(id);
          const deps = node.dependsOn || [];
          // 如果所有依赖都不在 remaining 中，则入当前层
          const allDone = deps.every(d => !remaining.has(d));
          if (allDone) layer.push(id);
        }
        if (layer.length === 0) break; // 环路保护
        layers.push(layer);
        layer.forEach(id => remaining.delete(id));
      }

      return layers;
    };

    const handleRun = async () => {
      setRunning(true);
      try {
        await api.post(`/api/workflows/${projectId}/run`, {});
        setMessage({ type: 'success', content: '工作流已启动（后台运行）' });
        setTimeout(fetchAll, 3000); // 3 秒后刷新
      } catch (err) {
        setMessage({ type: 'error', content: '启动工作流失败' });
      } finally {
        setRunning(false);
      }
    };

    const getStatusColor = (status) => {
      const map = {
        pending: 'bg-gray-200 border-gray-300 text-gray-600',
        in_progress: 'bg-blue-100 border-blue-400 text-blue-700 animate-pulse',
        completed: 'bg-green-100 border-green-500 text-green-700',
        failed: 'bg-red-100 border-red-500 text-red-700',
        blocked: 'bg-yellow-100 border-yellow-400 text-yellow-700',
      };
      return map[status] || 'bg-gray-100 border-gray-300 text-gray-500';
    };

    if (loading) return React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '加载工作流...');

    if (!dag || !dag.nodes || dag.nodes.length === 0) {
      return React.createElement('div', { className: 'text-center py-12 text-gray-400' },
        React.createElement('i', { className: 'fas fa-project-diagram text-4xl mb-3 block' }),
        React.createElement('p', null, '该项目暂无工作流任务'),
        React.createElement('p', { className: 'text-xs mt-1' }, '请在任务编辑中为任务设置 type/dependsOn/wfOrder 来创建工作流'),
      );
    }

    const statusIcon = (status) => {
      switch (status) {
        case 'completed': return 'fa-check-circle';
        case 'failed': return 'fa-times-circle';
        case 'in_progress': return 'fa-spinner fa-spin';
        case 'blocked': return 'fa-pause-circle';
        default: return 'fa-circle';
      }
    };

    return React.createElement('div', { className: 'space-y-6' },
      /* 顶部：进度概览 + 启动按钮 */
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-3' },
          React.createElement('h3', { className: 'font-bold text-gray-800' },
            React.createElement('i', { className: 'fas fa-project-diagram mr-2 text-blue-500' }),
            '工作流引擎'
          ),
          isAdmin && React.createElement('button', {
            onClick: handleRun,
            disabled: running,
            className: 'text-xs bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center',
          },
            React.createElement('i', { className: `fas ${running ? 'fa-spinner fa-spin' : 'fa-play'} mr-2` }),
            running ? '启动中...' : '▶ 启动工作流'
          ),
        ),
        /* 进度统计 */
        progress && React.createElement('div', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4' },
          [
            { label: '总计', value: progress.total, color: 'text-gray-600' },
            { label: '已完成', value: progress.completed, color: 'text-green-600' },
            { label: '进行中', value: progress.inProgress, color: 'text-blue-600' },
            { label: '待处理', value: progress.pending, color: 'text-gray-500' },
            { label: '阻塞', value: progress.blocked, color: 'text-yellow-600' },
            { label: '失败', value: progress.failed, color: 'text-red-600' },
          ].map(item =>
            React.createElement('div', { key: item.label, className: 'text-center p-2 bg-gray-50 rounded' },
              React.createElement('div', { className: `text-xl font-bold ${item.color}` }, item.value),
              React.createElement('div', { className: 'text-xs text-gray-500 mt-1' }, item.label),
            )
          ),
        ),
      ),

      /* DAG 可视化区域 */
      React.createElement('div', { className: 'card overflow-x-auto' },
        layers && React.createElement('div', { className: 'flex flex-col gap-6 min-w-[600px] py-4' },
          layers.map((layer, layerIdx) =>
            React.createElement('div', { key: layerIdx, className: 'flex items-center' },
              /* 左侧层级标签 */
              React.createElement('div', { className: 'w-16 flex-shrink-0 text-xs text-gray-400 font-medium' },
                `L${layerIdx + 1}`
              ),
              /* 层内节点（横向排列） */
              React.createElement('div', { className: 'flex-1 flex gap-4 justify-center' },
                layer.map(nodeId => {
                  const node = dag.nodes.find(n => n.id === nodeId);
                  if (!node) return null;
                  return React.createElement('div', {
                    key: node.id,
                    className: `relative flex flex-col items-center p-3 rounded-lg border-2 min-w-[140px] max-w-[180px] ${getStatusColor(node.status)}`,
                    title: `类型: ${node.type === 'parallel' ? '并行' : '串行'}\n依赖: ${(node.dependsOn || []).join(', ') || '无'}`,
                  },
                    /* 节点标题 */
                    React.createElement('div', { className: 'flex items-center gap-1 text-xs font-semibold w-full' },
                      React.createElement('i', { className: `fas ${statusIcon(node.status)} text-xs` }),
                      React.createElement('span', { className: 'truncate flex-1' }, node.title || '未命名'),
                      node.type === 'parallel' && React.createElement('span', {
                        className: 'text-[10px] bg-purple-100 text-purple-700 px-1 rounded',
                      }, '并'),
                    ),
                    /* 状态标记 */
                    React.createElement('div', { className: 'text-[10px] mt-1 opacity-75' }, node.status),
                    /* 依赖连线指示器 */
                    (node.dependsOn || []).length > 0 && React.createElement('div', {
                      className: 'text-[10px] mt-1 text-gray-400',
                    }, `← ${node.dependsOn.length} 个依赖`),
                  );
                }),
              ),
            )
          ),
        ),
      ),
    );
  }

  window.LoopAgent.WorkflowEditor = WorkflowEditor;
})();
