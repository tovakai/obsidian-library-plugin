// Watch-time total in other terms, one a day; the figures are rounded public numbers.

import { formatNumber, tr, trCount } from './i18n'

// 'times' = whole repeats; 'share' = part of a record reached.
export type ComparisonKind = 'times' | 'share'

export interface WatchComparison {
	// tr key; a 'times' key needs the trCount forms <key>1/2/5.
	key: string
	icon: string
	kind: ComparisonKind
	value: number
}

const HOUR = 60
const DAY = 24 * HOUR

const COMPARISONS: { key: string; icon: string; kind: ComparisonKind; minutes: number }[] = [
	// Vostok 1
	{ key: 'fact.gagarin', icon: 'rocket', kind: 'times', minutes: 108 },
	// Mir
	{ key: 'fact.polyakov', icon: 'satellite', kind: 'share', minutes: 437.75 * DAY },
	// Apollo 11
	{ key: 'fact.moon', icon: 'moon', kind: 'times', minutes: 8 * DAY + 3 * HOUR + 18 },
	// Theatrical cuts: 178+179+201 min
	{ key: 'fact.lotr', icon: 'clapperboard', kind: 'times', minutes: 558 },
	// First litter: ~10 weeks
	{ key: 'fact.mice', icon: 'rat', kind: 'times', minutes: 70 * DAY },
	{ key: 'fact.mosquitoes', icon: 'bug', kind: 'times', minutes: 10 * DAY },
	// Sun to Earth: 8 min 20 s
	{ key: 'fact.sunlight', icon: 'sun', kind: 'times', minutes: 8 + 20 / 60 },
	{ key: 'fact.jupiter', icon: 'orbit', kind: 'times', minutes: 9 * HOUR + 56 },
	// Earth at ~107,000 km/h; the count is millions of km
	{ key: 'fact.earth', icon: 'earth', kind: 'times', minutes: (1e6 / 107000) * HOUR },
	// 8 films: 152+161+142+157+138+153+146+130 min
	{ key: 'fact.potter', icon: 'wand', kind: 'times', minutes: 1179 },
	{ key: 'fact.plane', icon: 'plane', kind: 'times', minutes: (40075 / 900) * HOUR },
	{ key: 'fact.venus', icon: 'telescope', kind: 'share', minutes: 243 * DAY },
	// Verne: 80 days
	{ key: 'fact.fogg', icon: 'ship', kind: 'share', minutes: 80 * DAY },
	{ key: 'fact.equator', icon: 'footprints', kind: 'share', minutes: (40075 / 5) * HOUR },
	// Elephant pregnancy: ~22 months
	{ key: 'fact.elephant', icon: 'baby', kind: 'share', minutes: 660 * DAY },
	// ~70 bpm; the count is thousands of beats
	{ key: 'fact.heart', icon: 'heart-pulse', kind: 'times', minutes: 1000 / 70 },
	// 100 m WR: 9.58 s
	{ key: 'fact.bolt', icon: 'zap', kind: 'times', minutes: 9.58 / 60 },
	{ key: 'fact.iss', icon: 'satellite-dish', kind: 'times', minutes: 92 },
	// Marathon WR: 2:00:35
	{ key: 'fact.marathon', icon: 'timer', kind: 'times', minutes: 120 + 35 / 60 },
	// Theatrical cut
	{ key: 'fact.titanic', icon: 'anchor', kind: 'times', minutes: 194 },
	// LHR–JFK: ~3 h 30
	{ key: 'fact.concorde', icon: 'plane-takeoff', kind: 'times', minutes: 210 },
	// Sun to Neptune, 30 AU
	{ key: 'fact.neptune', icon: 'sun', kind: 'times', minutes: 250 },
	{ key: 'fact.wagner', icon: 'music', kind: 'times', minutes: 15 * HOUR },
	// 9 films: 136+142+140+121+124+131+138+152+142 min
	{ key: 'fact.starwars', icon: 'swords', kind: 'times', minutes: 1226 },
	// Voyager 1 at ~61,200 km/h; the count is millions of km
	{ key: 'fact.voyager', icon: 'satellite', kind: 'times', minutes: (1e6 / 61200) * HOUR },
	{ key: 'fact.tolstoy', icon: 'book-open', kind: 'times', minutes: 587287 / 300 },
	{ key: 'fact.friends', icon: 'sofa', kind: 'times', minutes: 236 * 22 },
	{ key: 'fact.transsib', icon: 'train-front', kind: 'times', minutes: 7 * DAY },
	{ key: 'fact.moonOrbit', icon: 'moon-star', kind: 'times', minutes: 27.3 * DAY },
	{ key: 'fact.mercury', icon: 'orbit', kind: 'times', minutes: 88 * DAY },
	{ key: 'fact.mars', icon: 'globe', kind: 'share', minutes: 687 * DAY },
	// Magellan, 1519–1522
	{ key: 'fact.magellan', icon: 'sailboat', kind: 'share', minutes: 3 * 365.25 * DAY },
	// Sistine ceiling, 1508–1512
	{ key: 'fact.sistine', icon: 'paintbrush', kind: 'share', minutes: 4 * 365.25 * DAY },
	{ key: 'fact.cicada', icon: 'leaf', kind: 'share', minutes: 17 * 365.25 * DAY },
	{ key: 'fact.halley', icon: 'sparkles', kind: 'share', minutes: 76 * 365.25 * DAY }
]

// Shown while it says something: ≥1 repeat, or 1–99% of a record.
export function watchComparisons(minutes: number): WatchComparison[] {
	return COMPARISONS
		.map(c => ({ key: c.key, icon: c.icon, kind: c.kind, value: minutes / c.minutes }))
		.filter(c => (c.kind === 'times' ? c.value >= 1 : c.value >= 0.01 && c.value < 1))
}

// Rotates by the local day number: stays put through the day, next at midnight.
export function comparisonOfTheDay(minutes: number, now: Date = new Date()): WatchComparison | null {
	const shown = watchComparisons(minutes)
	if (shown.length === 0) return null
	const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / (DAY * 60000))
	return shown[day % shown.length] ?? null
}

export function comparisonText(comparison: WatchComparison): string {
	if (comparison.kind === 'share') {
		const percent = formatNumber(comparison.value, { style: 'percent', maximumFractionDigits: 0 })
		return tr(comparison.key, { percent })
	}
	return trCount(comparison.key, Math.floor(comparison.value))
}
