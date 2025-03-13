import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { normalizePath } from 'vite';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export const VitePluginFileRouterVue = async(options = {
    viewsPath : 'src/views'
}) => {
    //获取当前views目录
    const viewsDir = normalizePath(path.resolve(process.cwd(), options.viewsPath));
    const vModuleId = 'virtual:vue-router';
    const resolvedVModuleId = '\0' + vModuleId;
    async function generatePaths(viewsDir) {
        let paths = [];
        
        async function scanDir(currentDir, depth = 0) {
          try {
            const files = await readdir(currentDir);
            
            for (const file of files) {
              const filePath = path.join(currentDir, file);
              const stats = await stat(filePath);
      
              if (stats.isDirectory()) {
                await scanDir(filePath, depth + 1);
              } else if (filePath.endsWith('.vue')) {
                const routeName = path.basename(filePath, '.vue');
                paths.push({
                  path: normalizePath(filePath),
                  depth,
                  name: routeName === 'index' ? 
                    path.basename(path.dirname(filePath)) : 
                    routeName,
                    children: []
                });
              }
            }
          } catch (err) {
            console.error('扫描目录出错:', err);
          }
        }
      
        await scanDir(viewsDir);
        return paths;
      }

      function remove403And404(paths){
        return paths.filter(item=>{
            return !['403.vue','404.vue'].includes(item.name)
        })
      }

      function generateChildren(paths) {
        //需要删除的path对象
        const delpaths = [];
        for (let i = 0; i < paths.length; i++){
            const parentPath = normalizePath(path.resolve(paths[i].path,"../../index.vue"));
            if(paths[i].depth>=2){
                paths.map(item=>{
                    if(item.path === parentPath){
                        item.children.push(paths[i]);
                        delpaths.push(paths[i].path);
                    }
                })
            }
        }

        return  paths.filter(item=>{
            return !delpaths.includes(item.path)&&!['403','404'].includes(item.name)
        });
      }

      function generateRoutes(pathWithChildren) {
        function generateRoute(route, indentLevel) {
            const baseIndent = '  '.repeat(indentLevel);
            const propIndent = baseIndent + '  ';
            let routeStr = `\n${baseIndent}{`;
            
            // 处理path
            const processedPath = route.path.replace(viewsDir, '').replace(/\/index\.vue$/, '');
            routeStr += `\n${propIndent}path: '${processedPath}',`;
            
            // 处理name
            routeStr += `\n${propIndent}name: '${route.name}',`;
            
            // 处理component
            const componentPath = route.path.replace(/\\/g, '/');
            routeStr += `\n${propIndent}component: () => import('${componentPath}'),`;
            
            // 递归处理children
            if (route.children && route.children.length > 0) {
                routeStr += `\n${propIndent}children: [`;
                route.children.forEach(child => {
                    routeStr += generateRoute(child, indentLevel + 2);
                });
                routeStr += `\n${propIndent}]`;
            }
            
            routeStr += `\n${baseIndent}},`;
            return routeStr;
        }
    
        let code = `import { createRouter, createWebHistory } from 'vue-router';\n`;
        code += `const routes = [`;
        
        pathWithChildren.forEach(path => {
            code += generateRoute(path, 1); // 初始缩进层级为1（2空格）
        });

        const Has403 = fs.existsSync(path.resolve(viewsDir, '403.vue'));
        const Has404 = fs.existsSync(path.resolve(viewsDir, '404.vue'));
        //403
        if(Has403){
          code += `\n  {`;
          code += `\n    path: '/403',`;
          code += `\n    name: '403',`;
          code += `\n    component: () => import('${normalizePath(path.resolve(viewsDir, '403.vue'))}'),`;
          code += `\n  },`;
        }

        //404路由
        if(Has404){
          code += `\n  {`;
          code += `\n    path: '/:pathMatch(.*)*',`;
          code += `\n    name: '404',`;
          code += `\n    component: () => import('${normalizePath(path.resolve(viewsDir, '404.vue'))}'),`;
          code += `\n  },`;
        }
        
        code += `\n];\n`;
        code += `const router = createRouter({\n  history: createWebHistory(),\n  routes,\n});\n`;
        code += `export default router;`;
        console.log(code);
        return code;
    }

    //生成路由的主函数
    async function getResultCode() {
      const paths = await generatePaths(viewsDir);
      const pathWithChildren = generateChildren(paths);
      return generateRoutes(pathWithChildren);
    }


    return {
        name: 'vite-plugin-file-router-react',
        resolveId(source, importer) {
            if(source === vModuleId) 
                return resolvedVModuleId;           
        },
        async load(id) {
            if(id === resolvedVModuleId) {
                return getResultCode();
            }
        },
        configureServer(server) {
          const handleupdate = async (path) => {
            if(normalizePath(path).startsWith(viewsDir)) {
                // const resultCode = await getResultCode();
                const module = server.moduleGraph.getModuleById(resolvedVModuleId);
                if(module){
                  console.log(`${viewsDir}下有文件更新了`)
                  server.moduleGraph.invalidateModule(module);
                  server.ws.send({
                    type: 'update',
                    path: vModuleId,
                    acceptedPath: vModuleId,
                    timestamp: Date.now(),
                  })
                }
            }
        }
            server.watcher.on('add',handleupdate);
            server.watcher.on('unlink', handleupdate);
        }
    }
}