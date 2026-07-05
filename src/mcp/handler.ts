/**
 * MCP (Model Context Protocol) 工具执行处理器
 *
 * 接收工具名称和参数，路由到对应的 Service 层函数执行。
 * 与 REST API 共享同一套业务逻辑，不重复实现。
 *
 * 返回格式遵循 MCP 标准：{ content: [{ type: 'text', text: '...' }] }
 */

import * as agentService from '../services/agent.service';
import * as projectService from '../services/project.service';
import * as taskService from '../services/task.service';
import * as productService from '../services/product.service';
import { MCPTool, MCP_TOOLS } from './tools';

/** MCP 统一返回格式 */
interface MCPResponse {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

/** 内部工具函数映射表 */
const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<MCPResponse>> = {};

/**
 * 注册一个工具处理函数
 * @param name 工具名称，需与 MCP_TOOLS 定义一致
 * @param handler 异步处理函数，接收参数对象，返回 MCPResponse
 */
function register(name: string, handler: (args: Record<string, unknown>) => Promise<MCPResponse>) {
  toolHandlers[name] = handler;
}

// ── 智能体工具注册 ─────────────────────────────────────────

register('register_agent', async (args) => {
  const agent = await agentService.registerAgent({
    name: args.name as string,
    role: args.role as string,
    capabilities: args.capabilities as string[] | undefined,
    endpoint: args.endpoint as string | undefined,
  });
  return { content: [{ type: 'text', text: JSON.stringify(agent) }] };
});

register('list_agents', async () => {
  const agents = await agentService.discoverAgents();
  return { content: [{ type: 'text', text: JSON.stringify(agents) }] };
});

register('get_agent', async (args) => {
  const agent = await agentService.getAgent(args.agent_id as string);
  if (!agent) {
    return { content: [{ type: 'text', text: '智能体不存在' }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(agent) }] };
});

register('discover_agents', async (args) => {
  const agents = await agentService.discoverAgents(args.capability as string | undefined);
  return { content: [{ type: 'text', text: JSON.stringify(agents) }] };
});

register('agent_heartbeat', async (args) => {
  const agent = await agentService.heartbeat(args.agent_id as string);
  return { content: [{ type: 'text', text: JSON.stringify(agent) }] };
});

register('delete_agent', async (args) => {
  await agentService.deleteAgent(args.agent_id as string);
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: '已删除' }) }] };
});

register('update_agent', async (args) => {
  const agent = await agentService.updateAgent(args.agent_id as string, {
    name: args.name as string | undefined,
    role: args.role as string | undefined,
    capabilities: args.capabilities as string[] | undefined,
    status: args.status as string | undefined,
  });
  return { content: [{ type: 'text', text: JSON.stringify(agent) }] };
});

// ── 项目工具注册 ──────────────────────────────────────────

register('create_project', async (args) => {
  const project = await projectService.createProject({
    name: args.name as string,
    description: args.description as string | undefined,
    goal: args.goal as string | undefined,
    acceptanceCriteria: args.acceptance_criteria as string | undefined,
    githubUrl: args.github_url as string | undefined,
    creatorAgentId: args.creator_agent_id as string,
  });
  return { content: [{ type: 'text', text: JSON.stringify(project) }] };
});

register('list_projects', async () => {
  const projects = await projectService.getAllProjects();
  return { content: [{ type: 'text', text: JSON.stringify(projects) }] };
});

register('get_project', async (args) => {
  const project = await projectService.getProject(args.project_id as string);
  if (!project) {
    return { content: [{ type: 'text', text: '项目不存在' }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(project) }] };
});

register('get_project_context', async (args) => {
  const context = await projectService.getProjectContext(args.project_id as string);
  if (!context) {
    return { content: [{ type: 'text', text: '项目不存在' }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(context) }] };
});

register('update_project', async (args) => {
  const project = await projectService.updateProject(args.project_id as string, {
    name: args.name as string | undefined,
    description: args.description as string | undefined,
    goal: args.goal as string | undefined,
    acceptanceCriteria: args.acceptance_criteria as string | undefined,
    githubUrl: args.github_url as string | undefined,
    status: args.status as string | undefined,
  });
  return { content: [{ type: 'text', text: JSON.stringify(project) }] };
});

register('delete_project', async (args) => {
  await projectService.deleteProject(args.project_id as string);
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: '已删除' }) }] };
});

// ── 任务工具注册 ──────────────────────────────────────────

register('create_task', async (args) => {
  const task = await taskService.createTask({
    projectId: args.project_id as string,
    parentTaskId: args.parent_task_id as string | undefined,
    title: args.title as string,
    objective: args.objective as string,
    acceptanceCriteria: args.acceptance_criteria as string,
    creatorAgentId: args.creator_agent_id as string,
    assigneeAgentId: args.assignee_agent_id as string,
    reviewerAgentId: args.reviewer_agent_id as string,
  });
  return { content: [{ type: 'text', text: JSON.stringify(task) }] };
});

register('list_tasks', async (args) => {
  const projectId = args.project_id as string | undefined;
  const status = args.status as string | undefined;
  let tasks;
  if (projectId) {
    tasks = await taskService.getTaskTree(projectId);
  } else {
    tasks = await taskService.getAllTasks();
  }
  // 如果传了 status 则过滤
  if (status && Array.isArray(tasks)) {
    tasks = tasks.filter((t: any) => t.status === status);
  }
  return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
});

register('get_task', async (args) => {
  const task = await taskService.getTaskById(args.task_id as string);
  if (!task) {
    return { content: [{ type: 'text', text: '任务不存在' }], isError: true };
  }
  return { content: [{ type: 'text', text: JSON.stringify(task) }] };
});

register('claim_task', async (args) => {
  const task = await taskService.claimTask(args.task_id as string, args.agent_id as string);
  return { content: [{ type: 'text', text: JSON.stringify(task) }] };
});

register('update_task_status', async (args) => {
  const task = await taskService.updateTaskStatus(
    args.task_id as string,
    args.status as any,
    args.submit_note ? { submitNote: args.submit_note } : undefined,
  );
  return { content: [{ type: 'text', text: JSON.stringify(task) }] };
});

register('review_task', async (args) => {
  const task = await taskService.reviewTask(
    args.task_id as string,
    '',  // reviewerId - 通过 MCP 审核时不校验审核人身份
    args.approved ? 'pass' : 'fail',
    (args.comment as string) || '',
  );
  return { content: [{ type: 'text', text: JSON.stringify(task) }] };
});

register('get_task_tree', async (args) => {
  const tree = await taskService.getTaskTree(args.project_id as string);
  return { content: [{ type: 'text', text: JSON.stringify(tree) }] };
});

register('delete_task', async (args) => {
  await taskService.deleteTask(args.task_id as string);
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: '已删除' }) }] };
});

register('update_task', async (args) => {
  const task = await taskService.updateTask(args.task_id as string, {
    title: args.title as string | undefined,
    objective: args.objective as string | undefined,
    acceptanceCriteria: args.acceptance_criteria as string | undefined,
    assigneeAgentId: args.assignee_agent_id as string | undefined,
    reviewerAgentId: args.reviewer_agent_id as string | undefined,
  });
  return { content: [{ type: 'text', text: JSON.stringify(task) }] };
});

// ── 产物工具注册 ──────────────────────────────────────────

register('publish_product', async (args) => {
  const product = await productService.publishProduct({
    taskId: args.task_id as string,
    productType: args.product_type as string,
    url: args.url as string,
    description: args.description as string | undefined,
    version: args.version as string | undefined,
  });
  return { content: [{ type: 'text', text: JSON.stringify(product) }] };
});

register('list_products', async () => {
  const products = await productService.getAllProducts();
  return { content: [{ type: 'text', text: JSON.stringify(products) }] };
});

register('delete_product', async (args) => {
  await productService.deleteProduct(args.product_id as string);
  return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: '已删除' }) }] };
});

register('update_product', async (args) => {
  const product = await productService.updateProduct(args.product_id as string, {
    productType: args.product_type as string | undefined,
    url: args.url as string | undefined,
    description: args.description as string | undefined,
  });
  return { content: [{ type: 'text', text: JSON.stringify(product) }] };
});

// ── 导出 ──────────────────────────────────────────────────

/** 获取所有工具定义 */
export function getTools(): MCPTool[] {
  return MCP_TOOLS;
}

/**
 * 执行 MCP 工具调用
 *
 * @param name   工具名称
 * @param args   工具参数（key-value 对象）
 * @returns      标准 MCP 响应 { content: [...] }
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<MCPResponse> {
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: `未知工具：${name}` }],
      isError: true,
    };
  }
  try {
    return await handler(args);
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `工具执行失败：${err.message || String(err)}` }],
      isError: true,
    };
  }
}
