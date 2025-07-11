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

  // console.log(`file language: ${file.language}`);
  // console.log(`context before: ${file.contextBefore}`);
  // console.log(`context after: ${file.contextAfter}`);

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

🧠 Review Guidelines:
Evaluate the code and identify any of the following:
1. Code quality and best practices
2. Bugs or logical errors
3. Performance issues
4. Security vulnerabilities
5. Readability and maintainability concerns
6. Refactoring opportunities
7. Detect and suggest removal of unused or unnecessary imports.
8. Try to use context before and after the changes to understand the code better.

🛠️ Additional Rules:
- Respect existing coding patterns such as:
  - Builder pattern (chained methods)
  - Stream API
  - Fluent API
- Do not suggest replacing chaining expressions with "if" statements unless required for correctness or major improvement.
${file.language === 'java' ? `${JavaIgnoredRules}` : ''}
- Focus your review on the *added* lines and their immediate context. Be specific and constructive.
- When providing suggestions, ensure they are practical and maintainable, also consider the existing code style and conventions.
- Avoid duplicate suggestions for the same issue.
- The code changes suggested must be clear and concise, directed to the lines that need to be changed, don, avoiding unnecessary complexity.
- Respect the tab size and indentation style when suggesting code changes.
- Just return the "high" and "medium" isssues, do not return "low" issues.
- If the fuction's name is not clear, suggest a better name for it, but do not suggest changing the function signature or parameters.


🛠️ For each issue found, provide:
- Line number: the code line number where the issue occurs and need code change or new code
- Issue type: one of "bug", "performance", "security", "style", or "logic"
- Severity: "low", "medium", or "high"
- Message: clear explanation of the issue
- Suggestion: actual improved code snippet (do not provide without code); leave empty string if no code change is needed; must follow the format such as indentation, only show the code changed or code new.
- Reasoning: why this suggestion improves the code

📤 Format your response as a JSON array. **IMPORTANT**: 
- Escape all newlines as \\n 
- Escape all tabs as \\t
- Escape all quotes as \\"
- Do not include any actual newlines or control characters in the JSON strings
- Keep suggestion code on a single line or use \\n for line breaks

Example:
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
    "severity": "medium",
    "message": "Missing semicolon at end of line",
    "suggestion": "",
    "reasoning": "Consistent use of semicolons improves readability and avoids potential ASI issues"
  },
  {
    "line": 25,
    "type": "logic",
    "severity": "high",
    "message": "Potential null pointer exception",
    "suggestion": "if (variable != null) {\\n    variable.doSomething();\\n}",
    "reasoning": "Adding null check prevents runtime exceptions"
  }
]



`.trim();
}




// Additional Notes:
// - Must fowllow the SonarSource code review format.