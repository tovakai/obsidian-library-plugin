import { seasonsOf, type EpisodeChange, type TrackKind } from './episodes'
import { seasonIndex } from './watchSites'
import { toStrArray } from './util'

// A note's diary lives in its "Log" property: "2026-10-18 S2E5", or a bare date for a finished title.
export interface LogEntry {
	date: string
	label: string
}

const ENTRY = /^(\d{4}-\d{2}-\d{2})(?:\s+(.*))?$/

export function logOf(fm: Record<string, unknown>): LogEntry[] {
	const out: LogEntry[] = []
	for (const raw of toStrArray(fm.Log)) {
		const match = ENTRY.exec(raw.trim())
		if (match?.[1]) out.push({ date: match[1], label: (match[2] ?? '').trim() })
	}
	return out
}

export function todayIso(now = new Date()): string {
	const pad = (n: number): string => String(n).padStart(2, '0')
	return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addLog(fm: Record<string, unknown>, date: string, label: string): void {
	const entry = label ? `${date} ${label}` : date
	const log = toStrArray(fm.Log)
	if (log.indexOf(entry) < 0) fm.Log = [...log, entry]
}

// What a tick adds to the diary, read before it is applied; null when nothing new gets watched.
export function tickLabel(fm: Record<string, unknown>, change: EpisodeChange, kind: TrackKind): string | null {
	if (!('watched' in change) || !change.watched) return null
	const seasons = seasonsOf(fm, kind)
	const season = seasons[change.season]
	if (!season) return null
	const names = seasons.map(s => s.name)
	const numbered = Number(/\d+/.exec(season.name)?.[0])
	const number = seasonIndex(names, numbered) === change.season ? numbered : change.season + 1
	if (change.episode === undefined) {
		if (season.episodes.every(episode => episode.watched)) return null
		return kind === 'book' ? '' : `S${String(number)}`
	}
	if (season.episodes[change.episode]?.watched) return null
	const at = change.episode + 1
	if (kind === 'book') return `Ch ${String(at)}`
	if (kind === 'anime' && seasons.length === 1) return `E${String(at)}`
	return `S${String(number)}E${String(at)}`
}
