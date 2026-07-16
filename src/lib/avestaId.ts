// Client-side session handling for AvestaID SSO. This app is a static SPA
// with no server and no router, so the whole login handoff happens via
// browser redirects, a `?code=` query param, and localStorage.
//
// Ported from the sister apps' copy — near-identical on purpose so all
// apps stay easy to diff/update together.

const STORAGE_KEY = 'avestaid_session'
const EXPIRY_BUFFER_MS = 60_000 // treat a token as expired 60s before it actually is

const AVESTAID_PORTAL_URL = import.meta.env.VITE_AVESTAID_PORTAL_URL as string
const AVESTAID_SUPABASE_URL = import.meta.env.VITE_AVESTAID_SUPABASE_URL as string
const AVESTAID_SUPABASE_ANON_KEY = import.meta.env.VITE_AVESTAID_SUPABASE_ANON_KEY as string
const APP_SLUG = 'cloudservice'

// PKCE (RFC 7636): binds the one-time login code to this browser. The
// verifier never leaves this tab (sessionStorage + a POST body) — only its
// SHA-256 hash travels in the portal redirect URL — so a code intercepted
// via logs/Referer/XSS can't be redeemed by anyone else.
const PKCE_VERIFIER_KEY = 'avestaid_pkce_verifier'

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return base64UrlEncode(new Uint8Array(digest))
}

export interface AvestaUser {
  id: string
  email: string
  fullName: string | null
}

export interface AvestaSession {
  accessToken: string
  expiresAt: number
  appRole: string
  user: AvestaUser
}

type Listener = (session: AvestaSession | null) => void
const listeners = new Set<Listener>()

function readSession(): AvestaSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AvestaSession
  } catch {
    return null
  }
}

function writeSession(session: AvestaSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
  listeners.forEach((cb) => cb(session))
}

function isValid(session: AvestaSession | null): session is AvestaSession {
  return !!session && session.expiresAt - EXPIRY_BUFFER_MS > Date.now()
}

async function redirectToLogin(returnTo: string) {
  const codeVerifier = generateCodeVerifier()
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
  const codeChallenge = await sha256Base64Url(codeVerifier)

  const url = new URL('/login', AVESTAID_PORTAL_URL)
  url.searchParams.set('app', APP_SLUG)
  url.searchParams.set('return_to', returnTo)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  window.location.href = url.toString()
}

export async function ensureSession(): Promise<AvestaSession | null> {
  const session = readSession()
  if (isValid(session)) return session

  await redirectToLogin(window.location.href)
  return new Promise(() => {}) // navigating away; nothing left to resolve
}

export async function getAccessToken(): Promise<string | null> {
  const session = readSession()
  return isValid(session) ? session.accessToken : null
}

export function getUser(): AvestaUser | null {
  const session = readSession()
  return isValid(session) ? session.user : null
}

export function onSessionChange(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function signOut(): Promise<void> {
  writeSession(null)
}

export function hasCallbackCode(): boolean {
  return new URLSearchParams(window.location.search).has('code')
}

// React StrictMode (dev) double-invokes effects, which would otherwise
// redeem this single-use code twice — the second attempt fails with
// "invalid_or_expired_code", leaving the app stuck on a blank screen.
// Share the in-flight promise across the duplicate invocation instead of
// starting a second redemption.
let inFlightCallback: Promise<{ returnTo: string }> | null = null

export function handleCallback(): Promise<{ returnTo: string }> {
  if (inFlightCallback) return inFlightCallback
  inFlightCallback = redeemCallback().finally(() => {
    inFlightCallback = null
  })
  return inFlightCallback
}

async function redeemCallback(): Promise<{ returnTo: string }> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const returnTo = params.get('return_to') ?? '/'
  if (!code) throw new Error('Callback sem código de login.')

  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  if (!codeVerifier) throw new Error('Verificador PKCE ausente — refaça o login.')

  const response = await fetch(`${AVESTAID_SUPABASE_URL}/functions/v1/exchange-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AVESTAID_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  })

  if (!response.ok) {
    throw new Error('Não foi possível concluir o login pelo AvestaID.')
  }

  const data = await response.json()
  const session: AvestaSession = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    appRole: data.app_role,
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.full_name,
    },
  }
  writeSession(session)
  window.history.replaceState({}, '', window.location.pathname)

  return { returnTo }
}
