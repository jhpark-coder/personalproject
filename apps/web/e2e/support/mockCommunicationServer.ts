import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';

export interface MockNotification {
  _id: string;
  senderUserId: number;
  targetUserId: number;
  message: string;
  type: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

interface ChatHistoryMessage {
  id?: string;
  sender: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  recipient?: string | null;
  timestamp: string;
  isAdmin?: boolean;
}

const setCorsHeaders = (req: IncomingMessage, res: ServerResponse) => {
  const origin = req.headers.origin || 'http://127.0.0.1:4173';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-XSRF-TOKEN');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Vary', 'Origin');
};

const json = (req: IncomingMessage, res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const readJson = async (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

export class MockCommunicationServer {
  private notifications: MockNotification[] = [];
  private adminOnline = true;
  private readonly chatHistory = new Map<string, ChatHistoryMessage[]>();
  private io?: SocketIOServer;
  private httpServer?: ReturnType<typeof createServer>;

  async start(port = 4010) {
    await this.stop();

    this.httpServer = createServer((req, res) => {
      void this.handleHttp(req, res);
    });
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: 'http://127.0.0.1:4173',
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      this.handleSocket(socket);
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(port, '127.0.0.1', () => resolve());
    });
  }

  async stop() {
    if (this.io) {
      const io = this.io;
      try {
        await new Promise<void>((resolve, reject) => {
          io.close((error?: Error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('Server is not running')) {
          throw error;
        }
      }
      this.io = undefined;
    }

    if (this.httpServer) {
      const server = this.httpServer;
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            if (error.message.includes('Server is not running')) {
              resolve();
              return;
            }
            reject(error);
            return;
          }
          resolve();
        });
      });
      this.httpServer = undefined;
    }
  }

  setAdminOnline(value: boolean) {
    this.adminOnline = value;
  }

  seedNotifications(items: MockNotification[]) {
    this.notifications = [...items];
  }

  setChatHistory(userId: string, history: ChatHistoryMessage[]) {
    this.chatHistory.set(userId, history);
  }

  emitNotification(notification: MockNotification) {
    this.notifications = [notification, ...this.notifications.filter((item) => item._id !== notification._id)];
    this.io?.to(String(notification.targetUserId)).emit('newNotification', notification);
  }

  emitBroadcastNotification(notification: MockNotification) {
    this.notifications = [notification, ...this.notifications.filter((item) => item._id !== notification._id)];
    this.io?.emit('broadcastNotification', notification);
  }

  emitAdminReply(
    recipient: string | number,
    message: Omit<ChatHistoryMessage, 'isAdmin'>,
  ) {
    this.io?.to(String(recipient)).emit('adminReply', {
      ...message,
      id: message.id ?? `${Date.now()}`,
      timestamp: message.timestamp ?? new Date().toISOString(),
      isAdmin: true,
    });
  }

  private async handleHttp(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1:4010');
    const { method = 'GET' } = req;

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      setCorsHeaders(req, res);
      res.end();
      return;
    }

    if (method === 'POST' && url.pathname === '/sms/request-otp') {
      json(req, res, 200, { success: true, message: '인증 코드가 발송되었습니다.' });
      return;
    }

    if (method === 'POST' && url.pathname === '/sms/verify-otp') {
      const body = await readJson(req);
      const code = typeof body.code === 'string' ? body.code : '';
      json(
        req,
        res,
        200,
        code === '123456'
          ? { success: true, message: '인증이 완료되었습니다.' }
          : { success: false, message: '인증 코드가 올바르지 않습니다.' },
      );
      return;
    }

    const notificationUserMatch = url.pathname.match(/^\/api\/notifications\/user\/(\d+)$/);
    if (method === 'GET' && notificationUserMatch) {
      const userId = Number(notificationUserMatch[1]);
      json(
        req,
        res,
        200,
        this.notifications.filter((item) => item.targetUserId === userId),
      );
      return;
    }

    const notificationReadMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
    if (method === 'PUT' && notificationReadMatch) {
      const id = notificationReadMatch[1];
      this.notifications = this.notifications.map((item) =>
        item._id === id ? { ...item, isRead: true } : item,
      );
      json(req, res, 200, { success: true });
      return;
    }

    json(req, res, 404, { success: false, message: 'not_found' });
  }

  private handleSocket(socket: Socket) {
    socket.on('subscribe', ({ userId }: { userId: string | number }) => {
      socket.join(String(userId));
    });

    socket.on('checkAdminStatus', () => {
      socket.emit(this.adminOnline ? 'adminOnline' : 'adminOffline');
    });

    socket.on('joinChat', ({ sender }: { sender: string }) => {
      socket.join(sender);
    });

    socket.on('getHistory', ({ userId }: { userId: string }) => {
      const history = this.chatHistory.get(userId) ?? [];
      socket.emit('chatHistory', { userId, history });
    });

    socket.on('sendMessage', (message: ChatHistoryMessage) => {
      const normalizedMessage: ChatHistoryMessage = {
        ...message,
        id: message.id ?? `${Date.now()}`,
        timestamp: message.timestamp ?? new Date().toISOString(),
      };

      if (normalizedMessage.recipient) {
        this.io?.to(normalizedMessage.recipient).emit('adminReply', {
          ...normalizedMessage,
          isAdmin: true,
        });
        return;
      }

      this.io?.to(normalizedMessage.sender).emit('chatMessage', {
        ...normalizedMessage,
        isAdmin: false,
      });
    });
  }
}
