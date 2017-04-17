const ds = require( '../services/ds' );

Vue.component( 'file-transfer', {
	template: `
		<div class="transfer">
			<i class="material-icons" :title="origin" v-if="origin=='me'">folder</i>
			<i class="material-icons" :title="origin" v-else>face</i>
			<div class="transfer-progress">
				<div :style="{ width: progress + '%' }" :class="progress >= 100 ? 'green' : 'blue'"></div>
			</div>
			<i class="material-icons" :title="destination" v-if="destination=='me'">folder</i>
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
		ds.client.on( 'file-progress/_' + this.$props.uuid, this.updateFileProgress.bind( this ) );
	},
	methods: {
		cleanUp() {

			console.log( 'DONE' );
		},
		updateFileProgress( progress ) {
			this.$data.progress = progress * 100;
			if( progress >= 1 ) {
				this.cleanUp();
			}
		}
	}
});

