const ds = require( './ds' );

var channel = new DataChannel( ds.roomId );
channel.transmitRoomOnce =false;
channel.userid = ds.userId;
channel.openSignalingChannel = function(config) {

   ds.client.event.subscribe( 'rtc-channel-signaling/' + ds.roomId, msg => {
   		if( msg.sender !== ds.userId ) {
   			//console.log( 'receiving', msg.data );
   			config.onmessage(msg.data);
   		}
   });
       if (config.onopen) setTimeout(config.onopen, 1000);
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
    console.log( 'channel open', arguments );
};

channel.onmessage = function (message, userid) {
     console.log( 'channel message', arguments );
};

channel.onleave = function (userid) {
     console.log( 'channel leave', arguments );
};

channel.onFileProgress = function (chunk, uuid) {
  console.log( 'EMITTING', 'file-progress/' + uuid)
    ds.client.emit( 'file-progress/' + uuid, chunk );
};

channel.onFileSent = function (file) {
  console.log( 'onFileSent', arguments );
};

channel.onFileReceived = function (file) {
    ds.client.emit( 'file-complete/' + file.uuid );
};

module.exports = channel;
window.c = channel;
// search for existing data channels
// channel.connect();

// channel.open();