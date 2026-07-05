import prisma from '../prisma';

export async function publishProduct(data: {
  taskId: string;
  productType: string;
  url: string;
  description?: string;
  version?: string;
}) {
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) throw new Error('Task not found');

  return prisma.product.create({
    data: {
      taskId: data.taskId,
      productType: data.productType,
      url: data.url,
      description: data.description ?? null,
      version: data.version ?? 'v1',
    },
  });
}

export async function getAllProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: { task: true },
  });
}

export async function getTaskProducts(taskId: string, productType?: string) {
  const where: any = { taskId };
  if (productType) where.productType = productType;

  return prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function deleteProduct(productId: string) {
  await prisma.product.delete({ where: { id: productId } });
  return { id: productId };
}

export async function updateProduct(productId: string, data: {
  productType?: string;
  url?: string;
  description?: string;
}) {
  const updateData: any = {};
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.description !== undefined) updateData.description = data.description;

  return prisma.product.update({
    where: { id: productId },
    data: updateData,
  });
}
