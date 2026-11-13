import { Response } from 'express';

interface SSEClient {
  id: string;
  userId: string;
  res: Response;
}

export class SSEService {
  private clients: SSEClient[] = [];

  addClient(userId: string, res: Response): string {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const client: SSEClient = { id, userId, res };
    this.clients.push(client);

    // Initial SSE connection handshake
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE stream connected', timestamp: new Date() })}\n\n`);

    res.on('close', () => {
      this.removeClient(id);
    });

    return id;
  }

  removeClient(id: string): void {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  broadcastToUser(userId: string, eventType: string, data: any): void {
    const userClients = this.clients.filter((c) => c.userId === userId);
    const payload = JSON.stringify({ type: eventType, data, timestamp: new Date() });
    userClients.forEach((client) => {
      try {
        client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      } catch (err) {
        console.error(`Error sending SSE event to user ${userId}:`, err);
      }
    });
  }

  broadcastAll(eventType: string, data: any): void {
    const payload = JSON.stringify({ type: eventType, data, timestamp: new Date() });
    this.clients.forEach((client) => {
      try {
        client.res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
      } catch (err) {
        // Ignored
      }
    });
  }
}

export const sseService = new SSEService();

