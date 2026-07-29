const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { readData, writeData } = require('./db');
const { hashPassword, checkPassword, signToken, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' }
});
app.use('/api', apiLimiter);

app.use(express.static(__dirname));

function nextId(items) {
  return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

function validateTransaction(body) {
  const { type, amount, description, category, date } = body;
  if (!['income', 'expense'].includes(type)) return 'type must be "income" or "expense"';
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return 'amount must be a positive number';
  if (!description || typeof description !== 'string') return 'description is required';
  if (!category || typeof category !== 'string') return 'category is required';
  if (!date || typeof date !== 'string') return 'date is required';
  return null;
}

function validateGoal(body) {
  const { name, target } = body;
  if (!name || typeof name !== 'string') return 'name is required';
  if (typeof target !== 'number' || isNaN(target) || target <= 0) return 'target must be a positive number';
  if (body.current !== undefined && (typeof body.current !== 'number' || isNaN(body.current))) {
    return 'current must be a number';
  }
  return null;
}

app.post('/api/auth/register', authLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const data = readData();
  const cleanUsername = username.trim();
  const exists = data.users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (exists) {
    return res.status(409).json({ error: 'That username is already taken' });
  }

  const user = {
    id: nextId(data.users),
    username: cleanUsername,
    passwordHash: hashPassword(password)
  };
  data.users.push(user);
  writeData(data);

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const data = readData();
  const user = data.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || !checkPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect username or password' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ id: req.userId, username: req.username });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const data = readData();
  res.json(data.transactions.filter(t => t.userId === req.userId));
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const error = validateTransaction(req.body);
  if (error) return res.status(400).json({ error });

  const data = readData();
  const transaction = {
    id: nextId(data.transactions),
    userId: req.userId,
    type: req.body.type,
    amount: req.body.amount,
    description: req.body.description,
    category: req.body.category,
    date: req.body.date
  };

  data.transactions.push(transaction);
  writeData(data);
  res.status(201).json(transaction);
});

app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const target = data.transactions.find(t => t.id === id && t.userId === req.userId);
  if (!target) return res.status(404).json({ error: 'Transaction not found' });

  data.transactions = data.transactions.filter(t => t.id !== id);
  writeData(data);
  res.status(204).send();
});

app.get('/api/goals', requireAuth, (req, res) => {
  const data = readData();
  res.json(data.goals.filter(g => g.userId === req.userId));
});

app.post('/api/goals', requireAuth, (req, res) => {
  const error = validateGoal(req.body);
  if (error) return res.status(400).json({ error });

  const data = readData();
  const goal = {
    id: nextId(data.goals),
    userId: req.userId,
    name: req.body.name,
    target: req.body.target,
    current: req.body.current || 0,
    color: req.body.color || '#6366f1',
    date: req.body.date || null
  };

  data.goals.push(goal);
  writeData(data);
  res.status(201).json(goal);
});

app.put('/api/goals/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const goal = data.goals.find(g => g.id === id && g.userId === req.userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const { name, target, current, color, date } = req.body;
  if (name !== undefined) goal.name = name;
  if (target !== undefined) goal.target = target;
  if (current !== undefined) goal.current = current;
  if (color !== undefined) goal.color = color;
  if (date !== undefined) goal.date = date;

  writeData(data);
  res.json(goal);
});

app.delete('/api/goals/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const data = readData();
  const target = data.goals.find(g => g.id === id && g.userId === req.userId);
  if (!target) return res.status(404).json({ error: 'Goal not found' });

  data.goals = data.goals.filter(g => g.id !== id);
  writeData(data);
  res.status(204).send();
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Vault API running at http://localhost:${PORT}`);
});
