import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Import and use route files
import authRouter from './routes/index.js';
import creditProductRouter from './routes/creditProducts.js';
import simulationRouter from './routes/simulations.js';
import profileRouter from './routes/profile.js';
import scoringModelRouter from './routes/scoringModels.js';

// Use routes - using the auth router from routes/index.ts
app.use('/api/auth', authRouter);
app.use('/api/credit-products', creditProductRouter);
app.use('/api/simulations', simulationRouter);
app.use('/api/profile', profileRouter);
app.use('/api/scoring-models', scoringModelRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}/api`);
});
