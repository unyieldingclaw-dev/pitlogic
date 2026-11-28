import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { WebSocketServer } = require('ws');
const mqttPacket = require('mqtt-packet');
const { chromium } = require('C:/Users/Mizzo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const port = 18883;
const server = new WebSocketServer({ host: '127.0.0.1', port, path: '/mqtt' });
const result = { date: new Date().toISOString(), broker: 'local mqtt-packet/ws fixture', interruption: 'terminate active WebSocket and reject reconnects for 37 seconds', connections: [], ui: {}, errors: [] };
const sockets = new Set();
let accepting = true;

server.on('connection', socket => {
  const connection = { id: result.connections.length + 1, packets: [], subscriptions: [] };
  result.connections.push(connection);
  if (!accepting) {
    connection.rejected = true;
    socket.terminate();
    return;
  }
  sockets.add(socket);
  const parser = mqttPacket.parser();
  socket.on('message', data => parser.parse(Buffer.from(data)));
  socket.on('close', () => sockets.delete(socket));
  parser.on('packet', packet => {
    connection.packets.push(packet.cmd);
    if (packet.cmd === 'connect') {
      connection.protocolVersion = packet.protocolVersion;
      const reply = packet.protocolVersion === 5
        ? { cmd: 'connack', reasonCode: 0, sessionPresent: false }
        : { cmd: 'connack', returnCode: 0, sessionPresent: false };
      socket.send(mqttPacket.generate(reply));
    } else if (packet.cmd === 'subscribe') {
      connection.subscriptions.push(packet.subscriptions.map(entry => entry.topic));
      socket.send(mqttPacket.generate({ cmd: 'suback', messageId: packet.messageId,
        granted: packet.subscriptions.map(entry => entry.qos) }));
    } else if (packet.cmd === 'pingreq') {
      socket.send(mqttPacket.generate({ cmd: 'pingresp' }));
    }
  });
});

function publish(value) {
  const payload = JSON.stringify({ channels: [{ number: 1, ts: Date.now(), readings: [{ type: 'T', value }] }] });
  const frame = mqttPacket.generate({ cmd: 'publish', topic: '/probes/QA000/events', payload, qos: 0, retain: false });
  for (const socket of sockets) if (socket.readyState === socket.OPEN) socket.send(frame);
}

const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  page.setDefaultTimeout(10000);
  await page.addInitScript(() => localStorage.setItem('pitlogic-mqtt-v1', JSON.stringify({
    brokerUrl: 'ws://127.0.0.1:18883/mqtt', username: 'qa-user', password: 'qa-pass', unit: 'F',
  })));
  await page.goto('http://127.0.0.1:5176/pitlogic/');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('button', { name: 'Connect to MQTT broker' }).click();
  await dialog.getByText('● Connected').waitFor();
  publish(182);
  await dialog.getByText('182.0°F').waitFor();
  result.ui.initial = { brokerStatus: await dialog.locator('[role="status"]').first().innerText(), probe: await dialog.innerText() };

  accepting = false;
  for (const socket of [...sockets]) socket.terminate();
  await page.waitForTimeout(2000);
  result.ui.outage = { brokerStatus: await dialog.locator('[role="status"]').first().innerText(), probe: await dialog.innerText() };
  await page.waitForTimeout(35000);
  result.ui.after37Seconds = { brokerStatus: await dialog.locator('[role="status"]').first().innerText(), probe: await dialog.innerText() };

  accepting = true;
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Connected'), null, { timeout: 10000 });
  const start = Date.now();
  while (!result.connections.some(connection => connection.id > 1 && connection.subscriptions.length > 0)) {
    if (Date.now() - start > 10000) throw new Error('No subscribed recovery connection');
    await page.waitForTimeout(100);
  }
  publish(190);
  await dialog.getByText('190.0°F').waitFor();
  result.ui.recovered = { brokerStatus: await dialog.locator('[role="status"]').first().innerText(), probe: await dialog.innerText() };
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(process.env.QA_OUTPUT ?? new URL('./controlled-broker-qa005.json', import.meta.url), JSON.stringify(result, null, 2));
}
