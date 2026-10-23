import { App, Modal, Setting } from 'obsidian'
import { tr, trCount } from '../i18n'

// After notes leave the vault: which connected sites should drop them too.
// Nothing is removed unless Remove is pressed; closing the window keeps everything.
export class RemoteDeleteModal extends Modal {
	private chosen: Set<string>
	private answered = false

	constructor(app: App, private names: string[], private sites: { id: string; name: string; desc: string }[], private onRemove: (sites: Set<string>) => void) {
		super(app)
		this.chosen = new Set(sites.map(site => site.id))
	}

	onOpen(): void {
		const { contentEl } = this
		this.setTitle(tr('remoteDelete.title'))
		contentEl.createEl('p', {
			text: this.names.length === 1
				? tr('remoteDelete.one', { name: this.names[0] ?? '' })
				: trCount('remoteDelete.note', this.names.length)
		})
		if (this.names.length > 1) {
			const list = contentEl.createEl('ul')
			for (const name of this.names.slice(0, 10)) list.createEl('li', { text: name })
			if (this.names.length > 10) list.createEl('li', { text: '…' })
		}
		for (const site of this.sites) {
			new Setting(contentEl).setName(site.name).setDesc(site.desc).addToggle(toggle => toggle.setValue(true).onChange(on => {
				if (on) this.chosen.add(site.id)
				else this.chosen.delete(site.id)
			}))
		}
		new Setting(contentEl)
			.addButton(button => button.setButtonText(tr('dup.keep')).onClick(() => this.close()))
			// mod-warning by hand: setWarning is deprecated, setDestructive is newer than 1.8.7
			.addButton(button => button.setButtonText(tr('dup.remove')).onClick(() => {
				if (this.answered) return
				this.answered = true
				this.close()
				if (this.chosen.size > 0) this.onRemove(this.chosen)
			}).buttonEl.addClass('mod-warning'))
	}

	onClose(): void {
		this.contentEl.empty()
	}
}
