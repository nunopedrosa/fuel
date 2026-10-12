// Small offline catalogue registry. Keys and locale selection never change stored log data.
window.FuelLogI18n = (function () {
  'use strict';
  var catalogues = Object.create(null), languages = [], selected = 'en', diagnostics = null;
  function register(code, info, messages) {
    if (!catalogues[code]) languages.push({code:code,name:info.name,locale:info.locale,flag:info.flag});
    catalogues[code] = messages;
    diagnostics = null;
  }
  function use(code) { selected = Object.prototype.hasOwnProperty.call(catalogues,code) ? code : 'en'; return selected; }
  // Only an explicit app choice is saved; device preferences remain a default.
  function resolve(saved, preferences) {
    if (saved) return Object.prototype.hasOwnProperty.call(catalogues,saved) ? saved : 'en';
    var preferred = Array.isArray(preferences) ? preferences : [];
    for (var i = 0; i < preferred.length; i++) {
      if (typeof preferred[i] !== 'string') continue;
      var tag = preferred[i].trim().toLowerCase().replace(/_/g,'-'), base = tag.split('-')[0], j;
      for (j = 0; j < languages.length; j++) if (languages[j].code.toLowerCase() === tag || languages[j].locale.toLowerCase() === tag) return languages[j].code;
      for (j = 0; j < languages.length; j++) if (languages[j].code.toLowerCase() === base) return languages[j].code;
    }
    return 'en';
  }
  function current() { return selected; }
  function list() { return languages.slice(); }
  function locale() { var item=languages.filter(function(x){return x.code===selected;})[0];return item?item.locale:'en-GB'; }
  function messages(code) { return catalogues[code] || {}; }
  function t(key, values) {
    var local=catalogues[selected]||{},english=catalogues.en||{},text=Object.prototype.hasOwnProperty.call(local,key)?local[key]:Object.prototype.hasOwnProperty.call(english,key)?english[key]:key;
    return String(text).replace(/\{([A-Za-z0-9_]+)\}/g,function(token,name){return values&&values[name]!==undefined?String(values[name]):token;});
  }
  // Only for internal diagnostics, never for vehicle/station names, notes or imported text.
  function message(text) {
    text=String(text==null?'':text);
    if(selected==='en')return text;
    if(!diagnostics){
      diagnostics={exact:Object.create(null),patterns:[]};
      Object.keys(catalogues.en||{}).forEach(function(key){
        var value=catalogues.en[key],names=[];
        if(!/\{[A-Za-z0-9_]+\}/.test(value)){diagnostics.exact[value]=key;return;}
        var pattern=value.split(/(\{[A-Za-z0-9_]+\})/).map(function(part){if(/^\{/.test(part)){names.push(part.slice(1,-1));return '(.+?)';}return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('');
        diagnostics.patterns.push({key:key,names:names,re:new RegExp('^'+pattern+'$')});
      });
    }
    var key=diagnostics.exact[text];if(key)return t(key);
    for(var i=0;i<diagnostics.patterns.length;i++){var item=diagnostics.patterns[i],match=text.match(item.re);if(match){var values={};item.names.forEach(function(name,j){values[name]=match[j+1];});return t(item.key,values);}}
    return text;
  }
  return {register:register,use:use,resolve:resolve,current:current,list:list,locale:locale,t:t,messages:messages,message:message};
})();
// Shared browser helpers, also used by the deferred chart and receipt modules.
function tr(key, values) { return window.FuelLogI18n.t(key, values); }
function uiLocale() { return window.FuelLogI18n.locale(); }
