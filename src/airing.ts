import { getLanguage, requestUrl } from 'obsidian'

export interface Airing {
	s: number | null
	e: number
	at: number
}

interface CinemetaVideo {
	season?: number
	episode?: number
	released?: string
}

export function nextVideo(videos: CinemetaVideo[], now: number): Airing | null {
	let best: Airing | null = null
	for (const video of videos) {
		const at = Date.parse(video.released ?? '')
		if (!Number.isFinite(at) || at <= now || !video.episode || !video.season) continue
		if (!best || at < best.at) best = { s: video.season, e: video.episode, at }
	}
	return best
}

export async function nextSeriesEpisode(imdbId: string, now = Date.now()): Promise<Airing | null | undefined> {
	if (!/^tt\d+$/.test(imdbId)) return null
	try {
		const resp = await requestUrl({ url: `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`, throw: false })
		if (resp.status !== 200) return undefined
		const videos = (resp.json as { meta?: { videos?: CinemetaVideo[] } }).meta?.videos ?? []
		return nextVideo(videos, now)
	} catch {
		return undefined
	}
}

export async function nextAnimeEpisodes(ids: { anilist: number[]; mal: number[] }): Promise<{ anilist: Map<number, Airing>; mal: Map<number, Airing> } | null> {
	const out = { anilist: new Map<number, Airing>(), mal: new Map<number, Airing>() }
	type Media = { id: number; idMal: number | null; nextAiringEpisode: { episode: number; airingAt: number } | null }
	const ask = async (field: 'id_in' | 'idMal_in', chunk: number[]): Promise<boolean> => {
		const query = `query ($ids: [Int]) { Page(perPage: 50) { media(${field}: $ids, type: ANIME) { id idMal nextAiringEpisode { episode airingAt } } } }`
		try {
			const resp = await requestUrl({
				url: 'https://graphql.anilist.co',
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({ query, variables: { ids: chunk } }),
				throw: false,
			})
			if (resp.status !== 200) return false
			const media = (resp.json as { data?: { Page?: { media?: Media[] } } }).data?.Page?.media ?? []
			for (const item of media) {
				const next = item.nextAiringEpisode
				if (!next) continue
				const airing = { s: null, e: next.episode, at: next.airingAt * 1000 }
				if (field === 'id_in') out.anilist.set(item.id, airing)
				else if (item.idMal) out.mal.set(item.idMal, airing)
			}
			return true
		} catch {
			return false
		}
	}
	for (let i = 0; i < ids.anilist.length; i += 50) if (!await ask('id_in', ids.anilist.slice(i, i + 50))) return null
	for (let i = 0; i < ids.mal.length; i += 50) if (!await ask('idMal_in', ids.mal.slice(i, i + 50))) return null
	return out
}

export function airingLabel(airing: Airing): string {
	const episode = airing.s !== null ? `S${String(airing.s)}E${String(airing.e)}` : `#${String(airing.e)}`
	const date = new Date(airing.at).toLocaleDateString(getLanguage() + '-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short' })
	return `${episode} · ${date}`
}
