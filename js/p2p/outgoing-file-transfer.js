const BYTES_PER_CHUNK = 1200;
const TRANSFER_COMPLETE = 'TC';
const utils = require( '../utils/utils' );

module.exports = class OutgoingFileTransfer{
	constructor( room, file, remoteUserId, transferId ) {
		this._room = room;
		this._file = file;
		this._remoteUserId = remoteUserId;
		this._currentChunk = 0;
		this._id = transferId;
		this._fileReader = new FileReader();
		this._fileReader.onprogress = this._onProgress.bind( this );
		this._fileReader.onload = this._onRead.bind( this );
		this._fileReader.onerror = this._onError.bind( this );
		this._readNextChunk();
	}

	_readNextChunk() {
		var start = BYTES_PER_CHUNK * this._currentChunk;
		var end = Math.min( this._file.size, start + BYTES_PER_CHUNK );
		this._fileReader.readAsArrayBuffer( this._file.slice( start, end ) );
	}

	_onRead( ) {
		const data = new Uint8Array( this._fileReader.result.byteLength + 12 );

		utils.setIntInByteArray( this._id, data, 0 );
		utils.setIntInByteArray( this._currentChunk, data, 4 );
		utils.setIntInByteArray( this._file.size, data, 8 );

		data.set( new Uint8Array( this._fileReader.result ), 12 )

		this._room.send( data.buffer, this._remoteUserId );
		this._currentChunk++;

		if( BYTES_PER_CHUNK * this._currentChunk < this._file.size ) {
			this._readNextChunk();
		} else {
			this._room.send( TRANSFER_COMPLETE + ':' + this._id, this._remoteUserId );
		}
	}

	_onError( error ) {
		console.log( 'error reading file', error );
	}

	_onProgress( e ) {
		console.log( 'on progress', ( e.loaded / e.total )  );
	}
}