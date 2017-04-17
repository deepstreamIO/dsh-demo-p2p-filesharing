const BYTES_PER_CHUNK = 1200;
const utils = require( '../utils/utils' );
const ds = require( '../services/ds' );

module.exports = class IncomingFileTransfer{
	constructor( size, transferId ) {
		this._size = size;
		this._transferId = transferId;
		this._receivedLength = 0;
		this._data = [];
		this._indices = [];
	}

	addChunk( index, chunk ) {
		this._data.push( chunk );
		this._receivedLength += chunk.byteLength;
		this._indices.push( index );
		ds.client.emit( 'file-progress/' + this._transferId, this._receivedLength / this._size );
	}

	setName( filename ) {
		this._filename = filename;
	}

	downloadFile() {
		utils.downloadFile( this._data, this._filename );
	}

	addOwnerToFile() {
		utils.addToArray( ds.record, 'files.' + utils.toJsonPath( this._filename ) + '.owners', ds.userId, true );
	}

	validate() {
		if( this._indices.length !== Math.ceil( this._size / BYTES_PER_CHUNK ) ) {
			return 'Missing chunks';
		}

		for( var i = 0; i < this._indices.length; i++ ) {
			if( i !== this._indices[ i ] ) {
				return 'chunks out of order';
			}
		}

		if( this._size !== this._receivedLength ) {
			return 'expected size was ' + this._size + ' but only received ' + this._receivedLength;
		}

		return true;
	}
}