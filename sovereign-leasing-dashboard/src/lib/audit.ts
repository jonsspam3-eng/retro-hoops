import { getFallbackStore, makeId } from "@/lib/fallback-store";
import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  actorId?: string | null;
  leadId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  if (!process.env.DATABASE_URL) {
    const store = getFallbackStore();
    store.auditLogs.push({
      id: makeId("audit"),
      actorId: input.actorId,
      leadId: input.leadId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        leadId: input.leadId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      },
    });
  } catch {
    const store = getFallbackStore();
    store.auditLogs.push({
      id: makeId("audit"),
      actorId: input.actorId,
      leadId: input.leadId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    });
  }
}
