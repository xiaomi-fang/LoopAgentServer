import prisma from '../prisma';

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
  const where: any = { status: 'idle' };

  const agents = await prisma.agent.findMany({ where });
  let result = agents.map((a) => ({ ...a, capabilities: JSON.parse(a.capabilities) }));

  if (capabilityFilter) {
    result = result.filter((a) =>
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
