# 📸 Live Camera Streaming & Recording Web App

A real-time camera streaming web application with live admin monitoring, photo capture, and multi-camera support. Built with WebRTC for low-latency peer-to-peer video streaming.

## ✨ Features

### 🎥 Live Camera Streaming
- **Real-time WebRTC streaming** from client to admin panel
- **Multi-camera support** with seamless switching (front/back cameras)
- **Low-latency peer-to-peer** video transmission
- **Auto-reconnection** and connection state monitoring

### 📷 Photo Capture & Storage
- **One-click photo capture** from live camera feed
- **Automatic server storage** with timestamps
- **Real-time photo gallery** in admin panel
- **Instant notifications** for new photos

### 🖥️ Admin Dashboard
- **Live camera streams** from multiple clients simultaneously
- **Real-time statistics** (total photos, file sizes, last activity)
- **Connection monitoring** with status indicators (CONNECTING/LIVE)
- **Camera switch notifications** and client management

### 🔧 Technical Features
- **HTTPS/WebRTC ready** (works with ngrok tunneling)
- **WebSocket signaling** for real-time communication
- **Responsive design** for desktop and mobile
- **Cross-browser compatibility** (Chrome, Firefox, Safari)

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Modern browser with camera support
- HTTPS connection (use ngrok for development)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd camera-recording-app
bun install
```

2. **Start the server:**
```bash
bun dev
```

3. **Set up HTTPS tunnel (required for camera access):**
```bash
# Install ngrok if you haven't already
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Create HTTPS tunnel
ngrok http 3000
```

4. **Access the application:**
   - **Client (Camera)**: `https://your-ngrok-url.ngrok.io`
   - **Admin Panel**: `https://your-ngrok-url.ngrok.io/admin`

⚠️ **Important**: Both client and admin must use the same HTTPS URL for WebRTC to work properly.

## 📱 Usage Guide

### For Camera Users (Client Side)
1. **Start Camera**: Click "Start Recording" and allow camera permissions
2. **Switch Cameras**: Use dropdown to select different cameras (front/back)
3. **Take Photos**: Click "Take Photo" to capture and save images
4. **Live Streaming**: Your camera feed automatically streams to admin panel

### For Administrators (Admin Panel)
1. **Monitor Live Streams**: View real-time camera feeds from all connected clients
2. **Track Statistics**: See total photos, file sizes, and activity timestamps
3. **Manage Connections**: Monitor connection status and retry failed connections
4. **View Photo Gallery**: Browse all captured photos with timestamps and metadata

## 🏗️ Project Architecture

```
├── server.js              # Express + Socket.IO server with WebRTC signaling
├── package.json           # Dependencies and npm scripts
├── public/
│   ├── index.html         # Client camera interface with WebRTC
│   └── admin.html         # Admin dashboard with live monitoring
└── uploads/               # Photo storage directory (auto-created)
```

## 🔌 API Reference

### HTTP Endpoints
- `GET /` - Client camera interface
- `GET /admin` - Admin monitoring dashboard
- `POST /upload-photo` - Upload captured photos (multipart/form-data)
- `GET /api/photos` - Retrieve all photos metadata (JSON)
- `GET /uploads/:filename` - Serve stored photo files

### WebSocket Events

#### Client → Server
- `client-ready` - Camera is ready for streaming
- `client-stopped` - Camera has been stopped
- `camera-switched` - User switched to different camera
- `offer/answer/ice-candidate` - WebRTC signaling

#### Server → Admin
- `camera-available` - New camera client connected
- `camera-disconnected` - Camera client disconnected
- `camera-switched` - Client switched cameras
- `new-photo` - New photo was captured

## 🛠️ Development

### Development Mode
```bash
bun run dev  # Auto-restart on file changes
```

### Environment Variables
```bash
NODE_ENV=production  # Enables HTTPS redirect for production
PORT=3000           # Server port (default: 3000)
```

### WebRTC Configuration
The app uses Google's STUN servers for NAT traversal:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`

For production, consider adding TURN servers for better connectivity.

## 🌐 Browser Support

### Minimum Requirements
- **Chrome 56+** (recommended)
- **Firefox 52+**
- **Safari 11+**
- **Edge 79+**

### Required Permissions
- Camera access
- Microphone access (optional)
- JavaScript enabled

### HTTPS Requirement
Modern browsers require HTTPS for camera access. Use ngrok for development or deploy with SSL certificates.

## 🔧 Troubleshooting

### Common Issues

**"Camera access denied"**
- Ensure you're using HTTPS (not HTTP)
- Check browser permissions for camera access
- Try refreshing and allowing permissions again

**"No stream in admin panel"**
- Verify both client and admin use the same HTTPS URL
- Check browser console for WebRTC connection errors
- Try the "Retry" button in admin panel

**"Connection timeout"**
- Check network connectivity
- Verify WebSocket connection is established
- Ensure no firewall blocking WebRTC traffic

### Debug Mode
Open browser console (F12) to see detailed WebRTC connection logs and troubleshooting information.

## 🚀 Deployment

### Production Deployment
1. Set `NODE_ENV=production`
2. Use proper SSL certificates (Let's Encrypt recommended)
3. Configure reverse proxy (nginx/Apache) if needed
4. Consider adding TURN servers for better WebRTC connectivity

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["bun", "start"]
```

## 📄 License

MIT License - feel free to use this project for your own applications!

## 🤝 Contributing

Contributions welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.