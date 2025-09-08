const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `photo-${timestamp}.png`);
  }
});

const upload = multer({ storage });

// Force HTTPS in production (when using ngrok or similar)
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API endpoint to upload photos
app.post('/upload-photo', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }
  
  const photoData = {
    filename: req.file.filename,
    timestamp: new Date().toISOString(),
    size: req.file.size
  };
  
  // Notify admin via WebSocket
  io.emit('new-photo', photoData);
  
  res.json({ success: true, photo: photoData });
});

// API endpoint to get all photos
app.get('/api/photos', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read photos' });
    }
    
    const photos = files
      .filter(file => file.endsWith('.png'))
      .map(file => {
        const stats = fs.statSync(path.join(uploadsDir, file));
        return {
          filename: file,
          timestamp: stats.birthtime.toISOString(),
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(photos);
  });
});

// WebSocket connection handling
const connectedClients = new Map();
const connectedAdmins = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle client (camera) connections
  socket.on('client-ready', () => {
    console.log('Camera client ready:', socket.id);
    connectedClients.set(socket.id, socket);
    
    // Notify all admins that a new camera is available
    connectedAdmins.forEach(adminSocket => {
      adminSocket.emit('camera-available', { clientId: socket.id });
    });
  });
  
  // Handle admin connections
  socket.on('admin-ready', () => {
    console.log('Admin connected:', socket.id);
    connectedAdmins.set(socket.id, socket);
    
    // Send list of available cameras to this admin
    const availableCameras = Array.from(connectedClients.keys());
    socket.emit('available-cameras', availableCameras);
  });
  
  // WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Server: Received offer from', socket.id, 'for target', data.target);
    const targetSocket = connectedAdmins.get(data.target) || connectedClients.get(data.target);
    if (targetSocket) {
      console.log('Server: Forwarding offer to target', data.target);
      targetSocket.emit('offer', {
        offer: data.offer,
        sender: socket.id
      });
    } else {
      console.log('Server: Target socket not found:', data.target);
    }
  });
  
  socket.on('answer', (data) => {
    console.log('Server: Received answer from', socket.id, 'for target', data.target);
    const targetSocket = connectedAdmins.get(data.target) || connectedClients.get(data.target);
    if (targetSocket) {
      console.log('Server: Forwarding answer to target', data.target);
      targetSocket.emit('answer', {
        answer: data.answer,
        sender: socket.id
      });
    } else {
      console.log('Server: Target socket not found for answer:', data.target);
    }
  });
  
  socket.on('ice-candidate', (data) => {
    const targetSocket = connectedAdmins.get(data.target) || connectedClients.get(data.target);
    if (targetSocket) {
      targetSocket.emit('ice-candidate', {
        candidate: data.candidate,
        sender: socket.id
      });
    }
  });
  
  // Handle client stopping camera
  socket.on('client-stopped', () => {
    console.log('Client stopped camera:', socket.id);
    connectedClients.delete(socket.id);
    
    // Notify all admins that camera stopped
    connectedAdmins.forEach(adminSocket => {
      adminSocket.emit('camera-disconnected', { clientId: socket.id });
    });
  });
  
  // Handle camera switch notification
  socket.on('camera-switched', (data) => {
    console.log('Client switched camera:', socket.id, 'to:', data.cameraName);
    
    // Notify all admins about camera switch
    connectedAdmins.forEach(adminSocket => {
      adminSocket.emit('camera-switched', { 
        clientId: socket.id, 
        cameraName: data.cameraName 
      });
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove from both maps
    connectedClients.delete(socket.id);
    connectedAdmins.delete(socket.id);
    
    // Notify admins if a camera disconnected
    connectedAdmins.forEach(adminSocket => {
      adminSocket.emit('camera-disconnected', { clientId: socket.id });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});