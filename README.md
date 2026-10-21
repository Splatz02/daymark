# Daymark

A local desktop planner for Windows and Mac, with separate workspaces, a working board, a calendar, and flexible recurring checklists.

## Upgrade your existing Windows app

Daymark 1.1.3 repairs a Windows updater launch failure in 1.1.0 and 1.1.1. If Install & restart closes the old app without installing anything, close Daymark, run **Daymark-1.1.3-Windows-x64.exe**, and choose the same installation folder. Do **not** uninstall first. This one-time repair also includes individual workspace import/export.

All task data remains in `%APPDATA%\Daymark\`. If upgrading from 1.0, the app automatically moves it into the **Personal** workspace and preserves the original data in `daymark-v1-backup.json`.

After this repair, use **Settings & backups > Check for updates** to download future releases and install/restart. The app waits for the Windows installation helper to acknowledge startup before closing, logs installation failures in the data folder's `updates` directory, and checks that the running version matches a successful update receipt.

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
- Drag a checklist step by its six-dot handle to reorder it. A line marks where it will land; checked steps keep their progress. You can also focus the handle and press the up/down arrow keys.
- Delete confirmations automatically scroll into view. On recurring work, choose the template to delete the series or one date to remove just that occurrence.

Recurrence supports every N days, selected weekdays every N weeks, and every N months. Weeks start on Monday. Monthly dates beyond a month's length use its final day without drifting. End dates are inclusive. Fresh checklists reset each occurrence; shared checklists carry checked steps forward. Notes and steps can be repeated on every occurrence or only the first.

## Backups and transfers

### Just the current workspace

Under the workspace name at the top of **Settings & backups**, use **Export this workspace** to share only its tasks, notes, schedules, checklists, and completed/progress history. The exported file also includes that workspace's name, icon, color, and capacity. It contains no other workspace metadata or global settings.

To receive a workspace file, switch to the destination workspace, open Settings, and choose **Import into this workspace**. The confirmation names the destination and offers:

- **Merge tasks:** keep existing tasks and add or update the imported tasks and progress.
- **Replace tasks:** remove only the destination workspace's tasks/history and replace them with the file.

Both options preserve the destination's name, icon, color, and capacity, and leave every other workspace untouched. Task IDs that already belong to another workspace are remapped safely; repeating the import updates the same copied tasks. A file containing multiple workspaces is rejected by these controls.

### All workspaces

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
