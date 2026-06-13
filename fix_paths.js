const fs = require('fs');
const path = require('path');

const pagesDir = path.resolve(__dirname, 'pages');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // HTML specific replacements
            if (fullPath.endsWith('.html')) {
                // Fix ../../styles.css -> /styles.css
                if (content.includes('../../styles.css')) {
                    content = content.replace(/\.\.\/\.\.\/styles\.css/g, '/styles.css');
                    modified = true;
                }

                // Fix ../../userdata.js -> /userdata.js
                if (content.includes('../../userdata.js')) {
                    content = content.replace(/\.\.\/\.\.\/userdata\.js/g, '/userdata.js');
                    modified = true;
                }

                // Fix folder.css -> /pages/folder/folder.css
                const folderName = path.basename(dir);
                const cssFile = `${folderName}.css`;
                if (content.includes(`href="${cssFile}"`)) {
                    content = content.replace(new RegExp(`href="${cssFile}"`, 'g'), `href="/pages/${folderName}/${cssFile}"`);
                    modified = true;
                }

                // Fix folder.js -> /pages/folder/folder.js
                const jsFile = `${folderName}.js`;
                if (content.includes(`src="${jsFile}"`)) {
                    content = content.replace(new RegExp(`src="${jsFile}"`, 'g'), `src="/pages/${folderName}/${jsFile}"`);
                    modified = true;
                }
            }

            // Fix ../ navigation links in HTML and JS (e.g. window.location.href = '../login/login.html')
            // Matches ../folder/file.html and converts to /pages/folder/file.html
            const navRegex = /\.\.\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\.html/g;
            if (navRegex.test(content)) {
                content = content.replace(navRegex, '/pages/$1/$2.html');
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(pagesDir);
console.log("Path replacements done.");
