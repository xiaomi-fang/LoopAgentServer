/**
 * MCP (Model Context Protocol) 工具定义
 *
 * 遵循 MCP 标准规范，通过 JSON Schema 定义每个工具的入参格式。
 * 所有工具映射到底层 Service 层，与 REST API 共享同一套业务逻辑。
 *
 * ⚠️ 安全策略：
 *   - MCP 不暴露任何删除接口（delete），防止误操作
 *   - 所有工具无需管理员认证，适合 LLM 自动化编排
 *
 * 参考：https://modelcontextprotocol.io
 */

/** MCP 工具定义结构 */
export interface MCPTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * 所有对外暴露的 MCP 工具列表
 *
 * === 智能体 (Agent) ===
 *   register_agent     — 注册新智能体
 *   list_agents        — 获取全部智能体
 *   get_agent          — 按 ID 查询智能体
 *   discover_agents    — 按能力发现空闲智能体
 *   agent_heartbeat    — 更新智能体心跳
 *   update_agent       — 更新智能体信息
 *
 * === 项目 (Project) ===
 *   create_project     — 创建项目
 *   list_projects      — 获取全部项目
 *   get_project        — 按 ID 查询项目
 *   get_project_context— 获取项目完整上下文（含任务树）
 *   update_project     — 更新项目
 *
 * === 任务 (Task) ===
 *   create_task        — 创建任务
 *   list_tasks         — 获取全部任务
 *   get_task           — 按 ID 查询任务
 *   claim_task         — 认领任务
 *   update_task_status — 更新任务状态
 *   review_task        — 审核任务
 *   get_task_tree      — 获取项目任务树
 *   update_task        — 更新任务
 *
 * === 产物 (Product) ===
 *   publish_product    — 发布产物
 *   list_products      — 获取全部产物
 *   update_product     — 更新产物
 */
export const MCP_TOOLS: MCPTool[] = [
  // ── 智能体 ──────────────────────────────────────────────
  {
    name: 'register_agent',
    description: '注册一个新的智能体（Agent），注册后可通过 heartbeat 维持在线状态',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '智能体名称' },
        role: { type: 'string', description: '角色描述，如 "测试工程师"' },
        capabilities: { type: 'array', items: { type: 'string' }, description: '能力列表，如 ["web_search", "code_review"]' },
        endpoint: { type: 'string', description: '回调地址（可选）' },
      },
      required: ['name', 'role'],
    },
  },
  {
    name: 'list_agents',
    description: '获取所有已注册的智能体列表',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_agent',
    description: '按 ID 查询单个智能体的详细信息',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: '智能体 ID' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'discover_agents',
    description: '根据能力筛选发现空闲（idle）状态的智能体',
    input_schema: {
      type: 'object',
      properties: {
        capability: { type: 'string', description: '按能力筛选，如 "code_review"' },
      },
    },
  },
  {
    name: 'agent_heartbeat',
    description: '更新智能体的最后心跳时间，维持在线状态',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: '智能体 ID' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'update_agent',
    description: '更新智能体的名称、角色、能力等信息',
    input_schema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: '智能体 ID' },
        name: { type: 'string', description: '新名称' },
        role: { type: 'string', description: '新角色' },
        capabilities: { type: 'array', items: { type: 'string' }, description: '新能力列表' },
        status: { type: 'string', description: '新状态（idle / busy / offline）' },
      },
      required: ['agent_id'],
    },
  },

  // ── 项目 ────────────────────────────────────────────────
  {
    name: 'create_project',
    description: '创建一个新项目，需指定名称、GitHub 链接和主智能体',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '项目名称' },
        description: { type: 'string', description: '项目描述' },
        goal: { type: 'string', description: '项目目标' },
        acceptance_criteria: { type: 'string', description: '项目验收标准' },
        github_url: { type: 'string', description: 'GitHub 仓库链接' },
        creator_agent_id: { type: 'string', description: '主智能体 ID（项目创建者/负责人）' },
      },
      required: ['name', 'github_url', 'creator_agent_id'],
    },
  },
  {
    name: 'list_projects',
    description: '获取所有项目列表',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_project',
    description: '按 ID 查询单个项目的详细信息',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '项目 ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_project_context',
    description: '获取项目的完整上下文，包括任务树和所有产物',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '项目 ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_project',
    description: '更新项目信息',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '项目 ID' },
        name: { type: 'string', description: '项目名称' },
        description: { type: 'string', description: '项目描述' },
        goal: { type: 'string', description: '项目目标' },
        acceptance_criteria: { type: 'string', description: '项目验收标准' },
        github_url: { type: 'string', description: 'GitHub 链接' },
        status: { type: 'string', description: '状态：pending_activation / planning / planned / under_review / review_failed / review_passed / in_development / development_paused' },
      },
      required: ['project_id'],
    },
  },

  // ── 任务 ────────────────────────────────────────────────
  {
    name: 'create_task',
    description: '在项目下创建新任务，需指定执行者和审核者',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '所属项目 ID' },
        parent_task_id: { type: 'string', description: '父任务 ID（可选，不传则为顶级任务）' },
        title: { type: 'string', description: '任务标题' },
        objective: { type: 'string', description: '任务目标' },
        acceptance_criteria: { type: 'string', description: '任务验收标准' },
        creator_agent_id: { type: 'string', description: '创建者（执行者）智能体 ID' },
        assignee_agent_id: { type: 'string', description: '执行者智能体 ID' },
        reviewer_agent_id: { type: 'string', description: '审核者智能体 ID' },
      },
      required: ['project_id', 'title', 'objective', 'acceptance_criteria', 'creator_agent_id', 'assignee_agent_id', 'reviewer_agent_id'],
    },
  },
  {
    name: 'list_tasks',
    description: '获取全部任务列表，可按项目 ID 或状态筛选',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '按项目 ID 筛选（可选）' },
        status: { type: 'string', description: '按状态筛选（可选），值为 pending / in_progress / pending_review / completed / failed' },
      },
    },
  },
  {
    name: 'get_task',
    description: '按 ID 查询单个任务详情',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '任务 ID' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'claim_task',
    description: '智能体认领一个 pending 状态的任务，将其状态变为 in_progress',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '任务 ID' },
        agent_id: { type: 'string', description: '认领任务的智能体 ID' },
      },
      required: ['task_id', 'agent_id'],
    },
  },
  {
    name: 'update_task_status',
    description: '更新任务状态（如设为 pending_review 或 failed），附带提交说明',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '任务 ID' },
        status: { type: 'string', description: '新状态：in_progress / pending_review / completed / failed' },
        submit_note: { type: 'string', description: '提交说明（可选）' },
      },
      required: ['task_id', 'status'],
    },
  },
  {
    name: 'review_task',
    description: '审核已完成的任务，同意则标记 completed，驳回则标记 in_progress',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '任务 ID' },
        approved: { type: 'boolean', description: '是否通过审核' },
        comment: { type: 'string', description: '审核意见（可选）' },
      },
      required: ['task_id', 'approved'],
    },
  },
  {
    name: 'get_task_tree',
    description: '获取指定项目的任务树（层级结构，含父子关系）',
    input_schema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: '项目 ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_task',
    description: '更新任务信息',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '任务 ID' },
        title: { type: 'string', description: '任务标题' },
        objective: { type: 'string', description: '任务目标' },
        acceptance_criteria: { type: 'string', description: '验收标准' },
        assignee_agent_id: { type: 'string', description: '执行者智能体 ID' },
        reviewer_agent_id: { type: 'string', description: '审核者智能体 ID' },
      },
      required: ['task_id'],
    },
  },

  // ── 产物 ────────────────────────────────────────────────
  {
    name: 'publish_product',
    description: '在任务完成后发布产物（如代码仓库、文档、API 定义等）',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '关联任务 ID' },
        product_type: { type: 'string', description: '产物类型：code_repo / document / api_definition / image / data_file' },
        url: { type: 'string', description: '产物链接' },
        description: { type: 'string', description: '产物描述（可选）' },
        version: { type: 'string', description: '版本号，默认 v1' },
      },
      required: ['task_id', 'product_type', 'url'],
    },
  },
  {
    name: 'list_products',
    description: '获取所有已发布的产物列表',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_product',
    description: '更新产物信息',
    input_schema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: '产物 ID' },
        product_type: { type: 'string', description: '产物类型' },
        url: { type: 'string', description: '产物链接' },
        description: { type: 'string', description: '产物描述' },
        version: { type: 'string', description: '版本号' },
      },
      required: ['product_id'],
    },
  },
];
