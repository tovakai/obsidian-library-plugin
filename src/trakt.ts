import { requestUrl } from 'obsidian'
import type { EpisodeRating, WatchedTitle } from './watchSites'

// Trakt sync. Apps made since October 2026 get no client secret: the device
// flow signs in with the client id alone, and refresh tokens are single-use.
export const TRAKT_CLIENT_ID = 'd2OJSAlH_zO6Rh0umLyLUDLht6BtzqZ45j5tU62IufY'
// Must match a redirect URI of the Trakt app; the refresh grant asks for it.
export const TRAKT_REDIRECT = 'https://github.com/venvk/obsidian-library-plugin'
const AUTH = 'https://auth.trakt.tv'
const API = 'https://api.trakt.tv'
const USER_AGENT = 'obsidian-library-plugin (+https://github.com/venvk/obsidian-library-plugin)'

export interface TraktTokens {
	access: string
	refresh: string
	expiresAt: number
}

// What Trakt is known to hold for a title: score, watchlist, episode scores,
// watched episodes ("season:episode") and, for a movie, a play.
export interface TraktEcho {
	r: number
	l?: boolean
	e?: Record<string, number>
	w?: string[]
	m?: boolean
}

export interface TraktDevice {
	device: string
	user: string
	url: string
	interval: number
	expiresAt: number
}

async function post<T>(url: string, body: unknown, token = ''): Promise<{ status: number; json: T | null }> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT }
	if (token) {
		headers['trakt-api-version'] = '2'
		headers['trakt-api-key'] = TRAKT_CLIENT_ID
		headers.Authorization = `Bearer ${token}`
	}
	try {
		const resp = await requestUrl({ url, method: 'POST', headers, body: JSON.stringify(body), throw: false })
		let json: T | null = null
		try {
			json = resp.json as T
		} catch {
			json = null
		}
		return { status: resp.status, json }
	} catch (e) {
		console.error('Library: Trakt request error', e)
		return { status: 0, json: null }
	}
}

async function get<T>(token: string, path: string): Promise<T | null> {
	try {
		const resp = await requestUrl({
			url: API + path,
			headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_CLIENT_ID, Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
			throw: false,
		})
		if (resp.status !== 200) {
			console.error('Library: Trakt request failed', path.split('?')[0], resp.status)
			return null
		}
		return resp.json as T
	} catch (e) {
		console.error('Library: Trakt request error', e)
		return null
	}
}

function tokens(json: { access_token?: string; refresh_token?: string; expires_in?: number } | null): TraktTokens | null {
	if (!json?.access_token || !json.refresh_token) return null
	return { access: json.access_token, refresh: json.refresh_token, expiresAt: Date.now() + (json.expires_in ?? 0) * 1000 }
}

export async function traktDevice(): Promise<TraktDevice | null> {
	const { status, json } = await post<{ device_code?: string; user_code?: string; verification_url?: string; interval?: number; expires_in?: number }>(`${AUTH}/oauth/device/code`, { client_id: TRAKT_CLIENT_ID })
	if (status !== 200 || !json?.device_code || !json.user_code) return null
	return {
		device: json.device_code,
		user: json.user_code,
		url: json.verification_url ?? `${AUTH}/activate`,
		interval: Math.max(1, json.interval ?? 5),
		expiresAt: Date.now() + (json.expires_in ?? 600) * 1000,
	}
}

// One poll: tokens once approved, 'wait' while pending, null when denied or expired.
export async function traktDeviceToken(device: TraktDevice): Promise<TraktTokens | 'wait' | null> {
	if (Date.now() > device.expiresAt) return null
	const { status, json } = await post<{ access_token?: string; refresh_token?: string; expires_in?: number }>(`${AUTH}/oauth/device/token`, { code: device.device, client_id: TRAKT_CLIENT_ID })
	if (status === 200) return tokens(json)
	return status === 400 || status === 429 ? 'wait' : null
}

export async function refreshTraktTokens(refresh: string): Promise<TraktTokens | null> {
	const { status, json } = await post<{ access_token?: string; refresh_token?: string; expires_in?: number }>(`${AUTH}/oauth/token`, {
		refresh_token: refresh, client_id: TRAKT_CLIENT_ID, redirect_uri: TRAKT_REDIRECT, grant_type: 'refresh_token',
	})
	// Only the status is logged: the body carries tokens.
	if (status !== 200) console.error('Library: Trakt token refresh failed', status)
	return status === 200 ? tokens(json) : null
}

export function traktExpired(tokens: TraktTokens, now = Date.now()): boolean {
	return now >= tokens.expiresAt - 3600000
}

interface Ids { imdb?: string | null }
interface Media { title?: string; year?: number | null; ids?: Ids }
interface WatchedMovie { last_watched_at?: string; movie?: Media }
interface WatchedShow { last_watched_at?: string; show?: Media; seasons?: { number?: number; episodes?: { number?: number }[] }[] }
interface Rated { rated_at?: string; rating?: number; movie?: Media; show?: Media; episode?: { season?: number; number?: number } }
interface Listed { listed_at?: string; movie?: Media; show?: Media }

export interface TraktData {
	movies: WatchedMovie[]
	shows: WatchedShow[]
	ratings: Rated[]
	watchlist: Listed[]
}

export interface TraktHistory {
	titles: WatchedTitle[]
	// Rated episodes; scores land in the series note.
	episodes: EpisodeRating[]
	// Watched episodes per series IMDb id, "season:episode".
	watched: Map<string, { series: WatchedTitle; episodes: string[] }>
}

export async function traktData(token: string): Promise<TraktData | null> {
	const [movies, shows, ratings, watchlist] = await Promise.all([
		get<WatchedMovie[]>(token, '/sync/watched/movies'),
		get<WatchedShow[]>(token, '/sync/watched/shows'),
		get<Rated[]>(token, '/sync/ratings'),
		get<Listed[]>(token, '/sync/watchlist'),
	])
	if (!movies || !shows || !ratings || !watchlist) return null
	return { movies, shows, ratings, watchlist }
}

const IMDB_ID = /^tt\d+$/

function title(media: Media | undefined, kind: 'movie' | 'series', when: string, watched: boolean): WatchedTitle | null {
	const id = media?.ids?.imdb ?? ''
	if (!IMDB_ID.test(id)) return null
	return { id, name: media?.title ?? id, kind, year: media?.year ?? null, rating: null, when, watched, trakt: true }
}

// Trakt's lists as the titles the watch import already knows how to file.
export function traktHistory(data: TraktData): TraktHistory {
	const titles = new Map<string, WatchedTitle>()
	const add = (item: WatchedTitle | null): WatchedTitle | null => {
		if (!item) return null
		const known = titles.get(item.id)
		if (known) {
			known.watched = known.watched || item.watched
			return known
		}
		titles.set(item.id, item)
		return item
	}
	const watched = new Map<string, { series: WatchedTitle; episodes: string[] }>()
	for (const entry of data.movies) add(title(entry.movie, 'movie', entry.last_watched_at ?? '', true))
	for (const entry of data.shows) {
		const series = add(title(entry.show, 'series', entry.last_watched_at ?? '', true))
		if (!series) continue
		const episodes: string[] = []
		for (const season of entry.seasons ?? []) {
			for (const episode of season.episodes ?? []) {
				if (season.number && episode.number) episodes.push(`${String(season.number)}:${String(episode.number)}`)
			}
		}
		watched.set(series.id, { series, episodes })
	}
	const episodes: EpisodeRating[] = []
	for (const rated of data.ratings) {
		const value = rated.rating
		if (typeof value !== 'number' || value < 1 || value > 10) continue
		if (rated.episode) {
			const series = title(rated.show, 'series', rated.rated_at ?? '', true)
			if (series && rated.episode.season && rated.episode.number) episodes.push({ series, season: rated.episode.season, episode: rated.episode.number, rating: value })
			continue
		}
		const item = add(rated.movie ? title(rated.movie, 'movie', rated.rated_at ?? '', true) : title(rated.show, 'series', rated.rated_at ?? '', true))
		if (item) item.rating = value
	}
	for (const listed of data.watchlist) {
		const item = add(listed.movie ? title(listed.movie, 'movie', listed.listed_at ?? '', false) : title(listed.show, 'series', listed.listed_at ?? '', false))
		if (item) item.listed = true
	}
	return { titles: [...titles.values()], episodes, watched }
}

// What a note asks Trakt to change, against what Trakt is known to hold.
export interface TraktPush {
	rating: number | null
	list: boolean | null
	movieWatched: boolean
	episodes: { season: number; episode: number }[]
	episodeRatings: { season: number; episode: number; rating: number }[]
}

export function traktChanges(want: TraktEcho, had: TraktEcho, kind: 'movie' | 'series'): TraktPush {
	const seen = new Set(had.w ?? [])
	const split = (key: string): { season: number; episode: number } => ({ season: Number(key.split(':')[0]), episode: Number(key.split(':')[1]) })
	return {
		rating: want.r > 0 && want.r !== had.r ? want.r : null,
		list: want.l && !had.l && had.r === 0 && !had.m && seen.size === 0 ? true : !want.l && had.l ? false : null,
		movieWatched: kind === 'movie' && !!want.m && !had.m,
		episodes: (want.w ?? []).filter(key => !seen.has(key)).map(split),
		episodeRatings: Object.keys(want.e ?? {}).filter(key => want.e?.[key] !== had.e?.[key]).map(key => ({ ...split(key), rating: want.e?.[key] ?? 0 })),
	}
}

// Sends one note's changes; true when every request went through.
export async function traktSend(token: string, imdb: string, kind: 'movie' | 'series', change: TraktPush): Promise<boolean> {
	if (!IMDB_ID.test(imdb)) return false
	const ids = { imdb }
	const group = kind === 'movie' ? 'movies' : 'shows'
	const seasons = (list: { season: number; episode: number; rating?: number }[]): { number: number; episodes: { number: number; rating?: number }[] }[] => {
		const by = new Map<number, { number: number; rating?: number }[]>()
		for (const item of list) by.set(item.season, [...(by.get(item.season) ?? []), item.rating ? { number: item.episode, rating: item.rating } : { number: item.episode }])
		return [...by.entries()].map(([number, episodes]) => ({ number, episodes }))
	}
	const calls: Promise<{ status: number }>[] = []
	if (change.rating !== null) calls.push(post(`${API}/sync/ratings`, { [group]: [{ ids, rating: change.rating }] }, token))
	if (change.list === true) calls.push(post(`${API}/sync/watchlist`, { [group]: [{ ids }] }, token))
	if (change.list === false) calls.push(post(`${API}/sync/watchlist/remove`, { [group]: [{ ids }] }, token))
	if (change.movieWatched) calls.push(post(`${API}/sync/history`, { movies: [{ ids }] }, token))
	if (change.episodes.length > 0) calls.push(post(`${API}/sync/history`, { shows: [{ ids, seasons: seasons(change.episodes) }] }, token))
	if (change.episodeRatings.length > 0) calls.push(post(`${API}/sync/ratings`, { shows: [{ ids, seasons: seasons(change.episodeRatings) }] }, token))
	const results = await Promise.all(calls)
	const ok = results.every(result => result.status === 200 || result.status === 201)
	if (!ok) console.error('Library: Trakt push failed', imdb, results.map(result => result.status))
	return ok
}

// Takes a title off Trakt: its plays (every episode of a show), its scores and
// the watchlist. `rated` are the episodes ("season:episode") scored from here.
export async function traktRemove(token: string, imdb: string, kind: 'movie' | 'series', rated: string[]): Promise<boolean> {
	if (!IMDB_ID.test(imdb)) return false
	const ids = { imdb }
	const group = kind === 'movie' ? 'movies' : 'shows'
	const calls = [
		post(`${API}/sync/history/remove`, { [group]: [{ ids }] }, token),
		post(`${API}/sync/ratings/remove`, { [group]: [{ ids }] }, token),
		post(`${API}/sync/watchlist/remove`, { [group]: [{ ids }] }, token),
	]
	if (kind === 'series' && rated.length > 0) {
		const by = new Map<number, { number: number }[]>()
		for (const key of rated) {
			const season = Number(key.split(':')[0])
			const episode = Number(key.split(':')[1])
			by.set(season, [...(by.get(season) ?? []), { number: episode }])
		}
		const seasons = [...by.entries()].map(([number, episodes]) => ({ number, episodes }))
		calls.push(post(`${API}/sync/ratings/remove`, { shows: [{ ids, seasons }] }, token))
	}
	const results = await Promise.all(calls)
	const ok = results.every(result => result.status === 200)
	if (!ok) console.error('Library: Trakt removal failed', imdb, results.map(result => result.status))
	return ok
}
