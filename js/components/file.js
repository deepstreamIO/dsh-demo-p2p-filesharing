const SIZE_SHORT_CODES = [ 'KB', 'MB', 'GB', 'TB', 'PB' ];
const record = require( '../services/ds' ).record;
const dataChannel = require( '../services/data-channel' );
const ds = require( '../services/ds' );

Vue.component( 'file', {
	template: `
		<li>
			<header>
				<div class="name">
					{{name}}
					<small class="size"> ({{convertFileSize(size)}})</small>
				</div>
				<div class="owners">
					<i class="material-icons" title="User A">face</i>
					<div class="count">{{ownerCount}}</div>
				</div>
				<div v-if="isOwner" class="remove"><i class="material-icons">clear</i></div>
				<div v-else class="remove" v-on:click="requestTransfer"><i class="material-icons">file_download</i></div>
			</header>
			<div class="transfers">
				<file-transfer
					v-for="transfer in transfers"
					:origin=transfer.origin
					:destination=transfer.destination
					:uuid=transfer.uuid
					:key=transfer.uuid>
				</file-transfer>
			</div>
		</li>
	`,
	data: function() {
		return {
			name: this.$props.fileItem.name,
			size: this.$props.fileItem.size,
			ownerCount: this.$props.fileItem.ownerCount || 0,
			isOwner: this.$props.fileItem.owners.indexOf( ds.userId ) > -1,
			transfers: []
		}
	},
	props: [ 'fileItem' ],
	methods: {
		requestTransfer() {
			var origin = this.$props.fileItem.owners[ 0 ];
			var rpcName = 'request-file-transfer/' + origin;
			var fileName = this.$props.fileItem.name;
			ds.client.rpc.make( rpcName, fileName, this.onTransferId.bind( this, origin ) );
		},
		onTransferId( origin, error, uuid ) {
			console.log( 'onTransferId', uuid );
			this.transfers.push({
				uuid: uuid,
				origin: origin,
				destination: 'me'
			});
		},
		convertFileSize( size ) {
			if( size < 1024 ) {
				return size + 'B';
			}

			for( var i = 2; i < SIZE_SHORT_CODES.length - 1; i++ ) {
				if ( size < Math.pow( 1024, i ) ) {
					return ( size / Math.pow( 1024, i - 1 ) ).toFixed( 2 ) + ' ' + SIZE_SHORT_CODES[ i - 2 ];
				}
			}
		}
	}
});