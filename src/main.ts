import { Plugin, TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import { FolderSyncSettings, DEFAULT_SETTINGS } from './types';
import { FolderSyncSettingTab } from './settings';

export default class FolderSyncPlugin extends Plugin {
	settings: FolderSyncSettings;
	private isReverting: boolean = false;
	private isDeletingDuplicate: boolean = false;
	private pluginLoadTime: number = 0;

	async onload() {
		await this.loadSettings();

		// Record plugin load time
		this.pluginLoadTime = Date.now();

		// Register event handlers
		this.registerEvent(
			this.app.vault.on('create', this.handleFileCreate.bind(this))
		);

		this.registerEvent(
			this.app.vault.on('modify', this.handleFileModify.bind(this))
		);

		this.registerEvent(
			this.app.vault.on('rename', this.handleFileRename.bind(this))
		);

		this.registerEvent(
			this.app.vault.on('delete', this.handleFileDelete.bind(this))
		);

		// Add settings tab
		this.addSettingTab(new FolderSyncSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// File Create Handler
	async handleFileCreate(file: TAbstractFile) {
		// Ignore if we're deleting a duplicate
		if (this.isDeletingDuplicate) return;

		// Type guard: Check if file is TFile
		if (!(file instanceof TFile)) return;

		// Filter: Only process markdown files
		if (!this.isMarkdownFile(file)) return;

		// Only process files created after plugin load (ignore existing files on restart)
		if (file.stat.ctime < this.pluginLoadTime) return;

		// Check for duplicate names if enabled
		if (this.settings.preventDuplicateNames) {
			const duplicate = this.findDuplicateFile(file);
			if (duplicate) {
				// Open the existing file first
				const activeLeaf = this.app.workspace.activeLeaf;
				if (activeLeaf) {
					await activeLeaf.openFile(duplicate);
				}

				// Delete the newly created file after opening the existing one
				setTimeout(async () => {
					this.isDeletingDuplicate = true;
					await this.app.vault.delete(file);
					this.isDeletingDuplicate = false;
				}, 50);

				new Notice(
					`File "${file.basename}.md" already exists. Opening ${duplicate.path}`,
					4000
				);
				return;
			}
		}

		// Construct folder path
		const folderPath = this.getFolderPathForFile(file.path);

		// Check if folder already exists
		if (await this.folderExists(folderPath)) return;

		// Create base folder if it doesn't exist
		if (this.settings.baseFolder && !(await this.folderExists(this.settings.baseFolder))) {
			try {
				await this.app.vault.createFolder(this.settings.baseFolder);
			} catch (error: any) {
				// Ignore "already exists" errors (race condition when loading)
				if (!error.message?.includes('already exists')) {
					new Notice(`Failed to create base folder: ${error.message}`, 5000);
					console.error('Base folder creation error:', error);
					return;
				}
			}
		}

		// Create the folder
		try {
			await this.app.vault.createFolder(folderPath);
		} catch (error: any) {
			// Ignore "already exists" errors (race condition when loading)
			if (!error.message?.includes('already exists')) {
				new Notice(`Failed to create folder: ${error.message}`, 5000);
				console.error('Folder creation error:', error);
			}
		}
	}

	// File Rename Handler
	async handleFileRename(file: TAbstractFile, oldPath: string) {
		// Ignore events triggered by our own revert operation
		if (this.isReverting) return;

		// Type guard and filter
		if (!(file instanceof TFile)) return;
		if (!this.isMarkdownFile(file)) return;

		// Check for duplicate names if enabled
		if (this.settings.preventDuplicateNames) {
			const duplicate = this.findDuplicateFile(file);
			if (duplicate) {
				// Revert the file name to original
				try {
					this.isReverting = true;
					await this.app.vault.rename(file, oldPath);
					new Notice(
						`Cannot rename: A file named "${file.basename}.md" already exists at ${duplicate.path}`,
						5000
					);
				} catch (error) {
					new Notice(`Error reverting file name: ${error.message}`, 5000);
					console.error('File name revert error:', error);
				} finally {
					this.isReverting = false;
				}
				return;
			}
		}

		// Calculate old and new folder paths
		const oldFolderPath = this.getFolderPathForFile(oldPath);
		const newFolderPath = this.getFolderPathForFile(file.path);

		// If folder name hasn't changed (file just moved to different location), do nothing
		if (oldFolderPath === newFolderPath) return;

		// Check if old folder exists
		const oldFolder = this.app.vault.getAbstractFileByPath(oldFolderPath);
		if (!(oldFolder instanceof TFolder)) return;

		// Check for naming conflicts
		if (await this.folderExists(newFolderPath)) {
			// Revert the file name to original
			try {
				this.isReverting = true;
				await this.app.vault.rename(file, oldPath);
				new Notice(
					`Cannot rename: A folder named "${newFolderPath}" already exists. File name reverted.`,
					5000
				);
			} catch (error) {
				new Notice(`Error reverting file name: ${error.message}`, 5000);
				console.error('File name revert error:', error);
			} finally {
				this.isReverting = false;
			}
			return;
		}

		// Rename the folder
		try {
			await this.app.vault.rename(oldFolder, newFolderPath);
		} catch (error) {
			new Notice(`Failed to rename folder: ${error.message}`, 5000);
			console.error('Folder rename error:', error);
		}
	}

	// File Delete Handler
	async handleFileDelete(file: TAbstractFile) {
		// Ignore if we're deleting a duplicate
		if (this.isDeletingDuplicate) return;

		// Type guard and filter
		if (!(file instanceof TFile)) return;
		if (!this.isMarkdownFile(file)) return;

		// Get corresponding folder
		const folderPath = this.getFolderPathForFile(file.path);
		const folder = this.app.vault.getAbstractFileByPath(folderPath);

		if (!(folder instanceof TFolder)) return;

		// Apply deletion behavior based on settings
		try {
			switch (this.settings.deletionBehavior) {
				case 'always':
					await this.app.vault.trash(folder, true); // force=true
					break;

				case 'never':
					// Do nothing
					break;

				case 'if-empty':
					if (await this.isFolderEmpty(folder)) {
						await this.app.vault.trash(folder, false);
					}
					break;
			}
		} catch (error) {
			new Notice(`Failed to delete folder: ${error.message}`, 5000);
			console.error('Folder deletion error:', error);
		}
	}

	// File Modify Handler
	async handleFileModify(file: TAbstractFile) {
		// Type guard and filter
		if (!(file instanceof TFile)) return;
		if (!this.isMarkdownFile(file)) return;

		// Only process if user is actively editing this file
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile || activeFile.path !== file.path) return;

		// Construct folder path
		const folderPath = this.getFolderPathForFile(file.path);

		// Check if folder already exists
		if (await this.folderExists(folderPath)) return;

		// Create base folder if it doesn't exist
		if (this.settings.baseFolder && !(await this.folderExists(this.settings.baseFolder))) {
			try {
				await this.app.vault.createFolder(this.settings.baseFolder);
			} catch (error: any) {
				// Ignore "already exists" errors (race condition)
				if (!error.message?.includes('already exists')) {
					new Notice(`Failed to create base folder: ${error.message}`, 5000);
					console.error('Base folder creation error:', error);
					return;
				}
			}
		}

		// Create the folder
		try {
			await this.app.vault.createFolder(folderPath);
		} catch (error: any) {
			// Ignore "already exists" errors (race condition)
			if (!error.message?.includes('already exists')) {
				new Notice(`Failed to create folder: ${error.message}`, 5000);
				console.error('Folder creation error:', error);
			}
		}
	}

	// Helper: Check if file is markdown
	isMarkdownFile(file: TAbstractFile): boolean {
		return file instanceof TFile && file.extension === 'md';
	}

	// Helper: Get folder path for a file
	getFolderPathForFile(filePath: string): string {
		// Extract filename without extension
		const fileName = filePath.split('/').pop()?.replace('.md', '') || '';

		// Combine with base folder if set
		if (this.settings.baseFolder) {
			return `${this.settings.baseFolder}/${fileName}`;
		}
		return fileName;
	}

	// Helper: Check if folder exists
	async folderExists(path: string): Promise<boolean> {
		const abstractFile = this.app.vault.getAbstractFileByPath(path);
		return abstractFile instanceof TFolder;
	}

	// Helper: Check if folder is empty
	async isFolderEmpty(folder: TFolder): Promise<boolean> {
		return folder.children.length === 0;
	}

	// Helper: Find duplicate file with same basename
	findDuplicateFile(file: TFile): TFile | null {
		const allMarkdownFiles = this.app.vault.getMarkdownFiles();
		const duplicate = allMarkdownFiles.find(
			f => f.path !== file.path && f.basename === file.basename
		);
		return duplicate || null;
	}
}
