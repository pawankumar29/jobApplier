import { describe, it, expect } from 'vitest';
import { PriorityQueue } from '../src/worker/queue.js';

describe('Priority Queue (Early Applicant Prioritization)', () => {
  it('should rank recently discovered high-scoring jobs ahead of older jobs', () => {
    const queue = new PriorityQueue();
    const now = Date.now();

    // Job 1: Posted 2 hours ago, score 80
    queue.enqueue({
      id: 'job-1',
      jobId: 'job-1',
      userId: 'u1',
      score: 80,
      postedAt: new Date(now - 7200000), // 2 hours ago
      discoveredAt: new Date(now - 7200000),
      retryCount: 0,
    });

    // Job 2: Posted 2 minutes ago, score 85 (Recent + High relevance)
    queue.enqueue({
      id: 'job-2',
      jobId: 'job-2',
      userId: 'u1',
      score: 85,
      postedAt: new Date(now - 120000), // 2 mins ago
      discoveredAt: new Date(now - 120000),
      retryCount: 0,
    });

    const next = queue.dequeue();
    expect(next?.jobId).toBe('job-2');
  });

  it('should prioritize latest created jobs and matching skillset so daily limits apply to freshest postings first', () => {
    const queue = new PriorityQueue();
    const now = Date.now();

    // Older job: Posted 24 hours ago, score 82
    queue.enqueue({
      id: 'job-old',
      jobId: 'job-old',
      userId: 'u1',
      score: 82,
      postedAt: new Date(now - 86400000), // 24 hours ago
      discoveredAt: new Date(now - 86400000),
      retryCount: 0,
    });

    // Fresh job: Posted 10 minutes ago, score 80
    queue.enqueue({
      id: 'job-fresh',
      jobId: 'job-fresh',
      userId: 'u1',
      score: 80,
      postedAt: new Date(now - 600000), // 10 mins ago
      discoveredAt: new Date(now - 600000),
      retryCount: 0,
    });

    // Fresh job must dequeue first so daily limits hit freshest postings first
    const first = queue.dequeue();
    expect(first?.jobId).toBe('job-fresh');
  });
});

