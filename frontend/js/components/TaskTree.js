/* TaskTree.js - 任务树组件（左树右详情，拖拽排序，右键菜单） */
(function() {
  const { useState, useEffect, useRef, useCallback } = React;
  const api = window.LoopAgent.api;

  /* ── 任务树节点 ── */
  function TaskTreeNode({ node, depth, selectedId, onSelect, onContextMenu, onDragStart, onDrop, onToggle, expandedIds, isAdmin }) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;

    const statusIcons = {
      pending: 'fa-clock text-gray-400',
      in_progress: 'fa-spinner text-blue-500',
      pending_review: 'fa-search text-amber-500',
      completed: 'fa-check-circle text-green-500',
      failed: 'fa-times-circle text-red-500',
    };
    const icon = statusIcons[node.status] || 'fa-circle text-gray-300';

    return React.createElement('div', { className: 'select-none' },
      /* 节点行 */
      React.createElement('div', {
        className: 'flex items-center py-1.5 px-2 rounded cursor-pointer transition-colors text-sm group ' +
          (isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'),
        style: { paddingLeft: (depth * 20 + 8) + 'px' },
        onClick: () => onSelect(node),
        onContextMenu: (e) => { e.preventDefault(); onContextMenu(e, node); },
        draggable: true,
        onDragStart: (e) => onDragStart(e, node),
        onDragOver: (e) => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-50'); },
        onDragLeave: (e) => e.currentTarget.classList.remove('bg-blue-50'),
        onDrop: (e) => { e.preventDefault(); e.currentTarget.classList.remove('bg-blue-50'); onDrop(e, node); },
      },
        /* 展开/折叠按钮 */
        React.createElement('span', {
          className: 'w-4 text-center text-xs text-gray-400 mr-1 flex-shrink-0',
          onClick: (e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); },
        }, hasChildren ? (isExpanded ? '▼' : '▶') : ' '),
        /* 状态图标 */
        React.createElement('i', { className: `fas ${icon} mr-2 text-xs w-3 flex-shrink-0` }),
        /* 标题 */
        React.createElement('span', { className: 'flex-1 truncate' }, node.title),
        /* 管理员删除按钮 */
        isAdmin && React.createElement('button', {
          className: 'text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 ml-1 px-1',
          onClick: (e) => { e.stopPropagation(); onContextMenu(e, node, 'delete'); },
          title: '删除',
        }, React.createElement('i', { className: 'fas fa-times' }))
      ),
      /* 子节点 */
      hasChildren && isExpanded && React.createElement('div', null,
        node.children.map(child =>
          React.createElement(TaskTreeNode, {
            key: child.id, node: child, depth: depth + 1,
            selectedId, onSelect, onContextMenu, onDragStart, onDrop,
            onToggle, expandedIds, isAdmin,
          })
        )
      )
    );
  }

  /* ── 右键菜单 ── */
  function ContextMenu({ x, y, node, onClose, onAddChild, onAddSibling, onEdit, onDelete, isAdmin }) {
    const menuRef = useRef(null);

    useEffect(() => {
      const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) onClose(); };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, []);

    const items = [
      { label: '添加子任务', icon: 'fa-plus-circle', action: () => { onAddChild(node); onClose(); } },
      { label: '添加兄弟任务', icon: 'fa-plus-square', action: () => { onAddSibling(node); onClose(); } },
    ];
    if (isAdmin && onEdit) {
      items.push({ label: '编辑', icon: 'fa-edit', action: () => { onEdit(node); onClose(); } });
    }
    items.push({ label: '删除', icon: 'fa-trash-alt', danger: true, action: () => { onDelete(node); onClose(); } });

    return React.createElement('div', {
      ref: menuRef,
      className: 'fixed z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[160px]',
      style: { left: x + 'px', top: y + 'px' },
    },
      items.map((item, i) =>
        React.createElement('div', {
          key: i,
          className: 'flex items-center px-4 py-2 text-sm cursor-pointer transition-colors ' +
            (item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'),
          onClick: item.action,
        },
          React.createElement('i', { className: `fas ${item.icon} mr-2 w-4 text-xs` }),
          item.label
        )
      )
    );
  }

  /* ── 任务详情面板 ── */
  function TaskDetail({ task, agents, products, setMessage, isAdmin, onRefresh }) {
    if (!task) {
      return React.createElement('div', { className: 'text-center py-20 text-gray-400' },
        React.createElement('i', { className: 'fas fa-arrow-left text-2xl mb-3 block' }),
        '请从左侧选择任务查看详情'
      );
    }

    const statusLabels = {
      pending: '待处理', in_progress: '进行中', pending_review: '待审核', completed: '已完成', failed: '失败',
    };
    const statusColors = {
      pending: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-600',
      pending_review: 'bg-amber-100 text-amber-600', completed: 'bg-green-100 text-green-600',
      failed: 'bg-red-100 text-red-600',
    };
    const assignee = agents.find(a => a.id === task.assigneeAgentId);
    const reviewer = agents.find(a => a.id === task.reviewerAgentId);
    const creator = agents.find(a => a.id === task.creatorAgentId);
    const taskProducts = products.filter(p => p.taskId === task.id);
    const typeMap = { code_repo: '代码仓库', document: '文档', api_definition: 'API 定义', image: '图片', data_file: '数据文件' };
    const typeIcon = { code_repo: 'fa-code', document: 'fa-file-alt', api_definition: 'fa-plug', image: 'fa-image', data_file: 'fa-database' };

    return React.createElement('div', { className: 'space-y-4' },
      /* 标题 + 状态 */
      React.createElement('div', { className: 'flex items-start justify-between' },
        React.createElement('h3', { className: 'text-lg font-bold text-gray-800' }, task.title),
        React.createElement('span', { className: `text-xs px-2 py-1 rounded-full ${statusColors[task.status] || 'bg-gray-100'}` },
          statusLabels[task.status] || task.status
        )
      ),
      /* 目标描述 */
      React.createElement('div', null,
        React.createElement('div', { className: 'text-xs text-gray-400 mb-1' }, '目标'),
        React.createElement('p', { className: 'text-sm text-gray-700 bg-gray-50 rounded p-3 white-space-pre-wrap' }, task.objective),
      ),
      /* 验收标准 */
      React.createElement('div', null,
        React.createElement('div', { className: 'text-xs text-gray-400 mb-1' }, '验收标准'),
        React.createElement('p', { className: 'text-sm text-gray-700 bg-gray-50 rounded p-3 white-space-pre-wrap' }, task.acceptanceCriteria),
      ),
      /* 人员 */
      React.createElement('div', { className: 'grid grid-cols-3 gap-3 text-sm' },
        React.createElement('div', null, React.createElement('div', { className: 'text-xs text-gray-400' }, '创建者'), React.createElement('div', { className: 'font-medium' }, creator ? creator.name : task.creatorAgentId)),
        React.createElement('div', null, React.createElement('div', { className: 'text-xs text-gray-400' }, '执行者'), React.createElement('div', { className: 'font-medium' }, assignee ? assignee.name : (task.assigneeAgentId || '-'))),
        React.createElement('div', null, React.createElement('div', { className: 'text-xs text-gray-400' }, '审核者'), React.createElement('div', { className: 'font-medium' }, reviewer ? reviewer.name : (task.reviewerAgentId || '-'))),
      ),
      /* 产物 */
      taskProducts.length > 0 && React.createElement('div', null,
        React.createElement('div', { className: 'text-xs text-gray-400 mb-1' }, '产物'),
        React.createElement('div', { className: 'flex flex-wrap gap-2' },
          taskProducts.map(p =>
            React.createElement('a', {
              key: p.id, href: p.url, target: '_blank',
              className: 'text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded hover:bg-purple-100 flex items-center',
            },
              React.createElement('i', { className: `fas ${typeIcon[p.productType] || 'fa-file'} mr-1` }),
              typeMap[p.productType] || p.productType,
              p.description && React.createElement('span', { className: 'ml-1 text-purple-400' }, `- ${p.description}`)
            )
          )
        ),
      ),
      /* 审核备注 */
      task.comment && React.createElement('div', null,
        React.createElement('div', { className: 'text-xs text-gray-400 mb-1' }, '审核备注'),
        React.createElement('p', { className: 'text-sm text-gray-700 bg-amber-50 rounded p-3' }, task.comment),
      ),
      /* 审核记录（仅已创建的任务展示） */
      task.id && React.createElement(window.LoopAgent.ReviewRecords, {
        taskId: task.id,
        agents,
        setMessage,
        isAdmin,
        onRefresh,
      }),
    );
  }

  /* ── 添加任务弹窗（用于右键菜单） ── */
  function AddTaskModal({ parentTask, projectId, creatorAgentId, agents, onClose, onCreated }) {
    const [form, setForm] = useState({
      title: '',
      objective: '',
      acceptanceCriteria: '',
      assigneeAgentId: '',
      reviewerAgentId: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const submit = async () => {
      if (!form.title) return;
      setSubmitting(true);
      try {
        await api.post('/tasks', {
          project_id: projectId,
          parent_task_id: parentTask ? parentTask.id : null,
          title: form.title,
          objective: form.objective || form.title,
          acceptance_criteria: form.acceptanceCriteria || '需确认',
          creator_agent_id: creatorAgentId,
          assignee_agent_id: form.assigneeAgentId || undefined,
          reviewer_agent_id: form.reviewerAgentId || undefined,
        });
        onCreated();
        onClose();
      } catch (err) {
        console.error(err);
      }
      setSubmitting(false);
    };

    return React.createElement('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30',
      onClick: onClose,
    },
      React.createElement('div', {
        className: 'bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90vw]',
        onClick: e => e.stopPropagation(),
      },
        React.createElement('h3', { className: 'text-lg font-bold mb-4' },
          parentTask ? `添加子任务到「${parentTask.title}」` : '添加顶级任务'
        ),
        React.createElement('input', {
          placeholder: '任务标题 *',
          value: form.title,
          onChange: e => setForm({...form, title: e.target.value}),
          className: 'w-full border rounded px-3 py-2 mb-3 text-sm',
        }),
        React.createElement('textarea', {
          placeholder: '任务目标',
          value: form.objective,
          onChange: e => setForm({...form, objective: e.target.value}),
          className: 'w-full border rounded px-3 py-2 mb-3 text-sm',
          rows: 2,
        }),
        React.createElement('select', {
          value: form.assigneeAgentId,
          onChange: e => setForm({...form, assigneeAgentId: e.target.value}),
          className: 'w-full border rounded px-3 py-2 mb-3 text-sm',
        },
          React.createElement('option', { value: '' }, '选择执行者'),
          agents.map(a => React.createElement('option', { key: a.id, value: a.id }, a.name))
        ),
        React.createElement('select', {
          value: form.reviewerAgentId,
          onChange: e => setForm({...form, reviewerAgentId: e.target.value}),
          className: 'w-full border rounded px-3 py-2 mb-4 text-sm',
        },
          React.createElement('option', { value: '' }, '选择审核者'),
          agents.map(a => React.createElement('option', { key: a.id, value: a.id }, a.name))
        ),
        React.createElement('div', { className: 'flex gap-2' },
          React.createElement('button', {
            onClick: submit,
            disabled: submitting || !form.title,
            className: 'flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition text-sm disabled:opacity-50',
          }, submitting ? '创建中...' : '创建'),
          React.createElement('button', {
            onClick: onClose,
            className: 'flex-1 bg-gray-100 text-gray-600 py-2 rounded hover:bg-gray-200 text-sm',
          }, '取消'),
        )
      )
    );
  }

  /* ── 主组件 ── */
  function TaskTree({ projectId, creatorAgentId, agents, products, setMessage, isAdmin, onEditTask }) {
    const [tree, setTree] = useState([]);
    const [flatTasks, setFlatTasks] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState(null);
    const [showAddModal, setShowAddModal] = useState(null); // { parentTask, type }
    const [dragData, setDragData] = useState(null);

    const fetchTree = useCallback(() => {
      setLoading(true);
      Promise.all([
        api.get(`/tasks/tree/${projectId}`),
        api.get('/tasks'),
      ]).then(([treeRes, allRes]) => {
        const flat = (allRes.data || []).filter(t => t.projectId === projectId);
        setTree(treeRes.data || []);
        setFlatTasks(flat);
        // 自动展开所有节点
        const ids = new Set();
        const collect = (nodes) => { nodes.forEach(n => { ids.add(n.id); if (n.children) collect(n.children); }); };
        collect(treeRes.data || []);
        setExpandedIds(ids);
      }).catch(console.error)
      .finally(() => setLoading(false));
    }, [projectId]);

    useEffect(() => { fetchTree(); }, [fetchTree]);

    // 当前选中的任务
    const selectedTask = flatTasks.find(t => t.id === selectedId) || null;

    /* 选中节点 */
    const handleSelect = (node) => setSelectedId(node.id);

    /* 展开/折叠 */
    const handleToggle = (id) => {
      const next = new Set(expandedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpandedIds(next);
    };

    /* 拖拽 */
    const handleDragStart = (e, node) => {
      e.dataTransfer.setData('text/plain', node.id);
      setDragData(node);
    };

    const handleDrop = async (e, targetNode) => {
      const sourceId = e.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === targetNode.id) return;
      setDragData(null);

      try {
        // 如果拖到节点上，设为该节点的子任务
        // 如果目标节点是源节点的子节点，后端会检测循环引用并拒绝
        await api.patch(`/tasks/${sourceId}/reparent`, {
          parent_task_id: targetNode.id,
        });
        setMessage({ type: 'success', content: '任务已移动' });
        fetchTree();
      } catch (err) {
        setMessage({ type: 'error', content: '移动失败：' + err.message });
      }
    };

    /* 拖拽到任务树空白处（设为顶级任务） */
    const handleTreeDrop = async (e) => {
      const sourceId = e.dataTransfer.getData('text/plain');
      if (!sourceId) return;
      e.preventDefault();
      try {
        await api.patch(`/tasks/${sourceId}/reparent`, {
          parent_task_id: null,
        });
        setMessage({ type: 'success', content: '任务已设为顶级任务' });
        fetchTree();
      } catch (err) {
        setMessage({ type: 'error', content: '移动失败：' + err.message });
      }
    };

    /* 右键菜单 */
    const handleContextMenu = (e, node, action) => {
      if (action === 'delete') {
        handleDelete(node);
        return;
      }
      setContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    /* 删除 */
    const handleDelete = async (node) => {
      if (!isAdmin) { setMessage({ type: 'error', content: '仅管理员可删除任务' }); return; }
      if (!confirm(`确定删除任务「${node.title}」及其所有子任务？`)) return;
      try {
        await api.delete(`/tasks/${node.id}`);
        setMessage({ type: 'success', content: `任务「${node.title}」已删除` });
        fetchTree();
        if (selectedId === node.id) setSelectedId(null);
      } catch (err) {
        setMessage({ type: 'error', content: '删除失败' });
      }
    };

    /* 添加子任务 */
    const handleAddChild = (node) => setShowAddModal({ parentTask: node });

    /* 添加兄弟任务 */
    const handleAddSibling = (node) => setShowAddModal({ parentTask: flatTasks.find(t => t.id === node.parentTaskId) || null });

    /* 编辑任务 - 打开全屏编辑器 */
    const handleEdit = (node) => {
      if (onEditTask) {
        onEditTask('edit', projectId, node.id);
      }
    };

    if (loading) {
      return React.createElement('div', { className: 'text-center py-8 text-gray-500' }, '加载中...');
    }

    return React.createElement('div', { className: 'flex flex-col md:flex-row gap-4 min-h-[400px]' },
      /* ── 左栏：任务树 ── */
      React.createElement('div', { className: 'md:w-1/2 xl:w-2/5 border rounded-lg bg-white overflow-auto max-h-[600px]' },
        React.createElement('div', { className: 'p-3 border-b bg-gray-50 flex items-center justify-between' },
          React.createElement('span', { className: 'text-sm font-semibold text-gray-700' },
            React.createElement('i', { className: 'fas fa-sitemap mr-2' }),
            '任务树'
          ),
          /* 添加任务按钮 - 管理员使用全屏编辑器，普通用户使用内联弹窗 */
          isAdmin && onEditTask
            ? React.createElement('button', {
                onClick: () => onEditTask('create', projectId, null),
                className: 'text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700',
              }, '+ 添加任务')
            : React.createElement('button', {
                onClick: () => setShowAddModal({ parentTask: null }),
                className: 'text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700',
              }, '+ 添加任务'),
        ),
        tree.length === 0
          ? React.createElement('div', { className: 'text-center py-10 text-gray-400' }, '暂无任务')
          : React.createElement('div', { className: 'p-2', onDragOver: (e) => e.preventDefault(), onDrop: handleTreeDrop },
              tree.map(node =>
                React.createElement(TaskTreeNode, {
                  key: node.id, node, depth: 0,
                  selectedId, onSelect: handleSelect,
                  onContextMenu: handleContextMenu,
                  onDragStart: handleDragStart,
                  onDrop: handleDrop,
                  onToggle: handleToggle,
                  expandedIds, isAdmin,
                })
              )
            )
      ),

      /* ── 右栏：任务详情 ── */
      React.createElement('div', { className: 'md:w-1/2 xl:w-3/5 border rounded-lg bg-white p-4 overflow-auto max-h-[600px]' },
        React.createElement(TaskDetail, {
          task: selectedTask,
          agents,
          products,
          setMessage,
          isAdmin,
          onRefresh: fetchTree,
        })
      ),

      /* 右键菜单 */
      contextMenu && React.createElement(ContextMenu, {
        x: contextMenu.x, y: contextMenu.y,
        node: contextMenu.node,
        onClose: () => setContextMenu(null),
        onAddChild: handleAddChild,
        onAddSibling: handleAddSibling,
        onEdit: handleEdit,
        onDelete: handleDelete,
        isAdmin,
      }),

      /* 添加任务弹窗 */
      showAddModal && React.createElement(AddTaskModal, {
        parentTask: showAddModal.parentTask,
        projectId,
        creatorAgentId,
        agents,
        onClose: () => setShowAddModal(null),
        onCreated: fetchTree,
      }),
    );
  }

  window.LoopAgent.TaskTree = TaskTree;
})();
