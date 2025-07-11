import * as core from '@actions/core'

import { PULL_REQUEST_TEMPLATE, SYSTEM_PROMPT } from './../../service/github/copilot/constant'
import { generateContent } from './../../service/github/copilot/generateContent'
import { CopilotQueryBuilder } from './../../service/github/copilot/type'
import { generateCopilotRequest } from './../../service/github/copilot/utils'
import { getFileChanges } from './../../service/github/getFileChanges.js'
import { ProbotOctokit } from 'probot'

export const createPrContent = async ({ targetBranch, headBranch, owner, repo, octokit }: { targetBranch: string; headBranch: string, owner: string, repo: string, octokit: ProbotOctokit }) => {
  const fileChanged = await getFileChanges({
    targetBranch,
    headBranch,
    owner,
    repo,
    octokit
  })
  
  // console.log('fileChanged:', fileChanged);
  const userPrompt = `${fileChanged}
----------------
I made the following file changes and need a concise, user-friendly description for my pull request. Please write it based on this template and auto-check the appropriate checkboxes based on my changes:
  ${PULL_REQUEST_TEMPLATE}
----------------
Please ensure the following:
- If file names appear in the description, highlight them in Markdown format.
- Automatically check the relevant Type of change box(es) based on the changes.
- Automatically check the appropriate items in the Checklist that correspond to the work completed.
`

  const copilotQueryBuilder: CopilotQueryBuilder = {
    copilotRequest: null,
    history: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: userPrompt
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
