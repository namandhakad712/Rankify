PS E:\naman\Documents\Cursor AI\Rankify> npm run dev

> advanced-diagram-detection@1.0.0 dev
> nuxt dev

Nuxt 3.19.2 with Nitro 2.12.6                        nuxi 3:12:57 pm  
                             3:12:58 pm  
  ➜ Local:    http://localhost:3001/
  ➜ Network:  use --host to expose

i Using default Tailwind CSS file            nuxt:tailwindcss 3:13:00 pm
  ➜ DevTools: press Shift + Alt + D in the browser (v1.7.0)                             3:13:09 pm


 WARN  Slow module @nuxt/devtools took 8248.19ms to setup.                             3:13:09 pm

🚀 Building Advanced Diagram Detection System...                                                   
                             3:13:17 pm
√ Vite client built in 301ms                                                                       
                             3:13:20 pm

[3:13:20 pm]  ERROR  Pre-transform error: Failed to resolve import "~/assets/css/accessibility.css" from "virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs". Does the file exist?
  Plugin: vite:import-analysis
  File: virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:8        
  1  |  import "E:/naman/Documents/Cursor AI/Rankify/node_modules/tailwindcss/tailwind.css";       
  2  |  import "~/assets/css/accessibility.css";
     |          ^
  3  |  import "~/assets/css/responsive.css";

√ Vite server built in 2054ms                                                                      
                             3:13:22 pm
✅ Build completed successfully!                                                                   
                             3:13:22 pm

[3:13:23 pm]  ERROR  Pre-transform error: failed to resolve "extends":"apps/web/tsconfig.json" in E:\naman\Documents\Cursor AI\Rankify\tsconfig.json
  Plugin: vite:vue
  File: E:/naman/Documents/Cursor AI/Rankify/pages/index.vue?macro=true


[3:13:23 pm]  ERROR  Pre-transform error: failed to resolve "extends":"apps/web/tsconfig.json" in E:\naman\Documents\Cursor AI\Rankify\tsconfig.json
  Plugin: vite:vue
  File: E:/naman/Documents/Cursor AI/Rankify/pages/upload.vue?macro=true


[3:13:23 pm]  ERROR  Pre-transform error: failed to resolve "extends":"apps/web/tsconfig.json" in E:\naman\Documents\Cursor AI\Rankify\tsconfig.json
  Plugin: vite:vue
  File: E:/naman/Documents/Cursor AI/Rankify/app.vue

i Compiled plugins.server.mjs in 1194.97ms                                                         
                        nuxt 3:13:32 pm
√ Nuxt Nitro server built in 6693ms                                                                
                       nitro 3:13:32 pm
i Vite client warmed up in 16ms                                                                    
                             3:13:32 pm
i Compiled plugins.client.mjs in 2512.83ms                                                         
                        nuxt 3:13:34 pm
i Compiled types/plugins.d.ts in 4931.61ms                                                         
                        nuxt 3:13:36 pm
i Vite server warmed up in 5075ms                                                                  
                             3:13:38 pm
 ERROR  [request error] [unhandled] [GET] http://localhost:3001/                                   
                             3:13:38 pm

 
ℹ Error: Cannot find module '~/assets/css/accessibility.css' imported from 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.

- If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.
- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors

 ⁃ at ViteNodeRunner._resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:207:18)
 ⁃ at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
 ⁃ at async ViteNodeRunner.resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:232:11)
 ⁃ at async request (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:260:28)
 ⁃ (async E:/naman/Documents/Cursor AI/Rankify/virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:31)
 ⁃ at async ViteNodeRunner.runModule (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:397:4)
 ⁃ at async ViteNodeRunner.directRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:375:3)
 ⁃ at async ViteNodeRunner.cachedRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:189:11)
 ⁃ at async ViteNodeRunner.dependencyRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:239:10)
 ⁃ (async E:/naman/Documents/Cursor AI/Rankify/node_modules/nuxt/dist/app/entry.js:7:31)

[CAUSE]
Error {
  stack: "Cannot find module '~/assets/css/accessibility.css' imported from 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.\n" +
  '\n' +
  - If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.\n +
  "- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors\n" +
  'at ViteNodeRunner._resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:207:18)\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
  'at async ViteNodeRunner.resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:232:11)\n' +
  'at async request (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:260:28)\n' +
  'at async E:/naman/Documents/Cursor AI/Rankify/virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:31)\n' +
  'at async ViteNodeRu'... 558 more characters,
  message: "Cannot find module '~/assets/css/accessibility.css' imported from
  'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.\n"
  +

  '\n' +

  - If you rely on tsconfig.json's "paths" to resolve modules, please
  install "vite-tsconfig-paths" plugin to handle module resolution.\n +

  "- Make sure you don't have relative aliases in your Vitest config.
  Use absolute paths instead. Read more:
  https://vitest.dev/guide/common-errors",
  code: 'ERR_MODULE_NOT_FOUND',
  [Symbol(vitest.error.not_found.data)]: {
    id: '~/assets/css/accessibility.css',
    importer: 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs',   
  },
}
 ERROR  [request error] [unhandled] [GET] http://localhost:3001/                                   
                             3:13:38 pm


ℹ Error: Cannot find module '~/assets/css/accessibility.css' imported from 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.

- If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.
- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors

 ⁃ at ViteNodeRunner._resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:207:18)
 ⁃ at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
 ⁃ at async ViteNodeRunner.resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:232:11)
 ⁃ at async request (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:260:28)
 ⁃ (async E:/naman/Documents/Cursor AI/Rankify/virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:31)
 ⁃ at async ViteNodeRunner.runModule (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:397:4)
 ⁃ at async ViteNodeRunner.directRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:375:3)
 ⁃ at async ViteNodeRunner.cachedRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:189:11)
 ⁃ at async ViteNodeRunner.dependencyRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:239:10)
 ⁃ (async E:/naman/Documents/Cursor AI/Rankify/node_modules/nuxt/dist/app/entry.js:7:31)

[CAUSE]
Error {
  stack: "Cannot find module '~/assets/css/accessibility.css' imported from 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.\n" +
  '\n' +
  - If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.\n +
  "- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors\n" +
  'at ViteNodeRunner._resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:207:18)\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
  'at async ViteNodeRunner.resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:232:11)\n' +
  'at async request (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:260:28)\n' +
  'at async E:/naman/Documents/Cursor AI/Rankify/virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:31)\n' +
  'at async ViteNodeRu'... 558 more characters,
  message: "Cannot find module '~/assets/css/accessibility.css' imported from
  'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.\n"
  +

  '\n' +

  - If you rely on tsconfig.json's "paths" to resolve modules, please
  install "vite-tsconfig-paths" plugin to handle module resolution.\n +

  "- Make sure you don't have relative aliases in your Vitest config.
  Use absolute paths instead. Read more:
  https://vitest.dev/guide/common-errors",
  code: 'ERR_MODULE_NOT_FOUND',
  [Symbol(vitest.error.not_found.data)]: {
    id: '~/assets/css/accessibility.css',
    importer: 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs',   
  },
}
[3:13:38 pm]  ERROR  [request error] [unhandled] [GET] http://localhost:3001/__nuxt_error?error=true&url=%2F&statusCode=500&statusMessage=Server+Error&message=Cannot+find+module+%27~%2Fassets%2Fcss%2Faccessibility.css%27+imported+from+%27virtual:nuxt:E%253A%252Fnaman%252FDocuments%252FCursor%2520AI%252FRankify%252F.nuxt%252Fcss.mjs%27.%0A%0A-+If+you+rely+on+tsconfig.json%27s+%22paths%22+to+resolve+modules,+please+install+%22vite-tsconfig-paths%22+plugin+to+handle+module+resolution.%0A-+Make+sure+you+don%27t+have+relative+aliases+in+your+Vitest+config.+Use+absolute+paths+instead.+Read+more:+https:%2F%2Fvitest.dev%2Fguide%2Fcommon-errors&stack=Cannot+find+module+%27~%2Fassets%2Fcss%2Faccessibility.css%27+imported+from+%27virtual:nuxt:E%253A%252Fnaman%252FDocuments%252FCursor%2520AI%252FRankify%252F.nuxt%252Fcss.mjs%27.%0A%0A-+If+you+rely+on+tsconfig.json%27s+%22paths%22+to+resolve+modules,+please+install+%22vite-tsconfig-paths%22+plugin+to+handle+module+resolution.%0A-+Make+sure+you+don%27t+have+relative+aliases+in+your+Vitest+config.+Use+absolute+paths+instead.+Read+more:+https:%2F%2Fvitest.dev%2Fguide%2Fcommon-errors%0Aat+ViteNodeRunner._resolveUrl+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:207:18)%0Aat+process.processTicksAndRejections+(node:internal%2Fprocess%2Ftask_queues:105:5)%0Aat+async+ViteNodeRunner.resolveUrl+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:232:11)%0Aat+async+request+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:260:28)%0Aat+async+E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fvirtual:nuxt:E%253A%252Fnaman%252FDocuments%252FCursor%2520AI%252FRankify%252F.nuxt%252Fcss.mjs:2:31)%0Aat+async+ViteNodeRunner.runModule+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:397:4)%0Aat+async+ViteNodeRunner.directRequest+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:375:3)%0Aat+async+ViteNodeRunner.cachedRequest+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:189:11)%0Aat+async+ViteNodeRunner.dependencyRequest+(E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fvite-node%2Fdist%2Fclient.mjs:239:10)%0Aat+async+E:%2Fnaman%2FDocuments%2FCursor+AI%2FRankify%2Fnode_modules%2Fnuxt%2Fdist%2Fapp%2Fentry.js:7:31)


ℹ Error: Cannot find module '~/assets/css/accessibility.css' imported from 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.

- If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.
- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors

 ⁃ at ViteNodeRunner._resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:207:18)
 ⁃ at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
 ⁃ at async ViteNodeRunner.resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:232:11)
 ⁃ at async request (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:260:28)
 ⁃ (async E:/naman/Documents/Cursor AI/Rankify/virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:31)
 ⁃ at async ViteNodeRunner.runModule (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:397:4)
 ⁃ at async ViteNodeRunner.directRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:375:3)
 ⁃ at async ViteNodeRunner.cachedRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:189:11)
 ⁃ at async ViteNodeRunner.dependencyRequest (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:239:10)
 ⁃ (async E:/naman/Documents/Cursor AI/Rankify/node_modules/nuxt/dist/app/entry.js:7:31)

[CAUSE]
Error {
  stack: "Cannot find module '~/assets/css/accessibility.css' imported from 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.\n" +
  '\n' +
  - If you rely on tsconfig.json's "paths" to resolve modules, please install "vite-tsconfig-paths" plugin to handle module resolution.\n +
  "- Make sure you don't have relative aliases in your Vitest config. Use absolute paths instead. Read more: https://vitest.dev/guide/common-errors\n" +
  'at ViteNodeRunner._resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:207:18)\n' +
  '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
  'at async ViteNodeRunner.resolveUrl (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:232:11)\n' +
  'at async request (E:/naman/Documents/Cursor AI/Rankify/node_modules/vite-node/dist/client.mjs:260:28)\n' +
  'at async E:/naman/Documents/Cursor AI/Rankify/virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs:2:31)\n' +
  'at async ViteNodeRu'... 558 more characters,
  message: "Cannot find module '~/assets/css/accessibility.css' imported from
  'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs'.\n"
  +

  '\n' +

  - If you rely on tsconfig.json's "paths" to resolve modules, please
  install "vite-tsconfig-paths" plugin to handle module resolution.\n +

  "- Make sure you don't have relative aliases in your Vitest config.
  Use absolute paths instead. Read more:
  https://vitest.dev/guide/common-errors",
  code: 'ERR_MODULE_NOT_FOUND',
  [Symbol(vitest.error.not_found.data)]: {
    id: '~/assets/css/accessibility.css',
    importer: 'virtual:nuxt:E%3A%2Fnaman%2FDocuments%2FCursor%20AI%2FRankify%2F.nuxt%2Fcss.mjs',   
  },
}
