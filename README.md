# Daymark

A local desktop planner for Windows and Mac, with separate workspaces, a working board, a calendar, and flexible recurring checklists.

## Upgrade your existing Windows app

Close Daymark 1.0. Run **Daymark-1.1.0-Windows-x64.exe** and choose the same installation folder. Do **not** uninstall first. All task data remains in `%APPDATA%\Daymark\`, and the app automatically moves it into the **Personal** workspace. A separate `daymark-v1-backup.json` preserves the original data.

The old 1.0 app has no updater, so this one-time installation is necessary. From 1.1 onward, Daymark checks GitHub for new releases and offers the update inside the app.

Download official releases from https://github.com/Splatz02/daymark/releases/latest.

## Workspaces

Use the workspace switcher at the top of the sidebar to switch, create, or edit workspaces. Choose a name, one of 48 icons, and one of six colors. Each workspace has a separate board, calendar, completed history, and daily capacity.

Delete a workspace from its editor by typing its name to confirm. This removes only that workspace and its tasks/history. You must keep at least one workspace. Export a backup first if you may want the workspace later.

Workspaces organize your work locally. They do not share tasks with collaborators or sync across computers.

## Install on Mac

Choose **Mac-arm64.zip** for Apple silicon or **Mac-x64.zip** for Intel. Extract it, move **Daymark.app** into your home Applications folder, then open it and drag it to the Dock. This is a personal, ad-hoc-signed app, not an Apple-notarized distribution. If macOS blocks its first launch, use **System Settings > Privacy & Security > Open Anyway**.

Both Mac packages are built on a native Mac runner. Automatic updates validate the new bundle's identity, version, checksum, and local code signature before replacing the installed app. Install in a folder you can write to; updates cannot replace an app in a read-only folder.

## Daily use

- **Required:** scheduled tasks and unfinished overdue occurrences.
- **In progress:** work you have started.
- **Anytime:** unscheduled tasks you can pick up when there is room.
- Drag work into In progress or into the green Done area. Completed cards leave the working board and can be restored from Completed.
- Click a card to edit its notes, status, schedule, priority, effort estimate, or checklist. Calendar has month/week views and a daily list; there are no time blocks.
- Delete confirmations automatically scroll into view. On recurring work, choose the template to delete the series or one date to remove just that occurrence.

Recurrence supports every N days, selected weekdays every N weeks, and every N months. Weeks start on Monday. Monthly dates beyond a month's length use its final day without drifting. End dates are inclusive. Fresh checklists reset each occurrence; shared checklists carry checked steps forward. Notes and steps can be repeated on every occurrence or only the first.

## Backups and transfers

**Settings & backups > Export backup** exports **all workspaces** with tasks, recurrence, notes, progress, and history. Move the JSON file to the other computer and import it.

- **Replace** replaces all workspaces on that device with the backup.
- **Merge** retains local-only workspaces/tasks and applies imported versions when IDs overlap.
- Daymark 1.0 backups are supported and migrate into Personal.

Transfers are manual. Credentials and update downloads are not included in task exports. Desktop data is saved atomically to `daymark.json` with a previous-save `.bak` in `%APPDATA%\Daymark\` (Windows) or `~/Library/Application Support/Daymark/` (Mac). Updates create another data backup before installation. Mac updates keep a hidden prior `.app` beside the installed app for rollback.

## Updates

Daymark checks the public `Splatz02/daymark` GitHub releases feed after startup and every six hours. Manual checks are in Settings & backups. Downloads start only when accepted and show byte/percentage progress. Install & restart applies the update after saving and backing up all workspaces. Remind me tomorrow snoozes notifications for 24 hours.

Windows runs the downloaded installer against the existing installation directory and reopens Daymark. Mac validates and stages the new app beside the current app, waits for Daymark to quit, keeps the previous bundle, swaps in the new one, and reopens it. Failures are recorded and shown in Settings on the next launch. No app contains a GitHub token or signing secret. Downloads must match the exact release name, repository URL, size, and SHA-256 digest supplied by GitHub's HTTPS API.

## Development and future releases

Node.js 24.20+:

```sh
npm ci
npm start
npm test
npm run test:desktop
node scripts/workspaces-test.cjs
```

`npm run dev` runs a browser preview with separate localStorage data. Export/import transfers data between the preview and desktop app.

`npm run pack:win` builds on Windows. `npm run pack:mac` builds both Mac architectures on a Mac. The release workflow runs model/UI tests and packages Windows x64, Mac arm64, and Mac x64. It also tests Mac replacement/relaunch requests and failed-payload handling using a real signed app bundle on a Mac runner.

For a new release:

1. Update `package.json` and `package-lock.json` with a higher stable semantic version, and edit `RELEASE-NOTES.md`.
2. Commit/push the source, then tag that commit `v<version>` and push the tag.
3. GitHub Actions builds and checks all three platforms. It publishes a release only when every job passes and all expected files exist. Installed copies discover that published release.

GitHub's built-in workflow token publishes release artifacts. No additional repository secrets are required. Keep release names in the configured `Daymark-<version>-Windows-x64.exe` / `Daymark-<version>-Mac-<arch>.zip` format because the updater intentionally rejects unexpected artifacts.
