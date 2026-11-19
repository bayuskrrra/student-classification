// Pengaturan LLM yang disimpan di browser (localStorage).
// Key TIDAK pernah dikirim ke server aplikasi; hanya dipakai untuk memanggil
// endpoint provider OpenAI-compatible yang dipilih pengguna.

const KEY = 'uks_llm_settings_v1';

export const PROVIDERS = [
  {
    id: 'kenari',
    label: 'Kenari.id',
    base: 'https://kenari.id/v1',
    model: 'glm-4-7-flash:free',
    models: [
      'glm-4-7-flash:free',
      'qwen3-6-27b:free',
      'llama-3-3-70b-instruct:free',
      'nemotron-3-5-lightning:free',
      'solar-mini4:free',
    ],
    hint: 'Key diawali kn- (dashboard kenari.id)',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    models: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'qwen/qwen-2.5-72b-instruct',
    ],
    hint: 'Key diawali sk-or-',
  },
  {
    id: 'groq',
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b'],
    hint: 'Key diawali gsk_',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    base: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
    hint: 'Key diawali sk-',
  },
  {
    id: 'together',
    label: 'Together AI',
    base: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Qwen/Qwen2.5-72B-Instruct-Turbo'],
    hint: 'Key dari api.together.xyz',
  },
  {
    id: 'ollama',
    label: 'Ollama (lokal)',
    base: 'http://localhost:11434/v1',
    model: 'llama3.1',
    models: ['llama3.1', 'qwen2.5', 'gemma2'],
    hint: 'Tanpa key, isi "ollama"',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    base: '',
    model: '',
    models: [],
    hint: 'Isi base URL yang berakhiran /v1',
  },
];

export const DEFAULT_SETTINGS = {
  provider: 'ollama',
  base: 'http://localhost:11434/v1',
  model: 'llama3.1',
  key: '',
};

export function getLlmSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch (_) {
    saved = {};
  }
  const provider = PROVIDERS.find((p) => p.id === saved.provider) || PROVIDERS.find((p) => p.id === 'ollama');
  const base = (saved.base || provider.base || '').replace(/\/+$/, '');
  const model = saved.model || provider.model || '';
  const key = saved.key || '';
  const isOllama = (saved.provider || 'ollama') === 'ollama' || base.includes('localhost') || base.includes('127.0.0.1') || base.includes('ollama');
  return {
    provider: provider.id,
    base,
    model,
    key,
    enabled: Boolean(base && model),  // Ollama tidak butuh key
    isOllama,
  };
}

export function saveLlmSettings(next) {
  const payload = {
    provider: next.provider || 'kenari',
    base: (next.base || '').replace(/\/+$/, ''),
    model: next.model || '',
    key: next.key || '',
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  return getLlmSettings();
}

export function clearLlmSettings() {
  localStorage.removeItem(KEY);
  return getLlmSettings();
}

export function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
