const Peer = require( 'simple-peer' );
const ds = require( '../services/ds' );
window.ds = ds;
module.exports = class Connection{
	constructor( remoteUserId ) {
		this._remoteUserId = remoteUserId;
		this._connection = new Peer({ initiator: ds.userId > remoteUserId, trickle: false });
		this._connection.on( 'error', this._onError.bind( this ) );
		this._connection.on( 'signal', this._onOutgoingSignal.bind( this ) );
		this._connection.on( 'connect', this._onConnect.bind( this ) );
		this._connection.on( 'data', this._onData.bind( this ) );
		this._connection.on( 'close', this._onClose.bind( this ) );
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
		console.log( 'sending signal', signal );
		ds.client.event.emit( 'rtc-signal/' + ds.roomId + '/' + this._remoteUserId, {
			sender: ds.userId,
			signal: signal
		});
	}

	_onConnect() {
		console.log( 'connected' );
	}

	_onData( data ) {
		console.log( 'received', data );
	}

	_onClose() {
		console.log( 'connection closed' );
	}
}
