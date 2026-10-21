Daymark 1.1.3 fixes Windows updates closing the app without installing or reopening it.

- Use an independent hidden Windows installation worker instead of the detached PowerShell launch that exited before running its script on Windows 11.
- Wait for the worker to acknowledge readiness before closing Daymark. Startup errors keep the app open and show an error.
- Preserve installation logs and verify the installed version before reporting success. Relaunch with the same task-data profile.
- Add regression coverage for worker startup, parent-process exit, failure/timeouts, and a full older-app-to-newer-app installation/relaunch and visible-window test.
- Includes the single-workspace export/import controls introduced in 1.1.1.

One-time Windows repair: versions 1.1.0 and 1.1.1 cannot apply this fix through their broken installer launch. Close Daymark, run Daymark-1.1.3-Windows-x64.exe, and choose your existing installation folder. Do not uninstall first. Your tasks and workspaces are preserved. Future releases can use the repaired in-app updater.
