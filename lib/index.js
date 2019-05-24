/**
 * Created by nmasuki on 2/5/2018.
 * Bootstrap the libraries
 */

require('./common/polyfills');
var fs = require('fs');
var libFiles = {};

console.prompt = 'mytools>';

if (!console.actionName)
    Object.defineProperty(console, 'actionName', {
        get: function () {
            return console._actionName;
        },
        set: function (value) {
            console._actionName = value;
        }
    });

if (!console.libName)
    Object.defineProperty(console, 'libName', {
        get: function () {
            var libName = Object.keys(libFiles).find(k => k && k.toLowerCase().startsWith((console._libName || "").toLowerCase()));
            return libName || console._libName;
        },
        set: function (value) {
            if (value)
                console.prompt = `${value.toLowerCase()}>`;
            var libName = Object.keys(libFiles).find(k => k && k.toLowerCase().startsWith((value || "").toLowerCase()));
            console._libName = libName || value;
        }
    });

if (!console.action)
    Object.defineProperty(console, 'action', {
        get: function () {
            return console.lib? console.lib[console.actionName]: null;
        }
    });

if (!console.lib)
    Object.defineProperty(console, 'lib', {
        get: function () {
            var param = (console.args || []).first(a => typeof a === "string") || "";
            var libFile = libFiles[console.libName + param] || libFiles[console.libName],
                _lib = libFile ? require(libFile) : null;
                
            _lib = _lib[console.libName + param] || _lib[console.libName] || _lib;

            return typeof _lib === "function" ? new _lib(param) : _lib;
        }
    });

(function loadLibs(s) {
    if (s.trim("\\/").endsWith('/helpers')) return;

    console.log("Loading: ", s);
    var files = fs.readdirSync(s)
        .filter(f => !f.endsWith('index.js'));

    files.forEach(f => {
        var file = s + '/' + f;
        var stats = fs.lstatSync(file);
        if (stats.isDirectory())
            file = `${file}/index.js`;

        if (fs.existsSync(file) && /(.js)$/i.test(file)) {
            var i = "";
            var filename = file.split('/').last().split('.').first();
            while (libFiles[filename + i])
                i = parseInt(i || '0') + 1;

            if (["index", "polyfills"].indexOf(filename + i) < 0)
                libFiles[filename + i] = file;

        } else if (!f.startsWith('.') && stats.isDirectory()) {
            loadLibs(s + '/' + f)
        }
    });
})(__dirname);

var keys = Object.keys(libFiles);
console.log("Loaded " + keys.length + " libs! " + keys.join(","));

module.exports = libFiles;