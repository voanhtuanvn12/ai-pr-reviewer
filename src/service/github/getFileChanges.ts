// @ts-ignore

import { ProbotOctokit } from 'probot';

export const getFileChanges = async ({ targetBranch, headBranch, owner, repo, octokit }: { targetBranch: string; headBranch: string, owner: string, repo: string, octokit: ProbotOctokit }) => {
  // const owner = process.env.GITHUB_REPOSITORY_OWNER
  // const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const githubToken = process.env.GITHUB_TOKEN
  // const octokit = new Octokit({
  //   auth: githubToken
  // })

  console.log('owner:', owner);
  console.log('repo:', repo);
  console.log('githubToken:', githubToken);


  // if (!owner || !repo || !githubToken) {
  //   throw new Error('Missing owner or repo or githubToken')
  // }


  if (!owner || !repo) {
    throw new Error('Missing owner or repo')
  }

  try {
    console.log('Starting API call with params:', { owner, repo, base: targetBranch, head: headBranch });

    const fetch = (await import('node-fetch')).default
    console.log('Fetch imported successfully');

    const response = await octokit.repos.compareCommits({
      owner,
      repo,
      base: targetBranch,
      head: headBranch,
      // baseUrl: 'https://oss.navercorp.com/api/v3',
      baseUrl: 'https://api.github.com', // This is the default
      request: {
        fetch: fetch
      }
    })

    // console.log('API response status:', response.status);
    // console.log('API response data:', response.data);
    console.log('Files count:', response.data.files?.length);

    const fileChanges = response.data.files?.reduce((acc: string, cur: { filename: string; patch?: string }) => {
      return acc + `\n filename:${cur.filename}\n changed:${cur.patch}\n\n`
    }, '')

    return fileChanges
  } catch (error: any) {
    console.error('Error getting diff from GitHub API:', error)
    console.error('Error details:', error?.message, error?.status);
    throw error
  }
}
