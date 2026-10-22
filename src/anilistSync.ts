import { requestUrl } from 'obsidian'

// AniList progress sync. Writing needs OAuth: implicit grant, no client secret.
const ENDPOINT = 'https://graphql.anilist.co'

// The plugin's registered client (redirect = the PIN page): no setup per user.
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

function hostOf(url: string): string | null {
	try {
		return new URL(url).hostname
	} catch {
		return null
	}
}

// Implicit grant; the client is registered with the PIN redirect.
export function anilistAuthUrl(clientId: string): string {
	return `https://anilist.co/api/v2/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token`
}

// Token from the redirect fragment (…/oauth/pin#access_token=…). Only the exact
// host anilist.co counts: a longer host would hand over another token.
export function tokenFromRedirect(url: string): string | null {
	if (hostOf(url) !== 'anilist.co' || !url.startsWith('https:')) return null
	const match = /[#&]access_token=([^&\s]+)/.exec(url)
	const token = match?.[1]
	if (!token) return null
	try {
		return decodeURIComponent(token)
	} catch {
		return token
	}
}

// Same value out of a pasted address or a bare token (mobile fallback).
export function tokenFromInput(text: string): string {
	const trimmed = text.trim()
	return tokenFromRedirect(trimmed) ?? trimmed
}

// AniList stores the score in the account's format: 10, 100, 5 or 3 points.
export function toTenPoint(score: number, format: string): number {
	if (!(score > 0)) return 0
	const points = format === 'POINT_100' ? score / 10
		: format === 'POINT_5' ? score * 2
		: format === 'POINT_3' ? score * 10 / 3
		: score
	return Math.round(points * 10) / 10
}

export function listStatus(complete: boolean, watched: number): MediaListStatus {
	if (complete) return 'COMPLETED'
	if (watched > 0) return 'CURRENT'
	return 'PLANNING'
}

// null covers every failure: `throw: false` silences only HTTP errors.
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

// The authenticated user (null when bad), with its score format.
export async function aniListViewer(token: string): Promise<{ id: number; name: string; scoreFormat: string } | null> {
	const json = await gql<{
		data?: { Viewer?: { id: number; name: string; mediaListOptions?: { scoreFormat?: string } | null } | null }
	}>(token, 'query { Viewer { id name mediaListOptions { scoreFormat } } }', {})
	const viewer = json?.data?.Viewer
	if (!viewer) return null
	return { id: viewer.id, name: viewer.name, scoreFormat: viewer.mediaListOptions?.scoreFormat ?? 'POINT_10' }
}

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

// Takes the title off the viewer's list; true when it is gone or was never there.
export async function deleteEntry(token: string, userId: number, mediaId: number): Promise<boolean> {
	// a Page answers an empty list where MediaList alone would answer 404
	const found = await gql<{ data?: { Page?: { mediaList?: { id: number }[] } } }>(token,
		'query ($userId: Int, $mediaId: Int) { Page(perPage: 1) { mediaList(userId: $userId, mediaId: $mediaId) { id } } }', { userId, mediaId })
	const list = found?.data?.Page?.mediaList
	if (!list) return false
	const entryId = list[0]?.id
	if (!entryId) return true
	const json = await gql<{ data?: { DeleteMediaListEntry?: { deleted?: boolean } } }>(token,
		'mutation ($id: Int) { DeleteMediaListEntry(id: $id) { deleted } }', { id: entryId })
	return !!json?.data?.DeleteMediaListEntry?.deleted
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

// The full list (all statuses); null on failure, so empty is not a sync.
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
