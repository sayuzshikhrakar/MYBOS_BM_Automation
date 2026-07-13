const fs = require('fs');
const glob = require('glob');
const files = glob.sync('test/specs/**/*.js');
let updatedCount = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('adb -s PRVKMJCEJ7PZGM69')) {
        content = content.replace(/require\('child_process'\)\.execSync\('adb -s PRVKMJCEJ7PZGM69 (.*?)'\)/g,
        `(() => {
            const activeUdid = driver.capabilities['appium:udid'] || driver.capabilities.udid || 'PRVKMJCEJ7PZGM69';
            return require('child_process').execSync(\`adb -s \${activeUdid} $1\`);
        })()`);
        fs.writeFileSync(file, content);
        updatedCount++;
    }
}
console.log('Updated ' + updatedCount + ' files.');
