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

/**
 * Replaces some unsupported characters, e.g. .[ ] / with underscores
 *
 * @param   {String} fileName
 *
 * @returns {String} escaped filename
 */
exports.toJsonPath = function( fileName ) {
	return fileName.replace( /[\.\[\]\ ]/g, '_' );
};

/**
 * A convenience method to add an entry to an array within a record
 *
 * @param   {ds.Record} record the record that contains the array
 * @param   {String} path a path locating the array within the record
 * @param   {Mixed} item the item to be added
 *
 * @returns {void}
 */
exports.addToArray = function( record, path, item ) {
	var arr = record.get( path );
	arr.push( item );
	record.set( path, arr );
}

/**
 * A convenience method to remove an entry from an array within a record
 *
 * @param   {ds.Record} record the record that contains the array
 * @param   {String} path a path locating the array within the record
 * @param   {Mixed} item the item to be added
 *
 * @returns {void}
 */
exports.removeFromArray = function( record, path, item ) {
	var arr = record.get( path );
	var index = arr.indexOf( item );

	if( index > -1 ) {
		arr.splice( index, 1 );
	}

	record.set( path, arr );
};

/**
 * A convenience method to add an entry to an array within a record
 *
 * @param   {ds.Record} record the record that contains the array
 * @param   {String} path a path locating the array within the record
 * @param   {Mixed} item the item to be added
 *
 * @returns {void}
 */
exports.addToArray = function( record, path, item ) {
	var arr = record.get( path );
	arr.push( item );
	record.set( path, arr );
};

/**
 * Opposite of [utils.getIntFromByteArray]. Breaks an integer into up to four bytes
 * and stores them in a byte array at a specified index
 *
 * @param {Number} val        	Integer value to be stored
 * @param {ByteArray} byteArray A byte array in which the value should be stored
 * @param {Number} startIndex	An integer specifying the start index at which to store the value
 *
 * @return {ByteArray} The manipulated byte array
 */
exports.setIntInByteArray = function( val, byteArray, startIndex ) {
    var index, byte;

    for ( index = 0; index < 4; index ++ ) {
        byte = val & 0xff;
        byteArray[ index + startIndex ] = byte;
        val = ( val - byte ) / 256;
    }

    return byteArray;
};

/**
 * Opposite of [utils.setIntInByteArray]. Reads four bytes from an array and transforms them into
 * an integer
 *
 * @param   {ByteArray} byteArray 	ByteArray to read from
 * @param   {Number} 	startIndex	Integer specifying the start index from which to start reading
 *
 * @returns {Number} The resulting Integer
 */
exports.getIntFromByteArray = function( byteArray, startIndex ) {
    var value = 0, i;
    for ( i = startIndex + 3; i >= startIndex; i--) {
        value = (value * 256) + byteArray[i];
    }

    return value;
};

/**
 * Takes an array of ArrayBuffers, turns them into a Blob Url and
 * prompts the browser to download it
 *
 * @param   {ArrayBuffer|Array} data Single ArrayBuffer or array of ArrayBuffers
 * @param   {String} fileName The name under which to store the downloaded file
 *
 * @returns {void}
 */
exports.downloadFile = function( data, fileName ) {
	var blob = new window.Blob( data );
	var anchor = document.createElement( 'a' );
	anchor.href = URL.createObjectURL( blob );
	anchor.download = fileName;
	anchor.textContent = 'XXXXXXX';

	if( anchor.click ) {
		anchor.click();
	} else {
		var evt = document.createEvent( 'MouseEvents' );
		evt.initMouseEvent( 'click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null );
		anchor.dispatchEvent( evt );
	}
}