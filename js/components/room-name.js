const roomId = require( '../services/ds' ).roomId;

Vue.component( 'room-name', {
	template: `
		<div class="room-name">
			<span>{{roomName}}</span>
			<i class="material-icons copy" title="copy to clipboard">assignment</i>
		</div>
	`,
	data: function() {
		return {
			roomName: document.location.origin + '?' + roomId
		}
	},
	mounted(){
		const clipboardButton = this.$el.querySelector( '.copy' );
		clipboardButton.setAttribute( 'data-clipboard-text', this.$data.roomName );
		var zc = new ZeroClipboard( clipboardButton );
		zc.on( 'ready', function(){
			clipboardButton.style.opacity = '1';
		});
	}
});