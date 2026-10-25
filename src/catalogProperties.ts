import type { ICategory } from './constants'

// Custom, user-authored categories are metadata-only. All values remain in
// Obsidian frontmatter; no files are rewritten when their schema changes.
export type CatalogPropertyType = 'text' | 'number' | 'checkbox' | 'date' | 'list'

export interface CatalogProperty {
	name: string
	type: CatalogPropertyType
	defaultValue?: string | boolean
}

export type CatalogCategory = ICategory & {
	customManual?: boolean
	catalogProperties?: CatalogProperty[]
}

export const CATALOG_PROPERTY_TYPES: CatalogPropertyType[] = ['text', 'number', 'checkbox', 'date', 'list']

const RESERVED = new Set([
	'__proto__', 'constructor', 'prototype', 'type', 'name', 'date',
	'source', 'source id', 'file', 'tags'
])

export function validCatalogPropertyName(value: string): boolean {
	const trimmed = value.trim()
	return trimmed.length > 0 && trimmed.length <= 80 && !RESERVED.has(trimmed.toLowerCase()) &&
		!/[\r\n\t]/.test(trimmed)
}

export function catalogProperties(category: ICategory): CatalogProperty[] {
	const fields = (category as CatalogCategory).catalogProperties
	return Array.isArray(fields) ? fields : []
}

function convertDefault(prop: CatalogProperty): string | number | boolean | string[] | null {
	if (prop.type === 'checkbox') return prop.defaultValue === true || prop.defaultValue === 'true'
	const text = typeof prop.defaultValue === 'string' ? prop.defaultValue : ''
	if (prop.type === 'list') return text.split(',').map(item => item.trim()).filter(Boolean)
	if (prop.type === 'number') {
		const value = text.trim()
		if (!value) return null
		const result = Number(value)
		return Number.isFinite(result) ? result : null
	}
	return text
}

export function applyCatalogProperties(fields: Record<string, unknown>, category: ICategory): void {
	const seen = new Set<string>()
	for (const prop of catalogProperties(category)) {
		if (!prop || typeof prop.name !== 'string' || !validCatalogPropertyName(prop.name)) continue
		const name = prop.name.trim()
		const key = name.toLowerCase()
		if (seen.has(key) || !CATALOG_PROPERTY_TYPES.includes(prop.type)) continue
		seen.add(key)
		if (!Object.prototype.hasOwnProperty.call(fields, name)) fields[name] = convertDefault(prop)
	}
}
