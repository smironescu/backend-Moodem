const ytsr = require('ytsr');
const ytdl = require('ytdl-core');
const youtubedl = require('youtube-dl');
const { options } = require('./ytdlConfig');
const { getValueForKey, setKey } = require('./cache');
const { ONE_YEAR } = require('./constants');

function cleanTitle(title) {
    let sanitizeTitle = '';

    if (title) {
        sanitizeTitle = title
            .replace('(Official Music Video)', '')
            .replace('(Official Video)', '');
        return sanitizeTitle;
    }
    return sanitizeTitle;
}

function deleteObjAttrsExcept(object, exceptAttr) {
    // eslint-disable-next-line no-param-reassign
    Object.keys(object).forEach((attr) => attr !== exceptAttr && delete object[attr]);
}

function assignAttrs(object = {}, attrs = {}) {
    return Object.assign(object, {
        id: attrs.videoId || 'No Song ID',
        title: cleanTitle(attrs.title) || 'No Song title',
        author: {
            name: attrs.author.name || 'Anonymous Author',
            user: attrs.author.user || 'No Author User',
            id: attrs.author.id || 'No Author ID'
        },
        averageRating: attrs.averageRating || 0,
        category: attrs.category || 'No Category',
        description: attrs.description || 'No Description',
        keywords: attrs.keywords || [],
        likes: attrs.likes || 0,
        viewCount: attrs.viewCount || '0',
        duration: attrs.lengthSeconds || '0',
        thumbnail: attrs.thumbnails ? attrs.thumbnails[0].url : 'No image',
        hasExpired: false,
        isCachedInServerNode: false
    });
}

function getVideoIdsFromSearchResults(searchResults) {
    const videoIds = [];
    const { items } = searchResults;

    items.filter((video) => {
        if (video.id && !video.isLive && !video.isUpcoming) {
            videoIds.push(video.id);
            return true;
        }
        return false;
    });

    return videoIds;
}

async function searchYoutubeForVideoIds(searchedText) {
    try {
        const searchResultsCached = await getValueForKey(`__searchResults__${searchedText}`);
        if (searchResultsCached) {
            return getVideoIdsFromSearchResults(searchResultsCached);
        }
        const searchResults = await ytsr(searchedText, {
            limit: 20
        });
        setKey(`__searchResults__${searchedText}`, searchResults, ONE_YEAR);
        return getVideoIdsFromSearchResults(searchResults);
    } catch (error) {
        console.error('Error searchYoutubeForVideoIds getSong', error);
    }
    return [];
}

async function getSongInfo(videoId) {
    return new Promise((resolve, reject) => {
        youtubedl.getInfo(videoId, (err, info) => {
            if (err) reject(err);
            resolve(info);
        });
    });
}

async function getSong(videoId) {
    try {
        // await getStreamBuffers(videoId);
        const audioYT = await ytdl.getInfo(videoId, options); // await getSongInfo(videoId);
        // eslint-disable-next-line max-len
        // await getSongInfo(videoId);
        // eslint-disable-next-line max-len
        // const formats = audioYT.formats.filter((format) => format.acodec !== 'none' && format.vcodes !== 'none' && format.container === 'm4a_dash');
        const formats = audioYT.formats.filter((format) => format.hasAudio && format.hasVideo && format.container === 'mp4');

        if (formats && formats.length) {
            // const audio = ytdl.chooseFormat(formats, {
            //     quality: 'highestvideo'
            // });
            deleteObjAttrsExcept(formats[0], 'url');
            assignAttrs(formats[0], audioYT.videoDetails);
            return { ...formats[0] };
        }
        return {};
    } catch (error) {
        console.error('Error converting getSong', error);
    }

    return {};
}

function setExtraAttrs(audios, uid, isSearching = false) {
    const audiosArr = [];

    audios.forEach((track) => {
        Object.assign(track, {
            id: track.id,
            isSearching,
            isPlaying: false,
            isMediaOnList: false,
            boosts_count: 0,
            voted_users: [],
            boosted_users: [],
            hasExpired: false,
            user: {
                uid
            }
        });
        audiosArr.push(track);
    });

    return audiosArr;
}

async function getSongsOrCache(videoIds) {
    try {
        return await Promise.allSettled(videoIds.map(async (videoId) => {
            const audioCached = await getValueForKey(`__youtube-songs__${videoId}`);
            if (audioCached) {
                return audioCached;
            }
            const audio = await getSong(videoId);
            setKey(`__youtube-songs__${videoId}`, { ...audio }, ONE_YEAR);

            return audio;
        }));
    } catch (error) {
        console.error('Error getSongsOrCache', error);
    }
    return {};
}

function checkIfValid(song, songConverted) {
    if (song.status !== 'rejected' && Object.keys(song.value).length) {
        songConverted.push(song.value);
        return true;
    }
    return false;
}

async function getAllSongs(videoIds) {
    const songsCoverted = [];
    try {
        const songs = await getSongsOrCache(videoIds);

        songs.filter((song) => checkIfValid(song, songsCoverted), songsCoverted);

        return songsCoverted;
    } catch (error) {
        console.error('Error getAllSongs', error);
    }
    return songsCoverted;
}

module.exports = {
    searchYoutubeForVideoIds,
    getSong,
    setExtraAttrs,
    getAllSongs
};
