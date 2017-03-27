require( './components/file-upload' );
require( './components/file' );
require( './components/file-transfer' );
require( './components/room-name' );
require( './components/users' );
const ds = require( './services/ds' );

ds.record.whenReady(() => {
	new Vue({
		el: '#app',
		mounted: function() {
			setTimeout(function(){
				document.body.classList.remove('loading');
			}, 50 );
		}
	});
});