import fs from 'node:fs/promises';
const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
if(process.env.RELEASE_TAG!==`v${pkg.version}`)throw new Error('Tag does not match package.json version.');
const files=await fs.readdir(process.argv[2]||'release-assets');
for(const suffix of ['Windows-x64.exe','Mac-arm64.zip','Mac-x64.zip'])if(!files.includes(`Daymark-${pkg.version}-${suffix}`))throw new Error(`Missing ${suffix}. The release was not published.`);
console.log('Tag matches the app version and all three platform assets are present.');
