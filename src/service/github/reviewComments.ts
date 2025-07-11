// src/service/github/reviewComments.ts

import { ProbotOctokit } from "probot";

interface ReviewSuggestion {
    filename: string;
    line: number;
    type: 'suggestion' | 'issue' | 'nitpick' | 'security' | 'performance';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestedChange?: string;
    reasoning: string;
}

interface CreateReviewCommentsParams {
    octokit: any;
    owner: string;
    repo: string;
    pullNumber: number;
    reviewResults: ReviewSuggestion[];
}

export async function createReviewComments({
    octokit,
    owner,
    repo,
    pullNumber,
    reviewResults
}: CreateReviewCommentsParams): Promise<void> {

    // Group suggestions by severity and type
    const groupedSuggestions = groupSuggestionsByPriority(reviewResults);

    try {
        // Create a comprehensive review
        await createPullRequestReview({
            octokit,
            owner,
            repo,
            pullNumber,
            suggestions: reviewResults
        });

        // Create individual line comments for important issues
        await createLineComments({
            octokit,
            owner,
            repo,
            pullNumber,
            suggestions: groupedSuggestions.high.concat(groupedSuggestions.medium)
        });

        // Create a summary comment
        await createSummaryComment({
            octokit,
            owner,
            repo,
            pullNumber,
            groupedSuggestions
        });

    } catch (error) {
        console.error('Error creating review comments:', error);
        throw error;
    }
}

function groupSuggestionsByPriority(suggestions: ReviewSuggestion[]) {
    return {
        high: suggestions.filter(s => s.severity === 'high'),
        medium: suggestions.filter(s => s.severity === 'medium'),
        low: suggestions.filter(s => s.severity === 'low')
    };
}

async function createPullRequestReview({
    octokit,
    owner,
    repo,
    pullNumber,
    suggestions
}: {
    octokit: any;
    owner: string;
    repo: string;
    pullNumber: number;
    suggestions: ReviewSuggestion[];
}) {


    // Create review comments for each suggestion
    const comments = suggestions
        .map(suggestion => ({
            path: suggestion.filename,
            line: suggestion.line,
            body: formatReviewComment(suggestion)
        }))
        .filter(comment => comment.body !== null);

    // Determine overall review event
    const hasHighSeverity = suggestions.some(s => s.severity === 'high');
    const hasMediumSeverity = suggestions.some(s => s.severity === 'medium');

    let event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' = 'COMMENT';
    if (hasHighSeverity) {
        event = 'REQUEST_CHANGES';
    } else if (!hasMediumSeverity && suggestions.length === 0) {
        event = 'APPROVE';
    }

    const reviewBody = createReviewSummary(suggestions);

    try {
        await octokit.pulls.createReview({
            owner,
            repo,
            pull_number: pullNumber,
            event,
            body: reviewBody,
            comments: comments.slice(0, 15) // GitHub limit
        });
    } catch (error) {
        console.error('Error creating PR review:', error);
        // Fallback: create individual comments
        await createLineComments({ octokit, owner, repo, pullNumber, suggestions });
    }
}

async function createLineComments({
    octokit,
    owner,
    repo,
    pullNumber,
    suggestions
}: {
    octokit: ProbotOctokit;
    owner: string;
    repo: string;
    pullNumber: number;
    suggestions: ReviewSuggestion[];
}) {

    const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
    });

    const commitId = pr.head.sha;

    const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
    });


    for (const suggestion of suggestions) {
        try {
            const file = files.find(f => f.filename === suggestion.filename);
            if (!file || !file.patch) continue;

            // Convert line number to position in the diff
            // console.log(`Creating comment for ${suggestion.filename}:${suggestion.line}`);
            const position = getPositionFromPatch(file.patch, suggestion.line);
            // console.log(`Position for ${suggestion.filename}:${suggestion.line} is ${position}`);
            if (position === null) continue;

            const body = formatReviewComment(suggestion);
            if (!body) continue;
            // console.log(`Body for ${suggestion.filename}:${suggestion.line} is:`, body);

            await octokit.pulls.createReviewComment({
                owner,
                repo,
                pull_number: pullNumber,
                commit_id: commitId,
                path: suggestion.filename,
                position: position,
                body: body,
            });
        } catch (error) {
            console.error(`Error creating comment for ${suggestion.filename}:${suggestion.line}:`, error);
        }
    }

    // for (const suggestion of suggestions) {
    //     try {
    //         const body = formatReviewComment(suggestion);
    //         if (!body) continue; // Skip if no comment body
    //         await octokit.pulls.createReviewComment({
    //             owner,
    //             repo,
    //             pull_number: pullNumber,
    //             body: body,
    //             path: suggestion.filename,
    //             line: suggestion.line,
    //             side: 'RIGHT' // Comment on the new version
    //         });
    //     } catch (error) {
    //         console.error(`Error creating comment for ${suggestion.filename}:${suggestion.line}:`, error);
    //         // Continue with other comments
    //     }
    // }
}

function getPositionFromPatch(patch: string, lineNumber: number): number | null {
    const lines = patch.split('\n');
    let position = 0;
    let currentLine = 0;

    for (const line of lines) {
        position++;
        if (line.startsWith('@@')) {
            const match = /@@ \-(\d+),\d+ \+(\d+),\d+ @@/.exec(line);
            if (match) {
                currentLine = parseInt(match[2], 10) - 1;
            }
        } else if (!line.startsWith('-')) {
            currentLine++;
        }

        if (currentLine === lineNumber) {
            return position;
        }
    }

    return null;
}

async function createSummaryComment({
    octokit,
    owner,
    repo,
    pullNumber,
    groupedSuggestions
}: {
    octokit: any;
    owner: string;
    repo: string;
    pullNumber: number;
    groupedSuggestions: {
        high: ReviewSuggestion[];
        medium: ReviewSuggestion[];
        low: ReviewSuggestion[];
    };
}) {

    const totalSuggestions =
        groupedSuggestions.high.length +
        groupedSuggestions.medium.length +
        groupedSuggestions.low.length;

    if (totalSuggestions === 0) {
        await octokit.issues.createComment({
            owner,
            repo,
            issue_number: pullNumber,
            body: `## 🤖 AI Code Review Summary

✅ **Great job!** No issues found in this PR.

The code looks clean and follows best practices. Ready for merge! 🚀`
        });
        return;
    }

    const summaryBody = `## 🤖 AI Code Review Summary

Found **${totalSuggestions}** suggestions across ${new Set(Object.values(groupedSuggestions).flat().map(s => s.filename)).size} files:

${groupedSuggestions.high.length > 0 ? `
### 🚨 High Priority (${groupedSuggestions.high.length})
${groupedSuggestions.high.map(s => `- **${s.filename}:${s.line}** - ${s.message}`).join('\n')}
` : ''}

${groupedSuggestions.medium.length > 0 ? `
### ⚠️ Medium Priority (${groupedSuggestions.medium.length})
${groupedSuggestions.medium.map(s => `- **${s.filename}:${s.line}** - ${s.message}`).join('\n')}
` : ''}

${groupedSuggestions.low.length > 0 ? `
### 💡 Suggestions (${groupedSuggestions.low.length})
${groupedSuggestions.low.map(s => `- **${s.filename}:${s.line}** - ${s.message}`).join('\n')}
` : ''}

---
*Powered by AI Code Review Bot* 🤖`;

    await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: summaryBody
    });
}


function formatReviewComment(suggestion: ReviewSuggestion): string | null {
    if (suggestion.severity !== 'medium' && suggestion.severity !== 'low') {
        return null; // Skip high severity or unsupported types
    }

    const severityEmoji = {
        high: '🚨',
        medium: '⚠️',
        low: '💡'
    };

    const typeEmoji = {
        security: '🔒',
        performance: '⚡',
        issue: '🐛',
        suggestion: '💡',
        nitpick: '✨',
        other: '📝',
        logic: '🔍',
        style: '🎨',
        readability: '📖',
        bug: '🐞',
    };

    let comment = `${severityEmoji[suggestion.severity]} ${typeEmoji[suggestion.type] || '💬'} **${suggestion.type.toUpperCase()}** (${suggestion.severity} priority)

${suggestion.message}

**Reasoning:** ${suggestion.reasoning}`;

    if (suggestion.suggestedChange && suggestion.suggestedChange.trim() !== '') {
        comment += `

**Suggested change:**
\`\`\`suggestion
${suggestion.suggestedChange}
\`\`\``;
    }

    return comment;
}

function formatReviewComment2(suggestion: ReviewSuggestion): string {
    const severityEmoji = {
        "high": '🚨',
        "medium": '⚠️',
        "low": '💡'
    };

    const typeEmoji = {
        security: '🔒',
        performance: '⚡',
        issue: '🐛',
        suggestion: '💡',
        nitpick: '✨',
        other: '📝',
        logic: '🔍',
        style: '🎨',
        readability: '📖',
        bug: '🐞',
    };

    let comment = `${severityEmoji[suggestion.severity]} ${typeEmoji[suggestion.type]} **${suggestion.type.toUpperCase()}** (${suggestion.severity} priority)

${suggestion.message}

**Reasoning:** ${suggestion.reasoning}`;

    if (suggestion.suggestedChange) {
        comment += `

**Suggested change:**
\`\`\`suggestion
${suggestion.suggestedChange}
\`\`\``;
    }

    return comment;
}

function createReviewSummary(suggestions: ReviewSuggestion[]): string {
    if (suggestions.length === 0) {
        return '🎉 **AI Code Review**: No issues found! The code looks great.';
    }

    const groupedByType = suggestions.reduce((acc, suggestion) => {
        if (!acc[suggestion.type]) {
            acc[suggestion.type] = [];
        }
        acc[suggestion.type].push(suggestion);
        return acc;
    }, {} as Record<string, ReviewSuggestion[]>);

    const summary = Object.entries(groupedByType)
        .map(([type, items]) => `${items.length} ${type}${items.length > 1 ? 's' : ''}`)
        .join(', ');

    const hasHighSeverity = suggestions.some(s => s.severity === 'high');
    const emoji = hasHighSeverity ? '🚨' : '💡';

    return `${emoji} **AI Code Review**: Found ${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''} (${summary}). Please review the inline comments below.`;
}

// Export utility functions that might be useful elsewhere
export {
    groupSuggestionsByPriority,
    formatReviewComment,
    createReviewSummary
};