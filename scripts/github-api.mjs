// Maintainer utility. Reads existing Git Credential Manager credentials into memory only.
// Nothing from this module is included in the desktop app.
import {spawnSync} from 'node:child_process';
const repository='Splatz02/daymark';
export async function github(route,options={}){
 const credential=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GCM_INTERACTIVE:'never',GIT_TERMINAL_PROMPT:'0'}});
 if(credential.status!==0)throw new Error('GitHub authentication is not available in Git Credential Manager.');
 const password=credential.stdout.split('\n').find(line=>line.startsWith('password='))?.slice(9).trim();
 if(!password)throw new Error('GitHub credentials are missing.');
 const response=await fetch(`https://api.github.com${route}`,{...options,headers:{Authorization:`Bearer ${password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json',...options.headers}});
 if(!response.ok)throw new Error(`GitHub ${response.status}: ${await response.text()}`);
 return response.status===204?null:response.json();
}
export {repository};
if(process.argv[2]==='status'){const result=await github(`/repos/${repository}`);console.log(JSON.stringify({repository:result.full_name,private:result.private,default_branch:result.default_branch,permissions:result.permissions}));}
