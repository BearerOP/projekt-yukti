# Opinion Trading Platform - Backend API

A comprehensive backend API for the Opinion Trading Platform built with Express.js, TypeScript, and PostgreSQL.

## Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **User Management**: Profile management, KYC verification, wallet balance
- **Poll System**: Create, manage, and participate in opinion polls
- **Bidding System**: Place bids on poll options with real-time odds calculation
- **Payment Integration**: Deposit/withdrawal with Razorpay integration
- **Real-time Updates**: Socket.io for live poll updates and bid notifications
- **Notification System**: In-app notifications for various events
- **Security**: Rate limiting, CORS, helmet, input validation with Zod

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /verify-otp` - OTP verification
- `POST /refresh-token` - Refresh access token
- `POST /logout` - User logout

### Users (`/api/v1/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `GET /wallet/balance` - Get wallet balance
- `POST /kyc` - Upload KYC documents
- `GET /stats` - Get user statistics

### Polls (`/api/v1/polls`)
- `GET /` - Get all polls (with filtering)
- `GET /trending` - Get trending polls
- `GET /:id` - Get poll by ID
- `POST /` - Create new poll
- `PUT /:id` - Update poll
- `DELETE /:id` - Delete poll

### Bids (`/api/v1/bids`)
- `POST /place` - Place a bid
- `GET /my-bids` - Get user's bids
- `GET /history` - Get bid history
- `GET /:id` - Get bid by ID

### Payments (`/api/v1/payments`)
- `POST /deposit/initiate` - Initiate deposit
- `POST /deposit/verify` - Verify deposit
- `POST /withdraw` - Withdraw funds
- `GET /transactions` - Get transaction history

### Notifications (`/api/v1/notifications`)
- `GET /` - Get user notifications
- `GET /unread-count` - Get unread count
- `PUT /:id/read` - Mark notification as read
- `PUT /mark-all-read` - Mark all as read
- `DELETE /:id` - Delete notification

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Bun (for package management)
- PostgreSQL (v13+)

### Environment Variables
Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=opinion_trading
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-here

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

### Installation & Running

1. Install dependencies:
```bash
bun install
```

2. Set up PostgreSQL database:
```bash
createdb opinion_trading
```

3. Start the development server:
```bash
bun run dev
```

4. The server will start on `http://localhost:5001`

### Database Schema
The API automatically creates the required database tables and indexes on startup. The schema includes:

- **users**: User accounts and profiles
- **polls**: Opinion polls and their options
- **bids**: User bids on poll options
- **transactions**: Payment and transaction history
- **notifications**: In-app notifications
- **refresh_tokens**: JWT refresh token storage

### API Response Format
All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": 400
  }
}
```

### Real-time Features
The API includes Socket.io integration for real-time features:
- Live poll updates
- New bid notifications
- Real-time odds calculation

### Security Features
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation with Zod
- JWT token authentication
- Password hashing with bcrypt

### Testing
```bash
bun test
```

### Production Deployment
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up proper JWT secrets
4. Configure payment gateway
5. Set up file storage (AWS S3)
6. Configure reverse proxy (nginx)

## Mobile App Integration
This API is designed to work seamlessly with the React Native mobile app. The mobile app expects:
- Base URL: `http://localhost:5001/api/v1` (development)
- Authentication via Bearer tokens
- Real-time updates via Socket.io
- File upload support for KYC documents
