import { ProbotOctokit } from "probot";

export type GetDetailedFileChangesParams = {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
  ref: string;
  sinceDate?: string; // Optional: only get changes since this date
};