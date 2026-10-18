import { App, Modal, Setting } from 'obsidian'
import { tr } from '../i18n'
import { traktDevice, traktDeviceToken, type TraktTokens } from '../trakt'

// Trakt's device sign-in: a code to approve on trakt.tv, polled until approved.
// Works on mobile too, since nothing has to come back to the plugin.
export class TraktLoginModal extends Modal {
	private done = false
	private timer = 0

	constructor(app: App, private onTokens: (tokens: TraktTokens | null) => void) {
		super(app)
	}

	onOpen(): void {
		this.setTitle(tr('trakt.loginTitle'))
		void this.start()
	}

	onClose(): void {
		window.clearTimeout(this.timer)
		this.contentEl.empty()
		this.finish(null)
	}

	private finish(tokens: TraktTokens | null): void {
		if (this.done) return
		this.done = true
		this.onTokens(tokens)
	}

	private async start(): Promise<void> {
		const { contentEl } = this
		const device = await traktDevice()
		if (this.done) return
		if (!device) {
			contentEl.createEl('p', { text: tr('notice.site.failed', { site: 'Trakt' }) })
			return
		}
		contentEl.createEl('p', { text: tr('trakt.code') })
		contentEl.createDiv({ cls: 'library-trakt-code', text: device.user })
		new Setting(contentEl).addButton(button => button.setButtonText(tr('trakt.open')).setCta().onClick(() => {
			window.open(device.url)
		}))
		const status = contentEl.createEl('p', { cls: 'setting-item-description', text: tr('trakt.waiting') })
		const poll = async (): Promise<void> => {
			if (this.done) return
			const answer = await traktDeviceToken(device)
			if (this.done) return
			if (answer === 'wait') {
				this.timer = window.setTimeout(() => void poll(), device.interval * 1000)
				return
			}
			if (!answer) {
				status.setText(tr('trakt.expired'))
				return
			}
			this.finish(answer)
			this.close()
		}
		this.timer = window.setTimeout(() => void poll(), device.interval * 1000)
	}
}
