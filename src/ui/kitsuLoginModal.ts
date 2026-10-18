import { App, Modal, Setting } from 'obsidian'
import { tr } from '../i18n'

// Mobile path: the password grant needs no registered app, so the sign-in is a
// plain form (desktop signs in on the real site inside the auth window).
export class KitsuLoginModal extends Modal {
	private onSubmit: (username: string, password: string) => void

	constructor(app: App, onSubmit: (username: string, password: string) => void) {
		super(app)
		this.onSubmit = onSubmit
	}

	onOpen(): void {
		const { contentEl } = this
		this.setTitle(tr('kitsu.loginTitle'))
		let username = ''
		let password = ''
		new Setting(contentEl).setName(tr('kitsu.username')).addText((text) => {
			text.setPlaceholder('name@example.com')
			text.onChange((value) => { username = value })
		})
		const submit = (): void => {
			const name = username.trim()
			if (!name || !password) return
			this.close()
			this.onSubmit(name, password)
		}
		new Setting(contentEl).setName(tr('kitsu.password')).addText((text) => {
			text.inputEl.type = 'password'
			text.onChange((value) => { password = value })
			text.inputEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault()
					submit()
				}
			})
		})
		new Setting(contentEl).addButton((b) => b.setButtonText(tr('settings.connect')).setCta().onClick(submit))
	}

	onClose(): void {
		this.contentEl.empty()
	}
}
