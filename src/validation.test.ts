import { test, expect, describe } from "bun:test";
import { isValidBranchName, isPathSiblingOfRepo } from "./validation";

describe("isValidBranchName", () => {
  test("allows valid branch names", () => {
    expect(isValidBranchName("test")).toBeUndefined();
    expect(isValidBranchName("feature/test")).toBeUndefined();
    expect(isValidBranchName("my-branch")).toBeUndefined();
    expect(isValidBranchName("feature/my-branch-123")).toBeUndefined();
  });

  test("rejects empty branch names", () => {
    expect(isValidBranchName("")).toBe("Branch name is required");
  });

  test("rejects branch names starting with dash", () => {
    expect(isValidBranchName("-test")).toBe("Branch name cannot start with '-' or '/'");
  });

  test("rejects branch names starting with slash", () => {
    expect(isValidBranchName("/test")).toBe("Branch name cannot start with '-' or '/'");
  });

  test("rejects branch names with invalid characters", () => {
    expect(isValidBranchName("test branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test~branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test^branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test:branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test?branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test*branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test[branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test\\branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test..branch")).toBe("Branch name contains invalid characters");
    expect(isValidBranchName("test@{branch")).toBe("Branch name contains invalid characters");
  });

  test("rejects branch names with invalid endings", () => {
    expect(isValidBranchName("test/")).toBe("Branch name cannot end with '/', '.', or '.lock'");
    expect(isValidBranchName("test.")).toBe("Branch name cannot end with '/', '.', or '.lock'");
    expect(isValidBranchName("test.lock")).toBe("Branch name cannot end with '/', '.', or '.lock'");
  });
});

describe("isPathSiblingOfRepo", () => {
  test("allows sibling paths", () => {
    expect(isPathSiblingOfRepo("/home/user/repo-branch", "/home/user/repo")).toBe(true);
    expect(isPathSiblingOfRepo("/projects/myrepo-feature", "/projects/myrepo")).toBe(true);
  });

  test("rejects paths inside the repo", () => {
    expect(isPathSiblingOfRepo("/home/user/repo/subdir", "/home/user/repo")).toBe(false);
  });

  test("rejects the repo itself", () => {
    expect(isPathSiblingOfRepo("/home/user/repo", "/home/user/repo")).toBe(false);
  });

  test("rejects paths in different parent directories", () => {
    expect(isPathSiblingOfRepo("/tmp/worktree", "/home/user/repo")).toBe(false);
    expect(isPathSiblingOfRepo("/home/other/repo-branch", "/home/user/repo")).toBe(false);
  });

  test("rejects deeply nested paths", () => {
    expect(isPathSiblingOfRepo("/home/user/subdir/worktree", "/home/user/repo")).toBe(false);
  });
});
