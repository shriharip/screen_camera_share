# 🚀 Deployment Guide

This guide covers different deployment options for the Live Camera Streaming App.

## 📦 Docker Deployment

### Quick Start with Docker

1. **Build and run with Docker:**
```bash
# Build the image
docker build -t camera-streaming-app .

# Run the container
docker run -d \
  --name camera-app \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  camera-streaming-app
```

2. **Access the application:**
   - App: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`

### Production Deployment with Docker Compose

1. **Basic deployment:**
```bash
# Start the application
docker-compose up -d

# View logs
docker-compose logs -f camera-app

# Stop the application
docker-compose down
```

2. **With SSL/HTTPS (recommended):**
```bash
# Create SSL directory and add your certificates
mkdir ssl
# Copy your cert.pem and key.pem to ./ssl/

# Start with nginx reverse proxy
docker-compose --profile with-nginx up -d
```

### Environment Configuration

1. **Copy environment template:**
```bash
cp .env.example .env
```

2. **Edit configuration:**
```bash
# Edit .env file with your settings
nano .env
```

## 🌐 Cloud Deployment

### AWS ECS Deployment

1. **Build and push to ECR:**
```bash
# Create ECR repository
aws ecr create-repository --repository-name camera-streaming-app

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t camera-streaming-app .
docker tag camera-streaming-app:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/camera-streaming-app:latest

# Push to ECR
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/camera-streaming-app:latest
```

2. **Create ECS task definition:**
```json
{
  "family": "camera-streaming-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<account-id>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "camera-app",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/camera-streaming-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/camera-streaming-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Google Cloud Run Deployment

1. **Build and deploy:**
```bash
# Set project ID
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy camera-streaming-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars NODE_ENV=production
```

### Heroku Deployment

1. **Create Heroku app:**
```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-camera-app

# Set environment variables
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

2. **Add Heroku Postgres (optional for user management):**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

## 🔧 Production Configuration

### SSL/HTTPS Setup

**Option 1: Let's Encrypt with Certbot**
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Option 2: Cloudflare SSL**
- Set up Cloudflare for your domain
- Enable "Full (strict)" SSL mode
- Use Cloudflare's origin certificates

### Performance Optimization

1. **Enable gzip compression:**
```javascript
// Add to server.js
const compression = require('compression');
app.use(compression());
```

2. **Add Redis for session storage (optional):**
```bash
# Install Redis
npm install redis connect-redis express-session

# Configure in server.js
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const client = redis.createClient();

app.use(session({
  store: new RedisStore({ client: client }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

### Monitoring and Logging

1. **Add health check endpoint:**
```javascript
// Already included in healthcheck.js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

2. **Add structured logging:**
```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set secure headers (already in nginx.conf)
- [ ] Implement rate limiting
- [ ] Add authentication for admin panel
- [ ] Validate file uploads
- [ ] Set up CORS properly
- [ ] Use environment variables for secrets
- [ ] Regular security updates

### Rate Limiting Example

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 uploads per windowMs
  message: 'Too many uploads, please try again later.'
});

app.post('/upload-photo', uploadLimiter, upload.single('photo'), (req, res) => {
  // ... existing upload logic
});
```

## 📊 Scaling Considerations

### Horizontal Scaling

1. **Load Balancer Configuration:**
   - Use sticky sessions for WebSocket connections
   - Configure health checks
   - Set up auto-scaling groups

2. **WebRTC Scaling:**
   - Consider using a TURN server for better connectivity
   - Implement connection pooling
   - Add WebRTC gateway for large deployments

### Database Integration (Optional)

For user management and photo metadata:

```bash
npm install pg sequelize
```

```javascript
// Example Sequelize model
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL);

const Photo = sequelize.define('Photo', {
  filename: DataTypes.STRING,
  clientId: DataTypes.STRING,
  timestamp: DataTypes.DATE,
  size: DataTypes.INTEGER
});
```

## 🚨 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker logs camera-app

# Check if port is available
netstat -tulpn | grep :3000
```

**WebRTC not working:**
- Ensure HTTPS is properly configured
- Check firewall settings for UDP traffic
- Verify STUN/TURN server accessibility

**High memory usage:**
```bash
# Monitor container resources
docker stats camera-app

# Adjust memory limits in docker-compose.yml
```

### Performance Monitoring

```bash
# Monitor application performance
docker exec -it camera-app npm install -g clinic
docker exec -it camera-app clinic doctor -- node server.js
```

## 📞 Support

For deployment issues:
1. Check the application logs
2. Verify environment variables
3. Test WebRTC connectivity
4. Review security group/firewall settings

Remember to always test your deployment in a staging environment before going to production!