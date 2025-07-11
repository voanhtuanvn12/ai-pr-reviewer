import { PullRequest } from '@octokit/webhooks-types'
import { ProbotOctokit } from 'probot'

import { IssueContext } from './../../types/type'

export const updatePrContent = async ({
  octokit,
  // githubToken,
  issueContext,
  body,
  pullRequest
}: {
  // githubToken: string
  octokit: ProbotOctokit,

  issueContext: IssueContext
  body: string
  pullRequest: PullRequest
}) => {
  try {
    const fetch = (await import('node-fetch')).default
    // const octokit = getOctokit(githubToken)
    await octokit.rest.pulls.update({
      owner: issueContext.owner,
      repo: issueContext.repo,
      body,
      pull_number: pullRequest.number,
      request: {
        fetch: fetch
      }
    })
  } catch (error) {
    console.error('Error updatePrContent', error)
  }
}
