// 任务管理 - 已整合到项目详情中
(function() {
  function Tasks() {
    return React.createElement('div', { className: 'text-center py-12' },
      React.createElement('i', { className: 'fas fa-info-circle text-4xl text-gray-300 mb-4' }),
      React.createElement('p', { className: 'text-gray-500 mb-2' }, '任务管理已整合到项目详情中'),
      React.createElement('p', { className: 'text-gray-400 text-sm' }, '请通过「项目管理」进入项目查看和管理任务')
    );
  }
  window.LoopAgent.Tasks = Tasks;
})();
