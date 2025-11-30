# BloomNode Backend

Backend API for the BloomNode application with MongoDB integration and user approval system.

## Features

- User registration with admin approval requirement
- JWT-based authentication
- MongoDB integration with Mongoose
- Password hashing with bcryptjs
- CORS enabled for frontend integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up MongoDB:
   - Install MongoDB locally or use MongoDB Atlas
   - Update the `MONGODB_URI` in `.env` file

3. Configure environment variables:
   - Copy `.env` file and update the values:
     - `MONGODB_URI`: Your MongoDB connection string
     - `JWT_SECRET`: A secure secret key for JWT tokens
     - `PORT`: Server port (default: 5000)
     - `OPENROUTER_API_KEY`: API key from [openrouter.ai](https://openrouter.ai/)
     - `OPENROUTER_MODEL` (optional): Override the default `meta-llama/llama-3.1-8b-instruct`
     - `OPENROUTER_SITE_URL` (optional): Used for the `HTTP-Referer` header; defaults to `http://localhost:3000`
     - `OPENROUTER_APP_TITLE` (optional): Label OpenRouter uses for analytics; defaults to `BloomNode`

4. Start the server:
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

- `POST /signup` - Register new user (requires admin approval)
- `POST /login` - Login user (only approved users can login)
- `GET /pending-users` - Get all pending users (for admin dashboard)
- `PATCH /approve-user/:userId` - Approve a user (for admin dashboard)
- `PATCH /reject-user/:userId` - Reject a user (for admin dashboard)

## User Approval Workflow

1. User registers through the signup form
2. Account is created with `approvalStatus: 'pending'`
3. User receives message that account needs admin approval
4. Admin can approve/reject users through the admin endpoints
5. Only approved users can login to the application

## Database Schema

### User Model
- `username`: Unique username
- `email`: Unique email address
- `password`: Hashed password
- `isApproved`: Boolean approval status
- `approvalStatus`: 'pending' | 'approved' | 'rejected'
- `approvedBy`: Reference to admin who approved
- `approvedAt`: Approval timestamp
- `role`: 'user' | 'admin'
