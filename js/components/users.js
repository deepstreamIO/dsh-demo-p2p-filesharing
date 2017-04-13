const ds = require( '../services/ds' );

Vue.component( 'users', {
	template: `
		<div class="users">{{userString}}</div>
	`,
	data: function() {
		return {
			userString: 'You are alone in this room'
		}
	},
	created: function() {
		ds.client.on( 'user-change', this.createUserString.bind( this ) );
	},
	methods: {
		createUserString: function( users ) {
			console.log( 'createUserString', users );
			if( users.length === 1 ) {
				this.$data.userString = 'You are alone in this room';
			} else {
				this.$data.userString = 'You are in this room with ' + users.length - 1 + ' other user' + ( users.length > 2 ? 's': '' );
			}
		}
	}
});