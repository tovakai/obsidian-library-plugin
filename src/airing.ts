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

export function upcomingVideos(videos: CinemetaVideo[], now: number): Airing[] {
	const out: Airing[] = []
	for (const video of videos) {
		const at = Date.parse(video.released ?? '')
		if (!Number.isFinite(at) || at <= now || !video.episode || !video.season) continue
		out.push({ s: video.season, e: video.episode, at })
	}
	return out.sort((a, b) => a.at - b.at)
}

export async function seriesSchedule(imdbId: string, now = Date.now()): Promise<Airing[] | undefined> {
	if (!/^tt\d+$/.test(imdbId)) return []
	try {
		const resp = await requestUrl({ url: `https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`, throw: false })
		if (resp.status !== 200) return undefined
		const videos = (resp.json as { meta?: { videos?: CinemetaVideo[] } }).meta?.videos ?? []
		return upcomingVideos(videos, now)
	} catch {
		return undefined
	}
}

export async function animeSchedules(ids: { anilist: number[]; mal: number[] }): Promise<{ anilist: Map<number, Airing[]>; mal: Map<number, Airing[]> } | null> {
	const out = { anilist: new Map<number, Airing[]>(), mal: new Map<number, Airing[]>() }
	type Media = { id: number; idMal: number | null; airingSchedule: { nodes: { episode: number; airingAt: number }[] } | null }
	const ask = async (field: 'id_in' | 'idMal_in', chunk: number[]): Promise<boolean> => {
		const query = `query ($ids: [Int]) { Page(perPage: 50) { media(${field}: $ids, type: ANIME) { id idMal airingSchedule(notYetAired: true, perPage: 50) { nodes { episode airingAt } } } } }`
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
				const schedule = (item.airingSchedule?.nodes ?? []).map(node => ({ s: null, e: node.episode, at: node.airingAt * 1000 })).sort((a, b) => a.at - b.at)
				if (schedule.length === 0) continue
				if (field === 'id_in') out.anilist.set(item.id, schedule)
				else if (item.idMal) out.mal.set(item.idMal, schedule)
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

export function airingDate(at: number): string {
	return new Date(at).toLocaleDateString(getLanguage() + '-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function airingLabel(airing: Airing): string {
	const episode = airing.s !== null ? `S${String(airing.s)}E${String(airing.e)}` : `#${String(airing.e)}`
	return `${episode} · ${airingDate(airing.at)}`
}
