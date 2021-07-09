const {
    searchYoutubeForVideoIds,
    getAllSongs,
    setExtraAttrs,
    getSong
} = require('./songs');

const chatRooms = {};

function buildMedia(chatRoom) {
    if (!chatRooms[chatRoom]) {
        chatRooms[chatRoom] = {};

        Object.assign(chatRooms[chatRoom], {
            songs: [],
            messages: [],
            uids: new Set([])
        });
    }
}

class MySocket {
    constructor(socket, serverIO) {
        this.socket = socket;
        this.serverIO = serverIO;
        this.chatRooms = chatRooms;
        this.handleGetWelcomeMsg = this.getWelcomeMsg.bind(this);
        this.handleGetSearchedSongs = this.getSearchedSongs.bind(this);
        this.handleGetSongError = this.getSongError.bind(this);
        this.handleGetSongVote = this.getSongVote.bind(this);
        this.handleGetSongRemoved = this.getSongRemoved.bind(this);
        this.handleGetSongAdded = this.getSongAdded.bind(this);
        this.handleGetConnectedUsers = this.getConnectedUsers.bind(this);
        this.handleGetChatMsgs = this.getChatMsgs.bind(this);
        this.handleGetChatMsg = this.getChatMsg.bind(this);
        this.handleJoinChatRooms = this.joinChatRooms.bind(this);
        this.handleLeaveChatRooms = this.leaveChatRooms.bind(this);
        this.hanldeGetUserIsTyping = this.getUserIsTyping.bind(this);
        this.handleUserPrivateMessages = this.getUserPrivateMessages.bind(this);
    }

    async getWelcomeMsg({ chatRoom }) {
        try {
            await this.socket.join(chatRoom);
            buildMedia(chatRoom);

            const groupName = chatRoom.replace(/(.*?_GroupName_)/g, '');
            this.serverIO.to(this.socket.id).emit('get-message-welcomeMsg',
                {
                    welcomeMsg: `Welcome ${this.socket.displayName} to ${groupName}!`
                });
        } catch (error) {
            console.error('Error getWelcomeMsg', error);
        }
    }

    async getSearchedSongs({ searchedText }) {
        try {
            const videoIds = await searchYoutubeForVideoIds(searchedText);
            const songs = await getAllSongs(videoIds);
            this.serverIO.to(this.socket.id).emit('get-songs', { // send message only to sender-client
                songs: [...setExtraAttrs(songs, this.socket.uid, true)]
            });
        } catch (error) {
            console.error('Error converting allSongs on search-songs-on-youtube', error);
        }
    }

    async getSongError({ song, chatRoom }) {
        buildMedia(chatRoom);

        try {
            const audio = await getSong(song.id, true);

            if (audio && Object.keys(audio).length) {
                Object.assign(audio, {
                    voted_users: song.voted_users,
                    hasExpired: false,
                    user: song.user,
                    isPlaying: song.isPlaying
                });

                if (song.isSearching) {
                    this.serverIO.to(chatRoom).emit('song-error-searching', { song: audio });
                } else {
                    this.serverIO.to(chatRoom).emit('song-error', { song: audio });
                }
            }
        } catch (error) {
            console.error('Error getSongError', error);
        }
    }

    async getSongVote({ song, chatRoom, isVotingSong = false }) {
        buildMedia(chatRoom);

        this.serverIO.to(chatRoom).emit('song-voted', { song, isVotingSong });
    }

    async getSongRemoved({ song, chatRoom, isRemovingSong = false }) {
        buildMedia(chatRoom);

        this.serverIO.to(chatRoom).emit('song-removed', { song, isRemovingSong });
    }

    async getSongAdded({ song, chatRoom, isAddingSong = false }) {
        buildMedia(chatRoom);
        this.serverIO.to(chatRoom).emit('song-added', { song, isAddingSong });
    }

    async getConnectedUsers({ chatRoom, leaveChatRoom }) {
        buildMedia(chatRoom);

        if (leaveChatRoom) {
            await this.socket.leave(leaveChatRoom);
            chatRooms[chatRoom].uids.delete(this.socket.uid);
            this.serverIO.to(chatRoom).emit('users-connected-to-room', chatRooms[chatRoom].uids.size);
        } else {
            await this.socket.join(chatRoom);
            chatRooms[chatRoom].uids.add(this.socket.uid);
            this.serverIO.to(chatRoom).emit('users-connected-to-room', chatRooms[chatRoom].uids.size);
        }
    }

    async getChatMsgs({ chatRoom }) {
        buildMedia(chatRoom);

        const { messages } = chatRooms[chatRoom];

        if (messages.length) {
            this.serverIO.to(chatRoom).emit('set-chat-messages', messages.slice().reverse());
        } else {
            this.serverIO.to(chatRoom).emit('set-chat-messages', []);
        }
    }

    async getChatMsg({ chatRoom, msg }) {
        buildMedia(chatRoom);
        const { messages } = chatRooms[chatRoom];

        messages.push(msg);
        this.serverIO.to(chatRoom).emit('set-chat-message', msg);
    }

    async joinChatRooms({ chatRoom }) {
        await this.socket.join(chatRoom);
        buildMedia(chatRoom);

        const { uids } = chatRooms[chatRoom];

        uids.add(this.socket.uid);
    }

    async leaveChatRooms({ chatRoom }) {
        await this.socket.leave(chatRoom);
        buildMedia(chatRoom);

        const { uids } = chatRooms[chatRoom];
        uids.delete(this.socket.uid);
        // this.serverIO.to('room 237').emit(`user ${this.socket.id} has left the room`);
    }

    async getUserIsTyping({ chatRoom, isTyping }) {
        buildMedia(chatRoom);

        this.socket.broadcast.to(chatRoom).emit('user-typing', { isTyping }); // send to all sockets in room/channel except sender
    }

    async getUserPrivateMessages({ uid }) {
        const allUserPrivateMessages = [];
        const userRooms = Object.keys(chatRooms).filter((room) => room.includes(uid));
        userRooms.forEach((userRoom) => {
            const { messages } = chatRooms[userRoom];
            allUserPrivateMessages.push(...messages);
        });

        if (allUserPrivateMessages.length) {
            this.serverIO.to(this.socket.id).emit('set-private-messages', allUserPrivateMessages);
        } else {
            this.serverIO.to(this.socket.id).emit('set-private-messages', allUserPrivateMessages);
        }
    }
}

module.exports = {
    MySocket
};
