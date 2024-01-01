const DESTINATIONS = new Set();

const PORT = 0x1936;
const RELAY_LISTEN_ADDRESS = '127.0.0.1';
const DISCOVERY_LISTEN_ADDRESS = undefined;
const DISCOVERY_ADDRESS = '192.168.1.255';

import { createSocket } from 'node:dgram';
import process from 'node:process';

const discoveryServer = createSocket('udp4');
const relayServer = createSocket('udp4');
var client = createSocket('udp4');

const packetId = Buffer.alloc(8);
packetId.write("Art-Net\0", 'utf8');

discoveryServer.on('error', (err) => {
    console.error(`Discovery server error:\n${err.stack}`);
    relayServer.close();
    discoveryServer.close();
    process.exit(1);
});
relayServer.on('error', (err) => {
    console.error(`Relay server error:\n${err.stack}`);
    relayServer.close();
    discoveryServer.close();
    process.exit(1);
});

relayServer.on('message', (msg) => {
    for (const dest of DESTINATIONS) {
        client.send(msg, PORT, dest);
    }
});

discoveryServer.on('message', (msg, rinfo) => {
    if (msg.slice(0, 8).equals(packetId)) {
        const opcode = msg.readUInt16LE(8);
        if (opcode === 0x2100) {
            if (!DESTINATIONS.has(rinfo.address)) {
                console.log(`Adding ${rinfo.address} device`);
                DESTINATIONS.add(rinfo.address);
            }
        }
    }
});

relayServer.on('listening', () => {
    const address = relayServer.address();
    console.log(`Relay listening on ${address.address}:${address.port}`);
});

discoveryServer.on('listening', () => {
    const address = discoveryServer.address();
    console.log(`Discovery listening on ${address.address}:${address.port}`);
});

console.log('Opening sockets...');
discoveryServer.bind(PORT, DISCOVERY_LISTEN_ADDRESS);
relayServer.bind(PORT, RELAY_LISTEN_ADDRESS);

const discovery = () => {
    const artNetPollPacket = Buffer.alloc(14);
    artNetPollPacket.write("Art-Net\0", 'utf8');
    artNetPollPacket.writeUInt16LE(0x2000, 8);
    artNetPollPacket.writeUInt16LE(14, 10);
    client.send(artNetPollPacket, PORT, DISCOVERY_ADDRESS);
    setTimeout(discovery, 10000);
};

discovery();
