// Dependency-free SVG explorer. Selection is ephemeral and summaries always use unsampled data.
window.FuelLogAnalysisUI = (function () {
  'use strict';
  var A = FuelLogAnalysis, selection = null;
  var TABS = [['consumption','Consumption'],['price','Price paid'],['monthly','Purchases'],['urban','Urban driving']];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function n(v,d) { return v === null || v === undefined ? '—' : Number(v).toLocaleString(undefined,{maximumFractionDigits:d === undefined ? 2 : d}); }
  function date(t) { return new Date(t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }
  function money(v,c) { return v === null ? 'Unknown' : n(v)+' '+esc(c); }
  function currencies(m) { if(m.currencyList)return m.currencyList;var set={};m.fills.forEach(function(f){set[FuelLogData.currency(f,m.vehicles.filter(function(v){return v.id===f.vehicleId;})[0])]=true;});m.currencyList=Object.keys(set).sort();return m.currencyList; }
  function getSelection(model,key) {
    if (!selection || selection.key !== key) selection={key:key,start:model.min,end:model.max,tab:'consumption',currency:currencies(model)[0]||'EUR',auto:false};
    selection.start=Math.max(model.min,Math.min(model.max,selection.start));selection.end=Math.max(selection.start,Math.min(model.max,selection.end));
    if(currencies(model).indexOf(selection.currency)<0)selection.currency=currencies(model)[0]||'EUR';return selection;
  }
  function tabs(s) { return '<div class="analysis-tabs" role="group" aria-label="Analysis chart">'+TABS.map(function(t){return '<button type="button" data-analysis-tab="'+t[0]+'" aria-pressed="'+(s.tab===t[0])+'">'+t[1]+'</button>';}).join('')+'</div>'; }
  function render(model,key) {
    if (!model.fills.length) return '<div class="card"><h2>Fill analysis</h2><p class="muted">No dated fill-ups yet. Add or import your history to explore it.</p></div>';
    var s=getSelection(model,key),days=Math.max(1,Math.ceil((model.max-model.min)/A.DAY));
    return '<div class="card analysis-explorer" id="analysisExplorer"><h2>Fill analysis</h2><div class="analysis-period"><div class="analysis-date-row"><strong id="analysisDates"></strong><span id="analysisDuration"></span></div><div id="analysisOverview" class="analysis-overview"></div><div class="analysis-sliders"><label for="analysisPosition">Period position<input type="range" id="analysisPosition" min="0" max="100" step="0.1" value="100"></label><label for="analysisLength">Period length<input type="range" id="analysisLength" min="1" max="'+days+'" step="1" value="'+days+'"></label></div><div class="analysis-shortcuts" role="group" aria-label="Period shortcuts">'+[1,3,6,12].map(function(months){return '<button type="button" data-analysis-months="'+months+'">'+months+' month'+(months>1?'s':'')+'</button>';}).join('')+'<button type="button" data-analysis-action="reset">All history</button></div></div><div id="analysisSummary" class="analysis-summary"></div><div id="analysisComparison" class="analysis-comparison"></div>'+tabs(s)+'<div class="analysis-chart-toolbar"><label>Currency <select id="analysisCurrency" aria-label="Chart currency">'+currencies(model).map(function(c){return '<option value="'+esc(c)+'" '+(c===s.currency?'selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select></label><label class="analysis-auto"><input type="checkbox" id="analysisAuto" '+(s.auto?'checked':'')+'> Automatic scale</label><button type="button" class="btn ghost" data-analysis-action="expand">Expand</button></div><div id="analysisChart" class="analysis-chart-target"></div><div id="analysisNotes" class="analysis-notes"></div><details class="analysis-warnings" id="analysisWarnings"><summary>Calculation warnings</summary><div></div></details></div>';
  }
  function prices(model,currency) {
    if(!model.priceCache)model.priceCache={};if(model.priceCache[currency])return model.priceCache[currency];
    model.priceCache[currency]=model.fills.filter(function(f){return FuelLogData.currency(f,model.vehicles.filter(function(v){return v.id===f.vehicleId;})[0])===currency;}).map(function(f){
      var volume=Number(f.litres),validCost=f.totalCost!==null&&f.totalCost!==undefined&&f.totalCost!==''&&isFinite(Number(f.totalCost))&&Number(f.totalCost)>=0,validPrice=f.pricePerLitre!==null&&f.pricePerLitre!==undefined&&f.pricePerLitre!==''&&isFinite(Number(f.pricePerLitre))&&Number(f.pricePerLitre)>=0;
      var y=validCost&&volume>0?Number(f.totalCost)/volume:validPrice&&volume>0?Number(f.pricePerLitre):null;
      return {t:new Date(f.date).getTime(),y:y,fill:f,currency:currency};
    }).filter(function(p){return p.y!==null;});return model.priceCache[currency];
  }
  function chart(model,s) {
    var selected=A.select(model,s.start,s.end),details=[],html='',units='',raw=[],domain=[],trend=[],scatter=false,bars=false;
    if(s.tab==='consumption') {
      units='L/100 km';domain=model.intervals.map(function(x){return x.consumption;});
      raw=selected.intervals.map(function(x){return {t:x.t,y:x.consumption,interval:x};});
      trend=A.sample(A.trend(selected.intervals),160);
    } else if(s.tab==='price') {
      units=s.currency+'/L';var all=prices(model,s.currency);domain=all.map(function(p){return p.y;});raw=all.filter(function(p){return p.t>=s.start&&p.t<=s.end;});
    } else if(s.tab==='urban') {
      units='L/100 km';scatter=true;domain=model.intervals.map(function(x){return x.consumption;});
      raw=selected.scatter.map(function(x){return {t:x.urban*100,y:x.consumption,interval:x};});
    } else {
      var monthly=A.monthly(selected.purchases,s.currency,s.start,s.end,model.vehicles),allMonths=A.monthly(model.fills,s.currency,model.min,model.max,model.vehicles);
      ['cost','litres'].forEach(function(kind){
        var unit=kind==='cost'?s.currency:'L',points=monthly.filter(function(b){return b[kind]!==null;}).map(function(b){return {t:b.t,from:b.from,to:b.to,y:b[kind],label:date(b.from)+' – '+date(b.to),text:n(b[kind])+' '+unit+' · '+b.count+' purchases'+(b.missingCosts?' · '+b.missingCosts+' missing amounts':'')};});
        html+='<h3>'+(kind==='cost'?'Recorded spending':'Purchased litres')+'</h3>'+plot(points,allMonths.map(function(b){return b[kind]===null?0:b[kind];}),unit,true,false,[],s,details);
      });
      html+='<p class="analysis-chart-caption">Both charts show purchases in the selected currency, grouped by calendar month. Long histories combine months into at most 60 date-labelled buckets. Litres purchased are not a measure of fuel consumed.</p>';
      return {html:html+inspection(),details:details};
    }
    html=plot(raw,domain,units,bars,scatter,trend,s,details);
    var caption=s.tab==='consumption'?'Solid: completed intervals. Dashed: distance-weighted trend over up to five intervals.':s.tab==='price'?'Historical prices paid, weighted by litres when derived from purchase amounts.':
      'Urban share versus consumption: association, not proof of cause. '+n(selected.profileCoverage===null?null:selected.profileCoverage*100,0)+'% of completed distance has a known profile; '+selected.scatter.length+' fully profiled intervals shown.';
    return {html:html+'<p class="analysis-chart-caption">'+esc(caption)+'</p>'+inspection(),details:details};
  }
  function inspection() { return '<div class="analysis-inspection" aria-live="polite">Tap the chart to inspect an observation, or focus it and use the arrow keys.</div>'; }
  function plot(raw,domain,units,bars,scatter,trend,s,details) {
    if(!raw.length)return '<div class="analysis-empty">'+(scatter?'No fully profiled consumption intervals in this period.':units==='L/100 km'?'No complete full-to-full intervals inside this period.':'No observations in this period.')+'</div>';
    var points=A.sample(raw,160),basis=s.auto?raw.map(function(p){return p.y;}):domain,min=Infinity,max=-Infinity;
    basis.forEach(function(y){if(isFinite(y)){min=Math.min(min,y);max=Math.max(max,y);}});
    if(!isFinite(min)){min=0;max=1;}
    var lo=bars||units==='L/100 km'?0:Math.max(0,min-(max-min||min||1)*0.2),hi=Math.max(lo+0.1,max*1.1);
    if(s.auto&&!bars){lo=Math.max(0,min-(max-min||min||1)*0.15);hi=Math.max(lo+0.1,max+(max-min||max||1)*0.15);}
    var w=640,h=270,left=54,right=18,top=24,bottom=45,from=scatter?0:s.start,to=scatter?100:s.end;
    function x(t){return to===from?left+(w-left-right)/2:left+(t-from)/(to-from)*(w-left-right);}
    function y(v){return h-bottom-(v-lo)/(hi-lo)*(h-bottom-top);}
    var path='',shapes='',ids=[];
    points.forEach(function(p,i){var px=x(p.t),py=y(p.y),id=details.length;var label=p.label,text=p.text;if(p.interval){var interval=p.interval;label=date(interval.from)+' – '+date(interval.t);text=(scatter?n(interval.urban*100)+'% urban · ':'')+n(interval.consumption)+' L/100 km · '+n(interval.distance,0)+' km · '+n(interval.litres)+' L · '+(interval.warnings.length?interval.warnings.join('; '):scatter?'Complete urban profile':'Completed full-to-full interval');}else if(p.fill){label=date(p.t);text=n(p.y,3)+' '+p.currency+'/L · '+n(p.fill.litres)+' L'+(p.fill.station?' · '+p.fill.station:'');}details.push({x:px,y:py,label:label,text:text});ids.push(id);path+=(i?' L':'M')+px.toFixed(2)+','+py.toFixed(2);
      var color=scatter?'hsl('+(170-p.t*0.9)+', 65%, 38%)':s.tab==='price'||bars&&units!=='L'?'#ce851d':'#0f8c81';
      var barWidth=to===from?(w-left-right)*0.6:Math.max(4,(x(p.to)-x(p.from))*0.85),barX=Math.max(left,Math.min(w-right-barWidth,px-barWidth/2));
      shapes+=bars?'<rect data-analysis-point="'+id+'" x="'+barX+'" y="'+py+'" width="'+barWidth+'" height="'+Math.max(1,h-bottom-py)+'" fill="'+color+'" rx="3"/>':'<circle data-analysis-point="'+id+'" cx="'+px+'" cy="'+py+'" r="'+(scatter?5:3.5)+'" fill="'+color+'"/>';
    });
    var trendPath=trend.map(function(p,i){return (i?'L':'M')+x(p.t).toFixed(2)+','+y(p.y).toFixed(2);}).join(' ');
    var grid='';[0,0.5,1].forEach(function(t){var v=lo+(hi-lo)*t,py=y(v);grid+='<line x1="'+left+'" x2="'+(w-right)+'" y1="'+py+'" y2="'+py+'" class="analysis-gridline"/><text x="'+(left-9)+'" y="'+(py+4)+'" text-anchor="end">'+esc(n(v,units.indexOf('/L')>=0?3:1))+'</text>';});
    var dates=[from,(from+to)/2,to].map(function(t,i){return '<text x="'+x(t)+'" y="'+(h-12)+'" text-anchor="'+(i===0?'start':i===2?'end':'middle')+'">'+esc(scatter?n(t,0)+'%':date(t))+'</text>';}).join('');
    var svg='<svg class="analysis-svg" viewBox="0 0 '+w+' '+h+'" tabindex="0" role="img" aria-label="'+esc(units+' chart. Use arrow keys to inspect observations.')+'" data-analysis-ids="'+ids.join(',')+'"><text x="'+left+'" y="15" class="analysis-unit">'+esc(units)+'</text>'+grid+dates;
    if(!scatter&&!bars&&points.length>1)svg+='<path class="analysis-area" d="'+path+' L'+x(points[points.length-1].t)+','+(h-bottom)+' L'+x(points[0].t)+','+(h-bottom)+' Z"/><path class="analysis-line '+(s.tab==='price'?'analysis-price-line':'')+'" d="'+path+'"/>';
    if(trendPath)svg+='<path class="analysis-trend" d="'+trendPath+'"/>';
    svg+=shapes+'<line class="analysis-crosshair" x1="0" x2="0" y1="'+top+'" y2="'+(h-bottom)+'" visibility="hidden"/></svg>';
    return svg+(raw.length>points.length?'<p class="analysis-chart-caption">Showing '+points.length+' representative observations of '+raw.length+'; summaries use all records.</p>':'');
  }
  function summaryHtml(selected) {
    var m=selected.summary,spend=[],paid=[];
    Object.keys(m.money).forEach(function(c){var v=m.money[c];spend.push(money(v.cost,c)+(v.missingCosts?' <small>('+v.missingCosts+' missing)</small>':''));paid.push(v.price===null?'Unknown '+esc(c):n(v.price,3)+' '+esc(c)+'/L');});
    return [['Weighted consumption',n(m.consumption)+' <small>L/100 km</small>'],['Completed distance',n(m.distance,0)+' <small>km</small>'],['Purchased litres',n(m.litres)+' <small>L</small>'],['Recorded spending',spend.join('<br>')||'—'],['Weighted price paid',paid.join('<br>')||'—'],['Completed intervals',n(m.count,0)]].map(function(v){return '<div><span>'+v[0]+'</span><strong>'+v[1]+'</strong></div>';}).join('');
  }
  function comparison(model,s,current) {
    var duration=s.end-s.start+1,previous=A.select(model,s.start-duration,s.start-1);
    if(!previous.purchases.length&&!previous.intervals.length)return 'Previous equal-duration period: no recorded data for comparison.';
    function change(label,value,old,unit) { if(value===null||old===null||old===0)return label+': insufficient data';var pct=(value-old)/old*100;return label+': '+(pct>0?'+':'')+n(pct,1)+'%'+(unit?' ('+unit+')':''); }
    var items=[change('Consumption',current.summary.consumption,previous.summary.consumption),change('Purchased litres',current.summary.litres,previous.summary.litres)];
    Object.keys(current.summary.money).forEach(function(c){var old=previous.summary.money[c];if(old)items.push(change('Spending '+c,current.summary.money[c].cost,old.cost));});
    return '<strong>Compared with '+esc(date(s.start-duration)+' – '+date(s.start-1))+'</strong><br>'+items.map(esc).join(' · ');
  }
  function overview(model,s) {
    var values=A.sample(model.intervals.map(function(x){return {t:x.t,y:x.consumption};}),100),max=1;
    values.forEach(function(x){max=Math.max(max,x.y);});var span=model.max-model.min||1;
    var path=values.map(function(p,i){return (i?'L':'M')+(2+(p.t-model.min)/span*636).toFixed(1)+','+(42-p.y/max*32).toFixed(1);}).join(' ');
    var x=2+(s.start-model.min)/span*636,width=model.max===model.min?636:Math.max(2,(s.end-s.start)/span*636);
    return '<svg viewBox="0 0 640 48" role="img" aria-label="Selected window within full history"><rect width="640" height="48" rx="6" fill="#eef5f3"/><path d="'+path+'" fill="none" stroke="#9dbfb7" stroke-width="2"/><rect x="'+x+'" y="2" width="'+width+'" height="44" rx="4" fill="rgba(15,140,129,0.12)" stroke="#0f8c81" stroke-width="2"/></svg>';
  }
  function mount(root,model,key) {
    if(!root)return;var s=getSelection(model,key),overlay=null,frame=null,expandedFocus=null,bodyOverflow='',shellHidden=null;
    var position=root.querySelector('#analysisPosition'),length=root.querySelector('#analysisLength');
    function update(animate) {
      if(!document.body.contains(root)){close();return;}
      var selected=A.select(model,s.start,s.end),days=Math.max(1,Math.ceil((s.end-s.start)/A.DAY));
      var span=model.max-model.min,duration=s.end-s.start;
      length.value=days;position.value=span>duration?(s.start-model.min)/(span-duration)*100:100;position.disabled=span<=duration;length.disabled=span===0;
      root.querySelector('#analysisDates').textContent=date(s.start)+' – '+date(s.end);
      root.querySelector('#analysisDuration').textContent=s.start===model.min&&s.end===model.max?'All history':days+' days';
      position.setAttribute('aria-valuetext',date(s.start)+' to '+date(s.end));length.setAttribute('aria-valuetext',days+' days');
      root.querySelector('#analysisOverview').innerHTML=overview(model,s);root.querySelector('#analysisSummary').innerHTML=summaryHtml(selected);root.querySelector('#analysisComparison').innerHTML=comparison(model,s,selected);
      var notes=selected.intervals.length+' completed intervals · '+selected.purchases.length+' purchases. '+(selected.crossing?selected.crossing+' boundary-crossing intervals excluded from consumption. ':'')+'Purchases and consumed fuel cover different records.';
      if(model.invalidDates)notes+=' '+model.invalidDates+' undated/invalid-date records omitted.';
      var warningCount=selected.intervals.filter(function(x){return x.warnings.length;}).length;
      if(warningCount)notes+=' '+warningCount+' unusual intervals retained; inspect their warnings.';
      if(model.warnings.length)notes+=' History has '+model.warnings.length+' calculation warnings.';
      root.querySelector('#analysisNotes').textContent=notes;
      var warningPanel=root.querySelector('#analysisWarnings');warningPanel.style.display=model.warnings.length?'':'none';warningPanel.querySelector('div').innerHTML='<p>Warnings from the full history. Invalid-distance intervals are excluded; unusual consumption remains visible. Records are unchanged.</p>'+model.warnings.slice(0,8).map(function(w){return '<p>'+esc(w)+'</p>';}).join('')+(model.warnings.length>8?'<p>'+ (model.warnings.length-8)+' further warnings in history.</p>':'');
      root.querySelector('#analysisCurrency').parentNode.style.display=s.tab==='price'||s.tab==='monthly'?'':'none';
      var result=chart(model,s);
      [root,overlay].forEach(function(host){if(!host)return;Array.from(host.querySelectorAll('[data-analysis-tab]')).forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-analysis-tab')===s.tab?'true':'false');});
        var target=host.querySelector('.analysis-chart-target');target.classList.remove('analysis-reveal');target.innerHTML=result.html;if(animate){void target.offsetWidth;target.classList.add('analysis-reveal');}inspect(target,result.details);
        var dates=host.querySelector('.analysis-expanded-dates');if(dates)dates.textContent=date(s.start)+' – '+date(s.end);
      });
    }
    function schedule() {if(frame!==null)return;frame=requestAnimationFrame(function(){frame=null;update(false);});}
    position.oninput=function(){var duration=s.end-s.start,span=model.max-model.min;s.start=model.min+(span-duration)*Number(position.value)/100;s.end=s.start+duration;schedule();};
    length.oninput=function(){var duration=Math.min(model.max-model.min,Number(length.value)*A.DAY);s.end=Math.min(model.max,Math.max(s.end,model.min+duration));s.start=s.end-duration;schedule();};
    root.querySelector('#analysisCurrency').onchange=function(e){s.currency=e.target.value;update(true);};root.querySelector('#analysisAuto').onchange=function(e){s.auto=e.target.checked;update(true);};
    function zoom(factor) {var span=model.max-model.min;if(!span)return;var duration=Math.min(span,Math.max(Math.min(A.DAY,span),(s.end-s.start)*factor)),center=(s.start+s.end)/2;s.start=Math.max(model.min,Math.min(model.max-duration,center-duration/2));s.end=s.start+duration;update(true);}
    function bind(host) {
      Array.from(host.querySelectorAll('[data-analysis-tab]')).forEach(function(b){b.onclick=function(){s.tab=b.getAttribute('data-analysis-tab');update(true);};});
      Array.from(host.querySelectorAll('[data-analysis-action]')).forEach(function(b){b.onclick=function(){var action=b.getAttribute('data-analysis-action');if(action==='reset'){s.start=model.min;s.end=model.max;update(true);}else if(action==='expand')expand(b);else if(action==='close')close();else zoom(action==='in'?0.5:2);};});
      Array.from(host.querySelectorAll('[data-analysis-months]')).forEach(function(b){b.onclick=function(){var months=Number(b.getAttribute('data-analysis-months')),end=new Date(s.end),day=end.getDate();end.setDate(1);end.setMonth(end.getMonth()-months);end.setDate(Math.min(day,new Date(end.getFullYear(),end.getMonth()+1,0).getDate()));s.start=Math.max(model.min,end.getTime());update(true);};});
    }
    function trap(e) {
      if(!overlay)return;
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key!=='Tab')return;var focusable=Array.from(overlay.querySelectorAll('button,select,input,[tabindex="0"]')).filter(function(el){return !el.disabled;});var first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus();}
    }
    function expand(button) {
      if(overlay)return;expandedFocus=button;overlay=document.createElement('div');overlay.className='analysis-overlay';overlay.innerHTML='<div class="analysis-dialog" role="dialog" aria-modal="true" aria-labelledby="analysisExpandedTitle"><div class="analysis-expanded-header"><h2 id="analysisExpandedTitle">Fill analysis</h2><button type="button" class="btn ghost" data-analysis-action="close">Close</button></div><p class="analysis-expanded-dates"></p>'+tabs(s)+'<div class="analysis-zoom" role="group" aria-label="Chart zoom"><button type="button" data-analysis-action="in" aria-label="Zoom in">+</button><button type="button" data-analysis-action="out" aria-label="Zoom out">−</button><button type="button" data-analysis-action="reset">Reset</button><span>Zoom updates the selected period</span></div><div class="analysis-chart-target"></div></div>';
      document.body.appendChild(overlay);bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';var shell=document.querySelector('.app-shell');if(shell){shellHidden=shell.getAttribute('aria-hidden');shell.setAttribute('aria-hidden','true');}
      document.addEventListener('keydown',trap);overlay.onclick=function(e){if(e.target===overlay)close();};bind(overlay);update(false);overlay.querySelector('[data-analysis-action="close"]').focus();
    }
    function close() {
      if(!overlay)return;document.removeEventListener('keydown',trap);overlay.parentNode.removeChild(overlay);overlay=null;document.body.style.overflow=bodyOverflow;var shell=document.querySelector('.app-shell');if(shell){if(shellHidden===null)shell.removeAttribute('aria-hidden');else shell.setAttribute('aria-hidden',shellHidden);}if(expandedFocus&&document.body.contains(expandedFocus))expandedFocus.focus();
    }
    bind(root);update(false);
    // Preserve default empty-state chart, but animate the first rendered observations gently.
    root.querySelector('.analysis-chart-target').classList.add('analysis-reveal');
  }
  function inspect(target,details) {
    Array.from(target.querySelectorAll('svg')).forEach(function(svg){var ids=svg.getAttribute('data-analysis-ids').split(',').map(Number),selected=-1;
      function show(id){var p=details[id];if(!p)return;selected=ids.indexOf(id);target.querySelector('.analysis-inspection').textContent=p.label+' · '+p.text;Array.from(target.querySelectorAll('[data-analysis-point]')).forEach(function(el){el.classList.toggle('analysis-selected',Number(el.getAttribute('data-analysis-point'))===id);});var line=svg.querySelector('.analysis-crosshair');line.setAttribute('x1',p.x);line.setAttribute('x2',p.x);line.setAttribute('visibility','visible');}
      svg.onclick=function(e){var box=svg.getBoundingClientRect(),px=(e.clientX-box.left)/box.width*640,py=(e.clientY-box.top)/box.height*270,best=ids[0],score=Infinity;ids.forEach(function(id){var p=details[id],d=Math.pow(p.x-px,2)+Math.pow(p.y-py,2);if(d<score){score=d;best=id;}});show(best);};
      svg.onkeydown=function(e){if(['ArrowLeft','ArrowRight','Home','End'].indexOf(e.key)<0)return;e.preventDefault();if(e.key==='Home')selected=0;else if(e.key==='End')selected=ids.length-1;else selected=Math.max(0,Math.min(ids.length-1,selected+(e.key==='ArrowLeft'?-1:1)));show(ids[selected]);};
    });
  }
  return {render:render,mount:mount,chart:chart};
})();
