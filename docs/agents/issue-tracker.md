# Issue Tracker: GitHub

Issues and PRDs for ArtifyBharat live on GitHub Issues at `https://github.com/parth5012/artify-bharat-sih`. Use the `gh` CLI for all operations.

## Conventions

- **Create issue**: `gh issue create --title "..." --body "..."`
- **Read issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close issue**: `gh issue close <number> --comment "..."`

The repository remote is automatically inferred from `git remote -v`.

## Pull Requests as a Triage Surface

**PRs as request surface: no.** (Issues are primary; PRs are implementation results).
