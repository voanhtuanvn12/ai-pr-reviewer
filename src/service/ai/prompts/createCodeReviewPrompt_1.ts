import { FileChange } from "../interfaces/FileChange";
import { PatchLine } from "../interfaces/PatchLine";
import { PRContext } from "../interfaces/PRContext";
import { JavaIgnoredRules } from "./ignoredJavaRules";

export function createCodeReviewPrompt(
  file: FileChange,
  patchLines: PatchLine[],
  prContext: PRContext
): string {
  const addedLines = patchLines.filter(line => line.type === 'added');
  const removedLines = patchLines.filter(line => line.type === 'removed');

  const formattedAddedLines = addedLines
    .map(line => `${line.lineNumber}: ${line.originalLine}`)
    .join('\n');

  const formattedRemovedLines = removedLines
    .map(line => `${line.lineNumber}: ${line.originalLine}`)
    .join('\n');

  console.log(`file language: ${file.language}`);

  return `
Please review the following code change with this context:

🧾 Pull Request Context:
- Title: ${prContext.title}
- Description: ${prContext.description}
- Author: ${prContext.author}

📄 File Info:
- Path: ${file.filename}
- Language: ${file.language}
- Additions: ${file.additions}
- Deletions: ${file.deletions}

🔍 Context Around Changes (10 lines before):
\`\`\`${file.language}
${file.contextBefore}
\`\`\`

🔍 Context Around Changes (10 lines after):
\`\`\`${file.language}
${file.contextAfter}
\`\`\`

📝 Specific Changes (Patch):
\`\`\`diff
${file.patch}
\`\`\`

➕ Lines Added:
${formattedAddedLines || '(none)'}

➖ Lines Removed:
${formattedRemovedLines || '(none)'}

Focus on:
1. Security > Bug > Performance > Logic > Style
2. Confirm if changes align with PR intent.
3. Only high or medium severity issues.
4. Suggestions must include actual improved code or leave empty if none needed.
5. Respect existing code style, avoid unnecessary refactors.

🛠️ For each issue found, provide:
- Line number
- Issue type: one of "bug", "performance", "security", "style", or "logic"
- Severity: "low", "medium", or "high"
- Message: clear explanation of the issue
- Suggestion: actual improved code snippet (do not provide without code); leave empty string if no code change is needed; must follow the format such as indentation, etc.
- Reasoning: why this suggestion improves the code

📤 Format your response as a JSON array. Example:
[
  {
    "line": 42,
    "type": "bug",
    "severity": "high",
    "message": "Off-by-one error in loop condition",
    "suggestion": "for (let i = 0; i < array.length; i++) {",
    "reasoning": "Prevents accessing out-of-bounds index on the array"
  },
  {
    "line": 17,
    "type": "style",
    "severity": "low",
    "message": "Missing semicolon at end of line",
    "suggestion": "",
    "reasoning": "While minor, consistent use of semicolons improves readability and avoids potential ASI issues"
  }
]

🚨 Focus your review on the *added* lines and their immediate context. Be specific and constructive.
When providing suggestions, ensure they are practical and maintainable, also consider the existing code style and conventions.
Avoid duplicate suggestions for the same issue.
Be smart of suggesting code changes on pipelines or other complex expressions that may not be easily refactored.
The code changes suggested must be clear and concise, directed to the lines that need to be changed, don, avoiding unnecessary complexity.
Respect the tab size and indentation style when suggesting code changes.
Just return the "high" and "medium" isssues, do not return "low" issues.
${file.language === 'java' ? `${JavaIgnoredRules}` : ''}
`.trim();
}




// Additional Notes:
// - Must fowllow the SonarSource code review format.