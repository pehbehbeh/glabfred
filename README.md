# glabfred

<img src="icon.png" alt="glabfred icon" width="96" align="right">

[![Latest release](https://img.shields.io/github/v/release/pehbehbeh/glabfred)](https://github.com/pehbehbeh/glabfred/releases/latest)
[![Tests](https://github.com/pehbehbeh/glabfred/actions/workflows/test.yml/badge.svg)](https://github.com/pehbehbeh/glabfred/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Alfred](https://www.alfredapp.com) workflow to search your GitLab projects and jump to their merge requests, issues and more, on every host you're logged in to with the [GitLab CLI](https://gitlab.com/gitlab-org/cli) (glab). It runs glab for every request, so the workflow has no login or token of its own.

## Setup

Log in to each GitLab host you want to search:

```bash
glab auth login
```

The workflow uses every host that `glab auth status` reports as logged in. It also needs [Bun](https://bun.sh) or [Node.js](https://nodejs.org) 22+, and takes Bun if both are there. Alfred doesn't load your shell's `PATH`, so the workflow looks in Homebrew, `~/.bun`, mise and Volta.

## Usage

Search your projects via the `glab` keyword. You can change the keyword in the Workflow's Configuration.

- <kbd>↩</kbd> Open the project menu.
- <kbd>⌘</kbd><kbd>↩</kbd> Open the project in the browser.
- <kbd>⌥</kbd><kbd>↩</kbd> Copy the project path.

Projects you starred in GitLab come first and have a ★, including starred projects you aren't a member of. If the same path exists on two hosts, the host goes in front (`gitlab.com/team/app`).

The project menu mostly follows GitLab's [keyboard shortcuts](https://docs.gitlab.com/user/shortcuts/), without the `g+` (`g+m` is `m`). `i` opens the issues list instead of GitLab's new issue page. An exact shortcut comes first, so `t` and `i` don't end up below the titles that contain those letters.

```
glab <search>                  projects
glab <project> <shortcut>      project menu, filtered
glab <project> m <search>      open merge requests
glab R <search>                review requests on all hosts
```

In a list (merge requests, issues, files, pipelines, commits, branches, tags, releases, milestones, environments, wiki pages, boards, jobs, snippets, code search, settings):

- <kbd>↩</kbd> Open the entry in the browser.
- <kbd>⌥</kbd><kbd>↩</kbd> Copy its reference (`!12`, `#34`, the file path, the short commit SHA, the branch or the tag name, the milestone as `%name`, the environment's URL, the wiki page's path, the snippet as `$12`, the code hit as `path:line` or the settings section's URL).
- <kbd>⌘</kbd><kbd>C</kbd> Copy its URL.

On a list entry in the project menu:

- <kbd>⌘</kbd><kbd>↩</kbd> Open the whole list in GitLab.
- <kbd>⌥</kbd><kbd>↩</kbd> On Issues or Snippets, create a new one. On Merge requests, pick the source branch first: it lists the branches, newest first, and <kbd>↩</kbd> opens a new merge request from the chosen one.

### Shortcuts

| Key | Aliases | Opens | Details |
|---|---|---|---|
| `m` | `mr` | Merge requests | Lists open MRs in Alfred. Search by number, title, author or source branch. A number alone (`42` or `!42`) also finds closed and merged MRs, and the text search finds them too for 30 days after. |
| `i` | `issue` | Issues | Lists open issues in Alfred. Search by number, title, assignee or label. A number alone (`42` or `#42`) also finds closed issues, and the text search finds them too for 30 days after. A board column is usually a label, so `i doing` shows that column. |
| `t` | `file`, `find` | Find file | Lists the files and folders on the default branch in Alfred. Search by path. ⌘↩ opens a file in GitLab's editor. |
| `/` | `code` | Code search | Searches the code of the project via GitLab, from 3 characters on. Each hit opens the file at the matching line. GitLab searches the default branch only. |
| `p` | `pipe`, `ci` | Pipelines | Lists the last 50 pipelines in Alfred. Search by branch, status or ID. |
| `j` | `job` | Jobs | Lists the last 100 CI/CD jobs in Alfred. Search by name, stage, branch, status or ID. |
| `c` | `commit` | Commits | Lists the last 100 commits on the default branch in Alfred. Search by short SHA, title or author. |
| `branch` | | Branches | Lists all branches in Alfred, newest commit first. Search by name. |
| `tag` | | Tags | Lists all tags in Alfred, newest first. Search by name, message or commit title. |
| `r` | `release` | Releases | Lists all releases in Alfred. Search by name, tag or release notes. |
| `milestone` | | Milestones | Lists active milestones of the project and its parent groups in Alfred, next due date first. Search by title or description. |
| `e` | `env` | Environments | Lists available environments in Alfred, last updated first. Search by name, tier or URL. ↩ opens the deployed app, ⌘↩ the environment in GitLab. |
| `w` | | Wiki | Lists all wiki pages in Alfred. Search by title or path. |
| `b` | `board` | Issue boards | Lists the project's issue boards in Alfred with their label columns. Search by name or column. |
| `s` | `snippet` | Snippets | Lists the project's snippets in Alfred. Search by `$` number, title, description, file name or author. |
| `f` | | Repository | Opens the repository files on the default branch in the browser. |
| `.` | | Web IDE | Opens the default branch in GitLab's Web IDE. |
| `,` | `settings` | Settings | Lists the project's settings pages and their sections in Alfred, such as CI/CD variables or protected branches. Search by name or a related word (`secrets`, `archive`, `ssh`). ↩ opens the section. |

You can change every key in the Workflow's Configuration. The keys for lists have to be one word, because a space after the key opens the list.

### Your lists on all hosts

Capital letters open lists across all projects and hosts, like GitLab's global shortcuts <kbd>⇧</kbd><kbd>M</kbd>, <kbd>⇧</kbd><kbd>I</kbd>, <kbd>⇧</kbd><kbd>R</kbd>, <kbd>⇧</kbd><kbd>T</kbd> and <kbd>⇧</kbd><kbd>S</kbd>. An empty `glab` shows them above the projects.

| Key | Opens | Details |
|---|---|---|
| `M` | My merge requests | Open MRs you created or are assigned to. |
| `I` | My issues | Open issues assigned to you. |
| `R` | Review requests | Open MRs where you are a reviewer. |
| `T` | To-do items | Your pending to-do items, with what triggered them (review requested, mentioned, build failed). |
| `S` | My snippets | Snippets you created, personal and in projects. |

Search merge requests by reference (`team/app!12`), title, author or source branch, issues by reference, title, assignee or label, to-do items by reference, title, action or author, and snippets by `$` number, title, description, file name or project. <kbd>⌥</kbd><kbd>↩</kbd> copies the full reference. The key alone opens the list, without the space a project list needs. The keys are case-sensitive, so `glab m` still searches projects. You can change them in the Workflow's Configuration.

### Commands

`glab ?` lists the commands. Type after the `?` to filter them.

- **Refresh cache** clears the cache and opens `glab` again, so every list loads fresh from GitLab.
- **Each logged-in host** shows how many projects it has, or why loading them failed. <kbd>↩</kbd> opens the host in the browser, <kbd>⌥</kbd><kbd>↩</kbd> copies its name.

## Installation

Download [glabfred.alfredworkflow](https://github.com/pehbehbeh/glabfred/releases/latest/download/glabfred.alfredworkflow) from the latest release and open it. The [releases page](https://github.com/pehbehbeh/glabfred/releases) has older versions and the changelog.

## How it works

Results come from a cache in Alfred's workflow cache folder and refresh in a detached background process, so typing never waits for GitLab. The first time a list is opened it shows "Loading" for a moment.

| Data | Refreshed after |
|---|---|
| projects (including starred ones), files | 1 hour |
| branches, tags, releases, milestones, environments, wiki pages, boards | 10 minutes |
| merge requests, issues, pipelines, jobs, commits, your lists on all hosts | 1 minute |

## Development

Symlink the repo into Alfred's workflow folder, so changes apply without a rebuild:

```bash
ln -s "$PWD" ~/path/to/Alfred.alfredpreferences/workflows/user.workflow.glabfred
```

`bun run build` packs `dist/glabfred.alfredworkflow`.

```bash
bun test
```

The tests run with Bun. They cover the query router, the menu and the mapping of API responses, without calling GitLab.

To add a list, create a file in `lib/views/` that exports `id`, `defaultKey`, `title`, `aliases`, `unit`, `ttl`, `page`, `endpoint` and `toEntries`, plus `paginate` for endpoints with more than 100 results, `byNumber` to look up a single entry by number that isn't in the list (its entries then need an `iid`), and `create` for a ⌥↩ create page (see `lib/views/merge-requests.js`). Add it to `lib/views/index.js`, and add a text field with the variable `shortcut_<id>` to the Workflow's Configuration in Alfred.

Commits follow [Conventional Commits](https://www.conventionalcommits.org). [release-please](https://github.com/googleapis/release-please) keeps a release PR open that bumps the version in `package.json` and `info.plist` and updates `CHANGELOG.md`. Merging it tags the release, and the release workflow attaches the built `.alfredworkflow`.
