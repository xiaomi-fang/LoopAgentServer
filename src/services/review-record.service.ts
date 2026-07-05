import prisma from '../prisma';

export async function createReviewRecord(data: {
  taskId: string;
  reviewerId: string;
  suggestion: string;
  status?: string;
}) {
  return prisma.reviewRecord.create({
    data: {
      taskId: data.taskId,
      reviewerId: data.reviewerId,
      suggestion: data.suggestion,
      status: data.status || 'in_review',
    },
  });
}

export async function getReviewRecordById(recordId: string) {
  return prisma.reviewRecord.findUnique({ where: { id: recordId } });
}

export async function getReviewRecordsByTask(taskId: string) {
  return prisma.reviewRecord.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateReviewRecordStatus(recordId: string, status: string) {
  return prisma.reviewRecord.update({
    where: { id: recordId },
    data: { status },
  });
}
