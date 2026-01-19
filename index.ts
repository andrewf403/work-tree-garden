#!/usr/bin/env bun

import * as p from "@clack/prompts";
import { isGitRepo, listBranches, getCurrentBranch, hasCommits } from "./src/git";
import {
  listWorktrees,
  createWorktree,
  removeWorktree,
  type Worktree,
} from "./src/worktree";
import { isValidBranchName } from "./src/validation";

async function displayWorktrees(): Promise<void> {
  const worktrees = await listWorktrees();

  if (worktrees.length === 0) {
    p.note("No worktrees found.");
    return;
  }

  const rows = worktrees.map((wt) => {
    const branchDisplay = wt.bare
      ? "(bare)"
      : wt.detached
        ? `(detached at ${wt.head.slice(0, 7)})`
        : wt.branch || "unknown";
    return `  ${branchDisplay}\n    ${wt.path}`;
  });

  p.note(rows.join("\n\n"), "Worktrees");
}

async function handleCreateWorktree(): Promise<void> {
  // Check if repo has commits
  if (!(await hasCommits())) {
    p.note("Cannot create worktrees in a repository with no commits.\nMake an initial commit first.", "Error");
    return;
  }

  const branches = await listBranches();
  const localBranches = branches.filter((b) => !b.isRemote);

  const branchChoice = await p.select({
    message: "Select a branch or create a new one",
    maxItems: 6,
    options: [
      { value: "__new__", label: "Create new branch" },
      ...localBranches.map((b) => ({
        value: b.name,
        label: b.current ? `${b.name} (current)` : b.name,
      })),
    ],
  });

  if (p.isCancel(branchChoice)) {
    p.cancel("Cancelled");
    return;
  }

  let branchName: string;
  let createBranch = false;
  let baseBranch: string | undefined;

  if (branchChoice === "__new__") {
    const newBranchName = await p.text({
      message: "Enter new branch name",
      validate: isValidBranchName,
    });

    if (p.isCancel(newBranchName)) {
      p.cancel("Cancelled");
      return;
    }

    branchName = newBranchName;
    createBranch = true;

    // Ask which branch to base it on - default to current branch
    const currentBranch = await getCurrentBranch();
    const baseChoice = await p.select({
      message: "Base the new branch on",
      maxItems: 6,
      options: [
        { value: currentBranch, label: `${currentBranch} (current)` },
        ...localBranches
          .filter((b) => b.name !== currentBranch)
          .map((b) => ({
            value: b.name,
            label: b.name,
          })),
      ],
    });

    if (p.isCancel(baseChoice)) {
      p.cancel("Cancelled");
      return;
    }

    baseBranch = baseChoice;
  } else {
    branchName = branchChoice;
  }

  const spinner = p.spinner();
  spinner.start("Creating worktree...");

  try {
    const worktreePath = await createWorktree({
      branchName,
      createBranch,
      baseBranch,
    });
    spinner.stop(`Worktree created at ${worktreePath}`);
  } catch (error) {
    spinner.stop("Failed to create worktree");
    p.note(
      error instanceof Error ? error.message : String(error),
      "Error"
    );
  }
}

async function handleDeleteWorktree(): Promise<void> {
  const worktrees = await listWorktrees();

  // Filter out the main worktree (it can't be deleted)
  const deletableWorktrees = worktrees.filter((wt) => !wt.bare && worktrees.indexOf(wt) !== 0);

  if (deletableWorktrees.length === 0) {
    p.note("No worktrees available to delete (cannot delete the main worktree).");
    return;
  }

  const worktreeChoice = await p.select({
    message: "Select worktree to delete",
    maxItems: 6,
    options: deletableWorktrees.map((wt) => ({
      value: wt.path,
      label: `${wt.branch || wt.head.slice(0, 7)} - ${wt.path}`,
    })),
  });

  if (p.isCancel(worktreeChoice)) {
    p.cancel("Cancelled");
    return;
  }

  const confirmed = await p.confirm({
    message: `Are you sure you want to delete the worktree at ${worktreeChoice}?`,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel("Cancelled");
    return;
  }

  const spinner = p.spinner();
  spinner.start("Removing worktree...");

  try {
    await removeWorktree(worktreeChoice);
    spinner.stop("Worktree removed successfully");
  } catch (error) {
    spinner.stop("Failed to remove worktree");

    // Offer force removal if normal removal fails
    const forceRemove = await p.confirm({
      message: "Would you like to force remove the worktree?",
    });

    if (p.isCancel(forceRemove) || !forceRemove) {
      return;
    }

    spinner.start("Force removing worktree...");
    try {
      await removeWorktree(worktreeChoice, true);
      spinner.stop("Worktree force removed successfully");
    } catch (forceError) {
      spinner.stop("Failed to force remove worktree");
      p.note(
        forceError instanceof Error ? forceError.message : String(forceError),
        "Error"
      );
    }
  }
}

async function mainMenu(): Promise<boolean> {
  const action = await p.select({
    message: "What would you like to do?",
    options: [
      { value: "list", label: "List worktrees" },
      { value: "create", label: "Create worktree" },
      { value: "delete", label: "Delete worktree" },
      { value: "exit", label: "Exit" },
    ],
  });

  if (p.isCancel(action) || action === "exit") {
    return false;
  }

  switch (action) {
    case "list":
      await displayWorktrees();
      break;
    case "create":
      await handleCreateWorktree();
      break;
    case "delete":
      await handleDeleteWorktree();
      break;
  }

  return true;
}

async function main() {
  p.intro("Work Tree Garden");

  // Check if we're in a git repository
  if (!(await isGitRepo())) {
    p.outro("Not inside a git repository. Please run this from within a git repo.");
    process.exit(1);
  }

  // Main loop
  let continueLoop = true;
  while (continueLoop) {
    continueLoop = await mainMenu();
  }

  p.outro("Goodbye!");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
