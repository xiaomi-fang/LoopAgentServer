import prisma from '../prisma';
import { Prisma } from '@prisma/client';

export async function registerAgent(data: {
  name: string;
  role: string;
  capabilities?: string[];
  endpoint?: string;
}) {
  const agent = await prisma.agent.create({
    data: {
      name: data.name,
      role: data.role,
      capabilities: JSON.stringify(data.capabilities ?? []),
      endpoint: data.endpoint ?? null,
      status: 'idle',
      lastHeartbeat: new Date(),
    },
  });
  return { ...agent, capabilities: JSON.parse(agent.capabilities) };
}

export async function heartbeat(agentId: string) {
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { lastHeartbeat: new Date() },
  });
  return { ...agent, capabilities: JSON.parse(agent.capabilities) };
}

export async function discoverAgents(capabilityFilter?: string) {
  const where: Prisma.AgentWhereInput = {};

  const agents = await prisma.agent.findMany({ where });
  let result = agents.map((a: any) => ({ ...a, capabilities: JSON.parse(a.capabilities) }));

  if (capabilityFilter) {
    result = result.filter((a: { capabilities: string[] }) =>
      a.capabilities.some(
        (cap: string) => cap.toLowerCase().includes(capabilityFilter.toLowerCase())
      )
    );
  }

  return result;
}

export async function getAgent(agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return null;
  return { ...agent, capabilities: JSON.parse(agent.capabilities) };
}

export async function setAgentStatus(agentId: string, status: string) {
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status },
  });
  return { ...agent, capabilities: JSON.parse(agent.capabilities) };
}

export async function deleteAgent(agentId: string) {
  await prisma.agent.delete({ where: { id: agentId } });
  return { id: agentId };
}

export async function updateAgent(agentId: string, data: { name?: string; role?: string; capabilities?: string[]; status?: string }) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.capabilities !== undefined) updateData.capabilities = JSON.stringify(data.capabilities);
  if (data.status !== undefined) updateData.status = data.status;

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: updateData,
  });
  return { ...agent, capabilities: JSON.parse(agent.capabilities) };
}
