# Run Daymark on a VPS or your own domain

Daymark's web build works in desktop, phone, and tablet browsers. Small screens get a navigation drawer, a stacked working board, a compact calendar with a day agenda, and touch-friendly task/workspace editors. Desktop layouts keep their existing appearance.

You can host the same app as static files. The Windows installer and Mac ZIPs are for installed desktop apps; a VPS serves the web build's `dist` folder instead. There is no Electron process, database, or Node server to keep running on the VPS.

## Where tasks are saved

In the browser, workspaces and tasks are saved in **that browser's local storage for that website address**. Hosting Daymark makes the app reachable from your phone; it does **not** add accounts, a shared server workspace, or automatic sync with your desktop app or another person.

Use **Settings & backups** to export/import all your workspaces or just the current workspace. Export regularly and before changing domains, browser profiles, or clearing browser data. Private browsing can discard data when the session ends. Keep backup JSON files outside the public website directory.

## Build the website

Use Node.js **24.20 or newer** and npm on your computer, a build machine, or the VPS. From a terminal:

```sh
git clone https://github.com/Splatz02/daymark.git
cd daymark
npm ci
npm run build
```

The resulting **`dist`** directory contains `index.html` and an `assets` folder. Deploy the **contents** of `dist` to your website's document root. Keep the generated filenames and folder structure together. Node.js is needed for building, not for serving those files.

The web workflow also builds and tests a **Daymark-web** artifact under [GitHub Actions > Web build and responsive checks](https://github.com/Splatz02/daymark/actions/workflows/web.yml). GitHub requires signing in to download workflow artifacts. The artifact ZIP contains ready-to-host files, not a Windows or Mac installer.

For a local preview only:

```sh
npx vite preview --host 127.0.0.1
```

Open the address printed in the terminal. For production, serve `dist` with your existing web server or a static host. Vite's development and preview servers are intended for local work, not a public VPS. See [Vite's deployment documentation](https://vite.dev/guide/static-deploy.html).

## Example: a Linux VPS with Caddy and HTTPS

If someone already hosts Daymark for you, they only need to rebuild the latest source and replace the deployed static files. They can keep their existing domain and web server configuration.

For a new deployment, this example assumes Caddy is already installed as a system service, your domain's DNS points to the VPS, and ports **80 and 443** reach Caddy. Follow [Caddy's installation guide](https://caddyserver.com/docs/install) if you need to install it first.

After building Daymark, copy its web files:

```sh
sudo mkdir -p /var/www/daymark
sudo cp -R dist/. /var/www/daymark/
```

Add the site block from [deploy/Caddyfile.example](deploy/Caddyfile.example) to your existing `/etc/caddy/Caddyfile`. Replace **daymark.example.com** with your real domain. Keep any other sites already in that file. Validate and reload:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Open **https://your-domain** on your computer or phone. Caddy obtains and renews the HTTPS certificate when the domain and ports are configured correctly. Use HTTPS for normal use; browser APIs such as task ID generation require a secure context. See [Caddy's static file guide](https://caddyserver.com/docs/quick-starts/static-files) and [automatic HTTPS requirements](https://caddyserver.com/docs/automatic-https).

**Already using Nginx, Apache, or a hosting control panel?** Keep that server and point the site's document root at the contents of `dist`. Serve `index.html` at the site root and the generated files under `assets/`, enable HTTPS for the domain, and configure HTML to revalidate instead of caching it indefinitely. The app can also live in a subfolder because its built asset URLs are relative.

## Update an existing hosted copy

From the source checkout on the build machine:

```sh
git pull --ff-only
npm ci
npm run build
```

Deploy the new `dist` contents to the **same website address** using the same process. Upload new assets before replacing `index.html`, or publish the complete build atomically using your hosting platform. Retain previous hashed assets during the rollout so already-open pages keep working. Reload the site on your phone afterward; if a proxy/CDN caches HTML, purge its cached HTML too.

Replacing website files does not erase browser-local tasks. Changing the domain, subdomain, protocol, or browser profile opens a different storage area; transfer your backup when moving between them. Web deployments receive updates by redeploying these files; **Install & restart** is a feature of the installed Windows/Mac app.

## Verify the web build

The responsive checks use temporary browser contexts and sample workspaces, never your installed app data:

```sh
npx playwright install chromium webkit
npm run test:web
node scripts/responsive-test.mjs --webkit
```

The checks exercise narrow phones, portrait tablets, and landscape touch screens: navigation, task completion/restoration, calendar views, recurring tasks, checklists, workspace export/editing, status changes, delete confirmations, persistence, and horizontal overflow. Screenshots are saved under `artifacts/responsive/`.
