import { App, Modal } from 'obsidian'
import { tr } from '../i18n'
import { codeFromRedirect, psnAuthUrl } from '../psn'

// Sony's sign-in webview (desktop only), own session partition: the next connect may skip the form.
export class PsnLoginModal extends Modal {
	private onCode: (code: string | null) => void
	private done = false

	constructor(app: App, onCode: (code: string | null) => void) {
		super(app)
		this.onCode = onCode
	}

	onOpen(): void {
		this.setTitle(tr('psn.loginTitle'))
		this.modalEl.addClass('library-psn-modal')
		// Passkeys off: a Touch ID prompt inside a webview crashes Electron on macOS.
		// The attributes go in as the element is made: a webview fixes them at creation.
		// The modal's own window: a webview from the main window takes no input in settings.
		const win = this.contentEl.ownerDocument.win as Window & { createEl: typeof createEl }
		const view = win.createEl('webview' as keyof HTMLElementTagNameMap, {
			cls: 'library-psn-webview',
			attr: { partition: 'persist:library-psn', disableblinkfeatures: 'WebAuth', src: psnAuthUrl() },
		})
		const check = (event: Event): void => {
			const detail = event as Event & { url?: string; validatedURL?: string }
			const code = codeFromRedirect(detail.url ?? detail.validatedURL ?? '')
			if (code) this.finish(code)
		}
		for (const name of ['will-navigate', 'did-start-navigation', 'did-redirect-navigation', 'did-fail-load']) {
			view.addEventListener(name, check)
		}
		this.contentEl.appendChild(view)
	}

	onClose(): void {
		this.contentEl.empty()
		this.finish(null)
	}

	private finish(code: string | null): void {
		if (this.done) return
		this.done = true
		if (code) this.close()
		this.onCode(code)
	}
}
