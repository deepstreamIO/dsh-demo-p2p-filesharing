const ds = require( '../services/ds' );

Vue.component( 'user-name', {
	template: `
		<div class="user-name">
			<input type="text" v-model="username" />
		</div>
	`,
	data: function() {
		return {
			username: ''
		}
	},
	created: function() {
		this.$data.username = ds.initialUsername;
	},
	watch: {
		username: function( value ) {
			ds.record.set( 'users.'+ ds.userId, value );
		}
	}
});