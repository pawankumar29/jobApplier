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
    // 1. Recency Factor: Fresh jobs (posted in the last few minutes/hours) get top priority
    //    so that daily limits are consumed by the latest posted jobs before older postings.
    const ageHours = Math.max(0, (Date.now() - item.postedAt.getTime()) / (1000 * 60 * 60));
    const recencyScore = Math.max(0, 100 * Math.exp(-ageHours / 18));

    // 2. Skillset Relevance Factor: Semantic AI evaluation score (0 - 100)
    const relevanceScore = Math.min(100, Math.max(0, item.score));

    // Weighted composite: 60% recency (latest created) + 40% skillset match
    const priorityScore = recencyScore * 0.6 + relevanceScore * 0.4;

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

