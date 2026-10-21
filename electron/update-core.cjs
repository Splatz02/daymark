const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const path=require('node:path');
const RELEASES='https://github.com/Splatz02/daymark/releases';
const API='https://api.github.com/repos/Splatz02/daymark/releases/latest';
function versionParts(value){if(!/^\d+\.\d+\.\d+$/.test(value))throw new Error('Invalid release version.');return value.split('.').map(Number);}
function newer(candidate,current){const a=versionParts(candidate),b=versionParts(current);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;}
function selectRelease(raw,current,platform,arch){
 if(!raw||raw.draft||raw.prerelease||!/^v\d+\.\d+\.\d+$/.test(raw.tag_name))return null;
 const version=raw.tag_name.slice(1);if(!newer(version,current))return null;
 const name=platform==='win32'&&arch==='x64'?`Daymark-${version}-Windows-x64.exe`:platform==='darwin'&&['arm64','x64'].includes(arch)?`Daymark-${version}-Mac-${arch}.zip`:null;
 if(!name)throw new Error('Automatic updates are unavailable on this architecture.');
 const asset=raw.assets?.find(a=>a.name===name&&a.state==='uploaded');
 if(!asset)throw new Error('This release does not have an update for this computer yet. Please try again later.');
 const expected=`${RELEASES}/download/${raw.tag_name}/${name}`;
 if(asset.browser_download_url!==expected||!/^sha256:[a-f0-9]{64}$/.test(asset.digest)||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>2*1024**3)throw new Error('This release is missing valid download verification details.');
 return {version,name,url:expected,sha256:asset.digest.slice(7),size:asset.size,notes:typeof raw.body==='string'?raw.body.slice(0,2500):''};
}
async function downloadVerified(release,directory,onProgress,fetcher=fetch){
 await fs.mkdir(directory,{recursive:true});
 const destination=path.join(directory,release.name),temporary=destination+'.partial';
 const response=await fetcher(release.url,{headers:{'User-Agent':'Daymark-Desktop'},signal:AbortSignal.timeout(15*60*1000)});
 if(!response.ok||!response.body)throw new Error(`Download failed (${response.status}). Try again when you’re online.`);
 const file=await fs.open(temporary,'w');const hash=crypto.createHash('sha256');let received=0;
 try{
  for await(const chunk of response.body){received+=chunk.length;if(received>release.size)throw new Error('The download is larger than the verified release.');hash.update(chunk);await file.writeFile(chunk);onProgress({received,total:release.size,percent:received/release.size*100});}
  if(received!==release.size||hash.digest('hex')!==release.sha256)throw new Error('Update verification failed. The download was discarded.');
  await file.sync();await file.close();await fs.rename(temporary,destination);return destination;
 }catch(error){await file.close().catch(()=>{});await fs.unlink(temporary).catch(()=>{});throw error;}
}
module.exports={RELEASES,API,newer,selectRelease,downloadVerified};
