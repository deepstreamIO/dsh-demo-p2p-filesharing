const Peer = require( 'simple-peer' );
const ds = require( '../services/ds' );

module.exports = class Connection{
	constructor( room, remoteUserId ) {
		this._room = room;
		this._remoteUserId = remoteUserId;
		this._connection = new Peer({ initiator: ds.userId > remoteUserId, trickle: false });
		this._connection.on( 'error', this._onError.bind( this ) );
		this._connection.on( 'signal', this._onOutgoingSignal.bind( this ) );
		this._connection.on( 'connect', this._onConnect.bind( this ) );
		this._connection.on( 'close', this._onClose.bind( this ) );

		//Hack instead of using the official 'data' event - lets us handle the array buffer directly
		this._connection._onChannelMessage = this._onData.bind( this );
	}

	send( data ) {
		this._connection.send( data );
	}

	processIncomingSignal( signal ) {
		this._connection.signal( signal );
	}

	_onError( error ) {
		console.log( 'peer connection error', error );
	}

	_onOutgoingSignal( signal ) {
		signal.sdp = signal.sdp.replace( 'b=AS:30', 'b=AS:1638400' );
		ds.client.event.emit( 'rtc-signal/' + ds.roomId + '/' + this._remoteUserId, {
			sender: ds.userId,
			signal: signal
		});
	}

	_onConnect() {
		console.log( 'connected' );
	}

	_onData( event ) {
		this._room.processIncomingData( event.data );
	}

	_onClose() {
		ds.client.emit( 'disconnect', this._remoteUserId );
	}
}
