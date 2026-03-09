const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/User-3/Projects/BTGS/TGS FRONTEND/src/pages/';

let count = 0;
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.jsx')) {
        let filepath = path.join(dir, file);
        let content = fs.readFileSync(filepath, 'utf8');

        // Target: <h1>Title</h1> \n <p>Subtitle description...</p>
        let regex = /(<h1>[\s\S]*?<\/h1>)\s*<p>[^<]*<\/p>/g;
        let newContent = content.replace(regex, '$1');

        if (content !== newContent) {
            fs.writeFileSync(filepath, newContent);
            console.log('Updated', file);
            count++;
        }
    }
});
console.log(`Finished checking. Updated ${count} files.`);
