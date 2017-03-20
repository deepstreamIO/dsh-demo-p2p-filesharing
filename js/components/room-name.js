const roomId = require( '../services/ds' ).roomId;

Vue.component( 'room-name', {
	template: `
		<div class="room-name">
			<p>Share this link with whomever you wish to share files with</p>
			<h3>{{roomName}}</h3>
		</div>
	`,
	data: function() {
		return {
			roomName: document.location.origin + '?' + roomId
		}
	},
	methods: {

	}
});