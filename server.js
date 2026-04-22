const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3456;
const DATA_FILE = path.join(__dirname, 'data', 'messages.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readMessages() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeMessages(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
}

app.get('/api/messages', (req, res) => {
  res.json(readMessages());
});

app.post('/api/messages', (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message required' });

  const messages = readMessages();
  const entry = {
    id: Date.now().toString(),
    name: name.trim(),
    message: message.trim(),
    timestamp: new Date().toISOString(),
    // Random position + rotation for card layout
    x: 10 + Math.random() * 60,
    y: 10 + Math.random() * 70,
    rotate: -6 + Math.random() * 12,
    color: ['#1a1aff', '#cc0000', '#006600', '#8800cc', '#cc6600'][messages.length % 5]
  };

  messages.push(entry);
  writeMessages(messages);
  res.json(entry);
});

app.delete('/api/messages/:id', (req, res) => {
  const messages = readMessages().filter(m => m.id !== req.params.id);
  writeMessages(messages);
  res.json({ ok: true });
});

// Amr's private route — serve same index but with a flag
app.get('/for-amr', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'amr.html'));
});

app.listen(PORT, () => {
  console.log(`\n✦ Highlo Wedding Card running at http://localhost:${PORT}`);
  console.log(`✦ Team writing view:  http://localhost:${PORT}`);
  console.log(`✦ Amr's private view: http://localhost:${PORT}/for-amr\n`);
});
