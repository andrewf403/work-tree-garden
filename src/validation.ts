import * as path from "path";
import { stat } from "fs/promises";

// Git branch name rules:
// - Cannot start with '-' or '/'
// - Cannot contain: space, ~, ^, :, ?, *, [, \, .., @{
// - Cannot end with '/', '.lock', or '.'
const INVALID_BRANCH_CHARS = /[\s~^:?*\[\]\\]|\.\.|\@\{/;
const INVALID_BRANCH_START = /^[-/]/;
const INVALID_BRANCH_END = /(?:\/|\.lock|\.|\/)$/;

/**
 * Validate a git branch name according to git's rules
 * Returns an error message if invalid, undefined if valid
 */
export function isValidBranchName(name: string): string | undefined {
  if (!name) return "Branch name is required";
  if (INVALID_BRANCH_START.test(name)) return "Branch name cannot start with '-' or '/'";
  if (INVALID_BRANCH_CHARS.test(name)) return "Branch name contains invalid characters";
  if (INVALID_BRANCH_END.test(name)) return "Branch name cannot end with '/', '.', or '.lock'";
  return undefined;
}

/**
 * Check if any path component is a symbolic link
 * This prevents symlink attacks where an attacker creates a symlink that passes
 * validation but points to a different location at execution time.
 */
export async function hasSymlinkInPath(targetPath: string): Promise<boolean> {
  try {
    const stats = await stat(targetPath);
    return stats.isSymbolicLink();
  } catch {
    // Path doesn't exist, check parent directories
    let current = targetPath;
    while (current !== path.dirname(current)) {
      current = path.dirname(current);
      try {
        const stats = await stat(current);
        if (stats.isSymbolicLink()) {
          return true;
        }
      } catch {
        // Continue checking parent
      }
    }
    return false;
  }
}

/**
 * Check if a target path is a valid sibling of the repo root
 * (i.e., it's under the same parent directory but not inside the repo)
 * Also checks for symlinks to prevent path traversal attacks.
 */
export async function isPathSiblingOfRepo(targetPath: string, repoRoot: string): Promise<boolean> {
  // Check if path contains any symlinks (prevents symlink attacks)
  if (await hasSymlinkInPath(targetPath)) {
    return false;
  }

  const parent = path.dirname(repoRoot);
  const resolved = path.resolve(targetPath);
  const resolvedParent = path.dirname(resolved);

  // Must be directly under the same parent as the repo
  // and must not be inside the repo itself
  return resolvedParent === parent && !resolved.startsWith(repoRoot + path.sep) && resolved !== repoRoot;
}
