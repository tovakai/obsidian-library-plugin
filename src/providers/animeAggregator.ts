import { MalProvider } from './mal'
import { SEARCH_BUDGET_MS, isEmptyValue, within } from '../util'
import type { ContentProvider, ContentType, NormalizedMetadata, SearchResult } from './types'

// MAL first with a Client ID, then AniList; deduped by idMal. Source stays anilist.
export class AnimeAggregatorProvider implements ContentProvider {
	readonly id = 'anilist'
	readonly contentTypes: ContentType[] = ['anime']

	private anilist: ContentProvider
	private mal: MalProvider

	constructor(anilist: ContentProvider, mal: MalProvider) {
		this.anilist = anilist
		this.mal = mal
	}

	async search(query: string, type: ContentType): Promise<SearchResult[]> {
		const [fromMal, fromAniList] = await Promise.all([
			within(this.mal.search(query), SEARCH_BUDGET_MS, []),
			within(this.anilist.search(query, type), SEARCH_BUDGET_MS, [])
		])
		const listed = new Set(fromMal.map(result => result.sourceId))
		const unlisted = fromAniList.filter((result) => {
			const idMal = (result.raw as { idMal?: number | null } | null)?.idMal
			return !idMal || !listed.has(MalProvider.PREFIX + String(idMal))
		})
		return [...fromMal, ...unlisted]
	}

	refreshable(sourceId: string): boolean {
		return !sourceId.startsWith(MalProvider.PREFIX) || this.mal.refreshable()
	}

	async fetch(sourceId: string, type: ContentType, raw?: unknown): Promise<NormalizedMetadata | null> {
		if (!sourceId.startsWith(MalProvider.PREFIX)) return this.anilist.fetch(sourceId, type, raw)
		// MyAnimeList has no trailers or stills; AniList fills them and the rest.
		const [own, extra] = await Promise.all([this.mal.fetch(sourceId), this.anilist.fetch(sourceId, type)])
		if (!own) return null
		for (const [key, value] of Object.entries(extra?.fields ?? {})) {
			if (isEmptyValue(own.fields[key]) && !isEmptyValue(value)) own.fields[key] = value
		}
		return { ...own, progressTotal: own.progressTotal ?? extra?.progressTotal ?? null }
	}
}
