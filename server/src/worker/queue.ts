export interface QueuedJobItem {
  id: string; // DiscoveredJob ID
  jobId: string;
  userId: string;
  score: number;
  postedAt: Date;
  discoveredAt: Date;
  priorityScore: number;
  retryCount: number;
  addedAt: Date;
}

export class PriorityQueue {
  private items: QueuedJobItem[] = [];
  private inProgress: Set<string> = new Set();

  enqueue(item: Omit<QueuedJobItem, 'priorityScore' | 'addedAt'>): QueuedJobItem {
    // Priority calculation:
    // 1. Ultra-Freshness Factor:
    //    Jobs posted in the last 1-4 hours get immediate top priority,
    //    ensuring daily quotas are strictly dedicated to the freshest postings.
    const ageHours = Math.max(0, (Date.now() - item.postedAt.getTime()) / (1000 * 60 * 60));
    // Steep exponential decay: fresh jobs (0-3 hours) dominate with 80-100 recency score
    const recencyScore = Math.max(0, 100 * Math.exp(-ageHours / 6));

    // 2. Skillset Relevance Factor: Semantic AI evaluation score (0 - 100)
    const relevanceScore = Math.min(100, Math.max(0, item.score));

    // Ultra-Freshness Weighted Composite: 75% Recency (newest posted first) + 25% Skillset Match
    const priorityScore = recencyScore * 0.75 + relevanceScore * 0.25;

    const queuedItem: QueuedJobItem = {
      ...item,
      priorityScore,
      addedAt: new Date(),
    };

    // Remove existing if already present
    this.items = this.items.filter((i) => i.jobId !== item.jobId);
    this.items.push(queuedItem);

    // Sort: Primary by priorityScore descending, secondary by postedAt timestamp descending (latest created first)
    this.items.sort((a, b) => {
      if (Math.abs(b.priorityScore - a.priorityScore) > 1.5) {
        return b.priorityScore - a.priorityScore;
      }
      return b.postedAt.getTime() - a.postedAt.getTime();
    });

    return queuedItem;
  }

  dequeue(): QueuedJobItem | undefined {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (!this.inProgress.has(item.jobId)) {
        this.inProgress.add(item.jobId);
        this.items.splice(i, 1);
        return item;
      }
    }
    return undefined;
  }

  markCompleted(jobId: string): void {
    this.inProgress.delete(jobId);
  }

  markFailed(jobId: string, retry: boolean = true): void {
    this.inProgress.delete(jobId);
    if (retry) {
      // Find or re-queue with increased retryCount if allowed
    }
  }

  getQueueLength(): number {
    return this.items.length;
  }

  getInProgressCount(): number {
    return this.inProgress.size;
  }

  getItems(): QueuedJobItem[] {
    return [...this.items];
  }

  clear(): void {
    this.items = [];
    this.inProgress.clear();
  }
}

export const jobPriorityQueue = new PriorityQueue();

