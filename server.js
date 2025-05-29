const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript'
};

// Store active SSE connections
let sseClients = [];

const server = http.createServer((req, res) => {
    // Handle Server-Sent Events for auto-refresh
    if (req.url === '/sse-reload') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        sseClients.push(res);
        
        // Remove client on disconnect
        req.on('close', () => {
            sseClients = sseClients.filter(client => client !== res);
        });
        
        return;
    }
    
    let filePath = req.url;
    
    // Default to index.html for directories
    if (filePath === '/' || filePath.endsWith('/')) {
        filePath = filePath + 'index.html';
    }
    
    // Security: prevent directory traversal
    filePath = filePath.replace(/\.\./g, '');
    
    // Construct full path
    filePath = path.join(__dirname, filePath);
    
    console.log(`Request for: ${req.url} -> ${filePath}`);
    
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            console.error(`Error reading file: ${err.message}`);
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + err.message);
            }
        } else {
            // Inject auto-reload script into HTML files
            if (extname === '.html') {
                const reloadScript = `
<script>
(function() {
    const evtSource = new EventSource('/sse-reload');
    evtSource.onmessage = function(e) {
        if (e.data === 'reload') {
            console.log('Reloading due to file change...');
            location.reload();
        }
    };
    evtSource.onerror = function() {
        console.log('Lost connection to dev server');
        setTimeout(() => location.reload(), 1000);
    };
})();
</script>
</body>`;
                content = content.toString().replace('</body>', reloadScript);
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// Set up file watching
function watchFiles() {
    const watchPaths = [
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'games')
    ];
    
    watchPaths.forEach(watchPath => {
        fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename && !filename.includes('.git')) {
                console.log(`File changed: ${filename}`);
                
                // Notify all connected clients to reload
                sseClients.forEach(client => {
                    client.write('data: reload\n\n');
                });
            }
        });
    });
}

server.listen(PORT, () => {
    console.log(`Game server running at http://localhost:${PORT}`);
    console.log('Available games:');
    console.log(`  - Pong: http://localhost:${PORT}/games/pong/`);
    console.log(`  - Space Bullet Hell: http://localhost:${PORT}/games/space-bullet-hell/`);
    console.log('\n✨ Auto-refresh enabled! Files will reload on changes.');
    console.log('Press Ctrl+C to stop the server\n');
    
    // Start watching files
    watchFiles();
});