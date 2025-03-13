import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { normalizePath } from 'vite';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

export const VitePluginFileRouterVue = async() => {
    //获取当前views目录
    const viewsDir = normalizePath(path.resolve(process.cwd(), 'src/views'));
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

      function generateChildren(paths) {
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
        return paths.filter(item=>{
            return !delpaths.includes(item.path)
        })
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
        
        code += `\n];\n`;
        code += `const router = createRouter({\n  history: createWebHistory(),\n  routes,\n});\n`;
        code += `export default router;`;
        // console.log(code);
        return code;
    }
      
    
    const paths = await generatePaths(viewsDir);
    const pathWithChildren = generateChildren(paths);
    // generateRoutes(pathWithChildren);

    // console.log(JSON.stringify(pathWithChildren))


    return {
        name: 'vite-plugin-file-router-react',
        resolveId(source, importer) {
            if(source === 'virtual:vue-router') 
                return 'virtual:vue-router'           
        },
        load(id) {
            if(id === 'virtual:vue-router') {
                return generateRoutes(pathWithChildren);
            }
        }
    }
}