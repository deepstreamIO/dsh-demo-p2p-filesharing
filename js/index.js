require( './components/file-upload' );
require( './components/room-name' );
require( './components/user-name' );
require( './components/user-list' );
const ds = require( './services/ds' );

ds.record.whenReady(() => {
	new Vue({ el: '#app' });
});