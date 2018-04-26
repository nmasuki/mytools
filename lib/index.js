/**
 * Created by nmasuki on 2/5/2018.
 * Bootstrap the libraries
 */

require('./common/polyfills');
var fs = require('fs');
var libs = {};
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
            return console._libName;
        },
        set: function (value) {
            if (value)
                console.prompt = `${value.toLowerCase()}>`
            console._libName = value;
        }
    });

if (!console.action)
    Object.defineProperty(console, 'action', {
        get: function () {
            return console.lib[console.actionName];
        }
    });

if (!console.lib)
    Object.defineProperty(console, 'lib', {
        get: function () {
            var param = console.args.first(a => typeof a == "string") || "";
            var _lib = libs[console.libName + param] || libs[console.libName];
            if (typeof _lib == "function" && console.args) {
                _lib = libs[console.libName] = libs[console.libName + param] = new _lib(param);
            }
            return _lib;
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
            var lib = require(file);
            if (typeof lib == "function") {
                var i = "";
                var filename = file.split('/').last().split('.').first();
                while (libs[filename + i])
                    i = parseInt("0" + i) + 1;

                libs[filename + i] = lib;
            } else {
                libs = Object.assign(libs, lib);
            }
        } else if (!f.startsWith('.') && stats.isDirectory()) {
            loadLibs(s + '/' + f)
        }
    });
})(__dirname);

var keys = Object.keys(libs);
console.log("Loaded " + keys.length + " libs:", `[${keys.join(',')}]`)

module.exports = libs;