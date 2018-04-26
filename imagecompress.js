const fs = require('fs');
const {exec} = require('child_process');
const {fork} = require('child_process');
// console.log(process.argv);
// return;


function compressDir(s, d, callback) {
    if (d && !fs.existsSync(d))
        fs.mkdirSync(d);

    fs.readdir(s, function (err, files) {
        if (err) throw err;
        var i = 0;

        (function processNextFile() {
            if (i < files.length) {
                console.log(`Processing ${i+1} of ${files.length}.`)

                var a = files[i++];
                var stats = fs.lstatSync(s + '\\' + a);
                if (stats.isDirectory()) {
                    if (!/(Compressed)$/.test(a))
                        compressDir(s + '\\' + a, d + '\\' + a, processNextFile);
                    else
                        processNextFile();
                }
                else if (/\.(jpeg|jpg)/i.test(a)) {
                    compressImage(s + '\\' + a, d + '\\' + a, processNextFile);
                }
                else {
                    if (d && !fs.existsSync(d + '\\Others\\')) fs.mkdirSync(d + '\\Others\\');
                    if(/\.(mov|mpeg)/i.test(a))
                        exec(`ffmpeg -i "${s + '\\' + a}" "${d + '\\Others\\' + a}" && del \q "${s + '\\' + a}"`)
                    else
                        exec(`move "${s + '\\' + a}" "${d + '\\Others\\' + a}"`)
                    processNextFile();
                }
            } else if (typeof callback == "function")
                callback();
        })();

    });
}

function compressImage(src, dest, next, error) {
    var random = Math.floor(Math.random() * 100000);
    var tmp = '%temp%\\' + new Date().getTime() + random + '.JPG';
    var cmd = [
        `magick "${src}" -auto-orient "${tmp}"`, //Auto rotate
        `ffmpeg -i "${tmp}" -vf scale=iw*1:ih "${dest}"`
    ].join(" && ");

    if (!fs.existsSync(dest))
        exec(cmd, (err, stdout, stderr) => {
            exec(`del \q "${tmp}"`);

            if (err) {
                if (typeof error === "function")
                    error(err);
            }

            if (typeof next === "function")
                next();

            // the *entire* stdout and stderr (buffered)
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
        });
    else {
        console.log("A file '" + dest + "' already exists!!");
        if (typeof next === "function")
            next();
    }
}

const srcDir = process.argv[2] || 'C:\\Users\\nmasuki\\Pictures\\Chaka Ranch';
const destDir = process.argv[3] || srcDir + '-Compressed';

compressDir(srcDir, destDir, function () {
    console.log("Convertion done!!");
    var cmd = [
        'rmdir "' + srcDir + '"  /s /q', //Remove src
        'rename "' + destDir + '" "' + srcDir + '"' //Rename dest
    ].join(" && ");
    exec(cmd, (err, stdout, stderr) => {
        if (err)
            console.log('err:', err);

        // the *entire* stdout and stderr (buffered)
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
    });
});