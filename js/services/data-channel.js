const ds = require( './ds' );
const channel = new DataChannel( ds.roomId );
const utils = require( '../utils/utils' );
var processIncomingRTCMessage = null;

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


function joinRoom() {
	var roomToken = ds.record.get( 'roomToken' );
	var broadcasters = ds.record.get( 'broadcasters' );
	var name;
	

	if( !roomToken || !processIncomingRTCMessage ) {
		return;
	}
	
	for( var i = 0; i < broadcasters.length; i++ ) {
		processIncomingRTCMessage({
			roomToken: roomToken,
			broadcaster: broadcasters[ i ]
		})
	}
}

channel.onopen = function ( userid ) {

};

channel.onmessage = function (message, userid) {
	console.log( 'channel message', arguments );
};

channel.onleave = function (userid) {
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