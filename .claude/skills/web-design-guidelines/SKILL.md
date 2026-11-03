---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the vendored guidelines file below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Read the vendored guidelines before each review (do not fetch from the network):

```
guidelines.md
```

The file sits next to this SKILL.md and contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:
1. Read `guidelines.md` (next to this SKILL.md)
2. Read the specified files
3. Apply all rules from the guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.

<!-- LOCAL MODIFICATION (board-games repo): upstream fetched the rules at runtime from
     https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md via WebFetch.
     Replaced with a pinned local copy in guidelines.md (see ../VENDORED.md for SHA and update steps).
     Edited lines: "How It Works" steps 1 and 3, the "Guidelines Source" section, "Usage" steps 1 and 3. -->
