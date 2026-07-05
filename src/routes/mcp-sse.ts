/**
 * MCP (Model Context Protocol) 统一端点 — 支持 streamable_http 传输
 *
 * 提供单个端点 /mcp，同时处理：
 *   GET  /mcp  → SSE 流建立（用于 streamable_http 长连接）
 *   POST /mcp  → JSON-RPC 消息处理（tools/list、tools/call）
 *
 * 挂载方式（在 index.ts 中）：
 *   app.use('/mcp', mcpSseRoutes);
 *
 * QwenPaw 配置：
 *   {
 *     "transport": "streamable_http",
 *     "url": "http://localhost:3000/mcp"
 *   }
 *
 * JSON-RPC 请求格式：
 *   { "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }
 *   { "jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": { "name": "...", "arguments": {...} } }
 *
 * 参考 MCP 规范：https://modelcontextprotocol.io
 */

import { Router, Request, Response } from 'express';
import { MCP_TOOLS } from '../mcp/tools';
import { executeTool } from '../mcp/handler';

const router = Router();

/**
 * GET /mcp — SSE 流建立
 *
 * 用于 streamable_http 传输模式的连接初始化。
 * 客户端通过 EventSource 连接到此端点后，服务端可通过 SSE 推送消息。
 */
router.get('/', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // 发送初始连接成功事件
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok' })}\n\n`);

  // 定时发送心跳保持连接
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 15000);

  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * POST /mcp — JSON-RPC 消息处理
 *
 * 接收标准 JSON-RPC 2.0 请求，支持：
 *   tools/list  → 获取所有可用工具定义
 *   tools/call  → 调用指定工具
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { jsonrpc, id, method, params } = req.body;

    // 校验 JSON-RPC 格式
    if (jsonrpc !== '2.0' || id === undefined || id === null || !method) {
      res.status(400).json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32600, message: 'Invalid Request' },
      });
      return;
    }

    switch (method) {
      case 'tools/list': {
        res.json({
          jsonrpc: '2.0',
          id,
          result: { tools: MCP_TOOLS },
        });
        break;
      }

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (!name) {
          res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Missing tool name' },
          });
          return;
        }
        const result = await executeTool(name as string, (args as Record<string, unknown>) || {});

        // 从 MCPResponse 中提取文本内容
        const textContent = result.content?.map((c: { type: string; text: string }) => c.text).join('\n') || '';

        if (result.isError) {
          res.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32000, message: textContent },
          });
        } else {
          res.json({
            jsonrpc: '2.0',
            id,
            result: JSON.parse(textContent),
          });
        }
        break;
      }

      default: {
        res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
      }
    }
  } catch (err: any) {
    res.json({
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      error: { code: -32603, message: err?.message || 'Internal error' },
    });
  }
});

export default router;
