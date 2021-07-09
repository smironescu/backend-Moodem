const NodeCache = require('node-cache');
const { FIVE_HOURS } = require('./constants');

const cache = new NodeCache();
// memory-cache docs -> https://github.com/ptarjan/node-cache
// Socket.io do -> https://socket.io/docs/server-api/#socket-id

async function getValueForKey(key) {
    const audioMem = await cache.get(key);

    if (audioMem && Object.keys(audioMem).length) {
        Object.assign(audioMem, {
            isCachedInServerNode: true
        });

        return audioMem;
    }
    return null;
}

function setKey(key, value, expire = FIVE_HOURS) {
    return cache.set(key, value, expire);
}

module.exports = {
    cache,
    getValueForKey,
    setKey
};
