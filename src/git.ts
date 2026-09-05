import { $ } from "bun";

/**
 * Find the root directory of the git repository
 */
export async function getRepoRoot(): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Failed to find the Git repository root: ${result.stderr.toString().trim() || `Git exited with code ${result.exitCode}`}`);
  }
  return result.text().trim();
}

/**
 * Check if the current directory is inside a git repository
 */
export async function isGitRepo(): Promise<boolean> {
  const result = await $`git rev-parse --is-inside-work-tree`.quiet().nothrow();
  return result.exitCode === 0;
}

export interface Branch {
  name: string;
  isRemote: boolean;
  current: boolean;
}

/**
 * List all branches (local and remote)
 */
export async function listBranches(): Promise<Branch[]> {
  const format = "%(refname:short)|%(HEAD)";
  const result = await $`git branch -a --sort=-committerdate --format=${format}`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list branches: ${result.stderr.toString().trim() || `Git exited with code ${result.exitCode}`}`);
  }

  const lines = result.text().trim().split("\n").filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("|");
    const name = parts[0] ?? "";
    const head = parts[1] ?? "";
    const isRemote = name.startsWith("remotes/") || name.startsWith("origin/");
    return {
      name: isRemote ? name.replace(/^remotes\//, "") : name,
      isRemote,
      current: head === "*",
    };
  });
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(): Promise<string> {
  const result = await $`git branch --show-current`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Failed to get current branch: ${result.stderr.toString().trim() || `Git exited with code ${result.exitCode}`}`);
  }
  return result.text().trim();
}

/**
 * Check if the repository has any commits
 */
export async function hasCommits(): Promise<boolean> {
  const result = await $`git rev-parse HEAD`.quiet().nothrow();
  return result.exitCode === 0;
}
