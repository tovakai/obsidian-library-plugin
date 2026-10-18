import { requestUrl } from 'obsidian'

// PlayStation Network library and trophies. Sony has no public API: these are
// the PlayStation App's endpoints. Sign-in happens on Sony's own page.

// The PlayStation App's public client: its id, redirect and scopes.
const CLIENT_ID = '09515159-7237-4370-9b40-3806e67c0891'
const CLIENT_BASIC = 'MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A='
export const PSN_REDIRECT = 'com.scee.psxandroid.scecompcall://redirect'
const SCOPE = 'psn:mobile.v2.core psn:clientapp'
const AUTH = 'https://ca.account.sony.com/api/authz/v3/oauth'
const API = 'https://m.np.playstation.com/api'

export interface PsnTokens {
	access: string
	refresh: string
	// Epoch milliseconds.
	expiresAt: number
	refreshExpiresAt: number
}

export function psnAuthUrl(): string {
	const params = [
		'access_type=offline',
		`client_id=${CLIENT_ID}`,
		`redirect_uri=${encodeURIComponent(PSN_REDIRECT)}`,
		'response_type=code',
		`scope=${encodeURIComponent(SCOPE)}`,
	]
	return `${AUTH}/authorize?${params.join('&')}`
}

export function codeFromRedirect(url: string): string | null {
	if (!url.startsWith(PSN_REDIRECT)) return null
	const match = url.match(/[?&]code=([^&#]+)/)
	return match?.[1] ? decodeURIComponent(match[1]) : null
}

async function tokenRequest(fields: Record<string, string>): Promise<PsnTokens | null> {
	const body = Object.keys(fields).map(key => `${key}=${encodeURIComponent(fields[key] ?? '')}`).join('&')
	try {
		const resp = await requestUrl({
			url: `${AUTH}/token`,
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${CLIENT_BASIC}` },
			body,
			throw: false,
		})
		// Only the status is logged: the body carries tokens.
		if (resp.status !== 200) {
			console.error('Library: PlayStation token request failed', resp.status)
			return null
		}
		const json = resp.json as { access_token?: string; refresh_token?: string; expires_in?: number; refresh_token_expires_in?: number }
		if (!json.access_token || !json.refresh_token) return null
		const now = Date.now()
		return {
			access: json.access_token,
			refresh: json.refresh_token,
			expiresAt: now + (json.expires_in ?? 0) * 1000,
			refreshExpiresAt: now + (json.refresh_token_expires_in ?? 0) * 1000,
		}
	} catch (e) {
		console.error('Library: PlayStation token error', e)
		return null
	}
}

export function exchangePsnCode(code: string): Promise<PsnTokens | null> {
	return tokenRequest({ code, redirect_uri: PSN_REDIRECT, grant_type: 'authorization_code', token_format: 'jwt' })
}

export function refreshPsnTokens(refresh: string): Promise<PsnTokens | null> {
	return tokenRequest({ refresh_token: refresh, grant_type: 'refresh_token', scope: SCOPE, token_format: 'jwt' })
}

// A minute of slack so a token does not expire mid-call.
export function psnExpired(tokens: PsnTokens, now: number = Date.now()): boolean {
	return now >= tokens.expiresAt - 60000
}

async function get<T>(token: string, path: string, language = ''): Promise<T | null> {
	const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
	if (language) headers['Accept-Language'] = language
	try {
		const resp = await requestUrl({ url: `${API}${path}`, headers, throw: false })
		if (resp.status !== 200) {
			console.error('Library: PlayStation request failed', path.split('?')[0], resp.status)
			return null
		}
		return resp.json as T
	} catch (e) {
		console.error('Library: PlayStation request error', e)
		return null
	}
}

export interface PsnPlayedGame {
	titleId: string
	name: string
	imageUrl: string | null
	category: string
	playCount: number
	firstPlayed: string | null
	lastPlayed: string | null
	// Whole minutes played.
	minutes: number
	conceptId: number | null
	// Every picture Sony has for the game, by type (PORTRAIT_BANNER, MASTER…).
	images: Record<string, string>
}

// "PT243H18M48S" to minutes.
export function isoMinutes(duration: string | undefined): number {
	const match = (duration ?? '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
	if (!match) return 0
	const [, d, h, m, s] = match
	return Number(d ?? 0) * 1440 + Number(h ?? 0) * 60 + Number(m ?? 0) + Math.round(Number(s ?? 0) / 60)
}

interface RawPlayed {
	titleId?: string
	name?: string
	imageUrl?: string
	category?: string
	playCount?: number
	firstPlayedDateTime?: string
	lastPlayedDateTime?: string
	playDuration?: string
	concept?: { id?: number; media?: { images?: Array<{ url?: string; type?: string }> } }
	media?: { images?: Array<{ url?: string; type?: string }> }
}

function imagesOf(list: Array<{ url?: string; type?: string }>): Record<string, string> {
	const out: Record<string, string> = {}
	for (const image of list) if (image.type && image.url && !out[image.type]) out[image.type] = image.url
	return out
}

// language: the names in another language than the account's, e.g. 'en-US'.
export async function psnPlayedGames(token: string, language = ''): Promise<PsnPlayedGame[] | null> {
	const games: PsnPlayedGame[] = []
	for (let offset = 0; offset < 5000; offset += 200) {
		const page = await get<{ titles?: RawPlayed[]; totalItemCount?: number }>(token,
			`/gamelist/v2/users/me/titles?categories=ps4_game,ps5_native_game&limit=200&offset=${String(offset)}`, language)
		if (!page) return offset === 0 ? null : games
		for (const raw of page.titles ?? []) {
			if (!raw.titleId || !raw.name) continue
			games.push({
				titleId: raw.titleId,
				name: raw.name,
				imageUrl: raw.imageUrl ?? null,
				category: raw.category ?? '',
				playCount: raw.playCount ?? 0,
				firstPlayed: raw.firstPlayedDateTime ?? null,
				lastPlayed: raw.lastPlayedDateTime ?? null,
				minutes: isoMinutes(raw.playDuration),
				conceptId: raw.concept?.id ?? null,
				images: imagesOf([...(raw.media?.images ?? []), ...(raw.concept?.media?.images ?? [])]),
			})
		}
		if (offset + 200 >= (page.totalItemCount ?? 0)) break
	}
	return games
}

export interface TrophyCounts {
	platinum: number
	gold: number
	silver: number
	bronze: number
}

export interface PsnTrophyTitle {
	npCommunicationId: string
	npServiceName: string
	name: string
	iconUrl: string | null
	platform: string
	defined: TrophyCounts
	earned: TrophyCounts
	// 0–100, Sony's own weighting of the trophies earned.
	progress: number
	lastUpdated: string | null
}

interface RawTrophyTitle {
	npCommunicationId?: string
	npServiceName?: string
	trophyTitleName?: string
	trophyTitleIconUrl?: string
	trophyTitlePlatform?: string
	definedTrophies?: Partial<TrophyCounts>
	earnedTrophies?: Partial<TrophyCounts>
	progress?: number
	lastUpdatedDateTime?: string
}

function counts(raw: Partial<TrophyCounts> | undefined): TrophyCounts {
	return { platinum: raw?.platinum ?? 0, gold: raw?.gold ?? 0, silver: raw?.silver ?? 0, bronze: raw?.bronze ?? 0 }
}

export async function psnTrophyTitles(token: string): Promise<PsnTrophyTitle[] | null> {
	const titles: PsnTrophyTitle[] = []
	for (let offset = 0; offset < 5000; offset += 800) {
		const page = await get<{ trophyTitles?: RawTrophyTitle[]; totalItemCount?: number }>(token,
			`/trophy/v1/users/me/trophyTitles?limit=800&offset=${String(offset)}`)
		if (!page) return offset === 0 ? null : titles
		for (const raw of page.trophyTitles ?? []) {
			if (!raw.npCommunicationId || !raw.trophyTitleName) continue
			titles.push({
				npCommunicationId: raw.npCommunicationId,
				npServiceName: raw.npServiceName ?? 'trophy',
				name: raw.trophyTitleName,
				iconUrl: raw.trophyTitleIconUrl ?? null,
				platform: raw.trophyTitlePlatform ?? '',
				defined: counts(raw.definedTrophies),
				earned: counts(raw.earnedTrophies),
				progress: raw.progress ?? 0,
				lastUpdated: raw.lastUpdatedDateTime ?? null,
			})
		}
		if (offset + 800 >= (page.totalItemCount ?? 0)) break
	}
	return titles
}

export interface PsnTrophySummary {
	level: number
	// 0–100 towards the next level.
	progress: number
	earned: TrophyCounts
}

export async function psnTrophySummary(token: string): Promise<PsnTrophySummary | null> {
	const raw = await get<{ trophyLevel?: number | string; progress?: number; earnedTrophies?: Partial<TrophyCounts> }>(token, '/trophy/v1/users/me/trophySummary')
	if (!raw) return null
	return { level: Number(raw.trophyLevel ?? 0), progress: raw.progress ?? 0, earned: counts(raw.earnedTrophies) }
}

export async function psnTrophyIdsFor(token: string, titleIds: string[]): Promise<Map<string, string>> {
	const out = new Map<string, string>()
	for (let i = 0; i < titleIds.length; i += 5) {
		const batch = titleIds.slice(i, i + 5)
		const raw = await get<{ titles?: Array<{ npTitleId?: string; trophyTitles?: Array<{ npCommunicationId?: string }> }> }>(token,
			`/trophy/v1/users/me/titles/trophyTitles?npTitleIds=${batch.map(encodeURIComponent).join(',')}`)
		for (const title of raw?.titles ?? []) {
			const id = title.trophyTitles?.[0]?.npCommunicationId
			if (title.npTitleId && id) out.set(title.npTitleId, id)
		}
	}
	return out
}

export type TrophyGrade = 'platinum' | 'gold' | 'silver' | 'bronze'

// A trophy or a Steam achievement; Steam has no grades.
export interface PsnTrophy {
	grade: TrophyGrade | null
	name: string
	detail: string
	iconUrl: string | null
	earnedAt: string
	// Share of players who have it, 0–100.
	rate: number | null
}

interface RawTrophy {
	trophyId?: number
	trophyType?: string
	trophyName?: string
	trophyDetail?: string
	trophyIconUrl?: string
	earned?: boolean
	earnedDateTime?: string
	trophyEarnedRate?: string
}

const GRADE_ORDER: TrophyGrade[] = ['platinum', 'gold', 'silver', 'bronze']

// Earned trophies: names and icons from the game's list, dates from the member's.
export function earnedTrophies(defs: RawTrophy[], mine: RawTrophy[]): PsnTrophy[] {
	const byId = new Map(defs.map(def => [def.trophyId, def]))
	const out: PsnTrophy[] = []
	for (const own of mine) {
		if (!own.earned || !own.earnedDateTime) continue
		const def = byId.get(own.trophyId) ?? {}
		const grade = (own.trophyType ?? def.trophyType ?? '') as TrophyGrade
		if (GRADE_ORDER.indexOf(grade) < 0) continue
		const rate = Number(own.trophyEarnedRate)
		out.push({
			grade,
			name: def.trophyName ?? '',
			detail: def.trophyDetail ?? '',
			iconUrl: def.trophyIconUrl ?? null,
			earnedAt: own.earnedDateTime,
			rate: own.trophyEarnedRate && Number.isFinite(rate) ? rate : null,
		})
	}
	const rank = (grade: TrophyGrade | null): number => grade ? GRADE_ORDER.indexOf(grade) : GRADE_ORDER.length
	return out.sort((a, b) => rank(a.grade) - rank(b.grade) || b.earnedAt.localeCompare(a.earnedAt))
}

// Sony reads only a full tag ("ru-RU", not "ru") and only home regions ("ru-PH" falls back to English).
const PSN_REGIONS: Record<string, string> = { en: 'US', ja: 'JP', ko: 'KR', zh: 'CN', uk: 'UA', cs: 'CZ', da: 'DK', sv: 'SE', el: 'GR', he: 'IL', vi: 'VN', nb: 'NO', ar: 'AE', hi: 'IN', ms: 'MY', fa: 'IR', be: 'BY', kk: 'KZ', ca: 'ES', sr: 'RS', sl: 'SI', et: 'EE' }
export function psnLanguage(language: string): string {
	if (language.indexOf('-') > 0) return language
	return `${language}-${PSN_REGIONS[language] ?? language.toUpperCase()}`
}

export async function psnEarnedTrophies(token: string, titleId: string, language = ''): Promise<{ trophies: PsnTrophy[]; total: number } | null> {
	const ids = await get<{ titles?: Array<{ trophyTitles?: Array<{ npCommunicationId?: string; npServiceName?: string }> }> }>(token,
		`/trophy/v1/users/me/titles/trophyTitles?npTitleIds=${encodeURIComponent(titleId)}`)
	if (!ids) return null
	const title = ids.titles?.[0]?.trophyTitles?.[0]
	if (!title?.npCommunicationId) return { trophies: [], total: 0 }
	const id = encodeURIComponent(title.npCommunicationId)
	const path = `/trophyGroups/all/trophies?npServiceName=${encodeURIComponent(title.npServiceName ?? 'trophy')}`
	const [defs, mine] = await Promise.all([
		get<{ trophies?: RawTrophy[] }>(token, `/trophy/v1/npCommunicationIds/${id}${path}`, language),
		get<{ trophies?: RawTrophy[] }>(token, `/trophy/v1/users/me/npCommunicationIds/${id}${path}`),
	])
	if (!defs || !mine) return null
	return { trophies: earnedTrophies(defs.trophies ?? [], mine.trophies ?? []), total: (defs.trophies ?? []).length }
}

// A library game: bought, PS Plus or free to play (apps come along too).
export interface PsnOwnedGame {
	titleId: string
	name: string
	platform: string
	imageUrl: string | null
	conceptId: number | null
	// 'NONE' when bought or free; 'PS_PLUS' when claimed through a subscription.
	service: string
}

type OwnedPage = { data?: { purchasedTitlesRetrieve?: { games?: RawOwned[] } } }

interface RawOwned {
	titleId?: string
	name?: string
	platform?: string
	image?: { url?: string }
	conceptId?: number | string | null
	subscriptionService?: string
	membership?: string
	isActive?: boolean
}

const PURCHASED_QUERY = '827a423f6a8ddca4107ac01395af2ec0eafd8396fc7fa204aaf9b7ed2eefa168'

export async function psnOwnedGames(token: string): Promise<PsnOwnedGame[] | null> {
	const games: PsnOwnedGame[] = []
	const seen = new Set<string>()
	for (const service of ['NONE', 'PS_PLUS']) {
		for (let start = 0; start < 5000; start += 200) {
			const variables = { isActive: true, platform: ['ps4', 'ps5'], size: 200, start, sortBy: 'ACTIVE_DATE', sortDirection: 'desc', subscriptionService: service }
			const extensions = { persistedQuery: { version: 1, sha256Hash: PURCHASED_QUERY } }
			const url = 'https://web.np.playstation.com/api/graphql/v1/op?operationName=getPurchasedGameList'
				+ `&variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify(extensions))}`
			let page: OwnedPage | null = null
			try {
				const resp = await requestUrl({
					url,
					// Authorization Sony expects, plus the preflight pair against CSRF: apollo-require-preflight and Content-Type.
					headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'apollo-require-preflight': 'true' },
					throw: false,
				})
				if (resp.status === 200) page = resp.json as OwnedPage
				else console.error('Library: PlayStation library request failed', resp.status)
			} catch (e) {
				console.error('Library: PlayStation library request error', e)
			}
			if (page === null) return games.length > 0 ? games : null
			const batch = page.data?.purchasedTitlesRetrieve?.games ?? []
			for (const raw of batch) {
				if (!raw.titleId || !raw.name || seen.has(raw.titleId)) continue
				seen.add(raw.titleId)
				games.push({
					titleId: raw.titleId,
					name: raw.name,
					platform: raw.platform ?? '',
					imageUrl: raw.image?.url ?? null,
					conceptId: raw.conceptId === null || raw.conceptId === undefined ? null : Number(raw.conceptId),
					service: raw.subscriptionService ?? raw.membership ?? 'NONE',
				})
			}
			if (batch.length < 200) break
		}
	}
	return games
}

// Strip the trademark signs Sony puts in titles: "EA SPORTS FC™ 25".
export function cleanPsnName(name: string): string {
	return name.replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim()
}

// "0/1 · 2/3 · 9/15 · 43/75": platinum, gold, silver, bronze, earned of defined.
export function trophyLine(earned: TrophyCounts, defined: TrophyCounts): string {
	return (['platinum', 'gold', 'silver', 'bronze'] as const)
		.map(grade => `${String(earned[grade])}/${String(defined[grade])}`)
		.join(' · ')
}

export function trophyTotal(counts: TrophyCounts): number {
	return counts.platinum + counts.gold + counts.silver + counts.bronze
}

export interface PsnStats {
	games: number
	minutes: number
	level: number
	earned: TrophyCounts
	updated: number
}
