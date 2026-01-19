# work-tree-garden

A simple CLI app to track and manage git worktrees.

## Features

- List all worktrees in your repository
- Create new worktrees from existing branches or new branches
- Delete worktrees with optional force removal

## Install

```bash
bun install
```

To make `wtg` available globally:

```bash
bun link
```

## Usage

Run from within a git repository:

```bash
wtg
```

Or without global install:

```bash
bun run index.ts
```
