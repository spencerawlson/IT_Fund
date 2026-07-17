const toSnakeCase = (value) => {
  if (!value) return value;
  return String(value)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

const storage = {
  getItem: (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch {}
  }
};

const getAppParamValue = (paramName, { defaultValue = '' } = {}) => {
  const stored = storage.getItem(`app_${toSnakeCase(paramName)}`);
  return stored || defaultValue || '';
};

export const appParams = {
  get storageKey() {
    return `base44_${toSnakeCase('app_id')}`;
  },
  get appId() {
    return getAppParamValue('app_id', { defaultValue: import.meta.env.VITE_APP_ID || '' });
  },
  get token() {
    return storage.getItem('it_fund_access_token');
  },
  get functionsVersion() {
    return getAppParamValue('functions_version', { defaultValue: '2024-01-01' });
  },
  get appBaseUrl() {
    return getAppParamValue('app_base_url', { defaultValue: import.meta.env.VITE_API_BASE_URL || '/api' });
  },
  clear() {
    storage.removeItem('base44_access_token');
    storage.removeItem('base44_app_id');
    storage.removeItem('it_fund_access_token');
    storage.removeItem('it_fund_user');
  }
};

export default appParams;
