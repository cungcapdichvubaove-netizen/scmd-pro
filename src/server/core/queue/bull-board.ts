import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getHeavyQueue, getLightQueue, getDLQQueue } from './index.js';
import { isRedisMock } from '../../infra/redis/client.js';

export const setupBullBoard = () => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/api/admin/queues');

  if (isRedisMock) {
    return serverAdapter.getRouter();
  }

  const queues = [getHeavyQueue(), getLightQueue()];
  const dlq = getDLQQueue();
  if (dlq) queues.push(dlq);

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter: serverAdapter,
  });

  return serverAdapter.getRouter();
};
