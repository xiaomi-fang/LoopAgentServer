import { OpenAI } from 'openai';

// In a real production environment, this would be loaded from environment variables.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock-key',
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1', // Default to Ollama if needed
});

/**
 * 生成结构化的任务执行计划
 * @param objective 任务目标
 * @param acceptanceCriteria 验收标准
 * @param context 项目上下文
 * @returns {Promise<any>} 解析后的 JSON 计划
 */
export async function generateStructuredPlan(objective: string, acceptanceCriteria: string, context: any): Promise<any> {
  try {
    const prompt = `
      You are a technical task executor. Your goal is to break down a task into a sequence of concrete actions.
      
      Objective: ${objective}
      Acceptance Criteria: ${acceptanceCriteria}
      Context: ${JSON.stringify(context)}

      You must respond ONLY with a valid JSON object. Do not include any markdown formatting or extra text.
      The JSON structure must be:
      {
        "summary": "A brief summary of the plan",
        "steps": [
          {
            "action": "write_file" | "create_dir" | "run_shell" | "wait",
            "description": "What this step does",
            "params": {
              "path": "string (for write_file/create_dir)",
              "content": "string (for write_file)",
              "command": "string (for run_shell)"
            }
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', 
      messages: [
        { role: 'system', content: 'You are a helpful assistant that outputs only JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('[LLM Service] Error generating structured plan:', error);
    // Fallback to a simple plan if LLM fails
    return {
      summary: "Fallback plan: Manual execution required.",
      steps: [
        {
          action: "run_shell",
          description: "Manual check required",
          params: { command: "echo 'Manual intervention needed'" }
        }
      ]
    };
  }
}

/** 兼容别名 — generatePlan */
export const generatePlan = generateStructuredPlan;
