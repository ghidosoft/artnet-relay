# Simple ArtNet relay

This tool listens on localhost for ArtNet packets and forwards all preceived packets to all discovered nodes (excluding the sender).

It's useful to avoid broadcasting over WiFi using tools like Q Light Controller Plus.
With this tool you direct qlc to send only to this relay and it automatically discovers and forwards to every device in the local network.

## Usage
Requires node.js, run with `node index.js` or use `start.cmd` on Windows.

It's configured to discover over `192.168.1.255`, you can change it editing the `index.js` file.

## License
Copyright © 2024 Andrea Ghidini.

[ISC](LICENSE).
