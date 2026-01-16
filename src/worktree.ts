import { $ } from "bun";
import { getRepoRoot } from "./git";
import * as path from "path";

export interface Worktree {
  path: string;
  head: string;
  branch: string | null;
  bare: boolean;
  detached: boolean;
}

/**
 * Parse the porcelain output from git worktree list
 */
function parseWorktreeList(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  const entries = output.trim().split("\n\n").filter(Boolean);

  for (const entry of entries) {
    const lines = entry.split("\n");
    const worktree: Worktree = {
      path: "",
      head: "",
      branch: null,
      bare: false,
      detached: false,
    };

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        worktree.path = line.slice("worktree ".length);
      } else if (line.startsWith("HEAD ")) {
        worktree.head = line.slice("HEAD ".length);
      } else if (line.startsWith("branch ")) {
        worktree.branch = line.slice("branch ".length).replace("refs/heads/", "");
      } else if (line === "bare") {
        worktree.bare = true;
      } else if (line === "detached") {
        worktree.detached = true;
      }
    }

    if (worktree.path) {
      worktrees.push(worktree);
    }
  }

  return worktrees;
}

/**
 * List all worktrees
 */
export async function listWorktrees(): Promise<Worktree[]> {
  const result = await $`git worktree list --porcelain`.quiet();
  if (result.exitCode !== 0) {
    throw new Error("Failed to list worktrees");
  }
  return parseWorktreeList(result.text());
}

export interface CreateWorktreeOptions {
  branchName: string;
  worktreePath?: string;
  createBranch?: boolean;
  baseBranch?: string;
}

/**
 * Create a new worktree
 */
export async function createWorktree(
  options: CreateWorktreeOptions
): Promise<string> {
  const { branchName, createBranch = false, baseBranch } = options;

  const repoRoot = await getRepoRoot();
  // Default worktree path: sibling directory named after the branch
  const worktreePath =
    options.worktreePath ||
    path.join(path.dirname(repoRoot), branchName.replace(/\//g, "-"));

  let result;
  if (createBranch) {
    if (baseBranch) {
      result =
        await $`git worktree add -b ${branchName} ${worktreePath} ${baseBranch}`.quiet();
    } else {
      result = await $`git worktree add -b ${branchName} ${worktreePath}`.quiet();
    }
  } else {
    result = await $`git worktree add ${worktreePath} ${branchName}`.quiet();
  }

  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(stderr || `Failed with exit code ${result.exitCode}`);
  }

  return worktreePath;
}

/**
 * Remove a worktree
 */
export async function removeWorktree(
  worktreePath: string,
  force = false
): Promise<void> {
  const args = force ? ["worktree", "remove", "--force", worktreePath] : ["worktree", "remove", worktreePath];
  const result = await $`git ${args}`.quiet();

  if (result.exitCode !== 0) {
    throw new Error(`Failed to remove worktree: ${result.stderr.toString()}`);
  }
}

/**
 * Prune stale worktree information
 */
export async function pruneWorktrees(): Promise<void> {
  const result = await $`git worktree prune`.quiet();
  if (result.exitCode !== 0) {
    throw new Error("Failed to prune worktrees");
  }
}
