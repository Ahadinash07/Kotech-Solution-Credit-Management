# Minute-Credit Management Web App

A real-time credit tracking and session management platform built with Next.js, Express, PostgreSQL, Redis, and WebSockets. This application tracks live session time in seconds and deducts credits at a fixed rate (10 credits per minute).

## Features

- **User Authentication**: Email/password signup and login with JWT tokens
- **Real-time Credit Tracking**: Credits are deducted every 6 seconds (1 credit) during active sessions
- **Session Management**: Start/stop sessions with automatic termination when credits reach zero
- **Live Updates**: WebSocket integration for real-time credit and session status updates
- **Responsive Design**: Fully responsive UI for mobile, tablet, laptop, and desktop screens
- **Database Logging**: Complete audit trail of sessions and credit transactions

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Cache/Sessions**: Redis for in-memory session tracking
- **Real-time**: Socket.IO for WebSocket connections
- **Authentication**: JWT tokens with bcrypt password hashing

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Redis (v6 or higher)
- npm or yarn package manager

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd minute-credit-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   
   Create a PostgreSQL database:
   ```sql
   CREATE DATABASE minute_credit_db;
   ```

4. **Redis Setup**
   
   Make sure Redis is running on your system:
   ```bash
   # On macOS with Homebrew
   brew services start redis
   
   # On Ubuntu/Debian
   sudo systemctl start redis-server
   
   # Or run Redis directly
   redis-server
   ```

5. **Environment Configuration**
   
   Copy the example environment file and configure your settings:
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your database and Redis credentials:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=minute_credit_db
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   
   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Application Configuration
   NODE_ENV=development
   PORT=3000
   FRONTEND_URL=http://localhost:3000
   
   # WebSocket Configuration
   NEXT_PUBLIC_WS_URL=http://localhost:3000
   ```

## Running the Application

1. **Development Mode**
   ```bash
   npm run dev
   ```

2. **Production Mode**
   ```bash
   npm run build
   npm start
   ```

3. **Access the Application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Application Flow

### User Registration
1. Navigate to `/signup` or click "Sign up" from the login page
2. Enter email and password
3. New users automatically receive 100 credits
4. Successful registration redirects to the dashboard

### User Login
1. Navigate to `/login` or the root URL redirects here if not authenticated
2. Enter email and password
3. Successful login redirects to the dashboard

### Session Management
1. **Starting a Session**: Click "Start Session" on the dashboard
   - Requires at least 1 credit to start
   - Credits begin deducting immediately (1 credit every 6 seconds)
   - Real-time updates show current credit balance and session duration

2. **During a Session**: 
   - Live credit counter updates every second via WebSocket
   - Session duration timer shows elapsed time
   - Credits consumed counter tracks total usage

3. **Ending a Session**:
   - Click "Stop Session" to manually end
   - Session automatically ends when credits reach zero
   - Session data is saved to database with timestamps and credits consumed

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/user/profile` - Get user profile (requires auth)

### Session Management
- `POST /api/session/start` - Start a new session (requires auth)
- `POST /api/session/stop` - Stop active session (requires auth)
- `GET /api/session/status` - Get current session status (requires auth)

## Database Schema

### Users Table
- `id` (Primary Key)
- `email` (Unique)
- `password` (Hashed)
- `credits` (Integer, default: 100)
- `createdAt`, `updatedAt`

### Sessions Table
- `id` (Primary Key)
- `userId` (Foreign Key)
- `startTime` (DateTime)
- `endTime` (DateTime, nullable)
- `creditsConsumed` (Integer)
- `isActive` (Boolean)
- `createdAt`, `updatedAt`

### Credit Logs Table
- `id` (Primary Key)
- `userId` (Foreign Key)
- `sessionId` (Foreign Key, nullable)
- `creditsDeducted` (Integer)
- `remainingCredits` (Integer)
- `timestamp` (DateTime)
- `createdAt`, `updatedAt`

## Architecture Decisions

### Credit Deduction System
- **Rate**: 10 credits per minute = 1 credit every 6 seconds
- **Implementation**: Node.js intervals with Redis session tracking
- **Persistence**: All transactions logged to PostgreSQL
- **Real-time**: WebSocket broadcasts for immediate UI updates

### Session Management
- **Active Sessions**: Tracked in Redis for performance
- **Persistence**: Session metadata stored in PostgreSQL
- **Automatic Cleanup**: Sessions end when credits reach zero
- **Concurrency**: One active session per user maximum

### Authentication & Security
- **JWT Tokens**: 24-hour expiration with secure secrets
- **Password Hashing**: bcrypt with 12 salt rounds
- **Authorization**: Bearer token validation on protected routes
- **Session Security**: Redis-based session invalidation

### Real-time Updates
- **WebSocket**: Socket.IO for bidirectional communication
- **Authentication**: Token-based WebSocket authentication
- **Events**: Credit updates and session end notifications
- **Scalability**: Redis pub/sub for multi-instance support

## Responsive Design

The application is fully responsive across all device sizes:

- **Mobile** (320px - 768px): Single column layout, touch-friendly buttons
- **Tablet** (768px - 1024px): Two-column grid, optimized spacing
- **Laptop** (1024px - 1440px): Three-column dashboard layout
- **Desktop** (1440px+): Full-width layout with optimal spacing

## Development Notes

### Code Structure
- **Modular Architecture**: Separate services for credit management
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error catching and logging
- **Code Quality**: ESLint configuration with Next.js best practices

### Performance Considerations
- **Database Optimization**: Indexed queries and connection pooling
- **Redis Caching**: Session state and real-time data caching
- **WebSocket Efficiency**: Targeted user messaging, no broadcasting
- **Frontend Optimization**: React hooks for state management

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify PostgreSQL is running
   - Check database credentials in `.env.local`
   - Ensure database exists and user has proper permissions

2. **Redis Connection Errors**
   - Verify Redis server is running
   - Check Redis configuration in `.env.local`
   - Test Redis connection: `redis-cli ping`

3. **WebSocket Connection Issues**
   - Ensure custom server is running (not Next.js dev server)
   - Check CORS configuration for your domain
   - Verify WebSocket URL in environment variables

4. **Authentication Issues**
   - Check JWT_SECRET is set in environment
   - Verify token expiration settings
   - Clear browser localStorage if needed

### Logs and Debugging
- Server logs show database and Redis connections
- Browser console shows WebSocket connection status
- API responses include detailed error messages
- Credit deduction logs are stored in database

## Future Enhancements

- **Credit Purchase System**: Allow users to buy additional credits
- **Session Analytics**: Detailed usage reports and statistics
- **Admin Dashboard**: User management and system monitoring
- **Mobile App**: React Native implementation
- **Microservices**: Split into separate auth and credit services
- **Docker Support**: Containerization for easy deployment

## License

This project is built for educational and demonstration purposes.
