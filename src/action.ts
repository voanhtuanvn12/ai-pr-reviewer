// GitHub Action entry point

// Polyfill fetch for Node.js environments if needed
if (!globalThis.fetch) {
  import('node-fetch').then(nodeFetch => {
    globalThis.fetch = nodeFetch.default as any;
  });
}

import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzeCodeChanges } from './service/ai/codeReviewer';
import { createReviewComments } from './service/github/reviewComments';
import { getFileLanguage } from './helpers/getFileLanguage';
import { DetailedFileChange } from './types/DetailedFileChange';

interface GitHubActionContext {
  eventName: string;
  payload: any;
  repo: {
    owner: string;
    repo: string;
  };
  issue: {
    number: number;
  };
}

async function runGitHubAction(): Promise<void> {
  try {
    core.info('🚀 Starting AI PR Reviewer GitHub Action...');
    
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    const copilotToken = core.getInput('copilot-token');
    const openaiApiKey = core.getInput('openai-api-key');
    const anthropicApiKey = core.getInput('anthropic-api-key');
    const aiProvider = core.getInput('ai-provider') || 'copilot';
    const reviewLevel = core.getInput('review-level') || 'medium';
    const excludePatterns = core.getInput('exclude-patterns') || '*.md,*.txt,*.json,package-lock.json';
    
    // Set environment variables for AI services
    if (copilotToken) process.env.COPILOT_TOKEN = copilotToken;
    if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;
    if (anthropicApiKey) process.env.ANTHROPIC_API_KEY = anthropicApiKey;
    
    const octokit = github.getOctokit(githubToken);
    const context = github.context as GitHubActionContext;
    
    core.info(`📋 Event: ${context.eventName}`);
    core.info(`📦 Repository: ${context.repo.owner}/${context.repo.repo}`);
    
    // Only run on pull request events
    if (context.eventName !== 'pull_request' && context.eventName !== 'pull_request_target') {
      core.info('⏭️ Skipping: Not a pull request event');
      core.setOutput('review-status', 'skipped');
      core.setOutput('suggestions-count', '0');
      return;
    }
    
    const pullRequest = context.payload.pull_request;
    if (!pullRequest) {
      core.setFailed('❌ No pull request found in context');
      return;
    }
    
    core.info(`🔍 Analyzing PR #${pullRequest.number}: ${pullRequest.title}`);
    
    // Get file changes
    const fileChanges = await getDetailedFileChangesForAction({
      octokit,
      owner: context.repo.owner,
      repo: context.repo.repo,
      pullNumber: pullRequest.number,
      ref: pullRequest.head.sha,
      excludePatterns: excludePatterns.split(',').map(p => p.trim())
    });
    
    core.info(`📁 Found ${fileChanges.length} files to review`);
    
    if (fileChanges.length === 0) {
      core.info('⏭️ No files to review');
      core.setOutput('review-status', 'skipped');
      core.setOutput('suggestions-count', '0');
      return;
    }
    
    // Analyze with AI
    const reviewResults = await analyzeCodeChanges({
      fileChanges,
      prContext: {
        title: pullRequest.title,
        description: pullRequest.body || '',
        author: pullRequest.user.login,
        baseBranch: pullRequest.base.ref,
        headBranch: pullRequest.head.ref
      }
    });
    
    core.info(`🔍 AI analysis completed with ${reviewResults.length} suggestions`);
    
    // Filter by review level
    const filteredResults = filterResultsByLevel(reviewResults, reviewLevel);
    core.info(`📋 Filtered to ${filteredResults.length} suggestions for ${reviewLevel} level`);
    
    // Create review comments
    if (filteredResults.length > 0) {
      await createReviewComments({
        octokit,
        owner: context.repo.owner,
        repo: context.repo.repo,
        pullNumber: pullRequest.number,
        reviewResults: filteredResults
      });
      
      core.info(`💬 Posted ${filteredResults.length} review comments`);
    }
    
    // Set outputs
    core.setOutput('suggestions-count', filteredResults.length.toString());
    core.setOutput('review-status', 'success');
    
    // Create summary
    await createActionSummary(filteredResults, pullRequest);
    
    core.info('✅ AI PR Review completed successfully');
    
  } catch (error: any) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.setOutput('review-status', 'failed');
    core.setOutput('suggestions-count', '0');
  }
}

async function getDetailedFileChangesForAction({
  octokit,
  owner,
  repo,
  pullNumber,
  ref,
  excludePatterns
}: {
  octokit: any;
  owner: string;
  repo: string;
  pullNumber: number;
  ref: string;
  excludePatterns: string[];
}): Promise<DetailedFileChange[]> {
  try {
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100
    });
    
    const fileChanges: DetailedFileChange[] = [];
    
    for (const file of files) {
      // Skip if file matches exclude patterns
      if (shouldExcludeFile(file.filename, excludePatterns)) {
        core.info(`⏭️ Skipping excluded file: ${file.filename}`);
        continue;
      }
      
      // Skip binary files, very large files, or files without patches
      if (!file.patch || file.status === 'removed' || file.changes > 500) {
        core.info(`⏭️ Skipping file (no patch/removed/too large): ${file.filename}`);
        continue;
      }
      
      // Get file content
      let fullContent = '';
      let contextBefore = '';
      let contextAfter = '';
      
      if (file.status === 'added' || file.status === 'modified') {
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: ref
          });
          
          if ('content' in fileData) {
            fullContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
            contextBefore = getContextLines(fullContent, file.patch, 10, 'before');
            contextAfter = getContextLines(fullContent, file.patch, 10, 'after');
          }
        } catch (error: any) {
          core.warning(`Could not get content for ${file.filename}: ${error.message}`);
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
  } catch (error) {
    core.error(`Error getting file changes: ${error}`);
    return [];
  }
}

function shouldExcludeFile(filename: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filename);
  });
}

function filterResultsByLevel(results: any[], level: string): any[] {
  switch (level) {
    case 'high':
      return results.filter(r => r.severity === 'high');
    case 'medium':
      return results.filter(r => r.severity === 'high' || r.severity === 'medium');
    case 'low':
    default:
      return results;
  }
}

function getContextLines(
  fullContent: string, 
  patch: string, 
  contextSize: number, 
  type: 'before' | 'after'
): string {
  if (!fullContent || !patch) return '';
  
  const lines = fullContent.split('\n');
  const patchLines = patch.split('\n');
  
  let changeLineNumbers: number[] = [];
  
  for (const patchLine of patchLines) {
    if (patchLine.startsWith('@@')) {
      const match = patchLine.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        const lineNumber = type === 'before' ? parseInt(match[1]) : parseInt(match[2]);
        changeLineNumbers.push(lineNumber);
      }
    }
  }
  
  if (changeLineNumbers.length === 0) return '';
  
  const firstChangeLineNumber = changeLineNumbers[0];
  
  if (type === 'before') {
    const startLine = Math.max(0, firstChangeLineNumber - contextSize - 1);
    const endLine = Math.max(0, firstChangeLineNumber - 1);
    return lines.slice(startLine, endLine).join('\n');
  } else {
    const startLine = firstChangeLineNumber - 1;
    const endLine = Math.min(lines.length, firstChangeLineNumber + contextSize - 1);
    return lines.slice(startLine, endLine).join('\n');
  }
}

async function createActionSummary(results: any[], pullRequest: any): Promise<void> {
  const summary = [
    '# 🤖 AI PR Review Summary',
    '',
    `**Pull Request:** #${pullRequest.number} - ${pullRequest.title}`,
    `**Author:** ${pullRequest.user.login}`,
    `**Branch:** ${pullRequest.head.ref} → ${pullRequest.base.ref}`,
    '',
    `## 📊 Review Results`,
    `- **Total Suggestions:** ${results.length}`,
  ];
  
  if (results.length > 0) {
    const severityCounts = results.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {});
    
    summary.push(
      `- **High Priority:** ${severityCounts.high || 0}`,
      `- **Medium Priority:** ${severityCounts.medium || 0}`,
      `- **Low Priority:** ${severityCounts.low || 0}`,
      '',
      '## 🔍 Issues Found',
      ''
    );
    
    results.slice(0, 10).forEach(result => {
      const emoji = result.severity === 'high' ? '🚨' : result.severity === 'medium' ? '⚠️' : '💡';
      summary.push(`${emoji} **${result.type}** (Line ${result.line}): ${result.message}`);
    });
    
    if (results.length > 10) {
      summary.push(`... and ${results.length - 10} more suggestions`);
    }
  } else {
    summary.push('✅ No issues found! Great job!');
  }
  
  await core.summary.addRaw(summary.join('\n')).write();
}

// Export for testing
export { runGitHubAction };

// Run if called directly
if (require.main === module) {
  runGitHubAction().catch(error => {
    core.setFailed(error.message);
    process.exit(1);
  });
}
