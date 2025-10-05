import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { TelegramBot } from '@infrastructure/messaging/telegram/TelegramBot.js';

export interface ServerConfig {
  port: number;
  corsOptions?: cors.CorsOptions;
  telegramBot?: TelegramBot;
  apiPrefix?: string;
}

export interface ApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
}

export class HTTPServer {
  private app: Express;
  private server?: any;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`Server running on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      });
    }
  }

  getApp(): Express {
    return this.app;
  }

  addRoute(route: ApiRoute): void {
    const path = `${this.config.apiPrefix || '/api'}${route.path}`;
    const middlewares = route.middleware || [];
    
    switch (route.method) {
      case 'GET':
        this.app.get(path, ...middlewares, this.wrapAsyncHandler(route.handler));
        break;
      case 'POST':
        this.app.post(path, ...middlewares, this.wrapAsyncHandler(route.handler));
        break;
      case 'PUT':
        this.app.put(path, ...middlewares, this.wrapAsyncHandler(route.handler));
        break;
      case 'DELETE':
        this.app.delete(path, ...middlewares, this.wrapAsyncHandler(route.handler));
        break;
      case 'PATCH':
        this.app.patch(path, ...middlewares, this.wrapAsyncHandler(route.handler));
        break;
    }
  }

  addRoutes(routes: ApiRoute[]): void {
    routes.forEach(route => this.addRoute(route));
  }

  private setupMiddleware(): void {
    // Trust proxy (for deployment behind reverse proxy)
    this.app.set('trust proxy', 1);

    // CORS
    this.app.use(cors(this.config.corsOptions || {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') 
        : true,
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      
      next();
    });

    // Request ID
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('x-request-id', req.headers['x-request-id']);
      next();
    });

    // Security headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
      });
    });

    // Telegram webhook
    if (this.config.telegramBot) {
      this.app.use('/webhook/telegram', this.config.telegramBot.getWebhookHandler());
    }

    // API documentation
    this.app.get('/docs', (req: Request, res: Response) => {
      res.json({
        name: 'MillionTasks API',
        version: '1.0.0',
        description: 'AI-powered task management system API',
        endpoints: {
          health: 'GET /health',
          webhook: 'POST /webhook/telegram',
          api: 'Various endpoints under /api/*',
        },
      });
    });

    // Default API routes
    const apiRouter = express.Router();
    
    // API health check
    apiRouter.get('/health', (req: Request, res: Response) => {
      res.json({
        api: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use(this.config.apiPrefix || '/api', apiRouter);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Unhandled error:', error);
      
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? error.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        ...(isDevelopment && { stack: error.stack }),
      });
    });
  }

  private wrapAsyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(handler(req, res, next)).catch(next);
    };
  }

  // Graceful shutdown
  setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down gracefully`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  }
}

// Response helpers
export class ApiResponse {
  static success<T>(data: T, message?: string): { success: true; data: T; message?: string } {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  static error(
    message: string, 
    code?: string, 
    details?: any
  ): { success: false; error: { message: string; code?: string; details?: any } } {
    return {
      success: false,
      error: {
        message,
        ...(code && { code }),
        ...(details && { details }),
      },
    };
  }

  static paginated<T>(
    data: T[], 
    meta: { total: number; page: number; limit: number; hasNext: boolean; hasPrev: boolean }
  ): { success: true; data: T[]; meta: typeof meta } {
    return {
      success: true,
      data,
      meta,
    };
  }
}

// Middleware helpers
export const validateJSON = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json(ApiResponse.error('Request body is required'));
    }
  }
  next();
};

export const rateLimit = (windowMs: number, max: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'anonymous';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const record = requests.get(key);
    
    if (!record || record.resetTime < windowStart) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= max) {
      return res.status(429).json(ApiResponse.error('Too many requests'));
    }
    
    record.count++;
    next();
  };
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // This would be implemented based on your authentication strategy
  // For now, just pass through
  next();
};