/* eslint-disable no-bitwise */
/* eslint-disable no-param-reassign */
const querystring = require('querystring');
const miniget = require('miniget');
const { getValueForKey, setKey } = require('./cache');

const swapHeadAndPosition = (arr, position) => {
    const first = arr[0];
    arr[0] = arr[position % arr.length];
    arr[position] = first;
    return arr;
};

const jsVarStr = '[a-zA-Z_\\$][a-zA-Z_0-9]*';
const jsSingleQuoteStr = '\'[^\'\\\\]*(:?\\\\[\\s\\S][^\'\\\\]*)*\'';
const jsDoubleQuoteStr = '"[^"\\\\]*(:?\\\\[\\s\\S][^"\\\\]*)*"';
const jsQuoteStr = `(?:${jsSingleQuoteStr}|${jsDoubleQuoteStr})`;
const jsKeyStr = `(?:${jsVarStr}|${jsQuoteStr})`;
const jsPropStr = `(?:\\.${jsVarStr}|\\[${jsQuoteStr}\\])`;
const jsEmptyStr = '(?:\'\'|"")';
const reverseStr = ':function\\(a\\)\\{'
    + '(?:return )?a\\.reverse\\(\\)'
    + '\\}';
const sliceStr = ':function\\(a,b\\)\\{'
    + 'return a\\.slice\\(b\\)'
    + '\\}';
const spliceStr = ':function\\(a,b\\)\\{'
    + 'a\\.splice\\(0,b\\)'
    + '\\}';
const swapStr = ':function\\(a,b\\)\\{'
    + 'var c=a\\[0\\];a\\[0\\]=a\\[b(?:%a\\.length)?\\];a\\[b(?:%a\\.length)?\\]=c(?:;return a)?'
    + '\\}';
const actionsObjRegexp = new RegExp(
    `var (${jsVarStr})=\\{((?:(?:${jsKeyStr}${reverseStr}|${jsKeyStr}${sliceStr}|${jsKeyStr}${spliceStr}|${jsKeyStr}${swapStr
    }),?\\r?\\n?)+)\\};`
);
const actionsFuncRegexp = new RegExp(`${`function(?: ${jsVarStr})?\\(a\\)\\{`
    + `a=a\\.split\\(${jsEmptyStr}\\);\\s*`
    + `((?:(?:a=)?${jsVarStr}`}${jsPropStr
}\\(a,\\d+\\);)+)`
    + `return a\\.join\\(${jsEmptyStr}\\)`
    + '\\}');
const reverseRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${reverseStr}`, 'm');
const sliceRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${sliceStr}`, 'm');
const spliceRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${spliceStr}`, 'm');
const swapRegexp = new RegExp(`(?:^|,)(${jsKeyStr})${swapStr}`, 'm');

function decipher(tokens, sig) {
    sig = sig.split('');
    for (let i = 0, len = tokens.length; i < len; i++) {
        const token = tokens[i]; let
            pos;
        // eslint-disable-next-line default-case
        switch (token[0]) {
        case 'r':
            sig = sig.reverse();
            break;
        case 'w':
            pos = ~~token.slice(1);
            sig = swapHeadAndPosition(sig, pos);
            break;
        case 's':
            pos = ~~token.slice(1);
            sig = sig.slice(pos);
            break;
        case 'p':
            pos = ~~token.slice(1);
            sig.splice(0, pos);
            break;
        }
    }
    return sig.join('');
}

function extractActions(body) {
    const objResult = actionsObjRegexp.exec(body);
    const funcResult = actionsFuncRegexp.exec(body);
    if (!objResult || !funcResult) { return null; }

    const obj = objResult[1].replace(/\$/g, '\\$');
    const objBody = objResult[2].replace(/\$/g, '\\$');
    const funcBody = funcResult[1].replace(/\$/g, '\\$');

    let result = reverseRegexp.exec(objBody);
    const reverseKey = result && result[1]
        .replace(/\$/g, '\\$')
        .replace(/\$|^'|^"|'$|"$/g, '');
    result = sliceRegexp.exec(objBody);
    const sliceKey = result && result[1]
        .replace(/\$/g, '\\$')
        .replace(/\$|^'|^"|'$|"$/g, '');
    result = spliceRegexp.exec(objBody);
    const spliceKey = result && result[1]
        .replace(/\$/g, '\\$')
        .replace(/\$|^'|^"|'$|"$/g, '');
    result = swapRegexp.exec(objBody);
    const swapKey = result && result[1]
        .replace(/\$/g, '\\$')
        .replace(/\$|^'|^"|'$|"$/g, '');

    const keys = `(${[reverseKey, sliceKey, spliceKey, swapKey].join('|')})`;
    const myreg = `(?:a=)?${obj
    }(?:\\.${keys}|\\['${keys}'\\]|\\["${keys}"\\])`
        + '\\(a,(\\d+)\\)';
    const tokenizeRegexp = new RegExp(myreg, 'g');
    const tokens = [];
    // eslint-disable-next-line no-cond-assign
    while ((result = tokenizeRegexp.exec(funcBody)) !== null) {
        const key = result[1] || result[2] || result[3];
        // eslint-disable-next-line default-case
        switch (key) {
        case swapKey:
            tokens.push(`w${result[4]}`);
            break;
        case reverseKey:
            tokens.push('r');
            break;
        case sliceKey:
            tokens.push(`s${result[4]}`);
            break;
        case spliceKey:
            tokens.push(`p${result[4]}`);
            break;
        }
    }
    return tokens;
}

function exposedMiniget(url, options = {}, requestOptionsOverwrite) {
    const req = miniget(url, requestOptionsOverwrite || options.requestOptions);
    if (typeof options.requestCallback === 'function') options.requestCallback(req);
    return req;
}

async function getCacheTokens(html5playerfile, options) {
    const cachedTokens = await getValueForKey(html5playerfile);
    if (cachedTokens) {
        return cachedTokens;
    }

    const body = await exposedMiniget(html5playerfile, options).text();
    const tokens = extractActions(body);
    if (!tokens || !tokens.length) {
        throw Error('Could not extract signature deciphering actions');
    }

    setKey(html5playerfile, tokens);

    return tokens;
}

const getTokens = (html5playerfile, options) => getCacheTokens(html5playerfile, options);

async function decipherFormats(formats, html5player, options) {
    const decipheredFormats = {};
    const tokens = await getTokens(html5player, options);
    formats.forEach((format) => {
        const cipher = format.signatureCipher || format.cipher;
        if (cipher) {
            Object.assign(format, querystring.parse(cipher));
            // eslint-disable-next-line no-param-reassign
            delete format.signatureCipher;
            // eslint-disable-next-line no-param-reassign
            delete format.cipher;
        }
        const sig = tokens && format.s ? decipher(tokens, format.s) : null;
        // exports.setDownloadURL(format, sig);
        decipheredFormats[format.url] = format;
    });
    return decipheredFormats;
}

module.exports = {
    decipherFormats
};
