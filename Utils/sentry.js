const Sentry = require('@sentry/node');
const { CaptureConsole } = require('@sentry/integrations');

function initSentry() {
    return Sentry.init({
        dsn: 'https://31ed020c1e8c41d0a2ca9739ecd11edb@o265570.ingest.sentry.io/5206914',
        debug: false,
        integrations: [
            new CaptureConsole({
                levels: ['error']
            })
        ],
        attachStacktrace: true
    });
}

module.exports = {
    initSentry
};
