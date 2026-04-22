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

app.post('/api/messages', async (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: 'Name and message required' });

  try {
    const messages = await redisGet(MESSAGES_KEY);
    const entry = {
      id: Date.now().toString(),
      name: name.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
      x: 10 + Math.random() * 55,
      y: 20 + messages.length * 160,
      rotate: -5 + Math.random() * 10,
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
