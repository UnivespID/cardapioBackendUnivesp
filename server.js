// server.js
import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Conexão Redis
const redisClient = createClient();
redisClient.on('error', err => console.log('Redis Client Error', err));
await redisClient.connect();

// Rota para criar pedido
app.post('/api/orders', async (req, res) => {
  const { visitorId, cartItems, address } = req.body;

  if (!visitorId) return res.status(400).json({ success: false, message: 'visitorId obrigatório' });

  const key = `order:${visitorId}`;

  try {
    // Verifica se já existe pedido recente
    const exists = await redisClient.exists(key);
    if (exists) {
      return res.json({ success: false, message: 'Você já fez um pedido recentemente. Aguarde alguns instantes.' });
    }

    // Gera ID único para o pedido
    const id = uuidv4();

    // Salva pedido no Redis com expiração de 1 minuto (60 segundos)
    await redisClient.set(key, JSON.stringify({ id, cartItems, address }), { EX: 60 });

    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Erro ao criar pedido' });
  }
});

// Rota para listar pedidos (opcional)
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
