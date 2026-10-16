import {mkdir,copyFile,cp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'dist');
const files=['index.html','style.css','app.js','app-updates.js','dashboard-status.js','alerts.js','alerts-core.js','assistant.js','assistant-parser.js','planning.js','planning-core.js','interactions.js','navigation.js','dashboard.js','finance.js','report.js','report-logo.js','cloud.js','session-store.js','config.js','manifest.webmanifest','icon.svg','icon.png'];
const digest=value=>createHash('sha256').update(value).digest('hex');
async function walk(directory){const result=[];for(const entry of await readdir(resolve(root,directory),{withFileTypes:true})){const path=directory+'/'+entry.name;if(entry.isDirectory())result.push(...await walk(path));else result.push(path);}return result;}
const assets=[...await walk('assets'),...await walk('fonts')].sort();
const inputs=await Promise.all([...files,...assets,'sw.js','scripts/build.mjs'].sort().map(async file=>[file,await readFile(resolve(root,file))]));
let commit=process.env.COMMIT_REF||'';if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{commit='source';}}
const id=digest(Buffer.concat([Buffer.from(commit),...inputs.flatMap(([path,bytes])=>[Buffer.from(path+'\0'),bytes])] )).slice(0,16);
const release=`releases/${id}`;
// Clean only generated output; never touch browser/user data or the checkout sources.
await rm(output,{recursive:true,force:true});await mkdir(resolve(output,release),{recursive:true});
for(const file of files)await copyFile(resolve(root,file),resolve(output,file));
for(const directory of ['assets','fonts']){await cp(resolve(root,directory),resolve(output,directory),{recursive:true});await cp(resolve(root,directory),resolve(output,release,directory),{recursive:true});}
for(const file of files.filter(file=>file.endsWith('.js')||file==='style.css'))await copyFile(resolve(root,file),resolve(output,release,file));
let html=await readFile(resolve(root,'index.html'),'utf8');
html=html.replace('<head>',`<head><meta name="serimora-build" content="${id}">`)
 .replace(/href="style\.css[^\"]*"/,`href="${release}/style.css"`)
 .replace('src="app.js"',`src="${release}/app.js"`)
 .replace(/(src|href)="(assets\/[^\"]+)"/g,`$1="${release}/$2"`);
await writeFile(resolve(output,'index.html'),html);
const version={schema:1,id,commit,createdAt:new Date().toISOString(),release};await writeFile(resolve(output,'version.json'),JSON.stringify(version,null,2));
const cached=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon.png','./assets/serimora-logo.png',...files.filter(f=>f.endsWith('.js')||f==='style.css').map(f=>'./'+release+'/'+f),...assets.map(f=>'./'+release+'/'+f)];
const hashes={};for(const path of cached){const file=path==='./'?'index.html':path.slice(2);hashes[path]=digest(await readFile(resolve(output,file)));}
let worker=await readFile(resolve(root,'sw.js'),'utf8');worker=worker.replace("const BUILD='source';",`const BUILD='${id}';`).replace(/const CACHE='[^']+';/,`const CACHE='serimora-${id}';`).replace(/const FILES=\[[^\n]*\];/,`const FILES=${JSON.stringify(cached)};`).replace('const DIGESTS={};',`const DIGESTS=${JSON.stringify(hashes)};`);
await writeFile(resolve(output,'sw.js'),worker);
console.log(`Serimora ${id} preparado em dist/ (${commit.slice(0,8)}). HTML, CSS e módulos compartilham a mesma versão.`);
