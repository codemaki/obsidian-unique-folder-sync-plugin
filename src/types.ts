export interface FolderSyncSettings {
	baseFolder: string;
	deletionBehavior: 'always' | 'never' | 'if-empty';
	preventDuplicateNames: boolean;
}

export const DEFAULT_SETTINGS: FolderSyncSettings = {
	baseFolder: '',
	deletionBehavior: 'if-empty',
	preventDuplicateNames: true
};

export enum DeletionBehavior {
	ALWAYS = 'always',
	NEVER = 'never',
	IF_EMPTY = 'if-empty'
}
