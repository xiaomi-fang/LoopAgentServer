# LoopAgent - MCP 多智能体协同中枢

基于 MCP（Model Context Protocol）的多智能体协同后端服务，提供智能体注册发现、任务流转引擎、产物管理和项目上下文聚合能力。

## 架构

```
[智能体 A (Coder)] ──(heartbeat/claim)──> [LoopAgent Server] <──(review_task)── [智能体 B (QA)]
        │                                          │
  (publish_product)                           (get_project_context)
        │                                          │
        v                                          v
[产物存储 / Git] <────(url reference)─────── [ Loop Engine (驱动引擎) ]
```

## 技术栈

| 层       | 技术                        |
| -------- | --------------------------- |
| 运行时   | Node.js + TypeScript        |
| 框架     | Express.js                  |
| 数据库   | SQLite (via Prisma)         |
| ORM      | Prisma                      |

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:push

# 开发模式启动
npm run dev

# 编译并生产启动
npm run build
npm start
```

服务默认运行在 `http://localhost:3000`。

## API 接口

### 智能体管理

| 方法   | 路径                   | 说明                           |
| ------ | ---------------------- | ------------------------------ |
| POST   | `/agents/register`     | 注册智能体                     |
| POST   | `/agents/heartbeat`    | 心跳上报                       |
| GET    | `/agents/discover`     | 按能力发现空闲智能体           |

### 项目管理

| 方法   | 路径                       | 说明                 |
| ------ | -------------------------- | -------------------- |
| POST   | `/projects`                | 创建项目             |
| GET    | `/projects/:id/context`    | 获取项目全局上下文   |

### 任务工作流（核心）

| 方法   | 路径                       | 说明                                   |
| ------ | -------------------------- | -------------------------------------- |
| POST   | `/tasks`                   | 创建任务                               |
| POST   | `/tasks/claim`             | 认领任务（乐观锁防并发）               |
| GET    | `/tasks/next`              | 按能力匹配获取下一个任务               |
| PATCH  | `/tasks/:id/status`        | 更新任务状态（状态机校验）             |
| POST   | `/tasks/:id/review`        | 验收任务（执行人≠验收人）              |
| POST   | `/tasks/decompose`         | 拆分子任务（自动建立依赖）             |

### 产物管理

| 方法   | 路径                   | 说明                         |
| ------ | ---------------------- | ---------------------------- |
| POST   | `/products`            | 发布产物（提交验收的前置条件）|
| GET    | `/products/:taskId`    | 获取任务产物列表             |

## 任务状态机

```
pending → in_progress → pending_review → completed
                            ↓
                      in_progress (驳回)
                      或 failed
```

- `pending` — 待认领
- `in_progress` — 执行中
- `pending_review` — 待验收
- `completed` — 已完成
- `failed` — 失败

## 核心规范

1. **强制验收闭环** — 验收人与执行人不可为同一智能体
2. **产物先行** — 必须先 `publish_product` 才能提交验收
3. **乐观锁** — 任务认领使用事务，防止多智能体抢夺同一任务
4. **能力匹配** — `getNextTask` 根据智能体 `capabilities` 自动分配任务
5. **心跳容灾** — 超过 3 个周期未心跳的智能体，其任务自动复位为 `pending`
6. **任务树** — 支持父子任务 DAG，子任务未完成则父任务不可进入待验收

## 数据库模型

- **agents** — 智能体注册与状态
- **projects** — 项目信息与验收标准
- **tasks** — 任务状态与分配（自引用 parent_task_id 形成树结构）
- **products** — 产物清单（代码、文档、API 定义等）
