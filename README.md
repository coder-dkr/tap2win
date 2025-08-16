# Tap2Win - Real-Time Auction Platform

A modern, real-time auction platform built with React.js, Node.js, WebSockets, Supabase, and Upstash Redis.

## 🚀 Features

- **Real-Time Bidding**: Live auction updates with WebSocket connections
- **Role-Based Access**: Buyer, Seller, and Admin roles with proper authorization
- **Auction Management**: Create, manage, and monitor auctions
- **Bid System**: Real-time bidding with validation and notifications
- **Seller Decisions**: Accept, reject, or counter-offer functionality
- **Email Notifications**: SendGrid integration for transaction emails
- **PDF Invoices**: Automatic invoice generation and delivery
- **Admin Panel**: Comprehensive admin dashboard for system management
- **Real-Time Notifications**: In-app notifications for all auction events

## 🛠️ Tech Stack

- **Frontend**: React.js + TypeScript + Tailwind CSS v4 + Vite
- **Backend**: Node.js + Express.js + JavaScript
- **Database**: Supabase (PostgreSQL) + Sequelize ORM
- **Real-Time**: Native WebSockets
- **Cache/State**: Upstash Redis
- **Email**: SendGrid
- **PDF**: Puppeteer + Handlebars
- **Deployment**: Docker + Render.com

## 📋 API Documentation

### Base URL
```
http://localhost:5100/api
```

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication Endpoints

### 1. Register User
```bash
curl -X POST http://localhost:5100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "buyer"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "buyer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login User
```bash
curl -X POST http://localhost:5100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "buyer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get User Profile
```bash
curl -X GET http://localhost:5100/api/auth/profile \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "buyer",
    "avatar": null,
    "isActive": true
  }
}
```

### 4. Update Profile
```bash
curl -X PUT http://localhost:5100/api/auth/profile \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "seller"
  }'
```

### 5. Change Password
```bash
curl -X PUT http://localhost:5100/api/auth/change-password \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword123"
  }'
```

---

## 🏷️ Auction Endpoints

### 1. Get All Auctions (Public)
```bash
curl -X GET "http://localhost:5100/api/auctions?page=1&limit=10&status=active&category=Electronics"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "auctions": [
      {
        "id": 1,
        "title": "iPhone 15 Pro",
        "description": "Brand new iPhone 15 Pro",
        "startingPrice": "999.00",
        "currentPrice": "1200.00",
        "bidIncrement": "50.00",
        "startTime": "2025-08-16T10:00:00.000Z",
        "endTime": "2025-08-16T18:00:00.000Z",
        "status": "active",
        "category": "Electronics",
        "condition": "new",
        "images": ["image1.jpg", "image2.jpg"],
        "seller": {
          "id": 2,
          "username": "seller1",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "totalBids": 5,
        "timeRemaining": 7200
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### 2. Get Auction by ID (Public)
```bash
curl -X GET http://localhost:5100/api/auctions/1
```

### 3. Create Auction (Seller/Admin Only)
```bash
curl -X POST http://localhost:5100/api/auctions \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Vintage Watch",
    "description": "Rare vintage timepiece in excellent condition",
    "startingPrice": 500,
    "bidIncrement": 25,
    "goLiveDate": "2025-08-16T12:00:00Z",
    "duration": 3600,
    "category": "Jewelry",
    "condition": "good",
    "images": ["watch1.jpg", "watch2.jpg"]
  }'
```

### 4. Update Auction (Seller/Admin Only)
```bash
curl -X PUT http://localhost:5100/api/auctions/1 \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Vintage Watch",
    "description": "Updated description",
    "startingPrice": 600
  }'
```

### 5. Delete Auction (Seller/Admin Only)
```bash
curl -X DELETE http://localhost:5100/api/auctions/1 \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 6. Get My Auctions (Authenticated)
```bash
curl -X GET "http://localhost:5100/api/auctions/user/my-auctions?page=1&limit=10" \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## 💰 Bid Endpoints

### 1. Place Bid
```bash
curl -X POST http://localhost:5100/api/bids \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "auctionId": 1,
    "amount": 1250
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "data": {
    "id": 1,
    "amount": "1250.00",
    "bidTime": "2025-08-16T10:30:00.000Z",
    "isWinning": true,
    "status": "active",
    "auction": {
      "id": 1,
      "title": "iPhone 15 Pro",
      "currentPrice": "1250.00"
    }
  }
}
```

### 2. Get My Bids
```bash
curl -X GET "http://localhost:5100/api/bids?page=1&limit=10&status=winning" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 3. Get Auction Bids
```bash
curl -X GET "http://localhost:5100/api/bids/auction/1?page=1&limit=10" \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## 🏪 Seller Endpoints

### 1. Get Seller Auctions
```bash
curl -X GET "http://localhost:5100/api/seller/auctions?page=1&limit=10&status=active" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 2. Get Auction Details with Bids
```bash
curl -X GET http://localhost:5100/api/seller/auctions/1 \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 3. Accept Bid
```bash
curl -X POST http://localhost:5100/api/seller/auctions/1/accept \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 4. Reject Bid
```bash
curl -X POST http://localhost:5100/api/seller/auctions/1/reject \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 5. Make Counter Offer
```bash
curl -X POST http://localhost:5100/api/seller/auctions/1/counter-offer \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1300
  }'
```

### 6. Respond to Counter Offer (Buyer)
```bash
curl -X POST http://localhost:5100/api/seller/auctions/1/counter-offer/respond \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accepted": true
  }'
```

---

## 👨‍💼 Admin Endpoints

### 1. Get System Statistics
```bash
curl -X GET http://localhost:5100/api/admin/stats \
  -H "Authorization: Bearer <your_jwt_token>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalAuctions": 45,
    "activeAuctions": 12,
    "totalBids": 234,
    "totalRevenue": "12500.00",
    "recentActivity": [
      {
        "type": "new_bid",
        "message": "New bid placed on iPhone 15 Pro",
        "timestamp": "2025-08-16T10:30:00.000Z"
      }
    ]
  }
}
```

### 2. Get All Users
```bash
curl -X GET "http://localhost:5100/api/admin/users?page=1&limit=10&role=buyer" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 3. Get User by ID
```bash
curl -X GET http://localhost:5100/api/admin/users/1 \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 4. Update User
```bash
curl -X PUT http://localhost:5100/api/admin/users/1 \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "seller",
    "isActive": true
  }'
```

### 5. Delete User
```bash
curl -X DELETE http://localhost:5100/api/admin/users/1 \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 6. Get All Auctions (Admin)
```bash
curl -X GET "http://localhost:5100/api/admin/auctions?page=1&limit=10&status=active" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 7. Start Auction
```bash
curl -X POST http://localhost:5100/api/admin/auctions/1/start \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 8. End Auction
```bash
curl -X POST http://localhost:5100/api/admin/auctions/1/end \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 9. Reset Auction
```bash
curl -X POST http://localhost:5100/api/admin/auctions/1/reset \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 10. Get System Status
```bash
curl -X GET http://localhost:5100/api/admin/system/status \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## 🔔 Notification Endpoints

### 1. Get Notifications
```bash
curl -X GET "http://localhost:5100/api/notifications?page=1&limit=10&unreadOnly=true" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 2. Mark Notification as Read
```bash
curl -X PUT http://localhost:5100/api/notifications/1/read \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 3. Mark All Notifications as Read
```bash
curl -X PUT http://localhost:5100/api/notifications/read-all \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

## 🌐 WebSocket Endpoints

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:5100/ws?token=YOUR_JWT_TOKEN');

ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Join auction room
ws.send(JSON.stringify({
  type: 'join_auction',
  auctionId: 1
}));

// Leave auction room
ws.send(JSON.stringify({
  type: 'leave_auction',
  auctionId: 1
}));
```

### WebSocket Message Types

1. **Auction Updates**
```json
{
  "type": "auction_update",
  "auctionId": 1,
  "data": {
    "currentPrice": "1250.00",
    "totalBids": 5,
    "timeRemaining": 3600
  }
}
```

2. **New Bid Notification**
```json
{
  "type": "new_bid",
  "auctionId": 1,
  "data": {
    "amount": "1250.00",
    "bidderName": "John Doe",
    "timestamp": "2025-08-16T10:30:00.000Z"
  }
}
```

3. **Outbid Notification**
```json
{
  "type": "outbid",
  "auctionId": 1,
  "data": {
    "newAmount": "1300.00",
    "previousAmount": "1250.00"
  }
}
```

4. **Auction Ended**
```json
{
  "type": "auction_ended",
  "auctionId": 1,
  "data": {
    "winnerId": 1,
    "finalPrice": "1300.00"
  }
}
```

---

## 🧪 Testing Script

Run the comprehensive API testing script:

```bash
cd backend
chmod +x test-api.sh
./test-api.sh
```

This script will test all endpoints and provide detailed results.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Upstash Redis account
- SendGrid account

### 1. Clone Repository
```bash
git clone <repository-url>
cd Tap2Win
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Environment Setup
```bash
cd backend
cp env.example .env
# Edit .env with your credentials
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5100
- WebSocket: ws://localhost:5100/ws

---

## 🐳 Docker Deployment

### Build and Run
```bash
docker build -t tap2win .
docker run -p 5100:5100 tap2win
```

### Environment Variables
Set the following environment variables in your deployment:

```env
# Database
SUPABASE_DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Email
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@tap2win.com

# Server
PORT=5100
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

---

## 📊 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation Error |
| 401 | Unauthorized - Invalid/Missing Token |
| 403 | Forbidden - Insufficient Permissions |
| 404 | Not Found |
| 409 | Conflict - Resource Already Exists |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- SQL injection prevention (Sequelize ORM)

---

## 📈 Performance Features

- Redis caching for fast data access
- WebSocket for real-time updates
- Database connection pooling
- Response compression
- Efficient pagination
- Background job processing

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the deployment guide

---

## 🔄 Changelog

### v1.0.0
- Initial release
- Real-time auction system
- Role-based access control
- WebSocket integration
- Email notifications
- PDF invoice generation
- Admin panel
- Docker deployment
