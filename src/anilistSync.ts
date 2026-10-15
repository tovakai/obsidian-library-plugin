import { requestUrl } from 'obsidian'

// AniList progress sync. Reading anime metadata is public (see AnimeProvider); writing to a
// user's list needs OAuth. Implicit grant with the plugin's own registered client: the user
// authorizes, the token arrives in the redirect's fragment, no secret anywhere.
const ENDPOINT = 'https://graphql.anilist.co'

// The plugin's registered client: every user connects through it, no setup
// (redirect = the PIN page).
export const ANILIST_CLIENT_ID = '53801'

export interface AniListEntry {
	mediaId: number
	progress: number
	status: string
	score: number
	title: string
	total: number
	idMal: number | null
}

export type MediaListStatus = 'CURRENT' | 'COMPLETED' | 'PLANNING'

// Build the authorize URL (implicit grant). The client must be registered with the PIN redirect.
export function anilistAuthUrl(clientId: string): string {
	return `https://anilist.co/api/v2/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token`
}

// The implicit grant answers in the redirect's fragment:
// https://anilist.co/api/v2/oauth/pin#access_token=…&token_type=Bearer.
export function tokenFromRedirect(url: string): string | null {
	if (!url.startsWith('https://anilist.co')) return null
	const match = /[#&]access_token=([^&\s]+)/.exec(url)
	const token = match?.[1]
	if (!token) return null
	try {
		return decodeURIComponent(token)
	} catch {
		return token
	}
}

// The same value out of a pasted address or a bare token (mobile fallback).
export function tokenFromInput(text: string): string {
	const trimmed = text.trim()
	return tokenFromRedirect(trimmed) ?? trimmed
}

// The list's score onto the plugin's 1-10 scale: AniList stores it in the
// account's own format (10, 10-decimal, 100, 5 or 3 points).
export function toTenPoint(score: number, format: string): number {
	if (!(score > 0)) return 0
	const points = format === 'POINT_100' ? score / 10
		: format === 'POINT_5' ? score * 2
		: format === 'POINT_3' ? score * 10 / 3
		: score
	return Math.round(points * 10) / 10
}

// Map the note's Complete/Progress state to an AniList list status.
export function listStatus(complete: boolean, watched: number): MediaListStatus {
	if (complete) return 'COMPLETED'
	if (watched > 0) return 'CURRENT'
	return 'PLANNING'
}

// null covers every failure: `throw: false` only silences HTTP errors, so an
// offline device or a non-JSON body still throws and is caught here.
async function gql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T | null> {
	try {
		const resp = await requestUrl({
			url: ENDPOINT,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ query, variables }),
			throw: false
		})
		if (resp.status !== 200) return null
		return resp.json as T
	} catch (e) {
		console.error('Library: AniList request error', e)
		return null
	}
}

// Validate the token and return the authenticated user (null if the token is
// bad/expired), with the account's score format for normalizing ratings.
export async function aniListViewer(token: string): Promise<{ id: number; name: string; scoreFormat: string } | null> {
	const json = await gql<{
		data?: { Viewer?: { id: number; name: string; mediaListOptions?: { scoreFormat?: string } | null } | null }
	}>(token, 'query { Viewer { id name mediaListOptions { scoreFormat } } }', {})
	const viewer = json?.data?.Viewer
	if (!viewer) return null
	return { id: viewer.id, name: viewer.name, scoreFormat: viewer.mediaListOptions?.scoreFormat ?? 'POINT_10' }
}

// Push one note's progress/status/score to the user's AniList list.
export async function pushEntry(
	token: string,
	mediaId: number,
	progress: number,
	status: MediaListStatus,
	scoreRaw: number | null
): Promise<boolean> {
	const query =
		'mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus, $scoreRaw: Int) {' +
		' SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status, scoreRaw: $scoreRaw) { id } }'
	const variables: Record<string, unknown> = { mediaId, progress, status }
	if (scoreRaw != null) variables.scoreRaw = scoreRaw
	const json = await gql<{ data?: { SaveMediaListEntry?: { id: number } } }>(token, query, variables)
	return !!json?.data?.SaveMediaListEntry?.id
}

export type AniListMediaKind = 'ANIME' | 'MANGA'

interface ListCollectionResponse {
	data?: {
		MediaListCollection?: {
			lists?: {
				entries?: {
					mediaId: number
					progress: number
					status: string
					score: number
					media?: {
						idMal?: number | null
						episodes?: number | null
						chapters?: number | null
						title?: { romaji?: string; english?: string | null; native?: string | null } | null
					} | null
				}[]
			}[]
		}
	}
}

// Pull the user's full anime or manga list (all statuses) as flat entries; null
// when the request failed, so an empty list is never mistaken for a sync.
export async function fetchList(token: string, userId: number, type: AniListMediaKind = 'ANIME'): Promise<AniListEntry[] | null> {
	const query =
		'query ($userId: Int, $type: MediaType) { MediaListCollection(userId: $userId, type: $type) {' +
		' lists { entries { mediaId progress status score' +
		' media { idMal episodes chapters title { romaji english native } } } } } }'
	const json = await gql<ListCollectionResponse>(token, query, { userId, type })
	const collection = json?.data?.MediaListCollection
	if (!collection) return null
	const lists = collection.lists ?? []
	const out: AniListEntry[] = []
	for (const list of lists) {
		for (const e of list.entries ?? []) {
			out.push({
				mediaId: e.mediaId,
				progress: e.progress,
				status: e.status,
				score: e.score,
				title: e.media?.title?.english ?? e.media?.title?.romaji ?? e.media?.title?.native ?? '',
				total: (type === 'ANIME' ? e.media?.episodes : e.media?.chapters) ?? 0,
				idMal: e.media?.idMal ?? null
			})
		}
	}
	return out
}
