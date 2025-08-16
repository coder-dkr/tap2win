# 🚀 Tap2Win Deployment Guide

This guide covers deploying the Tap2Win auction platform using Docker and Render.com.

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Supabase Database** - PostgreSQL database setup
2. **Upstash Redis** - Redis instance for caching
3. **SendGrid Account** - Email service for notifications
4. **Render.com Account** - For hosting (free tier available)

## 🐳 Local Docker Build

### Build the Docker Image

```bash
# Build the production image
docker build -t tap2win:latest .

# Run the container locally
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e SUPABASE_DATABASE_URL=your_supabase_url \
  -e REDIS_URL=your_redis_url \
  -e SENDGRID_API_KEY=your_sendgrid_key \
  -e JWT_SECRET=your_jwt_secret \
  tap2win:latest
```

### Test Locally

```bash
# Build and run with docker-compose (for testing)
docker build -t tap2win:latest .
docker run -p 5000:5000 tap2win:latest
```

## 🌐 Render.com Deployment

### 1. Prepare Your Repository

Ensure your repository contains:
- ✅ `Dockerfile` - Multi-stage build for frontend + backend
- ✅ `render.yaml` - Render deployment configuration
- ✅ `.dockerignore` - Optimized build context
- ✅ Environment variables documented

### 2. Connect to Render

1. **Sign up/Login** to [Render.com](https://render.com)
2. **Connect your GitHub repository**
3. **Create a new Web Service**

### 3. Configure Environment Variables

In Render dashboard, set these environment variables:

#### **Required Variables:**
```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app-name.onrender.com
FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_admin_password
```

#### **Supabase Database:**
```bash
SUPABASE_DATABASE_URL=postgresql://username:password@host:port/database
SUPABASE_HOST=your-supabase-host
SUPABASE_PORT=5432
SUPABASE_DATABASE=your-database-name
SUPABASE_USER=your-username
SUPABASE_PASSWORD=your-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### **Redis (Upstash):**
```bash
REDIS_URL=redis://username:password@host:port
```

#### **SendGrid:**
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 4. Deploy Configuration

Use the provided `render.yaml` or configure manually:

- **Build Command:** `docker build -t tap2win .`
- **Start Command:** `docker run -p $PORT:5000 tap2win`
- **Health Check Path:** `/health`
- **Auto-Deploy:** Enabled (on git push)

### 5. Deploy

1. **Push your code** to GitHub
2. **Render will automatically build and deploy**
3. **Monitor the build logs** for any issues
4. **Test the health endpoint:** `https://your-app.onrender.com/health`

## 🔧 Environment Setup

### Supabase Setup

1. **Create a new Supabase project**
2. **Get your connection details** from Settings > Database
3. **Set up the database schema** (Sequelize will auto-sync in development)

### Upstash Redis Setup

1. **Create a new Redis database** on Upstash
2. **Copy the connection URL**
3. **Test the connection** using Redis CLI

### SendGrid Setup

1. **Create a SendGrid account**
2. **Generate an API key**
3. **Verify your sender email**
4. **Test email sending**

## 📊 Monitoring & Health Checks

### Health Check Endpoint

The application provides a health check at `/health`:

```json
{
  "success": true,
  "message": "Tap2Win API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### Logs

Monitor your application logs in Render dashboard:
- **Build logs** - During deployment
- **Runtime logs** - Application execution
- **Error logs** - Any issues or exceptions

## 🔒 Security Considerations

### Environment Variables

- ✅ **Never commit sensitive data** to version control
- ✅ **Use Render secrets** for sensitive environment variables
- ✅ **Rotate JWT secrets** regularly
- ✅ **Use strong passwords** for admin accounts

### SSL/TLS

- ✅ **Render provides automatic SSL** for custom domains
- ✅ **HTTPS is enabled by default**
- ✅ **Secure cookies** are configured

## 🚀 Performance Optimization

### Docker Optimizations

- ✅ **Multi-stage builds** reduce final image size
- ✅ **Alpine Linux** base image for smaller footprint
- ✅ **Production-only dependencies** installed
- ✅ **Static file serving** optimized

### Application Optimizations

- ✅ **Compression middleware** enabled
- ✅ **Rate limiting** configured
- ✅ **Caching headers** set
- ✅ **Database connection pooling**

## 🔄 CI/CD Pipeline

### Automatic Deployment

1. **Push to main branch** triggers deployment
2. **Render builds new Docker image**
3. **Health checks** ensure successful deployment
4. **Zero-downtime** deployments

### Manual Deployment

```bash
# Trigger manual deployment from Render dashboard
# Or use Render CLI (if available)
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies are installed
   - Check build logs for specific errors

2. **Runtime Errors**
   - Verify environment variables are set
   - Check database connectivity
   - Monitor application logs

3. **Health Check Failures**
   - Ensure `/health` endpoint is accessible
   - Check if application is starting correctly
   - Verify port configuration

### Debug Commands

```bash
# Check container logs
docker logs <container_id>

# Access container shell
docker exec -it <container_id> /bin/sh

# Test health endpoint
curl https://your-app.onrender.com/health
```

## 📈 Scaling

### Render Free Tier Limits

- **750 hours/month** of runtime
- **512MB RAM** per instance
- **Shared CPU** resources
- **Automatic sleep** after 15 minutes of inactivity

### Upgrade Options

- **Paid plans** for more resources
- **Custom domains** support
- **Higher memory/CPU** allocation
- **Always-on** instances

## 🎯 Success Metrics

After deployment, verify:

- ✅ **Health endpoint** responds correctly
- ✅ **Frontend loads** without errors
- ✅ **API endpoints** are accessible
- ✅ **Database connections** work
- ✅ **WebSocket connections** establish
- ✅ **Email sending** functions properly
- ✅ **Real-time features** work as expected

## 📞 Support

For deployment issues:

1. **Check Render documentation**
2. **Review application logs**
3. **Verify environment variables**
4. **Test locally with Docker**
5. **Contact support** if needed

---

**🎉 Your Tap2Win auction platform is now deployed and ready for users!**
