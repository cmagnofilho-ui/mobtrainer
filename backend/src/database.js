const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [algorithm, salt, storedHash] = String(storedPassword || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    return false;
  }

  const calculatedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(calculatedHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

const dbPath = process.env.MOBTRAINER_DB_PATH || path.join(__dirname, '..', 'data', 'mobtrainer.sqlite');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);
let initialized = false;

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function init() {
  if (initialized) {
    return Promise.resolve();
  }

  initialized = true;

  return run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      ethnicity TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
    .then(() => run(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `))
    .then(() => run(`
      CREATE TABLE IF NOT EXISTS nutrition_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `))
    .then(() => run(`
      CREATE TABLE IF NOT EXISTS payment_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        holder_name TEXT NOT NULL,
        account_number TEXT NOT NULL,
        currency TEXT NOT NULL,
        country TEXT NOT NULL,
        instructions TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `))
    .then(() => run(`
      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT NOT NULL,
        interval TEXT NOT NULL,
        description TEXT,
        features TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `))
    .then(() => run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        country TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_reference TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (plan_id) REFERENCES plans(id)
      )
    `))
    .then(async () => {
      const hasUsers = await get('SELECT COUNT(*) as count FROM users');
      if (hasUsers && hasUsers.count > 0) {
        return;
      }

      const adminUser = await get('SELECT id FROM users WHERE email = ?', ['admin@mobtrainer.app']);
      if (!adminUser) {
        await run(
          'INSERT INTO users (name, email, password, ethnicity) VALUES (?, ?, ?, ?)',
          ['MobTrainer Admin', 'admin@mobtrainer.app', hashPassword('admin123'), 'Global']
        );
      }

      const demoUser = await get('SELECT id FROM users WHERE email = ?', ['demo@mobtrainer.app']);
      if (!demoUser) {
        await run(
          'INSERT INTO users (name, email, password, ethnicity) VALUES (?, ?, ?, ?)',
          ['Demo User', 'demo@mobtrainer.app', hashPassword('demo123'), 'Branca']
        );
      }

      const seedUser = await get('SELECT id FROM users WHERE email = ?', ['demo@mobtrainer.app']);
      const workoutCount = await get('SELECT COUNT(*) as count FROM workouts WHERE user_id = ?', [seedUser.id]);
      if (!workoutCount || workoutCount.count === 0) {
        await run(
          'INSERT INTO workouts (user_id, title, day, time, duration_minutes, description) VALUES (?, ?, ?, ?, ?, ?)',
          [seedUser.id, 'Força superior + mobilidade', 'Hoje', '18:30', 40, 'Agachamento, supino, remada e alongamento final.']
        );
      }

      const nutritionCount = await get('SELECT COUNT(*) as count FROM nutrition_plans WHERE user_id = ?', [seedUser.id]);
      if (!nutritionCount || nutritionCount.count === 0) {
        await run(
          'INSERT INTO nutrition_plans (user_id, title, summary) VALUES (?, ?, ?)',
          [seedUser.id, 'Plano nutricional', 'Proteína: 140g por dia, hidratação: 2,5L e refeição após treino.']
        );
      }

      const accountCount = await get('SELECT COUNT(*) as count FROM payment_accounts');
      if (!accountCount || accountCount.count === 0) {
        await run(
          'INSERT INTO payment_accounts (name, type, holder_name, account_number, currency, country, instructions) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['PIX MobTrainer', 'pix', 'MobTrainer Global', 'pix@mobtrainer.com', 'BRL', 'Brasil', 'Use a chave PIX da conta principal do projeto.']
        );
      }

      const plansCount = await get('SELECT COUNT(*) as count FROM plans');
      if (!plansCount || plansCount.count === 0) {
        await run(
          'INSERT INTO plans (name, price, currency, interval, description, features) VALUES (?, ?, ?, ?, ?, ?)',
          ['Starter', 29.00, 'USD', 'month', 'Plano inicial com cobrança em USD e equivalente em reais pela conversão do dólar americano.', 'Treinos com foco em condicionamento; acompanhamento nutricional básico; dashboard pessoal']
        );
        await run(
          'INSERT INTO plans (name, price, currency, interval, description, features) VALUES (?, ?, ?, ?, ?, ?)',
          ['Pro', 59.00, 'USD', 'month', 'Plano premium com faturamento baseado em USD e conversão local em reais conforme o dólar americano.', 'Treinos personalizados; plano nutricional avançado; suporte prioritário; relatórios de progresso']
        );
      }
    });
}

module.exports = {
  db,
  init,
  run,
  get,
  all,
  hashPassword,
  verifyPassword
};
