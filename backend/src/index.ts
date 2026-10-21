import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
// Le logo arrive en base64 dans le JSON : la limite par défaut (100 Ko) le refuse (413)
app.use(express.json({ limit: '5mb' }));
app.use(fileUpload());  // Add file upload middleware

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Import and use route files
import authRouter from './routes/index.js';
import creditProductRouter from './routes/creditProducts.js';
import profileRouter from './routes/profile.js';
import applicationRouter from './routes/applications.js';

// Use routes - using the auth router from routes/index.ts
app.use('/api/auth', authRouter);
app.use('/api/credit-products', creditProductRouter);
app.use('/api/profile', profileRouter);
app.use('/api/applications', applicationRouter);

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
