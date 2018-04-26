var args = [];
const libs = require("./lib");
const readline = require("readline");
const defaultLib = Object.keys(libs).find(l => l.toLowerCase().trim() == 'eular');

//Allow navigation
global.rl = readline.createInterface(process.stdin, process.stdout, null);

function runAction(_action, _args) {
    if (console.lib) {
        var fn = selectAction(_action);
        if (typeof fn == "function") {
            _args = _args || console.args || {};
            _args = Object.keys(_args).filter(k => !isNaN(k)).map(k => _args[k]);
            console.log(`Running '${console.libName}.${_action}(${_args.join(', ')})'..`);
            _args.push(console.log);
            var results = fn.apply(console.lib, _args);
            if (results)
                console.log(results);
        }
        else {
            console.log(`Action '${_action}' in lib '${console.libName}' is not implemented!!`);
        }
    } else {
        console.log(`Lib '${console.libName}' is not implemented!!`);
    }
}

function selectAction(_action) {
    _action = Object.keys(console.lib).find(l => l.toLowerCase().trim() == _action);
    return console.lib[_action];
}

function getArguments(line, index) {
    line = '"' + (line || "").trim("\"") + '"'
    var args = [], key = "";
    var parts = line.trim().splitArgs().filter(p => p);
    var _actionName, _libName;
    for (var i = (index || 0); i < parts.length; i++) {
        var value = parts[i];
        if (value) {
            if (key) {
                if (['a', 'action'].contains(key))
                    _actionName = value;
                else if (['l', 'lib'].contains(key))
                    _libName = Object.keys(libs).find(l => l.toLowerCase().trim() == value.toLowerCase().trim()) || value;
                else {
                    if (typeof args[0] != "object")
                        args.unshift({})
                    args[0][key] = value;
                }

                key = null;
            } else if (value.startsWith("-")) {
                key = value.substr(1);
            } else {
                args.push(value);
            }
        }
    }

    if (!_actionName && args.length >= 1) {
        _actionName = args.first(a => typeof a == "string");
        var index = args.indexOf(_actionName);
        args.splice(index, 1);
    }

    if (_actionName)
        args.actionName = _actionName;

    if (_libName)
        args.libName = _libName;

    return Object.assign({}, args);
}

if (process.argv.length) {
    args = getArguments(process.argv.join("\" \""), 2);

    if (args.libName)
        console.libName = args.libName;

    if (args.actionName)
        console.actionName = args.actionName;

    if (!console.args)
        console.args = Object.keys(args).filter(k => !isNaN(k)).map(k => args[k]);
    ;

    /*
     if (!console.libName)
     console.libName = defaultLib;

     if (!console.actionName && console.libName == defaultLib)
     console.actionName = 'last';
     */

    if (console.actionName) {
        runAction(console.actionName, args);
    } else {
        var _args = Object.keys(args).filter(k => !isNaN(k)).map(k => args[k]);
        if (console.lib) {
            _args.unshift(`Please select an action: [${Object.keys(console.lib).filter(k => typeof console.lib[k] == "function").sort().join(",")}]`);
        } else {
            _args.unshift(`Please select a library: [${Object.keys(libs).join(",")}]`);
        }
        console.log.apply(this, _args)
    }
}

rl.on("line", function bye(line) {
    line = (line || "").toString().trim();
    if (line && !console.asking) {
        var actionKeys = console.lib ? Object.keys(console.lib).filter(k => typeof console.lib[k] == "function").sort() : [];
        var libKeys = (libs ? Object.keys(libs) : []);
        if (["bye", "exit"].contains(line)) {
            rl.close();
            process.exit();
        } else if (["?", "/?"].contains(line)) {
            if (console.lib)
                console.log(`Available actions! [${actionKeys.join(', ')}]`);
            else
                console.log(`Available libs! [${Object.keys(libs).join(', ')}]`);
        } else {
            var parts = line.splitArgs().filter(p => p);
            var fnmatch = (l => l.toLowerCase().trim() == parts.first().toLowerCase().trim());
            if (parts && !parts.length)
                console.log(`Invalid input '${line}'!`);
            else if (libKeys.contains(fnmatch)) {
                var libName = libKeys.find(fnmatch);
                console.log(`Selecting lib '${parts.first()}'.`);
                console.libName = libName;
            }
            else if (actionKeys.contains(fnmatch)) {
                var actionName = actionKeys.find(fnmatch);
                console.actionName = actionName;
                console.log(`Running action '${parts.first()}'.`);
                runAction(parts[0], parts.slice(1));
            }
            else {
                console.log(`Could not find action: '${parts.first()}' in lib '${console.libName}'`);
            }
        }
    } else {
        console.log(line);
    }
});

