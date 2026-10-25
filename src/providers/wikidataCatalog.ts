import type { ContentProvider, ContentType, NormalizedMetadata, SearchResult } from './types'
import {
	claimValues, entities, firstYear, itemIds, labelsOf, languages,
	pageUrl, searchItems, textIn, wikipediaImages, type WikidataEntity
} from './wikidata'

// Private people do not have a provider. No names or personal fields are sent
// to Wikidata, a search engine, or a remote service by this plugin.
const PERSON_FILTER = 'haswbstatement:P31=Q5'
const PLACE_FILTER = 'haswbstatement:P625'
const Q_ID = /^Q\d+$/

function firstDate(entity: WikidataEntity, property: string): string | null {
	for (const value of claimValues(entity, property)) {
		const raw = (value as { time?: unknown } | null)?.time
		if (typeof raw !== 'string') continue
		const match = /^\+(\d{4,})-(\d{2})-(\d{2})T/.exec(raw)
		if (match) return [match[1], match[2], match[3]].join('-')
	}
	return null
}

function coordinates(entity: WikidataEntity): { lat: number; lon: number } | null {
	for (const value of claimValues(entity, 'P625')) {
		const point = value as { latitude?: unknown; longitude?: unknown } | null
		const lat = point?.latitude
		const lon = point?.longitude
		if (typeof lat === 'number' && typeof lon === 'number' &&
			Number.isFinite(lat) && Number.isFinite(lon) &&
			Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon }
	}
	return null
}

export class WikidataCatalogProvider implements ContentProvider {
	readonly id = 'wikidata'
	readonly contentTypes: ContentType[] = ['people_public', 'place']

	async search(query: string, type: ContentType): Promise<SearchResult[]> {
		if (type !== 'people_public' && type !== 'place') return []
		const search = query.trim()
		if (search.length < 2) return []
		try {
			const ids = await searchItems(search, type === 'people_public' ? PERSON_FILTER : PLACE_FILTER, 18)
			if (!ids.length) return []
			const langs = languages()
			const found = await entities(ids, 'labels|descriptions|sitelinks', langs)
			const articles = ids.map(id => found[id]?.sitelinks?.enwiki?.title ?? null)
			const thumbs = await wikipediaImages(articles.filter((title): title is string => !!title))
			return ids.map((id, index) => {
				const entity = found[id]
				const article = articles[index]
				return {
					provider: this.id,
					sourceId: id,
					title: textIn(entity?.labels, langs) ?? id,
					year: null,
					cover: article ? thumbs[article] ?? null : null,
					subtitle: textIn(entity?.descriptions, langs),
					raw: null
				}
			})
		} catch (error) {
			console.error('Library: Wikidata catalog search failed', error)
			return []
		}
	}

	async fetch(sourceId: string, type: ContentType): Promise<NormalizedMetadata | null> {
		if (!Q_ID.test(sourceId) || (type !== 'people_public' && type !== 'place')) return null
		try {
			const langs = languages()
			const item = (await entities([sourceId], 'labels|aliases|descriptions|claims|sitelinks', langs))[sourceId]
			if (!item) return null
			// Never silently attach a similarly named place to a person, or vice versa.
			if (type === 'people_public' && !itemIds(item, 'P31').includes('Q5')) return null
			if (type === 'place' && !coordinates(item)) return null

			const article = item.sitelinks?.enwiki?.title ?? null
			const common: Record<string, unknown> = {
				Name: textIn(item.labels, langs) ?? sourceId,
				Description: textIn(item.descriptions, langs),
				URL: pageUrl(sourceId, article)
			}
			const imageTask = wikipediaImages(article ? [article] : [])
			if (type === 'people_public') {
				// Obsidian's native aliases array supports alternate names in links/search.
				// Keep these to the reader's preferred languages, not every Wikidata language.
				const name = String(common.Name).toLocaleLowerCase()
				const aliases = Array.from(new Set(langs.flatMap(lang =>
					(item.aliases?.[lang] ?? []).map(alias => alias.value?.trim()).filter((value): value is string => !!value)
				))).filter(alias => alias.toLocaleLowerCase() !== name).slice(0, 24)
				const occupations = itemIds(item, 'P106')
				const citizenship = itemIds(item, 'P27')
				const [label, images] = await Promise.all([
					labelsOf([...occupations, ...citizenship], langs), imageTask
				])
				const fields = {
					...common,
					aliases,
					Cover: article ? images[article] ?? null : null,
					Occupation: label(occupations),
					Citizenship: label(citizenship),
					Born: firstDate(item, 'P569'),
					Died: firstDate(item, 'P570'),
					Year: firstYear(item, ['P569'])
				}
				return { fields, progressTotal: null, imdbId: null }
			}

			const instance = itemIds(item, 'P31')
			const country = itemIds(item, 'P17')
			const regions = itemIds(item, 'P131')
			const [label, images] = await Promise.all([
				labelsOf([...instance, ...country, ...regions], langs), imageTask
			])
			const point = coordinates(item)
			const fields: Record<string, unknown> = {
				...common,
				Cover: article ? images[article] ?? null : null,
				'Place Type': label(instance),
				Country: label(country),
				Region: label(regions),
				Latitude: point?.lat,
				Longitude: point?.lon,
				Year: firstYear(item, ['P571'])
			}
			return { fields, progressTotal: null, imdbId: null }
		} catch (error) {
			console.error('Library: Wikidata catalog fetch failed', error)
			return null
		}
	}
}
