const ds = require( '../services/ds' );
const room = require( '../p2p/room' );
const utils = require( '../utils/utils' );

Vue.component( 'file-upload', {
	template: `
		<div class="file-upload">
			<p>
				drag the files you wish to share into this box or <span class="interactive" v-on:click="showFileSelect">select them from your harddrive</span>
			</p>
			<ul class="file-drop-zone">
				<file v-for="fileItem in files" :fileItem="fileItem" :key="fileItem.name"></file>
			</ul>
			<input type="file" multiple v-on:change="handleFileDialog" />
		</div>
	`,
	data: function() {
		return {
			files: {}
		}
	},
	mounted: function() {
		var dropZone = this.$el.querySelector( '.file-drop-zone' );
		dropZone.ondragover = this.prevent;
		dropZone.ondragend = this.prevent;
		dropZone.ondrop = this.handleFileDrop.bind( this );
		ds.record.subscribe( 'files', this.updateFiles.bind( this ), true );
		ds.client.rpc.provide( 'request-file-transfer/' + ds.userId, this.sendFile.bind( this ) );
		this._fileObjects = {};
	},
	methods: {
		prevent: function() {
			return false;
		},
		handleFileDrop: function( event ) {
			event.stopPropagation();
			event.preventDefault();
			this.addFileList( event.dataTransfer.files );
		},
		handleFileDialog( event ) {
			this.addFileList( event.srcElement.files );
		},

		addFileList( fileList ) {
			for( var i = 0; i < fileList.length; i++ ) {
				this._fileObjects[ fileList[ i ].name ] = fileList[ i ];
				ds.record.set( 'files.' + utils.toJsonPath( fileList[ i ].name ), {
					name: fileList[ i ].name,
					type: fileList[ i ].type,
					size: fileList[ i ].size,
					owners: [ ds.userId ]
				});
			}
		},

		sendFile( data, response ) {
			if( !this._fileObjects[ data.name ] ) {
				response.error( 'UNKNOWN FILE ' + data.name );
			}

			if( !room.hasConnection( data.destination ) ) {
				response.error( 'UNKNOWN USER ' + data.destination );
			}
			var transferId = Math.floor( Math.random() * 4228250625 );
			room.sendFile( this._fileObjects[ data.name ], data.destination, transferId );

			response.send( transferId );
			ds.client.emit( 'starting-transfer/' + data.name, this._fileObjects[ data.name ].uuid );
		},

		updateFiles( files ) {console.log( 'update files',files );
			this.$data.files = files;
		},

		showFileSelect( ) {
			$(this.$el).find('input[type="file"]').trigger( 'click' );
		}
	}
});