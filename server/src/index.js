import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import siteRoutes from './routes/sites.js';
import readingRoutes from './routes/readings.js';
import userRoutes from './routes/users.js';
import { ensureRole, requireAuth } from './middleware/auth.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); 
const __filename = fileURLToPath(import.meta.url);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/sites', requireAuth, siteRoutes);
app.use('/api/users', requireAuth, ensureRole('superadmin'), userRoutes);
app.use('/api', requireAuth, readingRoutes);

const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aqua';

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  });


if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', '..', 'client', 'dist');

  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}