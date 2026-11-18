# glabfred

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org). release-please reads them to pick the next semver version (`fix:` patch, `feat:` minor, `feat!:` or `BREAKING CHANGE:` major) and to write CHANGELOG.md.
- Never set the version in `package.json` or `info.plist` by hand. The release PR from release-please bumps both.
- Alfred rewrites `info.plist` when the workflow is edited in its GUI, so release-please finds the version by XPath instead of an annotation comment (whether Alfred keeps XML comments wasn't checked).
- Close the workflow in Alfred Preferences before editing `info.plist` by hand. Alfred saves its own copy over the file and drops outside changes.
