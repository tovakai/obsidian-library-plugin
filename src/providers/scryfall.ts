import { requestUrl } from 'obsidian'
import type { ContentProvider, ContentType, NormalizedMetadata, SearchResult } from './types'

interface CardImageUris {
	small?: string
	normal?: string
	large?: string
	art_crop?: string
}

interface CardFace {
	name?: string
	mana_cost?: string
	oracle_text?: string
	type_line?: string
	image_uris?: CardImageUris
}

interface ScryfallCard {
	object?: string
	id: string
	oracle_id?: string
	name: string
	released_at?: string
	scryfall_uri?: string
	image_uris?: CardImageUris
	card_faces?: CardFace[]
	layout?: string
	set?: string
	set_name?: string
	collector_number?: string
	rarity?: string
	mana_cost?: string
	cmc?: number
	type_line?: string
	oracle_text?: string
	colors?: string[]
	color_identity?: string[]
	artist?: string
	finishes?: string[]
	power?: string
	toughness?: string
	loyalty?: string
	prices?: Record<string, string | null>
	legalities?: Record<string, string>
}

interface ScryfallList {
	object?: string
	data?: ScryfallCard[]
}

// Printing IDs are distinct from oracle IDs: each set/artwork is its own note.
const PRINTING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE = 'https://api.scryfall.com'
const HEADERS = {
	'Accept': 'application/json;q=0.9,*/*;q=0.8',
	'User-Agent': 'Obsidian-Library-MTG/1.0 (https://github.com/tovakai/obsidian-library-plugin)'
}
const CACHE_MS = 5 * 60 * 1000

function imageOf(card: ScryfallCard, faceIndex = 0): string | null {
	const uris = faceIndex === 0
		? card.image_uris ?? card.card_faces?.[0]?.image_uris
		: card.card_faces?.[faceIndex]?.image_uris
	return uris?.normal ?? uris?.large ?? uris?.small ?? null
}

function price(value: string | null | undefined): number | null {
	if (!value) return null
	const number = Number(value)
	return Number.isFinite(number) && number >= 0 ? number : null
}

// Allow all Scryfall search operators (set:blb, is:foil, !"name", etc).
// An ordinary name defaults to paper printings rather than digital-only cards.
function searchText(query: string): string {
	const advanced = /(?:^|\s)(?:[a-z][a-z_-]*:|[-!(])|[<>="]/i.test(query)
	return advanced ? query : 'name:"' + query.replace(/["\\]/g, '') + '" game:paper'
}

export class ScryfallProvider implements ContentProvider {
	readonly id = 'scryfall'
	readonly contentTypes: ContentType[] = ['mtg']

	// A single pacing queue is shared by searches and per-print refreshes.
	// Stay well below Scryfall's 10 requests/second ceiling.
	private lastRequest = 0
	private queue: Promise<void> = Promise.resolve()
	private cache = new Map<string, { time: number; data: unknown }>()

	private async get(path: string): Promise<unknown | null> {
		const cached = this.cache.get(path)
		if (cached && Date.now() - cached.time < CACHE_MS) return cached.data

		const turn = this.queue.catch(() => undefined).then(async () => {
			const delay = Math.max(0, 400 - (Date.now() - this.lastRequest))
			if (delay) await new Promise<void>((resolve) => setTimeout(resolve, delay))
			this.lastRequest = Date.now()
		})
		this.queue = turn
		await turn

		try {
			const response = await requestUrl({ url: BASE + path, headers: HEADERS, throw: false })
			if (response.status !== 200) {
				// In particular, never retry/power through a 429.
				if (response.status !== 404) console.warn('Library: Scryfall HTTP ' + String(response.status))
				return null
			}
			const data: unknown = response.json
			this.cache.set(path, { time: Date.now(), data })
			return data
		} catch (error) {
			console.error('Library: Scryfall request failed', error)
			return null
		}
	}

	async search(query: string): Promise<SearchResult[]> {
		const q = query.trim()
		if (q.length < 2) return []
		const params = new URLSearchParams({
			q: searchText(q),
			unique: 'prints',
			order: 'released',
			dir: 'desc',
			include_extras: 'true'
		})
		const list = await this.get('/cards/search?' + params.toString()) as ScryfallList | null
		if (!list || !Array.isArray(list.data)) return []
		// Scryfall pages can contain hundreds of printings. Refine with set: or cn:.
		return list.data.filter(card => card.object === 'card' && PRINTING_ID.test(card.id)).slice(0, 75).map(card => ({
			provider: this.id,
			sourceId: card.id,
			title: card.name,
			year: card.released_at ? Number(card.released_at.slice(0, 4)) : null,
			cover: imageOf(card),
			subtitle: [card.set?.toUpperCase(), card.collector_number ? '#' + card.collector_number : '', card.rarity].filter(Boolean).join(' · '),
			raw: card
		}))
	}

	async fetch(sourceId: string, _type: ContentType, raw?: unknown): Promise<NormalizedMetadata | null> {
		if (!PRINTING_ID.test(sourceId)) return null
		const cachedCard = raw && typeof raw === 'object' && (raw as ScryfallCard).id === sourceId
			&& (raw as ScryfallCard).object === 'card' ? raw as ScryfallCard : null
		const card = cachedCard ?? await this.get('/cards/' + encodeURIComponent(sourceId)) as ScryfallCard | null
		if (!card || card.object !== 'card' || card.id !== sourceId) return null

		const oracle = card.oracle_text ?? (card.card_faces ?? []).map(face =>
			[face.name, face.type_line, face.oracle_text].filter(Boolean).join('\n')
		).join('\n\n')
		const fields: Record<string, unknown> = {
			Name: card.name,
			Year: card.released_at ? Number(card.released_at.slice(0, 4)) : null,
			Released: card.released_at,
			URL: card.scryfall_uri,
			Cover: imageOf(card),
			'Back Cover': imageOf(card, 1),
			'Oracle ID': card.oracle_id,
			'Set': card.set_name,
			'Set Code': card.set?.toUpperCase(),
			'Collector Number': card.collector_number,
			Rarity: card.rarity,
			'Card Type': card.type_line,
			'Mana Cost': card.mana_cost || card.card_faces?.map(face => face.mana_cost).filter(Boolean).join(' // '),
			'Mana Value': card.cmc,
			'Oracle Text': oracle,
			'Color Identity': card.color_identity ?? [],
			Colors: card.colors ?? [],
			Artist: card.artist,
			Layout: card.layout,
			Finishes: card.finishes ?? [],
			'Card Faces': card.card_faces?.map(face => face.name).filter(Boolean) ?? [],
			Power: card.power,
			Toughness: card.toughness,
			Loyalty: card.loyalty,
			'Legal Formats': Object.entries(card.legalities ?? {}).filter(([, legality]) => legality === 'legal').map(([format]) => format),
			'Commander Legal': card.legalities?.commander === 'legal'
		}
		const prices: Array<[string, string]> = [
			['Price USD', 'usd'],
			['Price USD Foil', 'usd_foil'],
			['Price USD Etched', 'usd_etched'],
			['Price EUR', 'eur'],
			['Price EUR Foil', 'eur_foil']
		]
		for (const [field, key] of prices) {
			const value = price(card.prices?.[key])
			if (value !== null) fields[field] = value
		}
		return { fields, progressTotal: null, imdbId: null }
	}
}
