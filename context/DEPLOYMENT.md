# 🚀 Nutrina Deployment Guide

This guide will help you deploy the Nutrina voice-powered diet tracking assistant.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js 18+** installed
- **MongoDB** running (local or cloud)
- **API Keys** for Google Gemini and ElevenLabs
- **Git** for version control

## 🔑 API Keys Setup

### 1. Google Gemini AI
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. ElevenLabs
1. Sign up at [ElevenLabs](https://elevenlabs.io/)
2. Go to your profile settings
3. Copy your API key
4. Note the default voice ID: `21m00Tcm4TlvDq8ikWAM`

## 🏗️ Local Development Setup

### Step 1: Clone and Install
```bash
git clone <your-repo-url>
cd nutrina
npm install
```

### Step 2: Environment Configuration
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/nutrina

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# WebSocket Configuration
WS_PORT=3001

# Security
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### Step 3: Start MongoDB
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

### Step 4: Run the Application
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### Step 5: Test the Application
1. Open `http://localhost:3000` in your browser
2. Click "Connect" to start a WebSocket session
3. Grant microphone permissions
4. Hold the microphone button and speak
5. Test with: "I had eggs and toast for breakfast"

## ☁️ Production Deployment

### Option 1: GCP Compute Engine

#### 1. Create GCP Instance
```bash
gcloud compute instances create nutrina-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --tags=http-server,https-server
```

#### 2. Configure Firewall
```bash
gcloud compute firewall-rules create allow-nutrina \
  --allow tcp:3000,tcp:3001 \
  --target-tags=http-server \
  --description="Allow Nutrina traffic"
```

#### 3. Deploy Application
```bash
# Copy files to instance
gcloud compute scp --recurse . nutrina-server:~/nutrina

# SSH into instance
gcloud compute ssh nutrina-server

# Install Node.js and dependencies
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

cd nutrina
npm install --production
```

#### 4. Configure Environment
```bash
# Create .env file
cp env.example .env
nano .env  # Add your API keys
```

#### 5. Start Application
```bash
# Build and start
npm run build
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start dist/server.js --name nutrina
pm2 startup
pm2 save
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000 3001

CMD ["npm", "start"]
```

#### 2. Build and Run
```bash
docker build -t nutrina .
docker run -p 3000:3000 -p 3001:3001 --env-file .env nutrina
```

### Option 3: Heroku Deployment

#### 1. Create Heroku App
```bash
heroku create your-nutrina-app
```

#### 2. Set Environment Variables
```bash
heroku config:set GEMINI_API_KEY=your_key
heroku config:set ELEVENLABS_API_KEY=your_key
heroku config:set MONGODB_URI=your_mongodb_uri
```

#### 3. Deploy
```bash
git push heroku main
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP server port | `3000` | No |
| `WS_PORT` | WebSocket server port | `3001` | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | - | Yes |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | - | Yes |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID | `21m00Tcm4TlvDq8ikWAM` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `CORS_ORIGIN` | CORS allowed origin | `http://localhost:3000` | No |
| `JWT_SECRET` | JWT secret for auth | - | No |
| `LOG_LEVEL` | Logging level | `info` | No |

### MongoDB Configuration

#### Local MongoDB
```bash
# Install MongoDB
sudo apt-get install mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}
```

### 2. WebSocket Stats
```bash
curl http://localhost:3000/api/stats
# Expected: {"connectedClients":0,"activeSessions":0,"sessions":[]}
```

### 3. Frontend Test
1. Open `http://localhost:3000`
2. Check browser console for errors
3. Test WebSocket connection
4. Test microphone access
5. Test voice conversation

### 4. Log Monitoring
```bash
# View application logs
tail -f logs/app.log

# Or with PM2
pm2 logs nutrina
```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] **HTTPS/SSL**: Configure SSL certificates
- [ ] **Environment Variables**: Never commit API keys
- [ ] **Firewall**: Configure proper firewall rules
- [ ] **Rate Limiting**: Implement API rate limiting
- [ ] **CORS**: Configure CORS for your domain
- [ ] **Database Security**: Use MongoDB authentication
- [ ] **Logging**: Configure proper logging levels

### SSL Configuration (Nginx)
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed
- Check if WebSocket server is running on correct port
- Verify firewall allows WebSocket connections
- Check browser console for connection errors

#### 2. Microphone Access Denied
- Ensure HTTPS is used in production (required for microphone)
- Check browser permissions
- Test in incognito mode

#### 3. AI Processing Errors
- Verify API keys are correct
- Check API quotas and limits
- Review server logs for detailed errors

#### 4. Database Connection Issues
- Verify MongoDB is running
- Check connection string format
- Ensure network connectivity

### Debug Commands
```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Check Node.js processes
ps aux | grep node

# Check MongoDB status
sudo systemctl status mongodb

# View real-time logs
tail -f logs/app.log
```

## 📊 Monitoring

### Health Monitoring
- Set up health check endpoints
- Monitor WebSocket connections
- Track API response times
- Monitor database performance

### Log Analysis
```bash
# Count errors in logs
grep -c "ERROR" logs/app.log

# Monitor WebSocket connections
grep "WebSocket" logs/app.log | tail -10

# Check API usage
grep "API" logs/app.log | wc -l
```

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring** (e.g., PM2, New Relic, DataDog)
2. **Configure backups** for MongoDB
3. **Set up CI/CD** pipeline
4. **Implement user authentication**
5. **Add nutritional database integration**
6. **Create mobile app**

---

**Need help?** Check the main README.md or create an issue in the repository. 