const Connection = require( './connection' );
const OutgoingFileTransfer = require( './outgoing-file-transfer' );
const IncomingFileTransfer = require( './incoming-file-transfer' );
const ds = require( '../services/ds' );
const utils = require( '../utils/utils' );

class Room{
	constructor() {
		this._connections = {};
		this._incomingTransfers = {};
		ds.record.subscribe( 'users', this._createConnections.bind( this ), true );
		ds.client.event.subscribe( 'rtc-signal/' + ds.roomId + '/' + ds.userId, this._onIncomingSignal.bind( this ) );
		ds.client.on( 'disconnect', this._removeConnection.bind( this ) );
	}

	addConnection( remoteUserId ) {
		this._connections[ remoteUserId ] = new Connection( this, remoteUserId );
	}

	sendFile( file, remoteUserId, transferId ) {
		new OutgoingFileTransfer( this, file, remoteUserId, transferId );
	}

	send( data, remoteUserId ) {
		this._connections[ remoteUserId ].send( data );
	}

	processIncomingData( data ) {
		if( typeof data === 'string' ) {
			var parts = data.split( ':' );

			if( parts[ 0 ] === 'TC' ) {
				this._finaliseTransfer( parts[ 1 ] );
			}
		} else {
			data = new Uint8Array( data );

			var transferId = '_' + utils.getIntFromByteArray( data, 0 );
			var chunkIndex = utils.getIntFromByteArray( data, 4 );

			if( !this._incomingTransfers[ transferId ] ) {
				this._incomingTransfers[ transferId ] = new IncomingFileTransfer( utils.getIntFromByteArray( data, 8 ), transferId );
			}

			this._incomingTransfers[ transferId ].addChunk( chunkIndex, data.slice( 12 ).buffer );
		}
	}

	hasConnection( remoteUserId ) {
		return !!this._connections[ remoteUserId ];
	}

	addNameToTransfer( transferId, filename ) {
		this._incomingTransfers[ '_'+transferId ].setName( filename );
	}

	_finaliseTransfer( transferId ) {
		var transfer = this._incomingTransfers[ '_' + transferId ];
		var validationResult = transfer.validate()
		if( validationResult === true ) {
			transfer.downloadFile();
		} else {
			//TODO display to user
			console.log( 'transfer failed', validationResult );
		}
	}

	_removeConnection( remoteUserId ) {
		delete this._connections[ remoteUserId ];

		var data = ds.record.get();
		var userIndex = data.users.indexOf( remoteUserId );
		var filename;
		var ownerIndex;

		if( userIndex > -1 ) {
			data.users.splice( userIndex, 1 );
		}

		for( filename in data.files ) {
			ownerIndex = data.files[ filename ].owners.indexOf( remoteUserId )
			if( ownerIndex > -1 ) {
				data.files[ filename ].owners.splice( ownerIndex, 1 );
			}

			if( data.files[ filename ].owners.length === 0 ) {
				delete data.files[ filename ];
			}
		}

		ds.record.set( data );
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

module.exports = new Room();