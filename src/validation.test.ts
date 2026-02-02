import { test, expect, describe } from "bun:test";
import { isValidBranchName, isPathSiblingOfRepo, hasSymlinkInPath } from "./validation";

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
  test("allows sibling paths", async () => {
    expect(await isPathSiblingOfRepo("/home/user/repo-branch", "/home/user/repo")).toBe(true);
    expect(await isPathSiblingOfRepo("/projects/myrepo-feature", "/projects/myrepo")).toBe(true);
  });

  test("rejects paths inside the repo", async () => {
    expect(await isPathSiblingOfRepo("/home/user/repo/subdir", "/home/user/repo")).toBe(false);
  });

  test("rejects the repo itself", async () => {
    expect(await isPathSiblingOfRepo("/home/user/repo", "/home/user/repo")).toBe(false);
  });

  test("rejects paths in different parent directories", async () => {
    expect(await isPathSiblingOfRepo("/tmp/worktree", "/home/user/repo")).toBe(false);
    expect(await isPathSiblingOfRepo("/home/other/repo-branch", "/home/user/repo")).toBe(false);
  });

  test("rejects deeply nested paths", async () => {
    expect(await isPathSiblingOfRepo("/home/user/subdir/worktree", "/home/user/repo")).toBe(false);
  });
});

describe("hasSymlinkInPath", () => {
  test("returns false for non-existent paths", async () => {
    expect(await hasSymlinkInPath("/nonexistent/path/that/does/not/exist")).toBe(false);
  });

  test("returns false for normal directories", async () => {
    expect(await hasSymlinkInPath("/tmp")).toBe(false);
  });
});
