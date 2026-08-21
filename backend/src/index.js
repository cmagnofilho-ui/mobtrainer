const express = require('express');
const crypto = require('node:crypto');
const { init, get, run, all, hashPassword, verifyPassword } = require('./database');

if (process.env.NODE_ENV === 'production' && !process.env.TOKEN_SECRET) {
  throw new Error('TOKEN_SECRET is required in production');
}

const tokenSecret = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

function createApp() {
  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use(express.json());

  function generateToken(user) {
    const payload = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      issuedAt: Date.now()
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  function decodeToken(token) {
    if (!token) {
      return null;
    }

    try {
      const [encodedPayload, signature] = String(token).split('.');
      if (!encodedPayload || !signature) {
        return null;
      }

      const expectedSignature = crypto.createHmac('sha256', tokenSecret).update(encodedPayload).digest('base64url');
      const expected = Buffer.from(expectedSignature);
      const actual = Buffer.from(signature);
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        return null;
      }

      const raw = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const decodedPayload = JSON.parse(raw);
      return decodedPayload && decodedPayload.userId ? Number(decodedPayload.userId) : null;
    } catch {
      return null;
    }
  }

  async function requireUser(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    const userId = decodeToken(token);

    if (!userId) {
      return null;
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    return user || null;
  }

  async function requireAdmin(req) {
    const user = await requireUser(req);
    if (!user || user.email !== 'admin@mobtrainer.app') {
      return null;
    }
    return user;
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'mobtrainer-backend-poc' });
  });

  app.get('/', (_req, res) => {
    res.json({ service: 'mobtrainer-backend-poc', health: '/health' });
  });

  app.get('/me', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        ethnicity: user.ethnicity,
        createdAt: user.created_at
      }
    });
  });

  app.put('/me', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { name, ethnicity } = req.body || {};

    if (!name && !ethnicity) {
      return res.status(400).json({ error: 'name or ethnicity is required' });
    }

    const nextName = name || user.name;
    const nextEthnicity = ethnicity || user.ethnicity;

    await run(
      'UPDATE users SET name = ?, ethnicity = ? WHERE id = ?',
      [nextName, nextEthnicity, user.id]
    );

    const updatedUser = await get('SELECT * FROM users WHERE id = ?', [user.id]);

    return res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        ethnicity: updatedUser.ethnicity,
        createdAt: updatedUser.created_at
      }
    });
  });

  app.get('/dashboard', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const workouts = await all('SELECT * FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 3', [user.id]);
    const plans = await all('SELECT * FROM nutrition_plans WHERE user_id = ? ORDER BY id DESC LIMIT 3', [user.id]);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        ethnicity: user.ethnicity,
        createdAt: user.created_at
      },
      metrics: {
        progress: 72,
        workouts: workouts.length || 4,
        calories: '1.8k',
        sleep: '6h',
        compliance: 87
      },
      nextWorkout: workouts[0] || {
        id: 1,
        title: 'Força superior + mobilidade',
        day: 'Hoje',
        time: '18:30',
        duration_minutes: 40,
        description: 'Agachamento, supino, remada e alongamento final.'
      },
      nutrition: plans[0] || {
        id: 1,
        title: 'Plano nutricional',
        summary: 'Proteína: 140g por dia, hidratação: 2,5L e refeição após treino.'
      }
    });
  });

  app.post('/auth/register', async (req, res) => {
    try {
      await init();
    } catch (error) {
      return res.status(500).json({ error: error.message || 'database initialization failed' });
    }

    const { name, email, password, ethnicity } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    try {
      const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
      if (existing) {
        return res.status(409).json({ error: 'user already exists' });
      }

      const inserted = await run(
        'INSERT INTO users (name, email, password, ethnicity) VALUES (?, ?, ?, ?)',
        [name, email, hashPassword(password), ethnicity || null]
      );

      const user = {
        id: inserted.id,
        name,
        email,
        ethnicity: ethnicity || null,
        createdAt: new Date().toISOString()
      };

      const token = generateToken(user);
      return res.status(201).json({ user, token });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'internal server error' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      await init();
    } catch (error) {
      return res.status(500).json({ error: error.message || 'database initialization failed' });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    try {
      const user = await get('SELECT * FROM users WHERE email = ?', [email]);

      const passwordIsHashed = String(user?.password || '').startsWith('scrypt$');
      const passwordIsValid = user && (passwordIsHashed
        ? verifyPassword(password, user.password)
        : user.password === password);

      if (!passwordIsValid) {
        return res.status(401).json({ error: 'invalid credentials' });
      }

      if (!passwordIsHashed) {
        await run('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id]);
      }

      const token = generateToken(user);
      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          ethnicity: user.ethnicity,
          createdAt: user.created_at
        },
        token
      });
    } catch (error) {
      return res.status(500).json({ error: error.message || 'internal server error' });
    }
  });

  app.get('/workouts', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const workouts = await all('SELECT * FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 10', [user.id]);
    return res.json({ workouts });
  });

  app.post('/workouts', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { title, day, time, duration_minutes, description } = req.body || {};

    if (!title || !day || !time || !duration_minutes) {
      return res.status(400).json({ error: 'title, day, time and duration_minutes are required' });
    }

    const inserted = await run(
      'INSERT INTO workouts (user_id, title, day, time, duration_minutes, description) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, title, day, time, duration_minutes, description || '']
    );

    const workout = {
      id: inserted.id,
      user_id: user.id,
      title,
      day,
      time,
      duration_minutes,
      description: description || '',
      created_at: new Date().toISOString()
    };

    return res.status(201).json({ workout });
  });

  app.get('/nutrition', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const plans = await all('SELECT * FROM nutrition_plans WHERE user_id = ? ORDER BY id DESC LIMIT 10', [user.id]);
    return res.json({ plans });
  });

  app.post('/nutrition', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { title, summary } = req.body || {};

    if (!title || !summary) {
      return res.status(400).json({ error: 'title and summary are required' });
    }

    const inserted = await run(
      'INSERT INTO nutrition_plans (user_id, title, summary) VALUES (?, ?, ?)',
      [user.id, title, summary]
    );

    const plan = {
      id: inserted.id,
      user_id: user.id,
      title,
      summary,
      created_at: new Date().toISOString()
    };

    return res.status(201).json({ plan });
  });

  app.get('/plans', async (_req, res) => {
    await init();
    const plans = await all('SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC');
    return res.json({ plans });
  });

  app.get('/subscriptions', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const subscriptions = await all(`
      SELECT s.*, p.name as plan_name, p.price, p.currency, p.interval, p.description, p.features
      FROM subscriptions s
      INNER JOIN plans p ON p.id = s.plan_id
      WHERE s.user_id = ?
      ORDER BY s.id DESC
    `, [user.id]);

    return res.json({
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        user_id: subscription.user_id,
        plan_id: subscription.plan_id,
        plan_name: subscription.plan_name,
        payment_method: subscription.payment_method,
        country: subscription.country,
        status: subscription.status,
        payment_reference: subscription.payment_reference,
        price: subscription.price,
        currency: subscription.currency,
        interval: subscription.interval,
        description: subscription.description,
        features: subscription.features,
        created_at: subscription.created_at
      }))
    });
  });

  app.post('/subscriptions', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { plan_id, payment_method, country } = req.body || {};

    if (!plan_id || !payment_method || !country) {
      return res.status(400).json({ error: 'plan_id, payment_method and country are required' });
    }

    const plan = await get('SELECT * FROM plans WHERE id = ? AND is_active = 1', [plan_id]);
    if (!plan) {
      return res.status(404).json({ error: 'plan not found' });
    }

    const inserted = await run(
      'INSERT INTO subscriptions (user_id, plan_id, payment_method, country, status) VALUES (?, ?, ?, ?, ?)',
      [user.id, plan.id, payment_method, country, 'pending']
    );

    return res.status(201).json({
      subscription: {
        id: inserted.id,
        user_id: user.id,
        plan_id: plan.id,
        payment_method,
        country,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    });
  });

  app.post('/subscriptions/:id/checkout', async (req, res) => {
    const user = await requireUser(req);
    if (!user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { id } = req.params;
    const { payment_reference, confirmed } = req.body || {};

    if (!payment_reference || confirmed !== true) {
      return res.status(400).json({ error: 'payment_reference and confirmed=true are required' });
    }

    const subscription = await get('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?', [id, user.id]);
    if (!subscription) {
      return res.status(404).json({ error: 'subscription not found' });
    }

    await run(
      'UPDATE subscriptions SET status = ?, payment_reference = ? WHERE id = ?',
      ['active', payment_reference, subscription.id]
    );

    const updatedSubscription = await get('SELECT * FROM subscriptions WHERE id = ?', [subscription.id]);

    return res.json({
      subscription: {
        id: updatedSubscription.id,
        user_id: updatedSubscription.user_id,
        plan_id: updatedSubscription.plan_id,
        payment_method: updatedSubscription.payment_method,
        country: updatedSubscription.country,
        status: updatedSubscription.status,
        payment_reference: updatedSubscription.payment_reference,
        created_at: updatedSubscription.created_at
      }
    });
  });

  app.get('/payment-accounts', async (_req, res) => {
    await init();
    const accounts = await all('SELECT * FROM payment_accounts WHERE is_active = 1 ORDER BY id DESC');
    return res.json({ accounts });
  });

  app.get('/admin/accounts', async (req, res) => {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'admin required' });
    }

    const accounts = await all('SELECT * FROM payment_accounts ORDER BY id DESC');
    return res.json({ accounts });
  });

  app.post('/admin/accounts', async (req, res) => {
    const admin = await requireAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'admin required' });
    }

    const { name, type, holder_name, account_number, currency, country, instructions } = req.body || {};

    if (!name || !type || !holder_name || !account_number || !currency || !country) {
      return res.status(400).json({ error: 'name, type, holder_name, account_number, currency and country are required' });
    }

    const inserted = await run(
      'INSERT INTO payment_accounts (name, type, holder_name, account_number, currency, country, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, type, holder_name, account_number, currency, country, instructions || '']
    );

    const account = {
      id: inserted.id,
      name,
      type,
      holder_name,
      account_number,
      currency,
      country,
      instructions: instructions || '',
      is_active: 1,
      created_at: new Date().toISOString()
    };

    return res.status(201).json({ account });
  });

  return app;
}

if (require.main === module) {
  init().then(() => {
    const app = createApp();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`MobTrainer backend PoC running on http://localhost:${port}`);
    });
  }).catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
}

module.exports = { createApp };
