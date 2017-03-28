const ds = require( './ds' );
const channel = new DataChannel( ds.roomId );
const users = [ ds.userId ];
var processIncomingRTCMessage = null;

channel.transmitRoomOnce = true;
channel.autoSaveToDisk = true;
channel.userid = ds.userId;
channel.roomid = ds.roomId;

ds.record.subscribe( 'roomMessages', joinRoom, true );

channel.openSignalingChannel = function(config) {
	ds.client.event.subscribe( 'rtc-channel-signaling/' + ds.roomId, msg => {
		if( msg.sender !== ds.userId ) {
			console.log( 'receiving', msg.data );
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
				}

				ds.record.set( 'broadcasters.' + data.broadcaster, true );
				return;
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

	for( name in broadcasters ) {
		if( !broadcasters[ name ] ) {
			continue;
		}
		processIncomingRTCMessage({
			roomToken: roomToken,
			broadcaster: name
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

	if( index > -1 ) {
		users.splice( index, 1 );
	}

	ds.record.set( 'broadcasters.' + userid, false );
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