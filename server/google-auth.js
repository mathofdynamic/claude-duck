import { google } from 'googleapis'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_PATH = join(__dirname, 'credentials.json')
const TOKEN_PATH = join(__dirname, 'tokens.json')

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
]

export function credentialsExist() {
  return existsSync(CREDENTIALS_PATH)
}

export function isAuthenticated() {
  return existsSync(TOKEN_PATH)
}

function loadCredentials() {
  if (!existsSync(CREDENTIALS_PATH)) {
    throw new Error('credentials.json not found — see setup instructions at http://localhost:3001')
  }
  const raw = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'))
  // Supports both "web" and "installed" (desktop) app credential types
  return raw.web || raw.installed
}

export function createOAuth2Client() {
  const creds = loadCredentials()
  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    'http://localhost:3001/auth/callback'
  )
}

export function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // always get refresh token
  })
}

export function saveTokens(tokens) {
  writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))
}

export function loadTokens() {
  if (!existsSync(TOKEN_PATH)) return null
  return JSON.parse(readFileSync(TOKEN_PATH, 'utf8'))
}

export function getAuthenticatedClient() {
  const tokens = loadTokens()
  if (!tokens) {
    throw new Error('Not authenticated. Visit http://localhost:3001 and click "Connect Google Account".')
  }

  const client = createOAuth2Client()
  client.setCredentials(tokens)

  // Persist any refreshed tokens automatically
  client.on('tokens', (newTokens) => {
    const current = loadTokens() || {}
    saveTokens({ ...current, ...newTokens })
  })

  return client
}
