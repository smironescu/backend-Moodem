/* eslint-disable no-param-reassign */
const miniget = require('miniget');
const querystring = require('querystring');
const youtubedl = require('youtube-dl');
const {
    assign, between, cutAfterJSON, deprecate
} = require('./generators');
const { getValueForKey, setKey } = require('./cache');
const { decipherFormats } = require('./sig');
const FORMATS = require('./formats');

const BASE_URL = 'https://www.youtube.com/watch?v=';
const EMBED_URL = 'https://www.youtube.com/embed/';
const INFO_HOST = 'www.youtube.com';
const INFO_PATH = '/get_video_info';
const VIDEO_EURL = 'https://youtube.googleapis.com/v/';
const CVER = '2.20210622.10.00';
const JSON_CLOSING_CHARS = /^[)\]}'\s]+/;

// eslint-disable-next-line no-restricted-syntax
for (const funcName of ['getBasicInfo', 'getInfo']) {
    /**
     * @param {string} link
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    const func = exports[funcName];
    // eslint-disable-next-line no-loop-func
    exports[funcName] = async (id, options = {}) => {
        const key = [funcName, id, options.lang].join('-');
        const cachedFn = await getValueForKey(key);
        if (cachedFn) {
            return cachedFn;
        }
        setKey(key, () => func(id, options));
        return func(id, options);
    };
}

function parseJSON(source, varName, json) {
    if (!json || typeof json === 'object') {
        return json;
    }
    try {
        // eslint-disable-next-line no-param-reassign
        json = json.replace(JSON_CLOSING_CHARS, '');
        return JSON.parse(json);
    } catch (err) {
        throw Error(`Error parsing ${varName} in ${source}: ${err.message}`);
    }
}

function findPlayerResponse(source, info) {
    const player_response = info && (
        (info.args && info.args.player_response) || info.player_response || info.playerResponse || info.embedded_player_response);
    return parseJSON(source, 'player_response', player_response);
}

function exposedMiniget(url, options = {}, requestOptionsOverwrite) {
    const req = miniget(url, requestOptionsOverwrite || options.requestOptions);
    if (typeof options.requestCallback === 'function') options.requestCallback(req);
    return req;
}

async function getVideoInfoPage(id, options) {
    const url = new URL(`https://${INFO_HOST}${INFO_PATH}`);
    url.searchParams.set('video_id', id);
    url.searchParams.set('c', 'TVHTML5');
    url.searchParams.set('cver', `7${CVER.substr(1)}`);
    url.searchParams.set('eurl', VIDEO_EURL + id);
    url.searchParams.set('ps', 'default');
    url.searchParams.set('gl', 'US');
    url.searchParams.set('hl', options.lang || 'en');
    url.searchParams.set('html5', '1');
    const body = await exposedMiniget(url.toString(), options).text();
    const info = querystring.parse(body);
    info.player_response = findPlayerResponse('get_video_info', info);
    return info;
}

function privateVideoError(player_response) {
    const playability = player_response && player_response.playabilityStatus;
    if (playability && playability.status === 'LOGIN_REQUIRED' && playability.messages
        && playability.messages.filter((m) => /This is a private video/.test(m)).length) {
        return new Error(playability.reason || (playability.messages && playability.messages[0]));
    }
    return null;
}

function isRental(player_response) {
    const playability = player_response.playabilityStatus;
    return playability && playability.status === 'UNPLAYABLE'
        && playability.errorScreen && playability.errorScreen.playerLegacyDesktopYpcOfferRenderer;
}

function isNotYetBroadcasted(player_response) {
    const playability = player_response.playabilityStatus;
    return playability && playability.status === 'LIVE_STREAM_OFFLINE';
}

async function retryFunc(func, args, options) {
    let currentTry = 0; let
        result;
    while (currentTry <= options.maxRetries) {
        try {
            // eslint-disable-next-line no-await-in-loop
            result = await func(...args);
            break;
        } catch (err) {
            if (err instanceof Error || (err instanceof miniget.MinigetError && err.statusCode < 500) || currentTry >= options.maxRetries) {
                throw err;
            }
            const wait = Math.min(++currentTry * options.backoff.inc, options.backoff.max);
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, wait));
        }
    }
    return result;
}

async function pipeline(args, validate, retryOptions, endpoints) {
    let info;
    // eslint-disable-next-line no-restricted-syntax
    for (const func of endpoints) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const newInfo = await retryFunc(func, args.concat([info]), retryOptions);
            if (newInfo.player_response) {
                newInfo.player_response.videoDetails = assign(
                    info && info.player_response && info.player_response.videoDetails,
                    newInfo.player_response.videoDetails
                );
                newInfo.player_response = assign(info && info.player_response, newInfo.player_response);
            }
            info = assign(info, newInfo);
            if (validate(info, false)) {
                break;
            }
        } catch (err) {
            if (err instanceof Error || func === endpoints[endpoints.length - 1]) {
                throw err;
            }
            // Unable to find video metadata... so try next endpoint.
        }
    }
    return info;
}

function findJSON(source, varName, body, left, right, prependJSON) {
    const jsonStr = between(body, left, right);
    if (!jsonStr) {
        throw Error(`Could not find ${varName} in ${source}`);
    }
    return parseJSON(source, varName, cutAfterJSON(`${prependJSON}${jsonStr}`));
}

const getWatchHTMLURL = (id, options) => `${BASE_URL + id}&hl=${options.lang || 'en'}`;
const getWatchHTMLPageBody = async (id, options) => {
    const url = getWatchHTMLURL(id, options);
    const cachedFn = await getValueForKey(url);
    if (cachedFn) {
        return cachedFn;
    }
    setKey(url, () => exposedMiniget(url, options).text());
    return exposedMiniget(url, options).text();
};

function getHTML5player(body) {
    const html5playerRes = /<script\s+src="([^"]+)"(?:\s+type="text\/javascript")?\s+name="player_ias\/base"\s*>|"jsUrl":"([^"]+)"/
        .exec(body);
    return html5playerRes ? html5playerRes[1] || html5playerRes[2] : null;
}

const getWatchHTMLPage = async (id, options) => {
    const body = await getWatchHTMLPageBody(id, options);
    const info = { page: 'watch' };
    try {
        // eslint-disable-next-line no-undef
        cver = between(body, '{"key":"cver","value":"', '"}');
        info.player_response = findJSON('watch.html', 'player_response',
            body, /\bytInitialPlayerResponse\s*=\s*\{/i, '</script>', '{');
    } catch (err) {
        const args = findJSON('watch.html', 'player_response', body, /\bytplayer\.config\s*=\s*{/, '</script>', '{');
        info.player_response = findPlayerResponse('watch.html', args);
    }
    info.response = findJSON('watch.html', 'response', body, /\bytInitialData("\])?\s*=\s*\{/i, '</script>', '{');
    info.html5player = getHTML5player(body);
    return info;
};

function parseFormats(player_response) {
    let formats = [];
    if (player_response && player_response.streamingData) {
        formats = formats
            .concat(player_response.streamingData.formats || [])
            .concat(player_response.streamingData.adaptiveFormats || []);
    }
    return formats;
}

function getAuthor(info) {
    try {
        const videoDetails = info.player_response.microformat && info.player_response.microformat.playerMicroformatRenderer;
        const id = (videoDetails && videoDetails.channelId) || info.player_response.videoDetails.channelId;
        const author = {
            id,
            name: videoDetails ? videoDetails.ownerChannelName : info.player_response.videoDetails.author,
            user: videoDetails ? videoDetails.ownerProfileUrl.split('/').slice(-1)[0] : null
        };
        return author;
    } catch (err) {
        return {};
    }
}

// eslint-disable-next-line no-nested-ternary
const getText = (obj) => (obj ? obj.runs ? obj.runs[0].text : obj.simpleText : null);

function cleanVideoDetails(videoDetails, info) {
    // eslint-disable-next-line no-param-reassign
    videoDetails.thumbnails = videoDetails.thumbnail.thumbnails;
    // eslint-disable-next-line no-param-reassign
    delete videoDetails.thumbnail;
    deprecate(videoDetails, 'thumbnail', { thumbnails: videoDetails.thumbnails },
        'videoDetails.thumbnail.thumbnails', 'videoDetails.thumbnails');
    // eslint-disable-next-line no-param-reassign
    videoDetails.description = videoDetails.shortDescription || getText(videoDetails.description);
    // eslint-disable-next-line no-param-reassign
    delete videoDetails.shortDescription;
    deprecate(videoDetails, 'shortDescription', videoDetails.description,
        'videoDetails.shortDescription', 'videoDetails.description');

    // Use more reliable `lengthSeconds` from `playerMicroformatRenderer`.
    // eslint-disable-next-line no-param-reassign
    videoDetails.lengthSeconds = (info.player_response.microformat
        && info.player_response.microformat.playerMicroformatRenderer.lengthSeconds)
        || info.player_response.videoDetails.lengthSeconds;
    return videoDetails;
}

async function getBasicInfo(id, options) {
    const retryOptions = { ...miniget.defaultOptions, ...options.requestOptions };
    // eslint-disable-next-line no-param-reassign
    options.requestOptions = { ...options.requestOptions };
    // eslint-disable-next-line no-param-reassign
    options.requestOptions.headers = {
        // eslint-disable-next-line max-len
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36', ...options.requestOptions.headers
    };
    const validate = (info) => {
        const privateErr = privateVideoError(info.player_response);
        if (privateErr) {
            throw privateErr;
        }
        return info && info.player_response && (
            info.player_response.streamingData || isRental(info.player_response) || isNotYetBroadcasted(info.player_response)
        );
    };
    const info = await pipeline([id, options], validate, retryOptions, [
        getWatchHTMLPage,
        getVideoInfoPage
    ]);

    Object.assign(info, {
        formats: parseFormats(info.player_response)
    });
    const additional = {
        author: getAuthor(info),
        video_url: BASE_URL + id
    };

    info.videoDetails = cleanVideoDetails({
        ...info.player_response && info.player_response.microformat
        && info.player_response.microformat.playerMicroformatRenderer,
        ...info.player_response && info.player_response.videoDetails,
        ...additional
    }, info);

    return info;
}

function getEmbedPageBody(id, options) {
    const embedUrl = `${EMBED_URL + id}?hl=${options.lang || 'en'}`;
    return exposedMiniget(embedUrl, options).text();
}

function addFormatMeta(format) {
    format = { ...FORMATS[format.itag], ...format };
    format.hasVideo = !!format.qualityLabel;
    format.hasAudio = !!format.audioBitrate;
    format.container = format.mimeType
        ? format.mimeType.split(';')[0].split('/')[1] : null;
    format.codecs = format.mimeType
        ? between(format.mimeType, 'codecs="', '"') : null;
    format.videoCodec = format.hasVideo && format.codecs
        ? format.codecs.split(', ')[0] : null;
    format.audioCodec = format.hasAudio && format.codecs
        ? format.codecs.split(', ').slice(-1)[0] : null;
    format.isLive = /\bsource[/=]yt_live_broadcast\b/.test(format.url);
    format.isHLS = /\/manifest\/hls_(variant|playlist)\//.test(format.url);
    format.isDashMPD = /\/manifest\/dash\//.test(format.url);
    return format;
}

async function getInfo(id, options = {}) {
    const info = await getBasicInfo(id, options);
    const funcs = [];
    if (info.formats.length) {
        info.html5player = info.html5player
            || getHTML5player(await getWatchHTMLPageBody(id, options)) || getHTML5player(await getEmbedPageBody(id, options));
        if (!info.html5player) {
            throw Error('Unable to find html5player file');
        }
        const html5player = new URL(info.html5player, BASE_URL).toString();
        funcs.push(decipherFormats(info.formats, html5player, options));
    }

    const results = await Promise.all(funcs);
    info.formats = Object.values(Object.assign({}, ...results));
    info.formats = info.formats.map(addFormatMeta);
    // info.formats.sort(formatUtils.sortFormats);
    info.full = true;
    return info;
}

async function getSongInfo(videoId) {
    return new Promise((resolve, reject) => {
        youtubedl.getInfo(videoId, (err, info) => {
            if (err) reject(err);
            resolve(info);
        });
    });
}

module.exports = {
    getVideoInfoPage,
    getInfo,
    getBasicInfo,
    exposedMiniget
};
