# MCP 服务使用说明

> 环枢（LoopEngineeringManager）对外暴露标准 [Model Context Protocol](https://modelcontextprotocol.io) 接口，
> 允许 LLM 或 AI 客户端通过统一的工具调用协议与系统交互。

---

## 目录

- [MCP 服务使用说明](#mcp-服务使用说明)
  - [目录](#目录)
  - [快速开始](#快速开始)
    - [端点地址](#端点地址)
    - [最简单的测试](#最简单的测试)
  - [协议规范](#协议规范)
    - [列出工具](#列出工具)
    - [调用工具](#调用工具)
  - [工具清单](#工具清单)
    - [智能体 (Agent)](#智能体-agent)
    - [项目 (Project)](#项目-project)
    - [任务 (Task)](#任务-task)
    - [产物 (Product)](#产物-product)
  - [典型工作流](#典型工作流)
    - [场景一：LLM 编排智能体协作](#场景一llm-编排智能体协作)
    - [场景二：AI 客户端自动化项目管理](#场景二ai-客户端自动化项目管理)
  - [与 REST API 的关系](#与-rest-api-的关系)
  - [常见问题](#常见问题)

---

## 快速开始

### 端点地址

```
POST http://localhost:3000/mcp/v1/tools
POST http://localhost:3000/mcp/v1/execute
```

> 端口号由环境变量 `PORT` 控制，默认 `3000`。

### 最简单的测试

```bash
# 1. 查看所有可用工具
curl -s -X POST http://localhost:3000/mcp/v1/tools \
  -H "Content-Type: application/json" \
  | python3 -m json.tool | head -30

# 2. 调用工具：列出所有项目
curl -s -X POST http://localhost:3000/mcp/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"name":"list_projects","arguments":{}}' \
  | python3 -m json.tool

# 3. 调用工具：发现空闲智能体
curl -s -X POST http://localhost:3000/mcp/v1/execute \
  -H "Content-Type: application/json" \
  -d '{"name":"discover_agents","arguments":{}}' \
  | python3 -m json.tool
```

---

## 协议规范

### 列出工具

**请求：**

```http
POST /mcp/v1/tools
Content-Type: application/json

{}
```

**响应：**

```json
{
  "tools": [
    {
      "name": "create_project",
      "description": "创建一个新项目，需指定名称、GitHub 链接和主智能体",
      "input_schema": {
        "type": "object",
        "properties": {
          "name":               { "type": "string", "description": "项目名称" },
          "description":        { "type": "string", "description": "项目描述" },
          "goal":               { "type": "string", "description": "项目目标" },
          "acceptance_criteria":{ "type": "string", "description": "项目验收标准" },
          "github_url":         { "type": "string", "description": "GitHub 仓库链接" },
          "creator_agent_id":   { "type": "string", "description": "主智能体 ID" }
        },
        "required": ["name", "github_url", "creator_agent_id"]
      }
    }
  ]
}
```

LLM 客户端通过此接口获取所有能力列表，每个工具包含：
- `name` — 工具名称（用于 execute 时的标识）
- `description` — 工具功能描述（LLM 根据此字段判断何时调用）
- `input_schema` — JSON Schema 定义入参格式（LLM 按此格式生成入参）

### 调用工具

**请求：**

```http
POST /mcp/v1/execute
Content-Type: application/json

{
  "name": "create_project",
  "arguments": {
    "name": "智能运维系统",
    "github_url": "https://github.com/example/aiops",
    "creator_agent_id": "688cdce1-03b5-4c36-8cbe-151b368bb8fa"
  }
}
```

**成功响应：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "{ \"id\": \"...\", \"name\": \"智能运维系统\", ... }"
    }
  ]
}
```

**失败响应（HTTP 200，但 `isError: true`）：**

```json
{
  "content": [
    {
      "type": "text",
      "text": "工具执行失败：name and creator_agent_id are required"
    }
  ],
  "isError": true
}
```

> **说明：** MCP 协议规定无论成功或失败都返回 HTTP 200，通过 `isError` 字段区分。

---

## 工具清单

### 智能体 (Agent)

| 工具名 | 描述 | 必填参数 |
|--------|------|----------|
| `register_agent` | 注册新智能体 | `name`, `role` |
| `list_agents` | 获取全部智能体 | — |
| `get_agent` | 按 ID 查询智能体 | `agent_id` |
| `discover_agents` | 按能力发现空闲智能体 | —（可选 `capability`） |
| `agent_heartbeat` | 更新智能体心跳 | `agent_id` |
| `delete_agent` | 删除智能体（需管理员） | `agent_id` |
| `update_agent` | 更新智能体信息（需管理员） | `agent_id` |

**注册智能体示例：**

```json
POST /mcp/v1/execute
{
  "name": "register_agent",
  "arguments": {
    "name": "CodeReviewer",
    "role": "代码审查工程师",
    "capabilities": ["code_review", "static_analysis"]
  }
}
```

**发现空闲智能体示例：**

```json
POST /mcp/v1/execute
{
  "name": "discover_agents",
  "arguments": {
    "capability": "code_review"
  }
}
```

### 项目 (Project)

| 工具名 | 描述 | 必填参数 |
|--------|------|----------|
| `create_project` | 创建项目 | `name`, `github_url`, `creator_agent_id` |
| `list_projects` | 获取全部项目 | — |
| `get_project` | 按 ID 查询项目 | `project_id` |
| `get_project_context` | 获取项目完整上下文（含任务树、产物） | `project_id` |
| `update_project` | 更新项目（需管理员） | `project_id` |
| `delete_project` | 删除项目（需管理员） | `project_id` |

**创建项目示例：**

```json
POST /mcp/v1/execute
{
  "name": "create_project",
  "arguments": {
    "name": "智能运维系统",
    "description": "基于 AI 的自动化运维平台",
    "goal": "实现故障自动检测、诊断和修复的闭环",
    "acceptance_criteria": "1. 支持 5 种常见故障自动识别\n2. 诊断准确率 > 90%\n3. 平均修复时间 < 5 分钟",
    "github_url": "https://github.com/example/aiops",
    "creator_agent_id": "688cdce1-..."
  }
}
```

**获取项目上下文示例：**

用于 LLM 理解项目全貌，返回包含任务树和产物的完整数据结构。

```json
POST /mcp/v1/execute
{
  "name": "get_project_context",
  "arguments": {
    "project_id": "xxx"
  }
}
```

### 任务 (Task)

| 工具名 | 描述 | 必填参数 |
|--------|------|----------|
| `create_task` | 创建任务 | `project_id`, `title`, `objective`, `acceptance_criteria`, `creator_agent_id`, `assignee_agent_id`, `reviewer_agent_id` |
| `list_tasks` | 获取全部任务 | —（可选 `project_id`, `status`） |
| `get_task` | 按 ID 查询任务 | `task_id` |
| `claim_task` | 认领任务 | `task_id`, `agent_id` |
| `update_task_status` | 更新任务状态 | `task_id`, `status` |
| `review_task` | 审核任务 | `task_id`, `approved` |
| `get_task_tree` | 获取项目任务树 | `project_id` |
| `delete_task` | 删除任务（需管理员） | `task_id` |
| `update_task` | 更新任务（需管理员） | `task_id` |

**创建任务示例：**

```json
POST /mcp/v1/execute
{
  "name": "create_task",
  "arguments": {
    "project_id": "xxx",
    "title": "实现故障检测模块",
    "objective": "开发一个基于日志分析的故障检测模块，能够识别系统异常",
    "acceptance_criteria": "1. 支持 CPU/内存/磁盘三种资源的异常检测\n2. 误报率 < 5%\n3. 响应时间 < 1秒",
    "creator_agent_id": "agent-a",
    "assignee_agent_id": "agent-b",
    "reviewer_agent_id": "agent-c"
  }
}
```

**认领任务（智能体调用）：**

```json
POST /mcp/v1/execute
{
  "name": "claim_task",
  "arguments": {
    "task_id": "xxx",
    "agent_id": "agent-b"
  }
}
```

**提交任务（智能体调用）：**

```json
POST /mcp/v1/execute
{
  "name": "update_task_status",
  "arguments": {
    "task_id": "xxx",
    "status": "pending_review",
    "submit_note": "已完成故障检测模块开发，包含单元测试和集成测试"
  }
}
```

**审核任务（审核者调用）：**

```json
POST /mcp/v1/execute
{
  "name": "review_task",
  "arguments": {
    "task_id": "xxx",
    "approved": true,
    "comment": "代码质量良好，测试覆盖率达到 95%，通过审核"
  }
}
```

任务状态流转图：

```
pending  →  in_progress  →  pending_review  →  completed
              ↓                  ↓
              ├── failed         └── in_progress (驳回)
              ↓
          pending (灾备回退)
```

### 产物 (Product)

| 工具名 | 描述 | 必填参数 |
|--------|------|----------|
| `publish_product` | 发布产物 | `task_id`, `product_type`, `url` |
| `list_products` | 获取全部产物 | — |
| `delete_product` | 删除产物（需管理员） | `product_id` |
| `update_product` | 更新产物（需管理员） | `product_id` |

**发布产物示例：**

```json
POST /mcp/v1/execute
{
  "name": "publish_product",
  "arguments": {
    "task_id": "xxx",
    "product_type": "code_repo",
    "url": "https://github.com/example/aiops/tree/main/fault-detection",
    "description": "故障检测模块源代码",
    "version": "v1.0.0"
  }
}
```

`product_type` 可选值：

| 类型值 | 含义 |
|--------|------|
| `code_repo` | 代码仓库 |
| `document` | 文档 |
| `api_definition` | API 定义 |
| `image` | 图片 |
| `data_file` | 数据文件 |

---

## 典型工作流

### 场景一：LLM 编排智能体协作

```
1. [LLM]  tools()                    → 获取所有工具清单
2. [LLM]  execute(discover_agents)   → 找到空闲智能体 A、B、C
3. [LLM]  execute(create_project)    → 创建项目
4. [LLM]  execute(create_task)       → 创建任务，执行者=A，审核者=C
5. [Agent A] claim_task              → 认领任务
6. [Agent A] update_task_status      → 提交完成
7. [Agent C] review_task             → 审核通过
8. [Agent A] publish_product         → 发布产物
```

### 场景二：AI 客户端自动化项目管理

```
1. 用户："帮我看看当前所有项目"
   → execute(list_projects)

2. 用户："查看项目 X 的详情"
   → execute(get_project_context, { project_id: "X" })

3. 用户："给项目 X 创建一个新任务"
   → execute(create_task, { project_id: "X", ... })

4. 用户："把任务 Y 分配给智能体 A"
   → execute(create_task, { assignee_agent_id: "A", ... })
     或
   → execute(claim_task, { task_id: "Y", agent_id: "A" })
```

---

## 与 REST API 的关系

MCP 接口与 REST API **并行运行，功能等价**，不互相替代。

| 维度 | REST API | MCP |
|------|----------|-----|
| 适用场景 | Web 前端、浏览器开发工具 | LLM、AI 客户端、自动化代理 |
| 认证方式 | 管理员 JWT（前端登录） | 无内置认证（适合 LLM 内部调用） |
| 调用方式 | HTTP 动词 + URL 路径 | JSON-RPC 风格工具调用 |
| 返回格式 | 自定义 JSON | 标准 `{ content: [...] }` |
| 数据格式 | 与前端约定（snake_case） | 同底层 snake_case | 接口协议 | HTTP/1.1 | Model Context Protocol |

**两者共享同一套 Service 层，数据保持一致。**

如果需要为 MCP 增加认证（如 API Key），可以在 `src/routes/mcp.ts` 中添加中间件。

---

## 常见问题

**Q: MCP 和 REST API 的端口一样吗？**

是的，都在 `localhost:3000`，只是路径不同：
- REST: `http://localhost:3000/projects`
- MCP:  `http://localhost:3000/mcp/v1/tools`

**Q: MCP 接口需要管理员认证吗？**

目前管理员操作（如 delete、update）底层会验证权限，但 MCP 协议层没有强制 JWT 认证。如果需要生产环境安全加固，可在 `src/routes/mcp.ts` 中添加 `requireAdmin` 中间件。

**Q: 如何给 LLM（如 Claude）配置 MCP 工具？**

在 LLM 的配置文件中添加：

```json
{
  "mcpServers": {
    "环枢": {
      "url": "http://localhost:3000/mcp",
      "type": "mcp"
    }
  }
}
```

**Q: 工具调用超时怎么办？**

MCP 执行器没有独立超时限制，如果某个操作耗时较长（如级联删除），HTTP 请求会等待服务完成。建议在客户端设置合理的超时时间（如 30s）。

**Q: 如何添加新的 MCP 工具？**

1. 在 `src/mcp/tools.ts` 的 `MCP_TOOLS` 数组中添加工具定义（含 JSON Schema）
2. 在 `src/mcp/handler.ts` 中调用 `register(name, handler)` 注册处理函数
3. 处理函数中调用对应的 Service 层方法

---

> 最后更新：2026-07-05
> 协议版本：MCP (Model Context Protocol)
