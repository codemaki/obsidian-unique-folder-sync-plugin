# Folder Sync Plugin for Obsidian

Automatically creates and syncs folders matching your markdown file names in a configurable base folder.

## Features

- **Auto-create folders**: When you create or save a markdown file, a folder with the same name is automatically created
- **Auto-rename folders**: When you rename a markdown file, the corresponding folder is renamed to match
- **Flexible deletion options**: Choose what happens to folders when you delete a markdown file
- **Configurable base folder**: Organize all synced folders in one location

## How it Works

1. **File Create/Save**: When you create a new markdown file (e.g., `Project.md`), the plugin creates a folder with the same name (e.g., `Project/`) in your configured base folder
2. **File Rename**: When you rename a markdown file, the corresponding folder is renamed automatically
   - If a folder with the new name already exists, you'll see an error notification
3. **File Delete**: When you delete a markdown file, the plugin handles the folder based on your settings:
   - **Always delete**: Removes the folder and all its contents
   - **Never delete**: Keeps the folder untouched
   - **Delete if empty** (default): Only removes the folder if it contains no files

## Settings

### Base Folder Path
Specify where synced folders should be created. Leave empty to create folders at the vault root.

Example: `Resources` will create folders like `Resources/Project/`

### Folder Deletion Behavior
Choose what happens when you delete a markdown file:
- **Always delete folder and contents**: Removes everything
- **Keep the folder**: Leaves the folder untouched
- **Delete only if folder is empty**: Safe deletion (default)

## Installation

### From Obsidian (Future)
1. Open Settings → Community plugins
2. Search for "Folder Sync"
3. Click Install

### Manual Installation
1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/folder-sync/` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## Development

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build
```

## Use Cases

- **Project Management**: Keep all project-related files organized in folders matching your project notes
- **Research Notes**: Store images, PDFs, and resources alongside your markdown notes
- **Knowledge Base**: Maintain a clean structure where each topic has its own folder

## License

MIT
