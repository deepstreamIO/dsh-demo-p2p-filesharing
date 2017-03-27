const ds = require( './ds' );
const channel = new DataChannel( ds.roomId );
const users = [ ds.userId ];

channel.transmitRoomOnce =false;
channel.userid = ds.userId;
channel.openSignalingChannel = function(config) {

   ds.client.event.subscribe( 'rtc-channel-signaling/' + ds.roomId, msg => {
      if( msg.sender !== ds.userId ) {
        //console.log( 'receiving', msg.data );
        config.onmessage(msg.data);
      }
   });
       if (config.onopen) setTimeout(config.onopen, 1);
  return {
        send: function (data) {
          //console.log( 'sending', data );
          ds.client.event.emit( 'rtc-channel-signaling/' + ds.roomId, {
            sender: ds.userId,
            data: data
          });
        },
        channel: ds.roomId
    };
};

channel.autoSaveToDisk = true;
channel.onopen = function (userid) {
  var index = users.indexOf( userid );
  if( index === -1 ) {
    users.push( userid );
    ds.client.emit( 'user-add', userid );
    ds.client.emit( 'user-change', users );
  }
};

channel.onmessage = function (message, userid) {
     console.log( 'channel message', arguments );
};

channel.onleave = function (userid) {
  var index = users.indexOf( userid );
  if( index > -1 ) {
    users.splice( index, 1 );
  }

  ds.client.emit( 'user-remove', userid );
      ds.client.emit( 'user-change', users );
};

channel.onFileProgress = function (chunk, uuid) {
    ds.client.emit( 'file-progress/' + uuid, chunk );
};

channel.onFileSent = function (file) {
  ds.client.emit( 'file-complete/' + file.uuid );
};

channel.onFileReceived = function (file) {
    ds.client.emit( 'file-complete/' + file.uuid );
};

module.exports = channel;