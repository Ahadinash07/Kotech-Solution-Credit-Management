import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyToken } from '../lib/auth';
import redis from '../lib/redis';

export class WebSocketServer {
  private io: SocketIOServer;
  private userSockets: Map<number, string> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
    this.setupRedisSubscriptions();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      // Handle authentication
      socket.on('authenticate', (token: string) => {
        try {
          // Remove Bearer prefix if present
          const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
          
          const payload = verifyToken(cleanToken);
          
          if (payload) {
            socket.data.userId = payload.userId;
            this.userSockets.set(payload.userId, socket.id);
            socket.emit('authenticated', { success: true });
          } else {
            socket.emit('authenticated', { success: false, error: 'Invalid token' });
          }
        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('authenticated', { success: false, error: 'Authentication failed' });
        }
      });

      socket.on('disconnect', () => {
        if (socket.data.userId) {
          this.userSockets.delete(socket.data.userId);
        }
      });
    });
  }

  private async setupRedisSubscriptions(): Promise<void> {
    // Subscribe to credit updates
    const subscriber = redis.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe('credit_update', (message) => {
      try {
        console.log('Received credit_update Redis message:', message);
        const data = JSON.parse(message);
        this.sendToUser(data.userId, 'credit_update', { credits: data.credits });
      } catch (error) {
        console.error('Error processing credit update:', error);
      }
    });

    await subscriber.subscribe('session_end', (message) => {
      try {
        console.log('Received session_end Redis message:', message);
        const data = JSON.parse(message);
        this.sendToUser(data.userId, 'session_end', {});
      } catch (error) {
        console.error('Error processing session end:', error);
      }
    });
  }

  private sendToUser(userId: number, event: string, data: Record<string, unknown>): void {
    const socketId = this.userSockets.get(userId);
    console.log(`Attempting to send ${event} to user ${userId}, socketId: ${socketId}`);
    if (socketId) {
      console.log(`Emitting ${event} to socket ${socketId}:`, data);
      this.io.to(socketId).emit(event, data);
    } else {
      console.log(`No socket found for user ${userId}. Active sockets:`, Array.from(this.userSockets.entries()));
    }
  }

  public broadcastCreditUpdate(userId: number, credits: number): void {
    this.sendToUser(userId, 'credit_update', { credits });
  }

  public broadcastSessionEnd(userId: number): void {
    this.sendToUser(userId, 'session_end', {});
  }
}
