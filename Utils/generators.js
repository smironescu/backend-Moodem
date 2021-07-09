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

module.exports = {
    makeRandomChars,
    getFirefoxUserAgent
};
