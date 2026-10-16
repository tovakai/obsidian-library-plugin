import { App, Modal } from 'obsidian'

// An authorization page in a window inside Obsidian (desktop only). Shared by
// MyAnimeList (the redirect carries a code) and AniList (the redirect carries a
// token in the fragment): `extract` decides which part of a URL is the answer.
// The session lives in its own partition, so the next connect may skip the form.
export interface AuthModalOptions {
	title: string
	extract: (url: string) => string | null
	// A browser to present as: Nintendo lays its sign-in out for 1024px and
	// wider unless it sees a phone, and the phone layout fits the modal.
	userAgent?: string
}

export class AuthModal extends Modal {
	private authUrl: string
	private onResult: (result: string | null) => void
	private opts: AuthModalOptions
	private done = false
	private timerWin: Window | null = null
	private poll = 0

	constructor(app: App, authUrl: string, onResult: (result: string | null) => void, opts: AuthModalOptions) {
		super(app)
		this.authUrl = authUrl
		this.onResult = onResult
		this.opts = opts
	}

	onOpen(): void {
		this.setTitle(this.opts.title)
		this.modalEl.addClass('library-auth-modal')
		// The window is made by the window the modal opens in: settings have a
		// window of their own since Obsidian 1.13, and a webview made by the main
		// window draws in settings yet sends every click and scroll to the main
		// window, so the form takes no input.
		const win = this.contentEl.ownerDocument.win as Window & { createEl: typeof createEl }
		const view = win.createEl('webview' as keyof HTMLElementTagNameMap, {
			cls: 'library-auth-webview',
			attr: { partition: 'persist:library-auth', src: this.authUrl, ...(this.opts.userAgent ? { useragent: this.opts.userAgent } : {}) },
		})
		// Every address the window stood on, kept for a stuck sign-in: read back
		// through eval as `window.__authTrail`, with the answer redacted.
		const trail: string[] = []
		;(window as unknown as Record<string, unknown>).__authTrail = trail
		const arrive = (url: string): void => {
			if (!url) return
			// The trail is readable from the console, so the token or code never
			// enters it; the extraction below still sees the raw URL.
			const safe = url.replace(/([?#&](?:access_token|code)=)[^&\s]*/g, '$1…')
			if (trail[trail.length - 1] !== safe) trail.push(safe)
			// Only a URL carrying the answer ends the modal; an ordinary hop (the
			// login form, the consent page) is just another entry in the trail.
			const result = this.opts.extract(url)
			if (result) this.finish(result)
		}
		const check = (event: Event): void => {
			const detail = event as Event & { url?: string; validatedURL?: string }
			arrive(detail.url ?? detail.validatedURL ?? '')
		}
		// load-commit covers the failed localhost hop: its error page still commits
		// and carries the address, while a redirect may skip the earlier events.
		for (const name of ['will-navigate', 'did-start-navigation', 'did-redirect-navigation', 'did-navigate', 'load-commit', 'did-fail-load']) {
			view.addEventListener(name, check)
		}
		view.addEventListener('render-process-gone', () => trail.push('webview crashed'))
		// Last resort: the guest itself always knows where it ended up.
		this.timerWin = win
		this.poll = win.setInterval(() => {
			const guest = view as unknown as { getURL?: () => string }
			if (guest.getURL) arrive(guest.getURL())
		}, 300)
		this.contentEl.appendChild(view)
	}

	onClose(): void {
		if (this.poll && this.timerWin) this.timerWin.clearInterval(this.poll)
		this.poll = 0
		this.timerWin = null
		this.contentEl.empty()
		this.finish(null)
	}

	private finish(result: string | null): void {
		if (this.done) return
		this.done = true
		if (result) this.close()
		this.onResult(result)
	}
}
