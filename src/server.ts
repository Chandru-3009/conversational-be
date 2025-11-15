import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { connectDatabase } from './config/database';
import { Config } from './config/config';
import { AudioStreamingServer } from './websocket/audioStreamingServer';
import { OpenAIRealtimeService } from './services/openaiRealtimeService';
import { UserModel } from './models/User';
import { ConversationModel } from './models/Conversation';
import { FoodEntryModel } from './models/FoodEntry';
import { SessionModel } from './models/Session';
import { IntentBuilderAgentModel } from './models/IntentBuilderAgent';
import { IntentBuilderSectionModel } from './models/IntentBuilderSection';
import { IntentBuilderIntentModel } from './models/IntentBuilderIntent';
import { IntentBuilderResponseModel } from './models/IntentBuilderResponse';
import { CompleteIntentBuilderAgentModel } from './models/CompleteIntentBuilderAgent';
import intentBuilderRoutes from './routes/intentBuilder';


const app = express();
const PORT = Config.PORT;
const WS_PORT = Config.WS_PORT;

// Static file handling function
function handleStaticFile(req: express.Request, res: express.Response, filePath: string): void {
  try {
    // Determine the base path for static files
    // In production (dist), files are in ./public (copied during build)
    // In development, files are in ../public
    const basePath = path.join(__dirname, fs.existsSync(path.join(__dirname, './public')) ? './public' : '../public');
    const fullPath = path.join(basePath, filePath);
    
    // Security check: ensure the file is within the public directory
    if (!fullPath.startsWith(basePath)) {
      res.status(403).send('Forbidden');
      return;
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      res.status(404).send('File not found');
      return;
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    
    // If it's a directory, serve index.html
    if (stats.isDirectory()) {
      const indexPath = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        res.set('Content-Type', 'text/html');
        res.status(200).send(content);
      } else {
        res.status(404).send('Directory index not found');
      }
      return;
    }

    // Read and serve the file
    const content = fs.readFileSync(fullPath);
    
    // Set appropriate content type based on file extension
    const ext = path.extname(fullPath).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain',
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.set('Content-Type', contentType);
    
    // Set cache headers for static assets
    if (ext !== '.html') {
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache for static assets
    }
    
    res.status(200).send(content);
  } catch (error) {
    console.error('Static file serving error:', error);
    res.status(500).send('Internal server error');
  }
}

// Initialize OpenAI Realtime Service if enabled
let openaiRealtimeService: OpenAIRealtimeService | null = null;
if (Config.isOpenAIRealtimeEnabled()) {
  try {
    openaiRealtimeService = new OpenAIRealtimeService();
    console.log('✅ OpenAI Realtime Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI Realtime Service:', error);
    console.log('⚠️ Realtime API will not be available. Users can still use the standard WebSocket interface.');
  }
} else {
  console.log('ℹ️  OpenAI Realtime API is disabled. Set OPENAI_REALTIME_ENABLED=true to enable.');
}

// Middleware
// Disable Content Security Policy to allow audio streaming 
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(compression());
// CORS with multiple allowed origins support
const allowedOrigins = (Config.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (no Origin header) and same-origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));

// Preflight
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Intent Builder API routes
app.use('/api', intentBuilderRoutes);

// WebSocket server stats endpoint
app.get('/api/stats', (req, res) => {
  if (audioServer) {
    res.json(audioServer.getStats());
  } else {
    res.status(503).json({ error: 'WebSocket server not available' });
  }
});

// Handle all static file requests
app.get('*', (req, res, next) => {
  const requestPath = req.path;
  
  // Skip API routes and health check
  if (requestPath.startsWith('/api/') || requestPath === '/health') {
    return next();
  }
  
  // Remove leading slash and handle the file path
  const filePath = requestPath.substring(1) || 'index.html';
  
  // Handle static file serving
  handleStaticFile(req, res, filePath);
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: Config.isDevelopment() ? err.message : 'Something went wrong'
  });
});

let audioServer: AudioStreamingServer | null = null;

async function startServer() {
  try {
    // Validate configuration
    Config.validate();
    console.log('✅ Configuration validated');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Create database indexes
    await UserModel.createIndexes();
    await ConversationModel.createIndexes();
    await FoodEntryModel.createIndexes();
    await SessionModel.createIndexes();
    await IntentBuilderAgentModel.createIndexes();
    await IntentBuilderSectionModel.createIndexes();
    await IntentBuilderIntentModel.createIndexes();
    await IntentBuilderResponseModel.createIndexes();
    await CompleteIntentBuilderAgentModel.createIndexes();
    console.log('✅ Database indexes created');

    // Start WebSocket server
    audioServer = new AudioStreamingServer(WS_PORT, openaiRealtimeService || undefined);
    console.log(`✅ WebSocket server started on port ${WS_PORT}`);

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`✅ HTTP server started on port ${PORT}`);
      console.log(`🌐 Server running at http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server running at ws://localhost:${WS_PORT}`);
      if (Config.isOpenAIRealtimeEnabled()) {
        console.log(`🤖 OpenAI Realtime API enabled`);
      }
    });

    // Start cleanup interval for OpenAI Realtime sessions
    if (openaiRealtimeService) {
      setInterval(() => {
        openaiRealtimeService!.cleanupExpiredSessions();
      }, 60000); // Clean up every minute
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  if (audioServer) {
    audioServer.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  if (audioServer) {
    audioServer.close();
  }
  process.exit(0);
});

// Start the server
startServer(); 