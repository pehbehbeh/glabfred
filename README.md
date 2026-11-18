# glabfred

<img src="icon.png" alt="glabfred icon" width="96" align="right">

[![Latest release](https://img.shields.io/github/v/release/pehbehbeh/glabfred)](https://github.com/pehbehbeh/glabfred/releases/latest)
[![Tests](https://github.com/pehbehbeh/glabfred/actions/workflows/test.yml/badge.svg)](https://github.com/pehbehbeh/glabfred/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Alfred](https://www.alfredapp.com) workflow to search your GitLab projects and jump to their merge requests, issues and more, on every host you're logged in to with the [GitLab CLI](https://gitlab.com/gitlab-org/cli) (glab). It reads hosts and tokens from glab, so the workflow has no login of its own.

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

If the same path exists on two hosts, the host goes in front (`gitlab.com/team/app`).

The project menu uses GitLab's [project shortcuts](https://docs.gitlab.com/user/shortcuts/) without the `g+`, so `g+m` is `m`. `i` opens the issues list instead of GitLab's new issue page. An exact shortcut comes first, so `t` and `i` don't end up below the titles that contain those letters.

```
glab <search>                  projects
glab <project> <shortcut>      project menu, filtered
glab <project> m <search>      open merge requests
```

In a list (merge requests, issues, files, pipelines, branches):

- <kbd>↩</kbd> Open the entry in the browser.
- <kbd>⌥</kbd><kbd>↩</kbd> Copy its reference (`!12`, `#34`, the file path or the branch name).
- <kbd>⌘</kbd><kbd>C</kbd> Copy its URL.

On a list entry in the project menu:

- <kbd>⌘</kbd><kbd>↩</kbd> Open the whole list in GitLab.
- <kbd>⌥</kbd><kbd>↩</kbd> On Merge requests or Issues, create a new one.

### Shortcuts

| Key | Opens | Key | Opens |
|---|---|---|---|
| `t` | file search (list) | `f` | repository |
| `m` | merge requests (list) | `c` | commits |
| `i` | issues (list) | `j` | jobs |
| `p` | pipelines (list) | `r` | releases |
| `branch` | branches (list) | `w` | wiki |
| `b` | issue boards | `e` | environments |
| `.` | Web IDE | `settings` | settings |

`mr`, `issue`, `file` and `pipe` work for the lists too. You can change every key in the Workflow's Configuration. The keys for lists have to be one word, because a space after the key opens the list.

## Installation

Download [glabfred.alfredworkflow](https://github.com/pehbehbeh/glabfred/releases/latest/download/glabfred.alfredworkflow) from the latest release and open it. The [releases page](https://github.com/pehbehbeh/glabfred/releases) has older versions and the changelog.

## How it works

Results come from a cache in Alfred's workflow cache folder and refresh in a detached background process, so typing never waits for GitLab. The first time a list is opened it shows "Loading" for a moment.

| Data | Refreshed after |
|---|---|
| projects, files | 1 hour |
| branches | 10 minutes |
| merge requests, issues, pipelines | 1 minute |

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

To add a list, create a file in `lib/views/` that exports `id`, `defaultKey`, `title`, `aliases`, `unit`, `ttl`, `page`, `endpoint` and `toEntries`, plus `paginate` for endpoints with more than 100 results and `create` for a ⌥↩ create page (see `lib/views/merge-requests.js`). Add it to `lib/views/index.js`, and add a text field with the variable `shortcut_<id>` to the Workflow's Configuration in Alfred.

The icon is `assets/icon.svg`. `sh scripts/icon.sh` renders it to `icon.png` with headless Chrome, Brave or Chromium (one of them has to be installed, for the SVG filters and gradients).

Commits follow [Conventional Commits](https://www.conventionalcommits.org). [release-please](https://github.com/googleapis/release-please) keeps a release PR open that bumps the version in `package.json` and `info.plist` and updates `CHANGELOG.md`. Merging it tags the release, and the release workflow attaches the built `.alfredworkflow`.
