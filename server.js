const WebSocket = require('ws');
const http = require('http');

// Створення HTTP-сервера
const httpServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url.startsWith('/disconnect')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`);
        const clientId = urlParams.searchParams.get('id');

        if (clientId) {
            const clientToDisconnect = Array.from(clients).find(client => client.id === clientId);
            if (clientToDisconnect) {
                clientToDisconnect.ws.close();
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(`Користувач з ID ${clientId} відключений`);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Користувача не знайдено');
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Параметр "id" обов’язковий');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Маршрут не знайдено');
    }
});

// Створення WebSocket-сервера
const wss = new WebSocket.Server({ server: httpServer });
const clients = new Set();

wss.on('connection', (ws, req) => {
    const clientId = `user-${Date.now()}`; // Унікальний ID для клієнта
    clients.add({ ws, id: clientId });
    console.log(`Користувач приєднався з ID: ${clientId}`);

    // Надсилання ідентифікатора клієнту
    ws.send(JSON.stringify({ type: 'welcome', id: clientId }));

    // Обробка повідомлень
    ws.on('message', (message) => {
        console.log(`Повідомлення від ${clientId}:`, message);
        broadcast(`${clientId}: ${message}`);
    });

    // Відключення
    ws.on('close', () => {
        clients.forEach(client => {
            if (client.ws === ws) clients.delete(client);
        });
        console.log(`Користувач з ID ${clientId} відключився`);
        broadcast(`Користувач ${clientId} залишив чат`);
    });
});

// Надсилання повідомлення всім клієнтам
function broadcast(message) {
    clients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({ type: 'message', data: message }));
        }
    });
}

// Запуск сервера
httpServer.listen(3000, () => {
    console.log('Сервер працює на http://localhost:3000');
});