/* ReviewRecords.js - 审核记录组件 */
(function() {
  const { useState, useEffect } = React;
  const api = window.LoopAgent.api;

  const STATUS_LABELS = {
    in_review: '审核中',
    approved: '审核通过',
    rejected: '审核未通过',
    re_requested: '重新请求审核',
  };
  const STATUS_COLORS = {
    in_review: 'bg-blue-100 text-blue-600',
    approved: 'bg-green-100 text-green-600',
    rejected: 'bg-red-100 text-red-600',
    re_requested: 'bg-amber-100 text-amber-600',
  };

  function ReviewRecords({ taskId, agents, setMessage, isAdmin, onRefresh }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ reviewerId: '', suggestion: '', status: 'in_review' });

    const fetchRecords = () => {
      if (!taskId) return;
      setLoading(true);
      api.get(`/review-records/task/${taskId}`)
        .then(res => setRecords(res.data || []))
        .catch(err => setMessage({ type: 'error', content: '获取审核记录失败' }))
        .finally(() => setLoading(false));
    };

    useEffect(() => {
      if (taskId) fetchRecords();
      else setRecords([]);
    }, [taskId]);

    const handleCreate = async () => {
      if (!form.reviewerId || !form.suggestion) return;
      try {
        await api.post('/review-records', {
          task_id: taskId,
          reviewer_id: form.reviewerId,
          suggestion: form.suggestion,
          status: form.status,
        });
        setForm({ reviewerId: '', suggestion: '', status: 'in_review' });
        setShowForm(false);
        setMessage({ type: 'success', content: '审核记录已创建' });
        fetchRecords();
        if (onRefresh) onRefresh();
      } catch (err) {
        setMessage({ type: 'error', content: '创建审核记录失败' });
      }
    };

    const handleStatusUpdate = async (recordId, newStatus, reviewerId) => {
      try {
        if (newStatus === 're_requested') {
          // 执行者重新请求审核
          await api.request(`/review-records/${recordId}/re-request`, {
            method: 'PATCH',
            body: JSON.stringify({ assignee_id: reviewerId }),
          });
        } else {
          // 审核者通过/驳回
          await api.request(`/review-records/${recordId}/review`, {
            method: 'PATCH',
            body: JSON.stringify({ reviewer_id: reviewerId, result: newStatus }),
          });
        }
        setMessage({ type: 'success', content: `状态已更新为「${STATUS_LABELS[newStatus] || newStatus}」` });
        fetchRecords();
      } catch (err) {
        setMessage({ type: 'error', content: '更新状态失败' });
      }
    };

    if (!taskId) return null;

    return React.createElement('div', { className: 'mt-4 border-t pt-4' },
      React.createElement('div', { className: 'flex items-center justify-between mb-3' },
        React.createElement('h4', { className: 'text-sm font-semibold text-gray-700' },
          React.createElement('i', { className: 'fas fa-clipboard-check mr-2' }),
          '审核记录',
          records.length > 0 && React.createElement('span', { className: 'ml-1 text-xs text-gray-400' }, `(${records.length})`)
        ),
        isAdmin && React.createElement('button', {
          onClick: () => setShowForm(!showForm),
          className: `text-xs px-2 py-1 rounded ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`,
        }, showForm ? '✕ 取消' : '+ 添加审核记录'),
      ),

      /* 添加审核记录表单 */
      showForm && React.createElement('div', { className: 'bg-blue-50 rounded p-3 mb-3 space-y-2' },
        React.createElement('div', { className: 'flex flex-col sm:flex-row gap-2' },
          React.createElement('select', {
            value: form.reviewerId,
            onChange: e => setForm({...form, reviewerId: e.target.value}),
            className: 'border rounded px-2 py-1.5 text-sm flex-1',
          },
            React.createElement('option', { value: '' }, '选择审核者 *'),
            agents.map(a => React.createElement('option', { key: a.id, value: a.id }, a.name))
          ),
          React.createElement('select', {
            value: form.status,
            onChange: e => setForm({...form, status: e.target.value}),
            className: 'border rounded px-2 py-1.5 text-sm w-32',
          },
            React.createElement('option', { value: 'in_review' }, '审核中'),
            React.createElement('option', { value: 'approved' }, '审核通过'),
            React.createElement('option', { value: 'rejected' }, '审核未通过'),
          ),
        ),
        React.createElement('textarea', {
          placeholder: '审核建议 *（一经提交不可修改）',
          value: form.suggestion,
          onChange: e => setForm({...form, suggestion: e.target.value}),
          className: 'border rounded px-2 py-1.5 text-sm w-full',
          rows: 2,
        }),
        React.createElement('button', {
          onClick: handleCreate,
          disabled: !form.reviewerId || !form.suggestion,
          className: 'bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm disabled:opacity-50',
        }, '提交审核记录'),
      ),

      /* 审核记录列表 */
      loading
        ? React.createElement('div', { className: 'text-center py-4 text-gray-400 text-sm' }, '加载中...')
        : records.length === 0
          ? React.createElement('div', { className: 'text-center py-6 text-gray-400 text-sm' }, '暂无审核记录')
          : React.createElement('div', { className: 'overflow-x-auto' },
              React.createElement('table', { className: 'w-full text-xs' },
                React.createElement('thead', null,
                  React.createElement('tr', { className: 'border-b text-gray-500' },
                    React.createElement('th', { className: 'py-2 text-left' }, '记录 ID'),
                    React.createElement('th', { className: 'py-2 text-left' }, '审核者'),
                    React.createElement('th', { className: 'py-2 text-left' }, '建议'),
                    React.createElement('th', { className: 'py-2 text-left' }, '状态'),
                    React.createElement('th', { className: 'py-2 text-left' }, '创建日期'),
                    isAdmin && React.createElement('th', { className: 'py-2 text-left' }, '操作'),
                  )
                ),
                React.createElement('tbody', null,
                  records.map(record => {
                    const reviewer = agents.find(a => a.id === record.reviewerId);
                    return React.createElement('tr', { key: record.id, className: 'border-b hover:bg-gray-50' },
                      React.createElement('td', { className: 'py-2 font-mono text-gray-500' }, record.id.substring(0, 8) + '...'),
                      React.createElement('td', { className: 'py-2 font-medium' }, reviewer ? reviewer.name : record.reviewerId.substring(0, 8)),
                      React.createElement('td', { className: 'py-2 max-w-[200px]' },
                        React.createElement('p', { className: 'truncate text-gray-600', title: record.suggestion }, record.suggestion)
                      ),
                      React.createElement('td', { className: 'py-2' },
                        React.createElement('span', { className: `text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[record.status] || 'bg-gray-100'}` },
                          STATUS_LABELS[record.status] || record.status
                        )
                      ),
                      React.createElement('td', { className: 'py-2 text-gray-500' }, new Date(record.createdAt).toLocaleDateString()),
                      isAdmin && React.createElement('td', { className: 'py-2' },
                        record.status === 'rejected' && React.createElement('button', {
                          onClick: () => handleStatusUpdate(record.id, 're_requested', record.reviewerId),
                          className: 'text-amber-600 hover:text-amber-800 mr-2',
                          title: '标记为重新请求审核',
                        }, '重新请求'),
                        record.status === 're_requested' && React.createElement('button', {
                          onClick: () => handleStatusUpdate(record.id, 'in_review', record.reviewerId),
                          className: 'text-blue-600 hover:text-blue-800 mr-2',
                          title: '标记为审核中',
                        }, '重新审核'),
                        (record.status === 'in_review' || record.status === 're_requested') && React.createElement(React.Fragment, null,
                          React.createElement('button', {
                            onClick: () => handleStatusUpdate(record.id, 'approved', record.reviewerId),
                            className: 'text-green-600 hover:text-green-800 mr-2',
                            title: '审核通过',
                          }, '通过'),
                          React.createElement('button', {
                            onClick: () => handleStatusUpdate(record.id, 'rejected', record.reviewerId),
                            className: 'text-red-600 hover:text-red-800',
                            title: '审核未通过',
                          }, '驳回'),
                        ),
                      )
                    );
                  })
                )
              )
            )
    );
  }

  window.LoopAgent.ReviewRecords = ReviewRecords;
})();
