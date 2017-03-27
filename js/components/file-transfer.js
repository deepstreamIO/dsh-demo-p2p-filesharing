const ds = require( '../services/ds' );

Vue.component( 'file-transfer', {
	template: `
		<div class="transfer">
			<i class="material-icons" :title="origin" v-if="origin=='me'">folder</i>
			<i class="material-icons" :title="origin" v-else>face</i>
			<div class="transfer-progress">
				<div :style="{ width: progress + '%' }" class="blue"></div>
			</div>
			<i class="material-icons" :title="destination" v-if="destination!='me'">folder</i>
			<i class="material-icons" :title="destination" v-else>face</i>
		</div>
	`,
	props: [ 'origin', 'destination', 'uuid' ],
	data: function() {
		return {
			progress: 0
		}
	},
	created() {
		console.log( 'SUBSCRIBING TO', 'file-progress/' + this.$props.uuid );
		ds.client.on( 'file-progress/' + this.$props.uuid, this.updateFileProgress.bind( this ) );
		ds.client.on( 'file-complete/' + this.$props.uuid, this.cleanUp.bind( this ) );
	},
	methods: {
		cleanUp() {
			console.log( 'DONE' );
		},
		updateFileProgress( chunk ) {
			this.$data.progress = ( chunk.currentPosition / ( chunk.length + 1 ) ) * 100;
		}
	}
});

