const {_electron:electron}=require('@playwright/test');
const path=require('node:path');
const fs=require('node:fs/promises');
(async()=>{
 const env={...process.env,DAYMARK_SMOKE:'1'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:path.resolve('release/win-unpacked/Daymark.exe'),args:[],env});
 try{
  const page=await app.firstWindow();await page.getByRole('heading',{name:'Make room for today.'}).waitFor();
  const {localDate,uid,emptyData}=await import('../src/model.js');const today=localDate();const data=emptyData();
  const make=(title,description,estimate,extra={})=>({id:uid(),title,description,date:today,priority:'normal',estimate,checklist:[],checklistMode:'fresh',repeatNotes:true,repeatChecklist:true,recurrence:null,createdAt:new Date().toISOString(),...extra});
  const steps=(...labels)=>labels.map(title=>({id:uid(),title,checked:false}));
  data.tasks=[
   make('Edit & publish today’s video','Give the story a strong opening. Keep it simple, useful, and worth watching.',90,{priority:'high',recurrence:{unit:'day',interval:1,days:[],until:null},checklist:steps('Build the rough cut','Add captions & sound','Watch the final export')}),
   make('Send over the creative direction','Pull the strongest references together and share the plan for the next batch.',35),
   make('Review this week’s content','Look at what people saved, shared, and actually watched.',30,{recurrence:{unit:'week',interval:1,days:[new Date().getDay(),4],until:null}}),
   make('Shape next week’s ideas','A few good ideas are better than a long list. Find the ones with a clear hook.',60,{checklist:steps('Review the idea bank','Pick the strongest three','Write the opening hooks')}),
   make('Refresh the portfolio','A little room for the projects I’m proud of.',45,{date:null,checklist:steps('Choose two recent projects','Add context & outcomes')}),
   make('Try a new video format','Keep an eye out for a format that makes a familiar idea feel fresh.',0,{date:null,priority:'low'}),
   make('Organize the reference library','A home for the things worth coming back to.',25,{date:null,priority:'low'}),
   make('Clear the inbox','Reply, file, and make room for the day.',15)
  ];
  data.overrides[`${data.tasks[3].id}@${today}`]={status:'progress',checks:{[data.tasks[3].checklist[0].id]:true}};
  data.overrides[`${data.tasks[4].id}@anytime`]={status:'progress'};
  data.overrides[`${data.tasks[7].id}@${today}`]={status:'done',completedAt:new Date().toISOString()};
  await page.evaluate(data=>window.daymark.save(data),data);await page.reload();await page.getByRole('heading',{name:'Edit & publish today’s video',exact:true}).waitFor();
  await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/example-workspace.json',JSON.stringify(data,null,2));
  await page.screenshot({path:'artifacts/Daymark-board.png',fullPage:true});
  await page.getByRole('button',{name:'Calendar',exact:true}).click();await page.screenshot({path:'artifacts/Daymark-calendar.png',fullPage:true});
  await page.getByRole('button',{name:/My board/}).click();await page.getByRole('button',{name:'Edit Edit & publish today’s video',exact:true}).click();await page.screenshot({path:'artifacts/Daymark-task.png',fullPage:true});
  console.log('Saved board, calendar, and task screenshots from a separate example workspace.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
