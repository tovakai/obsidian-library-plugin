import { requestUrl } from 'obsidian'
import { externalIdsFor } from '../kitsuSync'
import type { SearchResult } from './types'
import type { ILibrarySettings } from '../constants'
import { pickTitle } from '../util'

// Kitsu's own search. The ids map back to AniList's so the note contract holds
// (Source stays anilist); unmapped hits are dropped rather than guessed.
export class KitsuProvider {
	readonly id = 'kitsu'

	constructor(private prefs: () => Pick<ILibrarySettings, 'titleLanguage'>) {}

	async search(query: string): Promise<SearchResult[]> {
		const resp = await requestUrl({
			url: `https://kitsu.io/api/edge/anime?filter%5Btext%5D=${encodeURIComponent(query)}&page%5Blimit%5D=20`,
			headers: { Accept: 'application/vnd.api+json' },
			throw: false
		})
		if (resp.status !== 200) return []
		const data = (resp.json as { data?: { id: string; attributes?: Record<string, unknown> }[] }).data ?? []
		if (data.length === 0) return []
		const anilistOf = await externalIdsFor(data.map(anime => Number(anime.id)), 'anilist')
		if (!anilistOf) return []
		const out: SearchResult[] = []
		const seen = new Set<string>()
		for (const anime of data) {
			const anilist = anilistOf.get(Number(anime.id))
			if (!anilist) continue
			const sourceId = String(anilist)
			if (seen.has(sourceId)) continue
			seen.add(sourceId)
			const attrs = anime.attributes ?? {}
			const poster = attrs.posterImage as { medium?: string } | null | undefined
			const start = typeof attrs.startDate === 'string' ? attrs.startDate : undefined
			const titles = (attrs.titles ?? {}) as Record<string, string | null | undefined>
			const canonical = typeof attrs.canonicalTitle === 'string' ? attrs.canonicalTitle : ''
			const title = pickTitle({ english: titles.en, romaji: titles.en_jp, native: titles.ja_jp }, this.prefs().titleLanguage) || canonical
			out.push({
				provider: this.id,
				sourceId,
				title,
				year: start ? Number(start.slice(0, 4)) || null : null,
				cover: (poster && poster.medium) || null,
				subtitle: null,
				raw: null
			})
		}
		return out
	}
}
