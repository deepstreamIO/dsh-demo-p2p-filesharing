const ds = require( '../services/ds' );

Vue.component( 'user-list', {
	template: `
		<span class="user-list">{{userString}}</span>
	`,
	data: function() {
		return {
			userString: ds.record.get( 'users' )
		}
	},
	created: function() {
		ds.record.subscribe( 'users', this.setUsers.bind( this ), true );
	},
	methods: {
		setUsers: function( users ) {
			var userString = ' You are in this room with ';
			var keys = Object.keys( users );
			var i;

			if( keys.length === 1 ) {
				this.$data.userString = 'You are alone in this room.';
				return;
			}

			for( i = 0; i < keys.length; i++ ) {
				userString += users[ keys[ i ] ];

				if( i === keys.length - 2 ) {
					userString += ' and ';
				} else if( i < keys.length - 2 ) {
					userString += ', ';
				}
			}

			this.$data.userString = userString;
		}
	}
});