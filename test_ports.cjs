const net = require('net');

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 1000;

    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function run() {
  const hosts = ['127.0.0.1', 'localhost', '0.0.0.0'];
  const ports = [54321, 54322, 54323, 8000, 8080];

  for (const host of hosts) {
    for (const port of ports) {
      const isOpen = await checkPort(port, host);
      console.log(`Host: ${host}, Port: ${port} -> ${isOpen ? 'OPEN' : 'CLOSED'}`);
    }
  }
}

run();
