import { requestUrl } from 'obsidian'

// Nintendo Switch play activity. No public API: the app's Coral API takes only
// requests signed and encrypted by its own code, done through a third-party
// signing service; only the session token Nintendo returns is kept.

// The Nintendo Switch app's Nintendo Account client.
const NA_CLIENT = '71b963c1b7b6d119'
export const NINTENDO_REDIRECT = `npf${NA_CLIENT}://auth`
const NA_SCOPE = 'openid user user.birthday user.screenName'
const NA_AUTH = 'https://accounts.nintendo.com/connect/1.0.0'
const NA_API = 'https://api.accounts.nintendo.com/2.0.0'
const CORAL = 'https://api-lp1.znc.srv.nintendo.net'

// The signing service and this plugin's public client; the id is all it takes.
const SIGNER_TOKEN = 'https://nxapi-auth.fancy.org.uk/api/oauth/token'
const SIGNER_CLIENT = 'PWel8OIrEux7ABhjDItZ3g'
const SIGNER_API = 'https://nxapi-znca-api.fancy.org.uk/api/znca/'
// The API generation the client was written against; an unknown one is refused.
const SIGNER_CLIENT_VERSION = 'd8fAZDPzwimzQ7c6'
export const SIGNER_PROJECT = 'https://github.com/samuelthomas2774/nxapi-znca-api'
const USER_AGENT = 'obsidian-library-plugin (+https://github.com/venvk/obsidian-library-plugin)'

export interface NintendoTokens {
	// Long-lived; mints the short-lived Nintendo Account tokens.
	session: string
	naId: string
}

function base64(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] as number)
	return btoa(binary)
}

function base64Url(bytes: Uint8Array): string {
	return base64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Standard or URL-safe base64, padded or not.
function fromBase64(text: string): Uint8Array {
	const plain = text.replace(/-/g, '+').replace(/_/g, '/')
	const binary = atob(plain + '='.repeat((4 - (plain.length % 4)) % 4))
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

function randomBytes(count: number): Uint8Array {
	const values = new Uint8Array(count)
	crypto.getRandomValues(values)
	return values
}

export interface NintendoAuth {
	url: string
	verifier: string
}

export async function nintendoAuth(): Promise<NintendoAuth> {
	const verifier = base64Url(randomBytes(32))
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
	const params = new URLSearchParams({
		state: base64Url(randomBytes(36)),
		redirect_uri: NINTENDO_REDIRECT,
		client_id: NA_CLIENT,
		scope: NA_SCOPE,
		response_type: 'session_token_code',
		session_token_code_challenge: base64Url(new Uint8Array(digest)),
		session_token_code_challenge_method: 'S256',
		theme: 'login_form',
	})
	return { url: `${NA_AUTH}/authorize?${params.toString()}`, verifier }
}

// session_token_code from the npf…://auth fragment.
export function codeFromRedirect(url: string): string | null {
	// The host must be exactly `auth`, not a longer name that starts with it.
	if (!url.startsWith(NINTENDO_REDIRECT) || !/^(?:[/?#]|$)/.test(url.slice(NINTENDO_REDIRECT.length))) return null
	const match = /[?&#]session_token_code=([^&#]+)/.exec(url)
	return match?.[1] ? decodeURIComponent(match[1]) : null
}

// The session token for the code. Only statuses are logged; bodies carry tokens.
async function sessionToken(code: string, verifier: string): Promise<string | null> {
	const resp = await requestUrl({
		url: `${NA_AUTH}/api/session_token`,
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': 'NASDKAPI; Android' },
		body: new URLSearchParams({ client_id: NA_CLIENT, session_token_code: code, session_token_code_verifier: verifier }).toString(),
		throw: false,
	})
	if (resp.status !== 200) {
		console.error('Library: Nintendo session token failed', resp.status)
		return null
	}
	return (resp.json as { session_token?: string }).session_token ?? null
}

interface NaToken {
	idToken: string
	access: string
}

async function naToken(session: string): Promise<NaToken | null> {
	const resp = await requestUrl({
		url: `${NA_AUTH}/api/token`,
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 8.0.0)' },
		body: JSON.stringify({ client_id: NA_CLIENT, session_token: session, grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token' }),
		throw: false,
	})
	if (resp.status !== 200) {
		console.error('Library: Nintendo account token failed', resp.status)
		return null
	}
	const json = resp.json as { id_token?: string, access_token?: string }
	return json.id_token && json.access_token ? { idToken: json.id_token, access: json.access_token } : null
}

interface NaUser {
	id: string
	language: string
}

async function naUser(access: string): Promise<NaUser | null> {
	const resp = await requestUrl({
		url: `${NA_API}/users/me`,
		headers: { Authorization: `Bearer ${access}`, Accept: 'application/json', 'User-Agent': 'NASDKAPI; Android' },
		throw: false,
	})
	if (resp.status !== 200) {
		console.error('Library: Nintendo account user failed', resp.status)
		return null
	}
	const json = resp.json as { id?: string, language?: string }
	return json.id ? { id: json.id, language: json.language ?? 'en-GB' } : null
}

export async function exchangeNintendoCode(code: string, verifier: string): Promise<NintendoTokens | null> {
	try {
		const session = await sessionToken(code, verifier)
		if (!session) return null
		const token = await naToken(session)
		const user = token ? await naUser(token.access) : null
		return user ? { session, naId: user.id } : null
	} catch (e) {
		console.error('Library: Nintendo sign-in error', e)
		return null
	}
}

// The signing service's token, kept for its lifetime as the service's terms ask.
interface Signer {
	token: string
	expires: number
	version: string
}

let signer: Signer | null = null

async function signerSession(): Promise<Signer | null> {
	if (signer && signer.expires > Date.now() + 60000) return signer
	const [token, config] = await Promise.all([
		requestUrl({
			url: SIGNER_TOKEN,
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': USER_AGENT },
			body: new URLSearchParams({ grant_type: 'client_credentials', client_id: SIGNER_CLIENT, scope: 'ca:gf ca:er ca:dr' }).toString(),
			throw: false,
		}),
		requestUrl({ url: `${SIGNER_API}config`, headers: { 'User-Agent': USER_AGENT }, throw: false }),
	])
	if (token.status !== 200 || config.status !== 200) {
		console.error('Library: signing service sign-in failed', token.status, config.status)
		return null
	}
	const access = token.json as { access_token?: string, expires_in?: number }
	const versions = (config.json as { versions?: { platform?: string, version?: string }[] }).versions ?? []
	const version = versions.find(v => v.platform === 'Android')?.version
	if (!access.access_token || !version) return null
	signer = { token: access.access_token, expires: Date.now() + (access.expires_in ?? 600) * 1000, version }
	return signer
}

async function signerPost(session: Signer, path: string, body: unknown, accept = 'application/json'): Promise<{ status: number, text: string }> {
	const resp = await requestUrl({
		url: SIGNER_API + path,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: accept,
			'User-Agent': USER_AGENT,
			'X-znca-Platform': 'Android',
			'X-znca-Version': session.version,
			'X-znca-Client-Version': SIGNER_CLIENT_VERSION,
			Authorization: `Bearer ${session.token}`,
		},
		body: JSON.stringify(body),
		throw: false,
	})
	return { status: resp.status, text: resp.text }
}

// Coral answers plain JSON for errors, otherwise encrypted text.
interface CoralEnvelope<T> {
	status?: number
	result?: T
	errorMessage?: string
}

async function coralAnswer<T>(session: Signer, resp: { status: number, arrayBuffer: ArrayBuffer }, path: string): Promise<T | null> {
	let json: CoralEnvelope<T>
	try {
		json = JSON.parse(new TextDecoder().decode(resp.arrayBuffer)) as CoralEnvelope<T>
	} catch {
		const plain = await signerPost(session, 'decrypt-response', { data: base64(new Uint8Array(resp.arrayBuffer)) }, 'text/plain')
		if (plain.status !== 200) {
			console.error('Library: Nintendo response decryption failed', path, plain.status)
			return null
		}
		try {
			json = JSON.parse(plain.text) as CoralEnvelope<T>
		} catch {
			console.error('Library: Nintendo response unreadable', path, resp.status)
			return null
		}
	}
	if (json.status !== 0 || json.result === undefined) {
		console.error('Library: Nintendo request failed', path, resp.status, json.status, json.errorMessage)
		return null
	}
	return json.result
}

interface CoralLogin {
	token: string
	nsaId: string
	expires: number
}

// The signing service takes one sign-in per token: the Coral login is kept with
// the token that made it, and a new login gets a new token.
let coral: { login: CoralLogin, session: Signer, owner: string } | null = null

// The signing service signs (f) and encrypts; Coral answers with its token.
async function coralLogin(session: Signer, idToken: string, user: NaUser): Promise<CoralLogin | null> {
	const url = `${CORAL}/v4/Account/Login`
	const signed = await signerPost(session, 'f', {
		hash_method: '1',
		token: idToken,
		na_id: user.id,
		encrypt_token_request: { url, parameter: { naIdToken: idToken, language: user.language, timestamp: 0, requestId: '', f: '' } },
	})
	if (signed.status !== 200) {
		console.error('Library: Nintendo signature failed', signed.status, signed.text.slice(0, 200))
		return null
	}
	const body = (JSON.parse(signed.text) as { encrypted_token_request?: string }).encrypted_token_request
	if (!body) return null
	const resp = await requestUrl({
		url,
		method: 'POST',
		headers: {
			'X-Platform': 'Android',
			'X-ProductVersion': session.version,
			'Content-Type': 'application/octet-stream',
			Accept: 'application/octet-stream,application/json',
			'User-Agent': `com.nintendo.znca/${session.version}(Android/12)`,
		},
		body: fromBase64(body).buffer as ArrayBuffer,
		throw: false,
	})
	const result = await coralAnswer<{ user?: { nsaId?: string }, webApiServerCredential?: { accessToken?: string, expiresIn?: number } }>(session, resp, url)
	const token = result?.webApiServerCredential?.accessToken
	const nsaId = result?.user?.nsaId
	return token && nsaId ? { token, nsaId, expires: Date.now() + (result?.webApiServerCredential?.expiresIn ?? 0) * 1000 } : null
}

async function coralCall<T>(session: Signer, login: CoralLogin, path: string, parameter: Record<string, unknown>): Promise<T | null> {
	const url = CORAL + path
	const sealed = await signerPost(session, 'encrypt-request', { url, token: login.token, data: JSON.stringify({ parameter }) })
	if (sealed.status !== 200) {
		console.error('Library: Nintendo request encryption failed', path, sealed.status)
		return null
	}
	const data = (JSON.parse(sealed.text) as { data?: string }).data
	if (!data) return null
	const resp = await requestUrl({
		url,
		method: 'POST',
		headers: {
			'Content-Type': 'application/octet-stream',
			Accept: 'application/octet-stream,application/json',
			'Accept-Language': 'en-GB',
			'User-Agent': `com.nintendo.znca/${session.version}(Android/12)`,
			Authorization: `Bearer ${login.token}`,
			Pragma: 'no-cache',
			'Cache-Control': 'no-cache',
		},
		body: fromBase64(data).buffer as ArrayBuffer,
		throw: false,
	})
	return coralAnswer<T>(session, resp, path)
}

export interface NintendoPlayedGame {
	name: string
	imageUri: string | null
	shopUri: string | null
	// Minutes played, as Coral reports them.
	totalPlayTime: number
	// Epoch seconds, 0 when unknown.
	firstPlayedAt: number
}

// The play log mixes video and music apps in with the games, told apart by name.
// ponytail: fixed list of the apps the eShop carries, extend when one slips through.
const MEDIA_APP = /^(youtube|netflix|hulu|twitch|crunchyroll|funimation|disney\+|prime video|amazon prime video|spotify|pluto tv|plex|dazn|abema|niconico|u-next|tubi|vevo)$/i

export function isMediaApp(name: string): boolean {
	return MEDIA_APP.test(name.replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim())
}

export async function nintendoPlayLog(tokens: NintendoTokens): Promise<NintendoPlayedGame[] | null> {
	try {
		const soon = Date.now() + 60000
		let held = coral && coral.owner === tokens.session && coral.login.expires > soon && coral.session.expires > soon ? coral : null
		if (!held) {
			coral = null
			signer = null
			const session = await signerSession()
			if (!session) return null
			const na = await naToken(tokens.session)
			const user = na ? await naUser(na.access) : null
			if (!na || !user) return null
			const login = await coralLogin(session, na.idToken, user)
			if (!login) return null
			held = coral = { login, session, owner: tokens.session }
		}
		const { login, session } = held
		const games = await coralCall<Array<Partial<NintendoPlayedGame>>>(session, login, '/v4/User/PlayLog/Show', { nsaId: login.nsaId })
		if (!games) { coral = null; return null }
		return games.filter(game => !!game.name && !isMediaApp(game.name)).map(game => ({
			name: game.name as string,
			imageUri: game.imageUri ?? null,
			shopUri: game.shopUri ?? null,
			totalPlayTime: Number(game.totalPlayTime) || 0,
			firstPlayedAt: Number(game.firstPlayedAt) || 0,
		}))
	} catch (e) {
		console.error('Library: Nintendo play activity error', e)
		return null
	}
}

export interface NintendoStats {
	games: number
	minutes: number
	updated: number
}
