import {createHash} from 'node:crypto';
const base=new URL(process.argv[2]||'https://serimora.netlify.app/'),expectedCommit=process.argv[3];
const get=async path=>{const url=new URL(path,base);const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error(`${url.pathname}: HTTP ${response.status}`);return response;};
try{
 const version=await (await get('version.json')).json();if(version.schema!==1||!/^[a-f0-9]{16}$/.test(version.id)||version.release!==`releases/${version.id}`)throw Error('Manifesto de publicação ausente ou inválido.');
 if(expectedCommit&&!version.commit.startsWith(expectedCommit))throw Error(`O Netlify publica ${version.commit}, mas o commit esperado é ${expectedCommit}.`);
 const html=await (await get('./')).text();if(!html.includes(`name="serimora-build" content="${version.id}"`)||!html.includes(`${version.release}/app.js`)||!html.includes(`${version.release}/style.css`))throw Error('HTML, módulos e CSS não pertencem à mesma versão.');
 const worker=await (await get('sw.js')).text(),match=/const DIGESTS=(\{[^\n]+\});/.exec(worker);if(!match)throw Error('Worker sem manifesto de integridade.');const files=Object.entries(JSON.parse(match[1]));
 if(!worker.includes(`const BUILD='${version.id}'`))throw Error('Worker e página pertencem a versões diferentes.');
 for(let offset=0;offset<files.length;offset+=4){await Promise.all(files.slice(offset,offset+4).map(async([path,hash])=>{const response=await get(path),bytes=await response.arrayBuffer();if(createHash('sha256').update(Buffer.from(bytes)).digest('hex')!==hash)throw Error(`Arquivo publicado com conteúdo divergente: ${path}`);}));}
 console.log(`PUBLICAÇÃO VALIDADA: ${base.origin} · versão ${version.id} · commit ${version.commit} · ${files.length} arquivos consistentes.`);
}catch(error){console.error('PUBLICAÇÃO NÃO VALIDADA: '+error.message);process.exitCode=1;}
