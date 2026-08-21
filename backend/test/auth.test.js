const path = require('node:path');
const fs = require('node:fs');

process.env.MOBTRAINER_DB_PATH = path.join(__dirname, 'data', 'test-mobtrainer.sqlite');

if (fs.existsSync(process.env.MOBTRAINER_DB_PATH)) {
  fs.unlinkSync(process.env.MOBTRAINER_DB_PATH);
}

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/index.js');

async function withApp(testFn) {
  const app = createApp();
  const server = app.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));

  const { port } = server.address();
  try {
    await testFn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('register creates user and returns token', async () => {
  await withApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Maria',
        email: 'maria@example.com',
        password: '123456',
        ethnicity: 'Branca'
      })
    });

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.user);
    assert.ok(body.token);
    assert.equal(body.user.email, 'maria@example.com');
  });
});

test('login authenticates and returns token', async () => {
  await withApp(async (baseUrl) => {
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pedro',
        email: 'pedro@example.com',
        password: 'secret123',
        ethnicity: 'Parda'
      })
    });

    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pedro@example.com',
        password: 'secret123'
      })
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(body.token);
    assert.equal(body.user.email, 'pedro@example.com');
  });
});

test('dashboard requires auth and returns real user data', async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rafael',
        email: 'rafael@example.com',
        password: 'pass123',
        ethnicity: 'Preta'
      })
    });

    const registerBody = await registerResponse.json();
    const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${registerBody.token}`
      }
    });

    assert.equal(dashboardResponse.status, 200);
    const dashboardBody = await dashboardResponse.json();
    assert.equal(dashboardBody.user.email, 'rafael@example.com');
    assert.ok(dashboardBody.nextWorkout);
    assert.ok(dashboardBody.nutrition);
  });
});

test('profile update stores new name and ethnicity for authenticated user', async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos',
        email: 'carlos@example.com',
        password: 'abc123',
        ethnicity: 'Branca'
      })
    });

    const registerBody = await registerResponse.json();

    const updateResponse = await fetch(`${baseUrl}/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        name: 'Carlos Atualizado',
        ethnicity: 'Parda'
      })
    });

    assert.equal(updateResponse.status, 200);
    const updatedBody = await updateResponse.json();
    assert.equal(updatedBody.user.name, 'Carlos Atualizado');
    assert.equal(updatedBody.user.ethnicity, 'Parda');
  });
});

test('authenticated user can create a new workout and nutrition plan', async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Diana',
        email: 'diana@example.com',
        password: 'qwerty',
        ethnicity: 'Indígena'
      })
    });

    const registerBody = await registerResponse.json();

    const workoutResponse = await fetch(`${baseUrl}/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        title: 'Treino de pernas',
        day: 'Quarta',
        time: '19:00',
        duration_minutes: 50,
        description: 'Agachamento, leg press e panturrilha.'
      })
    });

    assert.equal(workoutResponse.status, 201);
    const workoutBody = await workoutResponse.json();
    assert.equal(workoutBody.workout.title, 'Treino de pernas');

    const nutritionResponse = await fetch(`${baseUrl}/nutrition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        title: 'Refeição pós treino',
        summary: 'Carboidrato + proteína + água.'
      })
    });

    assert.equal(nutritionResponse.status, 201);
    const nutritionBody = await nutritionResponse.json();
    assert.equal(nutritionBody.plan.title, 'Refeição pós treino');
  });
});

test('admin can manage payment accounts and users can list them', async () => {
  await withApp(async (baseUrl) => {
    const adminLoginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mobtrainer.app',
        password: 'admin123'
      })
    });

    assert.equal(adminLoginResponse.status, 200);
    const adminBody = await adminLoginResponse.json();

    const createAccountResponse = await fetch(`${baseUrl}/admin/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminBody.token}`
      },
      body: JSON.stringify({
        name: 'PIX MobTrainer',
        type: 'pix',
        holder_name: 'MobTrainer Global',
        account_number: 'pix@mobtrainer.com',
        currency: 'BRL',
        country: 'Brasil',
        instructions: 'Use o e-mail como chave PIX.'
      })
    });

    assert.equal(createAccountResponse.status, 201);
    const accountBody = await createAccountResponse.json();
    assert.equal(accountBody.account.name, 'PIX MobTrainer');

    const publicAccountsResponse = await fetch(`${baseUrl}/payment-accounts`);
    assert.equal(publicAccountsResponse.status, 200);
    const publicAccountsBody = await publicAccountsResponse.json();
    assert.ok(publicAccountsBody.accounts.length >= 1);
  });
});

test('users can view plans and activate a subscription', async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Elena',
        email: 'elena@example.com',
        password: 'abc123',
        ethnicity: 'Branca'
      })
    });

    const registerBody = await registerResponse.json();

    const plansResponse = await fetch(`${baseUrl}/plans`);
    assert.equal(plansResponse.status, 200);
    const plansBody = await plansResponse.json();
    assert.ok(plansBody.plans.length >= 1);

    const subscriptionResponse = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        plan_id: plansBody.plans[0].id,
        payment_method: 'pix',
        country: 'Brasil'
      })
    });

    assert.equal(subscriptionResponse.status, 201);
    const subscriptionBody = await subscriptionResponse.json();
    assert.equal(subscriptionBody.subscription.plan_id, plansBody.plans[0].id);
    assert.equal(subscriptionBody.subscription.status, 'pending');
  });
});

test('checkout confirms payment and activates the subscription', async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fernando',
        email: 'fernando@example.com',
        password: 'abc123',
        ethnicity: 'Parda'
      })
    });

    const registerBody = await registerResponse.json();
    const plansResponse = await fetch(`${baseUrl}/plans`);
    const plansBody = await plansResponse.json();

    const subscriptionResponse = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        plan_id: plansBody.plans[0].id,
        payment_method: 'pix',
        country: 'Brasil'
      })
    });

    const subscriptionBody = await subscriptionResponse.json();

    const checkoutResponse = await fetch(`${baseUrl}/subscriptions/${subscriptionBody.subscription.id}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        payment_reference: 'PIX-REF-001',
        confirmed: true
      })
    });

    assert.equal(checkoutResponse.status, 200);
    const checkoutBody = await checkoutResponse.json();
    assert.equal(checkoutBody.subscription.status, 'active');
  });
});

test('user can list subscriptions with current status and plan details', async () => {
  await withApp(async (baseUrl) => {
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gabriela',
        email: 'gabriela@example.com',
        password: 'pass456',
        ethnicity: 'Branca'
      })
    });

    const registerBody = await registerResponse.json();
    const plansResponse = await fetch(`${baseUrl}/plans`);
    const plansBody = await plansResponse.json();

    const createSubscriptionResponse = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        plan_id: plansBody.plans[0].id,
        payment_method: 'pix',
        country: 'Brasil'
      })
    });

    const createdSubscription = await createSubscriptionResponse.json();

    const checkoutResponse = await fetch(`${baseUrl}/subscriptions/${createdSubscription.subscription.id}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registerBody.token}`
      },
      body: JSON.stringify({
        payment_reference: 'PIX-REF-STATUS',
        confirmed: true
      })
    });

    assert.equal(checkoutResponse.status, 200);

    const listResponse = await fetch(`${baseUrl}/subscriptions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${registerBody.token}`
      }
    });

    assert.equal(listResponse.status, 200);
    const listBody = await listResponse.json();
    assert.ok(Array.isArray(listBody.subscriptions));
    assert.ok(listBody.subscriptions.some((item) => item.status === 'active'));
  });
});
