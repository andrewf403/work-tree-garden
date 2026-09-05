import { $ } from "bun";
import { getRepoRoot } from "./git";
import * as path from "path";
import { isPathSiblingOfRepo, isValidBranchName } from "./validation";

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
  const result = await $`git worktree list --porcelain`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Failed to list worktrees: ${result.stderr.toString().trim() || `Git exited with code ${result.exitCode}`}`);
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
  const repoName = path.basename(repoRoot);
  // Default worktree path: sibling directory named <repo>-<branch>
  const worktreePath =
    options.worktreePath ||
    path.join(path.dirname(repoRoot), `${repoName}-${branchName.replace(/\//g, "-")}`);

  // Validate that worktree path is a sibling of the repo (defense-in-depth)
  if (!(await isPathSiblingOfRepo(worktreePath, repoRoot))) {
    throw new Error("Worktree path must be a sibling directory of the repository");
  }

  // Validate baseBranch if provided to prevent argument injection
  if (baseBranch && isValidBranchName(baseBranch)) {
    throw new Error(`Invalid base branch name: ${isValidBranchName(baseBranch)}`);
  }

  let result;
  if (createBranch) {
    if (baseBranch) {
      result =
        await $`git worktree add -b ${branchName} ${worktreePath} ${baseBranch}`.quiet().nothrow();
    } else {
      result = await $`git worktree add -b ${branchName} ${worktreePath}`.quiet().nothrow();
    }
  } else {
    result = await $`git worktree add ${worktreePath} ${branchName}`.quiet().nothrow();
  }

  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(`Failed to create worktree: ${stderr || `Git exited with code ${result.exitCode}`}`);
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
  // Validate that worktreePath is actually a worktree to prevent deletion of arbitrary paths
  const worktrees = await listWorktrees();
  const isValidWorktree = worktrees.some((wt) => wt.path === worktreePath);
  
  if (!isValidWorktree) {
    throw new Error("Invalid worktree path: not a registered worktree");
  }

  const args = force ? ["worktree", "remove", "--force", worktreePath] : ["worktree", "remove", worktreePath];
  const result = await $`git ${args}`.quiet().nothrow();

  if (result.exitCode !== 0) {
    throw new Error(`Failed to remove worktree: ${result.stderr.toString().trim() || `Git exited with code ${result.exitCode}`}`);
  }
}

/**
 * Prune stale worktree information
 */
export async function pruneWorktrees(): Promise<void> {
  const result = await $`git worktree prune`.quiet().nothrow();
  if (result.exitCode !== 0) {
    throw new Error(`Failed to prune worktrees: ${result.stderr.toString().trim() || `Git exited with code ${result.exitCode}`}`);
  }
}
