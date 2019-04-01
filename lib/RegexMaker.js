function simplifyRegex(array) {
    var res = [], last = null;
    
    for (var i = array.length - 1; i >= 0; i--) {
        if (last && last.regex == array[i]) {
            last.count += 1;
        }else{
            if(last) res.unshift(last);
            last = {regex: array[i], count: 1};
        }
    }

    return res.map(r => `${r.regex}{${r.count}}`).join('');
}

function getRegexStrings(input) {
    if (!input) return [];
    
    var regex = [input.escapeRegExp()];
    var array = input.split('');
    for (var i = array.length; i >= 0; i--) {
        var matched = false;
        if (/[0-9]/.test(array[i])) {
            array[i] = "[0-9]";
            matched = true;
        } else if (/[a-zA-Z]/.test(array[i])) {
            array[i] = "[a-zA-Z]";
            matched = true;
        } else if (array[i]) {
            array[i] = array[i].escapeRegExp();
        } else {
            array[i] = "";
        }

        if (matched)
            regex.unshift(simplifyRegex(array));        
    }

    return regex.orderByDescending(r=>r.length);
}

module.exports = {
    toRegex: getRegexStrings
};