const DESTINATIONS = [
    '192.168.1.69',
    '192.168.1.70',
];

const PORT = 0x1936;
const ADDRESS = '127.0.0.1';

import { createSocket } from 'node:dgram';

const server = createSocket('udp4');
var client = createSocket('udp4');

server.on('error', (err) => {
    console.error(`Server error:\n${err.stack}`);
    server.close();
});

server.on('message', (msg) => {
    for (const dest of DESTINATIONS) {
        client.send(msg, PORT, dest);
    }
});

server.on('listening', () => {
const address = server.address();
    console.log(`Server listening ${address.address}:${address.port}`);
});

console.log(`ArtNet relay server to: ${DESTINATIONS.join(' ')}`)

server.bind(PORT, ADDRESS);
