/**
 * MCP (Model Context Protocol) HTTP 路由
 *
 * 提供两个标准端点：
 *   POST /mcp/v1/tools      — 列出所有可用工具及 JSON Schema
 *   POST /mcp/v1/execute    — 执行指定工具
 *
 * ⚠️ 安全策略：
 *   - 不暴露任何删除接口
 *   - 所有工具无需管理员认证
 *
 * 此模块仅添加 MCP 协议层，不修改现有 REST API 和前端代码。
 * 所有工具调用委托到 MCP handler，handler 再映射到各 Service。
 *
 * 参考 MCP 规范：https://modelcontextprotocol.io
 */

import { Router } from 'express';
import { MCP_TOOLS } from '../mcp/tools';
import { executeTool } from '../mcp/handler';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();

/**
 * POST /mcp/v1/tools
 *
 * 返回全部 MCP 工具定义列表，每个工具包含：
 *   - name:        工具名称（用于 execute 时的标识）
 *   - description: 工具功能描述
 *   - input_schema:JSON Schema 定义入参格式
 *
 * LLM 可通过此接口获知当前系统支持的所有能力。
 */
router.post('/v1/tools', asyncHandler(async (_req, res) => {
  res.json({
    tools: MCP_TOOLS,
  });
}));

/**
 * POST /mcp/v1/execute
 *
 * 调用一个 MCP 工具，请求体格式：
 *   {
 *     name: '工具名称',
 *     arguments: { key: value }
 *   }
 *
 * 成功响应：
 *   { content: [{ type: 'text', text: '...' }] }
 *
 * 失败响应（HTTP 200，但 isError: true）：
 *   { content: [{ type: 'text', text: '...' }], isError: true }
 */
router.post('/v1/execute', asyncHandler(async (req, res) => {
  const { name, arguments: args } = req.body;

  if (!name) {
    res.status(400).json({
      content: [{ type: 'text', text: '缺少必填字段：name' }],
      isError: true,
    });
    return;
  }

  const result = await executeTool(name as string, (args as Record<string, unknown>) || {});
  res.json(result);
}));

export default router;
