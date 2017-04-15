const BYTES_PER_CHUNK = 1200;
const utils = require( '../utils/utils' );


module.exports = class IncomingFileTransfer{
	constructor( size ) {
		this._size = size;
		this._receivedLength = 0;
		this._data = [];
		this._indices = [];
	}

	addChunk( index, chunk ) {
		this._data.push( chunk );
		this._receivedLength += chunk.byteLength;
		this._indices.push( index );
	}

	setName( filename ) {
		this._filename = filename;
	}

	validate() {
		var received = new window.Blob(this._data);
		var anchor = document.createElement( 'a' );
		anchor.href = URL.createObjectURL(received);
		anchor.download = this._filename;
		anchor.textContent = 'XXXXXXX';
		document.body.appendChild( anchor );

		if( this._indices.length === Math.ceil( this._size / BYTES_PER_CHUNK ) ) {
			console.log( 'All chunks received' );
		}

		for( var i = 0; i < this._indices.length; i++ ) {
			if( i !== this._indices[ i ] ) {
				console.log( 'chunk out of order', i, this._indices );
				return;
			}
		}
		console.log( 'All chunks in order' );

		if( this._size !== this._receivedLength ) {
			console.log( 'expected size was ' + this._size + ' but only received ' + this._receivedLength );
		}
	}
}