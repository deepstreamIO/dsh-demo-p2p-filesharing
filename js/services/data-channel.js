const ds = require( './ds' );

var channel = new DataChannel( ds.roomId );

channel.openSignalingChannel = function(config) {

   ds.client.event.subscribe( 'rtc-channel-signaling/' + ds.roomId, msg => {
   		if( msg.sender !== ds.userId ) {
   			console.log( 'receiving', msg.data );
   			config.onmessage(msg.data);
   		}
   });
       if (config.onopen) setTimeout(config.onopen, 1000);
	return {
        send: function (data) {
        	console.log( 'sending', data );
        	ds.client.event.emit( 'rtc-channel-signaling/' + ds.roomId, {
        		sender: ds.userId,
        		data: data
        	});
        },
        channel: ds.roomId
    };
};


channel.onopen = function (userid) {
    console.log( 'channel open', arguments );
};

channel.onmessage = function (message, userid) {
     console.log( 'channel message', arguments );
};

channel.onleave = function (userid) {
     console.log( 'channel leave', arguments );
};

window.c = channel;
// search for existing data channels
// channel.connect();

// channel.open();