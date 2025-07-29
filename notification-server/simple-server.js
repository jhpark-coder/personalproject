const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'test-websocket.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading HTML file');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(8080, () => {
    console.log('Test server running at http://localhost:8080');
}); 