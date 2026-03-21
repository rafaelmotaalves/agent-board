module.exports=[32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},50227,(e,t,r)=>{t.exports=e.x("node:path",()=>require("node:path"))},85148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},60526,(e,t,r)=>{t.exports=e.x("node:os",()=>require("node:os"))},2157,(e,t,r)=>{t.exports=e.x("node:fs",()=>require("node:fs"))},75705,61923,7367,18517,e=>{"use strict";var t=e.i(85148);let r=["pending","in_progress","done","add_message","failed"];function n(e){return r.includes(e)}let a=[{value:"copilot_cli_sdk",label:"Copilot CLI"},{value:"acp",label:"Agent Communication Protocol (ACP)"}];function s(e){return a.some(t=>t.value===e)}e.s(["DEFAULT_AGENT_TYPE",0,"copilot_cli_sdk","isValidAgentType",()=>s,"isValidState",()=>n],61923);var o=e.i(50227),i=e.i(60526),l=e.i(2157);let d=o.default.join(i.default.homedir(),".agent-board"),u=o.default.join(d,"agent-board.db"),T=o.default.join(d,"tmp","messages");function E(){l.default.mkdirSync(T,{recursive:!0})}e.s(["DB_PATH",0,u,"STREAMING_DIR",0,T,"ensureDataDir",()=>E],7367);let p=null;function c(){if(!p){E(),(p=new t.default(u)).exec("PRAGMA journal_mode = WAL"),p.exec("PRAGMA foreign_keys = ON"),p.exec(`
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
    `)}return p}e.s(["getDb",()=>c],75705);let N="planning",L="done",R=[{slug:N,label:"Planning",order:0},{slug:"development",label:"Development",order:1},{slug:L,label:"Done",order:2}];function A(e){return R.some(t=>t.slug===e)}e.s(["SLUG_DONE",0,L,"SLUG_PLANNING",0,N,"isValidQueue",()=>A],18517)},14747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},24361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},46786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},57764,(e,t,r)=>{t.exports=e.x("node:url",()=>require("node:url"))},86045,e=>{"use strict";var t=e.i(47909),r=e.i(74017),n=e.i(96250),a=e.i(59756),s=e.i(61916),o=e.i(74677),i=e.i(69741),l=e.i(16795),d=e.i(87718),u=e.i(95169),T=e.i(47587),E=e.i(66012),p=e.i(70101),c=e.i(74838),N=e.i(10372),L=e.i(93695);e.i(52474);var R=e.i(220),A=e.i(89171),x=e.i(75705);e.i(15986);var U=e.i(20893);function g(){return new U.AgentService((0,x.getDb)())}async function m(e,{params:t}){let{id:r}=await t,n=parseInt(r,10);if(isNaN(n))return A.NextResponse.json({error:"Invalid agent ID"},{status:400});let a=await e.json();try{let e=g().update(n,{name:a.name,port:a.port,type:a.type,command:a.command,folder:a.folder,options:a.options});return A.NextResponse.json(e)}catch(e){if(e instanceof U.AgentNotFoundError)return A.NextResponse.json({error:e.message},{status:404});if(e instanceof U.AgentConfigError)return A.NextResponse.json({error:e.message},{status:403});if(e instanceof U.AgentValidationError)return A.NextResponse.json({error:e.message},{status:400});throw e}}async function f(e,{params:t}){let{id:r}=await t,n=parseInt(r,10);if(isNaN(n))return A.NextResponse.json({error:"Invalid agent ID"},{status:400});try{return g().delete(n),A.NextResponse.json({success:!0})}catch(e){if(e instanceof U.AgentNotFoundError)return A.NextResponse.json({error:e.message},{status:404});if(e instanceof U.AgentConfigError)return A.NextResponse.json({error:e.message},{status:403});if(e instanceof U.AgentValidationError)return A.NextResponse.json({error:e.message},{status:400});throw e}}e.s(["DELETE",()=>f,"PATCH",()=>m],25625);var h=e.i(25625);let _=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/agents/[id]/route",pathname:"/api/agents/[id]",filename:"route",bundlePath:""},distDir:"dist",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/agents/[id]/route.ts",nextConfigOutput:"",userland:h}),{workAsyncStorage:O,workUnitAsyncStorage:v,serverHooks:C}=_;function D(){return(0,n.patchFetch)({workAsyncStorage:O,workUnitAsyncStorage:v})}async function I(e,t,n){_.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/agents/[id]/route";A=A.replace(/\/index$/,"")||"/";let x=await _.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!x)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:U,params:g,nextConfig:m,parsedUrl:f,isDraftMode:h,prerenderManifest:O,routerServerContext:v,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,resolvedPathname:I,clientReferenceManifest:w,serverActionsManifest:S}=x,F=(0,i.normalizeAppPath)(A),y=!!(O.dynamicRoutes[F]||O.routes[I]),k=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,f,!1):t.end("This page could not be found"),null);if(y&&!h){let e=!!O.routes[I],t=O.dynamicRoutes[F];if(t&&!1===t.fallback&&!e){if(m.experimental.adapterPath)return await k();throw new L.NoFallbackError}}let X=null;!y||_.isDev||h||(X="/index"===(X=I)?"/":X);let b=!0===_.isDev||!y,P=y&&!b;S&&w&&(0,o.setManifestsSingleton)({page:A,clientReferenceManifest:w,serverActionsManifest:S});let M=e.method||"GET",j=(0,s.getTracer)(),q=j.getActiveScopeSpan(),H={params:g,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!m.experimental.authInterrupts},cacheComponents:!!m.cacheComponents,supportsDynamicResponse:b,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:m.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,a)=>_.onRequestError(e,t,n,a,v)},sharedContext:{buildId:U}},G=new l.NodeNextRequest(e),Y=new l.NodeNextResponse(t),K=d.NextRequestAdapter.fromNodeNextRequest(G,(0,d.signalFromNodeResponse)(t));try{let o=async e=>_.handle(K,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${M} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${A}`)}),i=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var s,l;let d=async({previousCacheEntry:r})=>{try{if(!i&&C&&D&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await o(a);e.fetchMetrics=H.renderOpts.fetchMetrics;let l=H.renderOpts.pendingWaitUntil;l&&n.waitUntil&&(n.waitUntil(l),l=void 0);let d=H.renderOpts.collectedTags;if(!y)return await (0,E.sendResponse)(G,Y,s,H.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);d&&(t[N.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=N.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,n=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=N.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await _.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,v),t}},u=await _.handleResponse({req:e,nextConfig:m,cacheKey:X,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:C,revalidateOnlyGenerated:D,responseGenerator:d,waitUntil:n.waitUntil,isMinimalMode:i});if(!y)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",C?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),h&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let L=(0,p.fromNodeOutgoingHttpHeaders)(u.value.headers);return i&&y||L.delete(N.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||L.get("Cache-Control")||L.set("Cache-Control",(0,c.getCacheControlHeader)(u.cacheControl)),await (0,E.sendResponse)(G,Y,new Response(u.value.body,{headers:L,status:u.value.status||200})),null};q?await l(q):await j.withPropagatedContext(e.headers,()=>j.trace(u.BaseServerSpan.handleRequest,{spanName:`${M} ${A}`,kind:s.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},l))}catch(t){if(t instanceof L.NoFallbackError||await _.onRequestError(e,t,{routerKind:"App Router",routePath:F,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:P,isOnDemandRevalidate:C})},!1,v),y)throw t;return await (0,E.sendResponse)(G,Y,new Response(null,{status:500})),null}}e.s(["handler",()=>I,"patchFetch",()=>D,"routeModule",()=>_,"serverHooks",()=>C,"workAsyncStorage",()=>O,"workUnitAsyncStorage",()=>v],86045)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1580b5db._.js.map