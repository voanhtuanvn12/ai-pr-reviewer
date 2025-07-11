import { PullRequest, User as GithubUser } from '@octokit/webhooks-types'

export type PullRequestPayload = Omit<
  Pick<
    PullRequest,
    | 'number'
    | 'title'
    | 'user'
    | 'created_at'
    | 'state'
    | 'changed_files'
    | 'draft'
    | 'merged'
    | 'html_url'
    | 'updated_at'
  >,
  'user'
> & { user: Pick<GithubUser, 'login'> }

export type IssueContext = {
  owner: string
  repo: string
  number: number
}
