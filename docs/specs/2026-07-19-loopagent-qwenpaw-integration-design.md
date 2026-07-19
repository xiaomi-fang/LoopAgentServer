# LoopAgent + QwenPaw 集成与工作流引擎设计

> 日期：2026-07-19
> 状态：已批准（待实现）
> 设计者：qwenpaw-coder

## 1. 项目生命周期状态机

### 1.1 状态与流转

```
                       ┌──────────────────┐
                       │   pending_activation │  ← 项目刚创建，待管理员激活
                       └────────┬─────────┘
                                │ 管理员手动操作: 「启动规划」
                                ▼
                       ┌──────────────────┐
                       │     planning      │  ← 主智能体（creator_agent_id）规划任务
                       └────────┬─────────┘
                                │ 主智能体规划完成，自动触发
                                ▼
                       ┌──────────────────┐
                       │     planned       │  ← 等管理员审核
                       └────────┬─────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
        管理员审核通过                管理员审核不通过
                    │                       │
                    ▼                       ▼
          ┌──────────────────┐   ┌──────────────────┐
          │  review_passed   │   │  review_failed    │
          └────────┬─────────┘   └────────┬─────────┘
                   │                       │
                   │            系统通知主智能体（带原因）
                   │                       │
                   │           主智能体修改后重新提交
                   │                       │
                   │                       ▼
                   │              ┌──────────────────┐
                   │              │     planning      │
                   │              └──────────────────┘
                   │
                   │ 管理员手动操作: 「开始研发」
                   ▼
          ┌──────────────────┐
          │  in_development  │  ← 工作流编排入口，此时才进入 Agent 派发
          └──────────────────┘
```

### 1.2 状态值定义

| 状态值 | 含义 | 谁触发 |
|---|---|---|
| `pending_activation` | 待激活 — 项目刚创建 | 自动（新建时） |
| `planning` | 规划中 — 主智能体在分解任务 | 管理员手动 |
| `planned` | 已规划 — 主智能体完成规划 | 主智能体自动 |
| `review_passed` | 审核通过 | 管理员 |
| `review_failed` | 审核不通过（含原因） | 管理员 |
| `in_development` | 研发中 — 工作流引擎可执行 | 管理员手动 |

### 1.3 审核不通过通知机制

当管理员标记 `review_failed` 时，必须填写原因。系统将原因通过 AgentPlatform 接口发送给主智能体（`creator_agent_id`），并自动将项目状态回退到 `planning`，等待主智能体修改后重新提交。

### 1.4 Prisma 模型变更

```prisma
model Project {
  // ... 现有字段不变 ...
  status            String   @default("pending_activation")  // 默认值从 planning 改为 pending_activation
  reviewComment     String?  @map("review_comment")           // 审核不通过原因（新增）
}
```

---

## 2. Agent 平台接口（AgentPlatform）

### 2.1 设计原则

- **接口化**：所有与外部智能体平台的交互通过 `AgentPlatform` 接口
- **工厂模式**：`AgentPlatformFactory` 注册/创建具体实现
- **可替换**：实现 QwenPawPlatform，后续可扩展 AutoGen、CrewAI 等

### 2.2 接口定义

```typescript
// src/platforms/agent-platform.interface.ts

/** Agent 运行状态 */
export interface AgentStatus {
  agentId: string;
  name: string;
  status: 'idle' | 'busy' | 'offline' | 'running' | 'disabled';
  capabilities: string[];
  lastHeartbeat?: string;
}

/** 提交给 Agent 执行的任务 */
export interface TaskSubmission {
  taskId: string;                 // loopagent 侧的任务 ID
  projectId: string;
  objective: string;
  acceptanceCriteria: string;
  context?: Record<string, any>;  // 项目上下文
}

/** 任务执行结果 */
export interface TaskResult {
  status: 'completed' | 'failed';
  output?: string;
  error?: string;
  /** QwenPaw 侧的 taskRef，用于轮询 */
  externalRef?: string;
}

/** Agent 平台接口 */
export interface AgentPlatform {
  /** 获取平台上所有 Agent 状态（含当前工作状态） */
  listAllAgents(): Promise<AgentStatus[]>;

  /** 检查指定 Agent 是否空闲 */
  checkAgentStatus(agentId: string): Promise<AgentStatus>;

  /** 按能力发现空闲 Agent */
  discoverAgents(capabilities: string[]): Promise<AgentStatus[]>;

  /** 向指定 Agent 提交后台任务 */
  submitTask(agentId: string, task: TaskSubmission): Promise<{ externalRef: string }>;

  /** 轮询已提交任务的结果 */
  pollTaskResult(externalRef: string): Promise<TaskResult | null>;

  /** 发送消息给指定 Agent（如审核不通过原因） */
  sendMessage(agentId: string, message: string): Promise<void>;
}
```

### 2.3 工厂实现

```typescript
// src/platforms/platform-factory.ts
export class AgentPlatformFactory {
  private static registry = new Map<string, new (config: any) => AgentPlatform>();

  static register(type: string, ctor: new (config: any) => AgentPlatform): void {
    this.registry.set(type, ctor);
  }

  static create(type: string, config: any): AgentPlatform {
    const ctor = this.registry.get(type);
    if (!ctor) throw new Error(`Unknown platform type: ${type}`);
    return new ctor(config);
  }
}

// 应用启动时注册
AgentPlatformFactory.register('qwenpaw', QwenPawPlatform);
```

### 2.4 QwenPawPlatform 实现

| 接口方法 | QwenPaw API | 说明 |
|---|---|---|
| `listAllAgents()` | `GET /api/agents` | 获取所有 Agent（含 enabled/disabled） |
| `checkAgentStatus(id)` | `GET /api/agent-status` | 返回 idle / running / disabled |
| `discoverAgents(caps)` | `GET /api/agents` + 能力过滤 | 过滤出 idle 且匹配能力 |
| `submitTask(agentId, task)` | `POST /console/chat/task` | 提交后台任务，返回 task_id |
| `pollTaskResult(ref)` | `GET /console/chat/task/{ref}` | 轮询 task 状态，完成则返回结果 |
| `sendMessage(agentId, msg)` | `POST /console/chat` | 向 Agent 发送消息 |

> 配置项（从 `.env` 读取）：
> - `QWENPAW_BASE_URL` — QwenPaw Console 地址
> - `QWENPAW_API_KEY` — 访问凭据

### 2.5 轮询策略（不打扰忙的 Agent）

```
1. 调用 listAllAgents() 获取全量 Agent 列表
2. 过滤出 status === 'idle' 的 Agent
3. 按 capabilities 匹配任务需求
4. 调用 checkAgentStatus(agentId) 二次确认空闲
5. 确认空闲 → submitTask
6. 以 N 秒间隔轮询 pollTaskResult(externalRef)
7. 取到结果后 → 更新 loopagent 侧 task 状态
8. 检查 DAG 下游依赖 → 解锁 blocked 任务
```

---

## 3. 工作流引擎（DAG + 串并行）

### 3.1 核心概念

工作流在现有 Task 树（父子层级）的基础上扩展，不另建 Workflow 实体。每个任务通过 `type`、`dependsOn` 两个字段表达编排逻辑：

- **`type`**: `"serial"`（串行）或 `"parallel"`（并行）
- **`dependsOn`**: `string[]`（依赖的任务ID列表），任务只有在所有依赖都 `completed` 后才变为 `pending`

### 3.2 Prisma 模型变更

```prisma
model Task {
  // ... 现有字段不变 ...

  type         String   @default("serial")    // "serial" | "parallel"
  dependsOn    String   @default("[]")         // JSON.stringify(string[])
  wfOrder      Int?                            // 可视化拖拽排序字段
  // status 新增一个值: "blocked"
  // status: pending | blocked | in_progress | pending_review | completed | failed
}
```

### 3.3 任务状态扩展

```
                              ┌────────────────────┐
                              │  blocked            │  ← 有依赖未完成
                              └────────┬───────────┘
                                       │ 所有依赖完成
                                       ▼
                              ┌────────────────────┐
                              │  pending            │  ← 可被认领
                              └────────┬───────────┘
                                       │ Agent 认领
                                       ▼
                              ┌────────────────────┐
                              │  in_progress        │
                              └────────┬───────────┘
                                       │ 执行完成
                                       ▼
                              ┌────────────────────┐
                              │  pending_review     │
                              └────────┬───────────┘
                            ┌──────────┴──────────┐
                            │                     │
                        审核通过               审核不通过
                            │                     │
                            ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  completed   │     │   failed     │
                    └──────┬───────┘     └──────┬───────┘
                           │                     │
                           │           可重试回到 pending
                           │                     │
                    (解锁下游 blocked)           ▼
                                         (可选重试)
```

### 3.4 状态机校验更新

```typescript
// src/state-machine.ts 新增
ALLOWED_TRANSITIONS = {
  blocked:     [pending],           // 依赖完成 → 可执行
  pending:     [in_progress],
  in_progress: [pending_review, failed],
  pending_review: [completed, in_progress, failed],
  completed:   [],
  failed:      [pending],           // 失败后可重试
};
```

### 3.5 工作流引擎执行逻辑

```typescript
// src/services/workflow-engine.service.ts

class WorkflowEngine {
  async run(projectId: string): Promise<void> {
    const dag = await this.buildDAG(projectId);
    const sorted = this.topologicalSort(dag);

    for (const layer of sorted) {
      // 同一层内的节点可并发
      const promises = layer.map(node => this.executeNode(node));
      await Promise.all(promises);
    }
  }

  private async executeNode(node: TaskNode): Promise<void> {
    // 1. 查询空闲 Agent
    // 2. 通过 AgentPlatform 提交任务
    // 3. 轮询直到完成
    // 4. 更新任务状态
    // 5. 解锁下游 blocked 任务
  }

  /** 构建 DAG：dependsOn + parentTaskId 双向依赖 */
  private async buildDAG(projectId: string): Promise<Graph> { ... }

  /** 拓扑排序 → 分层 */
  private topologicalSort(graph: Graph): TaskNode[][] { ... }
}
```

### 3.6 已有 createTask 适配

创建任务时参数新增 `type` 和 `depends_on`，默认为串行无依赖。

---

## 4. 前端可视化

### 4.1 技术选型

- **React Flow**（原 react-flow-renderer）— 轻量 DAG 可视化库，支持拖拽、缩放、自定义节点
- 已有 React + Tailwind 技术栈，无缝集成

### 4.2 页面与路由

| 页面 | 路由 | 功能 |
|---|---|---|
| 项目列表 | `/projects` | 项目卡片 + 状态 + 操作按钮 |
| 项目详情 | `/projects/:id` | 状态流转操作 + 进度概览 |
| 工作流编辑器 | `/projects/:id/workflow` | DAG 可视化编辑（仅 `in_development` 可访问） |
| 工作流进度 | `/projects/:id/progress` | 实时 DAG + 进度条 |

### 4.3 操作矩阵

| 当前状态 | 操作 | 目标状态 | 谁可操作 |
|---|---|---|---|
| `pending_activation` | 启动规划 | `planning` | 管理员 |
| `planned` | 审核通过 | `review_passed` | 管理员 |
| `planned` | 审核不通过（需填原因） | `review_failed` | 管理员 |
| `review_passed` | 开始研发 | `in_development` | 管理员 |
| `in_development` | 工作流编排/启动 | — | 主智能体 + 管理员 |

### 4.4 审核弹窗

- 管理员点击「审核不通过」→ 弹出 Modal
- 必须填写「不通过原因」（textarea，非空校验）
- 提交后：
  1. 项目状态更新为 `review_failed`
  2. 系统通过 `AgentPlatform.sendMessage()` 通知主智能体
  3. 主智能体修改后重新提交规划

### 4.5 DAG 节点着色

| 状态 | 颜色 |
|---|---|
| `blocked` | `#9CA3AF`（灰色） |
| `pending` | `#EAB308`（黄色） |
| `in_progress` | `#3B82F6`（蓝色）+ 旋转动画 |
| `completed` | `#22C55E`（绿色） |
| `failed` | `#EF4444`（红色） |

---

## 5. REST API 扩展

### 5.1 项目 API

```http
PUT /projects/:id/activate       → status: pending_activation → planning
PUT /projects/:id/review         → status: planned → review_passed / review_failed
PUT /projects/:id/start-dev      → status: review_passed → in_development
GET  /projects/:id/workflow      → 返回 DAG（nodes + edges）
```

### 5.2 任务 API 扩展

```http
PUT /tasks/:id/type              → 更新 type (serial / parallel)
PUT /tasks/:id/depends-on        → 更新 dependsOn 依赖列表
PUT /tasks/:id/wf-order          → 更新 wfOrder 排序
GET  /projects/:id/workflow/progress → 进度统计
```

---

## 6. 项目目录结构变更

```
src/
├── platforms/
│   ├── agent-platform.interface.ts   # AgentPlatform 接口定义
│   ├── platform-factory.ts            # 工厂注册与创建
│   └── qwenpaw/
│       ├── qwenpaw-platform.ts        # QwenPaw 实现
│       └── qwenpaw-platform.config.ts # 配置类型
├── services/
│   └── workflow-engine.service.ts     # 工作流引擎
├── routes/
│   └── workflow.ts                    # 工作流相关路由（新增）
└── frontend/
    └── src/
        └── pages/
            ├── WorkflowEditor.tsx      # DAG 编辑器
            └── WorkflowProgress.tsx    # 进度展示
```

---

## 7. 边界情况与错误处理

| 场景 | 处理方式 |
|---|---|
| QwenPaw 不可达 | AgentPlatform.submitTask 抛异常 → 任务状态标记 failed，前端提示 |
| Agent 提交后长时间无结果 | 轮询超时（默认 5min）→ 标记为 failed，可选重试 |
| 工作流中存在环 | 拓扑排序时检测环路，抛异常阻止启动 |
| 所有 Agent 都忙碌 | 等待策略：排队等待，每隔 10s 重新 discoverAgents |
| 主智能体不响应审核不通过 | 无自动处理，管理员可手动强制重设状态 |
| 管理员在引擎运行中编辑 DAG | 禁止编辑运行中的工作流，必须先暂停 |

---

## 8. 实施优先级（建议）

1. **Phase 1 — 核心模型与状态机**
   - Schema 变更（Project + Task 扩展字段）
   - 项目生命周期状态机（含审核流程）
   - REST API 扩展（activate/review/start-dev）

2. **Phase 2 — AgentPlatform**
   - 接口定义 + 工厂
   - QwenPawPlatform 实现
   - 配置读取

3. **Phase 3 — 工作流引擎**
   - DAG 构建与拓扑排序
   - 串/并行执行
   - 轮询与结果回调
   - 审核不通过通知

4. **Phase 4 — 前端可视化**
   - 状态操作按钮 + 审核弹窗
   - 工作流编辑器（DAG）
   - 工作流进度展示
