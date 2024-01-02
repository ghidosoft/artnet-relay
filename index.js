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

const PACKET_ID = Buffer.from('Art-Net\0', 'ascii');

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

relayServer.on('message', (msg, rinfo) => {
    for (const dest of DESTINATIONS) {
        if (dest !== rinfo.address && rinfo.address !== '127.0.0.1') {
            client.send(msg, PORT, dest);
        }
    }
});

discoveryServer.on('message', (msg, rinfo) => {
    if (msg.slice(0, 8).equals(PACKET_ID)) {
        const opcode = msg.readUInt16LE(8);
        if (opcode === 0x2100) {
            if (!DESTINATIONS.has(rinfo.address)) {
                const shortName = msg.slice(26, 26 + 18).toString('ascii').replace(/\0.*$/g, '');
                console.log(`Discovered device "${shortName}" at ${rinfo.address}:${rinfo.port}`);
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
    artNetPollPacket.write('Art-Net\0', 'ascii');
    artNetPollPacket.writeUInt16LE(0x2000, 8);
    artNetPollPacket.writeUInt16LE(14, 10);
    client.send(artNetPollPacket, PORT, DISCOVERY_ADDRESS);
    setTimeout(discovery, 10000);
};

discovery();
