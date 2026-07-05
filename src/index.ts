import express from 'express';
import path from 'path';
import prisma from './prisma';
import { errorHandler } from './middleware/error-handler';
import agentRoutes from './routes/agents';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import productRoutes from './routes/products';
import authRoutes from './routes/auth';
import mcpRoutes from './routes/mcp';

const app = express();
const PORT = process.env.PORT || 3000;
const HEARTBEAT_TIMEOUT_MINUTES = 3;
const DISASTER_CHECK_INTERVAL_MS = 60_000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/agents', agentRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/products', productRoutes);

// MCP (Model Context Protocol) 标准接口
// POST /mcp/v1/tools    — 列出所有工具
// POST /mcp/v1/execute  — 执行指定工具
app.use('/mcp', mcpRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all: serve index.html for any non-API route (SPA fallback)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use(errorHandler);

async function disasterRecovery() {
  try {
    const timeout = new Date(Date.now() - HEARTBEAT_TIMEOUT_MINUTES * 60 * 1000);

    const staleTasks = await prisma.task.findMany({
      where: {
        status: 'in_progress',
        assignee: {
          lastHeartbeat: { lt: timeout },
        },
      },
    });

    for (const task of staleTasks) {
      console.log(`[DISASTER] Resetting task ${task.id} - agent heartbeat timeout`);
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'pending',
          assigneeAgentId: null,
        },
      });
      if (task.assigneeAgentId) {
        await prisma.agent.update({
          where: { id: task.assigneeAgentId },
          data: { status: 'offline' },
        });
      }
    }
  } catch (err) {
    console.error('[DISASTER] Check failed:', err);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED_REJECTION]', reason);
});

export { app };

if (require.main === module) {
  async function main() {
    setInterval(disasterRecovery, DISASTER_CHECK_INTERVAL_MS);

    app.listen(PORT, () => {
      console.log(`[环枢] Server running on http://localhost:${PORT}`);
      console.log(`[环枢] REST API   → /agents, /projects, /tasks, /products, /auth`);
      console.log(`[环枢] MCP API    → POST /mcp/v1/tools, POST /mcp/v1/execute`);
      console.log(`[环枢] Frontend   → http://localhost:${PORT}`);
      console.log(`[环枢] Heartbeat timeout: ${HEARTBEAT_TIMEOUT_MINUTES} min`);
      console.log(`[环枢] Disaster check interval: ${DISASTER_CHECK_INTERVAL_MS / 1000}s`);
    });
  }

  main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
