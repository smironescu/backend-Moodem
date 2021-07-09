/* eslint-disable no-param-reassign */
const voteMedia = (mediaList, data, io, media) => {
  mediaList.forEach((song) => {
    if (song.id === data[media].id) {
      song.voted_users.push(data.user_id);
    }
  });

  io.to(data.chatRoom).emit('server-send-message-vote', mediaList);
};

const boostMedia = (mediaList, data, io, media) => {
  mediaList.forEach((song) => {
    if (song.id === data[media].id) {
      song.boosted_users.push(data.user_id);
      song.boosts_count = data.count;
    }
  });

  io.to(data.chatRoom).emit('server-send-message-boost', mediaList);
};

const removeMedia = (mediaList, data, io, media) => {
  mediaList.forEach((song, index) => {
    if (song.id === data[media].id) {
      mediaList.splice(index, 1);
    }
  });
  io.to(data.chatRoom).emit('server-send-message-remove', mediaList);
};

function isEmpty(x) {
  return !x || (x.constructor !== Number && Object.keys(x).length === 0);
}

module.exports = {
  voteMedia,
  boostMedia,
  removeMedia,
  isEmpty,
};
