const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const MESSAGES_KEY = 'wedding-card-messages';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function redisCommand(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args)
  });
  return res.json();
}

async function redisGet(key) {
  const data = await redisCommand('GET', key);
  return data.result ? JSON.parse(data.result) : [];
}

async function redisSet(key, value) {
  await redisCommand('SET', key, JSON.stringify(value));
}

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await redisGet(MESSAGES_KEY);
    res.json(messages);
  } catch (e) {
    console.error(e);
    res.json([]);
  }
});

// Estimate rendered bubble height from message text length.
// Based on Caveat 17px, ~22 chars/line, 26px line height, plus name + padding.
function estimateBubbleHeight(text) {
  const lines = Math.ceil(text.length / 22);
  return 20 + lines * 26 + 28; // name(20) + text + padding(28)
}

app.post('/api/messages', async (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message required' });

  try {
    const messages = await redisGet(MESSAGES_KEY);
    const GAP = 28; // minimum px gap between messages in same column

    // Track the bottom edge of each column based on existing messages
    const colBottom = [20, 48]; // left col starts higher, right col offset
    messages.forEach((m, i) => {
      const c = i % 2;
      colBottom[c] = m.y + estimateBubbleHeight(m.message) + GAP;
    });

    const col = messages.length % 2;
    const entry = {
      id: Date.now().toString(),
      name: name.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      x: col === 0 ? 4 + Math.random() * 5 : 52 + Math.random() * 5,
      y: colBottom[col],
      rotate: -4 + Math.random() * 8,
      color: ['#1a1aff','#cc0000','#006600','#8800cc','#cc6600'][messages.length % 5]
    };
    messages.push(entry);
    await redisSet(MESSAGES_KEY, messages);
    res.json(entry);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

app.get('/for-amr', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'amr.html'));
});

app.listen(PORT, () => {
  console.log(`\n✦ Highlo Wedding Card running on port ${PORT}`);
  console.log(`✦ Team view:  http://localhost:${PORT}`);
  console.log(`✦ Amr's view: http://localhost:${PORT}/for-amr\n`);
});
