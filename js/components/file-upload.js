const ds = require( '../services/ds' );
const dataChannel = require( '../services/data-channel' );

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
			files: []
		}
	},
	mounted: function() {
		var dropZone = this.$el.querySelector( '.file-drop-zone' );
		dropZone.ondragover = this.prevent;
		dropZone.ondragend = this.prevent;
		dropZone.ondrop = this.handleFileDrop.bind( this );
		ds.record.subscribe( 'files', this.updateFiles.bind( this ), true );
		ds.client.rpc.provide( 'request-file-transfer/' + dataChannel.userid, this.sendFile.bind( this ) );
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
			var currentFiles = ds.record.get( 'files' );
			var newFiles = [];
			var i = 0;

			for( i = 0; i < fileList.length; i++ ) {
				this._fileObjects[ fileList[ i ].name ] = fileList[ i ];
				newFiles.push({
					name: fileList[ i ].name,
					type: fileList[ i ].type,
					size: fileList[ i ].size,
					owners: [ dataChannel.userid ]
				});
			}

			ds.record.set( 'files', currentFiles.concat( newFiles ) );
		},

		sendFile( data, response ) {
			if( !this._fileObjects[ data.name ] ) {
				response.error( 'UNKNOWN FILE ' + data.name );
			}

			if( !dataChannel.channels[ data.destination ] ) {
				response.error( 'UNKNOWN USER ' + data.destination );
			}

			dataChannel.channels[ data.destination ].send( this._fileObjects[ data.name ] );
			response.send( this._fileObjects[ data.name ].uuid );
			ds.client.emit( 'starting-transfer/' + data.name, this._fileObjects[ data.name ].uuid );
		},

		updateFiles( files ) {
			this.$data.files = files;
		},

		showFileSelect( ) {
			$(this.$el).find('input[type="file"]').trigger( 'click' );
		},
		clearMyFiles() {
			var files = ds.record.get( 'files' ), i, index;
			for( i = 0; i < files.length; i++ ) {
				index = files[ i ].owners.indexOf( dataChannel.userid  );
				if( index === -1 ) {
					continue;
				}
				files[ i ].owners.splice( index, 1 );

				if( files[ i ].owners.lenth === 0 ) {
					files.splice( i, 1 );
				}
			}
			record.set( 'files', files );
		}
	}
});