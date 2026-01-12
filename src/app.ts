import express from 'express';
import { sanitized, errorHandler } from './middleware';
import { router } from './router';

/**
 * Creates and configures the Express application
 */
export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sanitized());
  app.use(router());

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
};
