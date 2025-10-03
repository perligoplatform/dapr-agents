/**
 * Simple HTTP server to handle Dapr actor/workflow callbacks
 * 
 * This server needs to be running on port 3000 for Dapr workflows to work properly
 * since workflows depend on the actor runtime which requires app callbacks.
 */

import express from 'express';

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Dapr health check endpoint
app.get('/dapr/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Actor method invocation endpoint (required for workflow engine)
app.put('/actors/:actorType/:actorId/method/:methodName', (req, res) => {
  console.log(`🎭 Actor method called: ${req.params.actorType}/${req.params.actorId}/${req.params.methodName}`);
  console.log('📥 Request body:', req.body);
  
  // Return success for workflow-related actor calls
  res.json({ success: true, timestamp: new Date().toISOString() });
});

// Actor state endpoint
app.get('/actors/:actorType/:actorId/state/:key', (req, res) => {
  console.log(`📖 Actor state read: ${req.params.actorType}/${req.params.actorId}/${req.params.key}`);
  res.json({ value: null });
});

app.post('/actors/:actorType/:actorId/state', (req, res) => {
  console.log(`💾 Actor state write: ${req.params.actorType}/${req.params.actorId}`);
  console.log('📥 State data:', req.body);
  res.json({ success: true });
});

// Catch-all for other actor endpoints
app.all('/actors/*', (req, res) => {
  console.log(`🎭 Actor endpoint called: ${req.method} ${req.path}`);
  console.log('📥 Body:', req.body);
  res.json({ success: true });
});

// Start the server
const server = app.listen(port, () => {
  console.log(`🚀 Dapr app server listening on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`🎭 Ready to handle Dapr actor/workflow callbacks`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Shutting down app server...');
  server.close(() => {
    console.log('✅ App server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('📴 Shutting down app server...');
  server.close(() => {
    console.log('✅ App server stopped');
    process.exit(0);
  });
});

export default app;