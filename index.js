global.args = [];
const libs = require("./lib");
const defaultLib = Object.keys(libs).find(l => l.toLowerCase().trim() == 'eular');

function runAction(_action, _args) {
    if (console.lib) {
        var fn = selectAction(_action);
        if (typeof fn == "function") {
            _args = _args || console.args || {};
            _args = Object.keys(_args)
                .filter(k => !isNaN(k)).map(k => _args[k])
                .filter(a => typeof a != "function");

            console.log(`Running '${console.libName}.${_action}(${_args.join(', ')})'..`);
            try{
                var results = fn.apply(console.lib, _args);
                if (results) {
                    if (results.constructor == Promise)
                        results.finally(console.log);
                    else
                        console.log(results);
                }
            }catch(e){
                
            }
        } else {
            console.log(`Action '${_action}' in lib '${console.libName}' is not implemented!!`);
        }
    } else {
        console.log(`Lib '${console.libName}' is not implemented!!`);
    }
}

function selectAction(_action) {
    _action = Object.keys(console.lib).find(l => l.toLowerCase().trim() == _action.toLowerCase().trim());
    return console.lib[_action];
}

function getArguments(line, index) {
    line = '"' + (line || "").trim("\"") + '"'
    var args = [],
        key = "",
        argsObj = {};
    var parts = line.trim().splitArgs().filter(p => p);
    var _actionName, _libName;
    for (var i = (index || 0); i < parts.length; i++) {
        var value = parts[i];
        if (value) {
            if (value.startsWith("-")) {
                key = value.substr(1);
                argsObj[key[0]] = true;
            } else if (key) {
                if (['a', 'action'].any(k => key == k))
                    _actionName = value;
                else if (['l', 'lib'].any(k => key == k))
                    _libName = Object.keys(libs).find(l => l.toLowerCase().trim() === value.toLowerCase().trim()) || value;
                else {
                    if (typeof args[0] !== "object")
                        args.unshift({});
                    args[0][key] = value;
                }

                key = null;
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
        argsObj.actionName = _actionName;

    if (_libName)
        argsObj.libName = _libName;

    //if (_actionName && _libName)
    //    argsObj.s = true;

    return Object.assign(argsObj, args);
}

if (process.argv.length) {
    args = getArguments(process.argv.join("\" \""), 2);

    if (args.libName)
        console.libName = args.libName;

    if (args.actionName)
        console.actionName = args.actionName;

    if (!console.args)
        console.args = Object.keys(args).filter(k => !isNaN(k)).map(k => args[k]);

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

//Allow navigation
if (!args.s) {
    global.rl = require("readline").createInterface(process.stdin, process.stdout, null);
    if (global.rl) {
        global.rl.on("line", function bye(line) {
            line = (line || "").toString().trim();
            if (line && !console.asking) {
                var actionKeys = console.lib ? Object.keys(console.lib).filter(k => typeof console.lib[k] == "function").sort() : [];
                var libKeys = (libs ? Object.keys(libs) : []);
                if (["bye", "exit"].any(k => line == k)) {
                    if (rl) rl.close();
                    process.exit();
                } else if (["?", "/?"].any(k => line == k)) {
                    if (console.lib)
                        console.log(`Available actions! [${actionKeys.join(', ')}]`);
                    else
                        console.log(`Available libs! [${Object.keys(libs).join(', ')}]`);
                } else {
                    var parts = line.splitArgs().filter(p => p);
                    var fnmatch = (l => l.toLowerCase().trim() == parts.first().toLowerCase().trim());
                    if (parts && !parts.length)
                        console.log(`Invalid input '${line}'!`);
                    else if (libKeys.any(fnmatch)) {
                        var libName = libKeys.find(fnmatch);
                        console.log(`Selecting lib '${parts.first()}'.`);
                        console.libName = libName;
                    } else if (actionKeys.any(fnmatch)) {
                        var actionName = actionKeys.find(fnmatch);
                        console.actionName = actionName;
                        console.log(`Running action '${parts.first()}'.`);
                        runAction(parts[0], parts.slice(1));
                    } else {
                        console.log(`Could not find action: '${parts.first()}' in lib '${console.libName}'! Use:` + actionKeys.join(","));
                    }
                }
            } else {
                console.log(line);
            }
        });
    }
}