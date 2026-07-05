/**
 * MCP (Model Context Protocol) — streamable_http 传输端点
 *
 * 遵循 MCP JSON-RPC 2.0 标准，支持 streamable_http 传输模式。
 *
 * QwenPaw 配置：
 *   { "transport": "streamable_http", "url": "http://localhost:3000/loop_engineering/mcp" }
 *
 * 参考：https://modelcontextprotocol.io
 */

import { Router, Request, Response } from 'express';
import { MCP_TOOLS } from '../mcp/tools';
import { executeTool } from '../mcp/handler';

const router = Router();

function setCorsHeaders(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Version');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, MCP-Version');
}

function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

/** 生成唯一会话 ID */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 将工具定义中的 snake_case 转为 MCP 标准的 camelCase */
function toMCPTools(tools: typeof MCP_TOOLS) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.input_schema, // MCP 标准要求 inputSchema（驼峰）
  }));
}

/**
 * GET / — 服务发现/健康检查
 *
 * 返回服务元信息，让客户端确认服务可达和协议版本。
 * 注意：返回普通 JSON（非 SSE 流），避免客户端检测时挂起。
 */
router.get('/', (req: Request, res: Response) => {
  setCorsHeaders(res);
  res.json({
    status: 'ok',
    name: '环枢',
    version: '1.0',
    transport: 'streamable_http',
  });
});

/**
 * OPTIONS / — CORS 预检
 */
router.options('/', (req: Request, res: Response) => {
  setCorsHeaders(res);
  res.status(204).end();
});

/**
 * POST / — JSON-RPC 消息处理（同时支持 JSON 和 SSE 响应）
 *
 * 接收并处理 JSON-RPC 2.0 请求，支持：
 *   initialize  → 初始化连接（标准 MCP 握手）
 *   ping        → 心跳
 *   tools/list  → 获取工具列表
 *   tools/call  → 调用工具
 *
 * 响应格式：
 *   - 默认返回 JSON (Content-Type: application/json)
 *   - 如果请求头 Accept 包含 text/event-stream，返回 SSE 流
 */
router.post('/', async (req: Request, res: Response) => {
  setCorsHeaders(res);
  res.setHeader('MCP-Version', '1.0');

  console.log(`[MCP] POST body type: ${typeof req.body}, ct: ${req.headers['content-type']}, accept: ${req.headers['accept']}`);

  // 解析请求体（兼容 JSON 对象或未解析的字符串）
  let parsed: any;
  if (typeof req.body === 'string' || typeof req.body === 'number' || !req.body) {
    try { parsed = req.body ? JSON.parse(String(req.body)) : {}; } catch { parsed = {}; }
  } else {
    parsed = req.body;
  }

  const bodyPreview = JSON.stringify(parsed).slice(0, 500);
  console.log(`[MCP] POST received: ${bodyPreview}`);

  try {
    const { jsonrpc, id, method, params } = parsed;

    if (jsonrpc !== '2.0') {
      console.log(`[MCP] Invalid jsonrpc version: ${jsonrpc}`);
      res.status(400).json(jsonRpcError(id ?? null, -32600, 'Invalid Request'));
      return;
    }

    if (id === undefined || id === null) {
      console.log(`[MCP] Notification (no id), 204`);
      res.status(204).end();
      return;
    }

    console.log(`[MCP] Executing method: ${method}, id: ${id}`);

    switch (method) {
      case 'initialize': {
        const clientInfo = params?.clientInfo || {};
        console.log(`[MCP] Client initialize: ${JSON.stringify(clientInfo)}`);
        const sessionId = generateSessionId();
        console.log(`[MCP] Session created: ${sessionId}`);
        res.json(jsonRpcResult(id, {
          protocolVersion: '1.0',
          capabilities: { tools: {} },
          serverInfo: { name: '环枢', version: '1.0' },
          _meta: { sessionId },
        }));
        break;
      }

      case 'ping': {
        res.json(jsonRpcResult(id, {}));
        break;
      }

      case 'tools/list': {
        console.log(`[MCP] tools/list returning ${MCP_TOOLS.length} tools`);
        res.json(jsonRpcResult(id, { tools: toMCPTools(MCP_TOOLS) }));
        break;
      }

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        console.log(`[MCP] tools/call: ${name}`);
        if (!name) {
          res.json(jsonRpcError(id, -32602, 'Missing tool name'));
          return;
        }
        const result = await executeTool(name as string, (args as Record<string, unknown>) || {});
        const textContent = result.content
          ?.map((c: { type: string; text: string }) => c.text)
          .join('\n') || '';

        if (result.isError) {
          res.json(jsonRpcError(id, -32000, textContent));
        } else {
          try { res.json(jsonRpcResult(id, JSON.parse(textContent))); }
          catch { res.json(jsonRpcResult(id, { text: textContent })); }
        }
        break;
      }

      default: {
        console.log(`[MCP] Unknown method: ${method}`);
        res.json(jsonRpcError(id, -32601, `Method not found: ${method}`));
      }
    }
  } catch (err: any) {
    console.error(`[MCP] POST error:`, err.message);
    res.json(jsonRpcError(parsed?.id ?? null, -32603, err?.message || 'Internal error'));
  }
});

export default router;
