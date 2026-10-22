# Daymark

A local desktop planner for Windows and Mac, with separate workspaces, a working board, a calendar, and flexible recurring checklists.

**Want to host Daymark on a VPS or use it in your phone's browser?** The web build adapts to phones and tablets while keeping the desktop layout. See the [web hosting and deployment guide](DEPLOYMENT.md) for building, serving it on your domain, and updating an existing hosted copy. Browser data stays local to each browser; transfers use export/import.

## Download Daymark

**Current version: 1.1.6.** All three downloads include the latest workspace, backup, updater, and checklist reordering features. No GitHub account or developer tools are needed.

Choose the download that matches your computer:

| Your computer | Download | Installation steps |
| --- | --- | --- |
| **Windows PC** with a 64-bit Intel or AMD processor | [**Download for Windows (.exe)**](https://github.com/Splatz02/daymark/releases/download/v1.1.6/Daymark-1.1.6-Windows-x64.exe) | [Install on Windows](#install-on-windows) |
| **Mac with Apple silicon** (an Apple M-series chip) | [**Download for Mac — Apple silicon (.zip)**](https://github.com/Splatz02/daymark/releases/download/v1.1.6/Daymark-1.1.6-Mac-arm64.zip) | [Install on Mac](#install-on-mac) |
| **Mac with an Intel processor** | [**Download for Mac — Intel (.zip)**](https://github.com/Splatz02/daymark/releases/download/v1.1.6/Daymark-1.1.6-Mac-x64.zip) | [Install on Mac](#install-on-mac) |

**Not sure which Mac you have?** Open **Apple menu > About This Mac**. If it says **Chip: Apple M…**, choose Apple silicon. If it says **Processor: Intel…**, choose Intel. See [Apple's guide to identifying your Mac](https://support.apple.com/en-us/116943).

[Latest release and release notes](https://github.com/Splatz02/daymark/releases/latest) · [Transfer your tasks or a workspace](#backups-and-transfers)

### Install on Windows

1. Click **Download for Windows** above and save the `.exe` file.
2. Open the downloaded installer, usually in your **Downloads** folder.
3. Follow the setup wizard. Choose an installation folder, click **Install**, then leave **Open Daymark** selected and click **Finish**.
4. Next time, open **Daymark** from your desktop shortcut or the Start menu. You can right-click its taskbar icon and choose **Pin to taskbar**.

The installer is not signed with a publisher certificate. If Windows shows **Windows protected your PC** for this download and you trust this repository, choose **More info > Run anyway** to continue. [Microsoft explains this first-run prompt](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/publish-first-app#step-6-handle-smartscreen-for-new-apps).

**Already have Daymark?** Normally, use **Settings & backups > Check for updates** inside the app. If you have Windows version **1.1.0 or 1.1.1**, or **Install & restart** closes the app without updating it, close Daymark and run the current Windows installer above, choosing the **same installation folder**. Do **not** uninstall first. This installs the updater repair and all later features while keeping your tasks and workspaces.

### Install on Mac

These steps apply to **both** Mac downloads. Choose Apple silicon or Intel using the table above.

1. Download the matching Mac `.zip` file.
2. In Finder, open **Downloads** and double-click the ZIP to extract **Daymark.app**. Finder may display its name as **Daymark**.
3. In Finder, choose **Go > Home**. Open your **Applications** folder, or create a folder named **Applications** there if it does not exist.
4. Drag the extracted **Daymark.app** into that folder, then double-click it to open it. Keeping the app in your own Applications folder lets Daymark install future updates there.
5. Drag Daymark to the Dock if you want a shortcut for next time.

**If macOS blocks the first launch:** Daymark is ad-hoc signed and is not Apple-notarized. After trying to open it, dismiss the warning and open **System Settings > Privacy & Security**. Scroll to the security section, choose **Open Anyway** beside Daymark, and confirm when prompted. This gives this app a first-launch exception. [Apple's instructions for opening a downloaded app](https://support.apple.com/en-us/102445).

### Updates and moving between computers

Once installed, Daymark checks for updates on both Windows and Mac. You can also open **Settings & backups > Check for updates**, download an available update, and choose **Install & restart**. Future updates do not require downloading another ZIP or installer manually.

Your tasks are stored on your computer. To move work to another computer or share one workspace with a friend, use [export and import](#backups-and-transfers) inside Daymark. Installing the app starts with its own local data; it does not automatically copy your tasks from another computer.

## Workspaces

Use the workspace switcher at the top of the sidebar to switch, create, or edit workspaces. Choose a name, one of 48 icons, and one of six colors. Each workspace has a separate board, calendar, completed history, and daily capacity.

Delete a workspace from its editor by typing its name to confirm. This removes only that workspace and its tasks/history. You must keep at least one workspace. Export a backup first if you may want the workspace later.

Workspaces organize your work locally. They do not share tasks with collaborators or sync across computers.

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

Transfers are manual. Credentials and update downloads are not included in task exports. Desktop data is saved atomically to `daymark.json` with a previous-save `.bak` in `%APPDATA%\Daymark\` (Windows) or `~/Library/Application Support/Daymark/` (Mac). Updates create another data backup before installation. Mac updates keep a hidden prior `.app` beside the installed app for rollback. Upgrading from Daymark 1.0 automatically moves existing data into the **Personal** workspace and preserves the original data in `daymark-v1-backup.json`.

## Updates

Daymark checks the public `Splatz02/daymark` GitHub releases feed after startup and every six hours. Manual checks are in Settings & backups. Downloads start only when accepted and show byte/percentage progress. Install & restart applies the update after saving and backing up all workspaces. Remind me tomorrow snoozes notifications for 24 hours.

Windows runs the downloaded installer against the existing installation directory and reopens Daymark. The app waits for its installation helper to acknowledge startup before closing and checks that the running version matches a successful update receipt. Mac validates the new bundle's identity, version, and local code signature, stages it beside the current app, waits for Daymark to quit, keeps the previous bundle, swaps in the new one, and reopens it. The installed app must be in a folder you can write to. Failures are recorded in the data folder's `updates` directory and shown in Settings on the next launch. No app contains a GitHub token or signing secret. Downloads must match the exact release name, repository URL, size, and SHA-256 digest supplied by GitHub's HTTPS API.

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
4. After publication, update the current version and the three download links at the top of this README to the newly published release. Verify that each link matches an uploaded release asset before pushing the README change.

GitHub's built-in workflow token publishes release artifacts. No additional repository secrets are required. Keep release names in the configured `Daymark-<version>-Windows-x64.exe` / `Daymark-<version>-Mac-<arch>.zip` format because the updater intentionally rejects unexpected artifacts.
