const paths = {
 hand:'<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 5-3 7-7 7-3 0-5-2-7-5l-3-4c-1-2 1-3 2-2l3 3Z"/>',
 camera:'<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
 book:'<path d="M12 5c-4-3-9-1-9-1v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15"/>',
 shuffle:'<path d="m17 3 4 4-4 4M3 17l5-1 8-9h5M17 13l4 4-4 4M3 7l5 1 3 3m3 3 2 3h5"/>',
 words:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 16 4-8 4 8m-6-3h4m3-5h2m-1 0v8"/>',
 chart:'<path d="M4 4v16h17M8 15v-4m5 4V6m5 9v-6"/>',
 arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 flame:'<path d="M12 3c1 5 6 5 6 10a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 3 2 4 2-2 2-5 1-8Z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
 bulb:'<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 2H9l-1-2Z"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
 flip:'<path d="M5 8a8 8 0 0 1 13-3l3 3m0-5v5h-5M19 16a8 8 0 0 1-13 3l-3-3m0 5v-5h5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3c-1 0-1 1-1 2m0 2v1"/>'
};
export function icon(name, cls='') {return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`;}
