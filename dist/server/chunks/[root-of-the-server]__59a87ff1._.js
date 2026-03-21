module.exports=[32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},50227,(e,t,r)=>{t.exports=e.x("node:path",()=>require("node:path"))},85148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},60526,(e,t,r)=>{t.exports=e.x("node:os",()=>require("node:os"))},2157,(e,t,r)=>{t.exports=e.x("node:fs",()=>require("node:fs"))},75705,61923,7367,18517,e=>{"use strict";var t=e.i(85148);let r=["pending","in_progress","done","add_message","failed"];function a(e){return r.includes(e)}let n=[{value:"copilot_cli_sdk",label:"Copilot CLI"},{value:"acp",label:"Agent Communication Protocol (ACP)"}];function s(e){return n.some(t=>t.value===e)}e.s(["DEFAULT_AGENT_TYPE",0,"copilot_cli_sdk","isValidAgentType",()=>s,"isValidState",()=>a],61923);var o=e.i(50227),i=e.i(60526),l=e.i(2157);let d=o.default.join(i.default.homedir(),".agent-board"),T=o.default.join(d,"agent-board.db"),E=o.default.join(d,"tmp","messages");function u(){l.default.mkdirSync(E,{recursive:!0})}e.s(["DB_PATH",0,T,"STREAMING_DIR",0,E,"ensureDataDir",()=>u],7367);let p=null;function c(){if(!p){u(),(p=new t.default(T)).exec("PRAGMA journal_mode = WAL"),p.exec("PRAGMA foreign_keys = ON"),p.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        port INTEGER DEFAULT NULL,
        type TEXT NOT NULL DEFAULT 'copilot_cli_sdk',
        command TEXT DEFAULT NULL,
        folder TEXT NOT NULL,
        options TEXT NOT NULL DEFAULT '{}',
        source TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);try{p.exec("ALTER TABLE agents ADD COLUMN source TEXT NOT NULL DEFAULT 'user'")}catch{}p.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
        status TEXT NOT NULL DEFAULT 'planning',
        state TEXT NOT NULL DEFAULT 'pending',
        failure_reason TEXT DEFAULT NULL,
        completed_at TEXT DEFAULT NULL,
        active_time_ms INTEGER NOT NULL DEFAULT 0,
        active_since TEXT DEFAULT NULL,
        archived_at TEXT DEFAULT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `),p.exec(`
      CREATE TABLE IF NOT EXISTS task_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'user',
        content TEXT NOT NULL,
        task_state_at_creation TEXT NOT NULL,
        is_complete INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `),p.exec(`
      CREATE TABLE IF NOT EXISTS task_tool_calls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tool_call_id TEXT,
        tool_name TEXT NOT NULL,
        kind TEXT DEFAULT NULL,
        input TEXT,
        output TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        task_state_at_creation TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        completed_at TEXT DEFAULT NULL
      )
    `),p.exec(`
      CREATE TABLE IF NOT EXISTS task_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        token_limit INTEGER NOT NULL DEFAULT 0,
        used_tokens INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        UNIQUE(task_id, status)
      )
    `)}return p}e.s(["getDb",()=>c],75705);let N="planning",L="done",R=[{slug:N,label:"Planning",order:0},{slug:"development",label:"Development",order:1},{slug:L,label:"Done",order:2}];function A(e){return R.some(t=>t.slug===e)}e.s(["SLUG_DONE",0,L,"SLUG_PLANNING",0,N,"isValidQueue",()=>A],18517)},14747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},24361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},46786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},57764,(e,t,r)=>{t.exports=e.x("node:url",()=>require("node:url"))},64145,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),n=e.i(59756),s=e.i(61916),o=e.i(74677),i=e.i(69741),l=e.i(16795),d=e.i(87718),T=e.i(95169),E=e.i(47587),u=e.i(66012),p=e.i(70101),c=e.i(74838),N=e.i(10372),L=e.i(93695);e.i(52474);var R=e.i(220),A=e.i(89171),U=e.i(75705);e.i(15986);var x=e.i(20893);function m(){return new x.AgentService((0,U.getDb)())}async function g(){let e=m().list();return A.NextResponse.json(e)}async function f(e){let t=await e.json();try{let e=m().create({name:t.name,port:t.port,type:t.type,command:t.command,folder:t.folder,options:t.options});return A.NextResponse.json(e,{status:201})}catch(e){if(e instanceof x.AgentValidationError)return A.NextResponse.json({error:e.message},{status:400});throw e}}e.s(["GET",()=>g,"POST",()=>f],62603);var h=e.i(62603);let _=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/agents/route",pathname:"/api/agents",filename:"route",bundlePath:""},distDir:"dist",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/agents/route.ts",nextConfigOutput:"",userland:h}),{workAsyncStorage:O,workUnitAsyncStorage:v,serverHooks:C}=_;function D(){return(0,a.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:v})}async function I(e,t,a){_.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/agents/route";A=A.replace(/\/index$/,"")||"/";let U=await _.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!U)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,params:m,nextConfig:g,parsedUrl:f,isDraftMode:h,prerenderManifest:O,routerServerContext:v,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:I,clientReferenceManifest:w,serverActionsManifest:S}=U,F=(0,i.normalizeAppPath)(A),y=!!(O.dynamicRoutes[F]||O.routes[I]),k=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,f,!1):t.end("This page could not be found"),null);if(y&&!h){let e=!!O.routes[I],t=O.dynamicRoutes[F];if(t&&!1===t.fallback&&!e){if(g.experimental.adapterPath)return await k();throw new L.NoFallbackError}}let X=null;!y||_.isDev||h||(X="/index"===(X=I)?"/":X);let b=!0===_.isDev||!y,P=y&&!b;S&&w&&(0,o.setManifestsSingleton)({page:A,clientReferenceManifest:w,serverActionsManifest:S});let M=e.method||"GET",q=(0,s.getTracer)(),j=q.getActiveScopeSpan(),G={params:m,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!g.experimental.authInterrupts},cacheComponents:!!g.cacheComponents,supportsDynamicResponse:b,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:g.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>_.onRequestError(e,t,a,n,v)},sharedContext:{buildId:x}},H=new l.NodeNextRequest(e),Y=new l.NodeNextResponse(t),K=d.NextRequestAdapter.fromNodeNextRequest(H,(0,d.signalFromNodeResponse)(t));try{let o=async e=>_.handle(K,G).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=q.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==T.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${M} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${A}`)}),i=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var s,l;let d=async({previousCacheEntry:r})=>{try{if(!i&&C&&D&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await o(n);e.fetchMetrics=G.renderOpts.fetchMetrics;let l=G.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=G.renderOpts.collectedTags;if(!y)return await (0,u.sendResponse)(H,Y,s,G.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);d&&(t[N.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=N.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,a=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=N.INFINITE_CACHE?void 0:G.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await _.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,v),t}},T=await _.handleResponse({req:e,nextConfig:g,cacheKey:X,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:i});if(!y)return null;if((null==T||null==(s=T.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==T||null==(l=T.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",C?"REVALIDATED":T.isMiss?"MISS":T.isStale?"STALE":"HIT"),h&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let L=(0,p.fromNodeOutgoingHttpHeaders)(T.value.headers);return i&&y||L.delete(N.NEXT_CACHE_TAGS_HEADER),!T.cacheControl||t.getHeader("Cache-Control")||L.get("Cache-Control")||L.set("Cache-Control",(0,c.getCacheControlHeader)(T.cacheControl)),await (0,u.sendResponse)(H,Y,new Response(T.value.body,{headers:L,status:T.value.status||200})),null};j?await l(j):await q.withPropagatedContext(e.headers,()=>q.trace(T.BaseServerSpan.handleRequest,{spanName:`${M} ${A}`,kind:s.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},l))}catch(t){if(t instanceof L.NoFallbackError||await _.onRequestError(e,t,{routerKind:"App Router",routePath:F,routeType:"route",revalidateReason:(0,E.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,v),y)throw t;return await (0,u.sendResponse)(H,Y,new Response(null,{status:500})),null}}e.s(["handler",()=>I,"patchFetch",()=>D,"routeModule",()=>_,"serverHooks",()=>C,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>v],64145)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__59a87ff1._.js.map