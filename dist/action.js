"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/action.ts
var action_exports = {};
__export(action_exports, {
  runGitHubAction: () => runGitHubAction
});
module.exports = __toCommonJS(action_exports);
var core2 = __toESM(require("@actions/core"), 1);
var github = __toESM(require("@actions/github"), 1);

// src/service/github/copilot/constant.ts
var SYSTEM_PROMPT_FOR_CODE_REVIEW = `
You are a highly skilled senior software engineer specializing in code review, security, and best practices. Your reviews are clear, constructive, respectful, and focused on high-impact issues only. Avoid unnecessary suggestions.
`;

// src/service/github/copilot/generateContent.ts
var https2 = __toESM(require("https"), 1);

// src/service/github/copilot/utils.ts
var crypto = __toESM(require("crypto"), 1);
var https = __toESM(require("https"), 1);
var generateAskRequest = (history) => {
  return Promise.resolve({
    intent: true,
    // model: 'gpt-4.1',
    model: "claude-sonnet-4",
    n: 1,
    stream: true,
    temperature: 0.1,
    top_p: 1,
    messages: history,
    history,
    max_tokens: 8192
  });
};
var getToken = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: "/copilot_internal/v2/token",
      method: "GET",
      headers: {
        Authorization: `token ${process.env.COPILOT_TOKEN}`,
        Accept: "application/json",
        "Editor-Version": "vscode/1.85.1",
        "Editor-Plugin-Version": "copilot-chat/0.12.2023120701",
        "User-Agent": "GitHubCopilotChat/0.12.2023120701"
      }
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const tokenResponse = JSON.parse(data);
        resolve(tokenResponse.token);
      });
    });
    req.on("error", (error3) => {
      reject(error3);
    });
    req.end();
  });
};
var uuid = () => {
  return crypto.randomUUID();
};
var machineID = () => {
  return crypto.randomBytes(32).toString("hex");
};
var sessionID = () => {
  return uuid() + Date.now().toString();
};
var jsonParse = (s) => {
  try {
    return JSON.parse(s);
  } catch (err) {
    return null;
  }
};
var removeUntilData = (s) => {
  const index = s.indexOf("data:");
  return index === -1 ? s : s.substring(index + "data: ".length);
};
var parseResponse = (data, callback) => {
  const lines = data.split("\n");
  let isError = false;
  let reply = "";
  for (const line of lines) {
    const s = line.trim();
    if (s.startsWith('{"error":')) {
      const error3 = JSON.parse(s);
      reply = error3.error.message;
      isError = true;
      break;
    }
    if (s.includes("[DONE]")) {
      break;
    }
    if (!s.startsWith("data:")) {
      continue;
    }
    const jsonExtract = removeUntilData(s);
    const message = jsonParse(jsonExtract);
    if (message.choices.length > 0 && message.choices[0].delta.content) {
      const txt = message.choices[0].delta.content;
      reply += txt;
      callback(reply, false, isError);
    }
  }
  callback(reply, true, isError);
  return reply;
};
var generateCopilotRequest = async () => {
  const token = await getToken();
  return {
    token,
    sessionId: sessionID(),
    uuid: uuid(),
    machineId: machineID()
  };
};

// src/service/github/copilot/generateContent.ts
var generateContent = async (copilotQueryBuilder, callback) => {
  const request3 = await generateAskRequest(copilotQueryBuilder.history);
  const body = JSON.stringify(request3);
  const options = {
    hostname: "api.githubcopilot.com",
    path: "/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${copilotQueryBuilder.copilotRequest.token}`,
      "vscode-sessionid": copilotQueryBuilder.copilotRequest.sessionId,
      "x-request-id": copilotQueryBuilder.copilotRequest.uuid,
      "vscode-machineid": copilotQueryBuilder.copilotRequest.machineId,
      "Content-Type": "application/json",
      "openai-intent": "conversation-panel",
      "openai-organization": "github-copilot",
      "User-Agent": "GitHubCopilotChat/0.14.2024032901",
      "Editor-Version": "vscode/1.88.0",
      "Editor-Plugin-Version": "copilot-chat/0.14.2024032901",
      "x-github-api-version": "2023-07-07",
      "copilot-integration-id": "vscode-chat",
      Accept: "*/*",
      "Accept-Encoding": "gzip,deflate,br"
    }
  };
  return new Promise((resolve, reject) => {
    const req = https2.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(parseResponse(data, callback));
      });
    });
    req.on("error", (error3) => {
      reject(error3);
    });
    req.write(body);
    req.end();
  });
};

// src/service/ai/prompts/ignoredJavaRules.ts
var JavaIgnoredRules = `
    - do NOT suggest changes [S6436: Objects "isNull" and "nonNull"]
    - do NOT check if some function or decorator is imported
`;

// src/service/ai/prompts/createCodeReviewPrompt.ts
function createCodeReviewPrompt(file, patchLines, prContext) {
  const addedLines = patchLines.filter((line) => line.type === "added");
  const removedLines = patchLines.filter((line) => line.type === "removed");
  const formattedAddedLines = addedLines.map((line) => `${line.lineNumber}: ${line.originalLine}`).join("\n");
  const formattedRemovedLines = removedLines.map((line) => `${line.lineNumber}: ${line.originalLine}`).join("\n");
  return `
Please review the following code change with this context:

\u{1F9FE} Pull Request Context:
- Title: ${prContext.title}
- Description: ${prContext.description}
- Author: ${prContext.author}

\u{1F4C4} File Info:
- Path: ${file.filename}
- Language: ${file.language}
- Additions: ${file.additions}
- Deletions: ${file.deletions}

\u{1F50D} Context Around Changes (10 lines before):
\`\`\`${file.language}
${file.contextBefore}
\`\`\`

\u{1F50D} Context Around Changes (10 lines after):
\`\`\`${file.language}
${file.contextAfter}
\`\`\`

\u{1F4DD} Specific Changes (Patch):
\`\`\`diff
${file.patch}
\`\`\`

\u2795 Lines Added:
${formattedAddedLines || "(none)"}

\u2796 Lines Removed:
${formattedRemovedLines || "(none)"}

\u{1F9E0} Review Guidelines:
Evaluate the code and identify any of the following:
1. Code quality and best practices
2. Bugs or logical errors
3. Performance issues
4. Security vulnerabilities
5. Readability and maintainability concerns
6. Refactoring opportunities
7. Detect and suggest removal of unused or unnecessary imports.
8. Try to use context before and after the changes to understand the code better.

\u{1F6E0}\uFE0F Additional Rules:
- Respect existing coding patterns such as:
  - Builder pattern (chained methods)
  - Stream API
  - Fluent API
- Do not suggest replacing chaining expressions with "if" statements unless required for correctness or major improvement.
${file.language === "java" ? `${JavaIgnoredRules}` : ""}
- Focus your review on the *added* lines and their immediate context. Be specific and constructive.
- When providing suggestions, ensure they are practical and maintainable, also consider the existing code style and conventions.
- Avoid duplicate suggestions for the same issue.
- The code changes suggested must be clear and concise, directed to the lines that need to be changed, don, avoiding unnecessary complexity.
- Respect the tab size and indentation style when suggesting code changes.
- Just return the "high" and "medium" isssues, do not return "low" issues.
- If the fuction's name is not clear, suggest a better name for it, but do not suggest changing the function signature or parameters.


\u{1F6E0}\uFE0F For each issue found, provide:
- Line number: the code line number where the issue occurs and need code change or new code
- Issue type: one of "bug", "performance", "security", "style", or "logic"
- Severity: "low", "medium", or "high"
- Message: clear explanation of the issue
- Suggestion: actual improved code snippet (do not provide without code); leave empty string if no code change is needed; must follow the format such as indentation, only show the code changed or code new.
- Reasoning: why this suggestion improves the code

\u{1F4E4} Format your response as a JSON array. **IMPORTANT**: 
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

// src/service/ai/codeReviewer.ts
var core = __toESM(require("@actions/core"), 1);
async function analyzeCodeChanges({
  fileChanges,
  prContext
}) {
  const allSuggestions = [];
  for (const file of fileChanges) {
    console.log(`\u{1F50D} Analyzing ${file.filename}...`);
    try {
      const suggestions = await analyzeFileChanges(file, prContext);
      allSuggestions.push(...suggestions);
    } catch (error3) {
      console.error(`Error analyzing ${file.filename}:`, error3);
    }
  }
  return allSuggestions;
}
async function analyzeFileChanges(file, prContext) {
  const suggestions = [];
  const patchLines = parsePatch(file.patch);
  const prompt = createCodeReviewPrompt(file, patchLines, prContext);
  try {
    const aiResponse = await callAIService(prompt);
    const parsedSuggestions = parseAIResponse(aiResponse, file.filename);
    suggestions.push(...parsedSuggestions);
  } catch (error3) {
    console.error("AI service error:", error3);
  }
  const ruleBasedSuggestions = performRuleBasedReview(file, patchLines);
  suggestions.push(...ruleBasedSuggestions);
  return suggestions;
}
function parsePatch(patch) {
  const lines = [];
  const patchLines = patch.split("\n");
  let currentLine = 0;
  let inHunk = false;
  for (const line of patchLines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        currentLine = parseInt(match[1]) - 1;
        inHunk = true;
      }
      continue;
    }
    if (!inHunk) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentLine++;
      lines.push({
        lineNumber: currentLine,
        type: "added",
        content: line.substring(1),
        originalLine: line
      });
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      lines.push({
        lineNumber: currentLine,
        type: "removed",
        content: line.substring(1),
        originalLine: line
      });
    } else if (line.startsWith(" ")) {
      currentLine++;
      lines.push({
        lineNumber: currentLine,
        type: "context",
        content: line.substring(1),
        originalLine: line
      });
    }
  }
  return lines;
}
async function callAIService(prompt) {
  if (process.env.OPENAI_API_KEY) {
    return await callOpenAI(prompt);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return await callClaude(prompt);
  }
  if (process.env.LOCAL_AI_URL) {
    return await callLocalAI(prompt);
  }
  if (process.env.COPILOT_TOKEN) {
    return await callCopilot(prompt);
  }
  throw new Error("No AI service configured");
}
async function callCopilot(prompt) {
  const copilotQueryBuilder = {
    copilotRequest: null,
    history: [
      {
        role: "system",
        content: SYSTEM_PROMPT_FOR_CODE_REVIEW
      },
      {
        role: "user",
        content: prompt
      }
    ]
  };
  const request3 = await generateCopilotRequest();
  copilotQueryBuilder.copilotRequest = request3;
  const response = await generateContent(copilotQueryBuilder, (response2, done, isError) => {
    if (isError) {
      core.error(response2);
      return null;
    }
    if (done) {
      console.info(response2);
      return response2;
    }
    return null;
  });
  console.log("Generated PR content:", response);
  return response;
}
async function callOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert code reviewer. Provide constructive, specific feedback in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2e3
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2e3,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });
  const data = await response.json();
  return data.content[0].text;
}
async function callLocalAI(prompt) {
  const response = await fetch(`${process.env.LOCAL_AI_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "codellama",
      messages: [
        {
          role: "user",
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
function parseAIResponse(aiResponse, filename) {
  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log("No JSON found in AI response");
      return [];
    }
    let jsonString = jsonMatch[0];
    jsonString = cleanJsonString(jsonString);
    console.log("Cleaned JSON string:", jsonString);
    const suggestions = JSON.parse(jsonString);
    return suggestions.map((suggestion) => ({
      filename,
      line: suggestion.line,
      type: suggestion.type || "suggestion",
      severity: suggestion.severity || "medium",
      message: suggestion.message,
      suggestedChange: suggestion.suggestion,
      reasoning: suggestion.reasoning
    }));
  } catch (error3) {
    console.error("Error parsing AI response:", error3);
    console.error("Raw response:", aiResponse);
    return extractSuggestionsManually(aiResponse, filename);
  }
}
function cleanJsonString(jsonString) {
  let inString = false;
  let escapeNext = false;
  let current = "";
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
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
      switch (char) {
        case "\n":
          current += "\\n";
          break;
        case "	":
          current += "\\t";
          break;
        case "\r":
          current += "\\r";
          break;
        case "\b":
          current += "\\b";
          break;
        case "\f":
          current += "\\f";
          break;
        default:
          if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) {
            current += " ";
          } else {
            current += char;
          }
          break;
      }
    } else {
      current += char;
    }
  }
  return current;
}
function extractSuggestionsManually(response, filename) {
  const suggestions = [];
  try {
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
            type: suggestion.type || "suggestion",
            severity: suggestion.severity || "medium",
            message: suggestion.message,
            suggestedChange: suggestion.suggestion,
            reasoning: suggestion.reasoning
          });
        } catch (error3) {
          console.error("Failed to parse individual suggestion:", match);
        }
      }
    }
  } catch (error3) {
    console.error("Manual extraction failed:", error3);
  }
  return suggestions;
}
function performRuleBasedReview(file, patchLines) {
  const suggestions = [];
  for (const line of patchLines) {
    if (line.type !== "added") continue;
    const content = line.content.trim();
    if (content.includes("console.log") && !file.filename.includes("test")) {
      suggestions.push({
        filename: file.filename,
        line: line.lineNumber,
        type: "issue",
        severity: "low",
        message: "Consider removing console.log statements in production code",
        suggestedChange: "Use proper logging library or remove debug statements",
        reasoning: "Console statements should not be left in production code"
      });
    }
    if (content.includes("TODO") || content.includes("FIXME")) {
      suggestions.push({
        filename: file.filename,
        line: line.lineNumber,
        type: "nitpick",
        severity: "low",
        message: "TODO/FIXME comment found",
        reasoning: "Consider creating a proper issue or completing the task"
      });
    }
    if (content.includes("eval(") || content.includes("innerHTML")) {
      suggestions.push({
        filename: file.filename,
        line: line.lineNumber,
        type: "security",
        severity: "high",
        message: "Potential security vulnerability detected",
        reasoning: "Use of eval() or innerHTML can lead to XSS vulnerabilities"
      });
    }
    if (file.language === "javascript" || file.language === "typescript") {
      if (content.includes("==") && !content.includes("===") && !content.includes("!==")) {
        suggestions.push({
          filename: file.filename,
          line: line.lineNumber,
          type: "suggestion",
          severity: "low",
          message: "Consider using strict equality (===) instead of loose equality (==)",
          suggestedChange: content.replace(/([^=!])=([^=])/g, "$1===$2"),
          reasoning: "Strict equality prevents type coercion issues"
        });
      }
    }
  }
  return suggestions;
}

// src/service/github/reviewComments.ts
async function createReviewComments({
  octokit,
  owner,
  repo,
  pullNumber,
  reviewResults
}) {
  const groupedSuggestions = groupSuggestionsByPriority(reviewResults);
  try {
    await createPullRequestReview({
      octokit,
      owner,
      repo,
      pullNumber,
      suggestions: reviewResults
    });
    await createLineComments({
      octokit,
      owner,
      repo,
      pullNumber,
      suggestions: groupedSuggestions.high.concat(groupedSuggestions.medium)
    });
    await createSummaryComment({
      octokit,
      owner,
      repo,
      pullNumber,
      groupedSuggestions
    });
  } catch (error3) {
    console.error("Error creating review comments:", error3);
    throw error3;
  }
}
function groupSuggestionsByPriority(suggestions) {
  return {
    high: suggestions.filter((s) => s.severity === "high"),
    medium: suggestions.filter((s) => s.severity === "medium"),
    low: suggestions.filter((s) => s.severity === "low")
  };
}
async function createPullRequestReview({
  octokit,
  owner,
  repo,
  pullNumber,
  suggestions
}) {
  const comments = suggestions.map((suggestion) => ({
    path: suggestion.filename,
    line: suggestion.line,
    body: formatReviewComment(suggestion)
  })).filter((comment) => comment.body !== null);
  const hasHighSeverity = suggestions.some((s) => s.severity === "high");
  const hasMediumSeverity = suggestions.some((s) => s.severity === "medium");
  let event = "COMMENT";
  if (hasHighSeverity) {
    event = "REQUEST_CHANGES";
  } else if (!hasMediumSeverity && suggestions.length === 0) {
    event = "APPROVE";
  }
  const reviewBody = createReviewSummary(suggestions);
  try {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      event,
      body: reviewBody,
      comments: comments.slice(0, 15)
      // GitHub limit
    });
  } catch (error3) {
    console.error("Error creating PR review:", error3);
    await createLineComments({ octokit, owner, repo, pullNumber, suggestions });
  }
}
async function createLineComments({
  octokit,
  owner,
  repo,
  pullNumber,
  suggestions
}) {
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });
  const commitId = pr.head.sha;
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber
  });
  for (const suggestion of suggestions) {
    try {
      const file = files.find((f) => f.filename === suggestion.filename);
      if (!file || !file.patch) continue;
      const position = getPositionFromPatch(file.patch, suggestion.line);
      if (position === null) continue;
      const body = formatReviewComment(suggestion);
      if (!body) continue;
      await octokit.pulls.createReviewComment({
        owner,
        repo,
        pull_number: pullNumber,
        commit_id: commitId,
        path: suggestion.filename,
        position,
        body
      });
    } catch (error3) {
      console.error(`Error creating comment for ${suggestion.filename}:${suggestion.line}:`, error3);
    }
  }
}
function getPositionFromPatch(patch, lineNumber) {
  const lines = patch.split("\n");
  let position = 0;
  let currentLine = 0;
  for (const line of lines) {
    position++;
    if (line.startsWith("@@")) {
      const match = /@@ \-(\d+),\d+ \+(\d+),\d+ @@/.exec(line);
      if (match) {
        currentLine = parseInt(match[2], 10) - 1;
      }
    } else if (!line.startsWith("-")) {
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
}) {
  const totalSuggestions = groupedSuggestions.high.length + groupedSuggestions.medium.length + groupedSuggestions.low.length;
  if (totalSuggestions === 0) {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: `## \u{1F916} AI Code Review Summary

\u2705 **Great job!** No issues found in this PR.

The code looks clean and follows best practices. Ready for merge! \u{1F680}`
    });
    return;
  }
  const summaryBody = `## \u{1F916} AI Code Review Summary

Found **${totalSuggestions}** suggestions across ${new Set(Object.values(groupedSuggestions).flat().map((s) => s.filename)).size} files:

${groupedSuggestions.high.length > 0 ? `
### \u{1F6A8} High Priority (${groupedSuggestions.high.length})
${groupedSuggestions.high.map((s) => `- **${s.filename}:${s.line}** - ${s.message}`).join("\n")}
` : ""}

${groupedSuggestions.medium.length > 0 ? `
### \u26A0\uFE0F Medium Priority (${groupedSuggestions.medium.length})
${groupedSuggestions.medium.map((s) => `- **${s.filename}:${s.line}** - ${s.message}`).join("\n")}
` : ""}

${groupedSuggestions.low.length > 0 ? `
### \u{1F4A1} Suggestions (${groupedSuggestions.low.length})
${groupedSuggestions.low.map((s) => `- **${s.filename}:${s.line}** - ${s.message}`).join("\n")}
` : ""}

---
*Powered by AI Code Review Bot* \u{1F916}`;
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: summaryBody
  });
}
function formatReviewComment(suggestion) {
  if (suggestion.severity !== "medium" && suggestion.severity !== "low") {
    return null;
  }
  const severityEmoji = {
    high: "\u{1F6A8}",
    medium: "\u26A0\uFE0F",
    low: "\u{1F4A1}"
  };
  const typeEmoji = {
    security: "\u{1F512}",
    performance: "\u26A1",
    issue: "\u{1F41B}",
    suggestion: "\u{1F4A1}",
    nitpick: "\u2728",
    other: "\u{1F4DD}",
    logic: "\u{1F50D}",
    style: "\u{1F3A8}",
    readability: "\u{1F4D6}",
    bug: "\u{1F41E}"
  };
  let comment = `${severityEmoji[suggestion.severity]} ${typeEmoji[suggestion.type] || "\u{1F4AC}"} **${suggestion.type.toUpperCase()}** (${suggestion.severity} priority)

${suggestion.message}

**Reasoning:** ${suggestion.reasoning}`;
  if (suggestion.suggestedChange && suggestion.suggestedChange.trim() !== "") {
    comment += `

**Suggested change:**
\`\`\`suggestion
${suggestion.suggestedChange}
\`\`\``;
  }
  return comment;
}
function createReviewSummary(suggestions) {
  if (suggestions.length === 0) {
    return "\u{1F389} **AI Code Review**: No issues found! The code looks great.";
  }
  const groupedByType = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {});
  const summary2 = Object.entries(groupedByType).map(([type, items]) => `${items.length} ${type}${items.length > 1 ? "s" : ""}`).join(", ");
  const hasHighSeverity = suggestions.some((s) => s.severity === "high");
  const emoji = hasHighSeverity ? "\u{1F6A8}" : "\u{1F4A1}";
  return `${emoji} **AI Code Review**: Found ${suggestions.length} suggestion${suggestions.length > 1 ? "s" : ""} (${summary2}). Please review the inline comments below.`;
}

// src/helpers/getFileLanguage.ts
function getFileLanguage(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languageMap = {
    "js": "javascript",
    "jsx": "javascript",
    "ts": "typescript",
    "tsx": "typescript",
    "py": "python",
    "java": "java",
    "cpp": "cpp",
    "c": "c",
    "cs": "csharp",
    "php": "php",
    "rb": "ruby",
    "go": "go",
    "rs": "rust",
    "swift": "swift",
    "kt": "kotlin",
    "scala": "scala",
    "sh": "bash",
    "sql": "sql",
    "html": "html",
    "css": "css",
    "scss": "scss",
    "sass": "sass",
    "less": "less",
    "json": "json",
    "xml": "xml",
    "yaml": "yaml",
    "yml": "yaml",
    "md": "markdown",
    "dockerfile": "docker"
  };
  return languageMap[ext || ""] || "text";
}

// src/action.ts
async function runGitHubAction() {
  try {
    core2.info("\u{1F680} Starting AI PR Reviewer GitHub Action...");
    const githubToken = core2.getInput("github-token", { required: true });
    const copilotToken = core2.getInput("copilot-token");
    const openaiApiKey = core2.getInput("openai-api-key");
    const anthropicApiKey = core2.getInput("anthropic-api-key");
    const aiProvider = core2.getInput("ai-provider") || "copilot";
    const reviewLevel = core2.getInput("review-level") || "medium";
    const excludePatterns = core2.getInput("exclude-patterns") || "*.md,*.txt,*.json,package-lock.json";
    if (copilotToken) process.env.COPILOT_TOKEN = copilotToken;
    if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;
    if (anthropicApiKey) process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    const octokit = github.getOctokit(githubToken);
    const context2 = github.context;
    core2.info(`\u{1F4CB} Event: ${context2.eventName}`);
    core2.info(`\u{1F4E6} Repository: ${context2.repo.owner}/${context2.repo.repo}`);
    if (context2.eventName !== "pull_request" && context2.eventName !== "pull_request_target") {
      core2.info("\u23ED\uFE0F Skipping: Not a pull request event");
      core2.setOutput("review-status", "skipped");
      core2.setOutput("suggestions-count", "0");
      return;
    }
    const pullRequest = context2.payload.pull_request;
    if (!pullRequest) {
      core2.setFailed("\u274C No pull request found in context");
      return;
    }
    core2.info(`\u{1F50D} Analyzing PR #${pullRequest.number}: ${pullRequest.title}`);
    const fileChanges = await getDetailedFileChangesForAction({
      octokit,
      owner: context2.repo.owner,
      repo: context2.repo.repo,
      pullNumber: pullRequest.number,
      ref: pullRequest.head.sha,
      excludePatterns: excludePatterns.split(",").map((p) => p.trim())
    });
    core2.info(`\u{1F4C1} Found ${fileChanges.length} files to review`);
    if (fileChanges.length === 0) {
      core2.info("\u23ED\uFE0F No files to review");
      core2.setOutput("review-status", "skipped");
      core2.setOutput("suggestions-count", "0");
      return;
    }
    const reviewResults = await analyzeCodeChanges({
      fileChanges,
      prContext: {
        title: pullRequest.title,
        description: pullRequest.body || "",
        author: pullRequest.user.login,
        baseBranch: pullRequest.base.ref,
        headBranch: pullRequest.head.ref
      }
    });
    core2.info(`\u{1F50D} AI analysis completed with ${reviewResults.length} suggestions`);
    const filteredResults = filterResultsByLevel(reviewResults, reviewLevel);
    core2.info(`\u{1F4CB} Filtered to ${filteredResults.length} suggestions for ${reviewLevel} level`);
    if (filteredResults.length > 0) {
      await createReviewComments({
        octokit,
        owner: context2.repo.owner,
        repo: context2.repo.repo,
        pullNumber: pullRequest.number,
        reviewResults: filteredResults
      });
      core2.info(`\u{1F4AC} Posted ${filteredResults.length} review comments`);
    }
    core2.setOutput("suggestions-count", filteredResults.length.toString());
    core2.setOutput("review-status", "success");
    await createActionSummary(filteredResults, pullRequest);
    core2.info("\u2705 AI PR Review completed successfully");
  } catch (error3) {
    core2.setFailed(`\u274C Action failed: ${error3.message}`);
    core2.setOutput("review-status", "failed");
    core2.setOutput("suggestions-count", "0");
  }
}
async function getDetailedFileChangesForAction({
  octokit,
  owner,
  repo,
  pullNumber,
  ref,
  excludePatterns
}) {
  try {
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    });
    const fileChanges = [];
    for (const file of files) {
      if (shouldExcludeFile(file.filename, excludePatterns)) {
        core2.info(`\u23ED\uFE0F Skipping excluded file: ${file.filename}`);
        continue;
      }
      if (!file.patch || file.status === "removed" || file.changes > 500) {
        core2.info(`\u23ED\uFE0F Skipping file (no patch/removed/too large): ${file.filename}`);
        continue;
      }
      let fullContent = "";
      let contextBefore = "";
      let contextAfter = "";
      if (file.status === "added" || file.status === "modified") {
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref
          });
          if ("content" in fileData) {
            fullContent = Buffer.from(fileData.content, "base64").toString("utf-8");
            contextBefore = getContextLines(fullContent, file.patch, 10, "before");
            contextAfter = getContextLines(fullContent, file.patch, 10, "after");
          }
        } catch (error3) {
          core2.warning(`Could not get content for ${file.filename}: ${error3.message}`);
        }
      }
      fileChanges.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
        fullContent,
        contextBefore,
        contextAfter,
        language: getFileLanguage(file.filename)
      });
    }
    return fileChanges;
  } catch (error3) {
    core2.error(`Error getting file changes: ${error3}`);
    return [];
  }
}
function shouldExcludeFile(filename, excludePatterns) {
  return excludePatterns.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return regex.test(filename);
  });
}
function filterResultsByLevel(results, level) {
  switch (level) {
    case "high":
      return results.filter((r) => r.severity === "high");
    case "medium":
      return results.filter((r) => r.severity === "high" || r.severity === "medium");
    case "low":
    default:
      return results;
  }
}
function getContextLines(fullContent, patch, contextSize, type) {
  if (!fullContent || !patch) return "";
  const lines = fullContent.split("\n");
  const patchLines = patch.split("\n");
  let changeLineNumbers = [];
  for (const patchLine of patchLines) {
    if (patchLine.startsWith("@@")) {
      const match = patchLine.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        const lineNumber = type === "before" ? parseInt(match[1]) : parseInt(match[2]);
        changeLineNumbers.push(lineNumber);
      }
    }
  }
  if (changeLineNumbers.length === 0) return "";
  const firstChangeLineNumber = changeLineNumbers[0];
  if (type === "before") {
    const startLine = Math.max(0, firstChangeLineNumber - contextSize - 1);
    const endLine = Math.max(0, firstChangeLineNumber - 1);
    return lines.slice(startLine, endLine).join("\n");
  } else {
    const startLine = firstChangeLineNumber - 1;
    const endLine = Math.min(lines.length, firstChangeLineNumber + contextSize - 1);
    return lines.slice(startLine, endLine).join("\n");
  }
}
async function createActionSummary(results, pullRequest) {
  const summary2 = [
    "# \u{1F916} AI PR Review Summary",
    "",
    `**Pull Request:** #${pullRequest.number} - ${pullRequest.title}`,
    `**Author:** ${pullRequest.user.login}`,
    `**Branch:** ${pullRequest.head.ref} \u2192 ${pullRequest.base.ref}`,
    "",
    `## \u{1F4CA} Review Results`,
    `- **Total Suggestions:** ${results.length}`
  ];
  if (results.length > 0) {
    const severityCounts = results.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {});
    summary2.push(
      `- **High Priority:** ${severityCounts.high || 0}`,
      `- **Medium Priority:** ${severityCounts.medium || 0}`,
      `- **Low Priority:** ${severityCounts.low || 0}`,
      "",
      "## \u{1F50D} Issues Found",
      ""
    );
    results.slice(0, 10).forEach((result) => {
      const emoji = result.severity === "high" ? "\u{1F6A8}" : result.severity === "medium" ? "\u26A0\uFE0F" : "\u{1F4A1}";
      summary2.push(`${emoji} **${result.type}** (Line ${result.line}): ${result.message}`);
    });
    if (results.length > 10) {
      summary2.push(`... and ${results.length - 10} more suggestions`);
    }
  } else {
    summary2.push("\u2705 No issues found! Great job!");
  }
  await core2.summary.addRaw(summary2.join("\n")).write();
}
if (require.main === module) {
  runGitHubAction().catch((error3) => {
    core2.setFailed(error3.message);
    process.exit(1);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runGitHubAction
});
