const Connection = require( './connection' );
const ds = require( '../services/ds' );

module.exports = class Room{
	constructor() {
		this._connections = {};
		ds.record.subscribe( 'users', this._createConnections.bind( this ), true );
		ds.client.event.subscribe( 'rtc-signal/' + ds.roomId + '/' + ds.userId, this._onIncomingSignal.bind( this ) );
	}

	addConnection( remoteUserId ) {
		this._connections[ remoteUserId ] = new Connection( remoteUserId );
	}

	_onIncomingSignal( message ) {
		if( this._connections[ message.sender ] ) {
			this._connections[ message.sender ].processIncomingSignal( message.signal );
		} else {
			console.log( 'received signal for unknown connection ' + message.sender );
		}
	}

	_createConnections() {
		var users = ds.record.get( 'users' );
		var i;

		for( i = 0; i < users.length; i++ ) {
			if( users[ i ] === ds.userId ) {
				continue;
			}

			if( this._connections[ users[ i ] ] ) {
				continue;
			}

			this.addConnection( users[ i ] );
		}
	}
}