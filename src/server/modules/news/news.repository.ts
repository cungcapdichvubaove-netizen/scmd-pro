import { db } from '../../core/db/prisma.js';
import { CacheManager } from '../../core/cache/manager.js';

export class NewsRepository {
  private static readonly NEWS_TTL = 3600; // 1 hour

  static async getAll(cursor?: string, limit: number = 20) {
    const cacheKey = `news:list:${cursor || 'first'}:${limit}`;
    return await CacheManager.wrap(cacheKey, async () => {
      const take = Math.min(limit, 100);
      const news = await db.system().news.findMany({
        take: take + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' }
      });

      const hasMore = news.length > take;
      const items = hasMore ? news.slice(0, take) : news;
      const nextCursor = hasMore ? items[items.length - 1]?.id : null;

      return {
        data: items,
        nextCursor,
        hasMore
      };
    }, this.NEWS_TTL);
  }

  static async getBySlug(slug: string) {
    const cacheKey = `news:detail:${slug}`;
    return await CacheManager.wrap(cacheKey, async () => {
      const news = await db.system().news.findUnique({
        where: { slug }
      });
      return news;
    }, this.NEWS_TTL);
  }

  static async create(data: any) {
    const news = await db.system().news.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        thumbnail: data.thumbnail,
        category: data.category,
        author: data.author,
        tags: data.tags,
        status: data.status || 'published',
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription
      }
    });

    await this.clearCache();
    return news;
  }

  static async update(id: string, data: any) {
    const news = await db.system().news.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        thumbnail: data.thumbnail,
        category: data.category,
        author: data.author,
        tags: data.tags,
        status: data.status,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription
      }
    });

    await this.clearCache(news.slug);
    return news;
  }

  static async delete(id: string) {
    const news = await db.system().news.delete({
      where: { id }
    });
    if (news) {
      await this.clearCache(news.slug);
    }
  }

  private static async clearCache(slug?: string) {
    const promises = [CacheManager.delByPattern('news:list:*')];
    if (slug) {
      promises.push(CacheManager.del(`news:detail:${slug}`));
    }
    await Promise.all(promises);
  }
}

