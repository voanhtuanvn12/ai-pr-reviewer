export interface ReviewSuggestion {
    filename: string;
    line: number;
    type: 'suggestion' | 'issue' | 'nitpick' | 'security' | 'performance';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestedChange?: string;
    reasoning: string;
}