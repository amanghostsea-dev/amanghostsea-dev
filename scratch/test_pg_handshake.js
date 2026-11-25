const tls = require('tls');
const net = require('net');

const host = 'db.prisma.io';
const port = 5432;

// Standard Postgres SSLRequest packet: length 8, code 80877103
const sslRequest = Buffer.alloc(8);
sslRequest.writeInt32BE(8, 0);
sslRequest.writeInt32BE(80877103, 4);

const socket = net.connect({ host, port }, () => {
  console.log('Connected to db.prisma.io:5432');
  socket.write(sslRequest);
});

socket.once('data', (data) => {
  console.log('Server response to SSLRequest:', data.toString('utf8'), data);
  if (data[0] === 83) { // 'S' means SSL is supported
    console.log('SSL supported, upgrading socket to TLS...');
    const tlsSocket = tls.connect({
      socket: socket,
      servername: host,
      rejectUnauthorized: false
    }, () => {
      console.log('TLS handshake completed!');
      
      // Send StartupMessage for new DB:
      // user: f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443
      // database: postgres
      const user = 'f1cc277514c298a72feac2c71483f5c570e9d5b98550da6f46b106ebdcca5443';
      const db = 'postgres';
      const params = Buffer.concat([
        Buffer.from('user\0' + user + '\0database\0' + db + '\0\0')
      ]);
      const startup = Buffer.alloc(4 + 4 + params.length);
      startup.writeInt32BE(startup.length, 0);
      startup.writeInt32BE(196608, 4); // protocol version 3.0
      params.copy(startup, 8);

      tlsSocket.write(startup);
    });

    tlsSocket.on('data', (d) => {
      console.log('Postgres response (New DB):', d[0], String.fromCharCode(d[0]), d.toString('utf8'));
    });

    tlsSocket.on('error', (e) => console.error('TLS socket error:', e));
  }
});

socket.on('error', (e) => console.error('Socket error:', e));
