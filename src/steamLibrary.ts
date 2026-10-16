import { requestUrl } from 'obsidian'

// Everything Steam: the sign-in window's address, the SteamID it hands back,
// and the library itself. Nobody types a key — the window keeps the account's
// cookies in its own partition (the one ui/authModal.ts makes), and a hidden
// webview on that partition reads steamcommunity.com as the signed-in user: a
// short-lived token for the Web API and an achievements page per game. Nothing
// about the session or the account is stored in settings.
const API = 'https://api.steampowered.com'
const WEB = 'https://steamcommunity.com'
const ORIGIN = encodeURIComponent(WEB)
// The sign-in window's partition, so the hidden webview sees its cookies.
const PARTITION = 'persist:library-auth'

// The OpenID window: Steam signs the user in and sends them back to
// steamcommunity.com with the account in the address, which is all the
// import needs to know.
export function steamAuthUrl(): string {
	const params = [
		'openid.ns=http://specs.openid.net/auth/2.0',
		'openid.mode=checkid_setup',
		`openid.return_to=${encodeURIComponent(`${WEB}/`)}`,
		`openid.realm=${encodeURIComponent(WEB)}`,
		'openid.identity=http://specs.openid.net/auth/2.0/identifier_select',
		'openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select'
	]
	return `${WEB}/openid/login?${params.join('&')}`
}

// The SteamID64 out of the address the window comes back to; null while it is
// still on the sign-in page, and for anything that is not steamcommunity.com.
export function steamIdFromRedirect(url: string): string | null {
	if (!url.startsWith(`${WEB}/`)) return null
	const match = url.match(/(?:%2F|\/)id(?:%2F|\/)(7656119\d{10})/)
	return match?.[1] ?? null
}

export interface OwnedGame {
	appId: number
	name: string
	minutes: number
	/** Last session end, epoch seconds; 0 when the game was never played. */
	lastPlayed: number
}

export interface SteamStats {
	achieved: number
	total: number
}

async function get<T>(url: string): Promise<T | null> {
	try {
		const resp = await requestUrl({ url, throw: false })
		if (resp.status !== 200) return null
		return resp.json as T
	} catch (e) {
		console.error('Library: Steam Web API error', e)
		return null
	}
}

// The token out of the JSON the signed-in page shows; null while the window is
// somewhere else, where the text is not that JSON.
export function steamTokenFromAnswer(text: string): string | null {
	try {
		const answer = JSON.parse(text) as { data?: { webapi_token?: unknown } }
		const token = answer.data?.webapi_token
		return typeof token === 'string' && token !== '' ? token : null
	} catch {
		return null
	}
}

export interface SteamSession {
	token: string
	stats(appId: number): Promise<SteamStats | null>
	close(): void
}

// The signed-in session, behind a webview two pixels wide on the window's
// partition: it reads the token once, then the achievements page of whatever
// game is asked for. Null when the session is gone — the window lands on the
// sign-in page — so the import can ask the user to connect again.
export async function steamSession(steamId: string): Promise<SteamSession | null> {
	// Made by the window it draws in, like the sign-in window itself.
	const win = activeDocument.win as Window & { createEl: typeof createEl }
	const view = win.createEl('webview' as keyof HTMLElementTagNameMap, {
		cls: 'library-steam-probe',
		attr: { partition: PARTITION, src: `${WEB}/pointssummary/ajaxgetasyncconfig` }
	})
	activeDocument.body.appendChild(view)
	const guest = view as unknown as { executeJavaScript: (code: string) => Promise<unknown> }

	let closed = false
	const close = (): void => {
		if (closed) return
		closed = true
		view.remove()
	}
	// Nothing here may hang an import: every answer has its own deadline.
	const read = async (code: string): Promise<string> => {
		let timer = 0
		const answer = await Promise.race([
			guest.executeJavaScript(code).catch(() => null),
			new Promise<null>(resolve => { timer = window.setTimeout(() => resolve(null), 15000) })
		])
		window.clearTimeout(timer)
		return typeof answer === 'string' ? answer : ''
	}

	// The page is ready once its text parses; a window sitting on the sign-in
	// page instead is what a dead session looks like.
	let token: string | null = null
	const until = Date.now() + 15000
	while (token === null && Date.now() < until) {
		await new Promise<void>(resolve => { window.setTimeout(resolve, 400) })
		token = steamTokenFromAnswer(await read('document.body ? document.body.innerText : ""'))
	}
	if (token === null) {
		close()
		return null
	}

	const id = encodeURIComponent(steamId)
	// The achievements summary is in the page as "... of ...", in English,
	// whatever the account's own language is. window.fetch in the page carries
	// the session cookies; the plugin's own code never calls fetch.
	const page = (appId: number): string =>
		`window.fetch("/profiles/${id}/stats/${String(appId)}?l=english").then(r => r.text()).then(t => {` +
		' const m = /topSummaryAchievements[^>]*>[\\s\\S]*?([\\d,]+) of ([\\d,]+)/.exec(t);' +
		' return m ? m[1].replace(/,/g, "") + "/" + m[2].replace(/,/g, "") : ""; }).catch(() => "")'

	return {
		token,
		stats: async (appId: number): Promise<SteamStats | null> => {
			const match = /^(\d+)\/(\d+)$/.exec(await read(page(appId)))
			if (!match) return null
			const achieved = Number(match[1])
			const total = Number(match[2])
			return total > 0 ? { achieved, total } : null
		},
		close
	}
}

// null when the request fails or the token has gone stale.
export async function ownedGames(token: string, steamId: string): Promise<OwnedGame[] | null> {
	const json = await get<{ response?: { games?: { appid: number; name?: string; playtime_forever?: number; rtime_last_played?: number }[] } }>(
		`${API}/IPlayerService/GetOwnedGames/v1/?access_token=${encodeURIComponent(token)}&steamid=${encodeURIComponent(steamId)}` +
		`&include_appinfo=1&include_played_free_games=1&origin=${ORIGIN}`
	)
	const games = json?.response?.games
	if (!games) return null
	return games.map(g => ({
		appId: g.appid,
		name: g.name ?? String(g.appid),
		minutes: g.playtime_forever ?? 0,
		lastPlayed: g.rtime_last_played ?? 0
	}))
}

// Hours with one decimal, the unit the Playtime property stores.
export function playtimeHours(minutes: number): number {
	return Math.round(minutes / 6) / 10
}
