 // Helper function to get detailed file changes
export type DetailedFileChange = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string;
  fullContent: string;
  contextBefore: string; // 10 lines before the change
  contextAfter: string;  // 10 lines after the change
  language: string;
};
