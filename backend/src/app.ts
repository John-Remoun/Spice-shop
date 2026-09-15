import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import routes from './routes';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''))
        : [];
      
      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(cleanOrigin) ||
        allowedOrigins.includes('*') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, cleanOrigin);
      }
      // Reflection fallback for cross-domain auth
      return callback(null, cleanOrigin);
    },
    credentials: true, // required so the httpOnly refresh cookie is sent/received
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', routes);

// 404
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

// Central error handler — catches anything thrown/rejected in a route that
// wasn't already handled locally (async errors bubble here via Express 5's
// native promise handling).
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ message });
});

export default app;
