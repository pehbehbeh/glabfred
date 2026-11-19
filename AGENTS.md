# glabfred

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org). release-please reads them to pick the next semver version (`fix:` patch, `feat:` minor, `feat!:` or `BREAKING CHANGE:` major) and to write CHANGELOG.md.
- Never set the version in `package.json` or `info.plist` by hand. The release PR from release-please bumps both.
- Alfred rewrites `info.plist` when the workflow is edited in its GUI, so release-please finds the version by XPath instead of an annotation comment (whether Alfred keeps XML comments wasn't checked).
- Alfred doesn't notice changes to `info.plist` made outside its GUI (the installed workflow is a symlink to this repo). After editing it, run `osascript -e 'tell application id "com.runningwithcrayons.Alfred" to reload workflow "io.pbb.glabfred"'`.
