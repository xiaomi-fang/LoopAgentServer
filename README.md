# LoopEngineering - MCP Multi-Agent Collaboration Hub

LoopAgent 是一个基于 MCP (Model Context Protocol) 架构的多智能体协作平台。它旨在协调多个智能体共同完成复杂的项目目标，通过任务分解、自动化执行引擎和可视化管理界面，实现从需求到产物的全流程自动化。

## 🚀 快速启动

### 前置条件
- Node.js v22.15.0+
- SQLite (默认使用本地文件 `loopagent.db`)
- OpenAI API Key (或兼容的本地 LLM 服务如 Ollama)

### 安装与运行
1. **克隆仓库**
   ```bash
   git clone <repo_url>
   cd LoopAgentServer2
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   创建 `.env` 文件并配置：
   ```env
   DATABASE_URL="file:./loopagent.db"
   OPENAI_API_KEY="your_api_key_here"
   OPENAI_BASE_URL="http://localhost:11434/v1" (可选)
   ```

4. **初始化数据库**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```
   访问 `http://localhost:3000` 进入管理后台。

## 🏗 架构设计

### 核心组件
- **Agent Service**: 管理智能体的注册、状态（Idle/Busy/Offline）以及基于能力的智能体发现。
- **Project Service**: 处理项目的生命周期，支持项目上下文的构建（包括任务树的递归解析）。
- **Task Service**: 核心状态机，处理任务的创建、认领、状态流转（Pending -> In Progress -> Pending Review -> Completed/Failed）以及验收逻辑。
- **LLM Service**: 负责结构化计划生成。它将复杂的任务目标分解为一系列可执行的 JSON 指令。
- **TaskExecutor**: 自动化执行引擎。它解析 LLM 生成的计划，动态调用文件系统操作、Shell 命令执行以及基础的测试观察。

### 技术栈
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite.
- **Frontend**: React, Tailwind CSS, Lucide React.
- **LLM**: OpenAI SDK (支持 GPT-4o, Claude 3.5, Ollama 等).

## 🛠 核心功能说明

### 1. 智能体管理
用户可以注册具有不同角色（如 Developer, Reviewer, Designer）和能力（如 `python`, `react`, `sql`）的智能体。系统支持基于能力的智能体自动匹配。

### 2. 项目与任务流转
- **项目创建**：定义项目目标和验收标准。
- **任务分解**：支持将复杂任务分解为子任务。
- **自动认领**：智能体根据自身能力自动认领待办任务。
- **计划生成**：任务进入 `in_progress` 时，系统自动调用 LLM 生成详细的执行计划。

### 3. 自动化执行引擎
引擎能够解析以下指令：
- `write_file`: 写入代码或文档。
- `create_dir`: 创建项目目录结构。
- `run_shell`: 执行测试命令或构建脚本。
- `wait`: 模拟等待操作。

### 4. 产物管理
任务完成后，系统支持自动发布产物（如代码仓库链接、文档 URL 等），并关联至对应的任务。

## 🛡 安全与约束
- **权限隔离**：LLM 仅作为“大脑”生成计划，不直接拥有操作文件系统或执行 Shell 命令的权限。所有操作必须经过 `TaskExecutor` 的受控执行。
- **状态校验**：严格遵循状态机规范，确保任务流转符合业务逻辑（如：验收人不能是执行人）。
- **灾难恢复**：内置心跳检测机制，若智能体长时间处于 `in_progress` 状态且无心跳，系统将自动重置任务状态。

## 📝 贡献指南
请在提交 PR 前确保通过所有测试。所有的代码变更应遵循 `TaskExecutor` 的设计模式。
