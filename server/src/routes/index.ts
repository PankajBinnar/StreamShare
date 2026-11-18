import { Router } from 'express';
import authRoutes from './auth.routes.js';
import listingRoutes from './listing.routes.js';
import chatRoutes from './chat.routes.js';
import adminRoutes from './admin.routes.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'StreamShare P2P Secure API',
  });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/listings', listingRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/admin', adminRoutes);

export default apiRouter;

