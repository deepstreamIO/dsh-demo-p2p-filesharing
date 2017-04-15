const SIZE_SHORT_CODES = [ 'KB', 'MB', 'GB', 'TB', 'PB' ];

/**
* Converts file sizes in byte to a human readable format, e.g. "2.34 MB"
*
* @param   {Number} size the file size in bytes
*
* @returns {String} human readable filesize
*/
exports.convertFileSize = function( size ) {
	if( size < 1024 ) {
		return size + SIZE_SHORT_CODES[ 0 ];
	}

	for( var i = 2; i < SIZE_SHORT_CODES.length - 1; i++ ) {
		if ( size < Math.pow( 1024, i ) ) {
			return ( size / Math.pow( 1024, i - 1 ) ).toFixed( 2 ) + ' ' + SIZE_SHORT_CODES[ i - 2 ];
		}
	}
};

exports.toJsonPath = function( fileName ) {
	return fileName.replace( /[\.\[\]\ ]/g, '_' );
};

exports.removeFromArray = function( record, path, item ) {
	var arr = record.get( path );
	var index = arr.indexOf( item );

	if( index > -1 ) {
		arr.splice( index, 1 );
	}

	record.set( path, arr );
};

exports.addToArray = function( record, path, item ) {
	var arr = record.get( path );
	arr.push( item );
	record.set( path, arr );
}

exports.setIntInByteArray = function( val, byteArray, startIndex ) {
    var index, byte;

    for ( index = 0; index < 4; index ++ ) {
        byte = val & 0xff;
        byteArray[ index + startIndex ] = byte;
        val = (val - byte) / 256 ;
    }

    return byteArray;
};

exports.getIntFromByteArray = function( byteArray, startIndex ) {
    var value = 0, i;
    for ( i = startIndex + 3; i >= startIndex; i--) {
        value = (value * 256) + byteArray[i];
    }

    return value;
};