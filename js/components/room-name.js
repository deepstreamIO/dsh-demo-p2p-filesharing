const roomId = require( '../services/ds' ).roomId;

Vue.component( 'room-name', {
	template: `
		<div class="room-name">
			<span>{{roomName}}</span>
			<i class="material-icons" title="copy to clipboard">assignment</i>
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