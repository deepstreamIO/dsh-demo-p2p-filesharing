const SIZE_SHORT_CODES = [ 'KB', 'MB', 'GB', 'TB', 'PB' ];
const record = require( '../services/ds' ).record;
const dataChannel = require( '../services/data-channel' );

Vue.component( 'file-upload', {
	template: `
		<div class="file-upload">
			<p>
				drag the files you wish to share into this box or <span class="interactive" v-on:click="showFileSelect">select them from your harddrive</span>
			</p>
			<ul class="file-drop-zone">
				<li v-for="file in files">
					<div class="name">
						{{file.name}}
						<span class="size"> ({{convertFileSize(file.size)}})</span>
					</div>
					<div class="remove"><i class="material-icons">clear</i></div>
				</li>
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
		record.subscribe( 'files', this.updateFiles.bind( this ), true );
	},
	methods: {
		prevent: function() {
			return false;
		},
		handleDrop: function( e ) {
			e.stopPropagation();
			e.preventDefault();
			var currentFiles = record.get( 'files' );
			var newFiles = this.getFiles( e.dataTransfer.files );
			dataChannel.send( e.dataTransfer.files[ 0 ]);
			record.set( 'files', currentFiles.concat( newFiles ) );
		},
		getFiles( fileList ) {
			var files = [],
				i = 0,
				owner = 'TODO';

			for( i = 0; i < fileList.length; i++ ) {
				files.push({
					name: fileList[ i ].name,
					type: fileList[ i ].type,
					size: fileList[ i ].size,
					owners: [ owner ]
				});
			}

			return files;
		},
		updateFiles( files ) {
			this.$data.files = files;
		},
		showFileSelect( ) {

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