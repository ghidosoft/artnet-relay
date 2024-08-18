const RELAY_LISTEN_ADDRESS = '127.0.0.1';
const DISCOVERY_ADDRESS = '192.168.1.255';
const DISCOVERY_LISTEN_ADDRESS = undefined;
const PORT = 0x1936;

const DISCOVERY_INTERVAL_MS = 5000;
const DELETE_AFTER_MS = 30000;

import { createSocket } from 'node:dgram';
import process from 'node:process';

/**
 * @type Object.<string, {address: string, port: number, lastSeenAt: number, shortName: string}>
 */
const DESTINATIONS = {};

const discoveryServer = createSocket('udp4');
const relayServer = createSocket('udp4');
const client = createSocket('udp4');

const PACKET_ID = Buffer.from('Art-Net\0', 'ascii');

const log = (value) => console.log(`[INFO] ${new Date().toISOString()}: ${value}`);
const logError = (value) => console.error(`[ ERR] ${new Date().toISOString()} ${value}`);

discoveryServer.on('error', (err) => {
    logError(`Discovery server error:\n${err.stack}`);
    relayServer.close();
    discoveryServer.close();
    process.exit(1);
});
relayServer.on('error', (err) => {
    logError(`Relay server error:\n${err.stack}`);
    relayServer.close();
    discoveryServer.close();
    process.exit(1);
});

relayServer.on('message', (msg, rinfo) => {
    for (const dest of Object.values(DESTINATIONS)) {
        if (dest.address !== rinfo.address) {
            client.send(msg, PORT, dest.address);
        }
    }
});

discoveryServer.on('message', (msg, rinfo) => {
    if (msg.slice(0, 8).equals(PACKET_ID)) {
        const opcode = msg.readUInt16LE(8);
        if (opcode === 0x2100) {
            if (!DESTINATIONS[rinfo.address]) {
                const shortName = msg.slice(26, 26 + 18).toString('ascii').replace(/\0.*$/g, '');
                log(`Discovered device "${shortName}" at ${rinfo.address}:${rinfo.port}`);
                DESTINATIONS[rinfo.address] = {
                    address: rinfo.address,
                    lastSeenAt: Date.now(),
                    port: rinfo.port,
                    shortName,
                }
            } else {
                DESTINATIONS[rinfo.address].lastSeenAt = Date.now();
            }
        }
    }
});

relayServer.on('listening', () => {
    const address = relayServer.address();
    log(`Relay listening on ${address.address}:${address.port}`);
});

discoveryServer.on('listening', () => {
    const address = discoveryServer.address();
    log(`Discovery listening on ${address.address}:${address.port}`);
});

log('Opening sockets...');
discoveryServer.bind(PORT, DISCOVERY_LISTEN_ADDRESS);
relayServer.bind(PORT, RELAY_LISTEN_ADDRESS);

const removeStale = () => {
    const entries = Object.entries(DESTINATIONS);
    for (const [key, value] of entries) {
        if (Date.now() - value.lastSeenAt > DELETE_AFTER_MS) {
            delete DESTINATIONS[key];
            log(`Removed device "${value.shortName}" at ${value.address}:${value.port}`);
        }
    }
};

const discovery = () => {
    const artNetPollPacket = Buffer.alloc(14);
    artNetPollPacket.write('Art-Net\0', 'ascii');
    artNetPollPacket.writeUInt16LE(0x2000, 8);
    artNetPollPacket.writeUInt16LE(14, 10);
    client.send(artNetPollPacket, PORT, DISCOVERY_ADDRESS);
    setTimeout(discovery, DISCOVERY_INTERVAL_MS);
    setTimeout(removeStale, DISCOVERY_INTERVAL_MS / 2);
};

discovery();
