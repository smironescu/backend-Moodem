const NodeCache = require('node-cache');
const storage = require('node-persist');
const { FIVE_HOURS } = require('./constants');

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const ONE_MONTH = TWENTY_FOUR_HOURS * 30;
const ONE_YEAR = ONE_MONTH * 12;

const cache = new NodeCache();
// eslint-disable-next-line no-return-await
(async () => await storage.init({
    ttl: ONE_YEAR
}))();

async function setKeyLocalStorage(key, value, options = { ttl: FIVE_HOURS }) {
    await storage.setItem(key, value, options);
}

async function setKeyServerStorage(key, value, expire = FIVE_HOURS) {
    await cache.set(key, value, expire);
}

async function setKeyLocalAndServer(key, value, expire) {
    await setKeyServerStorage(key, value, expire);
    await setKeyLocalStorage(key, value, {
        ttl: expire || FIVE_HOURS
    });
}

async function getKeyLocalStorage(key) {
    const cachedValue = await storage.getItem(key);

    if (cachedValue && Object.keys(cachedValue).length) {
        Object.assign(cachedValue, {
            isCachedInLocalNode: true
        });
        return cachedValue;
    } if (cachedValue) {
        return cachedValue;
    }
    return cachedValue;
}

async function getKeyServerStorage(key) {
    const audioMem = await cache.get(key);

    if (audioMem && Object.keys(audioMem).length) {
        Object.assign(audioMem, {
            isCachedInServerNode: true
        });

        return audioMem;
    } if (audioMem) {
        return audioMem;
    }
    return audioMem;
}

async function getKeyLocalAndServer(key) {
    const cachedLocal = await getKeyLocalStorage(key);
    const cachedServer = await getKeyServerStorage(key);

    return cachedLocal || cachedServer || null;
}

module.exports = {
    cache,
    getKeyServerStorage,
    getKeyLocalStorage,
    getKeyLocalAndServer,
    setKeyServerStorage,
    setKeyLocalStorage,
    setKeyLocalAndServer
};
