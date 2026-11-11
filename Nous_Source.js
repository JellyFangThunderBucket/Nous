/* Nous 1.4 — The refinement release. Follow the thread. Standalone, local resource inspector. */
(() => {
  'use strict';
  const ID = 'nous-bookmarklet';
  const existing = document.getElementById(ID);
  if (existing) { existing.dispatchEvent(new Event('nous:close')); return; }
  const legacy = document.getElementById('resource-radar-bookmarklet');
  if (legacy) legacy.remove();
  const previousFocus = document.activeElement;
  const host = document.createElement('div');
  host.id = ID;
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;display:block!important;isolation:isolate!important;';
  const root = host.attachShadow({mode:'open'});
  const icons = {
    settings:'<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1a8 8 0 0 1 13.2 3M17.9 17.9a8 8 0 0 1-13.2-3"/>',
    copy:'<rect x="8" y="8" width="12" height="12" rx="3"/><path d="M15 4H7a3 3 0 0 0-3 3v8"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    minimize:'<path d="M6 12h12"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    restore:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>',
    external:'<path d="M14 3h7v7m0-7L10 14M10 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-4"/>',
    arrow:'<path d="m9 5 7 7-7 7"/>',
    back:'<path d="m15 5-7 7 7 7"/>',
    link:'<path d="m10 14 4-4m-6 6-2 2a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m2 0 2-2a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0" transform="translate(2 0)"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 16-5-5-8 10M3 16l4-4 4 4"/>',
    video:'<rect x="3" y="4" width="18" height="16" rx="5"/><path d="m10 8 6 4-6 4Z"/>',
    audio:'<path d="M9 17V5l11-2v12M9 8l11-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="3"/>',
    code:'<path d="m7 6-5 6 5 6m10-12 5 6-5 6m-4-15-3 18"/>',
    style:'<path d="M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
    frame:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 9h18M8 9v12"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    network:'<circle cx="12" cy="4" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 6v5m-7 6v-6h14v6"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    thread:'<path d="M4 18V7a3 3 0 0 1 5.3-1.9l6.4 13.8A3 3 0 0 0 21 17V6"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
  };
  const icon = (name, cls='') => '<svg class="icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.link)+'</svg>';
  const mark = '<svg viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M9 26V11a3 3 0 0 1 5.5-1.7l7 17.4A3 3 0 0 0 27 25V10" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><circle cx="27" cy="6" r="2" fill="currentColor"/></svg>';
  root.innerHTML = `<style>
    :host{all:initial;color-scheme:light}
    *,*::before,*::after{box-sizing:border-box}
    button,input,a{-webkit-tap-highlight-color:transparent}
    button,input{font:inherit}
    button{border:0;cursor:pointer;touch-action:manipulation}
    button:disabled{opacity:.4;cursor:default}
    button:focus-visible,a:focus-visible,[tabindex]:focus-visible{outline:2px solid #25846c;outline-offset:-3px}
    button:active:not(:disabled){background:#d5ebe3}
    button svg{pointer-events:none}
    [hidden]{display:none!important}
    .icon{display:block;width:18px;height:18px;flex:none}
    .dock{--mint:#85e2ce;--text:#253f37;--muted:#63786f;--line:#cddbd5;position:absolute;inset:0;pointer-events:none;font:13px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;letter-spacing:0;color:var(--text);text-align:left;-webkit-font-smoothing:antialiased}
    .sheet,.preview{position:absolute;pointer-events:auto;left:50%;transform:translateX(-50%);width:min(100%,900px);display:flex;flex-direction:column;min-height:0;overflow:hidden;background:#f0f5f2;border:1px solid #b8cdc3;border-bottom:0;border-radius:12px 12px 0 0;box-shadow:none;color:var(--text)}
    .sheet{bottom:0}
    .preview{bottom:0;z-index:2;background:#edf4ef;border-top-color:#9fbfaf}
    .grab{height:14px;display:flex;align-items:center;justify-content:center;flex:none;touch-action:none;cursor:ns-resize;background:#e5efea}
    .grab::before{content:'';height:3px;width:38px;border-radius:3px;background:#91ada0}
    .bar{display:flex;align-items:center;gap:8px;min-height:39px;padding:0 5px 4px 10px;flex:none;background:#e5efea;border-bottom:1px solid var(--line)}
    .brandmark{display:grid;place-items:center;width:27px;height:27px;flex:none;background:var(--mint);border-radius:8px;color:#16352f}
    .brandmark svg{width:23px;height:23px}
    .brandblock{display:flex;align-items:baseline;gap:7px;flex:1;min-width:0}
    .wordmark{font-size:20px;font-weight:750;line-height:1;letter-spacing:-.9px}
    .brandtag{font-size:10px;color:#637c70;white-space:nowrap}
    .windowtools{display:flex;gap:1px;flex:none}
    .iconbutton{display:grid;place-items:center;width:38px;height:34px;flex:none;border-radius:4px;background:transparent;color:#587165}
    .iconbutton:hover{background:#d8e7df}
    .iconbutton .icon{width:17px;height:17px}
    #close:hover,#previewclose:hover{background:#f2dfdc;color:#8e4f49}
    .pagecontext{display:flex;align-items:center;gap:6px;min-height:27px;padding:4px 11px;background:#f6f9f7;border-bottom:1px solid #dbe4df;color:#637b6f;font-size:10px;flex:none;min-width:0}
    .pagecontext .dot{width:4px;height:4px;background:#31896f;border-radius:50%;flex:none}
    #site{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
    .totalpill{font-size:10px;color:#436e5b;white-space:nowrap;font-variant-numeric:tabular-nums}
    .tools{display:flex;align-items:stretch;flex:none;min-height:36px;background:#edf3ef;border-bottom:1px solid var(--line)}
    .tool{display:flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:0 12px;border:0;border-right:1px solid #d5e1da;background:transparent;border-radius:0;color:#3d6351;font-size:11px;font-weight:550;white-space:nowrap}
    .tool .icon{width:14px;height:14px}
    .tool:hover{background:#dcece2}
    .tabs{display:flex;gap:0;overflow:auto;flex:none;scrollbar-width:none;overscroll-behavior:contain;background:#e7efea;border-bottom:1px solid #bfcec5;min-height:38px;padding:0}
    .tabs::-webkit-scrollbar{display:none}
    .tab{display:flex;align-items:center;justify-content:center;gap:5px;min-height:37px;padding:0 11px;white-space:nowrap;border-radius:0;border:0;border-right:1px solid #d6e0d9;border-bottom:2px solid transparent;color:#60786b;background:transparent;font-size:11px;font-weight:500;flex:none}
    .tab.active{background:#f8fcfa;color:#226c55;border-bottom-color:#329a7a;font-weight:650}
    .tab .num{font-size:9px;font-weight:500;color:#788c80;font-variant-numeric:tabular-nums}
    .tab.active .num{color:#3b8067}
    .tab .icon{height:12px;width:12px}
    .searchline{display:flex;align-items:center;gap:0;padding:6px 9px;flex:none;background:#f7faf8;border-bottom:1px solid #d9e3dc}
    .searchbox{position:relative;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #bfcec5;border-radius:5px;padding:0 9px;min-width:0;flex:1;height:34px;color:#7b9185}
    .searchbox:focus-within{border-color:#479d7c}
    .searchbox .icon{width:15px;height:15px}
    #find{color:#2c4b3c;background:transparent;border:0;outline:none;appearance:none;-webkit-appearance:none;font-size:16px;min-width:0;width:100%;height:100%;padding:0;letter-spacing:-.2px}
    #find::placeholder{color:#7f9487}
    .listhead{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;padding:4px 10px;flex:none;background:#edf3ef;border-bottom:1px solid #dce5df;color:#658073;font-size:9px;font-weight:550;letter-spacing:.25px}
    #hint{font-size:9px;letter-spacing:0;font-weight:400;color:#82968a}
    .items{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0;background:#fff}
    .item{display:flex;align-items:center;gap:0;min-width:0;background:#fff;border:0;border-bottom:1px solid #e0e8e2;border-radius:0;margin:0}
    .item:nth-child(even){background:#f7faf8}
    .item.selected{background:#e1f2e9;border-left:2px solid #42a17e}
    .item:hover{background:#edf6f0}
    .resource{display:flex;align-items:center;gap:8px;flex:1;min-width:0;text-align:left;background:transparent;color:inherit;padding:8px 0 8px 10px;border-radius:0}
    .avatar{display:grid;place-items:center;flex:none;width:21px;height:26px;border-radius:0;color:var(--row-color,#436e99);background:transparent;align-self:flex-start;margin-top:4px}
    .avatar .icon{width:16px;height:16px}
    .itemmain{min-width:0;flex:1}
    .eyebrow{display:flex;align-items:center;gap:5px;color:#7c9083;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px}
    .eyebrow .type{color:var(--row-color,#436e99);font-weight:550}
    .eyebrow .sep{width:2px;height:2px;border-radius:50%;background:#97aa9b;flex:none}
    .label{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;font-size:12px;font-weight:600;color:#2a4a3b;line-height:1.3}
    .val{font-size:10px;color:#587c69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;line-height:1.35}
    .copyitem{display:grid;place-items:center;width:42px;min-height:53px;align-self:stretch;flex:none;background:transparent;color:#7b9385;border-radius:0}
    .copyitem .icon{width:14px;height:14px}
    .copyitem:hover{color:#257357;background:#dceee1}
    .empty{padding:24px 16px;text-align:center;color:#708777}
    .empty .avatar{margin:0 auto 9px;width:30px;height:30px}
    .empty strong{display:block;color:#365442;font-size:13px;margin-bottom:5px}
    .empty p{margin:0;line-height:1.6;font-size:11px}
    .more{display:block;min-height:36px;padding:8px 16px;margin:9px auto;background:#edf5ef;border:1px solid #c7dace;color:#3e7256;border-radius:4px;font-size:11px}
    .foot{flex:none;border-top:1px solid #c7d6cc;background:#e7efea;padding:5px 10px calc(5px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:25px}
    .sheet.split .foot{padding-bottom:5px}
    .state{display:flex;align-items:center;gap:6px;flex:1;min-width:0}
    .miniicon{display:grid;place-items:center;color:#49806a;flex:none}
    .miniicon .icon{width:13px;height:13px}
    .statecaption{font-size:9px;color:#5c7b68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .footbrand{font-size:9px;color:#748e7d;white-space:nowrap}
    .toast{position:absolute;bottom:calc(35px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);max-width:calc(100% - 24px);padding:8px 12px;border:1px solid #a1c4af;border-radius:5px;background:#e3f4e9;color:#2c674b;font-size:11px;font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:4}
    .sheet.minimized{width:min(100%,900px);border-radius:10px 10px 0 0;bottom:0!important}
    .sheet.minimized .bar{height:49px;min-height:49px;padding:6px 5px 6px 10px;border-bottom:0}
    .sheet.minimized>.grab,.sheet.minimized>.pagecontext,.sheet.minimized>.tools,.sheet.minimized>.tabs,.sheet.minimized>.searchline,.sheet.minimized>.listhead,.sheet.minimized>.items,.sheet.minimized>.foot{display:none}
    .peekbar{display:flex;align-items:center;gap:7px;min-height:38px;padding:0 5px 4px 10px;flex:none;background:#e5efea;border-bottom:1px solid #cfddd3}
    .peekmark{display:grid;place-items:center;width:22px;height:26px;color:#3d8769;flex:none}
    .peekmark .icon{width:17px;height:17px}
    .peektitle{flex:1;min-width:0}
    .peektitle strong{display:block;font-size:12px;font-weight:650;color:#2d5941}
    .peektitle small{display:block;font-size:9px;color:#708a77;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .peekbar .iconbutton{width:34px;height:32px}
    .actionpill{display:flex;align-items:center;justify-content:center;gap:5px;min-height:31px;padding:0 9px;border:1px solid #b8cfc0;border-radius:4px;background:#f7fbf8;color:#386c4c;font-size:10px;font-weight:600}
    .actionpill .icon{width:12px;height:12px}
    .previewaddress{display:flex;align-items:center;gap:6px;margin:0;padding:5px 10px;background:#f5f9f6;border-bottom:1px solid #d1dfd5;min-height:27px;flex:none}
    .previewaddress>.icon{width:12px;height:12px;color:#66917a}
    .previewaddress span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px;color:#658572}
    .previewcanvas{position:relative;flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;background:#fff}
    .previewcanvas iframe{display:block;width:100%;height:100%;border:0;background:white}
    .imagestage{height:100%;width:100%;display:flex;align-items:center;justify-content:center;overflow:auto;background:#f0f5f2;padding:8px}
    .imagestage img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:0}
    .previewcanvas video{display:block;width:100%;height:100%;background:#111}
    .audiostage{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:12px;background:#edf4ef}
    .audiostage .avatar{width:32px;height:32px;align-self:center;margin:0;color:#3c8764}
    .audiostage audio{max-width:100%;width:320px}
    .plainpreview{padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;color:#365742;font:12px/1.6 ui-monospace,SFMono-Regular,monospace}
    .previewfoot{display:flex;align-items:center;gap:6px;min-height:24px;padding:5px 10px calc(5px + env(safe-area-inset-bottom,0px));background:#e7efea;border-top:1px solid #c7d6cc;font-size:9px;color:#668370;flex:none}
    .previewfoot .icon{width:12px;height:12px;color:#49866b}
    #previewfoot{min-width:0}
    .copydialog{pointer-events:auto;position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:18px;background:#294c3c55}
    .copycard{width:min(100%,490px);padding:16px;border-radius:10px;background:#f1f7f3;border:1px solid #b4ccbc}
    .copycard header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .copycard h2{margin:0;font-size:16px}
    .copycard p{color:#6b8772;font-size:11px;margin:0 0 12px}
    .copycard textarea{width:100%;height:140px;resize:vertical;border-radius:4px;padding:10px;border:1px solid #b4cbba;background:#fff;color:#244d32;font:16px/1.5 ui-monospace,monospace}
    .copycard .actionpill{margin-top:10px;width:100%;height:38px;background:#d9f1e3;color:#2a6240}
    .micro .pagecontext,.micro .foot,.micro .listhead{display:none}
    @media(max-width:359px){.brandtag{display:none}.tool{padding:0 10px}.tab{padding:0 10px}.footbrand{display:none}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}

    .dock{--accent:#329a7a;--accent-ink:#226c55;--accent-soft:#e1f2e9;--resource-size:12px}
    .dock[data-accent="blue"]{--mint:#b2d0ff;--accent:#4a76bc;--accent-ink:#2f5b99;--accent-soft:#e5efff}
    .dock[data-accent="violet"]{--mint:#cfc1ef;--accent:#8660b5;--accent-ink:#6c478f;--accent-soft:#f0eaf8}
    .dock[data-accent="amber"]{--mint:#f2d59e;--accent:#aa792d;--accent-ink:#815a20;--accent-soft:#fbf0da}
    .grab{height:32px;min-height:32px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    .grab::before{background:#91ada0;pointer-events:none}
    .grab.held::before{width:52px;background:var(--accent)}
    .bar,.peekbar{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:ns-resize}
    .dragshield{position:absolute;inset:0;z-index:6;pointer-events:auto;touch-action:none;background:transparent;cursor:ns-resize}
    .tabstrip{display:flex;flex:none;min-width:0;background:#e7efea;border-bottom:1px solid #bfcec5}
    .tabstrip>.tabs{flex:1;min-width:0;border-bottom:0}
    .settingstab{border-left:1px solid #bfcec5;border-right:0;gap:5px}
    .settingstab .icon{width:14px;height:14px}
    .tab.active{color:var(--accent-ink);border-bottom-color:var(--accent)}
    .tab.active .num{color:var(--accent-ink)}
    .item.selected{background:var(--accent-soft);border-left-color:var(--accent)}
    .label{font-size:var(--resource-size)}
    .val{font-size:calc(var(--resource-size) - 2px)}
    .eyebrow{font-size:calc(var(--resource-size) - 3px)}
    .dock.wrapurls .val{white-space:normal;overflow-wrap:anywhere;word-break:break-word}
    .dock[data-density="comfortable"] .resource{padding-top:13px;padding-bottom:13px}
    .dock[data-density="comfortable"] .copyitem{min-height:63px}
    .sheet.minimized>.tabstrip,.sheet.minimized>.settingspanel{display:none}
    .settingspanel{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:#fff}
    .settingsgroup{padding:9px 12px 7px;background:#edf3ef;border-bottom:1px solid #d3dfd6;color:#658073;font-size:10px;font-weight:650}
    .settingrow{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:45px;padding:8px 12px;border-bottom:1px solid #e0e8e2;font-size:12px;color:#365442}
    .settingrow select{max-width:52%;min-height:32px;padding:4px 8px;border:1px solid #bfcec5;border-radius:4px;background:#f7faf8;color:var(--text);font-family:inherit;font-size:16px}
    .settingrange{flex-wrap:wrap;gap:4px 10px}
    .settingrange output{font-size:11px;color:var(--accent-ink);font-variant-numeric:tabular-nums}
    .settingrange input{width:100%;height:27px;margin:0;accent-color:var(--accent)}
    .switchwrap{position:relative;display:inline-flex;align-items:center;flex:none;width:38px;height:24px}
    .switchwrap input{position:absolute;inset:0;z-index:1;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
    .switchtrack{display:block;width:36px;height:21px;border-radius:12px;background:#b9c8bf;pointer-events:none}
    .switchtrack::after{content:'';display:block;width:17px;height:17px;margin:2px;border-radius:50%;background:#fff}
    .switchwrap input:checked+.switchtrack{background:var(--accent)}
    .switchwrap input:checked+.switchtrack::after{transform:translateX(15px)}
    .switchwrap input:focus-visible+.switchtrack{outline:2px solid var(--accent-ink);outline-offset:2px}
    .settingsbottom{padding:12px}
    .settingsbottom .actionpill{min-height:36px;font-size:11px}
    .settingsbottom p{margin:9px 0 2px;font-size:10px;color:#708777;line-height:1.5}
    .dock[data-theme="dark"]{color-scheme:dark;--text:#dce9e3;--muted:#a0b3aa;--line:#3c4e44;--accent-ink:var(--mint);--accent-soft:#304539}
    .dock[data-theme="dark"] .sheet,.dock[data-theme="dark"] .preview{background:#242f29;border-color:#506356}
    .dock[data-theme="dark"] .grab,.dock[data-theme="dark"] .bar,.dock[data-theme="dark"] .peekbar{background:#2b3930;border-color:#425348}
    .dock[data-theme="dark"] .brandtag,.dock[data-theme="dark"] .iconbutton,.dock[data-theme="dark"] .pagecontext,.dock[data-theme="dark"] .peektitle small,.dock[data-theme="dark"] .previewaddress span{color:#a1b7a8}
    .dock[data-theme="dark"] .pagecontext,.dock[data-theme="dark"] .searchline,.dock[data-theme="dark"] .previewaddress{background:#26332b;border-color:#425348}
    .dock[data-theme="dark"] .tools,.dock[data-theme="dark"] .tabstrip,.dock[data-theme="dark"] .tabs,.dock[data-theme="dark"] .listhead,.dock[data-theme="dark"] .foot,.dock[data-theme="dark"] .previewfoot{background:#29372d;border-color:#425348}
    .dock[data-theme="dark"] .tool,.dock[data-theme="dark"] .tab{color:#a7bdad;border-right-color:#425348}
    .dock[data-theme="dark"] .settingstab{border-left-color:#425348}
    .dock[data-theme="dark"] .tab.active{background:#202b24;color:var(--accent-ink);border-bottom-color:var(--accent)}
    .dock[data-theme="dark"] .tab .num,.dock[data-theme="dark"] #hint{color:#8ba292}
    .dock[data-theme="dark"] .searchbox,.dock[data-theme="dark"] .copycard textarea{background:#19231d;border-color:#506356}
    .dock[data-theme="dark"] #find,.dock[data-theme="dark"] .label,.dock[data-theme="dark"] .peektitle strong,.dock[data-theme="dark"] .plainpreview,.dock[data-theme="dark"] .copycard textarea{color:#deece2}
    .dock[data-theme="dark"] #find::placeholder{color:#91a799}
    .dock[data-theme="dark"] .items,.dock[data-theme="dark"] .item,.dock[data-theme="dark"] .settingspanel{background:#202b24;border-color:#35483a}
    .dock[data-theme="dark"] .item:nth-child(even){background:#243128}
    .dock[data-theme="dark"] .item.selected{background:var(--accent-soft)}
    .dock[data-theme="dark"] .item:hover,.dock[data-theme="dark"] .iconbutton:hover,.dock[data-theme="dark"] .tool:hover{background:#344a3b}
    .dock[data-theme="dark"] .val,.dock[data-theme="dark"] .eyebrow,.dock[data-theme="dark"] .copyitem,.dock[data-theme="dark"] .statecaption,.dock[data-theme="dark"] .footbrand,.dock[data-theme="dark"] .previewfoot,.dock[data-theme="dark"] .empty,.dock[data-theme="dark"] .settingsbottom p{color:#9fb9a6}
    .dock[data-theme="dark"] .avatar,.dock[data-theme="dark"] .eyebrow .type,.dock[data-theme="dark"] .totalpill,.dock[data-theme="dark"] .miniicon,.dock[data-theme="dark"] .peekmark{color:var(--mint)}
    .dock[data-theme="dark"] .actionpill,.dock[data-theme="dark"] .more{background:#2c3d31;border-color:#506356;color:#b5d6be}
    .dock[data-theme="dark"] .settingsgroup{background:#29372d;border-color:#425348;color:#9fb9a6}
    .dock[data-theme="dark"] .settingrow{color:#dce9e3;border-color:#35483a}
    .dock[data-theme="dark"] .settingrow select{background:#2a3930;border-color:#506356}
    .dock[data-theme="dark"] .imagestage,.dock[data-theme="dark"] .audiostage,.dock[data-theme="dark"] .copycard{background:#26342b;border-color:#506356}
    .dock[data-theme="dark"] .copycard p{color:#a0b8a7}


    #inspectback{display:flex;align-items:center;gap:2px;min-height:28px;margin:-4px 0 -4px -5px;padding:0 5px;color:var(--accent-ink);background:transparent;font-size:11px;white-space:nowrap}
    #inspectback .icon{width:12px;height:12px}
    .sheet.micro.has-history:not(.minimized) .pagecontext{display:flex}
    #inspectpage{white-space:nowrap;min-height:34px;color:var(--accent-ink);background:var(--accent-soft)}
    @media(max-width:359px){.peekbar{gap:4px}.peekbar .iconbutton{width:29px}.peekbar .actionpill{padding:0 6px}}
  </style>
  <div class="dock">
    <section class="sheet" role="region" aria-label="Nous resource inspector">
      <div class="grab" id="grab" role="separator" tabindex="0" aria-label="Resize inspector" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" title="Drag or use arrow keys to resize"></div>
      <header class="bar"><span class="brandmark">${mark}</span><div class="brandblock"><div class="wordmark">nous</div><div class="brandtag">mobile inspector</div></div><div class="windowtools"><button class="iconbutton" id="minimize" aria-label="Minimize Nous" title="Minimize">${icon('minimize')}</button><button class="iconbutton" id="maximize" aria-label="Expand inspector" title="Expand">${icon('expand')}</button><button class="iconbutton" id="close" aria-label="Close Nous" title="Close">${icon('close')}</button></div></header>
      <div class="pagecontext"><button type="button" id="inspectback" hidden aria-label="Previous inspected page">${icon('back')}Back</button><span class="dot"></span><span id="site"></span><span class="totalpill" id="total">0 found</span></div>
      <div class="tools" role="toolbar" aria-label="Inspector actions"><button class="tool" id="scan" aria-label="Rescan page">${icon('refresh')}Rescan</button><button class="tool" id="copy" aria-label="Copy filtered list">${icon('copy')}Copy list</button><button class="tool" id="save" aria-label="Export filtered list as JSON">${icon('download')}Export JSON</button></div>
      <div class="tabstrip"><nav class="tabs" id="tabs" aria-label="Resource categories"></nav><button class="tab settingstab" id="settingstab" aria-controls="settingspanel" aria-pressed="false">${icon('settings')}Settings</button></div>
      <div class="searchline"><label class="searchbox">${icon('search')}<input id="find" type="search" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" placeholder="Search resources…" aria-label="Search resources"></label></div>
      <div class="listhead"><span id="count" role="status" aria-live="polite">RESOURCES</span><span id="hint">Tap to peek</span></div>
      <div class="items" id="items" aria-label="Resources"></div>
      <section class="settingspanel" id="settingspanel" hidden aria-label="Nous settings">
        <div class="settingsgroup">Appearance</div>
        <label class="settingrow"><span>Theme</span><select id="setting-theme" aria-label="Theme"><option value="light">Light</option><option value="dark">Dark</option><option value="system">Device</option></select></label>
        <label class="settingrow"><span>Accent</span><select id="setting-accent" aria-label="Accent color"><option value="mint">Mint</option><option value="blue">Blue</option><option value="violet">Violet</option><option value="amber">Amber</option></select></label>
        <div class="settingrow settingrange"><label for="setting-textSize">Resource text</label><output id="textSize-value" for="setting-textSize">12 px</output><input id="setting-textSize" type="range" min="11" max="16" step="1" aria-label="Resource text size"></div>
        <label class="settingrow"><span>Row spacing</span><select id="setting-density" aria-label="Row spacing"><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></label>
        <label class="settingrow"><span>Wrap long URLs</span><span class="switchwrap"><input id="setting-wrapUrls" type="checkbox" role="switch"><span class="switchtrack" aria-hidden="true"></span></span></label>
        <div class="settingsgroup">Panels</div>
        <div class="settingrow settingrange"><label for="setting-inspectorHeight">Inspector height</label><output id="inspectorHeight-value" for="setting-inspectorHeight">60%</output><input id="setting-inspectorHeight" type="range" min="30" max="95" step="1" aria-label="Inspector opening height"></div>
        <div class="settingrow settingrange"><label for="setting-previewHeight">Peek height</label><output id="previewHeight-value" for="setting-previewHeight">34%</output><input id="setting-previewHeight" type="range" min="18" max="65" step="1" aria-label="Preview opening height"></div>
        <label class="settingrow"><span>Remember resized panels</span><span class="switchwrap"><input id="setting-rememberSizes" type="checkbox" role="switch"><span class="switchtrack" aria-hidden="true"></span></span></label>
        <div class="settingsbottom"><button class="actionpill" id="settingsreset">Reset settings</button><p id="settingsnote" role="status">Saved for this website.</p></div>
      </section>

      <footer class="foot"><div class="state"><span class="miniicon">${icon('thread')}</span><span class="statecaption" id="notice">Local · browser-visible resources</span></div><span class="footbrand">Follow the thread.</span></footer>
    </section>
    <section class="preview" id="viewer" hidden role="region" aria-label="Nous Peek preview">
      <div class="grab" id="previewgrab" role="separator" tabindex="0" aria-label="Resize preview" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" title="Drag or use arrow keys to resize"></div>
      <header class="peekbar"><span class="peekmark">${icon('eye')}</span><div class="peektitle"><strong>Peek</strong><small id="previewkind">Follow the thread.</small></div><button class="iconbutton" id="previewcopy" aria-label="Copy preview value" title="Copy">${icon('copy')}</button><button class="actionpill" id="previewopen" aria-label="Open preview in a new tab">Open ${icon('external')}</button><button type="button" class="actionpill" id="inspectpage" hidden>Inspect this page</button><button class="iconbutton" id="previewclose" aria-label="Close preview" title="Close preview">${icon('close')}</button></header>
      <div class="previewaddress">${icon('link')}<span id="previewaddress"></span></div><div class="previewcanvas" id="previewcanvas"></div><footer class="previewfoot">${icon('thread')}<span id="previewfoot">Drag the handle to find your balance.</span></footer>
    </section>
    <div class="dragshield" id="dragshield" hidden></div>
    <div class="toast" id="toast" hidden role="status" aria-live="polite"></div>
    <div class="copydialog" id="copydialog" hidden role="dialog" aria-modal="true" aria-label="Copy text"><div class="copycard"><header><h2>Take it with you.</h2><button class="iconbutton" id="copydialogclose" aria-label="Close copy dialog">${icon('close')}</button></header><p>Touch and hold the selected text, then choose Copy.</p><textarea id="copytext" readonly aria-label="Text to copy"></textarea><button class="actionpill" id="selecttext">Select all</button></div></div>
  </div>`;
  document.documentElement.appendChild(host);
  const $ = selector => root.querySelector(selector);
  const controller = new AbortController();
  const on = (node, event, fn, options={}) => node.addEventListener(event,fn,{...options,signal:controller.signal});
  const sheet=$('.sheet'), viewer=$('#viewer'), canvas=$('#previewcanvas'), viewport=window.visualViewport;
  const categories=['All','Links','Images','Video','Audio','Scripts','Styles','Frames','Metadata','Network'];
  const categoryIcons={All:'grid',Links:'link',Images:'image',Video:'video',Audio:'audio',Scripts:'code',Styles:'style',Frames:'frame',Metadata:'info',Network:'network'};
  const colors={Links:['#436b9a','#436b9a13'],Images:['#347c5a','#347c5a13'],Video:['#80648e','#80648e13'],Audio:['#947240','#94724013'],Scripts:['#4e709b','#4e709b13'],Styles:['#836e91','#836e9113'],Frames:['#487f89','#487f8913'],Metadata:['#637d6a','#637d6a13'],Network:['#557b59','#557b5913']};
  let records=[], filtered=[], category='All', limit=80, skipped=0, mini=false, full=false, closed=false;
  let currentScan=null, inspectedFrame=null, peekFrame=null, pendingScan=null, pendingScanTimer=null;
  const inspectionHistory=[];
  let previewActive=false, previewEntry=null, previewToken=0, returnFocus=null, toastTimer=0;
  const timers=new Set();
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!closed)fn();},ms);timers.add(id);return id;};
  const downloads=new Set();
  const vh=()=>Math.max(240,viewport?viewport.height:window.innerHeight);
  const clamp=(n,min,max)=>Math.max(min,Math.min(n,max));
  const DEFAULTS=Object.freeze({theme:'light',accent:'mint',textSize:12,density:'compact',inspectorHeight:60,previewHeight:34,wrapUrls:false,rememberSizes:true});
  const PREF_KEY='__nous_preferences_v1';
  function sanitizePreferences(input){
    const p=input&&typeof input==='object'?input:{}, out={...DEFAULTS};
    for(const [key,allowed] of Object.entries({theme:['light','dark','system'],accent:['mint','blue','violet','amber'],density:['compact','comfortable']})){
      if(allowed.includes(p[key]))out[key]=p[key];
    }
    for(const [key,min,max] of [['textSize',11,16],['inspectorHeight',30,95],['previewHeight',18,65]]){
      const n=p[key];if(typeof n==='number'&&Number.isFinite(n))out[key]=Math.max(min,Math.min(max,Math.round(n)));
    }
    for(const key of ['wrapUrls','rememberSizes'])if(typeof p[key]==='boolean')out[key]=p[key];
    return out;
  }
  let storageAvailable=true, savedPreferences=null;
  try{savedPreferences=JSON.parse(window.localStorage.getItem(PREF_KEY));}catch{storageAvailable=false;}
  let preferences=sanitizePreferences(savedPreferences), settingsOpen=false;
  const colorQuery=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;
  function savePreferences(){
    try{window.localStorage.setItem(PREF_KEY,JSON.stringify(preferences));storageAvailable=true;}catch{storageAvailable=false;}
    $('#settingsnote').textContent=storageAvailable?'Saved for this website.':'Settings apply on this page; saving is unavailable here.';
  }
  function applyPreferences(){
    const dock=$('.dock');
    dock.dataset.theme=preferences.theme==='system'?(colorQuery&&colorQuery.matches?'dark':'light'):preferences.theme;
    dock.dataset.accent=preferences.accent;dock.dataset.density=preferences.density;
    dock.style.setProperty('--resource-size',preferences.textSize+'px');
    dock.classList.toggle('wrapurls',preferences.wrapUrls);
  }
  function syncSettings(){
    for(const key of ['theme','accent','textSize','density','inspectorHeight','previewHeight']){
      $('#setting-'+key).value=String(preferences[key]);
    }
    for(const key of ['wrapUrls','rememberSizes'])$('#setting-'+key).checked=preferences[key];
    $('#textSize-value').textContent=preferences.textSize+' px';
    $('#inspectorHeight-value').textContent=preferences.inspectorHeight+'%';
    $('#previewHeight-value').textContent=preferences.previewHeight+'%';
    $('#settingsnote').textContent=storageAvailable?'Saved for this website.':'Settings apply on this page; saving is unavailable here.';
  }
  function setSettingsView(open,redraw=true){
    settingsOpen=open;
    if(open&&previewActive)closePreview();
    $('#settingspanel').hidden=!open;$('#items').hidden=open;
    $('.tools').hidden=open;$('.searchline').hidden=open;$('.listhead').hidden=open;
    $('#settingstab').classList.toggle('active',open);$('#settingstab').setAttribute('aria-pressed',String(open));
    if(open)syncSettings();
    if(redraw)render();
    layout();
  }
  function changePreference(key,value){
    preferences=sanitizePreferences({...preferences,[key]:value});
    if(key==='inspectorHeight'){
      const h=vh()*preferences.inspectorHeight/100;
      if(previewActive){previewReturnHeight=h;mainHeight=Math.max(h,vh()*.90);}else mainHeight=h;
      full=false;rememberedHeight=h;layout();
    }
    if(key==='previewHeight'){previewHeight=vh()*preferences.previewHeight/100;layout();}
    applyPreferences();syncSettings();
  }
  function rememberPanelSize(kind){
    if(!preferences.rememberSizes||closed)return;
    if(kind==='main'){
      if(previewActive)previewReturnHeight=parseFloat(sheet.style.height);
      preferences=sanitizePreferences({...preferences,inspectorHeight:100*(previewActive?previewReturnHeight:mainHeight)/vh()});
    }else preferences=sanitizePreferences({...preferences,previewHeight:100*previewHeight/vh()});
    savePreferences();if(settingsOpen)syncSettings();
  }

  let mainHeight=Math.round(vh()*preferences.inspectorHeight/100), previewHeight=Math.round(vh()*preferences.previewHeight/100), rememberedHeight=mainHeight, previewReturnHeight=mainHeight;
  const tabs=new Map();
  const note=message=>{
    if(closed)return;
    $('#notice').textContent=message;
    $('#toast').textContent=message;$('#toast').hidden=false;
    clearTimeout(toastTimer);timers.delete(toastTimer);
    toastTimer=later(()=>{$('#toast').hidden=true;},2200);
  };
  function closeNous(){
    if(closed)return;closed=true;controller.abort();
    timers.forEach(id=>clearTimeout(id));downloads.forEach(url=>URL.revokeObjectURL(url));
    releaseMedia();host.remove();
    if(previousFocus&&previousFocus.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus({preventScroll:true});
  }
  on(host,'nous:close',closeNous);
  function releaseMedia(){
    ++previewToken;
    cancelInspection();
    peekFrame=null;
    $('#inspectpage').hidden=true;
    canvas.querySelectorAll('audio,video').forEach(media=>{try{media.pause();media.removeAttribute('src');media.load();}catch{}});
    for(const child of Array.from(canvas.children)){
      if(child===inspectedFrame)child.hidden=true;else child.remove();
    }
  }
  function layout(){
    const H=vh(), top=viewport?viewport.offsetTop:0, left=viewport?viewport.offsetLeft:0;
    host.style.setProperty('top',top+'px','important');host.style.setProperty('left',left+'px','important');
    host.style.setProperty('right','auto','important');host.style.setProperty('bottom','auto','important');
    host.style.setProperty('height',H+'px','important');host.style.setProperty('width',(viewport?viewport.width:window.innerWidth)+'px','important');
    mainHeight=clamp(mainHeight,Math.min(280,H-12),H-12);
    let upper=mainHeight;
    if(previewActive&&!mini){
      const available=H-12;
      const minimumUpper=Math.min(260,H*.40);
      const minimumPeek=Math.min(150,H*.35);
      previewHeight=clamp(previewHeight,minimumPeek,Math.max(minimumPeek,available-minimumUpper));
      const total=clamp(mainHeight,previewHeight+minimumUpper,available);
      mainHeight=total;
      upper=Math.max(140,total-previewHeight);
      if(upper+previewHeight>available)upper=available-previewHeight;
      viewer.hidden=false;viewer.style.height=previewHeight+'px';sheet.style.bottom=previewHeight+'px';
    }else{viewer.hidden=true;sheet.style.bottom='0px';}
    sheet.style.height=mini?'50px':upper+'px';
    sheet.classList.toggle('split',previewActive&&!mini);sheet.classList.toggle('micro',upper<300&&!mini);
    $('#grab').setAttribute('aria-valuenow',String(Math.round((mini?50:upper)/H*100)));
    $('#previewgrab').setAttribute('aria-valuenow',String(Math.round(previewHeight/H*100)));
    $('#maximize').innerHTML=icon(full?'restore':'expand');
    $('#maximize').setAttribute('aria-label',full?'Restore inspector size':'Expand inspector');
  }
  function manualCopy(text){
    $('#copytext').value=text;$('#copydialog').hidden=false;
    $('#copytext').focus();$('#copytext').select();$('#copytext').setSelectionRange(0,text.length);
  }
  function copyText(text){
    const fallback=()=>{
      const field=document.createElement('textarea');field.value=text;
      field.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;';
      root.append(field);field.focus();field.select();field.setSelectionRange(0,text.length);
      let ok=false;try{ok=document.execCommand('copy');}catch{}field.remove();
      if(ok)note('Copied. Take it with you.');else manualCopy(text);
    };
    if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(()=>note('Copied. Take it with you.')).catch(()=>{if(!closed)fallback();});
    else fallback();
  }
  function scanDocument(doc,url,resourceTiming,base=doc.baseURI){
    const records=[], seen=new Set();
    let skipped=0;
    function add(type,value,label,source,asText=false){
      if(value==null)return;value=String(value).trim();if(!value||value.length>6000)return;
      if(!asText){
        if(/^(javascript:|data:)/i.test(value))return;
        try{value=new URL(value,base).href;}catch{return;}
      }
      const key=type+'\u0000'+value;if(seen.has(key))return;
      if(records.length>=2500){skipped++;return;}
      seen.add(key);
      records.push({type,label:String(label||type).trim().replace(/\s+/g,' ').slice(0,150),value,source:source||'',url:!asText});
    }
    const all=(selector,fn)=>doc.querySelectorAll(selector).forEach(fn);
    const attrs=(el,type,fields,label)=>fields.forEach(field=>{const value=el.getAttribute(field);if(value)add(type,value,label||el.tagName.toLowerCase(),el.tagName.toLowerCase()+'['+field+']');});
    all('a[href],area[href]',el=>attrs(el,'Links',['href'],el.textContent.trim()||el.getAttribute('aria-label')||'Link'));
    all('form[action]',el=>attrs(el,'Links',['action'],'Form action'));
    all('img',el=>{attrs(el,'Images',['src','data-src','data-original'],el.alt||'Image');if(el.currentSrc)add('Images',el.currentSrc,el.alt||'Image','img.currentSrc');});
    function addSrcset(el,attribute,source){
      const set=el.getAttribute(attribute)||'';
      let position=0;
      while(position<set.length){
        while(position<set.length&&/[\s,]/.test(set[position]))position++;
        const start=position;while(position<set.length&&!/\s/.test(set[position]))position++;
        let url=set.slice(start,position);
        if(/,$/.test(url))url=url.replace(/,+$/,'');
        else while(position<set.length&&set[position]!==',')position++;
        if(url)add('Images',url,'Responsive image',source);
      }
    }
    all('img[srcset],source[srcset]',el=>addSrcset(el,'srcset','srcset'));
    all('video',el=>{attrs(el,'Video',['src','data-src'],'Video');attrs(el,'Images',['poster'],'Video poster');if(el.currentSrc)add('Video',el.currentSrc,'Video','video.currentSrc');});
    all('audio',el=>{attrs(el,'Audio',['src','data-src'],'Audio');if(el.currentSrc)add('Audio',el.currentSrc,'Audio','audio.currentSrc');});
    all('source[src]',el=>attrs(el,el.closest('video')?'Video':el.closest('audio')?'Audio':'Images',['src'],'Source'));
    all('script[src]',el=>attrs(el,'Scripts',['src'],'JavaScript'));
    const linkElements=doc.querySelectorAll('link[href],link[imagesrcset]');
    linkElements.forEach(el=>{const rel=el.rel||'link';add(/stylesheet/i.test(rel)?'Styles':/icon|image/i.test(rel)?'Images':/modulepreload/i.test(rel)?'Scripts':'Links',el.getAttribute('href'),rel,'link[rel]');});
    all('iframe[src],frame[src],embed[src],object[data]',el=>attrs(el,'Frames',el.tagName.toLowerCase()==='object'?['data']:['src'],el.title||'Embedded content'));
    all('[style]',el=>{for(const match of (el.getAttribute('style')||'').matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi))add('Images',match[2],'Inline background','style=url()');});
    all('meta[content]',el=>add('Metadata',el.content,el.getAttribute('property')||el.getAttribute('name')||el.getAttribute('http-equiv')||'meta','meta',true));
    add('Metadata',doc.title||doc.querySelector('title')?.textContent||'(untitled)','Page title','document.title',true);
    add('Metadata',url,'Page address','location',true);
    if(resourceTiming?.getEntriesByType)resourceTiming.getEntriesByType('resource').forEach(entry=>add('Network',entry.name,entry.initiatorType||'Resource','Performance API'));
    if(records.length<2500){
      const preloadTypes={image:'Images',script:'Scripts',style:'Styles',video:'Video',audio:'Audio'};
      linkElements.forEach(el=>{
        const rel=el.rel||'', as=(el.getAttribute('as')||'').toLowerCase();
        if(!/(?:^|\s)preload(?:\s|$)/i.test(rel)||!Object.prototype.hasOwnProperty.call(preloadTypes,as))return;
        add(preloadTypes[as],el.getAttribute('href'),rel,'link[rel]');
        if(as==='image')addSrcset(el,'imagesrcset','link[imagesrcset]');
      });
    }
    return {url,records,skipped};
  }
  function livePage(frame){
    if(!frame?.isConnected)return null;
    try{
      const doc=frame.contentDocument;
      if(!doc||doc.readyState==='loading'||! /^(https?:|blob:)/i.test(doc.URL))return null;
      if(!/^(text\/html|application\/xhtml\+xml)$/i.test(doc.contentType))return null;
      return {doc,url:doc.URL,timing:frame.contentWindow.performance};
    }catch{return null;}
  }
  function previewUrl(){
    return livePage(peekFrame)?.url||previewEntry?.value||'';
  }
  function updatePreviewAddress(url){
    const address=$('#previewaddress');
    address.textContent=url;
    address.title=url;
    $('#previewopen').disabled=!/^https?:\/\//i.test(url);
  }
  function setScan(scan,frame=null){
    if(inspectedFrame&&inspectedFrame!==frame&&inspectedFrame!==peekFrame)inspectedFrame.remove();
    inspectedFrame=frame;
    currentScan=scan;
    records=scan.records;
    skipped=scan.skipped;
    const url=new URL(scan.url);
    const site=$('#site');
    site.textContent=url.protocol==='blob:'?'Local preview':url.host+(url.pathname==='/'?'':url.pathname)+url.search+url.hash;
    site.title=scan.url;
    $('#total').textContent=records.length.toLocaleString()+' found';
    $('#inspectback').hidden=!inspectionHistory.length;
    sheet.classList.toggle('has-history',inspectionHistory.length>0);
  }
  function collect(){
    setScan({...scanDocument(document,location.href,performance),mode:'host'});
  }
  function scanMessage(mode,action){
    const html=mode==='html';
    const onlyDetails=records.every(entry=>entry.source==='document.title'||entry.source==='location');
    return (html?'HTML ':'Live ')+action+' complete · '+(onlyDetails?'page details only':records.length+' found')+'.'+(html?' No live network data.':'');
  }
  function waitForPeek(frame,signal){
    if(!frame||frame.dataset.loading!=='true'||signal.aborted)return Promise.resolve();
    return new Promise(resolve=>{
      const timeout=setTimeout(finish,2500);
      function finish(){
        clearTimeout(timeout);
        frame.removeEventListener('load',finish);
        signal.removeEventListener('abort',finish);
        resolve();
      }
      frame.addEventListener('load',finish,{once:true});
      signal.addEventListener('abort',finish,{once:true});
    });
  }
  async function loadInspection(url,frame,signal){
    const live=livePage(frame);
    if(live?.url===url){
      return {scan:{...scanDocument(live.doc,live.url,live.timing),mode:'live'},frame};
    }
    if(!/^https?:\/\//i.test(url))throw new Error('Page unavailable');
    const response=await fetch(url,{credentials:'same-origin',referrerPolicy:'no-referrer',signal});
    if(!response.ok||! /^(text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(response.headers.get('content-type')||'')){
      throw new Error('HTML unavailable');
    }
    const requested=new URL(url), fetched=new URL(response.url||url);
    requested.hash='';fetched.hash='';
    if(response.redirected||requested.href!==fetched.href)throw new Error('unverified-redirect');
    const html=await response.text();
    const template=document.createElement('template');
    template.innerHTML=html;
    const doc=template.content;
    const address=url;
    let base=address;
    const declaredBase=doc.querySelector('base[href]')?.getAttribute('href');
    if(declaredBase)try{
      const resolved=new URL(declaredBase,address);
      if(/^https?:$/.test(resolved.protocol))base=resolved.href;
    }catch{}
    return {scan:{...scanDocument(doc,address,null,base),mode:'html'},frame:null};
  }
  function cancelInspection(){
    if(pendingScanTimer!==null)clearTimeout(pendingScanTimer);
    pendingScanTimer=null;
    if(pendingScan)pendingScan.abort();
    pendingScan=null;
    $('#inspectpage').disabled=false;
    $('#scan').disabled=false;
  }
  async function runInspection(read,apply,failure){
    cancelInspection();
    const request=new AbortController();
    pendingScan=request;
    $('#inspectpage').disabled=true;
    $('#scan').disabled=true;
    pendingScanTimer=setTimeout(()=>{
      if(pendingScan===request&&!closed){
        cancelInspection();
        failure(new Error('timeout'));
      }
    },12000);
    try{
      const result=await read(request.signal);
      if(pendingScan!==request||request.signal.aborted||closed)return;
      apply(result);
    }catch(error){
      if(pendingScan===request&&!closed)failure(error);
    }finally{
      if(pendingScan===request)cancelInspection();
    }
  }
  function inspectPreview(){
    const frame=peekFrame;
    if(!frame)return;
    return runInspection(async signal=>{
      await waitForPeek(frame,signal);
      if(signal.aborted)throw new Error('Cancelled');
      const url=previewUrl();
      updatePreviewAddress(url);
      return loadInspection(url,frame,signal);
    },({scan,frame:sourceFrame})=>{
      const samePage=scan.url===currentScan.url;
      const scroll=$('#items').scrollTop;
      if(!samePage){
        inspectionHistory.push({scan:currentScan,category,query:$('#find').value,limit,scroll:$('#items').scrollTop});
        if(inspectionHistory.length>5)inspectionHistory.shift();
      }
      setScan(scan,sourceFrame);
      if(!samePage){
        category='All';
        limit=80;
        $('#find').value='';
        $('#tabs').scrollLeft=0;
      }
      render();
      $('#items').scrollTop=samePage?scroll:0;
      const message=scanMessage(scan.mode,'scan');
      $('#previewfoot').textContent=message;
      note(message);
    },error=>{
      const redirected=error?.message==='unverified-redirect';
      const timedOut=error?.message==='timeout';
      $('#previewfoot').textContent=redirected?'Redirect destination could not be verified. Open the page and run Nous there.':timedOut?'Inspection timed out. Open the page and run Nous there.':'Browser access blocked or page unavailable. Open it and run Nous there.';
      note(redirected?'Could not verify redirect.':timedOut?'Inspection timed out.':'Could not inspect this page.');
    });
  }
  function rescanCurrent(){
    const url=currentScan.url;
    const report=message=>{
      if(peekFrame&&previewUrl()===url)$('#previewfoot').textContent=message;
      note(message);
    };
    if(currentScan.mode==='host'){
      cancelInspection();
      const scroll=$('#items').scrollTop;
      collect();
      render();
      $('#items').scrollTop=scroll;
      report(scanMessage('live','rescan'));
      return;
    }
    const frame=livePage(inspectedFrame)?.url===url?inspectedFrame:peekFrame;
    return runInspection(signal=>loadInspection(url,frame,signal),({scan,frame:sourceFrame})=>{
      const scroll=$('#items').scrollTop;
      setScan(scan,sourceFrame);
      render();
      $('#items').scrollTop=scroll;
      report(scanMessage(scan.mode,'rescan'));
    },error=>report(error?.message==='unverified-redirect'?'Could not verify redirect.':error?.message==='timeout'?'Rescan timed out.':'Rescan unavailable. Open the page and run Nous there.'));
  }
  function backInspection(){
    const previous=inspectionHistory.pop();
    if(!previous)return;
    cancelInspection();
    const frame=livePage(peekFrame)?.url===previous.scan.url?peekFrame:null;
    setScan(previous.scan,frame);
    category=previous.category;
    limit=previous.limit;
    $('#find').value=previous.query;
    render();
    $('#items').scrollTop=previous.scroll;
    if(peekFrame)$('#previewfoot').textContent='Tap Inspect this page to scan this preview.';
    note('Returned to previous inspection.');
  }

  function domain(entry){try{return new URL(entry.value).hostname.replace(/^www\./,'')||entry.source;}catch{return entry.source;}}
  function render(){
    const q=$('#find').value.toLowerCase().trim();
    filtered=records.filter(entry=>(category==='All'||entry.type===category)&&(!q||(entry.value+' '+entry.label+' '+entry.source).toLowerCase().includes(q)));
    $('#count').textContent=(q?filtered.length+' MATCH'+(filtered.length===1?'':'ES'):category==='All'?'ALL RESOURCES':category.toUpperCase()+' · '+filtered.length)+(skipped?' · LIMIT 2,500':'');
    const counts=new Map();for(const entry of records)counts.set(entry.type,(counts.get(entry.type)||0)+1);
    for(const c of categories){const tab=tabs.get(c);tab.button.classList.toggle('active',c===category&&!settingsOpen);tab.button.setAttribute('aria-pressed',String(c===category&&!settingsOpen));tab.count.textContent=String(c==='All'?records.length:counts.get(c)||0);}
    const list=$('#items');list.replaceChildren();
    if(!filtered.length){
      const empty=document.createElement('div');empty.className='empty';empty.innerHTML='<span class="avatar">'+icon('search')+'</span><strong>No threads here yet.</strong><p>Try a shorter search, another category, or rescan after the page loads.</p>';list.append(empty);return;
    }
    const fragment=document.createDocumentFragment();
    for(const entry of filtered.slice(0,limit)){
      const row=document.createElement('div');row.className='item';row.classList.toggle('selected',!!previewEntry&&entry.type===previewEntry.type&&entry.value===previewEntry.value);
      const color=colors[entry.type]||colors.Links;row.style.setProperty('--row-color',color[0]);row.style.setProperty('--row-bg',color[1]);
      const button=document.createElement('button');button.type='button';button.className='resource';button.setAttribute('aria-label','Peek: '+entry.label);button.setAttribute('aria-pressed',String(row.classList.contains('selected')));
      const avatar=document.createElement('span');avatar.className='avatar';avatar.innerHTML=icon(categoryIcons[entry.type]);
      const main=document.createElement('span');main.className='itemmain';
      const eyebrow=document.createElement('span');eyebrow.className='eyebrow';
      const type=document.createElement('span');type.className='type';type.textContent=entry.type;
      const sep=document.createElement('span');sep.className='sep';
      const origin=document.createElement('span');origin.textContent=entry.url?domain(entry):entry.source;
      eyebrow.append(type,sep,origin);
      const label=document.createElement('span');label.className='label';label.textContent=entry.label;
      const value=document.createElement('div');value.className='val';value.textContent=entry.value;value.title=entry.value;
      main.append(eyebrow,label,value);button.append(avatar,main);button.onclick=()=>showPreview(entry,button);
      const copy=document.createElement('button');copy.type='button';copy.className='copyitem';copy.innerHTML=icon('copy');copy.setAttribute('aria-label','Copy '+entry.label);copy.onclick=()=>copyText(entry.value);
      row.append(button,copy);fragment.append(row);
    }
    list.append(fragment);
    if(filtered.length>limit){const more=document.createElement('button');more.className='more';more.textContent='Show '+Math.min(80,filtered.length-limit)+' more';more.onclick=()=>{const position=list.scrollTop;limit+=80;render();list.scrollTop=position;};list.append(more);}
  }
  for(const c of categories){
    const button=document.createElement('button');button.type='button';button.className='tab';button.innerHTML=c==='All'?icon('grid'):'';
    const title=document.createElement('span');title.textContent=c;const count=document.createElement('span');count.className='num';button.append(title,count);
    button.onclick=()=>{if(settingsOpen)setSettingsView(false,false);category=c;limit=80;render();$('#items').scrollTop=0;button.scrollIntoView({block:'nearest',inline:'nearest'});};
    $('#tabs').append(button);tabs.set(c,{button,count});
  }
  function updateSelected(){
    const shown=filtered.slice(0,limit);$('#items').querySelectorAll('.item').forEach((row,i)=>{const entry=shown[i];const selected=!!entry&&!!previewEntry&&entry.type===previewEntry.type&&entry.value===previewEntry.value;row.classList.toggle('selected',selected);row.querySelector('.resource').setAttribute('aria-pressed',String(selected));});
  }
  function closePreview(focus=false){
    if(previewActive)mainHeight=previewReturnHeight;
    previewActive=false;previewEntry=null;releaseMedia();layout();updateSelected();
    if(focus&&returnFocus&&returnFocus.isConnected)returnFocus.focus({preventScroll:true});
  }
  function showPreview(entry,trigger){
    if(!previewActive){previewReturnHeight=mainHeight;mainHeight=Math.max(mainHeight,vh()*.90);}
    previewEntry=entry;previewActive=true;returnFocus=trigger||returnFocus;releaseMedia();
    const token=previewToken, url=entry.value, web=/^https?:\/\//i.test(url), blob=/^blob:/i.test(url);
    const image=entry.type==='Images'||/\.(?:png|jpe?g|gif|webp|avif|bmp|svg)(?:[?#]|$)/i.test(url);
    const video=entry.type==='Video'||/\.(?:mp4|m4v|webm|mov|ogv)(?:[?#]|$)/i.test(url);
    const audio=entry.type==='Audio'||/\.(?:mp3|m4a|ogg|wav|aac|flac)(?:[?#]|$)/i.test(url);
    $('#previewaddress').textContent=url;$('#previewaddress').title=url;
    $('#previewkind').textContent=entry.type+' · '+entry.label;
    $('#previewopen').disabled=!web;
    const status=text=>{if(!closed&&token===previewToken)$('#previewfoot').textContent=text;};
    if((web||blob)&&entry.url){
      if(image){
        const stage=document.createElement('div');stage.className='imagestage';const img=document.createElement('img');img.alt=entry.label||'Image preview';img.src=url;img.referrerPolicy='no-referrer';
        img.onerror=()=>status('Image unavailable here. Try Open.');stage.append(img);canvas.append(stage);status('Image preview · drag the handle for more room.');
      }else if(video||audio){
        const media=document.createElement(video?'video':'audio');media.controls=true;media.preload='metadata';media.src=url;
        media.onerror=()=>status('This source cannot play here. Try Open.');
        if(video){media.playsInline=true;canvas.append(media);}else{const stage=document.createElement('div');stage.className='audiostage';stage.innerHTML='<span class="avatar">'+icon('audio')+'</span>';stage.append(media);canvas.append(stage);}
        status((video?'Video':'Audio')+' preview · playback depends on the source.');
      }else if(web||blob){
        const frame=document.createElement('iframe');frame.title='Peek: '+entry.label;
        frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin');frame.referrerPolicy='no-referrer';frame.src=url;
        peekFrame=frame;
        frame.dataset.loading='true';
        frame.addEventListener('load',()=>{
          frame.dataset.loading='false';
          if(peekFrame===frame)updatePreviewAddress(previewUrl());
        });
        canvas.append(frame);
        $('#inspectpage').hidden=false;
        status('Some sites block embedded previews. Use Open if this stays blank.');
      }else{const p=document.createElement('div');p.className='plainpreview';p.textContent=url;canvas.append(p);status('This resource is available to copy.');}
    }else{
      const p=document.createElement('div');p.className='plainpreview';p.textContent=url;canvas.append(p);status(entry.url?'Link scheme shown as text. Copy it to use elsewhere.':'Metadata · a small detail, a little more context.');
    }
    layout();updateSelected();
  }
  function openExternal(){
    const url=previewUrl();
    if(!/^https?:\/\//i.test(url))return;
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';root.append(a);a.click();a.remove();
  }
  function toggleMini(){
    mini=!mini;sheet.classList.toggle('minimized',mini);
    if(mini)closePreview();
    $('#minimize').innerHTML=icon(mini?'eye':'minimize');$('#minimize').setAttribute('aria-label',mini?'Restore Nous':'Minimize Nous');layout();
  }
  function toggleFull(){
    if(mini)toggleMini();
    full=!full;if(full){rememberedHeight=mainHeight;mainHeight=vh()-12;}else mainHeight=rememberedHeight;layout();
  }
  function resizeHandle(handle,kind,titlebar){
    let active=false,startY=0,startHeight=0,pointerId=null,touchId=null,dragController=null;
    const blocked=event=>event.target&&event.target.closest&&event.target.closest('button,input,select,a,textarea');
    function moveTo(y,event){
      if(!active||!Number.isFinite(y))return;
      if(event.cancelable)event.preventDefault();
      const next=startHeight+startY-y;
      if(kind==='preview')previewHeight=next;else{mainHeight=next;full=false;}
      layout();
    }
    function finish(cancelled=false){
      if(!active)return;
      active=false;
      if(dragController){dragController.abort();dragController=null;}
      try{if(pointerId!==null)handle.releasePointerCapture(pointerId);}catch{}
      pointerId=null;touchId=null;
      handle.classList.remove('held');$('.dock').classList.remove('dragging');$('#dragshield').hidden=true;
      if(!cancelled)rememberPanelSize(kind);
    }
    function begin(y,event,id,touch){
      if(active||mini||blocked(event)||!Number.isFinite(y))return false;
      active=true;startY=y;startHeight=kind==='preview'?previewHeight:mainHeight;
      pointerId=id;touchId=touch;dragController=new AbortController();
      if(event.cancelable)event.preventDefault();
      event.stopPropagation();
      handle.classList.add('held');$('.dock').classList.add('dragging');
      if(id!==null)try{handle.setPointerCapture(id);}catch{}
      $('#dragshield').hidden=false;
      return true;
    }
    function watch(name,fn){window.addEventListener(name,fn,{capture:true,passive:false,signal:dragController.signal});}
    function pointerStart(event){
      if(event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
      if(!begin(event.clientY,event,event.pointerId,null))return;
      watch('pointermove',e=>{if(e.pointerId===pointerId)moveTo(e.clientY,e);});
      watch('pointerup',e=>{if(e.pointerId===pointerId){moveTo(e.clientY,e);finish();}});
      watch('pointercancel',e=>{if(e.pointerId===pointerId)finish(true);});
      watch('blur',()=>finish(true));
    }
    function touchStart(event){
      if(!event.changedTouches||!event.changedTouches.length||event.touches.length!==1)return;
      const t=event.changedTouches[0];
      if(!begin(t.clientY,event,null,t.identifier))return;
      const findTouch=list=>Array.from(list||[]).find(touch=>touch.identifier===touchId);
      watch('touchmove',e=>{const t=findTouch(e.touches);if(t)moveTo(t.clientY,e);});
      watch('touchend',e=>{const t=findTouch(e.changedTouches);if(t){moveTo(t.clientY,e);finish();}});
      watch('touchcancel',()=>finish(true));watch('blur',()=>finish(true));
    }
    function mouseStart(event){
      if(event.button!==0||!begin(event.clientY,event,null,null))return;
      watch('mousemove',e=>moveTo(e.clientY,e));watch('mouseup',e=>{moveTo(e.clientY,e);finish();});watch('blur',()=>finish(true));
    }
    for(const target of [handle,titlebar]){
      if(window.PointerEvent)on(target,'pointerdown',pointerStart,{passive:false});
      else{on(target,'touchstart',touchStart,{passive:false});on(target,'mousedown',mouseStart);}
      on(target,'selectstart',event=>event.preventDefault());
    }
    on(handle,'keydown',event=>{
      if(mini)return;
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){
        event.preventDefault();const delta=event.key==='ArrowUp'?28:-28;
        if(kind==='preview')previewHeight+=delta;else{mainHeight+=delta;full=false;}
        layout();rememberPanelSize(kind);
      }
    });
    controller.signal.addEventListener('abort',()=>finish(true),{once:true});
  }
  resizeHandle($('#grab'),'main',$('.bar'));resizeHandle($('#previewgrab'),'preview',$('.peekbar'));

  on($('#settingstab'),'click',()=>setSettingsView(!settingsOpen));
  for(const key of ['theme','accent','density'])on($('#setting-'+key),'change',event=>{changePreference(key,event.target.value);savePreferences();});
  for(const key of ['textSize','inspectorHeight','previewHeight']){
    on($('#setting-'+key),'input',event=>changePreference(key,Number(event.target.value)));
    on($('#setting-'+key),'change',savePreferences);
  }
  for(const key of ['wrapUrls','rememberSizes'])on($('#setting-'+key),'change',event=>{changePreference(key,event.target.checked);savePreferences();});
  on($('#settingsreset'),'click',()=>{
    preferences={...DEFAULTS};mainHeight=vh()*.60;previewHeight=vh()*.34;
    rememberedHeight=mainHeight;previewReturnHeight=mainHeight;full=false;
    applyPreferences();syncSettings();savePreferences();layout();note('Settings reset.');
  });
  if(colorQuery&&colorQuery.addEventListener)on(colorQuery,'change',applyPreferences);

  on($('#find'),'input',()=>{limit=80;render();$('#items').scrollTop=0;});
  on($('#scan'),'click',rescanCurrent);
  on($('#inspectpage'),'click',inspectPreview);
  on($('#inspectback'),'click',backInspection);
  on($('#copy'),'click',()=>copyText(filtered.map(entry=>entry.type+'\t'+entry.label+'\t'+entry.value).join('\n')));
  on($('#save'),'click',()=>{
    const data={app:'Nous',version:'1.4',page:currentScan.url,capturedAt:new Date().toISOString(),entries:filtered};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));downloads.add(url);
    const a=document.createElement('a');a.href=url;a.download='nous-resources.json';root.append(a);a.click();a.remove();
    later(()=>{URL.revokeObjectURL(url);downloads.delete(url);},30000);note('Your threads, exported.');
  });
  on($('#previewclose'),'click',()=>closePreview(true));on($('#previewcopy'),'click',()=>{if(previewEntry)copyText(previewUrl());});on($('#previewopen'),'click',openExternal);
  on($('#close'),'click',closeNous);on($('#minimize'),'click',toggleMini);on($('#maximize'),'click',toggleFull);
  const closeCopy=()=>{$('#copydialog').hidden=true;$('#find').focus({preventScroll:true});};
  on($('#copydialogclose'),'click',closeCopy);on($('#selecttext'),'click',()=>{$('#copytext').focus();$('#copytext').select();$('#copytext').setSelectionRange(0,$('#copytext').value.length);});
  on(root,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(!$('#copydialog').hidden)closeCopy();else if(settingsOpen)setSettingsView(false);else if(previewActive)closePreview(true);else closeNous();}});
  on(window,'resize',layout,{passive:true});
  if(viewport){on(viewport,'resize',layout,{passive:true});on(viewport,'scroll',layout,{passive:true});}
  applyPreferences();syncSettings();collect();render();layout();
})();
