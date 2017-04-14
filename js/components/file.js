
const record = require( '../services/ds' ).record;
const dataChannel = require( '../services/data-channel' );
const ds = require( '../services/ds' );
const utils = require( '../utils/utils' );

/**
 * This component represents a single file that can be owned by multiple
 * users and downloaded multiple times
 *
 * @type {Vue.component}
 */
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

			/**
			 * The name of the file, including file extensions, e.g. "cat.jpg"
			 *
			 * @type {String}
			 */
			name: this.$props.fileItem.name,

			/**
			 * An integer representing the size of the file in byte
			 *
			 * @type {Number}
			 */
			size: this.$props.fileItem.size,

			/**
			 * The number of users that other users can download this file from
			 *
			 * @type {Number}
			 */
			ownerCount: this.$props.fileItem.ownerCount || 1,

			/**
			 * Is the current user one of the owners of the file?
			 *
			 * @type {Boolean}
			 */
			isOwner: this.$props.fileItem.owners.indexOf( dataChannel.userid ) > -1,

			/**
			 * A list of file tranfer maps that will be used to create file-transfer components
			 *
			 * @type {Array}
			 */
			transfers: []
		}
	},

	/**
	 * fileItem is a map containing information optained from the browser's File object
	 *
	 * @type {Array}
	 */
	props: [ 'fileItem' ],

	/**
	 * Subscribe to events for our file
	 *
	 * @returns {void}
	 */
	created() {
		ds.client.on( 'starting-transfer/' + this.$props.fileItem.name, this.onOutgoingTransfer );
		ds.record.subscribe( `files.${utils.toJsonPath( this.$props.fileItem.name )}.owners`, this.updateOwners.bind( this ), true );
	},
	methods: {

		/**
		 * Issues a remote procedure call (RPC) to another user that is the owner of
		 * a given file and prompts them to start transferring it to you
		 *
		 * @returns {void}
		 */
		requestTransfer() {
			var origin = this.$props.fileItem.owners[ Math.floor( Math.random() * this.$props.fileItem.owners.length ) ];
			var rpcName = 'request-file-transfer/' + origin;
			var fileName = this.$props.fileItem.name;
			ds.client.rpc.make( rpcName, {
				name: fileName,
				destination: dataChannel.userid
			}, this.onIncomingTransfer.bind( this, origin ) );
		},

		/**
		 * Creates a transfer component for file transfers from this user to another
		 *
		 * @param {String} uuid a unique id identifying the file transfer
		 *
		 * @returns {void}
		 */
		onOutgoingTransfer( uuid ) {
			this.transfers.push({
				uuid: uuid,
				origin: 'me',
				destination: 'TODO'
			});
		},

		/**
		 * Creates a transfer component for file transfers from another user to this one
		 *
		 * @param   {String} origin the username of the owner of the file we're receiving
		 * @param   {Error} error  an ERROR received as the result of the RPC, assumed to be null
		 * @param   {String} uuid   a unique id identifying the file transfer
		 *
		 * @returns {void}
		 */
		onIncomingTransfer( origin, error, uuid ) {
			this.transfers.push({
				uuid: uuid,
				origin: origin,
				destination: 'me'
			});
		},

		updateOwners( owners ) {
			this.$data.ownerCount = owners.length;
		},

		convertFileSize: utils.convertFileSize
	}
});