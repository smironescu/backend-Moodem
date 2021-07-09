// eslint-disable-next-line max-len
const COOKIE = 'CONSENT=YES+ES.en+20150705-15-0; YSC=RVeWb8KzEXc; LOGIN_INFO=AFmmF2swRgIhALFkP9EgTxgWwh8_Dx3Fa2g-WN-K4umS1JQyzndTP5DLAiEAyHfgMQ2jMlNpvltT8LdxKqTle8a4ZSjODYq-svrKlVA:QUQ3MjNmemFvaS1aNkFXVURieUYtMUtWbnR5bFMzRnJfa21CUXdhSTV4QXNPVnNfQWlabDBUZU1qaC1oMnh1eVNwa2pxVWxkN3duYWdhbkk5aHM1ai1JNHFORy1ZVHNvMWw3X2RBdlhKMGZaamFaa3JfeUZzVmhqTnFLS1BETlJTOFRfTmZ6TVQyd0tfUktlcEQ5X1hiNmROcU5hSEt6NC13; VISITOR_INFO1_LIVE=Foji98RNGoc; PREF=tz=America.Bogota&volume=100; SID=-gd1sxxbEVq8dKuh38fcE2L05m61_kP3jA1TL17AkdIuOZF7zzjVv987_cKLK84ArH9_qA.; __Secure-3PSID=-gd1sxxbEVq8dKuh38fcE2L05m61_kP3jA1TL17AkdIuOZF7HnhPuBTzxSTGeDxEAKPCNg.; HSID=A6fqV8FuiHFhJcWl0; SSID=AYt2XL8PHZERVOAXN; APISID=inRo7-o_LZnfjBPr/AZVvFSHhuOiqo-pwE; SAPISID=SddX0sVlozD0JJTx/AK1WngcPSFTLva70H; __Secure-3PAPISID=SddX0sVlozD0JJTx/AK1WngcPSFTLva70H; SIDCC=AJi4QfG-lbIoDvzhyxohPDRt0gCfFugnuj0F09ScWGZ9ASC2Mw84X60mMkFKONh3vsJjroOwcQ; __Secure-3PSIDCC=AJi4QfEtg5vDtknOsL6nKk7MqtSXkwzRRe3N70K03XlnfnbGxLRh3kb7qvwUGAWsn8ZndfJhwGo';
const MAP_ERRORS = {
    SIGUSR1: 'server kill PID or nodemon restart.',
    SIGUSR2: 'server kill PID or nodemon restart.',
    SIGINT: 'CTRL + C was clicked and stopped the server.',
    uncaughtException: 'Unexpected Error Exception on Server.',
    unhandledRejection: 'Unhandled Promise on Server.',
    exit: 'Server was disconnected.'
};
const TTL = 60 * 60 * 1; // cache for 1 Hour ttl -> time to live
const FIVE_HOURS = TTL * 5;
const ONE_DAY = TTL * 24;
const THIRTY_DAYS = ONE_DAY * 30;
const ONE_YEAR = THIRTY_DAYS * 365;
const YOUTUBE_ROOT = 'https://www.youtube.com/watch?v=';

module.exports = {
    COOKIE,
    MAP_ERRORS,
    TTL,
    FIVE_HOURS,
    ONE_DAY,
    THIRTY_DAYS,
    ONE_YEAR,
    YOUTUBE_ROOT
};
