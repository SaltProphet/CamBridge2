const PROVIDERS_REQUIRING_SECRETS = {
  resend: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
  daily: ['DAILY_API_KEY']
};

export function assertRequiredEnv(vars, context) {
  const missing = vars.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`${context} is missing required environment variables: ${missing.join(', ')}`);
  }
}

export function assertProviderSecrets(providerType, providerName) {
  const provider = (providerName || '').toLowerCase();
  const required = PROVIDERS_REQUIRING_SECRETS[provider] || [];
  if (required.length > 0) {
    assertRequiredEnv(required, `${providerType} provider "${provider}"`);
  }
}
