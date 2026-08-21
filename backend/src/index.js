const express = require('express');
const app = express();

app.use(express.json());

const users = [];

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mobtrainer-backend-poc' });
});

app.post('/auth/register', (req, res) => {
  const { name, email, password, ethnicity } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const exists = users.some((user) => user.email === email);
  if (exists) {
    return res.status(409).json({ error: 'user already exists' });
  }

  const user = {
    id: users.length + 1,
    name,
    email,
    ethnicity: ethnicity || null,
    createdAt: new Date().toISOString()
  };

  users.push(user);

  return res.status(201).json({ user });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MobTrainer backend PoC running on http://localhost:${port}`);
});
