import { prisma } from "./prisma";
export async function createNotification(userId: string, type: string, title: string, body?: string, linkUrl?: string) {
  return prisma.notification.create({ data: { userId, type: type as never, title, body, linkUrl } });
}
