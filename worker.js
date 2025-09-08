// Cloudflare Worker for Camera Streaming App
import { WebSocketHandler } from './websocket-handler.js';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Handle WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') {
            return handleWebSocket(request, env);
        }

        // Serve static files
        if (url.pathname === '/' || url.pathname === '/index.html') {
            return new Response(await getIndexHTML(), {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        if (url.pathname === '/admin' || url.pathname === '/admin.html') {
            return new Response(await getAdminHTML(), {
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // Handle photo upload
        if (url.pathname === '/upload-photo' && request.method === 'POST') {
            return handlePhotoUpload(request, env);
        }

        // Handle API endpoints
        if (url.pathname === '/api/photos') {
            return handleGetPhotos(env);
        }

        // Serve uploaded files
        if (url.pathname.startsWith('/uploads/')) {
            return handleFileServe(url.pathname, env);
        }

        return new Response('Not Found', { status: 404 });
    }
};

async function handleWebSocket(request, env) {
    const id = env.WEBSOCKET_HANDLER.newUniqueId();
    const stub = env.WEBSOCKET_HANDLER.get(id);
    return stub.fetch(request);
}

async function handlePhotoUpload(request, env) {
    try {
        const formData = await request.formData();
        const file = formData.get('photo');

        if (!file) {
            return Response.json({ error: 'No photo uploaded' }, { status: 400 });
        }

        const filename = `photo-${Date.now()}.png`;

        // Store in R2
        await env.CAMERA_STORAGE.put(filename, file.stream(), {
            httpMetadata: {
                contentType: 'image/png'
            }
        });

        const photoData = {
            filename,
            timestamp: new Date().toISOString(),
            size: file.size
        };

        // Store metadata in KV
        await env.CAMERA_KV.put(`photo:${filename}`, JSON.stringify(photoData));

        return Response.json({ success: true, photo: photoData });
    } catch (error) {
        return Response.json({ error: 'Upload failed' }, { status: 500 });
    }
}

async function handleGetPhotos(env) {
    try {
        const { keys } = await env.CAMERA_KV.list({ prefix: 'photo:' });
        const photos = [];

        for (const key of keys) {
            const data = await env.CAMERA_KV.get(key.name);
            if (data) {
                photos.push(JSON.parse(data));
            }
        }

        photos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return Response.json(photos);
    } catch (error) {
        return Response.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }
}

async function handleFileServe(pathname, env) {
    const filename = pathname.replace('/uploads/', '');
    const object = await env.CAMERA_STORAGE.get(filename);

    if (!object) {
        return new Response('File not found', { status: 404 });
    }

    return new Response(object.body, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000'
        }
    });
}

// Import your HTML files as strings (you'll need to modify these)
async function getIndexHTML() {
    // You'll need to inline your HTML or fetch from a CDN
    return `<!DOCTYPE html>
<html>
<head>
    <title>Camera Streaming App</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
</head>
<body>
    <h1>Camera Streaming App</h1>
    <p>This is a simplified version for Cloudflare Workers</p>
    <p>For full functionality, please use the Docker deployment or other Node.js hosting platforms.</p>
</body>
</html>`;
}

async function getAdminHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Admin Panel</title>
</head>
<body>
    <h1>Admin Panel</h1>
    <p>WebRTC streaming requires a full Node.js server environment.</p>
</body>
</html>`;
}