const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setName('Daymark');
let window;
let writeQueue = Promise.resolve();
const dataPath = () => path.join(app.getPath('userData'), 'daymark.json');
const isSmoke = process.env.DAYMARK_SMOKE === '1';
if (isSmoke) app.setPath('userData', path.join(app.getPath('temp'), 'daymark-smoke-' + process.pid));
const ownsLock=app.requestSingleInstanceLock();
if(!ownsLock)app.quit();
app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
const {createUpdater}=require('./updater.cjs');
const updater=createUpdater({app,send:state=>{if(window&&!window.isDestroyed())window.webContents.send('updates:state',state);},flush:()=>writeQueue,quit:()=>{quitting=true;app.quit();},openExternal:url=>shell.openExternal(url)});
for(const [channel,method] of Object.entries({'updates:get':'state','updates:check':'check','updates:download':'download','updates:install':'install','updates:defer':'defer','updates:releases':'openReleases'}))ipcMain.handle(channel,event=>{assertSender(event);return updater[method]();});
function assertSender(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Invalid sender');
}
ipcMain.handle('data:load', async event => {
  assertSender(event);
  try { return { data: JSON.parse(await fs.readFile(dataPath(), 'utf8')) }; }
  catch (error) {
    if (error.code === 'ENOENT') return { data: null };
    try { return { data: JSON.parse(await fs.readFile(dataPath() + '.bak', 'utf8')), recovered: true }; }
    catch { return { error: 'Your saved file could not be read. It has been preserved. Restore a backup before saving new work.' }; }
  }
});
ipcMain.handle('data:save', async (event, data) => {
  assertSender(event);
  if (!data || data.schema !== 2 || !Array.isArray(data.tasks) || !Array.isArray(data.workspaces)) throw new Error('Invalid data');
  const job = writeQueue.catch(() => {}).then(async () => {
    const target = dataPath(); await fs.mkdir(path.dirname(target), { recursive: true });
    // Preserve the previous valid save and replace the main file atomically.
    try { const previous = await fs.readFile(target, 'utf8'); const parsed=JSON.parse(previous); if(parsed.schema===1){try{await fs.writeFile(path.join(path.dirname(target),'daymark-v1-backup.json'),previous,{encoding:'utf8',flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}} await fs.writeFile(target + '.bak', previous, 'utf8'); } catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
    await fs.writeFile(target + '.tmp', JSON.stringify(data), 'utf8');
    await fs.rename(target + '.tmp', target);
    return true;
  });
  writeQueue = job; return job;
});
ipcMain.handle('backup:export', async (event, data, options = {}) => {
  assertSender(event);
  const name=typeof options?.workspaceName==='string'?options.workspaceName.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,80):'';
  const { canceled, filePath } = await dialog.showSaveDialog(window, { title: name?'Export Daymark workspace':'Export Daymark backup', defaultPath: `Daymark-${name?name+'-':''}${new Date().toISOString().slice(0,10)}.json`, filters: [{ name: name?'Daymark workspace':'Daymark backup', extensions: ['json'] }] });
  if (canceled) return false;
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8'); return true;
});
ipcMain.handle('backup:import', async event => {
  assertSender(event);
  const { canceled, filePaths } = await dialog.showOpenDialog(window, { title: 'Import Daymark backup', properties: ['openFile'], filters: [{ name: 'Daymark backup', extensions: ['json'] }] });
  if (canceled) return null;
  const info = await fs.stat(filePaths[0]); if (info.size > 25 * 1024 * 1024) throw new Error('Backup exceeds 25 MB.');
  return JSON.parse(await fs.readFile(filePaths[0], 'utf8'));
});
function createWindow() {
  window = new BrowserWindow({ width: 1440, height: 940, minWidth: 960, minHeight: 660, backgroundColor: '#111413', title: 'Daymark', icon: path.join(__dirname, '../assets/icon.png'), autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (process.env.DAYMARK_DEV === '1') window.loadURL('http://127.0.0.1:5173'); else window.loadFile(path.join(__dirname, '../dist/index.html'));
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Daymark', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] }, { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] }, { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] }]));
  else Menu.setApplicationMenu(null);
}
app.whenReady().then(() => { if(!ownsLock)return;createWindow(); updater.init(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
let quitting = false;
app.on('before-quit', event => { if (!quitting) { event.preventDefault(); writeQueue.then(() => { quitting = true; app.quit(); },()=>{quitting=true;app.quit();}); } });
