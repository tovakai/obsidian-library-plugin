import { App, Modal } from 'obsidian'

// Sign-in webview (desktop only), own session partition: the next connect may skip the form.
export interface AuthModalOptions {
	title: string
	extract: (url: string) => string | null
	// Nintendo serves a wide layout unless it sees a phone.
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
		// The modal's own window: a webview from the main window takes no input in settings.
		const win = this.contentEl.ownerDocument.win as Window & { createEl: typeof createEl }
		const view = win.createEl('webview' as keyof HTMLElementTagNameMap, {
			cls: 'library-auth-webview',
			attr: { partition: 'persist:library-auth', src: this.authUrl, ...(this.opts.userAgent ? { useragent: this.opts.userAgent } : {}) },
		})
		// `window.__authTrail` for a stuck sign-in; token redacted, `extract` still sees the raw URL.
		const trail: string[] = []
		;(window as unknown as Record<string, unknown>).__authTrail = trail
		const arrive = (url: string): void => {
			if (!url) return
			const safe = url.replace(/([?#&](?:access_token|code)=)[^&\s]*/g, '$1…')
			if (trail[trail.length - 1] !== safe) trail.push(safe)
			const result = this.opts.extract(url)
			if (result) this.finish(result)
		}
		const check = (event: Event): void => {
			const detail = event as Event & { url?: string; validatedURL?: string }
			arrive(detail.url ?? detail.validatedURL ?? '')
		}
		// `load-commit` catches the failed localhost hop the other events skip.
		for (const name of ['will-navigate', 'did-start-navigation', 'did-redirect-navigation', 'did-navigate', 'load-commit', 'did-fail-load']) {
			view.addEventListener(name, check)
		}
		view.addEventListener('render-process-gone', () => trail.push('webview crashed'))
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
