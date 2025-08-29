// server.js
import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());


const redisUrl = process.env.REDIS_URL || 'redis://red-d2p2kgjipnbc73899bmg:6379';
const redisClient = createClient({ url: redisUrl });

redisClient.on('error', err => console.log('Redis Client Error', err));

await redisClient.connect();

app.post('/api/orders', async (req, res) => {
  const { visitorId, cartItems, address } = req.body;

  if (!visitorId) return res.status(400).json({ success: false, message: 'visitorId obrigatório' });

  const key = `order:${visitorId}`;

  try {
    const exists = await redisClient.exists(key);
    if (exists) {
      return res.json({ success: false, message: 'Você já fez um pedido recentemente. Aguarde alguns instantes.' });
    }

    const id = uuidv4();
    await redisClient.set(key, JSON.stringify({ id, cartItems, address }), { EX: 60 });

    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Erro ao criar pedido' });
  }
});


app.get('/api/orders', async (req, res) => {
  try {
    const keys = await redisClient.keys('order:*');
    const orders = [];
    for (const key of keys) {
      const value = await redisClient.get(key);
      orders.push({ id: key.split(':')[1], ...JSON.parse(value) });
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
