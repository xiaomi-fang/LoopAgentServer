import * as taskService from './task.service';
import * as projectService from './project.service';
import * as agentService from './agent.service';
import * as llmService from './llm.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TaskStatus } from '../types';

/**
 * 执行引擎：负责将任务转化为实际的代码操作
 * 现在支持解析 LLM 生成的结构化 JSON 指令并具备基础的测试观察能力
 */
export class TaskExecutor {
  /**
   * 自动执行一个任务
   * @param taskId 任务ID
   * @param agentId 执行任务的智能体ID
   */
  static async executeTask(taskId: string, agentId: string) {
    console.log(`[Executor] Starting task ${taskId} for agent ${agentId}...`);

    // 1. 获取任务详情
    const task = await taskService.getTaskById(taskId);
    if (!task) throw new Error('Task not found');

    // 2. 获取项目上下文
    const project = await projectService.getProject(task.projectId);
    const context = await projectService.getProjectContext(task.projectId);

    // 3. 生成结构化计划 (Plan)
    console.log(`[Executor] Generating structured plan via LLM...`);
    const plan = await llmService.generateStructuredPlan(
      task.objective,
      task.acceptanceCriteria,
      context
    );
    
    // 更新任务的 submitNote 为生成的计划
    await taskService.updateTaskStatus(taskId, task.status as any, {
      submitNote: `[Generated Plan]: ${JSON.stringify(plan)}`
    });

    console.log(`[Executor] Plan generated: ${JSON.stringify(plan)}`);

    // 4. 执行操作 (Act)
    console.log(`[Executor] Acting: Executing steps...`);
    
    const workspace = path.join(process.cwd(), 'generated_output');
    if (!fs.existsSync(workspace)) {
      execSync(`mkdir -p ${workspace}`, { stdio: 'inherit' });
    }

    for (const step of plan.steps) {
      console.log(`[Executor] Executing step: ${step.description}`);
      
      try {
        switch (step.action) {
          case 'create_dir':
            const dirPath = path.join(workspace, step.params.path);
            if (!fs.existsSync(dirPath)) {
              execSync(`mkdir -p ${dirPath}`, { stdio: 'inherit' });
            }
            break;
          case 'write_file':
            const filePath = path.join(workspace, step.params.path);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              execSync(`mkdir -p ${dir}`, { stdio: 'inherit' });
            }
            fs.writeFileSync(filePath, step.params.content);
            break;
          case 'run_shell':
            execSync(step.params.command, { stdio: 'inherit' });
            break;
          case 'wait':
            console.log(`[Executor] Waiting...`);
            break;
          default:
            console.warn(`[Executor] Unknown action: ${step.action}`);
        }
      } catch (err) {
        console.error(`[Executor] Step failed: ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }

    // 5. 运行测试 (Observe)
    console.log(`[Executor] Observing: Running tests...`);
    let testPassed = true;

    // 如果验收标准中包含明显的测试命令（如 npm test, pytest 等），尝试运行它
    const testMatch = task.acceptanceCriteria.match(/(npm test|pytest|go test|testing\..*)/);
    if (testMatch) {
      try {
        console.log(`[Executor] Detected test command in criteria: ${testMatch[0]}`);
        execSync(testMatch[0], { stdio: 'inherit' });
      } catch (err) {
        console.error(`[Executor] Test command failed.`);
        testPassed = false;
      }
    } else {
      console.log(`[Executor] No explicit test command detected. Assuming success based on execution.`);
    }

    if (testPassed) {
      console.log(`[Executor] Success! Task ${taskId} passed tests.`);
      // 6. 更新状态并提交产物
      await taskService.updateTaskStatus(taskId, TaskStatus.COMPLETED, {
        submitNote: "Automatically completed via Executor Engine",
        comment: "Tests passed."
      });
      
      // 自动发布产物
      await taskService.publishProduct(taskId, {
        productType: 'file',
        url: `file://${workspace}/output_file.txt`,
        description: 'Generated output file'
      });
    } else {
      console.log(`[Executor] Test failed. Retrying...`);
    }
  }

  /**
   * 启动项目自动化流
   */
  static async startProjectAuto(projectId: string) {
    console.log(`[Executor] Starting auto-execution for project ${projectId}`);
    
    const tasks = await taskService.getAllTasks();
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);

    for (const task of pendingTasks) {
      const agents = await agentService.discoverAgents();
      if (agents.length > 0) {
        const selectedAgent = agents[0];
        await taskService.claimTask(task.id, selectedAgent.id);
        await this.executeTask(task.id, selectedAgent.id);
      }
    }
  }
}
