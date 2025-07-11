// src/service/ai/codeReviewer.ts

import { SYSTEM_PROMPT, SYSTEM_PROMPT_FOR_CODE_REVIEW } from "../github/copilot/constant";
import { generateContent } from "../github/copilot/generateContent";
import { CopilotQueryBuilder } from "../github/copilot/type";
import { generateCopilotRequest } from "../github/copilot/utils";
import { FileChange } from "./interfaces/FileChange"
import { PRContext } from "./interfaces/PRContext"
import { ReviewSuggestion } from "./interfaces/ReviewSuggestion"
import { PatchLine } from "./interfaces/PatchLine"
import { createCodeReviewPrompt } from "./prompts/createCodeReviewPrompt";
import * as core from '@actions/core'

export async function analyzeCodeChanges({
    fileChanges,
    prContext
}: {
    fileChanges: FileChange[],
    prContext: PRContext
}): Promise<ReviewSuggestion[]> {
    const allSuggestions: ReviewSuggestion[] = [];

    for (const file of fileChanges) {
        console.log(`🔍 Analyzing ${file.filename}...`);
        try {
            const suggestions = await analyzeFileChanges(file, prContext);
            allSuggestions.push(...suggestions);
        } catch (error) {
            console.error(`Error analyzing ${file.filename}:`, error);
        }
    }

    return allSuggestions;
}


async function analyzeFileChanges(file: FileChange, prContext: PRContext): Promise<ReviewSuggestion[]> {
    const suggestions: ReviewSuggestion[] = [];

    // Parse the patch to get line-by-line changes
    const patchLines = parsePatch(file.patch);

    // Create AI prompt for code review
    const prompt = createCodeReviewPrompt(file, patchLines, prContext);

    try {
        // Call your AI service (OpenAI, Claude, etc.)
        const aiResponse = await callAIService(prompt);

        // Parse AI response into structured suggestions
        const parsedSuggestions = parseAIResponse(aiResponse, file.filename);
        // console.log(`AI suggestions for ${file.filename}:`, parsedSuggestions);
        suggestions.push(...parsedSuggestions);
    } catch (error) {
        console.error('AI service error:', error);
    }

    // Add rule-based checks as backup
    const ruleBasedSuggestions = performRuleBasedReview(file, patchLines);
    suggestions.push(...ruleBasedSuggestions);

    return suggestions;
}

function parsePatch(patch: string): PatchLine[] {
    const lines: PatchLine[] = [];
    const patchLines = patch.split('\n');
    let currentLine = 0;
    let inHunk = false;

    for (const line of patchLines) {
        if (line.startsWith('@@')) {
            // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
            const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
            if (match) {
                currentLine = parseInt(match[1]) - 1;
                inHunk = true;
            }
            continue;
        }

        if (!inHunk) continue;

        if (line.startsWith('+') && !line.startsWith('+++')) {
            currentLine++;
            lines.push({
                lineNumber: currentLine,
                type: 'added',
                content: line.substring(1),
                originalLine: line
            });
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            lines.push({
                lineNumber: currentLine,
                type: 'removed',
                content: line.substring(1),
                originalLine: line
            });
        } else if (line.startsWith(' ')) {
            currentLine++;
            lines.push({
                lineNumber: currentLine,
                type: 'context',
                content: line.substring(1),
                originalLine: line
            });
        }
    }

    return lines;
}

async function callAIService(prompt: string): Promise<string> {
    // Option 1: OpenAI - Not supported in this version
    if (process.env.OPENAI_API_KEY) {
        return await callOpenAI(prompt);
    }

    // Option 2: Anthropic Claude - Not supported in this version
    if (process.env.ANTHROPIC_API_KEY) {
        return await callClaude(prompt);
    }

    // Option 3: Local AI or other services - Not supported in this version
    if (process.env.LOCAL_AI_URL) {
        return await callLocalAI(prompt);
    }

    if (process.env.COPILOT_TOKEN) {
        return await callCopilot(prompt);
    }
    throw new Error('No AI service configured');
}

async function callCopilot(prompt: string): Promise<string> {
    const copilotQueryBuilder: CopilotQueryBuilder = {
        copilotRequest: null,
        history: [
            {
                role: 'system',
                content: SYSTEM_PROMPT_FOR_CODE_REVIEW
            },
            {
                role: 'user',
                content: prompt
            }
        ]
    }

    const request = await generateCopilotRequest()

    copilotQueryBuilder.copilotRequest = request

    const response = await generateContent(copilotQueryBuilder, (response, done, isError) => {
        if (isError) {
            core.error(response)
            return null
        }

        if (done) {
            console.info(response)
            return response
        }
        return null
    })
    console.log('Generated PR content:', response)
    return response
}

async function callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert code reviewer. Provide constructive, specific feedback in JSON format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 2000
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

async function callClaude(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 2000,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        })
    });

    const data = await response.json();
    return data.content[0].text;
}

async function callLocalAI(prompt: string): Promise<string> {
    const response = await fetch(`${process.env.LOCAL_AI_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'codellama',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1,
            max_tokens: 1500
        })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

function parseAIResponse(aiResponse: string, filename: string): ReviewSuggestion[] {
    try {
        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.log('No JSON found in AI response');
            return [];
        }

        let jsonString = jsonMatch[0];
        
        // Clean up common JSON parsing issues
        jsonString = cleanJsonString(jsonString);

        console.log('Cleaned JSON string:', jsonString);
        
        const suggestions = JSON.parse(jsonString);

        return suggestions.map((suggestion: any) => ({
            filename,
            line: suggestion.line,
            type: suggestion.type || 'suggestion',
            severity: suggestion.severity || 'medium',
            message: suggestion.message,
            suggestedChange: suggestion.suggestion,
            reasoning: suggestion.reasoning
        }));
    } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response:', aiResponse);
        
        // Try to extract suggestions manually as fallback
        return extractSuggestionsManually(aiResponse, filename);
    }
}

function cleanJsonString(jsonString: string): string {
    // First, split the string into tokens to handle quoted strings properly
    let inString = false;
    let escapeNext = false;
    let current = '';
    
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];
        
        if (escapeNext) {
            current += char;
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            current += char;
            escapeNext = true;
            continue;
        }
        
        if (char === '"') {
            current += char;
            inString = !inString;
            continue;
        }
        
        if (inString) {
            // Inside a string - escape special characters
            switch (char) {
                case '\n':
                    current += '\\n';
                    break;
                case '\t':
                    current += '\\t';
                    break;
                case '\r':
                    current += '\\r';
                    break;
                case '\b':
                    current += '\\b';
                    break;
                case '\f':
                    current += '\\f';
                    break;
                default:
                    // Check for other control characters
                    if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) {
                        // Skip or replace control characters
                        current += ' ';
                    } else {
                        current += char;
                    }
                    break;
            }
        } else {
            // Outside string - keep character as is
            current += char;
        }
    }
    
    return current;
}

function extractSuggestionsManually(response: string, filename: string): ReviewSuggestion[] {
    const suggestions: ReviewSuggestion[] = [];
    
    try {
        // Try to extract individual suggestion objects
        const suggestionPattern = /{[^{}]*"line"[^{}]*"type"[^{}]*"severity"[^{}]*"message"[^{}]*}/g;
        const matches = response.match(suggestionPattern);
        
        if (matches) {
            for (const match of matches) {
                try {
                    const cleanMatch = cleanJsonString(match);
                    const suggestion = JSON.parse(cleanMatch);
                    
                    suggestions.push({
                        filename,
                        line: suggestion.line,
                        type: suggestion.type || 'suggestion',
                        severity: suggestion.severity || 'medium',
                        message: suggestion.message,
                        suggestedChange: suggestion.suggestion,
                        reasoning: suggestion.reasoning
                    });
                } catch (error) {
                    console.error('Failed to parse individual suggestion:', match);
                }
            }
        }
    } catch (error) {
        console.error('Manual extraction failed:', error);
    }
    
    return suggestions;
}

function performRuleBasedReview(file: FileChange, patchLines: PatchLine[]): ReviewSuggestion[] {
    const suggestions: ReviewSuggestion[] = [];

    for (const line of patchLines) {
        if (line.type !== 'added') continue;

        // Rule-based checks
        const content = line.content.trim();

        // Check for console.log in production code
        if (content.includes('console.log') && !file.filename.includes('test')) {
            suggestions.push({
                filename: file.filename,
                line: line.lineNumber,
                type: 'issue',
                severity: 'low',
                message: 'Consider removing console.log statements in production code',
                suggestedChange: 'Use proper logging library or remove debug statements',
                reasoning: 'Console statements should not be left in production code'
            });
        }

        // Check for TODO comments
        if (content.includes('TODO') || content.includes('FIXME')) {
            suggestions.push({
                filename: file.filename,
                line: line.lineNumber,
                type: 'nitpick',
                severity: 'low',
                message: 'TODO/FIXME comment found',
                reasoning: 'Consider creating a proper issue or completing the task'
            });
        }

        // Check for potential security issues
        if (content.includes('eval(') || content.includes('innerHTML')) {
            suggestions.push({
                filename: file.filename,
                line: line.lineNumber,
                type: 'security',
                severity: 'high',
                message: 'Potential security vulnerability detected',
                reasoning: 'Use of eval() or innerHTML can lead to XSS vulnerabilities'
            });
        }

        // Language-specific checks
        if (file.language === 'javascript' || file.language === 'typescript') {
            // Check for == instead of ===
            if (content.includes('==') && !content.includes('===') && !content.includes('!==')) {
                suggestions.push({
                    filename: file.filename,
                    line: line.lineNumber,
                    type: 'suggestion',
                    severity: 'low',
                    message: 'Consider using strict equality (===) instead of loose equality (==)',
                    suggestedChange: content.replace(/([^=!])=([^=])/g, '$1===$2'),
                    reasoning: 'Strict equality prevents type coercion issues'
                });
            }
        }
    }

    return suggestions;
}