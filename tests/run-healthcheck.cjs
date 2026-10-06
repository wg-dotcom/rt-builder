// DOM tests only: no browser, HTTP server, external resources, or real deployments.
// Set JSDOM_MODULE to an installed jsdom module directory.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
async function main() {
  const { JSDOM, VirtualConsole } = await import(process.env.JSDOM_MODULE || 'jsdom');
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const tests = fs.readFileSync(path.join(__dirname, 'healthcheck.browser.js'), 'utf8');
  const fixtures = process.argv.slice(2).map(file => ({name:path.basename(path.dirname(file)),html:fs.readFileSync(file,'utf8')}));
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) if (m[1].trim()) new vm.Script(m[1]);
  const errors=[];
  const console = new VirtualConsole();
  console.on('jsdomError',e=>errors.push(e.message));
  function prepare(w) {
    w.TextEncoder=TextEncoder; w.TextDecoder=TextDecoder; w.structuredClone=structuredClone;
    w.fetch=async()=>{throw new Error('Network disabled in regression tests');};
    w.IntersectionObserver=class { observe(){} unobserve(){} disconnect(){} };
    w.confirm=()=>false; w.prompt=()=>null;
  }
  let finish;
  const done=new Promise(resolve=>{finish=resolve;});
  const dom = new JSDOM(html, {url:'https://builder.test/',runScripts:'dangerously',virtualConsole:console,beforeParse(w){
    prepare(w);
    w.QA_FIXTURES=fixtures;
    w.postMessage=message=>finish(message);
    w.loadQAPresentation=async html=>{const page=new JSDOM(html,{url:'https://presentation.test/',runScripts:'dangerously',virtualConsole:console,beforeParse:prepare});await new Promise(resolve=>page.window.addEventListener('load',resolve));return {document:page.window.document,close:()=>page.window.close()};};
  }});
  dom.window.eval(tests);
  const timeout=setTimeout(()=>finish('FAIL Tests timed out'),10000);
  const report=await done;
  clearTimeout(timeout); dom.window.close();
  process.stdout.write(report+'\n');
  if(errors.length) process.stdout.write('DOM errors: '+errors.join('\n')+'\n');
  if(report.includes('FAIL')||errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
