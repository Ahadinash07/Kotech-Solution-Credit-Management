import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config({ path: '.env.local' });

import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from './websocket';
import { initDatabase } from '../models';
import { CreditService } from '../services/creditService';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(async () => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize WebSocket server
  new WebSocketServer(server);

  // Initialize database
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    // Initialize credit service to restore active sessions
    const creditService = CreditService.getInstance();
    await creditService.initializeFromRedis();
    console.log('Credit service initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log('> WebSocket server is running');
  });
});
