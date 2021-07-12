const app = require('express')();
const serverHTTP = require('http').Server(app);
const serverIO = require('socket.io')(serverHTTP);
const noc = require('no-console');
const { initSentry } = require('./Utils/sentry');
const { MySocket } = require('./Utils/socket');
const { MyNotifications } = require('./notifications/index');
const config = require('./config');

noc(); // after this no log will be printed in prod mode if  NODE_DEBUG is not set
// You need to set "NODE_DEBUG" environment variable to true when running node server in prod mode to see logs.

const myNotification = new MyNotifications();
console.log('HEYYY 2', `NODE_ENV=${config.NODE_ENV}`); //

// myNotification.sendNotification({
//     alert: 'Hola, q ase'
// });

// initSentry() //

app.get('/', (req, res) => { //
    res.sendfile('index.html');
});

serverIO.use((socket, next) => {
    Object.assign(socket, {
        id: socket.handshake.query.uid,
        uid: socket.handshake.query.uid,
        displayName: socket.handshake.query.displayName,
        userAgent: socket.handshake.query.userAgent || null
    });
    this.mySocket = new MySocket(socket, serverIO);
    next(null, true);
});

serverIO.on('connection', async (socket) => {
    // myNotification.sendNotification();
    // myNotification.sendNotification({
    //     alert: 'Hola que tal',
    //     title: 'Name of the user',
    //     data: 'You have a message from: Dummy'
    // });
    socket.on('app-goes-to-background', () => {
    // do nothing
        console.log('Onlineee');
    });

    // Welcome Msg
    socket.on('emit-message-welcomeMsg', this.mySocket.handleGetWelcomeMsg);

    // Search Songs
    socket.on('search-songs', this.mySocket.handleGetSearchedSongs);

    //  Song Error
    socket.on('send-song-error', this.mySocket.handleGetSongError);

    // Vote
    socket.on('send-message-vote-up', this.mySocket.handleGetSongVote);

    // Remove song
    socket.on('send-message-remove-song', this.mySocket.handleGetSongRemoved);

    // Add song
    socket.on('send-message-add-song', this.mySocket.handleGetSongAdded);

    // Get Connected Users on Chat Room
    socket.on('get-connected-users', this.mySocket.handleGetConnectedUsers);

    // Join Chat Room and get messages
    socket.on('moodem-chat-join', this.mySocket.handleJoinChatRooms);

    // Leave chat room
    socket.on('moodem-chat-leave', this.mySocket.handleLeaveChatRooms);

    // Get Chat Room Messages
    socket.on('get-chat-messages', this.mySocket.handleGetChatMsgs);

    // Get Chat Room Message
    socket.on('get-chat-message', this.mySocket.handleGetChatMsg);

    // User is Typing
    socket.on('user-typing', this.mySocket.hanldeGetUserIsTyping);

    // Get User Private Messages
    socket.on('get-private-messages', this.mySocket.handleUserPrivateMessages);

    socket.on('push-notification-received-msg', ({ user_receiver_msg, user_sender_msg }) => {
        myNotification.sendNotification(user_receiver_msg, user_sender_msg);
    });

    // Get User Unread Messages TO-DO
    // socket.on('reciever-unread-messages', (data) => {
    //     const { msg, msg: { receiver, sender } } = data;
    //     console.log(msg, 'Receiver', receiver, 'socket.id', socket.id, 'socket.uid', socket.uid);
    //     serverIO.to(receiver).emit('unread-messages', {
    //         msg,
    //         receiver,
    //         sender
    //     });
    // });

    // User has disconected
    socket.on('disconnect', (reason) => {
        console.log('DISCONNNECT SOCKET ID', socket.id, 'uid', socket.uid, 'With REASON', reason);
        socket.offAny();
        // eslint-disable-next-line no-param-reassign
        delete socket.id;
        // eslint-disable-next-line no-param-reassign
        delete socket.uid;
        // eslint-disable-next-line no-param-reassign
        delete socket.displayName;
    });
});

serverHTTP.listen(config.PORT, '::', () => { // Digital Ocean Open Port
    console.log('listening on *:3000');
});
