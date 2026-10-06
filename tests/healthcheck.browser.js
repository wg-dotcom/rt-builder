(async function builderHealthcheck() {
  const results = [];
  function check(name, fn) {
    try { fn(); results.push('PASS ' + name); }
    catch (e) { results.push('FAIL ' + name + ': ' + e.message); }
  }
  const assert = (value, why) => { if (!value) throw new Error(why || 'Assertion failed'); };
  const parse = html => new DOMParser().parseFromString(html, 'text/html');
  const row = name => ({ name, salary:'2500', location:'Test location', experience:'5 years', skills:'Excel, SQL',
    resumeLink:'https://example.invalid/cv.pdf', videoLink:'https://drive.google.com/file/d/synthetic_video_id/view',
    recruiterNote:name.split(' ')[0] + ' reconciles financial records and builds monthly reports.',
    resumeData:{fullExtract:true,summary:'Financial operations experience.',experience:[{role:'Analyst',company:'Example',industry:'Finance',dates:'2020–2025',description:'Reconciled records.\nPrepared reports.'}],education:[],certifications:[],languages:[]} });
  const set = (id, value) => { document.getElementById(id).value = value; };
  set('clientName','QA Member'); set('roleTitle','QA Analyst'); set('batchNumber','1'); set('batchDate','2026-10-06'); set('advisor','katherine');
  candidates = [row('Alex Test'),row('Blair Test')];
  const original = buildPresentationHTML();
  const v = {...getFormValues(),batchNumber:'2'};
  const added = [row('Casey Test'),row('Drew Test')];
  let merged;
  check('New page structure, CVs, inline videos, comparison and advisor', () => assert(!validatePresentationStructure(original,getFormValues(),candidates).length,validatePresentationStructure(original,getFormValues(),candidates).join('; ')));
  check('Batch filter excludes 10 and 11 when requesting 1', () => assert(matchesBatchFilter('Batch 1','1','') && !matchesBatchFilter('10','1','') && !matchesBatchFilter('11','1','') && !matchesBatchFilter('','1','Example Batch 10')));
  check('Batch filter supports padded numbers and company fallback', () => assert(matchesBatchFilter('01','1','') && matchesBatchFilter('','2','Example Batch 2')));
  check('Salary formatting preserves decimals, shorthand and hourly units',()=>assert(fmtSalary('$2.5k')==='$2.5k'&&fmtSalary('$18/hour')==='$18/hour'&&fmtSalary('2500.50')==='2500.50'&&fmtSalary('2500')==='$2,500/mo'));
  check('Exact live verification rejects same-length middle edits', () => assert(!publishedHTMLMatches('x'.repeat(600)+'OLD'+'y'.repeat(600),'x'.repeat(600)+'NEW'+'y'.repeat(600))));
  check('Core workflow does not silently replace Kathe', () => { set('workflow','core'); applyWorkflowPreset(); assert(document.getElementById('advisor').value==='katherine'); });
  check('Canonical merge keeps old candidates and adds batch 2', () => { merged=mergeBatchIntoExisting(original,added,v); const d=parse(merged); assert(d.querySelectorAll('.batch-panel').length===2); assert(presentationCards(d.getElementById('batch-1')).length===2); assert(!validatePresentationStructure(merged,v,added).length,validatePresentationStructure(merged,v,added).join('; ')); });
  check('Latest batch is the only visible batch', () => { const d=parse(merged); assert(d.querySelectorAll('[data-builder-batch-hidden="false"]').length===1); assert(d.getElementById('batch-2').dataset.builderBatchHidden==='false'); });
  check('Selected advisor replaces previous advisor and contact', () => { const old=parse(original); old.querySelector('.advisor-name').textContent='Previous Advisor'; old.querySelector('.footer-contact').href='mailto:previous@example.invalid'; const d=parse(mergeBatchIntoExisting(old.documentElement.outerHTML,added,v)); assert(d.querySelector('.advisor-name').textContent==='Kathe'); assert(d.querySelector('.footer-contact').getAttribute('href')==='mailto:katherine.r@getsagan.com'); });
  check('Replacing batch 2 after adding 3 keeps order, counts and unique IDs', () => { const three=mergeBatchIntoExisting(merged,[row('Elliot Test')],{...v,batchNumber:'3'}); const replaced=mergeBatchIntoExisting(three,[row('Finley Test')],v); const d=parse(replaced); assert(Array.from(d.querySelectorAll('.batch-panel')).map(x=>x.id).join(',')==='batch-1,batch-2,batch-3'); assert(presentationCards(d).length===4); assert(!validatePresentationStructure(replaced,v,[row('Finley Test')]).length,validatePresentationStructure(replaced,v,[row('Finley Test')]).join('; ')); assert(d.getElementById('batch-3').dataset.builderBatchHidden==='false'); });
  check('Repeated deployment replaces a batch instead of duplicating it', () => { const d=parse(mergeBatchIntoExisting(merged,added,v)); assert(d.querySelectorAll('.batch-panel').length===2); assert(presentationCards(d).length===4); });
  for (const family of ['book','legacy']) {
    check(family+' adaptation preserves embedded CV, video and one intro', () => {
      const d=parse(original);
      d.querySelectorAll('.score-box').forEach(el=>{el.outerHTML='<div class="card-rate-amount">$2,500</div>';});
      d.querySelector('.card-body').insertAdjacentHTML('beforeend',family==='book'?'<div class="strength-bars"></div>':'<div class="strength-grid"></div>');
      const out=mergeBatchIntoExisting(d.documentElement.outerHTML,added,v);
      const result=parse(out);
      assert(!validatePresentationStructure(out,v,added).length,validatePresentationStructure(out,v,added).join('; '));
      assert(result.querySelectorAll('#batch-2 .card-narrative').length===2);
      assert(!result.querySelector('#batch-2 .recruiter-note, #batch-2 .card-recruiter-note'));
    });
  }
  check('Native tabs preserve prior batches and select latest', () => {
    const d=parse(original); const nav=d.getElementById('batch-switcher'); nav.className='batch-tabs'; nav.removeAttribute('id');
    const b=nav.querySelector('button'); b.className='batch-tab active'; b.removeAttribute('data-batch'); b.setAttribute('onclick',"switchBatch('batch-1', this)");
    const s=d.createElement('script'); s.textContent='function switchBatch(id,btn){}'; d.body.appendChild(s);
    const out=mergeBatchIntoExisting(d.documentElement.outerHTML,added,v);
    assert(!validatePresentationStructure(out,v,added).length,validatePresentationStructure(out,v,added).join('; '));
    assert(parse(out).querySelectorAll('.batch-tabs .batch-tab').length===2);
  });
  check('Edited preview does not create duplicate candidate IDs', () => {
    candidates=added; set('batchNumber','2'); const edited=buildPresentationHTML();
    const out=applyPreviewEditsToMergedPage(merged,edited,2,added,v);
    assert(!validatePresentationStructure(out,v,added).length,validatePresentationStructure(out,v,added).join('; '));
  });
  check('Unreadable CV is a hard publish stop',()=>{const bad=structuredClone(added);bad[0].resumeData._sourceWarning='Access denied';assert(validatePresentationStructure(merged,v,bad).some(x=>x.includes('could not be read')));});
  check('A missing comparison table is a hard publish stop',()=>{const d=parse(merged);d.querySelector('#batch-2 .comparison-table').remove();assert(validatePresentationStructure(d.documentElement.outerHTML,v,added).some(x=>x.includes('comparison table')));});
  check('Preview context changes when a candidate is removed',()=>assert(presentationContext(v,added)!==presentationContext(v,added.slice(0,1))));
  for(const fixture of (window.QA_FIXTURES||[])) {
    check('Existing page merge: '+fixture.name,()=>{
      const next=nextBatchNumberFromHTML(fixture.html);
      const fv={...v,batchNumber:String(next)};
      const out=mergeBatchIntoExisting(fixture.html,added,fv);
      const issues=validatePresentationStructure(out,fv,added);
      assert(!issues.length,issues.join('; '));
      assert(presentationCards(parse(out)).length===presentationCards(parse(fixture.html)).length+added.length);
    });
  }
  // Exercise generated navigation, not just serialized classes.
  try {
    const loaded=await loadQAPresentation(merged);
    check('Rendered batch buttons switch both ways',()=>{const d=loaded.document;d.querySelector('[data-batch="1"]').click();assert(d.getElementById('batch-1').dataset.builderBatchHidden==='false');d.querySelector('[data-batch="2"]').click();assert(d.getElementById('batch-2').dataset.builderBatchHidden==='false');});
    loaded.close();
  } catch(e){results.push('FAIL Rendered navigation: '+e.message);}
  // Mock the publisher, never use credentials or create real repositories.
  try {
    let calls=0, releaseLive;
    const liveWait=new Promise(resolve=>{releaseLive=resolve;});
    commitPreviewEdits=()=>{}; assertBuilderFresh=async()=>{}; getPublisherKey=()=> 'synthetic-test-only';
    previewHasEdits=false; candidates=added; set('batchNumber','2');
    window.confirm=()=>true;
    publisherRequest=async (endpoint)=>{
      if(endpoint==='/state')return {repoExists:true,fileExists:true,sha:'test-sha',html:original};
      if(endpoint==='/deploy'){calls++;return {liveUrl:'https://example.invalid/test/'};}
      throw new Error('Unexpected mock request');
    };
    watchDeployGoLive=()=>liveWait;
    const first=autoDeploy();
    for(let i=0;i<20&&calls===0;i++)await Promise.resolve();
    check('Deploy stays locked until live verification',()=>assert(calls===1&&deployInProgress&&document.getElementById('deployBtn').disabled));
    await autoDeploy();
    check('Double-click cannot publish a second commit',()=>assert(calls===1));
    releaseLive(true);await first;
    check('Verified deploy unlocks the button',()=>assert(!deployInProgress&&!document.getElementById('deployBtn').disabled));
    candidates=[row('Bad CV')];candidates[0].resumeData._sourceWarning='Denied';
    generateResumeData=async()=>{};
    await autoDeploy();
    check('Unreadable CV never reaches the publisher',()=>assert(calls===1));
  }catch(e){results.push('FAIL Mock deploy flow: '+e.message);}
  parent.postMessage(results.join('\n')+'\n\n'+results.filter(x=>x.startsWith('PASS')).length+'/'+results.length+' passed','*');
})();
