/* eslint-disable max-len */
// var gcm = require('node-gcm'); <-- for Android
const path = require('path');
const PushNotifications = require('node-pushnotifications');

const DEFAULT_TOPIC = 'me.sergiumironescu.Moodem';
const DEFAULT_SOUND = 'beep.aiff';

const settings = {
    gcm: {
        id: null,
        phonegap: false // phonegap compatibility mode, see below (defaults to false)
    },
    apn: {
        cert: path.join(__dirname, '/cert.pem'),
        key: path.join(__dirname, '/key.pem'),
        production: process.env.NODE_ENV === 'production' // true for APN production environment, false for APN sandbox environment,
    },
    isAlwaysUseFCM: false // true all messages will be sent through node-gcm (which actually uses FCM)
};

const data = {
    title: 'New push notification', // REQUIRED for Android
    topic: DEFAULT_TOPIC, // REQUIRED for iOS (apn and gcm)
    /* The topic of the notification. When using token-based authentication, specify the bundle ID of the app.
     */
    body: 'Powered by AppFeel',
    custom: {
        sender: 'AppFeel',
        userSender: 'User Sender',
        userReceiver: 'User Receiver'
    },
    priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
    collapseKey: '', // gcm for android, used as collapseId in apn
    contentAvailable: true, // gcm, apn. node-apn will translate true to 1 as required by apn.
    delayWhileIdle: true, // gcm for android
    restrictedPackageName: '', // gcm for android
    dryRun: false, // gcm for android
    icon: '', // gcm for android
    image: '', // gcm for android
    style: '', // gcm for android
    picture: '', // gcm for android
    tag: '', // gcm for android
    color: '', // gcm for android
    clickAction: () => console.log('Click Notification'), // gcm for android. In ios, category will be used if not supplied
    locKey: '', // gcm, apn
    titleLocKey: '', // gcm, apn
    locArgs: undefined, // gcm, apn. Expected format: Stringified Array
    titleLocArgs: undefined, // gcm, apn. Expected format: Stringified Array
    retries: 1, // gcm, apn
    encoding: '', // apn
    badge: 2, // gcm for ios, apn
    sound: 'ping.aiff', // gcm, apn
    android_channel_id: '', // gcm - Android Channel ID
    alert: { // apn, will take precedence over title and body
        title: 'Sender Name',
        body: 'sender message'
        // details: https://github.com/node-apn/node-apn/blob/master/doc/notification.markdown#convenience-setters
    },
    silent: false, // gcm, apn, will override badge, sound, alert and priority if set to true on iOS, will omit `notification` property and send as data-only on Android/GCM
    launchImage: '', // apn and gcm for ios
    action: () => console.log('Action Notification'), // apn and gcm for ios
    category: 'Chat Category', // apn and gcm for ios
    // mdm: '', // apn and gcm for ios. Use this to send Mobile Device Management commands.
    // https://developer.apple.com/library/content/documentation/Miscellaneous/Reference/MobileDeviceManagementProtocolRef/3-MDM_Protocol/MDM_Protocol.html
    urlArgs: '', // apn and gcm for ios
    truncateAtWordEnd: true, // apn and gcm for ios
    mutableContent: 0, // apn
    threadId: '', // apn
    pushType: undefined, // apn. valid values are 'alert' and 'background' (https://github.com/parse-community/node-apn/blob/master/doc/notification.markdown#notificationpushtype)
    expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // unit is seconds. if both expiry and timeToLive are given, expiry will take precedence
    timeToLive: 28 * 86400
};

class MyNotifications {
    constructor() {
        this.push = new PushNotifications(settings);
        this.bagde = 0;
        this.sendNotification = this.sendNotification.bind(this);
    }

    async sendNotification(msgToReceiver, msgFromSender) {
        const { deviceToken = null } = msgToReceiver.user;
        const note = Object.assign(data, {
            custom: {
                userSender: msgFromSender || data.custom.userSender,
                userReceiver: msgToReceiver || data.custom.msgToReceiver

            },
            badge: msgFromSender.badge || data.badge,
            alert: {
                title: msgFromSender.user.name,
                body: msgFromSender.text
            }
        });
        await this.push.send(deviceToken, note)
            .then((results) => {
                console.log('Results Success', results[0].success);
                console.log('Results Fail', results[0].failure);
                console.log('Results Message', results[0].message);
            })
            .catch((error) => console.log('Send Notification error: ', error));
    }
}

// const token = ['4c6bcb639b0b7717cb8e0177877ad841e395348ac0c1e3e7999146b82cbf6bf0'];

module.exports = {
    MyNotifications
};
