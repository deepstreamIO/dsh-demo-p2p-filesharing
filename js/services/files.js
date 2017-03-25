import EventEmitter from events;

class Files extends EventEmitter{
    constructor() {
        super();
        this._files = {};
    }

    addFileList( fileList ) {
        for( var i = 0; i < fileList.length; i++ ) {
            this._files[ fileList[ i ].uuid ] = files[ i ];
        }
    }
}