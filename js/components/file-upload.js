const SIZE_SHORT_CODES = [ 'KB', 'MB', 'GB', 'TB', 'PB' ];
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
			<input type="file" multiple />
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
		dropZone.ondrop = this.handleDrop.bind( this );
		ds.record.subscribe( 'files', this.updateFiles.bind( this ), true );
		ds.client.rpc.provide( 'request-file-transfer/' + ds.userId, this.sendFile.bind( this ) );
		window.onbeforeunload = this.clearMyFiles.bind( this );
		this._fileObjects = {};
	},
	methods: {
		prevent: function() {
			return false;
		},
		handleDrop: function( e ) {
			e.stopPropagation();
			e.preventDefault();
			var currentFiles = ds.record.get( 'files' );
			var newFiles = this.getFiles( e.dataTransfer.files );
			ds.record.set( 'files', currentFiles.concat( newFiles ) );
		},
		sendFile( name, response ) {
			if( this._fileObjects[ name ] ) {
				dataChannel.send( this._fileObjects[ name ] );
				response.send( this._fileObjects[ name ].uuid );
			} else {
				response.error( 'UNKNOWN FILE ' + name );
			}
		},
		getFiles( fileList ) {
			var files = [],
				i = 0;

			for( i = 0; i < fileList.length; i++ ) {
				this._fileObjects[ fileList[ i ].name ] = fileList[ i ];
				files.push({
					name: fileList[ i ].name,
					type: fileList[ i ].type,
					size: fileList[ i ].size,
					owners: [ ds.userId ]
				});
			}

			return files;
		},
		updateFiles( files ) {
			this.$data.files = files;
		},
		showFileSelect( ) {

		},
		clearMyFiles() {
			var files = ds.record.get( 'files' ), i, index;
			for( i = 0; i < files.length; i++ ) {
				index = files[ i ].owners.indexOf( ds.userId );
				if( index === -1 ) {
					continue;
				}
				files[ i ].owners.splice( index, 1 );

				if( files[ i ].owners.lenth === 0 ) {
					files.splice( i, 1 );
				}
			}
			record.set( 'files', files );
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