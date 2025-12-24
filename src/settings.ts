import { App, PluginSettingTab, Setting } from 'obsidian';
import FolderSyncPlugin from './main';

export class FolderSyncSettingTab extends PluginSettingTab {
	plugin: FolderSyncPlugin;

	constructor(app: App, plugin: FolderSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Folder Sync Settings' });

		// Base Folder Setting
		new Setting(containerEl)
			.setName('Base folder path')
			.setDesc('Folders will be created inside this base folder. Leave empty to use vault root.')
			.addText(text => text
				.setPlaceholder('Example: Resources')
				.setValue(this.plugin.settings.baseFolder)
				.onChange(async (value) => {
					this.plugin.settings.baseFolder = value;
					await this.plugin.saveSettings();
				}));

		// Deletion Behavior Setting
		new Setting(containerEl)
			.setName('Folder deletion behavior')
			.setDesc('Choose what happens to folders when their corresponding markdown file is deleted')
			.addDropdown(dropdown => dropdown
				.addOption('always', 'Always delete folder and contents')
				.addOption('never', 'Keep the folder')
				.addOption('if-empty', 'Delete only if folder is empty')
				.setValue(this.plugin.settings.deletionBehavior)
				.onChange(async (value) => {
					this.plugin.settings.deletionBehavior = value as 'always' | 'never' | 'if-empty';
					await this.plugin.saveSettings();
				}));

		// Prevent Duplicate Names Setting
		new Setting(containerEl)
			.setName('Prevent duplicate file names')
			.setDesc('Prevent creating or renaming files to a name that already exists anywhere in the vault')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.preventDuplicateNames)
				.onChange(async (value) => {
					this.plugin.settings.preventDuplicateNames = value;
					await this.plugin.saveSettings();
				}));
	}
}
