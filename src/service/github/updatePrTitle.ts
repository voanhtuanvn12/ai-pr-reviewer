// import { getOctokit } from '@actions/github'
import { PullRequest } from '@octokit/webhooks-types'
import { ProbotOctokit } from 'probot'

import { IssueContext } from './../../types/type'

export const updatePrTitle = async ({
  // githubToken,
  octokit,
  issueContext,
  title,
  pullRequest
}: {
  // githubToken: string
  octokit: ProbotOctokit,
  issueContext: IssueContext
  title: string
  pullRequest: PullRequest
}) => {
  try {
    const fetch = (await import('node-fetch')).default
    // const octokit = getOctokit(githubToken)
    await octokit.rest.pulls.update({
      owner: issueContext.owner,
      repo: issueContext.repo,
      title,
      pull_number: pullRequest.number,
      request: {
        fetch
      }
    })
  } catch (error) {
    console.error('Error updatePrTitle', error)
  }
}
