const ds = require( './ds' );
const channel = new DataChannel( ds.roomId );
const users = [ ds.userId ];
var processIncomingRTCMessage = null;

channel.transmitRoomOnce = true;
channel.autoSaveToDisk = true;
//channel.userid = ds.userId;
channel.roomid = ds.roomId;

ds.record.subscribe( 'roomMessages', joinRoom, true );

channel.openSignalingChannel = function(config) {
	ds.client.event.subscribe( 'rtc-channel-signaling/' + ds.roomId, msg => {
		if( msg.sender !== ds.userId ) {
			config.onmessage( msg.data );
		}
	});

	processIncomingRTCMessage = config.onmessage;
	joinRoom();

	if ( config.onopen ) {
		setTimeout( config.onopen, 1 );
	}

	return {
		send: function (data) {
			console.log( 'sending', data );

			if( data.roomToken ) {
				if( ds.isFirstInRoom ) {
					ds.record.set( 'roomToken', data.roomToken );
					ds.record.set( 'broadcasters', [] );
				}

				if( data.broadcaster ) {
					var broadcasters = ds.record.get( 'broadcasters' );
					if( broadcasters.indexOf( data.broadcaster ) === -1 ) {
						broadcasters.push( data.broadcaster );
					}
					ds.record.set( 'broadcasters', broadcasters );
				}
			}

			ds.client.event.emit( 'rtc-channel-signaling/' + ds.roomId, {
				sender: ds.userId,
				data: data
			});
		},
		channel: ds.roomId
	};
};


function joinRoom() {
	var roomToken = ds.record.get( 'roomToken' );
	var broadcasters = ds.record.get( 'broadcasters' );
	var name;
	

	if( !roomToken || !processIncomingRTCMessage ) {
		return;
	}
	console.log( 'joining room', roomToken, broadcasters );

	for( var i = 0; i < broadcasters.length; i++ ) {
		processIncomingRTCMessage({
			roomToken: roomToken,
			broadcaster: broadcasters[ i ]
		})
	}
}

channel.onopen = function ( userid ) {
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
	var broadcasters = ds.record.get( 'broadcasters' );

	if( index > -1 ) {
		users.splice( index, 1 );
	}

	if( broadcasters.indexOf( userid ) > -1 ) {
		broadcasters.splice( broadcasters.indexOf( userid ), 1 );
	}
	

	ds.record.set( 'broadcasters', broadcasters );
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