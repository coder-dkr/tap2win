# Tap2Win API Documentation

## Overview

Tap2Win is a real-time auction platform API built with Node.js, Express, and WebSockets. This documentation provides comprehensive details for all API endpoints with Postman-ready examples.

## Base URL

```
Development: http://localhost:5100
Production: https://your-domain.com
```

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**: Rate limit info is included in response headers

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

---

## 🔐 Authentication Endpoints

### 1. Register User

**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "buyer"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "1",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "buyer",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters",
    "Role must be either 'buyer' or 'seller'"
  ]
}
```

### 2. Login User

**POST** `/api/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "1",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "buyer",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Authentication Error (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 3. Get Current User

**GET** `/api/auth/me`

Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "user": {
      "id": "1",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "buyer",
      "isActive": true,
      "avatar": "https://example.com/avatar.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 4. Update Profile

**PUT** `/api/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "username": "johnsmith",
  "avatar": "https://example.com/new-avatar.jpg",
  "role": "seller"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "1",
      "username": "johnsmith",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "seller",
      "avatar": "https://example.com/new-avatar.jpg",
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

### 5. Change Password

**PUT** `/api/auth/change-password`

Change user password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 🏷️ Auction Endpoints

### 1. Get All Auctions

**GET** `/api/auctions`

Get paginated list of auctions with optional filters.

**Query Parameters:**
```
?page=1&limit=10&status=active&category=electronics&minPrice=100&maxPrice=1000&search=laptop
```

**Response (200):**
```json
{
  "success": true,
  "message": "Auctions retrieved successfully",
  "data": {
    "auctions": [
      {
        "id": "1",
        "title": "MacBook Pro 2023",
        "description": "Excellent condition MacBook Pro",
        "startingPrice": 1500,
        "currentPrice": 1800,
        "bidIncrement": 50,
        "startTime": "2024-01-15T10:00:00.000Z",
        "endTime": "2024-01-20T10:00:00.000Z",
        "status": "active",
        "images": ["https://example.com/macbook1.jpg"],
        "category": "electronics",
        "condition": "like_new",
        "bidCount": 5,
        "seller": {
          "id": "2",
          "username": "seller1",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "createdAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

### 2. Get Auction by ID

**GET** `/api/auctions/:id`

Get detailed information about a specific auction.

**Response (200):**
```json
{
  "success": true,
  "message": "Auction retrieved successfully",
  "data": {
    "auction": {
      "id": "1",
      "title": "MacBook Pro 2023",
      "description": "Excellent condition MacBook Pro with all accessories",
      "startingPrice": 1500,
      "currentPrice": 1800,
      "bidIncrement": 50,
      "startTime": "2024-01-15T10:00:00.000Z",
      "endTime": "2024-01-20T10:00:00.000Z",
      "status": "active",
      "images": [
        "https://example.com/macbook1.jpg",
        "https://example.com/macbook2.jpg"
      ],
      "category": "electronics",
      "condition": "like_new",
      "sellerDecision": "pending",
      "bidCount": 5,
      "seller": {
        "id": "2",
        "username": "seller1",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "highestBid": {
        "id": "10",
        "amount": 1800,
        "bidder": {
          "id": "3",
          "username": "bidder1",
          "firstName": "Mike",
          "lastName": "Johnson"
        },
        "bidTime": "2024-01-16T14:30:00.000Z"
      },
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-16T14:30:00.000Z"
    }
  }
}
```

### 3. Create Auction

**POST** `/api/auctions`

Create a new auction (Seller/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "iPhone 15 Pro Max",
  "description": "Brand new iPhone 15 Pro Max, 256GB, Space Black",
  "startingPrice": 1200,
  "bidIncrement": 25,
  "startTime": "2024-01-20T10:00:00.000Z",
  "endTime": "2024-01-25T10:00:00.000Z",
  "category": "electronics",
  "condition": "new",
  "images": [
    "https://example.com/iphone1.jpg",
    "https://example.com/iphone2.jpg"
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Auction created successfully",
  "data": {
    "auction": {
      "id": "2",
      "title": "iPhone 15 Pro Max",
      "description": "Brand new iPhone 15 Pro Max, 256GB, Space Black",
      "startingPrice": 1200,
      "currentPrice": 1200,
      "bidIncrement": 25,
      "startTime": "2024-01-20T10:00:00.000Z",
      "endTime": "2024-01-25T10:00:00.000Z",
      "status": "pending",
      "images": [
        "https://example.com/iphone1.jpg",
        "https://example.com/iphone2.jpg"
      ],
      "category": "electronics",
      "condition": "new",
      "sellerId": "2",
      "bidCount": 0,
      "createdAt": "2024-01-18T15:00:00.000Z",
      "updatedAt": "2024-01-18T15:00:00.000Z"
    }
  }
}
```

### 4. Update Auction

**PUT** `/api/auctions/:id`

Update an existing auction (Owner/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "iPhone 15 Pro Max - Updated",
  "description": "Updated description",
  "startingPrice": 1300,
  "bidIncrement": 30,
  "endTime": "2024-01-26T10:00:00.000Z",
  "category": "electronics",
  "condition": "new",
  "images": [
    "https://example.com/iphone1.jpg",
    "https://example.com/iphone2.jpg",
    "https://example.com/iphone3.jpg"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Auction updated successfully",
  "data": {
    "auction": {
      "id": "2",
      "title": "iPhone 15 Pro Max - Updated",
      "description": "Updated description",
      "startingPrice": 1300,
      "currentPrice": 1300,
      "bidIncrement": 30,
      "startTime": "2024-01-20T10:00:00.000Z",
      "endTime": "2024-01-26T10:00:00.000Z",
      "status": "pending",
      "images": [
        "https://example.com/iphone1.jpg",
        "https://example.com/iphone2.jpg",
        "https://example.com/iphone3.jpg"
      ],
      "category": "electronics",
      "condition": "new",
      "sellerId": "2",
      "updatedAt": "2024-01-18T16:00:00.000Z"
    }
  }
}
```

### 5. Delete Auction

**DELETE** `/api/auctions/:id`

Delete an auction (Owner/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Auction deleted successfully"
}
```

### 6. Get My Auctions

**GET** `/api/auctions/user/my-auctions`

Get auctions created by the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?page=1&limit=10&status=active
```

**Response (200):**
```json
{
  "success": true,
  "message": "My auctions retrieved successfully",
  "data": {
    "auctions": [
      {
        "id": "1",
        "title": "MacBook Pro 2023",
        "status": "active",
        "currentPrice": 1800,
        "bidCount": 5,
        "endTime": "2024-01-20T10:00:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### 7. Get My Bids

**GET** `/api/auctions/user/my-bids`

Get auctions where the current user has placed bids.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?page=1&limit=10&status=active
```

**Response (200):**
```json
{
  "success": true,
  "message": "My bids retrieved successfully",
  "data": {
    "bids": [
      {
        "id": "10",
        "amount": 1800,
        "isWinning": true,
        "status": "winning",
        "bidTime": "2024-01-16T14:30:00.000Z",
        "auction": {
          "id": "1",
          "title": "MacBook Pro 2023",
          "status": "active",
          "currentPrice": 1800,
          "endTime": "2024-01-20T10:00:00.000Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "pages": 1
    }
  }
}
```

---

## 💰 Bid Endpoints

### 1. Place Bid

**POST** `/api/bids/auctions/:auctionId/bids`

Place a bid on an auction (Buyer/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 1850
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "data": {
    "bid": {
      "id": "11",
      "amount": 1850,
      "isWinning": true,
      "status": "winning",
      "bidTime": "2024-01-16T15:00:00.000Z",
      "auctionId": "1",
      "bidderId": "3",
      "createdAt": "2024-01-16T15:00:00.000Z"
    },
    "auction": {
      "id": "1",
      "currentPrice": 1850,
      "bidCount": 6,
      "highestBidId": "11"
    }
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "message": "Bid validation failed",
  "errors": [
    "Bid amount must be higher than current price",
    "Bid amount must meet minimum increment requirement"
  ]
}
```

### 2. Get Auction Bids

**GET** `/api/bids/auctions/:auctionId/bids`

Get all bids for a specific auction.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
?page=1&limit=10&sortBy=amount&sortOrder=desc
```

**Response (200):**
```json
{
  "success": true,
  "message": "Auction bids retrieved successfully",
  "data": {
    "bids": [
      {
        "id": "11",
        "amount": 1850,
        "isWinning": true,
        "status": "winning",
        "bidTime": "2024-01-16T15:00:00.000Z",
        "bidder": {
          "id": "3",
          "username": "bidder1",
          "firstName": "Mike",
          "lastName": "Johnson"
        }
      },
      {
        "id": "10",
        "amount": 1800,
        "isWinning": false,
        "status": "outbid",
        "bidTime": "2024-01-16T14:30:00.000Z",
        "bidder": {
          "id": "4",
          "username": "bidder2",
          "firstName": "Sarah",
          "lastName": "Wilson"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 6,
      "pages": 1
    }
  }
}
```

### 3. Get Bid by ID

**GET** `/api/bids/bids/:id`

Get detailed information about a specific bid.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bid retrieved successfully",
  "data": {
    "bid": {
      "id": "11",
      "amount": 1850,
      "isWinning": true,
      "status": "winning",
      "bidTime": "2024-01-16T15:00:00.000Z",
      "auctionId": "1",
      "bidderId": "3",
      "bidder": {
        "id": "3",
        "username": "bidder1",
        "firstName": "Mike",
        "lastName": "Johnson"
      },
      "auction": {
        "id": "1",
        "title": "MacBook Pro 2023",
        "status": "active",
        "currentPrice": 1850
      },
      "createdAt": "2024-01-16T15:00:00.000Z",
      "updatedAt": "2024-01-16T15:00:00.000Z"
    }
  }
}
```

### 4. Delete Bid

**DELETE** `/api/bids/bids/:id`

Delete a bid (Owner/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bid deleted successfully"
}
```

---

## 🏪 Seller Decision Endpoints

### 1. Make Seller Decision

**POST** `/api/seller/auctions/:auctionId/decision`

Make a decision on an ended auction (Seller/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "decision": "accept"
}
```

**OR for Counter Offer:**
```json
{
  "decision": "counter_offer",
  "counterOfferAmount": 1900
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Decision made successfully",
  "data": {
    "auction": {
      "id": "1",
      "status": "completed",
      "sellerDecision": "accepted",
      "finalPrice": 1850,
      "winnerId": "3",
      "completedAt": "2024-01-20T10:00:00.000Z"
    },
    "notification": {
      "type": "bid_accepted",
      "title": "Bid Accepted",
      "message": "Your bid of $1850 has been accepted for MacBook Pro 2023"
    }
  }
}
```

### 2. Respond to Counter Offer

**POST** `/api/seller/auctions/:auctionId/counter-offer-response`

Respond to a seller's counter offer (Buyer/Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "response": "accept"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Counter offer response submitted successfully",
  "data": {
    "auction": {
      "id": "1",
      "status": "completed",
      "sellerDecision": "accepted",
      "finalPrice": 1900,
      "winnerId": "3",
      "completedAt": "2024-01-20T11:00:00.000Z"
    },
    "notification": {
      "type": "counter_offer_accepted",
      "title": "Counter Offer Accepted",
      "message": "Counter offer of $1900 has been accepted for MacBook Pro 2023"
    }
  }
}
```

---

## 👨‍💼 Admin Endpoints

### 4.1 Get Admin Statistics
**GET** `/api/admin/stats`

Get comprehensive system statistics for admin dashboard.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalAuctions": 45,
    "activeAuctions": 12,
    "totalBids": 3456,
    "totalRevenue": 125000,
    "completedAuctions": 28,
    "pendingAuctions": 5
  }
}
```

### 4.2 Get All Auctions (Admin)
**GET** `/api/admin/auctions`

Get all auctions with pagination and filtering for admin management.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `status` (optional): Filter by status (pending, active, ended, completed)
- `search` (optional): Search in title and description

**Response:**
```json
{
  "success": true,
  "data": {
    "auctions": [
      {
        "id": "1",
        "title": "MacBook Pro 2023",
        "description": "Brand new MacBook Pro",
        "startingPrice": 1500,
        "currentPrice": 1800,
        "bidIncrement": 50,
        "status": "active",
        "startTime": "2024-01-15T10:00:00Z",
        "endTime": "2024-01-20T10:00:00Z",
        "seller": {
          "id": "1",
          "username": "john_doe",
          "email": "john@example.com"
        },
        "bidCount": 5
      }
    ],
    "total": 45,
    "page": 1,
    "totalPages": 1
  }
}
```

### 4.3 Start Auction
**POST** `/api/admin/auctions/:id/start`

Manually start a pending auction.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Auction started successfully",
  "data": {
    "id": "1",
    "status": "active",
    "startTime": "2024-01-15T10:00:00Z"
  }
}
```

### 4.4 End Auction
**POST** `/api/admin/auctions/:id/end`

Manually end an active auction.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Auction ended successfully",
  "data": {
    "id": "1",
    "status": "ended",
    "endTime": "2024-01-15T10:00:00Z",
    "currentPrice": 1800
  }
}
```

### 4.5 Reset Auction
**POST** `/api/admin/auctions/:id/reset`

Reset an auction by clearing all bids and setting status to pending.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Auction reset successfully",
  "data": {
    "id": "1",
    "status": "pending",
    "currentPrice": null
  }
}
```

### 4.6 Update Auction
**PUT** `/api/admin/auctions/:id`

Update auction details (only for pending auctions).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Updated MacBook Pro 2023",
  "description": "Updated description",
  "startingPrice": 1600,
  "bidIncrement": 75,
  "endTime": "2024-01-25T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Auction updated successfully",
  "data": {
    "id": "1",
    "title": "Updated MacBook Pro 2023"
  }
}
```

### 4.7 Delete Auction
**DELETE** `/api/admin/auctions/:id`

Delete an auction (only for pending auctions).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Auction deleted successfully"
}
```

### 4.8 Get All Users
**GET** `/api/admin/users`

Get all users with pagination and filtering.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `role` (optional): Filter by role (buyer, seller, admin)
- `search` (optional): Search in username and email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "1",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "seller",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1250,
    "page": 1,
    "totalPages": 25
  }
}
```

### 4.9 Get User by ID
**GET** `/api/admin/users/:id`

Get detailed user information including auctions and bids.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "seller",
    "auctions": [
      {
        "id": "1",
        "title": "MacBook Pro 2023",
        "status": "active"
      }
    ],
    "bids": [
      {
        "id": "1",
        "amount": 1800,
        "auctionId": "2"
      }
    ]
  }
}
```

### 4.10 Update User
**PUT** `/api/admin/users/:id`

Update user information.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "role": "buyer",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "1",
    "username": "updated_username",
    "email": "updated@example.com",
    "role": "buyer"
  }
}
```

### 4.11 Delete User
**DELETE** `/api/admin/users/:id`

Delete a user (cannot delete admin users).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### 4.12 Get System Status
**GET** `/api/admin/monitoring`

Get system health status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": "healthy",
    "redis": "connected",
    "websocket": "connected",
    "email": "active",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### 4.13 Get Recent Activity
**GET** `/api/admin/monitoring/activity`

Get recent system activity.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of activities (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "bids": [
      {
        "type": "bid",
        "id": "1",
        "amount": 1800,
        "bidder": "john_doe",
        "auction": "MacBook Pro 2023",
        "timestamp": "2024-01-15T10:00:00Z"
      }
    ],
    "auctions": [
      {
        "type": "auction",
        "id": "1",
        "title": "MacBook Pro 2023",
        "status": "active",
        "seller": "john_doe",
        "timestamp": "2024-01-15T10:00:00Z"
      }
    ],
    "users": [
      {
        "type": "user",
        "user": "1",
        "username": "john_doe",
        "role": "seller",
        "timestamp": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## 🔌 WebSocket Endpoints

### WebSocket Connection

**URL:** `ws://localhost:5100/ws`

**Authentication:**
Send the JWT token as a query parameter:
```
ws://localhost:5100/ws?token=<your-jwt-token>
```

### WebSocket Events

#### 1. Join Auction Room
```json
{
  "type": "joinAuction",
  "auctionId": "1"
}
```

#### 2. Leave Auction Room
```json
{
  "type": "leaveAuction",
  "auctionId": "1"
}
```

#### 3. Auction State Update
```json
{
  "type": "auctionState",
  "auctionId": "1",
  "highestBid": {
    "id": "11",
    "amount": 1850,
    "bidder": {
      "id": "3",
      "username": "bidder1"
    }
  },
  "bidCount": 6,
  "participantCount": 15
}
```

#### 4. New Bid Notification
```json
{
  "type": "newBid",
  "bid": {
    "id": "11",
    "amount": 1850,
    "bidder": {
      "id": "3",
      "username": "bidder1"
    }
  },
  "auction": {
    "id": "1",
    "currentPrice": 1850,
    "bidCount": 6
  }
}
```

#### 5. Outbid Notification
```json
{
  "type": "notification",
  "notificationType": "outbid",
  "title": "You've been outbid!",
  "message": "Someone has placed a higher bid on MacBook Pro 2023",
  "auctionId": "1"
}
```

---

## 📊 Health Check

### Get API Status

**GET** `/health`

**Response (200):**
```json
{
  "success": true,
  "message": "Tap2Win API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

---

## 🚨 Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation Error |
| 401 | Unauthorized - Authentication Required |
| 403 | Forbidden - Insufficient Permissions |
| 404 | Not Found |
| 409 | Conflict - Resource Already Exists |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 📝 Postman Collection

You can import this collection into Postman for easy testing:

```json
{
  "info": {
    "name": "Tap2Win API",
    "description": "Complete API collection for Tap2Win auction platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5100",
      "type": "string"
    },
    {
      "key": "token",
      "value": "",
      "type": "string"
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\",\n  \"firstName\": \"Test\",\n  \"lastName\": \"User\",\n  \"role\": \"buyer\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"password123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/api/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## 🔧 Environment Setup

### Required Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database (Supabase)
SUPABASE_DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_HOST=your-supabase-host
SUPABASE_PORT=5432
SUPABASE_DATABASE=your-database-name
SUPABASE_USER=your-username
SUPABASE_PASSWORD=your-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Redis (Upstash)
REDIS_URL=redis://username:password@host:port

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Set up Environment Variables:**
   Copy `.env.example` to `.env` and fill in your values

3. **Start the Server:**
   ```bash
   npm start
   ```

4. **Test the API:**
   Use the Postman collection or curl commands to test endpoints

---

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [WebSocket Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [JWT Documentation](https://jwt.io/)

---

*Last updated: January 2024*
