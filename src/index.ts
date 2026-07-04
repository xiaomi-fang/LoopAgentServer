import express from 'express';
import prisma from './prisma';
import { errorHandler } from './middleware/error-handler';
import agentRoutes from './routes/agents';
import projectRoutes from './routes/projects';
import taskRoutes from './routes/tasks';
import productRoutes from './routes/products';

const app = express();
const PORT = process.env.PORT || 3000;
const HEARTBEAT_TIMEOUT_MINUTES = 3;
const DISASTER_CHECK_INTERVAL_MS = 60_000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/agents', agentRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/products', productRoutes);

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
      console.log(`[LoopAgent] MCP Server running on http://localhost:${PORT}`);
      console.log(`[LoopAgent] Heartbeat timeout: ${HEARTBEAT_TIMEOUT_MINUTES} min`);
      console.log(`[LoopAgent] Disaster check interval: ${DISASTER_CHECK_INTERVAL_MS / 1000}s`);
    });
  }

  main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
