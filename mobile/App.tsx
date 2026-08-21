import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

const DEFAULT_API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

type UserSession = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    ethnicity: string | null;
    createdAt: string;
  };
};

type DashboardData = {
  user: UserSession['user'];
  metrics: {
    progress: number;
    workouts: number;
    calories: string;
    sleep: string;
    compliance: number;
  };
  nextWorkout: {
    id: number;
    title: string;
    day: string;
    time: string;
    duration_minutes: number;
    description: string;
  };
  nutrition: {
    id: number;
    title: string;
    summary: string;
  };
};

type PaymentAccount = {
  id: number;
  name: string;
  type: string;
  holder_name: string;
  account_number: string;
  currency: string;
  country: string;
  instructions: string;
};

type Plan = {
  id: number;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string;
};

type SubscriptionSummary = {
  id: number;
  plan_id: number;
  plan_name: string;
  payment_method: string;
  country: string;
  status: string;
  payment_reference: string | null;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string;
};

const USD_TO_BRL = 5.6;

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatLocalEquivalent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value * USD_TO_BRL);
}

function ProfileEditor({ session, onSaved }: { session: UserSession; onSaved: (user: UserSession['user']) => void }) {
  const [name, setName] = useState(session.user.name || '');
  const [ethnicity, setEthnicity] = useState(session.user.ethnicity || '');
  const [saving, setSaving] = useState(false);

  async function saveProfile() {
    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ name, ethnicity })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível salvar o perfil');
      }

      onSaved(data.user);
      Alert.alert('Perfil atualizado', 'Seus dados foram salvos com sucesso.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Perfil</Text>
      <Text style={styles.label}>Nome</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Etnia</Text>
      <TextInput value={ethnicity} onChangeText={setEthnicity} style={styles.input} placeholder="Ex: Branca" />

      <Pressable style={styles.submitButton} onPress={saveProfile} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Salvando...' : 'Salvar perfil'}</Text>
      </Pressable>
    </View>
  );
}

function WorkoutCreator({ session, onCreated }: { session: UserSession; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('Hoje');
  const [time, setTime] = useState('18:30');
  const [duration, setDuration] = useState('40');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function createWorkout() {
    if (!title.trim()) {
      Alert.alert('Dados incompletos', 'Informe o título do treino.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/workouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          day: day.trim() || 'Hoje',
          time: time.trim() || '18:30',
          duration_minutes: Number(duration) || 40,
          description: description.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível criar o treino');
      }

      Alert.alert('Treino adicionado', 'O treino foi salvo com sucesso.');
      setTitle('');
      setDay('Hoje');
      setTime('18:30');
      setDuration('40');
      setDescription('');
      onCreated();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível criar o treino.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Adicionar treino</Text>
      <Text style={styles.label}>Título</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Ex: Força superior" />

      <Text style={styles.label}>Dia</Text>
      <TextInput value={day} onChangeText={setDay} style={styles.input} placeholder="Hoje" />

      <Text style={styles.label}>Horário</Text>
      <TextInput value={time} onChangeText={setTime} style={styles.input} placeholder="18:30" />

      <Text style={styles.label}>Duração (min)</Text>
      <TextInput value={duration} onChangeText={setDuration} style={styles.input} keyboardType="numeric" placeholder="40" />

      <Text style={styles.label}>Descrição</Text>
      <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} multiline placeholder="Descreva o treino" />

      <Pressable style={styles.submitButton} onPress={createWorkout} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Salvando...' : 'Salvar treino'}</Text>
      </Pressable>
    </View>
  );
}

function NutritionCreator({ session, onCreated }: { session: UserSession; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);

  async function createPlan() {
    if (!title.trim() || !summary.trim()) {
      Alert.alert('Dados incompletos', 'Informe título e resumo do plano nutricional.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ title: title.trim(), summary: summary.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível criar o plano');
      }

      Alert.alert('Plano salvo', 'O plano nutricional foi criado com sucesso.');
      setTitle('');
      setSummary('');
      onCreated();
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível criar o plano.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Adicionar plano nutricional</Text>
      <Text style={styles.label}>Título</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Ex: Refeição pós treino" />

      <Text style={styles.label}>Resumo</Text>
      <TextInput value={summary} onChangeText={setSummary} style={[styles.input, styles.textArea]} multiline placeholder="Ex: Proteína + hidratação + carboidrato" />

      <Pressable style={styles.submitButton} onPress={createPlan} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Salvando...' : 'Salvar plano'}</Text>
      </Pressable>
    </View>
  );
}

function PaymentAccountsList({ session }: { session: UserSession }) {
  const [items, setItems] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch(`${API_BASE_URL}/payment-accounts`);
        if (!response.ok) {
          throw new Error('Não foi possível carregar contas');
        }

        const data = await response.json();
        setItems(data.accounts || []);
      } catch (error) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, [session]);

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Contas para depósito</Text>
      {loading ? (
        <Text style={styles.mutedText}>Carregando contas...</Text>
      ) : items.length === 0 ? (
        <Text style={styles.mutedText}>Nenhuma conta disponível no momento.</Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>{item.name}</Text>
            <Text style={styles.paymentMeta}>{item.type.toUpperCase()} • {item.country}</Text>
            <Text style={styles.paymentMeta}>Titular: {item.holder_name}</Text>
            <Text style={styles.paymentMeta}>Dados: {item.account_number}</Text>
            <Text style={styles.paymentMeta}>Moeda: {item.currency}</Text>
            <Text style={styles.paymentText}>{item.instructions || 'Dados válidos para receber depósito.'}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function SubscriptionStatusCard({ session }: { session: UserSession }) {
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const response = await fetch(`${API_BASE_URL}/subscriptions`, {
          headers: { Authorization: `Bearer ${session.token}` }
        });

        if (!response.ok) {
          throw new Error('Não foi possível carregar assinatura');
        }

        const data = await response.json();
        setSubscription((data.subscriptions || [])[0] || null);
      } catch {
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    }

    loadSubscriptions();
  }, [session]);

  if (loading) {
    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Status da assinatura</Text>
        <Text style={styles.mutedText}>Carregando plano atual...</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Status da assinatura</Text>
      {!subscription ? (
        <Text style={styles.mutedText}>Nenhuma assinatura localizada ainda.</Text>
      ) : (
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionName}>{subscription.plan_name}</Text>
            <Text style={styles.subscriptionBadge}>{subscription.status === 'active' ? 'Ativa' : 'Pendente'}</Text>
          </View>
          <Text style={styles.subscriptionMeta}>{formatMoney(Number(subscription.price), subscription.currency || 'USD')} • {subscription.interval === 'month' ? 'Mensal' : subscription.interval} • equiv. {formatLocalEquivalent(Number(subscription.price))}</Text>
          <Text style={styles.planText}>{subscription.description}</Text>
          <Text style={styles.paymentText}>Pagamento: {subscription.payment_method.toUpperCase()} • {subscription.country}</Text>
          {subscription.payment_reference ? (
            <Text style={styles.paymentText}>Referência: {subscription.payment_reference}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function PlanSelector({ session }: { session: UserSession }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch(`${API_BASE_URL}/plans`);
        if (!response.ok) {
          throw new Error('Falha ao carregar planos');
        }

        const data = await response.json();
        setPlans(data.plans || []);
        if (data.plans && data.plans.length > 0) {
          setSelectedPlanId(data.plans[0].id);
        }
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, [session]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || null;

  async function subscribe() {
    if (!selectedPlanId) {
      Alert.alert('Seleção obrigatória', 'Escolha um plano antes de continuar.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          payment_method: 'pix',
          country: 'Brasil'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível ativar a assinatura');
      }

      const checkoutResponse = await fetch(`${API_BASE_URL}/subscriptions/${data.subscription.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          payment_reference: `PIX-${selectedPlan?.name || 'PLAN'}-${Date.now()}`,
          confirmed: true
        })
      });

      const checkoutData = await checkoutResponse.json();

      if (!checkoutResponse.ok) {
        throw new Error(checkoutData.error || 'Não foi possível confirmar o pagamento');
      }

      setCheckoutDone(true);
      Alert.alert('Assinatura ativa', `Seu plano ${selectedPlan?.name || 'selecionado'} foi ativado com sucesso.`);
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível iniciar a assinatura.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Planos e assinatura</Text>
      {loading ? (
        <Text style={styles.mutedText}>Carregando planos...</Text>
      ) : plans.length === 0 ? (
        <Text style={styles.mutedText}>Nenhum plano disponível no momento.</Text>
      ) : (
        plans.map((plan) => (
          <Pressable
            key={plan.id}
            onPress={() => setSelectedPlanId(plan.id)}
            style={[styles.planCard, selectedPlanId === plan.id && styles.planCardSelected]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{formatMoney(plan.price, plan.currency || 'USD')}</Text>
            </View>
            <Text style={styles.planMeta}>{plan.interval === 'month' ? 'Mensal' : plan.interval} • equiv. {formatLocalEquivalent(plan.price)}</Text>
            <Text style={styles.planText}>{plan.description}</Text>
            <Text style={styles.planText}>• {plan.features}</Text>
          </Pressable>
        ))
      )}

      {selectedPlan ? (
        <View style={styles.checkoutSummary}>
          <Text style={styles.summaryLabel}>Resumo do checkout</Text>
          <Text style={styles.summaryTitle}>{selectedPlan.name}</Text>
          <Text style={styles.summaryText}>{formatMoney(selectedPlan.price, selectedPlan.currency || 'USD')} • {selectedPlan.interval === 'month' ? 'Mensal' : selectedPlan.interval}</Text>
          <Text style={styles.summaryText}>Equiv. local: {formatLocalEquivalent(selectedPlan.price)} • conversão em USD</Text>
          <Text style={styles.summaryText}>Método: PIX • País: Brasil</Text>
        </View>
      ) : null}

      <Pressable style={styles.submitButton} onPress={subscribe} disabled={submitting || !selectedPlanId}>
        <Text style={styles.submitText}>{submitting ? 'Processando...' : checkoutDone ? 'Plano ativo' : 'Ativar plano'}</Text>
      </Pressable>
    </View>
  );
}

function AdminAccountManager({ session }: { session: UserSession }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('pix');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [country, setCountry] = useState('Brasil');
  const [instructions, setInstructions] = useState('');
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/accounts`, {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar contas do admin');
        }

        const data = await response.json();
        setAccounts(data.accounts || []);
      } catch {
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    }

    loadAccounts();
  }, [session]);

  async function handleCreateAccount() {
    if (!name.trim() || !holderName.trim() || !accountNumber.trim()) {
      Alert.alert('Dados incompletos', 'Preencha nome, titular e dados da conta.');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          type: type.trim() || 'pix',
          holder_name: holderName.trim(),
          account_number: accountNumber.trim(),
          currency: currency.trim() || 'BRL',
          country: country.trim() || 'Brasil',
          instructions: instructions.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível criar a conta');
      }

      setAccounts((current) => [data.account, ...current]);
      setName('');
      setType('pix');
      setHolderName('');
      setAccountNumber('');
      setCurrency('BRL');
      setCountry('Brasil');
      setInstructions('');
      Alert.alert('Conta adicionada', 'A conta de recebimento foi cadastrada com sucesso.');
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Admin • contas de recebimento</Text>

      <Text style={styles.label}>Nome da conta</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="PIX MobTrainer" />

      <Text style={styles.label}>Tipo</Text>
      <TextInput value={type} onChangeText={setType} style={styles.input} placeholder="pix" />

      <Text style={styles.label}>Nome do titular</Text>
      <TextInput value={holderName} onChangeText={setHolderName} style={styles.input} placeholder="MobTrainer Global" />

      <Text style={styles.label}>Dados da conta</Text>
      <TextInput value={accountNumber} onChangeText={setAccountNumber} style={styles.input} placeholder="pix@mobtrainer.com" />

      <Text style={styles.label}>Moeda</Text>
      <TextInput value={currency} onChangeText={setCurrency} style={styles.input} placeholder="BRL" />

      <Text style={styles.label}>País</Text>
      <TextInput value={country} onChangeText={setCountry} style={styles.input} placeholder="Brasil" />

      <Text style={styles.label}>Instruções</Text>
      <TextInput value={instructions} onChangeText={setInstructions} style={[styles.input, styles.textArea]} multiline placeholder="Instruções para depósito" />

      <Pressable style={styles.submitButton} onPress={handleCreateAccount} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Salvando...' : 'Cadastrar conta'}</Text>
      </Pressable>

      <View style={styles.adminListSection}>
        <Text style={styles.sectionSubtitle}>Contas cadastradas</Text>
        {loading ? (
          <Text style={styles.mutedText}>Carregando...</Text>
        ) : accounts.length === 0 ? (
          <Text style={styles.mutedText}>Nenhuma conta cadastrada ainda.</Text>
        ) : (
          accounts.map((account) => (
            <View key={account.id} style={styles.adminAccountRow}>
              <Text style={styles.adminAccountName}>{account.name}</Text>
              <Text style={styles.adminAccountMeta}>{account.type.toUpperCase()} • {account.country}</Text>
              <Text style={styles.adminAccountMeta}>{account.account_number}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export default function App() {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ethnicity, setEthnicity] = useState('Branca');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!session) {
      setDashboard(null);
      return;
    }

    async function loadDashboard() {
      try {
        const response = await fetch(`${API_BASE_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${session.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar dashboard');
        }

        const data = await response.json();
        setDashboard(data);
      } catch (error) {
        Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível carregar o dashboard.');
      }
    }

    loadDashboard();
  }, [session]);

  async function handleSubmit() {
    if (!email || !password || (mode === 'register' && !name)) {
      Alert.alert('Dados incompletos', 'Preencha nome, e-mail e senha antes de continuar.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const payload = mode === 'register'
        ? { name, email, password, ethnicity }
        : { email, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar a solicitação');
      }

      setSession({
        token: data.token,
        user: data.user
      });
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível concluir a ação.');
    } finally {
      setLoading(false);
    }
  }

  if (session && dashboard) {
    return (
      <ScrollView contentContainerStyle={styles.dashboardContainer}>
        <StatusBar style="auto" />

        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.eyebrow}>Bem-vindo</Text>
            <Text style={styles.dashboardTitle}>{dashboard.user.name || 'Aluno'}</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={() => setSession(null)}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
        </View>

        <View style={styles.premiumBanner}>
          <Text style={styles.premiumBadge}>Premium</Text>
          <Text style={styles.premiumTitle}>Sua jornada em alta performance</Text>
          <Text style={styles.premiumSubtitle}>Acompanhamento inteligente, nutrição estratégica e progressão contínua.</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Progresso deste mês</Text>
          <Text style={styles.heroValue}>{dashboard.metrics.progress}%</Text>
          <Text style={styles.heroSubtext}>Meta de consistência em evolução</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{dashboard.metrics.workouts}</Text>
            <Text style={styles.metricLabel}>Treinos</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{dashboard.metrics.calories}</Text>
            <Text style={styles.metricLabel}>Calorias</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{dashboard.metrics.sleep}</Text>
            <Text style={styles.metricLabel}>Sono</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{dashboard.metrics.compliance}%</Text>
            <Text style={styles.metricLabel}>Conformidade</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Próximo treino</Text>
          <Text style={styles.planTitle}>{dashboard.nextWorkout.title}</Text>
          <Text style={styles.planMeta}>{dashboard.nextWorkout.day} • {dashboard.nextWorkout.time} • {dashboard.nextWorkout.duration_minutes} min</Text>
          <Text style={styles.planBody}>{dashboard.nextWorkout.description}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Plano nutricional</Text>
          <Text style={styles.planTitle}>{dashboard.nutrition.title}</Text>
          <Text style={styles.listItem}>• {dashboard.nutrition.summary}</Text>
        </View>

        <ProfileEditor
          session={session}
          onSaved={(updatedUser) => {
            setSession((current) => current ? { ...current, user: updatedUser } : current);
            setDashboard((current) => current ? { ...current, user: updatedUser } : current);
          }}
        />

        <SubscriptionStatusCard session={session} />
        <PaymentAccountsList session={session} />
        <PlanSelector session={session} />

        {session.user.email === 'admin@mobtrainer.app' && (
          <AdminAccountManager session={session} />
        )}

        <WorkoutCreator
          session={session}
          onCreated={() => {
            fetch(`${API_BASE_URL}/dashboard`, {
              headers: {
                Authorization: `Bearer ${session.token}`
              }
            })
              .then((response) => response.ok ? response.json() : null)
              .then((data) => {
                if (data) {
                  setDashboard(data);
                }
              })
              .catch(() => undefined);
          }}
        />

        <NutritionCreator
          session={session}
          onCreated={() => {
            fetch(`${API_BASE_URL}/dashboard`, {
              headers: {
                Authorization: `Bearer ${session.token}`
              }
            })
              .then((response) => response.ok ? response.json() : null)
              .then((data) => {
                if (data) {
                  setDashboard(data);
                }
              })
              .catch(() => undefined);
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="auto" />

      <Text style={styles.title}>MobTrainer</Text>
      <Text style={styles.subtitle}>Treinos e acompanhamento nutricional</Text>

      <View style={styles.switcher}>
        <Pressable
          style={[styles.switchButton, mode === 'register' && styles.switchButtonActive]}
          onPress={() => setMode('register')}
        >
          <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>Cadastrar</Text>
        </Pressable>
        <Pressable
          style={[styles.switchButton, mode === 'login' && styles.switchButtonActive]}
          onPress={() => setMode('login')}
        >
          <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Entrar</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        {mode === 'register' && (
          <>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              style={styles.input}
            />

            <Text style={styles.label}>Etnia</Text>
            <TextInput
              value={ethnicity}
              onChangeText={setEthnicity}
              placeholder="Branca"
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="usuario@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Sua senha"
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Processando...' : mode === 'register' ? 'Criar conta' : 'Entrar'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f7ff',
    justifyContent: 'center',
    padding: 24
  },
  dashboardContainer: {
    flexGrow: 1,
    backgroundColor: '#eef4ff',
    padding: 24,
    paddingTop: 56
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center'
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 24,
    textAlign: 'center'
  },
  mutedText: {
    color: '#6b7280',
    fontSize: 14
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20
  },
  switchButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center'
  },
  switchButtonActive: {
    backgroundColor: '#2563eb'
  },
  switchText: {
    color: '#374151',
    fontWeight: '600'
  },
  switchTextActive: {
    color: '#fff'
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  label: {
    marginBottom: 8,
    color: '#374151',
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#f9fafb'
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitText: {
    color: '#fff',
    fontWeight: '700'
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  eyebrow: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827'
  },
  logoutButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  logoutText: {
    fontWeight: '600',
    color: '#1f2937'
  },
  premiumBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  premiumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#facc15',
    color: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 10,
    textTransform: 'uppercase'
  },
  premiumTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6
  },
  premiumSubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20
  },
  heroCard: {
    backgroundColor: '#2563eb',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20
  },
  heroLabel: {
    color: '#dbeafe',
    fontSize: 12,
    textTransform: 'uppercase'
  },
  heroValue: {
    marginTop: 8,
    color: '#fff',
    fontSize: 36,
    fontWeight: '800'
  },
  heroSubtext: {
    marginTop: 8,
    color: '#dbeafe',
    fontSize: 14
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  metricLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280'
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937'
  },
  planMeta: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 13
  },
  planBody: {
    marginTop: 10,
    color: '#374151',
    lineHeight: 22
  },
  listItem: {
    color: '#374151',
    lineHeight: 24,
    fontSize: 15
  },
  paymentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dfe7f5'
  },
  planCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dfe7f5'
  },
  planCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff'
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb'
  },
  planText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    marginTop: 6
  },
  paymentTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700'
  },
  paymentMeta: {
    color: '#4b5563',
    fontSize: 12,
    marginTop: 4
  },
  paymentText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  adminListSection: {
    marginTop: 18
  },
  adminAccountRow: {
    backgroundColor: '#eef4ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8
  },
  adminAccountName: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14
  },
  adminAccountMeta: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4
  },
  subscriptionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 14
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  subscriptionName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700'
  },
  subscriptionBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 11
  },
  subscriptionMeta: {
    color: '#4b5563',
    fontSize: 12,
    marginBottom: 8
  },
  checkoutSummary: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    marginTop: 12,
    marginBottom: 14
  },
  summaryLabel: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6
  },
  summaryTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700'
  },
  summaryText: {
    color: '#374151',
    fontSize: 13,
    marginTop: 4
  }
});
