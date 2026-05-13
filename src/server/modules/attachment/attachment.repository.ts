import { db } from '../../core/db/prisma.js';
import { CreateAttachmentInput, UpdateAttachmentInput, AttachmentFilterInput } from './attachment.schema.js';
import { SecurityContext } from '../../core/architecture/types.js';

export class AttachmentRepository {
  static async create(ctx: SecurityContext, input: CreateAttachmentInput) {
    return db.forTenant(ctx.tenantId).attachment.create({
      data: {
        ...input,
        tenantId: ctx.tenantId,
        uploadedBy: ctx.userId || 'system',
      }
    });
  }

  static async list(ctx: SecurityContext, filters: AttachmentFilterInput) {
    const { category, tags, search, sortBy, sortOrder, limit, cursor } = filters;
    
    const where: any = {
      tenantId: ctx.tenantId,
    };

    if (category) {
      where.category = category;
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      where.tags = {
        hasSome: tagList
      };
    }

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    const items = await db.forTenant(ctx.tenantId).attachment.findMany({
      where,
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ [sortBy as string]: sortOrder }, { id: 'asc' }]
    });

    return { 
      items, 
      nextCursor: items.length === limit ? items[items.length - 1].id : null 
    };
  }

  static async getById(ctx: SecurityContext, id: string) {
    return db.forTenant(ctx.tenantId).attachment.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId
      }
    });
  }

  static async update(ctx: SecurityContext, id: string, input: UpdateAttachmentInput) {
    return db.forTenant(ctx.tenantId).attachment.update({
      where: {
        id,
        tenantId: ctx.tenantId
      },
      data: input
    });
  }

  static async delete(ctx: SecurityContext, id: string) {
    return db.forTenant(ctx.tenantId).attachment.delete({
      where: {
        id,
        tenantId: ctx.tenantId
      }
    });
  }
}
