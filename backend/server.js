const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const seedAdminUser = require('./utils/seedAdmin');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://bloom-node-issp-1mtp.vercel.app',
    'https://bloom-node-issp-1mtp-*.vercel.app', // For preview deployments
    /\.vercel\.app$/ // Allow all Vercel preview URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
const connectMongoDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI environment variable is not set!');
    console.error('Please set MONGODB_URI in your .env file or environment variables.');
    process.exit(1);
  }

  // Validate connection string format
  const isAtlas = mongoUri.startsWith('mongodb+srv://');
  const isLocal = mongoUri.startsWith('mongodb://') && mongoUri.includes('localhost');
  
  // Extract database name for logging (without exposing credentials)
  let dbName = 'unknown';
  try {
    const uriMatch = mongoUri.match(/\/([^?]+)/);
    if (uriMatch) {
      dbName = uriMatch[1];
    }
  } catch (e) {
    // Ignore parsing errors
  }

  // Silent connection - no console output during connection

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });

    const connectionState = mongoose.connection.readyState;
    const connectionHost = mongoose.connection.host;
    const connectionName = mongoose.connection.name;

    if (connectionState === 1) {
      console.log('Successfully connected to MongoDB');
      if (isLocal) {
        console.warn('WARNING: Using LOCAL MongoDB - Switch to Atlas for deployment!');
      }
    }

    // Seed admin user after successful database connection
    await seedAdminUser();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('Tip: Check your MongoDB Atlas username and password');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('Tip: Check your MongoDB Atlas cluster URL');
      console.error('Tip: Verify Network Access in Atlas allows your IP (0.0.0.0/0 for all)');
    } else if (error.message.includes('timeout')) {
      console.error('Tip: Connection timeout - check your internet connection');
      console.error('Tip: Verify MongoDB Atlas cluster is running');
    }
    
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  // Silent reconnection
});

// Connect to MongoDB
connectMongoDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/requests', require('./routes/request'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/issp', require('./routes/issp'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/test', require('./routes/test-email')); // Test route for debugging

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'BloomNode Backend API is running!' });
});

// Health check route with MongoDB connection info
app.get('/api/health', (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const mongoUri = process.env.MONGODB_URI || 'not set';
  const isAtlas = mongoUri.startsWith('mongodb+srv://');
  const isLocal = mongoUri.startsWith('mongodb://') && mongoUri.includes('localhost');

  // Extract database name (without exposing credentials)
  let dbName = 'unknown';
  let connectionType = 'unknown';
  
  try {
    const uriMatch = mongoUri.match(/\/([^?]+)/);
    if (uriMatch) {
      dbName = uriMatch[1];
    }
    
    if (isAtlas) {
      connectionType = 'MongoDB Atlas (Cloud)';
    } else if (isLocal) {
      connectionType = 'Local MongoDB';
    } else if (mongoUri.startsWith('mongodb://')) {
      connectionType = 'MongoDB (Other)';
    }
  } catch (e) {
    // Ignore parsing errors
  }

  res.json({
    status: 'ok',
    server: 'running',
    mongodb: {
      state: states[mongoState] || 'unknown',
      connected: mongoState === 1,
      connectionType: connectionType,
      database: dbName,
      host: mongoose.connection.host || 'unknown',
      usingAtlas: isAtlas,
      usingLocal: isLocal
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
