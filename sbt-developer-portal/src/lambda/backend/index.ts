import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import express, { Request, Response } from 'express';
import serverless from 'aws-serverless-express';
import cors from 'cors';
import { apiKeyRouter } from './routes/apikey';
import { subscriptionsRouter } from './routes/subscriptions';
import { catalogRouter } from './routes/catalog';
import { feedbackRouter } from './routes/feedback';
import { adminRouter } from './routes/admin';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// Routes
app.use('/apikey', apiKeyRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/catalog', catalogRouter);
app.use('/feedback', feedbackRouter);
app.use('/admin', adminRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create serverless server
const server = serverless.createServer(app);

export const handler = (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  return serverless.proxy(server, event, context, 'PROMISE').promise as Promise<APIGatewayProxyResult>;
};
