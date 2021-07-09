/* eslint-disable no-continue */
function makeRandomChars(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random()
      * charactersLength));
    }
    return result;
}

function getFirefoxUserAgent() {
    const date = new Date();
    const version = `${(date.getFullYear() - 2018) * 4 + Math.floor(date.getMonth() / 4) + 58}.0`;
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version} Gecko/20100101 Firefox/${version}`;
}

function assign(target, source) {
    if (!target || !source) { return target || source; }
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of Object.entries(source)) {
        if (value !== null && value !== undefined) {
            // eslint-disable-next-line no-param-reassign
            target[key] = value;
        }
    }
    return target;
}

function between(haystack, left, right) {
    let pos;
    if (left instanceof RegExp) {
        const match = haystack.match(left);
        if (!match) { return ''; }
        pos = match.index + match[0].length;
    } else {
        pos = haystack.indexOf(left);
        if (pos === -1) { return ''; }
        pos += left.length;
    }
    // eslint-disable-next-line no-param-reassign
    haystack = haystack.slice(pos);
    pos = haystack.indexOf(right);
    if (pos === -1) { return ''; }
    // eslint-disable-next-line no-param-reassign
    haystack = haystack.slice(0, pos);
    return haystack;
}

function cutAfterJSON(mixedJson) {
    let open; let
        close;
    if (mixedJson[0] === '[') {
        open = '[';
        close = ']';
    } else if (mixedJson[0] === '{') {
        open = '{';
        close = '}';
    }

    if (!open) {
        throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);
    }

    // States if the loop is currently in a string
    let isString = false;

    // States if the current character is treated as escaped or not
    let isEscaped = false;

    // Current open brackets to be closed
    let counter = 0;

    let i;
    for (i = 0; i < mixedJson.length; i++) {
        // Toggle the isString boolean when leaving/entering string
        if (mixedJson[i] === '"' && !isEscaped) {
            isString = !isString;
            continue;
        }

        // Toggle the isEscaped boolean for every backslash
        // Reset for every regular character
        isEscaped = mixedJson[i] === '\\' && !isEscaped;

        if (isString) continue;

        if (mixedJson[i] === open) {
            counter++;
        } else if (mixedJson[i] === close) {
            counter--;
        }

        // All brackets have been closed, thus end of JSON is reached
        if (counter === 0) {
        // Return the cut JSON
            return mixedJson.substr(0, i + 1);
        }
    }

    // We ran through the whole string and ended up with an unclosed bracket
    throw Error("Can't cut unsupported JSON (no matching closing bracket found)");
}

function deprecate(obj, prop, value, oldPath, newPath) {
    Object.defineProperty(obj, prop, {
        get: () => {
            console.warn(`\`${oldPath}\` will be removed in a near future release, use \`${newPath}\` instead.`);
            return value;
        }
    });
}

module.exports = {
    makeRandomChars,
    getFirefoxUserAgent,
    assign,
    between,
    cutAfterJSON,
    deprecate
};
