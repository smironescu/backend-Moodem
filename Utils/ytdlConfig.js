const HttpsProxyAgent = require('https-proxy-agent');
const miniget = require('miniget');
const { COOKIE } = require('./constants');
const { makeRandomChars, getFirefoxUserAgent } = require('./generators');

const proxy = process.env.http_proxy || 'http://143.110.219.91:3000';
const agent = HttpsProxyAgent(proxy);

const HEADERS = {
    Cookie: COOKIE,
    'x-youtube-client-version': '2.20191008.04.01',
    'x-youtube-client-name': '1',
    'x-client-data': '',
    'x-youtube-identity-token': 'QUFFLUhqbWtBX080QlRLNkQ3R2E2RXBWZGtXZFVjd1JuZ3w\u003d',
    'Accept-Encoding': 'identity;q=1, *;q=0',
    'User-Agent': getFirefoxUserAgent(),
    referer: `https://${makeRandomChars(6)}.com`
};

miniget.defaultOptions.headers = HEADERS;

const OPTIONS = {
    requestOptions: {
        headers: HEADERS
    }
};

module.exports = {
    HEADERS,
    OPTIONS
};
