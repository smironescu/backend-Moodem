const ytdl = require('ytdl-core');
const cliProgress = require('cli-progress');
// const fetch = require('node-fetch');
const { makeRandomChars } = require('./generators');
const { COOKIE } = require('./constants');

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

async function getStream(url) {
    console.info(`Downloading from ${url} ...`);

    let allReceived = false;
    return new Promise((resolve, reject) => {
        const stream = ytdl(url, {
            quality: 'highest',
            filter: (format) => format.container === 'mp4'
        })
            .on('progress', (_, totalDownloaded, total) => {
                if (!allReceived) {
                    progressBar.start(total, 0, {
                        mbTotal: (total / 1024 / 1024).toFixed(2),
                        mbValue: 0
                    });
                    allReceived = true;
                }
                progressBar.increment();
                progressBar.update(totalDownloaded, {
                    mbValue: (totalDownloaded / 1024 / 1024).toFixed(2)
                });
            })
            .on('end', () => {
                progressBar.stop();
                console.info('Successfully downloaded the stream!');
                return resolve(stream);
            });
        resolve(stream);
    });
}

async function getStreamBuffers(videoId) {
    const stream = ytdl(videoId, {
        requestOptions: {
            headers: {
                Cookie: COOKIE,
                'x-youtube-client-version': '2.20191008.04.01',
                'x-youtube-client-name': '1',
                'x-client-data': '',
                'x-youtube-identity-token': 'QUFFLUhqbWtBX080QlRLNkQ3R2E2RXBWZGtXZFVjd1JuZ3w\u003d',
                'Accept-Encoding': 'identity;q=1, *;q=0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.80 Safari/537.36',
                referer: `https://${makeRandomChars(6)}.com`
            }
        }
    });

    const chunks = [];

    // await fetch('songUrl)
    //   .then((res) => res.buffer())
    //   .then((buffer) => {
    //     chunks.push(buffer);
    //   });

    // eslint-disable-next-line no-restricted-syntax
    for await (const chunk of stream) {
        chunks.push(chunk);
    }

    return chunks;
}

module.exports = {
    getStream,
    getStreamBuffers
};
