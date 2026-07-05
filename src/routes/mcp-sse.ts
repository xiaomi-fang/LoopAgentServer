/**
 * MCP (Model Context Protocol) — streamable_http 传输端点
 *
 * 遵循 MCP JSON-RPC 2.0 标准，支持 streamable_http 传输模式。
 *
 * 端点说明：
 *   GET  /loop_engineering/mcp  → 服务发现/健康检查（返回 JSON）
 *   POST /loop_engineering/mcp  → JSON-RPC 消息处理
 *
 * QwenPaw 配置：
 *   {
 *     "transport": "streamable_http",
 *     "url": "http://localhost:3000/loop_engineering/mcp"
 *   }
 *
 * 支持的 JSON-RPC 方法：
 *   initialize  → 初始化连接（标准 MCP 握手）
 *   ping        → 心跳检测
 *   tools/list  → 获取所有可用工具定义
 *   tools/call  → 调用指定工具
 *
 * 参考：https://modelcontextprotocol.io
 */

import { Router, Request, Response } from 'express';
import { MCP_TOOLS } from '../mcp/tools';
import { executeTool } from '../mcp/handler';

const router = Router();

/** CORS 头，确保 Electron/浏览器环境可跨域访问 */
function setCorsHeaders(res: Response) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Version');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, MCP-Version');
}

/** JSON-RPC 成功响应 */
function jsonRpcResult(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

/** JSON-RPC 错误响应 */
function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

/**
 * GET / — 服务发现/健康检查
 *
 * streamable_http 协议中 GET 用于服务发现。
 * 返回简单状态，让客户端确认服务可达。
 */
router.get('/', (req: Request, res: Response) => {
  setCorsHeaders(res);
  res.json({
    status: 'ok',
    protocol: 'Model Context Protocol',
    version: '1.0',
    transport: 'streamable_http',
    endpoints: {
      tools_list: { method: 'tools/list', type: 'json-rpc' },
      tools_call: { method: 'tools/call', type: 'json-rpc' },
    },
  });
});

/**
 * OPTIONS / — CORS 预检请求
 */
router.options('/', (req: Request, res: Response) => {
  setCorsHeaders(res);
  res.status(204).end();
});

/**
 * POST / — JSON-RPC 消息处理
 *
 * 接收标准 JSON-RPC 2.0 请求，支持：
 *   ping        → 返回 {} 
 *   tools/list  → 返回工具列表
 *   tools/call  → 调用工具并返回结果
 *
 * 请求体：{ "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }
 * 响应体：{ "jsonrpc": "2.0", "id": 1, "result": { "tools": [...] } }
 */
router.post('/', async (req: Request, res: Response) => {
  setCorsHeaders(res);

  try {
    const { jsonrpc, id, method, params } = req.body;

    // MCP-Version 响应头
    res.setHeader('MCP-Version', '1.0');

    // 校验 JSON-RPC 2.0 格式
    if (jsonrpc !== '2.0') {
      res.status(400).json(jsonRpcError(id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0"'));
      return;
    }

    if (id === undefined || id === null) {
      // JSON-RPC 通知（无 id）— 不响应
      res.status(204).end();
      return;
    }

    switch (method) {
      case 'initialize': {
        const clientInfo = params?.clientInfo || {};
        console.log(`[MCP] Client connected: ${clientInfo.name || 'unknown'} v${clientInfo.version || '?'}`);
        res.json(jsonRpcResult(id, {
          protocolVersion: '1.0',
          capabilities: { tools: {} },
          serverInfo: {
            name: '环枢',
            version: '1.0',
          },
        }));
        break;
      }

      case 'ping': {
        res.json(jsonRpcResult(id, {}));
        break;
      }

      case 'tools/list': {
        res.json(jsonRpcResult(id, { tools: MCP_TOOLS }));
        break;
      }

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (!name) {
          res.json(jsonRpcError(id, -32602, 'Missing tool name in params'));
          return;
        }
        const result = await executeTool(name as string, (args as Record<string, unknown>) || {});

        // 从 MCPResponse 中提取文本内容
        const textContent = result.content
          ?.map((c: { type: string; text: string }) => c.text)
          .join('\n') || '';

        if (result.isError) {
          res.json(jsonRpcError(id, -32000, textContent));
        } else {
          // 尝试解析 JSON 字符串为结构化结果
          try {
            res.json(jsonRpcResult(id, JSON.parse(textContent)));
          } catch {
            res.json(jsonRpcResult(id, { text: textContent }));
          }
        }
        break;
      }

      default: {
        res.json(jsonRpcError(id, -32601, `Method not found: ${method}`));
      }
    }
  } catch (err: any) {
    res.json(jsonRpcError(req.body?.id ?? null, -32603, err?.message || 'Internal error'));
  }
});

export default router;
