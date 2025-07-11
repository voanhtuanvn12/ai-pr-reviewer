export interface PatchLine {
    lineNumber: number;
    type: 'added' | 'removed' | 'context';
    content: string;
    originalLine: string;
}