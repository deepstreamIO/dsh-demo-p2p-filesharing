const ds = require( './ds' );
const channel = new DataChannel( ds.roomId );
const utils = require( '../utils/utils' );
var processIncomingRTCMessage = null;
var openChannels = {};

channel.transmitRoomOnce = true;
channel.autoSaveToDisk = true;
channel.roomid = ds.roomId;

ds.record.subscribe( 'roomMessages', joinRoom, true );

channel.openSignalingChannel = function(config) {
	ds.client.event.subscribe( 'rtc-channel-signaling/' + ds.roomId, msg => {
		if( msg.sender !== channel.userid ) {
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
					channel.userid = data.broadcaster;
					var broadcasters = ds.record.get( 'broadcasters' );
					if( broadcasters.indexOf( data.broadcaster ) === -1 ) {
						broadcasters.push( data.broadcaster );
					}
					ds.record.set( 'broadcasters', broadcasters );
				}
			}

			ds.client.event.emit( 'rtc-channel-signaling/' + ds.roomId, {
				sender: channel.userid,
				data: data
			});
		},
		channel: ds.roomId
	};
};

channel.ondatachannel = function( dc ) {
	console.log( 'ondatachannel', dc );
}
function joinRoom() {
	var roomToken = ds.record.get( 'roomToken' );
	var broadcasters = ds.record.get( 'broadcasters' );
	var name;

	if( !roomToken || !processIncomingRTCMessage ) {
		return;
	}

	for( var i = 0; i < broadcasters.length; i++ ) {
		if( openChannels[ broadcasters[ i ] ] ) {
			continue;
		}
		console.log( `establishing connection for ${roomToken} with ${broadcasters[ i ]}` );
		processIncomingRTCMessage({
			roomToken: roomToken,
			broadcaster: broadcasters[ i ]
		})
		return;
	}
}

channel.onopen = function ( userid ) {
	openChannels[ userid.toString() ] = true;
	joinRoom();
	console.log( 'channel opened', userid );
};

channel.onmessage = function (message, userid) {
	console.log( 'channel message', arguments );
};

channel.onleave = function (userid) {
	delete openChannels[ userid.toString() ];

	var broadcasters = ds.record.get( 'broadcasters' );

	if( broadcasters.indexOf( userid ) > -1 ) {
		broadcasters.splice( broadcasters.indexOf( userid ), 1 );
	}

	ds.record.set( 'broadcasters', broadcasters );
};

channel.onFileProgress = function (chunk, uuid) {
	ds.client.emit( 'file-progress/' + uuid, chunk );
};

channel.onFileSent = function (file) {
	ds.client.emit( 'file-complete/' + file.uuid );
	ds.client.emit( 'file-sent/' + file.uuid );
};

channel.onFileReceived = function ( file ) {
	ds.client.emit( 'file-complete/' + file.uuid );
	ds.client.emit( 'file-received/' + file.uuid );
	utils.addToArray( ds.record, `files.${utils.toJsonPath( file.name )}.owners`, channel.userid );
};

module.exports = channel;
window.ch = channel;