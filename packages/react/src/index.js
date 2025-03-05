import fs from 'fs';
import path from 'path';

const vitePluginFileRouterReact = () => {
    return {
        name: 'vite-plugin-file-router-react',
        resolveId(source, importer) {
            if(source === 'virtual:react-router') 
                return 'virtual:react-router'           
        },
        load(id) {
            if(id === 'virtual:react-router') {
                return generateRouterByFile();
            }
        }
    }
}


function generateRouterByFile() {
    const routes = [];
    const files = fs.readdirSync(path.resolve(__dirname, 'src/pages'));
    files.forEach(file => {
        const filePath = path.resolve(__dirname, 'src/pages', file);
        const stat = fs.statSync(filePath);
        if(stat.isDirectory()) {
            const subFiles = fs.readdirSync(filePath);
           subFiles.forEach(subFile => {})
        }
    })
}

export default vitePluginFileRouterReact;