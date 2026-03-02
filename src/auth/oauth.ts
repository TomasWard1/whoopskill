import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import open from 'open';
import { saveTokens, clearTokens, getTokenStatus, getValidTokens, isTokenExpired, loadTokens } from './tokens.js';
import { getCredentials as getStoredCredentials, saveConfig } from './config.js';
import { WhoopError, ExitCode } from '../utils/errors.js';
import type { OAuthTokenResponse } from '../types/whoop.js';

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const SCOPES = 'read:profile read:body_measurement read:workout read:recovery read:sleep read:cycles offline';

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function resolveCredentials(): Promise<{ clientId: string; clientSecret: string; redirectUri: string }> {
  const stored = getStoredCredentials();
  if (stored) return stored;

  // Interactive onboarding — prompt for credentials
  console.error('No WHOOP credentials found. Let\'s set them up.\n');
  console.error('Get your credentials at: https://developer.whoop.com\n');

  const clientId = await prompt('Client ID: ');
  const clientSecret = await prompt('Client Secret: ');
  let redirectUri = await prompt('Redirect URI (enter for http://localhost:8787/callback): ');
  if (!redirectUri) redirectUri = 'http://localhost:8787/callback';

  if (!clientId || !clientSecret) {
    throw new WhoopError('Client ID and Client Secret are required', ExitCode.AUTH_ERROR);
  }

  saveConfig({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri });
  console.error('\nCredentials saved to ~/.whoop-cli/config.json\n');

  return { clientId, clientSecret, redirectUri };
}

export async function login(): Promise<void> {
  const { clientId, clientSecret, redirectUri } = await resolveCredentials();
  const state = randomBytes(16).toString('hex');

  const authUrl = new URL(WHOOP_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);

  console.error('Opening browser for authorization...');
  console.error('\nIf browser does not open, visit this URL:\n');
  console.error(authUrl.toString());
  console.error('');

  await open(authUrl.toString()).catch(() => {});

  const callbackUrl = await prompt('Paste the callback URL here: ');

  const url = new URL(callbackUrl);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (!code) {
    throw new WhoopError('No authorization code in callback URL', ExitCode.AUTH_ERROR);
  }

  if (returnedState !== state) {
    throw new WhoopError('OAuth state mismatch', ExitCode.AUTH_ERROR);
  }

  const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new WhoopError(`Token exchange failed: ${text}`, ExitCode.AUTH_ERROR, tokenResponse.status);
  }

  const tokens = (await tokenResponse.json()) as OAuthTokenResponse;
  saveTokens(tokens);
  console.log(JSON.stringify({ success: true, message: 'Authentication successful' }));
}

export function logout(): void {
  clearTokens();
  console.log(JSON.stringify({ success: true, message: 'Logged out' }));
}

export function status(): void {
  const tokenStatus = getTokenStatus();
  const tokens = loadTokens();

  if (!tokenStatus.authenticated) {
    console.log(JSON.stringify({ authenticated: false, message: 'Not logged in. Run: whoop-cli auth login' }, null, 2));
    process.exit(ExitCode.AUTH_ERROR);
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = tokenStatus.expires_at! - now;
  const needsRefresh = isTokenExpired(tokens!);

  console.log(JSON.stringify({
    authenticated: true,
    expires_at: tokenStatus.expires_at,
    expires_in_seconds: expiresIn,
    expires_in_human: expiresIn > 0 ? `${Math.floor(expiresIn / 60)} minutes` : 'EXPIRED',
    needs_refresh: needsRefresh,
  }, null, 2));
}

/**
 * Proactively refresh the access token.
 * Use this in cron jobs to keep tokens fresh.
 */
export async function refresh(): Promise<void> {
  const tokens = loadTokens();
  
  if (!tokens) {
    throw new WhoopError('Not authenticated. Run: whoop-cli auth login', ExitCode.AUTH_ERROR);
  }

  try {
    const newTokens = await getValidTokens();
    
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = newTokens.expires_at - now;
    
    console.log(JSON.stringify({
      success: true,
      message: 'Token refreshed successfully',
      expires_at: newTokens.expires_at,
      expires_in_seconds: expiresIn,
      expires_in_human: `${Math.floor(expiresIn / 60)} minutes`,
    }, null, 2));
  } catch (error) {
    if (error instanceof WhoopError && error.message.includes('refresh')) {
      throw new WhoopError(
        'Refresh token expired. Please re-authenticate with: whoop-cli auth login',
        ExitCode.AUTH_ERROR
      );
    }
    throw error;
  }
}
