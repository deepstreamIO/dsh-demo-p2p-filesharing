/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__( 1 );
	__webpack_require__( 83 );
	__webpack_require__( 84 );
	__webpack_require__( 85 );
	__webpack_require__( 86 );
	const ds = __webpack_require__( 2 );

	ds.record.whenReady(() => {
		new Vue({
			el: '#app',
			data: {
				currentYear: (new Date()).getFullYear()
			},
			mounted: function() {
				setTimeout(function(){
					document.body.classList.remove('loading');
				}, 50 );
			}
		});
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	const ds = __webpack_require__( 2 );
	const room = __webpack_require__( 34 );
	const utils = __webpack_require__( 81 );
	window.room = room;
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
				ds.client.emit( 'starting-transfer/' + data.name, transferId );
			},

			updateFiles( files ) {console.log( 'update files',files );
				this.$data.files = files;
			},

			showFileSelect( ) {
				$(this.$el).find('input[type="file"]').trigger( 'click' );
			}
		}
	});

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Request the deepstream client
	 *
	 * @type {Deepstream.Factory} the deepstream client factory
	 */
	const deepstream = __webpack_require__( 3 );

	/**
	 * Connect to deepstreamHub using the given URL and API key
	 *
	 * @type {Deepstream.Client} the deepstream client object
	 */
	const client = deepstream( 'wss://154.deepstreamhub.com?apiKey=a6c10d51-b4ad-4a7f-9713-273978835ce5' );

	/**
	 * A flag indicating if this user has started a new room and the associated record needs to be set up
	 *
	 * @type {Boolean}
	 */
	const isFirstInRoom = !document.location.hash;

	/**
	 * Create a new room id or read the existing one from the URL
	 *
	 * @type {String}
	 */
	const roomId = isFirstInRoom ? client.getUid() : document.location.hash.substr( 1 );

	/**
	 * A unique identifier, specifying this user
	 *
	 * @type {String}
	 */
	const userId = 'user/' + client.getUid();

	/**
	 * We store all information related to this room in a single global record identified by the room-id
	 *
	 * @type {Deepstream.Record}
	 */
	const record = client.record.getRecord( 'p2p-roomId/' + roomId );

	/**
	 * Establish the connection to deepstreamHub
	 */
	client.login();

	/**
	 * If we're the first user in this room, we'll need to create
	 * the initial data structure for the room-record and append
	 * the generated room-id to the URL to allow for bookmarking
	 */
	if( isFirstInRoom ) {
		document.location.hash = roomId;
		record.set({
			files: {},
			users: [ userId ]
		});
	} else {
		record.whenReady(() => {
			record.set( 'users', record.get( 'users' ).concat([ userId ]) );
		});
	}

	exports.client = client;
	exports.roomId = roomId;
	exports.record = record;
	exports.userId = userId;
	exports.isFirstInRoom = isFirstInRoom;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		MS = __webpack_require__( 5 ),
		Emitter = __webpack_require__( 6 ),
		Connection = __webpack_require__( 7 ),
		EventHandler = __webpack_require__( 19 ),
		RpcHandler = __webpack_require__( 22 ),
		RecordHandler = __webpack_require__( 25 ),
		PresenceHandler = __webpack_require__( 31 ),
		defaultOptions = __webpack_require__( 32 ),
		messageBuilder = __webpack_require__( 10 ),
		AckTimeoutRegistry = __webpack_require__( 33 );

	/**
	 * deepstream.io javascript client
	 *
	 * @copyright 2016 deepstreamHub GmbH
	 * @author deepstreamHub GmbH
	 *
	 *
	 * @{@link http://deepstream.io}
	 *
	 *
	 * @param {String} url     URL to connect to. The protocol can be ommited, e.g. <host>:<port>.
	 * @param {Object} options A map of options that extend the ones specified in default-options.js
	 *
	 * @public
	 * @constructor
	 */
	var Client = function( url, options ) {
		this._url = url;
		this._options = this._getOptions( options || {} );

		this._connection = new Connection( this, this._url, this._options );
		this._ackTimeoutRegistry = new AckTimeoutRegistry(this, this._options);

		this.event = new EventHandler( this._options, this._connection, this );
		this.rpc = new RpcHandler( this._options, this._connection, this );
		this.record = new RecordHandler( this._options, this._connection, this );
		this.presence = new PresenceHandler( this._options, this._connection, this );

		this._messageCallbacks = {};
		this._messageCallbacks[ C.TOPIC.EVENT ] = this.event._$handle.bind( this.event );
		this._messageCallbacks[ C.TOPIC.RPC ] = this.rpc._$handle.bind( this.rpc );
		this._messageCallbacks[ C.TOPIC.RECORD ] = this.record._$handle.bind( this.record );
		this._messageCallbacks[ C.TOPIC.PRESENCE ] = this.presence._$handle.bind( this.presence );
		this._messageCallbacks[ C.TOPIC.ERROR ] = this._onErrorMessage.bind( this );
	};

	Emitter( Client.prototype );

	/**
	 * Send authentication parameters to the client to fully open
	 * the connection.
	 *
	 * Please note: Authentication parameters are send over an already established
	 * connection, rather than appended to the server URL. This means the parameters
	 * will be encrypted when used with a WSS / HTTPS connection. If the deepstream server
	 * on the other side has message logging enabled it will however be written to the logs in
	 * plain text. If additional security is a requirement it might therefor make sense to hash
	 * the password on the client.
	 *
	 * If the connection is not yet established the authentication parameter will be
	 * stored and send once it becomes available
	 *
	 * authParams can be any JSON serializable data structure and its up for the
	 * permission handler on the server to make sense of them, although something
	 * like { username: 'someName', password: 'somePass' } will probably make the most sense.
	 *
	 * login can be called multiple times until either the connection is authenticated or
	 * forcefully closed by the server since its maxAuthAttempts threshold has been exceeded
	 *
	 * @param   {Object}   authParams JSON.serializable authentication data
	 * @param   {Function} callback   Will be called with either (true) or (false, data)
	 *
	 * @public
	 * @returns {Client}
	 */
	Client.prototype.login = function( authParams, callback ) {
		this._connection.authenticate( authParams || {}, callback );
		return this;
	};

	/**
	 * Closes the connection to the server.
	 *
	 * @public
	 * @returns {void}
	 */
	Client.prototype.close = function() {
		this._connection.close();
	};

	/**
	 * Returns the current state of the connection.
	 *
	 * connectionState is one of CONSTANTS.CONNECTION_STATE
	 *
	 * @returns {[type]} [description]
	 */
	Client.prototype.getConnectionState = function() {
		return this._connection.getState();
	};

	/**
	 * Returns a random string. The first block of characters
	 * is a timestamp, in order to allow databases to optimize for semi-
	 * sequentuel numberings
	 *
	 * @public
	 * @returns {String} unique id
	 */
	Client.prototype.getUid = function() {
		var timestamp = (new Date()).getTime().toString(36),
			randomString = (Math.random() * 10000000000000000).toString(36).replace( '.', '' );

		return timestamp + '-' + randomString;
	};

	/**
	 * Package private ack timeout registry. This is how all classes can get access to register timeouts.
	 * (Well... that's the intention anyways)
	 *
	 * @package private
	 * @returns {AckTimeoutRegistry}
	 */
	Client.prototype._$getAckTimeoutRegistry = function() {
		return this._ackTimeoutRegistry;
	};

	/**
	 * Package private callback for parsed incoming messages. Will be invoked
	 * by the connection class
	 *
	 * @param   {Object} message parsed deepstream message
	 *
	 * @package private
	 * @returns {void}
	 */
	Client.prototype._$onMessage = function( message ) {
		if( this._messageCallbacks[ message.topic ] ) {
			this._messageCallbacks[ message.topic ]( message );
		} else {
			message.processedError = true;
			this._$onError( message.topic, C.EVENT.MESSAGE_PARSE_ERROR, 'Received message for unknown topic ' + message.topic );
		}

		if( message.action === C.ACTIONS.ERROR && !message.processedError ) {
			this._$onError( message.topic, message.data[ 0 ],  message.data.slice( 0 ) );
		}
	};

	/**
	 * Package private error callback. This is the single point at which
	 * errors are thrown in the client. (Well... that's the intention anyways)
	 *
	 * The expectations would be for implementations to subscribe
	 * to the client's error event to prevent errors from being thrown
	 * and then decide based on the event and topic parameters how
	 * to handle the errors
	 *
	 * IMPORTANT: Errors that are specific to a request, e.g. a RPC
	 * timing out or a record not being permissioned are passed directly
	 * to the method that requested them
	 *
	 * @param   {String} topic One of CONSTANTS.TOPIC
	 * @param   {String} event One of CONSTANTS.EVENT
	 * @param   {String} msg   Error dependent message
	 *
	 * @package private
	 * @returns {void}
	 */
	Client.prototype._$onError = function( topic, event, msg ) {
		var errorMsg;

		/*
		 * Help to diagnose the problem quicker by checking for
		 * some common problems
		 */
		if( event === C.EVENT.ACK_TIMEOUT || event === C.EVENT.RESPONSE_TIMEOUT ) {
			if( this.getConnectionState() === C.CONNECTION_STATE.AWAITING_AUTHENTICATION ) {
				errorMsg = 'Your message timed out because you\'re not authenticated. Have you called login()?';
				setTimeout( this._$onError.bind( this, C.EVENT.NOT_AUTHENTICATED, C.TOPIC.ERROR, errorMsg ), 1 );
			}
		}

		if( this.hasListeners( 'error' ) ) {
			this.emit( 'error', msg, event, topic );
			this.emit( event, topic, msg );
		} else {
			console.log( '--- You can catch all deepstream errors by subscribing to the error event ---' );

			errorMsg = event + ': ' + msg;

			if( topic ) {
				errorMsg += ' (' + topic + ')';
			}

			throw new Error( errorMsg );
		}
	};

	/**
	 * Passes generic messages from the error topic
	 * to the _$onError handler
	 *
	 * @param {Object} errorMessage parsed deepstream error message
	 *
	 * @private
	 * @returns {void}
	 */
	Client.prototype._onErrorMessage = function( errorMessage ) {
		this._$onError( errorMessage.topic, errorMessage.data[ 0 ], errorMessage.data[ 1 ] );
	};

	/**
	 * Creates a new options map by extending default
	 * options with the passed in options
	 *
	 * @param   {Object} options The user specified client configuration options
	 *
	 * @private
	 * @returns {Object}	merged options
	 */
	Client.prototype._getOptions = function( options ) {
		var mergedOptions = {},
			key;

		for( key in defaultOptions ) {
			if( typeof options[ key ] === 'undefined' ) {
				mergedOptions[ key ] = defaultOptions[ key ];
			} else {
				mergedOptions[ key ] = options[ key ];
			}
		}

		return mergedOptions;
	};

	/**
	 * Exports factory function to adjust to the current JS style of
	 * disliking 'new' :-)
	 *
	 * @param {String} url     URL to connect to. The protocol can be ommited, e.g. <host>:<port>.
	 * @param {Object} options A map of options that extend the ones specified in default-options.js
	 *
	 * @public
	 * @returns {void}
	 */
	function createDeepstream( url, options ) {
		return new Client( url, options );
	}

	/**
	 * Expose constants to allow consumers to access them
	*/
	Client.prototype.CONSTANTS = C;
	createDeepstream.CONSTANTS = C;

	/**
	 * Expose merge strategies to allow consumers to access them
	*/
	Client.prototype.MERGE_STRATEGIES = MS;
	createDeepstream.MERGE_STRATEGIES = MS;

	module.exports = createDeepstream;


/***/ },
/* 4 */
/***/ function(module, exports) {

	exports.CONNECTION_STATE = {};

	exports.CONNECTION_STATE.CLOSED = 'CLOSED';
	exports.CONNECTION_STATE.AWAITING_CONNECTION = 'AWAITING_CONNECTION';
	exports.CONNECTION_STATE.CHALLENGING = 'CHALLENGING';
	exports.CONNECTION_STATE.AWAITING_AUTHENTICATION = 'AWAITING_AUTHENTICATION';
	exports.CONNECTION_STATE.AUTHENTICATING = 'AUTHENTICATING';
	exports.CONNECTION_STATE.OPEN = 'OPEN';
	exports.CONNECTION_STATE.ERROR = 'ERROR';
	exports.CONNECTION_STATE.RECONNECTING = 'RECONNECTING';

	exports.MESSAGE_SEPERATOR = String.fromCharCode( 30 ); // ASCII Record Seperator 1E
	exports.MESSAGE_PART_SEPERATOR = String.fromCharCode( 31 ); // ASCII Unit Separator 1F

	exports.TYPES = {};
	exports.TYPES.STRING = 'S';
	exports.TYPES.OBJECT = 'O';
	exports.TYPES.NUMBER = 'N';
	exports.TYPES.NULL = 'L';
	exports.TYPES.TRUE = 'T';
	exports.TYPES.FALSE = 'F';
	exports.TYPES.UNDEFINED = 'U';

	exports.TOPIC = {};
	exports.TOPIC.CONNECTION = 'C';
	exports.TOPIC.AUTH = 'A';
	exports.TOPIC.ERROR = 'X';
	exports.TOPIC.EVENT = 'E';
	exports.TOPIC.RECORD = 'R';
	exports.TOPIC.RPC = 'P';
	exports.TOPIC.PRESENCE = 'U';
	exports.TOPIC.PRIVATE = 'PRIVATE/';

	exports.EVENT = {};
	exports.EVENT.CONNECTION_ERROR = 'connectionError';
	exports.EVENT.CONNECTION_STATE_CHANGED = 'connectionStateChanged';
	exports.EVENT.MAX_RECONNECTION_ATTEMPTS_REACHED = 'MAX_RECONNECTION_ATTEMPTS_REACHED';
	exports.EVENT.CONNECTION_AUTHENTICATION_TIMEOUT = 'CONNECTION_AUTHENTICATION_TIMEOUT';
	exports.EVENT.ACK_TIMEOUT = 'ACK_TIMEOUT';
	exports.EVENT.NO_RPC_PROVIDER = 'NO_RPC_PROVIDER';
	exports.EVENT.RESPONSE_TIMEOUT = 'RESPONSE_TIMEOUT';
	exports.EVENT.DELETE_TIMEOUT = 'DELETE_TIMEOUT';
	exports.EVENT.UNSOLICITED_MESSAGE = 'UNSOLICITED_MESSAGE';
	exports.EVENT.MESSAGE_DENIED = 'MESSAGE_DENIED';
	exports.EVENT.MESSAGE_PARSE_ERROR = 'MESSAGE_PARSE_ERROR';
	exports.EVENT.VERSION_EXISTS = 'VERSION_EXISTS';
	exports.EVENT.NOT_AUTHENTICATED = 'NOT_AUTHENTICATED';
	exports.EVENT.MESSAGE_PERMISSION_ERROR = 'MESSAGE_PERMISSION_ERROR';
	exports.EVENT.LISTENER_EXISTS = 'LISTENER_EXISTS';
	exports.EVENT.NOT_LISTENING = 'NOT_LISTENING';
	exports.EVENT.TOO_MANY_AUTH_ATTEMPTS = 'TOO_MANY_AUTH_ATTEMPTS';
	exports.EVENT.IS_CLOSED = 'IS_CLOSED';
	exports.EVENT.RECORD_NOT_FOUND = 'RECORD_NOT_FOUND';
	exports.EVENT.NOT_SUBSCRIBED = 'NOT_SUBSCRIBED';

	exports.ACTIONS = {};
	exports.ACTIONS.PING = 'PI';
	exports.ACTIONS.PONG = 'PO';
	exports.ACTIONS.ACK = 'A';
	exports.ACTIONS.REDIRECT = 'RED';
	exports.ACTIONS.CHALLENGE = 'CH';
	exports.ACTIONS.CHALLENGE_RESPONSE = 'CHR';
	exports.ACTIONS.READ = 'R';
	exports.ACTIONS.CREATE = 'C';
	exports.ACTIONS.UPDATE = 'U';
	exports.ACTIONS.PATCH = 'P';
	exports.ACTIONS.DELETE = 'D';
	exports.ACTIONS.SUBSCRIBE = 'S';
	exports.ACTIONS.UNSUBSCRIBE = 'US';
	exports.ACTIONS.HAS = 'H';
	exports.ACTIONS.SNAPSHOT = 'SN';
	exports.ACTIONS.INVOKE = 'I';
	exports.ACTIONS.SUBSCRIPTION_FOR_PATTERN_FOUND = 'SP';
	exports.ACTIONS.SUBSCRIPTION_FOR_PATTERN_REMOVED = 'SR';
	exports.ACTIONS.SUBSCRIPTION_HAS_PROVIDER = 'SH';
	exports.ACTIONS.LISTEN = 'L';
	exports.ACTIONS.UNLISTEN = 'UL';
	exports.ACTIONS.LISTEN_ACCEPT = 'LA';
	exports.ACTIONS.LISTEN_REJECT = 'LR';
	exports.ACTIONS.PROVIDER_UPDATE = 'PU';
	exports.ACTIONS.QUERY = 'Q';
	exports.ACTIONS.CREATEORREAD = 'CR';
	exports.ACTIONS.EVENT = 'EVT';
	exports.ACTIONS.ERROR = 'E';
	exports.ACTIONS.REQUEST = 'REQ';
	exports.ACTIONS.RESPONSE = 'RES';
	exports.ACTIONS.REJECTION = 'REJ';
	exports.ACTIONS.PRESENCE_JOIN = 'PNJ';
	exports.ACTIONS.PRESENCE_LEAVE = 'PNL';
	exports.ACTIONS.QUERY = 'Q';
	exports.ACTIONS.WRITE_ACKNOWLEDGEMENT = 'WA';

	exports.CALL_STATE = {};
	exports.CALL_STATE.INITIAL = 'INITIAL';
	exports.CALL_STATE.CONNECTING = 'CONNECTING';
	exports.CALL_STATE.ESTABLISHED = 'ESTABLISHED';
	exports.CALL_STATE.ACCEPTED = 'ACCEPTED';
	exports.CALL_STATE.DECLINED = 'DECLINED';
	exports.CALL_STATE.ENDED = 'ENDED';
	exports.CALL_STATE.ERROR = 'ERROR';


/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = {
		/**
		*	Choose the server's state over the client's
		**/
		REMOTE_WINS: function( record, remoteValue, remoteVersion, callback ) {
			callback( null, remoteValue );
		},
		/**
		*	Choose the local state over the server's
		**/
		LOCAL_WINS: function( record, remoteValue, remoteVersion, callback ) {
			callback( null, record.get() );
		}
	};

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * Expose `Emitter`.
	 */

	if (true) {
	  module.exports = Emitter;
	}

	/**
	 * Initialize a new `Emitter`.
	 *
	 * @api public
	 */

	function Emitter(obj) {
	  if (obj) return mixin(obj);
	};

	/**
	 * Mixin the emitter properties.
	 *
	 * @param {Object} obj
	 * @return {Object}
	 * @api private
	 */

	function mixin(obj) {
	  for (var key in Emitter.prototype) {
	    obj[key] = Emitter.prototype[key];
	  }
	  return obj;
	}

	/**
	 * Listen on the given `event` with `fn`.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.on =
	Emitter.prototype.addEventListener = function(event, fn){
	  this._callbacks = this._callbacks || Object.create(null);
	  (this._callbacks[event] = this._callbacks[event] || [])
	    .push(fn);
	  return this;
	};

	/**
	 * Adds an `event` listener that will be invoked a single
	 * time then automatically removed.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.once = function(event, fn){
	  function on() {
	    this.off(event, on);
	    fn.apply(this, arguments);
	  }

	  on.fn = fn;
	  this.on(event, on);
	  return this;
	};

	/**
	 * Remove the given callback for `event` or all
	 * registered callbacks.
	 *
	 * @param {String} event
	 * @param {Function} fn
	 * @return {Emitter}
	 * @api public
	 */

	Emitter.prototype.off =
	Emitter.prototype.removeListener =
	Emitter.prototype.removeAllListeners =
	Emitter.prototype.removeEventListener = function(event, fn){
	  this._callbacks = this._callbacks || Object.create(null);

	  // all
	  if (0 == arguments.length) {
	    this._callbacks = Object.create(null);
	    return this;
	  }

	  // specific event
	  var callbacks = this._callbacks[event];
	  if (!callbacks) return this;

	  // remove all handlers
	  if (1 == arguments.length) {
	    delete this._callbacks[event];
	    return this;
	  }

	  // remove specific handler
	  var cb;
	  for (var i = 0; i < callbacks.length; i++) {
	    cb = callbacks[i];
	    if (cb === fn || cb.fn === fn) {
	      callbacks.splice(i, 1);
	      break;
	    }
	  }

	  // Remove event specific arrays for event types that no
	  // one is subscribed for to avoid memory leak.
	  if (callbacks.length === 0) {
	    delete this._callbacks[event];
	  }

	  return this;
	};

	/**
	 * Emit `event` with the given args.
	 *
	 * @param {String} event
	 * @param {Mixed} ...
	 * @return {Emitter}
	 */

	Emitter.prototype.emit = function(event){
	  this._callbacks = this._callbacks || Object.create(null);

	  var args = new Array(arguments.length - 1)
	    , callbacks = this._callbacks[event];

	  for (var i = 1; i < arguments.length; i++) {
	    args[i - 1] = arguments[i];
	  }

	  if (callbacks) {
	    callbacks = callbacks.slice(0);
	    for (var i = 0, len = callbacks.length; i < len; ++i) {
	      callbacks[i].apply(this, args);
	    }
	  }

	  return this;
	};

	/**
	 * Return array of callbacks for `event`.
	 *
	 * @param {String} event
	 * @return {Array}
	 * @api public
	 */

	Emitter.prototype.listeners = function(event){
	  this._callbacks = this._callbacks || Object.create(null);
	  return this._callbacks[event] || [];
	};

	/**
	 * Check if this emitter has `event` handlers.
	 *
	 * @param {String} event
	 * @return {Boolean}
	 * @api public
	 */

	Emitter.prototype.hasListeners = function(event){
	  return !! this.listeners(event).length;
	};

	/**
	 * Returns an array listing the events for which the emitter has registered listeners.
	 *
	 * @return {Array}
	 * @api public
	 */
	Emitter.prototype.eventNames = function(){
	  return this._callbacks ? Object.keys(this._callbacks) : [];
	}


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {var BrowserWebSocket = global.WebSocket || global.MozWebSocket,
		NodeWebSocket =  __webpack_require__( 8 ),
		messageParser = __webpack_require__( 9 ),
		messageBuilder = __webpack_require__( 10 ),
		utils = __webpack_require__( 11 ),
		C = __webpack_require__( 4 );

	/**
	 * Establishes a connection to a deepstream server using websockets
	 *
	 * @param {Client} client
	 * @param {String} url     Short url, e.g. <host>:<port>. Deepstream works out the protocol
	 * @param {Object} options connection options
	 *
	 * @constructor
	 */
	var Connection = function( client, url, options ) {
		this._client = client;
		this._options = options;
		this._authParams = null;
		this._authCallback = null;
		this._deliberateClose = false;
		this._redirecting = false;
		this._tooManyAuthAttempts = false;
		this._connectionAuthenticationTimeout = false;
		this._challengeDenied = false;
		this._queuedMessages = [];
		this._reconnectTimeout = null;
		this._reconnectionAttempt = 0;
		this._currentPacketMessageCount = 0;
		this._sendNextPacketTimeout = null;
		this._currentMessageResetTimeout = null;
		this._endpoint = null;
		this._lastHeartBeat = null;
		this._heartbeatInterval = null;

		this._originalUrl = utils.parseUrl( url, this._options.path );
		this._url = this._originalUrl;

		this._state = C.CONNECTION_STATE.CLOSED;
		this._createEndpoint();
	};

	/**
	 * Returns the current connection state.
	 * (One of constants.CONNECTION_STATE)
	 *
	 * @public
	 * @returns {String} connectionState
	 */
	Connection.prototype.getState = function() {
		return this._state;
	};

	/**
	 * Sends the specified authentication parameters
	 * to the server. Can be called up to <maxAuthAttempts>
	 * times for the same connection.
	 *
	 * @param   {Object}   authParams A map of user defined auth parameters. E.g. { username:<String>, password:<String> }
	 * @param   {Function} callback   A callback that will be invoked with the authenticationr result
	 *
	 * @public
	 * @returns {void}
	 */
	Connection.prototype.authenticate = function( authParams, callback ) {
		this._authParams = authParams;
		this._authCallback = callback;

		if( this._tooManyAuthAttempts || this._challengeDenied || this._connectionAuthenticationTimeout ) {
			this._client._$onError( C.TOPIC.ERROR, C.EVENT.IS_CLOSED, 'this client\'s connection was closed' );
			return;
		}
		else if( this._deliberateClose === true && this._state === C.CONNECTION_STATE.CLOSED ) {
			this._createEndpoint();
			this._deliberateClose = false;
			return;
		}

		if( this._state === C.CONNECTION_STATE.AWAITING_AUTHENTICATION ) {
			this._sendAuthParams();
		}
	};

	/**
	 * High level send message method. Creates a deepstream message
	 * string and invokes the actual send method.
	 *
	 * @param   {String} topic  One of C.TOPIC
	 * @param   {String} action One of C.ACTIONS
	 * @param   {[Mixed]} data 	Date that will be added to the message. Primitive values will
	 *                          be appended directly, objects and arrays will be serialized as JSON
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype.sendMsg = function( topic, action, data ) {
		this.send( messageBuilder.getMsg( topic, action, data ) );
	};

	/**
	 * Main method for sending messages. Doesn't send messages instantly,
	 * but instead achieves conflation by adding them to the message
	 * buffer that will be drained on the next tick
	 *
	 * @param   {String} message deepstream message
	 *
	 * @public
	 * @returns {void}
	 */
	Connection.prototype.send = function( message ) {
		this._queuedMessages.push( message );
		this._currentPacketMessageCount++;

		if( this._currentMessageResetTimeout === null ) {
			this._currentMessageResetTimeout = utils.nextTick( this._resetCurrentMessageCount.bind( this ) );
		}

		if( this._state === C.CONNECTION_STATE.OPEN &&
			this._queuedMessages.length < this._options.maxMessagesPerPacket &&
			this._currentPacketMessageCount < this._options.maxMessagesPerPacket ) {
			this._sendQueuedMessages();
		}
		else if( this._sendNextPacketTimeout === null ) {
			this._queueNextPacket();
		}
	};

	/**
	 * Closes the connection. Using this method
	 * sets a _deliberateClose flag that will prevent the client from
	 * reconnecting.
	 *
	 * @public
	 * @returns {void}
	 */
	Connection.prototype.close = function() {
		clearInterval( this._heartbeatInterval );
		this._deliberateClose = true;
		this._endpoint.close();
	};

	/**
	 * Creates the endpoint to connect to using the url deepstream
	 * was initialised with.
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._createEndpoint = function() {
		this._endpoint = BrowserWebSocket
			? new BrowserWebSocket( this._url )
			: new NodeWebSocket( this._url , this._options.nodeSocketOptions )
		;

		this._endpoint.onopen = this._onOpen.bind( this );
		this._endpoint.onerror = this._onError.bind( this );
		this._endpoint.onclose = this._onClose.bind( this );
		this._endpoint.onmessage = this._onMessage.bind( this );
	};

	/**
	 * When the implementation tries to send a large
	 * number of messages in one execution thread, the first
	 * <maxMessagesPerPacket> are send straight away.
	 *
	 * _currentPacketMessageCount keeps track of how many messages
	 * went into that first packet. Once this number has been exceeded
	 * the remaining messages are written to a queue and this message
	 * is invoked on a timeout to reset the count.
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._resetCurrentMessageCount = function() {
		this._currentPacketMessageCount = 0;
		this._currentMessageResetTimeout = null;
	};

	/**
	 * Concatenates the messages in the current message queue
	 * and sends them as a single package. This will also
	 * empty the message queue and conclude the send process.
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._sendQueuedMessages = function() {
		if( this._state !== C.CONNECTION_STATE.OPEN || this._endpoint.readyState !== this._endpoint.OPEN ) {
			return;
		}

		if( this._queuedMessages.length === 0 ) {
			this._sendNextPacketTimeout = null;
			return;
		}

		var message = this._queuedMessages.splice( 0, this._options.maxMessagesPerPacket ).join( '' );

		if( this._queuedMessages.length !== 0 ) {
			this._queueNextPacket();
		} else {
			this._sendNextPacketTimeout = null;
		}

		this._submit( message );
	};

	/**
	 * Sends a message to over the endpoint connection directly
	 *
	 * Will generate a connection error if the websocket was closed
	 * prior to an onclose event.
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._submit = function( message ) {
		if( this._endpoint.readyState === this._endpoint.OPEN ) {
			this._endpoint.send( message );
		} else {
			this._onError( 'Tried to send message on a closed websocket connection' );
		}
	}

	/**
	 * Schedules the next packet whilst the connection is under
	 * heavy load.
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._queueNextPacket = function() {
		var fn = this._sendQueuedMessages.bind( this ),
			delay = this._options.timeBetweenSendingQueuedPackages;

		this._sendNextPacketTimeout = setTimeout( fn, delay );
	};

	/**
	 * Sends authentication params to the server. Please note, this
	 * doesn't use the queued message mechanism, but rather sends the message directly
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._sendAuthParams = function() {
		this._setState( C.CONNECTION_STATE.AUTHENTICATING );
		var authMessage = messageBuilder.getMsg( C.TOPIC.AUTH, C.ACTIONS.REQUEST, [ this._authParams ] );
		this._submit( authMessage );
	};

	/**
	 * Ensures that a heartbeat was not missed more than once, otherwise it considers the connection
	 * to have been lost and closes it for reconnection.
	 * @return {void}
	 */
	Connection.prototype._checkHeartBeat = function() {
		var heartBeatTolerance = this._options.heartbeatInterval * 2;

		if( Date.now() - this._lastHeartBeat > heartBeatTolerance ) {
			clearInterval( this._heartbeatInterval );
			this._client._$onError(
				C.TOPIC.CONNECTION,
				C.EVENT.CONNECTION_ERROR,
				'Two connections heartbeats missed successively' );
			this._endpoint.close();
		}
	};

	/**
	 * Will be invoked once the connection is established. The client
	 * can't send messages yet, and needs to get a connection ACK or REDIRECT
	 * from the server before authenticating
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._onOpen = function() {
		this._clearReconnect();
		this._lastHeartBeat = Date.now();
		this._heartbeatInterval = utils.setInterval( this._checkHeartBeat.bind( this ), this._options.heartbeatInterval );
		this._setState( C.CONNECTION_STATE.AWAITING_CONNECTION );
	};

	/**
	 * Callback for generic connection errors. Forwards
	 * the error to the client.
	 *
	 * The connection is considered broken once this method has been
	 * invoked.
	 *
	 * @param   {String|Error} error connection error
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._onError = function( error ) {
		clearInterval( this._heartbeatInterval );
		this._setState( C.CONNECTION_STATE.ERROR );

		/*
		 * If the implementation isn't listening on the error event this will throw
		 * an error. So let's defer it to allow the reconnection to kick in.
		 */
		setTimeout(function(){
			var msg;
			if( error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' ) {
				msg = 'Can\'t connect! Deepstream server unreachable on ' + this._originalUrl;
			} else {
				msg = error.toString();
			}
			this._client._$onError( C.TOPIC.CONNECTION, C.EVENT.CONNECTION_ERROR, msg );
		}.bind( this ), 1);
	};

	/**
	 * Callback when the connection closes. This might have been a deliberate
	 * close triggered by the client or the result of the connection getting
	 * lost.
	 *
	 * In the latter case the client will try to reconnect using the configured
	 * strategy.
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._onClose = function() {
		clearInterval( this._heartbeatInterval );

		if( this._redirecting === true ) {
			this._redirecting = false;
			this._createEndpoint();
		}
		else if( this._deliberateClose === true ) {
			this._setState( C.CONNECTION_STATE.CLOSED );
		}
		else {
			this._tryReconnect();
		}
	};

	/**
	 * Callback for messages received on the connection.
	 *
	 * @param   {String} message deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._onMessage = function( message ) {
		var parsedMessages = messageParser.parse( message.data, this._client ),
			i;

		for( i = 0; i < parsedMessages.length; i++ ) {
			if( parsedMessages[ i ] === null ) {
				continue;
			}
			else if( parsedMessages[ i ].topic === C.TOPIC.CONNECTION ) {
				this._handleConnectionResponse( parsedMessages[ i ] );
			}
			else if( parsedMessages[ i ].topic === C.TOPIC.AUTH ) {
				this._handleAuthResponse( parsedMessages[ i ] );
			} else {
				this._client._$onMessage( parsedMessages[ i ] );
			}
		}
	};

	/**
	 * The connection response will indicate whether the deepstream connection
	 * can be used or if it should be forwarded to another instance. This
	 * allows us to introduce load-balancing if needed.
	 *
	 * If authentication parameters are already provided this will kick of
	 * authentication immediately. The actual 'open' event won't be emitted
	 * by the client until the authentication is successful.
	 *
	 * If a challenge is recieved, the user will send the url to the server
	 * in response to get the appropriate redirect. If the URL is invalid the
	 * server will respond with a REJECTION resulting in the client connection
	 * being permanently closed.
	 *
	 * If a redirect is recieved, this connection is closed and updated with
	 * a connection to the url supplied in the message.
	 *
	 * @param   {Object} message parsed connection message
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._handleConnectionResponse = function( message ) {
		var data;

		if( message.action === C.ACTIONS.PING ) {
			this._lastHeartBeat = Date.now();
			this._submit( messageBuilder.getMsg( C.TOPIC.CONNECTION, C.ACTIONS.PONG ) );
		}
		else if( message.action === C.ACTIONS.ACK ) {
			this._setState( C.CONNECTION_STATE.AWAITING_AUTHENTICATION );
			if( this._authParams ) {
				this._sendAuthParams();
			}
		}
		else if( message.action === C.ACTIONS.CHALLENGE ) {
			this._setState( C.CONNECTION_STATE.CHALLENGING );
			this._submit( messageBuilder.getMsg( C.TOPIC.CONNECTION, C.ACTIONS.CHALLENGE_RESPONSE, [ this._originalUrl ] ) );
		}
		else if( message.action === C.ACTIONS.REJECTION ) {
			this._challengeDenied = true;
			this.close();
		}
		else if( message.action === C.ACTIONS.REDIRECT ) {
			this._url = message.data[ 0 ];
			this._redirecting = true;
			this._endpoint.close();
		}
		else if( message.action === C.ACTIONS.ERROR ) {
			if( message.data[ 0 ] === C.EVENT.CONNECTION_AUTHENTICATION_TIMEOUT ) {
				this._deliberateClose = true;
				this._connectionAuthenticationTimeout = true;
				this._client._$onError( C.TOPIC.CONNECTION, message.data[ 0 ], message.data[ 1 ] );
			}
		}
	};

	/**
	 * Callback for messages received for the AUTH topic. If
	 * the authentication was successful this method will
	 * open the connection and send all messages that the client
	 * tried to send so far.
	 *
	 * @param   {Object} message parsed auth message
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._handleAuthResponse = function( message ) {
		var data;

		if( message.action === C.ACTIONS.ERROR ) {

			if( message.data[ 0 ] === C.EVENT.TOO_MANY_AUTH_ATTEMPTS ) {
				this._deliberateClose = true;
				this._tooManyAuthAttempts = true;
			} else {
				this._setState( C.CONNECTION_STATE.AWAITING_AUTHENTICATION );
			}

			if( this._authCallback ) {
				this._authCallback( false, this._getAuthData( message.data[ 1 ] ) );
			}

		} else if( message.action === C.ACTIONS.ACK ) {
			this._setState( C.CONNECTION_STATE.OPEN );

			if( this._authCallback ) {
				this._authCallback( true, this._getAuthData( message.data[ 0 ] ) );
			}

			this._sendQueuedMessages();
		}
	};

	/**
	 * Checks if data is present with login ack and converts it
	 * to the correct type
	 *
	 * @param {Object} message parsed and validated deepstream message
	 *
	 * @private
	 * @returns {object}
	 */
	Connection.prototype._getAuthData = function( data ) {
		if( data === undefined ) {
			return null;
		} else {
			return messageParser.convertTyped( data, this._client );
		}
	};

	/**
	 * Updates the connection state and emits the
	 * connectionStateChanged event on the client
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._setState = function( state ) {
		this._state = state;
		this._client.emit( C.EVENT.CONNECTION_STATE_CHANGED, state );
	};

	/**
	 * If the connection drops or is closed in error this
	 * method schedules increasing reconnection intervals
	 *
	 * If the number of failed reconnection attempts exceeds
	 * options.maxReconnectAttempts the connection is closed
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._tryReconnect = function() {
		if( this._reconnectTimeout !== null ) {
			return;
		}

		if( this._reconnectionAttempt < this._options.maxReconnectAttempts ) {
			this._setState( C.CONNECTION_STATE.RECONNECTING );
			this._reconnectTimeout = setTimeout(
				this._tryOpen.bind( this ),
				Math.min(
					this._options.maxReconnectInterval,
					this._options.reconnectIntervalIncrement * this._reconnectionAttempt
				)
			);
			this._reconnectionAttempt++;
		} else {
			this._clearReconnect();
			this.close();
			this._client.emit( C.MAX_RECONNECTION_ATTEMPTS_REACHED, this._reconnectionAttempt );
		}
	};

	/**
	 * Attempts to open a errourosly closed connection
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._tryOpen = function() {
		if( this._originalUrl !== this._url ) {
			this._url = this._originalUrl;
		}
		this._createEndpoint();
		this._reconnectTimeout = null;
	};

	/**
	 * Stops all further reconnection attempts,
	 * either because the connection is open again
	 * or because the maximal number of reconnection
	 * attempts has been exceeded
	 *
	 * @private
	 * @returns {void}
	 */
	Connection.prototype._clearReconnect = function() {
		clearTimeout( this._reconnectTimeout );
		this._reconnectTimeout = null;
		this._reconnectionAttempt = 0;
	};

	module.exports = Connection;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 8 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 );

	/**
	 * Parses ASCII control character seperated
	 * message strings into digestable maps
	 *
	 * @constructor
	 */
	var MessageParser = function() {
		this._actions = this._getActions();
	};

	/**
	 * Main interface method. Receives a raw message
	 * string, containing one or more messages
	 * and returns an array of parsed message objects
	 * or null for invalid messages
	 *
	 * @param   {String} message raw message
	 *
	 * @public
	 *
	 * @returns {Array} array of parsed message objects
	 *                  following the format
	 *                  {
	 *                  	raw: <original message string>
	 *                  	topic: <string>
	 *                  	action: <string - shortcode>
	 *                  	data: <array of strings>
	 *                  }
	 */
	MessageParser.prototype.parse = function( message, client ) {
		var parsedMessages = [],
			rawMessages = message.split( C.MESSAGE_SEPERATOR ),
			i;

		for( i = 0; i < rawMessages.length; i++ ) {
			if( rawMessages[ i ].length > 2 ) {
				parsedMessages.push( this._parseMessage( rawMessages[ i ], client ) );
			}
		}

		return parsedMessages;
	};

	/**
	 * Deserializes values created by MessageBuilder.typed to
	 * their original format
	 * 
	 * @param {String} value
	 *
	 * @public
	 * @returns {Mixed} original value
	 */
	MessageParser.prototype.convertTyped = function( value, client ) {
		var type = value.charAt( 0 );
		
		if( type === C.TYPES.STRING ) {
			return value.substr( 1 );
		}
		
		if( type === C.TYPES.OBJECT ) {
			try {
				return JSON.parse( value.substr( 1 ) );
			} catch( e ) {
				client._$onError( C.TOPIC.ERROR, C.EVENT.MESSAGE_PARSE_ERROR, e.toString() + '(' + value + ')' );
				return;
			}
		}
		
		if( type === C.TYPES.NUMBER ) {
			return parseFloat( value.substr( 1 ) );
		}
		
		if( type === C.TYPES.NULL ) {
			return null;
		}
		
		if( type === C.TYPES.TRUE ) {
			return true;
		}
		
		if( type === C.TYPES.FALSE ) {
			return false;
		}
		
		if( type === C.TYPES.UNDEFINED ) {
			return undefined;
		}
		
		client._$onError( C.TOPIC.ERROR, C.EVENT.MESSAGE_PARSE_ERROR, 'UNKNOWN_TYPE (' + value + ')' );
	};

	/**
	 * Turns the ACTION:SHORTCODE constants map
	 * around to facilitate shortcode lookup
	 *
	 * @private
	 *
	 * @returns {Object} actions
	 */
	MessageParser.prototype._getActions = function() {
		var actions = {},
			key;

		for( key in C.ACTIONS ) {
			actions[ C.ACTIONS[ key ] ] = key;
		}

		return actions;
	};

	/**
	 * Parses an individual message (as oposed to a 
	 * block of multiple messages as is processed by .parse())
	 *
	 * @param   {String} message
	 *
	 * @private
	 * 
	 * @returns {Object} parsedMessage
	 */
	MessageParser.prototype._parseMessage = function( message, client ) {
		var parts = message.split( C.MESSAGE_PART_SEPERATOR ), 
			messageObject = {};

		if( parts.length < 2 ) {
			message.processedError = true;
			client._$onError( C.TOPIC.ERROR, C.EVENT.MESSAGE_PARSE_ERROR, 'Insufficiant message parts' );
			return null;
		}

		if( this._actions[ parts[ 1 ] ] === undefined ) {
			message.processedError = true;
			client._$onError( C.TOPIC.ERROR, C.EVENT.MESSAGE_PARSE_ERROR, 'Unknown action ' + parts[ 1 ] );
			return null;
		}

		messageObject.raw = message;
		messageObject.topic = parts[ 0 ];
		messageObject.action = parts[ 1 ];
		messageObject.data = parts.splice( 2 );

		return messageObject;
	};

	module.exports = new MessageParser();

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		SEP = C.MESSAGE_PART_SEPERATOR;

	/**
	 * Creates a deepstream message string, based on the 
	 * provided parameters
	 *
	 * @param   {String} topic  One of CONSTANTS.TOPIC
	 * @param   {String} action One of CONSTANTS.ACTIONS
	 * @param   {Array} data An array of strings or JSON-serializable objects
	 *
	 * @returns {String} deepstream message string
	 */
	exports.getMsg = function( topic, action, data ) {
		if( data && !( data instanceof Array ) ) {
			throw new Error( 'data must be an array' );
		}
		var sendData = [ topic, action ],
			i;

		if( data ) {
			for( i = 0; i < data.length; i++ ) {
				if( typeof data[ i ] === 'object' ) {
					sendData.push( JSON.stringify( data[ i ] ) );
				} else {
					sendData.push( data[ i ] );
				}
			}
		}

		return sendData.join( SEP ) + C.MESSAGE_SEPERATOR;
	};

	/**
	 * Converts a serializable value into its string-representation and adds
	 * a flag that provides instructions on how to deserialize it.
	 * 
	 * Please see messageParser.convertTyped for the counterpart of this method
	 * 
	 * @param {Mixed} value
	 * 
	 * @public
	 * @returns {String} string representation of the value
	 */
	exports.typed = function( value ) {
		var type = typeof value;
		
		if( type === 'string' ) {
			return C.TYPES.STRING + value;
		}
		
		if( value === null ) {
			return C.TYPES.NULL;
		}
		
		if( type === 'object' ) {
			return C.TYPES.OBJECT + JSON.stringify( value );
		}
		
		if( type === 'number' ) {
			return C.TYPES.NUMBER + value.toString();
		}
		
		if( value === true ) {
			return C.TYPES.TRUE;
		}
		
		if( value === false ) {
			return C.TYPES.FALSE;
		}
		
		if( value === undefined ) {
			return C.TYPES.UNDEFINED;
		}
		
		throw new Error( 'Can\'t serialize type ' + value );
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * A regular expression that matches whitespace on either side, but
	 * not in the center of a string
	 *
	 * @type {RegExp}
	 */
	var TRIM_REGULAR_EXPRESSION = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

	/**
	 * Used in typeof comparisons
	 *
	 * @type {String}
	 */
	var OBJECT = 'object';

	/**
	 * True if environment is node, false if it's a browser
	 * This seems somewhat inelegant, if anyone knows a better solution,
	 * let's change this (must identify browserify's pseudo node implementation though)
	 *
	 * @public
	 * @type {Boolean}
	 */
	exports.isNode = typeof process !== 'undefined' && process.toString() === '[object process]';

	/**
	 * Provides as soon as possible async execution in a cross
	 * platform way
	 *
	 * @param   {Function} fn the function to be executed in an asynchronous fashion
	 *
	 * @public
	 * @returns {void}
	 */
	exports.nextTick = function( fn ) {
		if( exports.isNode ) {
			process.nextTick( fn );
		} else {
			setTimeout( fn, 0 );
		}
	};

	/**
	 * Removes whitespace from the beginning and end of a string
	 *
	 * @param   {String} inputString
	 *
	 * @public
	 * @returns {String} trimmedString
	 */
	exports.trim = function( inputString ) {
		if( inputString.trim ) {
			return inputString.trim();
		} else {
			return inputString.replace( TRIM_REGULAR_EXPRESSION, '' );
		}
	};

	/**
	 * Compares two objects for deep (recoursive) equality
	 *
	 * This used to be a significantly more complex custom implementation,
	 * but JSON.stringify has gotten so fast that it now outperforms the custom
	 * way by a factor of 1.5 to 3.
	 *
	 * In IE11 / Edge the custom implementation is still slightly faster, but for
	 * consistencies sake and the upsides of leaving edge-case handling to the native
	 * browser / node implementation we'll go for JSON.stringify from here on.
	 *
	 * Please find performance test results here
	 *
	 * http://jsperf.com/deep-equals-code-vs-json
	 *
	 * @param   {Mixed} objA
	 * @param   {Mixed} objB
	 *
	 * @public
	 * @returns {Boolean} isEqual
	 */
	exports.deepEquals= function( objA, objB ) {
		if ( objA === objB ) {
			return true
		}
		else if( typeof objA !== OBJECT || typeof objB !== OBJECT ) {
			return false;
		}
		else {
			return JSON.stringify( objA ) === JSON.stringify( objB );
		}
	};

	/**
	 * Similar to deepEquals above, tests have shown that JSON stringify outperforms any attempt of
	 * a code based implementation by 50% - 100% whilst also handling edge-cases and keeping implementation
	 * complexity low.
	 *
	 * If ES6/7 ever decides to implement deep copying natively (what happened to Object.clone? that was briefly
	 * a thing...), let's switch it for the native implementation. For now though, even Object.assign({}, obj) only
	 * provides a shallow copy.
	 *
	 * Please find performance test results backing these statements here:
	 *
	 * http://jsperf.com/object-deep-copy-assign
	 *
	 * @param   {Mixed} obj the object that should be cloned
	 *
	 * @public
	 * @returns {Mixed} clone
	 */
	exports.deepCopy = function( obj ) {
		if( typeof obj === OBJECT ) {
			return JSON.parse( JSON.stringify( obj ) );
		} else {
			return obj;
		}
	};

	/**
	 * Copy the top level of items, but do not copy its items recourisvely. This
	 * is much quicker than deepCopy does not guarantee the object items are new/unique.
	 * Mainly used to change the reference to the actual object itself, but not its children.
	 *
	 * @param   {Mixed} obj the object that should cloned
	 *
	 * @public
	 * @returns {Mixed} clone
	 */
	exports.shallowCopy = function ( obj ) {
		if ( Array.isArray( obj ) ) {
			return obj.slice( 0 );
		}
		else if ( typeof obj === OBJECT ) {
			var copy = Object.create( null );
			var props = Object.keys( obj );
			for ( var i = 0; i < props.length; i++ ) {
				copy[ props[ i ] ] = obj[ props[ i ] ];
			}
		  return copy;
		}
		return obj;
	}

	/**
	 * Set timeout utility that adds support for disabling a timeout
	 * by passing null
	 *
	 * @param {Function} callback        the function that will be called after the given time
	 * @param {Number}   timeoutDuration the duration of the timeout in milliseconds
	 *
	 * @public
	 * @returns {Number} timeoutId
	 */
	exports.setTimeout = function( callback, timeoutDuration ) {
		if( timeoutDuration !== null ) {
			return setTimeout( callback, timeoutDuration );
		} else {
			return -1;
		}
	};

	/**
	 * Set Interval utility that adds support for disabling an interval
	 * by passing null
	 *
	 * @param {Function} callback        the function that will be called after the given time
	 * @param {Number}   intervalDuration the duration of the interval in milliseconds
	 *
	 * @public
	 * @returns {Number} intervalId
	 */
	exports.setInterval = function( callback, intervalDuration ) {
		if( intervalDuration !== null ) {
			return setInterval( callback, intervalDuration );
		} else {
			return -1;
		}
	};

	/**
	 * Used to see if a protocol is specified within the url
	 * @type {RegExp}
	 */
	var hasUrlProtocol = /^wss:|^ws:|^\/\//;

	/**
	 * Used to see if the protocol contains any unsupported protocols
	 * @type {RegExp}
	 */
	var unsupportedProtocol = /^http:|^https:/;

	var URL = __webpack_require__( 13 );

	/**
	 * Take the url passed when creating the client and ensure the correct
	 * protocol is provided
	 * @param  {String} url Url passed in by client
	 * @return {String} Url with supported protocol
	 */
	exports.parseUrl = function( url, defaultPath ) {
		if( unsupportedProtocol.test( url ) ) {
			throw new Error( 'Only ws and wss are supported' );
		}
		if( !hasUrlProtocol.test( url ) ) {
			url = 'ws://' + url;
		} else if( url.indexOf( '//' ) === 0  ) {
			url = 'ws:' + url;
		}
		var serverUrl = URL.parse( url );
		if (!serverUrl.host) {
			throw new Error('invalid url, missing host');
		}
		serverUrl.protocol = serverUrl.protocol ? serverUrl.protocol : 'ws:';
		serverUrl.pathname = serverUrl.pathname ? serverUrl.pathname : defaultPath;
		return URL.format( serverUrl );
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 12 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	(function () {
	  try {
	    cachedSetTimeout = setTimeout;
	  } catch (e) {
	    cachedSetTimeout = function () {
	      throw new Error('setTimeout is not defined');
	    }
	  }
	  try {
	    cachedClearTimeout = clearTimeout;
	  } catch (e) {
	    cachedClearTimeout = function () {
	      throw new Error('clearTimeout is not defined');
	    }
	  }
	} ())
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = cachedSetTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    cachedClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        cachedSetTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var punycode = __webpack_require__(14);

	exports.parse = urlParse;
	exports.resolve = urlResolve;
	exports.resolveObject = urlResolveObject;
	exports.format = urlFormat;

	exports.Url = Url;

	function Url() {
	  this.protocol = null;
	  this.slashes = null;
	  this.auth = null;
	  this.host = null;
	  this.port = null;
	  this.hostname = null;
	  this.hash = null;
	  this.search = null;
	  this.query = null;
	  this.pathname = null;
	  this.path = null;
	  this.href = null;
	}

	// Reference: RFC 3986, RFC 1808, RFC 2396

	// define these here so at least they only have to be
	// compiled once on the first module load.
	var protocolPattern = /^([a-z0-9.+-]+:)/i,
	    portPattern = /:[0-9]*$/,

	    // RFC 2396: characters reserved for delimiting URLs.
	    // We actually just auto-escape these.
	    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

	    // RFC 2396: characters not allowed for various reasons.
	    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

	    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
	    autoEscape = ['\''].concat(unwise),
	    // Characters that are never ever allowed in a hostname.
	    // Note that any invalid chars are also handled, but these
	    // are the ones that are *expected* to be seen, so we fast-path
	    // them.
	    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
	    hostEndingChars = ['/', '?', '#'],
	    hostnameMaxLen = 255,
	    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
	    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
	    // protocols that can allow "unsafe" and "unwise" chars.
	    unsafeProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that never have a hostname.
	    hostlessProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that always contain a // bit.
	    slashedProtocol = {
	      'http': true,
	      'https': true,
	      'ftp': true,
	      'gopher': true,
	      'file': true,
	      'http:': true,
	      'https:': true,
	      'ftp:': true,
	      'gopher:': true,
	      'file:': true
	    },
	    querystring = __webpack_require__(16);

	function urlParse(url, parseQueryString, slashesDenoteHost) {
	  if (url && isObject(url) && url instanceof Url) return url;

	  var u = new Url;
	  u.parse(url, parseQueryString, slashesDenoteHost);
	  return u;
	}

	Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
	  if (!isString(url)) {
	    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
	  }

	  var rest = url;

	  // trim before proceeding.
	  // This is to support parse stuff like "  http://foo.com  \n"
	  rest = rest.trim();

	  var proto = protocolPattern.exec(rest);
	  if (proto) {
	    proto = proto[0];
	    var lowerProto = proto.toLowerCase();
	    this.protocol = lowerProto;
	    rest = rest.substr(proto.length);
	  }

	  // figure out if it's got a host
	  // user@server is *always* interpreted as a hostname, and url
	  // resolution will treat //foo/bar as host=foo,path=bar because that's
	  // how the browser resolves relative URLs.
	  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
	    var slashes = rest.substr(0, 2) === '//';
	    if (slashes && !(proto && hostlessProtocol[proto])) {
	      rest = rest.substr(2);
	      this.slashes = true;
	    }
	  }

	  if (!hostlessProtocol[proto] &&
	      (slashes || (proto && !slashedProtocol[proto]))) {

	    // there's a hostname.
	    // the first instance of /, ?, ;, or # ends the host.
	    //
	    // If there is an @ in the hostname, then non-host chars *are* allowed
	    // to the left of the last @ sign, unless some host-ending character
	    // comes *before* the @-sign.
	    // URLs are obnoxious.
	    //
	    // ex:
	    // http://a@b@c/ => user:a@b host:c
	    // http://a@b?@c => user:a host:c path:/?@c

	    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
	    // Review our test case against browsers more comprehensively.

	    // find the first instance of any hostEndingChars
	    var hostEnd = -1;
	    for (var i = 0; i < hostEndingChars.length; i++) {
	      var hec = rest.indexOf(hostEndingChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }

	    // at this point, either we have an explicit point where the
	    // auth portion cannot go past, or the last @ char is the decider.
	    var auth, atSign;
	    if (hostEnd === -1) {
	      // atSign can be anywhere.
	      atSign = rest.lastIndexOf('@');
	    } else {
	      // atSign must be in auth portion.
	      // http://a@b/c@d => host:b auth:a path:/c@d
	      atSign = rest.lastIndexOf('@', hostEnd);
	    }

	    // Now we have a portion which is definitely the auth.
	    // Pull that off.
	    if (atSign !== -1) {
	      auth = rest.slice(0, atSign);
	      rest = rest.slice(atSign + 1);
	      this.auth = decodeURIComponent(auth);
	    }

	    // the host is the remaining to the left of the first non-host char
	    hostEnd = -1;
	    for (var i = 0; i < nonHostChars.length; i++) {
	      var hec = rest.indexOf(nonHostChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }
	    // if we still have not hit it, then the entire thing is a host.
	    if (hostEnd === -1)
	      hostEnd = rest.length;

	    this.host = rest.slice(0, hostEnd);
	    rest = rest.slice(hostEnd);

	    // pull out port.
	    this.parseHost();

	    // we've indicated that there is a hostname,
	    // so even if it's empty, it has to be present.
	    this.hostname = this.hostname || '';

	    // if hostname begins with [ and ends with ]
	    // assume that it's an IPv6 address.
	    var ipv6Hostname = this.hostname[0] === '[' &&
	        this.hostname[this.hostname.length - 1] === ']';

	    // validate a little.
	    if (!ipv6Hostname) {
	      var hostparts = this.hostname.split(/\./);
	      for (var i = 0, l = hostparts.length; i < l; i++) {
	        var part = hostparts[i];
	        if (!part) continue;
	        if (!part.match(hostnamePartPattern)) {
	          var newpart = '';
	          for (var j = 0, k = part.length; j < k; j++) {
	            if (part.charCodeAt(j) > 127) {
	              // we replace non-ASCII char with a temporary placeholder
	              // we need this to make sure size of hostname is not
	              // broken by replacing non-ASCII by nothing
	              newpart += 'x';
	            } else {
	              newpart += part[j];
	            }
	          }
	          // we test again with ASCII char only
	          if (!newpart.match(hostnamePartPattern)) {
	            var validParts = hostparts.slice(0, i);
	            var notHost = hostparts.slice(i + 1);
	            var bit = part.match(hostnamePartStart);
	            if (bit) {
	              validParts.push(bit[1]);
	              notHost.unshift(bit[2]);
	            }
	            if (notHost.length) {
	              rest = '/' + notHost.join('.') + rest;
	            }
	            this.hostname = validParts.join('.');
	            break;
	          }
	        }
	      }
	    }

	    if (this.hostname.length > hostnameMaxLen) {
	      this.hostname = '';
	    } else {
	      // hostnames are always lower case.
	      this.hostname = this.hostname.toLowerCase();
	    }

	    if (!ipv6Hostname) {
	      // IDNA Support: Returns a puny coded representation of "domain".
	      // It only converts the part of the domain name that
	      // has non ASCII characters. I.e. it dosent matter if
	      // you call it with a domain that already is in ASCII.
	      var domainArray = this.hostname.split('.');
	      var newOut = [];
	      for (var i = 0; i < domainArray.length; ++i) {
	        var s = domainArray[i];
	        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
	            'xn--' + punycode.encode(s) : s);
	      }
	      this.hostname = newOut.join('.');
	    }

	    var p = this.port ? ':' + this.port : '';
	    var h = this.hostname || '';
	    this.host = h + p;
	    this.href += this.host;

	    // strip [ and ] from the hostname
	    // the host field still retains them, though
	    if (ipv6Hostname) {
	      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
	      if (rest[0] !== '/') {
	        rest = '/' + rest;
	      }
	    }
	  }

	  // now rest is set to the post-host stuff.
	  // chop off any delim chars.
	  if (!unsafeProtocol[lowerProto]) {

	    // First, make 100% sure that any "autoEscape" chars get
	    // escaped, even if encodeURIComponent doesn't think they
	    // need to be.
	    for (var i = 0, l = autoEscape.length; i < l; i++) {
	      var ae = autoEscape[i];
	      var esc = encodeURIComponent(ae);
	      if (esc === ae) {
	        esc = escape(ae);
	      }
	      rest = rest.split(ae).join(esc);
	    }
	  }


	  // chop off from the tail first.
	  var hash = rest.indexOf('#');
	  if (hash !== -1) {
	    // got a fragment string.
	    this.hash = rest.substr(hash);
	    rest = rest.slice(0, hash);
	  }
	  var qm = rest.indexOf('?');
	  if (qm !== -1) {
	    this.search = rest.substr(qm);
	    this.query = rest.substr(qm + 1);
	    if (parseQueryString) {
	      this.query = querystring.parse(this.query);
	    }
	    rest = rest.slice(0, qm);
	  } else if (parseQueryString) {
	    // no query string, but parseQueryString still requested
	    this.search = '';
	    this.query = {};
	  }
	  if (rest) this.pathname = rest;
	  if (slashedProtocol[lowerProto] &&
	      this.hostname && !this.pathname) {
	    this.pathname = '/';
	  }

	  //to support http.request
	  if (this.pathname || this.search) {
	    var p = this.pathname || '';
	    var s = this.search || '';
	    this.path = p + s;
	  }

	  // finally, reconstruct the href based on what has been validated.
	  this.href = this.format();
	  return this;
	};

	// format a parsed object into a url string
	function urlFormat(obj) {
	  // ensure it's an object, and not a string url.
	  // If it's an obj, this is a no-op.
	  // this way, you can call url_format() on strings
	  // to clean up potentially wonky urls.
	  if (isString(obj)) obj = urlParse(obj);
	  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
	  return obj.format();
	}

	Url.prototype.format = function() {
	  var auth = this.auth || '';
	  if (auth) {
	    auth = encodeURIComponent(auth);
	    auth = auth.replace(/%3A/i, ':');
	    auth += '@';
	  }

	  var protocol = this.protocol || '',
	      pathname = this.pathname || '',
	      hash = this.hash || '',
	      host = false,
	      query = '';

	  if (this.host) {
	    host = auth + this.host;
	  } else if (this.hostname) {
	    host = auth + (this.hostname.indexOf(':') === -1 ?
	        this.hostname :
	        '[' + this.hostname + ']');
	    if (this.port) {
	      host += ':' + this.port;
	    }
	  }

	  if (this.query &&
	      isObject(this.query) &&
	      Object.keys(this.query).length) {
	    query = querystring.stringify(this.query);
	  }

	  var search = this.search || (query && ('?' + query)) || '';

	  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

	  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
	  // unless they had them to begin with.
	  if (this.slashes ||
	      (!protocol || slashedProtocol[protocol]) && host !== false) {
	    host = '//' + (host || '');
	    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
	  } else if (!host) {
	    host = '';
	  }

	  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
	  if (search && search.charAt(0) !== '?') search = '?' + search;

	  pathname = pathname.replace(/[?#]/g, function(match) {
	    return encodeURIComponent(match);
	  });
	  search = search.replace('#', '%23');

	  return protocol + host + pathname + search + hash;
	};

	function urlResolve(source, relative) {
	  return urlParse(source, false, true).resolve(relative);
	}

	Url.prototype.resolve = function(relative) {
	  return this.resolveObject(urlParse(relative, false, true)).format();
	};

	function urlResolveObject(source, relative) {
	  if (!source) return relative;
	  return urlParse(source, false, true).resolveObject(relative);
	}

	Url.prototype.resolveObject = function(relative) {
	  if (isString(relative)) {
	    var rel = new Url();
	    rel.parse(relative, false, true);
	    relative = rel;
	  }

	  var result = new Url();
	  Object.keys(this).forEach(function(k) {
	    result[k] = this[k];
	  }, this);

	  // hash is always overridden, no matter what.
	  // even href="" will remove it.
	  result.hash = relative.hash;

	  // if the relative url is empty, then there's nothing left to do here.
	  if (relative.href === '') {
	    result.href = result.format();
	    return result;
	  }

	  // hrefs like //foo/bar always cut to the protocol.
	  if (relative.slashes && !relative.protocol) {
	    // take everything except the protocol from relative
	    Object.keys(relative).forEach(function(k) {
	      if (k !== 'protocol')
	        result[k] = relative[k];
	    });

	    //urlParse appends trailing / to urls like http://www.example.com
	    if (slashedProtocol[result.protocol] &&
	        result.hostname && !result.pathname) {
	      result.path = result.pathname = '/';
	    }

	    result.href = result.format();
	    return result;
	  }

	  if (relative.protocol && relative.protocol !== result.protocol) {
	    // if it's a known url protocol, then changing
	    // the protocol does weird things
	    // first, if it's not file:, then we MUST have a host,
	    // and if there was a path
	    // to begin with, then we MUST have a path.
	    // if it is file:, then the host is dropped,
	    // because that's known to be hostless.
	    // anything else is assumed to be absolute.
	    if (!slashedProtocol[relative.protocol]) {
	      Object.keys(relative).forEach(function(k) {
	        result[k] = relative[k];
	      });
	      result.href = result.format();
	      return result;
	    }

	    result.protocol = relative.protocol;
	    if (!relative.host && !hostlessProtocol[relative.protocol]) {
	      var relPath = (relative.pathname || '').split('/');
	      while (relPath.length && !(relative.host = relPath.shift()));
	      if (!relative.host) relative.host = '';
	      if (!relative.hostname) relative.hostname = '';
	      if (relPath[0] !== '') relPath.unshift('');
	      if (relPath.length < 2) relPath.unshift('');
	      result.pathname = relPath.join('/');
	    } else {
	      result.pathname = relative.pathname;
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    result.host = relative.host || '';
	    result.auth = relative.auth;
	    result.hostname = relative.hostname || relative.host;
	    result.port = relative.port;
	    // to support http.request
	    if (result.pathname || result.search) {
	      var p = result.pathname || '';
	      var s = result.search || '';
	      result.path = p + s;
	    }
	    result.slashes = result.slashes || relative.slashes;
	    result.href = result.format();
	    return result;
	  }

	  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
	      isRelAbs = (
	          relative.host ||
	          relative.pathname && relative.pathname.charAt(0) === '/'
	      ),
	      mustEndAbs = (isRelAbs || isSourceAbs ||
	                    (result.host && relative.pathname)),
	      removeAllDots = mustEndAbs,
	      srcPath = result.pathname && result.pathname.split('/') || [],
	      relPath = relative.pathname && relative.pathname.split('/') || [],
	      psychotic = result.protocol && !slashedProtocol[result.protocol];

	  // if the url is a non-slashed url, then relative
	  // links like ../.. should be able
	  // to crawl up to the hostname, as well.  This is strange.
	  // result.protocol has already been set by now.
	  // Later on, put the first path part into the host field.
	  if (psychotic) {
	    result.hostname = '';
	    result.port = null;
	    if (result.host) {
	      if (srcPath[0] === '') srcPath[0] = result.host;
	      else srcPath.unshift(result.host);
	    }
	    result.host = '';
	    if (relative.protocol) {
	      relative.hostname = null;
	      relative.port = null;
	      if (relative.host) {
	        if (relPath[0] === '') relPath[0] = relative.host;
	        else relPath.unshift(relative.host);
	      }
	      relative.host = null;
	    }
	    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
	  }

	  if (isRelAbs) {
	    // it's absolute.
	    result.host = (relative.host || relative.host === '') ?
	                  relative.host : result.host;
	    result.hostname = (relative.hostname || relative.hostname === '') ?
	                      relative.hostname : result.hostname;
	    result.search = relative.search;
	    result.query = relative.query;
	    srcPath = relPath;
	    // fall through to the dot-handling below.
	  } else if (relPath.length) {
	    // it's relative
	    // throw away the existing file, and take the new path instead.
	    if (!srcPath) srcPath = [];
	    srcPath.pop();
	    srcPath = srcPath.concat(relPath);
	    result.search = relative.search;
	    result.query = relative.query;
	  } else if (!isNullOrUndefined(relative.search)) {
	    // just pull out the search.
	    // like href='?foo'.
	    // Put this after the other two cases because it simplifies the booleans
	    if (psychotic) {
	      result.hostname = result.host = srcPath.shift();
	      //occationaly the auth can get stuck only in host
	      //this especialy happens in cases like
	      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	      var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                       result.host.split('@') : false;
	      if (authInHost) {
	        result.auth = authInHost.shift();
	        result.host = result.hostname = authInHost.shift();
	      }
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    //to support http.request
	    if (!isNull(result.pathname) || !isNull(result.search)) {
	      result.path = (result.pathname ? result.pathname : '') +
	                    (result.search ? result.search : '');
	    }
	    result.href = result.format();
	    return result;
	  }

	  if (!srcPath.length) {
	    // no path at all.  easy.
	    // we've already handled the other stuff above.
	    result.pathname = null;
	    //to support http.request
	    if (result.search) {
	      result.path = '/' + result.search;
	    } else {
	      result.path = null;
	    }
	    result.href = result.format();
	    return result;
	  }

	  // if a url ENDs in . or .., then it must get a trailing slash.
	  // however, if it ends in anything else non-slashy,
	  // then it must NOT get a trailing slash.
	  var last = srcPath.slice(-1)[0];
	  var hasTrailingSlash = (
	      (result.host || relative.host) && (last === '.' || last === '..') ||
	      last === '');

	  // strip single dots, resolve double dots to parent dir
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = srcPath.length; i >= 0; i--) {
	    last = srcPath[i];
	    if (last == '.') {
	      srcPath.splice(i, 1);
	    } else if (last === '..') {
	      srcPath.splice(i, 1);
	      up++;
	    } else if (up) {
	      srcPath.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (!mustEndAbs && !removeAllDots) {
	    for (; up--; up) {
	      srcPath.unshift('..');
	    }
	  }

	  if (mustEndAbs && srcPath[0] !== '' &&
	      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
	    srcPath.unshift('');
	  }

	  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
	    srcPath.push('');
	  }

	  var isAbsolute = srcPath[0] === '' ||
	      (srcPath[0] && srcPath[0].charAt(0) === '/');

	  // put the host back
	  if (psychotic) {
	    result.hostname = result.host = isAbsolute ? '' :
	                                    srcPath.length ? srcPath.shift() : '';
	    //occationaly the auth can get stuck only in host
	    //this especialy happens in cases like
	    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	    var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                     result.host.split('@') : false;
	    if (authInHost) {
	      result.auth = authInHost.shift();
	      result.host = result.hostname = authInHost.shift();
	    }
	  }

	  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

	  if (mustEndAbs && !isAbsolute) {
	    srcPath.unshift('');
	  }

	  if (!srcPath.length) {
	    result.pathname = null;
	    result.path = null;
	  } else {
	    result.pathname = srcPath.join('/');
	  }

	  //to support request.http
	  if (!isNull(result.pathname) || !isNull(result.search)) {
	    result.path = (result.pathname ? result.pathname : '') +
	                  (result.search ? result.search : '');
	  }
	  result.auth = relative.auth || result.auth;
	  result.slashes = result.slashes || relative.slashes;
	  result.href = result.format();
	  return result;
	};

	Url.prototype.parseHost = function() {
	  var host = this.host;
	  var port = portPattern.exec(host);
	  if (port) {
	    port = port[0];
	    if (port !== ':') {
	      this.port = port.substr(1);
	    }
	    host = host.substr(0, host.length - port.length);
	  }
	  if (host) this.hostname = host;
	};

	function isString(arg) {
	  return typeof arg === "string";
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isNull(arg) {
	  return arg === null;
	}
	function isNullOrUndefined(arg) {
	  return  arg == null;
	}


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! https://mths.be/punycode v1.3.2 by @mathias */
	;(function(root) {

		/** Detect free variables */
		var freeExports = typeof exports == 'object' && exports &&
			!exports.nodeType && exports;
		var freeModule = typeof module == 'object' && module &&
			!module.nodeType && module;
		var freeGlobal = typeof global == 'object' && global;
		if (
			freeGlobal.global === freeGlobal ||
			freeGlobal.window === freeGlobal ||
			freeGlobal.self === freeGlobal
		) {
			root = freeGlobal;
		}

		/**
		 * The `punycode` object.
		 * @name punycode
		 * @type Object
		 */
		var punycode,

		/** Highest positive signed 32-bit float value */
		maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

		/** Bootstring parameters */
		base = 36,
		tMin = 1,
		tMax = 26,
		skew = 38,
		damp = 700,
		initialBias = 72,
		initialN = 128, // 0x80
		delimiter = '-', // '\x2D'

		/** Regular expressions */
		regexPunycode = /^xn--/,
		regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
		regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

		/** Error messages */
		errors = {
			'overflow': 'Overflow: input needs wider integers to process',
			'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
			'invalid-input': 'Invalid input'
		},

		/** Convenience shortcuts */
		baseMinusTMin = base - tMin,
		floor = Math.floor,
		stringFromCharCode = String.fromCharCode,

		/** Temporary variable */
		key;

		/*--------------------------------------------------------------------------*/

		/**
		 * A generic error utility function.
		 * @private
		 * @param {String} type The error type.
		 * @returns {Error} Throws a `RangeError` with the applicable error message.
		 */
		function error(type) {
			throw RangeError(errors[type]);
		}

		/**
		 * A generic `Array#map` utility function.
		 * @private
		 * @param {Array} array The array to iterate over.
		 * @param {Function} callback The function that gets called for every array
		 * item.
		 * @returns {Array} A new array of values returned by the callback function.
		 */
		function map(array, fn) {
			var length = array.length;
			var result = [];
			while (length--) {
				result[length] = fn(array[length]);
			}
			return result;
		}

		/**
		 * A simple `Array#map`-like wrapper to work with domain name strings or email
		 * addresses.
		 * @private
		 * @param {String} domain The domain name or email address.
		 * @param {Function} callback The function that gets called for every
		 * character.
		 * @returns {Array} A new string of characters returned by the callback
		 * function.
		 */
		function mapDomain(string, fn) {
			var parts = string.split('@');
			var result = '';
			if (parts.length > 1) {
				// In email addresses, only the domain name should be punycoded. Leave
				// the local part (i.e. everything up to `@`) intact.
				result = parts[0] + '@';
				string = parts[1];
			}
			// Avoid `split(regex)` for IE8 compatibility. See #17.
			string = string.replace(regexSeparators, '\x2E');
			var labels = string.split('.');
			var encoded = map(labels, fn).join('.');
			return result + encoded;
		}

		/**
		 * Creates an array containing the numeric code points of each Unicode
		 * character in the string. While JavaScript uses UCS-2 internally,
		 * this function will convert a pair of surrogate halves (each of which
		 * UCS-2 exposes as separate characters) into a single code point,
		 * matching UTF-16.
		 * @see `punycode.ucs2.encode`
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode.ucs2
		 * @name decode
		 * @param {String} string The Unicode input string (UCS-2).
		 * @returns {Array} The new array of code points.
		 */
		function ucs2decode(string) {
			var output = [],
			    counter = 0,
			    length = string.length,
			    value,
			    extra;
			while (counter < length) {
				value = string.charCodeAt(counter++);
				if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
					// high surrogate, and there is a next character
					extra = string.charCodeAt(counter++);
					if ((extra & 0xFC00) == 0xDC00) { // low surrogate
						output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
					} else {
						// unmatched surrogate; only append this code unit, in case the next
						// code unit is the high surrogate of a surrogate pair
						output.push(value);
						counter--;
					}
				} else {
					output.push(value);
				}
			}
			return output;
		}

		/**
		 * Creates a string based on an array of numeric code points.
		 * @see `punycode.ucs2.decode`
		 * @memberOf punycode.ucs2
		 * @name encode
		 * @param {Array} codePoints The array of numeric code points.
		 * @returns {String} The new Unicode string (UCS-2).
		 */
		function ucs2encode(array) {
			return map(array, function(value) {
				var output = '';
				if (value > 0xFFFF) {
					value -= 0x10000;
					output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
					value = 0xDC00 | value & 0x3FF;
				}
				output += stringFromCharCode(value);
				return output;
			}).join('');
		}

		/**
		 * Converts a basic code point into a digit/integer.
		 * @see `digitToBasic()`
		 * @private
		 * @param {Number} codePoint The basic numeric code point value.
		 * @returns {Number} The numeric value of a basic code point (for use in
		 * representing integers) in the range `0` to `base - 1`, or `base` if
		 * the code point does not represent a value.
		 */
		function basicToDigit(codePoint) {
			if (codePoint - 48 < 10) {
				return codePoint - 22;
			}
			if (codePoint - 65 < 26) {
				return codePoint - 65;
			}
			if (codePoint - 97 < 26) {
				return codePoint - 97;
			}
			return base;
		}

		/**
		 * Converts a digit/integer into a basic code point.
		 * @see `basicToDigit()`
		 * @private
		 * @param {Number} digit The numeric value of a basic code point.
		 * @returns {Number} The basic code point whose value (when used for
		 * representing integers) is `digit`, which needs to be in the range
		 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
		 * used; else, the lowercase form is used. The behavior is undefined
		 * if `flag` is non-zero and `digit` has no uppercase form.
		 */
		function digitToBasic(digit, flag) {
			//  0..25 map to ASCII a..z or A..Z
			// 26..35 map to ASCII 0..9
			return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
		}

		/**
		 * Bias adaptation function as per section 3.4 of RFC 3492.
		 * http://tools.ietf.org/html/rfc3492#section-3.4
		 * @private
		 */
		function adapt(delta, numPoints, firstTime) {
			var k = 0;
			delta = firstTime ? floor(delta / damp) : delta >> 1;
			delta += floor(delta / numPoints);
			for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
				delta = floor(delta / baseMinusTMin);
			}
			return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
		}

		/**
		 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
		 * symbols.
		 * @memberOf punycode
		 * @param {String} input The Punycode string of ASCII-only symbols.
		 * @returns {String} The resulting string of Unicode symbols.
		 */
		function decode(input) {
			// Don't use UCS-2
			var output = [],
			    inputLength = input.length,
			    out,
			    i = 0,
			    n = initialN,
			    bias = initialBias,
			    basic,
			    j,
			    index,
			    oldi,
			    w,
			    k,
			    digit,
			    t,
			    /** Cached calculation results */
			    baseMinusT;

			// Handle the basic code points: let `basic` be the number of input code
			// points before the last delimiter, or `0` if there is none, then copy
			// the first basic code points to the output.

			basic = input.lastIndexOf(delimiter);
			if (basic < 0) {
				basic = 0;
			}

			for (j = 0; j < basic; ++j) {
				// if it's not a basic code point
				if (input.charCodeAt(j) >= 0x80) {
					error('not-basic');
				}
				output.push(input.charCodeAt(j));
			}

			// Main decoding loop: start just after the last delimiter if any basic code
			// points were copied; start at the beginning otherwise.

			for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

				// `index` is the index of the next character to be consumed.
				// Decode a generalized variable-length integer into `delta`,
				// which gets added to `i`. The overflow checking is easier
				// if we increase `i` as we go, then subtract off its starting
				// value at the end to obtain `delta`.
				for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

					if (index >= inputLength) {
						error('invalid-input');
					}

					digit = basicToDigit(input.charCodeAt(index++));

					if (digit >= base || digit > floor((maxInt - i) / w)) {
						error('overflow');
					}

					i += digit * w;
					t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

					if (digit < t) {
						break;
					}

					baseMinusT = base - t;
					if (w > floor(maxInt / baseMinusT)) {
						error('overflow');
					}

					w *= baseMinusT;

				}

				out = output.length + 1;
				bias = adapt(i - oldi, out, oldi == 0);

				// `i` was supposed to wrap around from `out` to `0`,
				// incrementing `n` each time, so we'll fix that now:
				if (floor(i / out) > maxInt - n) {
					error('overflow');
				}

				n += floor(i / out);
				i %= out;

				// Insert `n` at position `i` of the output
				output.splice(i++, 0, n);

			}

			return ucs2encode(output);
		}

		/**
		 * Converts a string of Unicode symbols (e.g. a domain name label) to a
		 * Punycode string of ASCII-only symbols.
		 * @memberOf punycode
		 * @param {String} input The string of Unicode symbols.
		 * @returns {String} The resulting Punycode string of ASCII-only symbols.
		 */
		function encode(input) {
			var n,
			    delta,
			    handledCPCount,
			    basicLength,
			    bias,
			    j,
			    m,
			    q,
			    k,
			    t,
			    currentValue,
			    output = [],
			    /** `inputLength` will hold the number of code points in `input`. */
			    inputLength,
			    /** Cached calculation results */
			    handledCPCountPlusOne,
			    baseMinusT,
			    qMinusT;

			// Convert the input in UCS-2 to Unicode
			input = ucs2decode(input);

			// Cache the length
			inputLength = input.length;

			// Initialize the state
			n = initialN;
			delta = 0;
			bias = initialBias;

			// Handle the basic code points
			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue < 0x80) {
					output.push(stringFromCharCode(currentValue));
				}
			}

			handledCPCount = basicLength = output.length;

			// `handledCPCount` is the number of code points that have been handled;
			// `basicLength` is the number of basic code points.

			// Finish the basic string - if it is not empty - with a delimiter
			if (basicLength) {
				output.push(delimiter);
			}

			// Main encoding loop:
			while (handledCPCount < inputLength) {

				// All non-basic code points < n have been handled already. Find the next
				// larger one:
				for (m = maxInt, j = 0; j < inputLength; ++j) {
					currentValue = input[j];
					if (currentValue >= n && currentValue < m) {
						m = currentValue;
					}
				}

				// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
				// but guard against overflow
				handledCPCountPlusOne = handledCPCount + 1;
				if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
					error('overflow');
				}

				delta += (m - n) * handledCPCountPlusOne;
				n = m;

				for (j = 0; j < inputLength; ++j) {
					currentValue = input[j];

					if (currentValue < n && ++delta > maxInt) {
						error('overflow');
					}

					if (currentValue == n) {
						// Represent delta as a generalized variable-length integer
						for (q = delta, k = base; /* no condition */; k += base) {
							t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
							if (q < t) {
								break;
							}
							qMinusT = q - t;
							baseMinusT = base - t;
							output.push(
								stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
							);
							q = floor(qMinusT / baseMinusT);
						}

						output.push(stringFromCharCode(digitToBasic(q, 0)));
						bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
						delta = 0;
						++handledCPCount;
					}
				}

				++delta;
				++n;

			}
			return output.join('');
		}

		/**
		 * Converts a Punycode string representing a domain name or an email address
		 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
		 * it doesn't matter if you call it on a string that has already been
		 * converted to Unicode.
		 * @memberOf punycode
		 * @param {String} input The Punycoded domain name or email address to
		 * convert to Unicode.
		 * @returns {String} The Unicode representation of the given Punycode
		 * string.
		 */
		function toUnicode(input) {
			return mapDomain(input, function(string) {
				return regexPunycode.test(string)
					? decode(string.slice(4).toLowerCase())
					: string;
			});
		}

		/**
		 * Converts a Unicode string representing a domain name or an email address to
		 * Punycode. Only the non-ASCII parts of the domain name will be converted,
		 * i.e. it doesn't matter if you call it with a domain that's already in
		 * ASCII.
		 * @memberOf punycode
		 * @param {String} input The domain name or email address to convert, as a
		 * Unicode string.
		 * @returns {String} The Punycode representation of the given domain name or
		 * email address.
		 */
		function toASCII(input) {
			return mapDomain(input, function(string) {
				return regexNonASCII.test(string)
					? 'xn--' + encode(string)
					: string;
			});
		}

		/*--------------------------------------------------------------------------*/

		/** Define the public API */
		punycode = {
			/**
			 * A string representing the current Punycode.js version number.
			 * @memberOf punycode
			 * @type String
			 */
			'version': '1.3.2',
			/**
			 * An object of methods to convert from JavaScript's internal character
			 * representation (UCS-2) to Unicode code points, and back.
			 * @see <https://mathiasbynens.be/notes/javascript-encoding>
			 * @memberOf punycode
			 * @type Object
			 */
			'ucs2': {
				'decode': ucs2decode,
				'encode': ucs2encode
			},
			'decode': decode,
			'encode': encode,
			'toASCII': toASCII,
			'toUnicode': toUnicode
		};

		/** Expose `punycode` */
		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if (
			true
		) {
			!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
				return punycode;
			}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		} else if (freeExports && freeModule) {
			if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
				freeModule.exports = punycode;
			} else { // in Narwhal or RingoJS v0.7.0-
				for (key in punycode) {
					punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
				}
			}
		} else { // in Rhino or a web browser
			root.punycode = punycode;
		}

	}(this));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(15)(module), (function() { return this; }())))

/***/ },
/* 15 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.decode = exports.parse = __webpack_require__(17);
	exports.encode = exports.stringify = __webpack_require__(18);


/***/ },
/* 17 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	// If obj.hasOwnProperty has been overridden, then calling
	// obj.hasOwnProperty(prop) will break.
	// See: https://github.com/joyent/node/issues/1707
	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	module.exports = function(qs, sep, eq, options) {
	  sep = sep || '&';
	  eq = eq || '=';
	  var obj = {};

	  if (typeof qs !== 'string' || qs.length === 0) {
	    return obj;
	  }

	  var regexp = /\+/g;
	  qs = qs.split(sep);

	  var maxKeys = 1000;
	  if (options && typeof options.maxKeys === 'number') {
	    maxKeys = options.maxKeys;
	  }

	  var len = qs.length;
	  // maxKeys <= 0 means that we should not limit keys count
	  if (maxKeys > 0 && len > maxKeys) {
	    len = maxKeys;
	  }

	  for (var i = 0; i < len; ++i) {
	    var x = qs[i].replace(regexp, '%20'),
	        idx = x.indexOf(eq),
	        kstr, vstr, k, v;

	    if (idx >= 0) {
	      kstr = x.substr(0, idx);
	      vstr = x.substr(idx + 1);
	    } else {
	      kstr = x;
	      vstr = '';
	    }

	    k = decodeURIComponent(kstr);
	    v = decodeURIComponent(vstr);

	    if (!hasOwnProperty(obj, k)) {
	      obj[k] = v;
	    } else if (Array.isArray(obj[k])) {
	      obj[k].push(v);
	    } else {
	      obj[k] = [obj[k], v];
	    }
	  }

	  return obj;
	};


/***/ },
/* 18 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	var stringifyPrimitive = function(v) {
	  switch (typeof v) {
	    case 'string':
	      return v;

	    case 'boolean':
	      return v ? 'true' : 'false';

	    case 'number':
	      return isFinite(v) ? v : '';

	    default:
	      return '';
	  }
	};

	module.exports = function(obj, sep, eq, name) {
	  sep = sep || '&';
	  eq = eq || '=';
	  if (obj === null) {
	    obj = undefined;
	  }

	  if (typeof obj === 'object') {
	    return Object.keys(obj).map(function(k) {
	      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
	      if (Array.isArray(obj[k])) {
	        return obj[k].map(function(v) {
	          return ks + encodeURIComponent(stringifyPrimitive(v));
	        }).join(sep);
	      } else {
	        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
	      }
	    }).join(sep);

	  }

	  if (!name) return '';
	  return encodeURIComponent(stringifyPrimitive(name)) + eq +
	         encodeURIComponent(stringifyPrimitive(obj));
	};


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	var messageBuilder = __webpack_require__( 10 ),
		messageParser = __webpack_require__( 9 ),
		ResubscribeNotifier = __webpack_require__( 20 ),
		C = __webpack_require__( 4 ),
		Listener = __webpack_require__( 21 ),
		EventEmitter = __webpack_require__( 6 );

	/**
	 * This class handles incoming and outgoing messages in relation
	 * to deepstream events. It basically acts like an event-hub that's
	 * replicated across all connected clients.
	 *
	 * @param {Object} options    deepstream options
	 * @param {Connection} connection
	 * @param {Client} client
	 * @public
	 * @constructor
	 */
	var EventHandler = function( options, connection, client ) {
		this._options = options;
		this._connection = connection;
		this._client = client;
		this._emitter = new EventEmitter();
		this._listener = {};
		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._resubscribeNotifier = new ResubscribeNotifier( this._client, this._resubscribe.bind( this ) );
	};

	/**
	 * Subscribe to an event. This will receive both locally emitted events
	 * as well as events emitted by other connected clients.
	 *
	 * @param   {String}   name
	 * @param   {Function} callback
	 *
	 * @public
	 * @returns {void}
	 */
	EventHandler.prototype.subscribe = function( name, callback ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}
		if ( typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		if( !this._emitter.hasListeners( name ) ) {
			this._ackTimeoutRegistry.add({
				topic: C.TOPIC.EVENT,
				action: C.ACTIONS.SUBSCRIBE,
				name: name
			});
			this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.SUBSCRIBE, [ name ] );
		}

		this._emitter.on( name, callback );
	};

	/**
	 * Removes a callback for a specified event. If all callbacks
	 * for an event have been removed, the server will be notified
	 * that the client is unsubscribed as a listener
	 *
	 * @param   {String}   name
	 * @param   {Function} callback
	 *
	 * @public
	 * @returns {void}
	 */
	EventHandler.prototype.unsubscribe = function( name, callback ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}
		if ( callback !== undefined && typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}
		this._emitter.off( name, callback );

		if( !this._emitter.hasListeners( name ) ) {
			this._ackTimeoutRegistry.add({
				topic: C.TOPIC.EVENT,
				action: C.ACTIONS.UNSUBSCRIBE,
				name: name
			});
			this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.UNSUBSCRIBE, [ name ] );
		}
	};

	/**
	 * Emits an event locally and sends a message to the server to
	 * broadcast the event to the other connected clients
	 *
	 * @param   {String} name
	 * @param   {Mixed} data will be serialized and deserialized to its original type.
	 *
	 * @public
	 * @returns {void}
	 */
	EventHandler.prototype.emit = function( name, data ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}

		this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.EVENT, [ name, messageBuilder.typed( data ) ] );
		this._emitter.emit( name, data );
	};

	/**
	 * Allows to listen for event subscriptions made by this or other clients. This
	 * is useful to create "active" data providers, e.g. providers that only provide
	 * data for a particular event if a user is actually interested in it
	 *
	 * @param   {String}   pattern  A combination of alpha numeric characters and wildcards( * )
	 * @param   {Function} callback
	 *
	 * @public
	 * @returns {void}
	 */
	EventHandler.prototype.listen = function( pattern, callback ) {
		if ( typeof pattern !== 'string' || pattern.length === 0 ) {
			throw new Error( 'invalid argument pattern' );
		}
		if ( typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		if( this._listener[ pattern ] && !this._listener[ pattern ].destroyPending ) {
			return this._client._$onError( C.TOPIC.EVENT, C.EVENT.LISTENER_EXISTS, pattern );
		} else if( this._listener[ pattern ] ) {
			this._listener[ pattern ].destroy();
		}

		this._listener[ pattern ] = new Listener( C.TOPIC.EVENT, pattern, callback, this._options, this._client, this._connection );
	};

	/**
	 * Removes a listener that was previously registered with listenForSubscriptions
	 *
	 * @param   {String}   pattern  A combination of alpha numeric characters and wildcards( * )
	 * @param   {Function} callback
	 *
	 * @public
	 * @returns {void}
	 */
	EventHandler.prototype.unlisten = function( pattern ) {
		if ( typeof pattern !== 'string' || pattern.length === 0 ) {
			throw new Error( 'invalid argument pattern' );
		}

		var listener = this._listener[ pattern ];

		if( listener && !listener.destroyPending ) {
			listener.sendDestroy();
		} else if( this._listener[ pattern ] ) {
			this._ackTimeoutRegistry.add({
				topic: C.TOPIC.EVENT,
				action: C.EVENT.UNLISTEN,
				name: pattern
			});
			this._listener[ pattern ].destroy();
			delete this._listener[ pattern ];
		} else {
			this._client._$onError( C.TOPIC.RECORD, C.EVENT.NOT_LISTENING, pattern );
		}
	};

	/**
	 * Handles incoming messages from the server
	 *
	 * @param   {Object} message parsed deepstream message
	 *
	 * @package private
	 * @returns {void}
	 */
	EventHandler.prototype._$handle = function( message ) {
		var name = message.data[ message.action === C.ACTIONS.ACK ? 1 : 0 ];

		if( message.action === C.ACTIONS.EVENT ) {
			processed = true;
			if( message.data && message.data.length === 2 ) {
				this._emitter.emit( name, messageParser.convertTyped( message.data[ 1 ], this._client ) );
			} else {
				this._emitter.emit( name );
			}
			return;
		}

		if( message.action === C.ACTIONS.ACK && message.data[ 0 ] === C.ACTIONS.UNLISTEN &&
			this._listener[ name ] && this._listener[ name ].destroyPending
		) {
			this._listener[ name ].destroy();
			delete this._listener[ name ];
			return;
		} else if( this._listener[ name ] ) {
			processed = true;
			this._listener[ name ]._$onMessage( message );
			return;
		} else if( message.action === C.ACTIONS.SUBSCRIPTION_FOR_PATTERN_REMOVED ) {
			// An unlisten ACK was received before an PATTERN_REMOVED which is a valid case
			return;
		}  else if( message.action === C.ACTIONS.SUBSCRIPTION_HAS_PROVIDER ) {
			// record can receive a HAS_PROVIDER after discarding the record
			return;
		}

		if( message.action === C.ACTIONS.ACK ) {
			this._ackTimeoutRegistry.clear( message );
			return;
		}

		if( message.action === C.ACTIONS.ERROR ) {
		    if (message.data[0] === C.EVENT.MESSAGE_DENIED){
		      this._ackTimeoutRegistry.remove({
		      	topic: C.TOPIC.EVENT,
		      	name: message.data[1],
		      	action: message.data[2]
		      });
		    }
		    else if ( message.data[0] === C.EVENT.NOT_SUBSCRIBED ){
		      this._ackTimeoutRegistry.remove({
		      	topic: C.TOPIC.EVENT,
		      	name: message.data[1],
		      	action: C.ACTIONS.UNSUBSCRIBE
		      });
		    }
			message.processedError = true;
			this._client._$onError( C.TOPIC.EVENT, message.data[ 0 ], message.data[ 1 ] );
			return;
		}

		this._client._$onError( C.TOPIC.EVENT, C.EVENT.UNSOLICITED_MESSAGE, name );
	};


	/**
	 * Resubscribes to events when connection is lost
	 *
	 * @package private
	 * @returns {void}
	 */
	EventHandler.prototype._resubscribe = function() {
		var callbacks = this._emitter._callbacks;
		for( var eventName in callbacks ) {
			this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.SUBSCRIBE, [ eventName ] );
		}
	};

	module.exports = EventHandler;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 );

	/**
	 * Makes sure that all functionality is resubscribed on reconnect. Subscription is called
	 * when the connection drops - which seems counterintuitive, but in fact just means
	 * that the re-subscription message will be added to the queue of messages that
	 * need re-sending as soon as the connection is re-established.
	 *
	 * Resubscribe logic should only occur once per connection loss
	 *
	 * @param {Client} client          The deepstream client
	 * @param {Function} reconnect     Function to call to allow resubscribing
	 *
	 * @constructor
	 */
	var ResubscribeNotifier = function( client, resubscribe ) {
		this._client = client;
		this._resubscribe = resubscribe;

		this._isReconnecting = false;
		this._connectionStateChangeHandler = this._handleConnectionStateChanges.bind( this );
		this._client.on( 'connectionStateChanged', this._connectionStateChangeHandler );
	};

	/**
	 * Call this whenever this functionality is no longer needed to remove links
	 *
	 * @returns {void}
	 */
	ResubscribeNotifier.prototype.destroy = function() {
		this._client.removeListener( 'connectionStateChanged', this._connectionStateChangeHandler );
		this._connectionStateChangeHandler = null;
		this._client = null;
	};

	 /**
	 * Check whenever the connection state changes if it is in reconnecting to resubscribe
	 * @private
	 * @returns {void}
	 */
	 ResubscribeNotifier.prototype._handleConnectionStateChanges = function() {
		var state = this._client.getConnectionState();

		if( state === C.CONNECTION_STATE.RECONNECTING && this._isReconnecting === false ) {
			this._isReconnecting = true;
		}
		if( state === C.CONNECTION_STATE.OPEN && this._isReconnecting === true ) {
			this._isReconnecting = false;
			this._resubscribe();
		}
	 };

	module.exports = ResubscribeNotifier;

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 );
	var ResubscribeNotifier = __webpack_require__( 20 );

	/*
	 * Creates a listener instance which is usedby deepstream Records and Events.
	 *
	 * @param {String} topic                 One of CONSTANTS.TOPIC
	 * @param {String} pattern              A pattern that can be compiled via new RegExp(pattern)
	 * @param {Function} callback           The function which is called when pattern was found and removed
	 * @param {Connection} Connection       The instance of the server connection
	 * @param {Object} options              Deepstream options
	 * @param {Client} client               deepstream.io client
	 *
	 * @constructor
	 */
	var Listener = function( topic, pattern, callback, options, client, connection ) {
		this._topic = topic;
		this._callback = callback;
		this._pattern = pattern;
		this._options = options;
		this._client = client;
		this._connection = connection;
		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._ackTimeoutRegistry.add({
			topic: this._topic,
			name: pattern,
			action: C.ACTIONS.LISTEN
		});

		this._resubscribeNotifier = new ResubscribeNotifier( client, this._sendListen.bind( this ) );
		this._sendListen();
		this.destroyPending = false;
	};

	Listener.prototype.sendDestroy = function() {
		this.destroyPending = true;
		this._connection.sendMsg( this._topic, C.ACTIONS.UNLISTEN, [ this._pattern ] );
		this._resubscribeNotifier.destroy();

	};

	/*
	 * Resets internal properties. Is called when provider cals unlisten.
	 *
	 * @returns {void}
	 */
	Listener.prototype.destroy = function() {
		this._callback = null;
		this._pattern = null;
		this._client = null;
		this._connection = null;
	};

	/*
	 * Accepting a listener request informs deepstream that the current provider is willing to
	 * provide the record or event matching the subscriptionName . This will establish the current
	 * provider as the only publisher for the actual subscription with the deepstream cluster.
	 * Either accept or reject needs to be called by the listener, otherwise it prints out a deprecated warning.
	 *
	 * @returns {void}
	 */
	Listener.prototype.accept = function( name ) {
		this._connection.sendMsg( this._topic, C.ACTIONS.LISTEN_ACCEPT, [ this._pattern, name ] );
	}

	/*
	 *  Rejecting a listener request informs deepstream that the current provider is not willing
	 * to provide the record or event matching the subscriptionName . This will result in deepstream
	 * requesting another provider to do so instead. If no other provider accepts or exists, the
	 * record will remain unprovided.
	 * Either accept or reject needs to be called by the listener, otherwise it prints out a deprecated warning.
	 *
	 * @returns {void}
	 */
	Listener.prototype.reject = function( name ) {
		this._connection.sendMsg( this._topic, C.ACTIONS.LISTEN_REJECT, [ this._pattern, name ] );
	}

	/*
	 * Wraps accept and reject as an argument for the callback function.
	 *
	 * @private
	 * @returns {Object}
	 */
	Listener.prototype._createCallbackResponse = function(message) {
		return {
			accept: this.accept.bind( this, message.data[ 1 ] ),
			reject: this.reject.bind( this, message.data[ 1 ] )
		}
	}

	/*
	 * Handles the incomming message.
	 *
	 * @private
	 * @returns {void}
	 */
	Listener.prototype._$onMessage = function( message ) {
		if( message.action === C.ACTIONS.ACK ) {
			this._ackTimeoutRegistry.clear(message);
		} else if ( message.action === C.ACTIONS.SUBSCRIPTION_FOR_PATTERN_FOUND ) {
			this._callback( message.data[ 1 ], true, this._createCallbackResponse( message) );
		} else if ( message.action === C.ACTIONS.SUBSCRIPTION_FOR_PATTERN_REMOVED ) {
			this._callback( message.data[ 1 ], false );
		} else {
			this._client._$onError( this._topic, C.EVENT.UNSOLICITED_MESSAGE, message.data[ 0 ] + '|' + message.data[ 1 ] );
		}
	};

	/*
	 * Sends a C.ACTIONS.LISTEN to deepstream.
	 *
	 * @private
	 * @returns {void}
	 */
	Listener.prototype._sendListen = function() {
		this._connection.sendMsg( this._topic, C.ACTIONS.LISTEN, [ this._pattern ] );
	};

	module.exports = Listener;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		ResubscribeNotifier = __webpack_require__( 20 ),
		RpcResponse = __webpack_require__( 23 ),
		Rpc = __webpack_require__( 24 ),
		messageParser= __webpack_require__( 9 ),
		messageBuilder = __webpack_require__( 10 );

	/**
	 * The main class for remote procedure calls
	 *
	 * Provides the rpc interface and handles incoming messages
	 * on the rpc topic
	 *
	 * @param {Object} options deepstream configuration options
	 * @param {Connection} connection
	 * @param {Client} client
	 *
	 * @constructor
	 * @public
	 */
	var RpcHandler = function( options, connection, client ) {
		this._options = options;
		this._connection = connection;
		this._client = client;
		this._rpcs = {};
		this._providers = {};
		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._resubscribeNotifier = new ResubscribeNotifier( this._client, this._reprovide.bind( this ) );
	};

	/**
	 * Registers a callback function as a RPC provider. If another connected client calls
	 * client.rpc.make() the request will be routed to this method
	 *
	 * The callback will be invoked with two arguments:
	 * 		{Mixed} data The data passed to the client.rpc.make function
	 *   	{RpcResponse} rpcResponse An object with methods to respons, acknowledge or reject the request
	 *
	 * Only one callback can be registered for a RPC at a time
	 *
	 * Please note: Deepstream tries to deliver data in its original format. Data passed to client.rpc.make as a String will arrive as a String,
	 * numbers or implicitly JSON serialized objects will arrive in their respective format as well
	 *
	 * @public
	 * @returns void
	 */
	RpcHandler.prototype.provide = function( name, callback ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}
		if( this._providers[ name ] ) {
			throw new Error( 'RPC ' + name + ' already registered' );
		}
		if ( typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		this._ackTimeoutRegistry.add({
			topic: C.TOPIC.RPC,
			name: name,
			action: C.ACTIONS.SUBSCRIBE,
		});
		this._providers[ name ] = callback;
		this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.SUBSCRIBE, [ name ] );
	};

	/**
	 * Unregisters this client as a provider for a remote procedure call
	 *
	 * @param   {String} name the name of the rpc
	 *
	 * @public
	 * @returns {void}
	 */
	RpcHandler.prototype.unprovide = function( name ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}

		if( this._providers[ name ] ) {
			delete this._providers[ name ];
			this._ackTimeoutRegistry.add({
				topic: C.TOPIC.RPC,
				name: name,
				action: C.ACTIONS.UNSUBSCRIBE,
			});
			this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.UNSUBSCRIBE, [ name ] );
		}
	};

	/**
	 * Executes the actual remote procedure call
	 *
	 * @param   {String}   name     The name of the rpc
	 * @param   {Mixed}    data     Serializable data that will be passed to the provider
	 * @param   {Function} callback Will be invoked with the returned result or if the rpc failed
	 *                              receives to arguments: error or null and the result
	 *
	 * @public
	 * @returns {void}
	 */
	RpcHandler.prototype.make = function( name, data, callback ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}
		if ( typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		var uid = this._client.getUid(),
			typedData = messageBuilder.typed( data );

		this._rpcs[ uid ] = new Rpc( name, callback, this._options, this._client );
		this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.REQUEST, [ name, uid, typedData ] );
	};

	/**
	 * Retrieves a RPC instance for a correlationId or throws an error
	 * if it can't be found (which should never happen)
	 *
	 * @param {String} correlationId
	 * @param {String} rpcName
	 *
	 * @private
	 * @returns {Rpc}
	 */
	RpcHandler.prototype._getRpc = function( correlationId, rpcName, rawMessage ) {
		var rpc = this._rpcs[ correlationId ];

		if( !rpc ) {
			this._client._$onError( C.TOPIC.RPC, C.EVENT.UNSOLICITED_MESSAGE, rawMessage );
			return null;
		}

		return rpc;
	};

	/**
	 * Handles incoming rpc REQUEST messages. Instantiates a new response object
	 * and invokes the provider callback or rejects the request if no rpc provider
	 * is present (which shouldn't really happen, but might be the result of a race condition
	 * if this client sends a unprovide message whilst an incoming request is already in flight)
	 *
	 * @param   {Object} message The parsed deepstream RPC request message.
	 *
	 * @private
	 * @returns {void}
	 */
	RpcHandler.prototype._respondToRpc = function( message ) {
		var name = message.data[ 0 ],
			correlationId = message.data[ 1 ],
			data = null,
			response;

		if( message.data[ 2 ] ) {
			data = messageParser.convertTyped( message.data[ 2 ], this._client );
		}

		if( this._providers[ name ] ) {
			response = new RpcResponse( this._connection, name, correlationId );
			this._providers[ name ]( data, response );
		} else {
			this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.REJECTION, [ name, correlationId ] );
		}
	};

	/**
	 * Distributes incoming messages from the server
	 * based on their action
	 *
	 * @param   {Object} message A parsed deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	RpcHandler.prototype._$handle = function( message ) {
		var rpcName, correlationId, rpc;

		// RPC Requests
		if( message.action === C.ACTIONS.REQUEST ) {
			this._respondToRpc( message );
			return;
		}

		// RPC subscription Acks
		if( message.action === C.ACTIONS.ACK &&
			( message.data[ 0 ] === C.ACTIONS.SUBSCRIBE  || message.data[ 0 ] === C.ACTIONS.UNSUBSCRIBE ) ) {
			this._ackTimeoutRegistry.clear( message );
			return;
		}

		// handle auth/denied subscription errors
		if( message.action === C.ACTIONS.ERROR ) {
			if( message.data[ 0 ] === C.EVENT.MESSAGE_PERMISSION_ERROR ) {
				return;
			}
			if( message.data[ 0 ] === C.EVENT.MESSAGE_DENIED && message.data[ 2 ] === C.ACTIONS.SUBSCRIBE ) {
				this._ackTimeoutRegistry.remove({
					topic: C.TOPIC.RPC,
					action: C.ACTIONS.SUBSCRIBE,
					name: message.data[ 1 ]
				} );
				return;
			}
		}

		/*
		 * Error messages always have the error as first parameter. So the
		 * order is different to ack and response messages
		 */
		if( message.action === C.ACTIONS.ERROR || message.action === C.ACTIONS.ACK ) {
			if( message.data[ 0 ] === C.EVENT.MESSAGE_DENIED && message.data[ 2 ] === C.ACTIONS.REQUEST ) {
				correlationId = message.data[ 3 ];
			} else {
				correlationId = message.data[ 2 ];
			}
			rpcName = message.data[ 1 ];
		} else {
			rpcName = message.data[ 0 ];
			correlationId = message.data[ 1 ];
		}

		/*
		* Retrieve the rpc object
		*/
		rpc = this._getRpc( correlationId, rpcName, message.raw );
		if( rpc === null ) {
			return;
		}

		// RPC Responses
		if( message.action === C.ACTIONS.ACK ) {
			rpc.ack();
		}
		else if( message.action === C.ACTIONS.RESPONSE ) {
			rpc.respond( message.data[ 2 ] );
			delete this._rpcs[ correlationId ];
		}
		else if( message.action === C.ACTIONS.ERROR ) {
			message.processedError = true;
			rpc.error( message.data[ 0 ] );
			delete this._rpcs[ correlationId ];
		}
	};

	/**
	 * Reregister providers to events when connection is lost
	 *
	 * @package private
	 * @returns {void}
	 */
	RpcHandler.prototype._reprovide = function() {
		for( var rpcName in this._providers ) {
			this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.SUBSCRIBE, [ rpcName ] );
		}
	};


	module.exports = RpcHandler;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		utils = __webpack_require__( 11 ),
		messageBuilder = __webpack_require__( 10 );

	/**
	 * This object provides a number of methods that allow a rpc provider
	 * to respond to a request
	 *
	 * @param {Connection} connection - the clients connection object
	 * @param {String} name the name of the rpc
	 * @param {String} correlationId the correlationId for the RPC
	 */
	var RpcResponse = function( connection, name, correlationId ) {
		this._connection = connection;
		this._name = name;
		this._correlationId = correlationId;
		this._isAcknowledged = false;
		this._isComplete = false;
		this.autoAck = true;
		utils.nextTick( this._performAutoAck.bind( this ) );
	};

	/**
	 * Acknowledges the receipt of the request. This
	 * will happen implicitly unless the request callback
	 * explicitly sets autoAck to false
	 *
	 * @public
	 * @returns 	{void}
	 */
	RpcResponse.prototype.ack = function() {
		if( this._isAcknowledged === false ) {
			this._connection.sendMsg(
				C.TOPIC.RPC,
				C.ACTIONS.ACK,
				[ C.ACTIONS.REQUEST, this._name, this._correlationId ]
			);
			this._isAcknowledged = true;
		}
	};

	/**
	 * Reject the request. This might be necessary if the client
	 * is already processing a large number of requests. If deepstream
	 * receives a rejection message it will try to route the request to
	 * another provider - or return a NO_RPC_PROVIDER error if there are no
	 * providers left
	 *
	 * @public
	 * @returns	{void}
	 */
	RpcResponse.prototype.reject = function() {
		this.autoAck = false;
		this._isComplete = true;
		this._isAcknowledged = true;
		this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.REJECTION, [ this._name, this._correlationId ] );
	};

	/**
	 * Notifies the server that an error has occured while trying to process the request.
	 * This will complete the rpc.
	 *
	 * @param {String} errorMsg the message used to describe the error that occured
	 * @public
	 * @returns	{void}
	 */
	RpcResponse.prototype.error = function( errorMsg ) {
		this.autoAck = false;
		this._isComplete = true;
		this._isAcknowledged = true;
		this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.ERROR, [ errorMsg, this._name, this._correlationId ] );
	};

	/**
	 * Completes the request by sending the response data
	 * to the server. If data is an array or object it will
	 * automatically be serialised.
	 * If autoAck is disabled and the response is sent before
	 * the ack message the request will still be completed and the
	 * ack message ignored
	 *
	 * @param {String} data the data send by the provider. Might be JSON serialized
	 *
	 * @public
	 * @returns {void}
	 */
	RpcResponse.prototype.send = function( data ) {
		if( this._isComplete === true ) {
			throw new Error( 'Rpc ' + this._name + ' already completed' );
		}
		this.ack();

		var typedData = messageBuilder.typed( data );
		this._connection.sendMsg( C.TOPIC.RPC, C.ACTIONS.RESPONSE, [ this._name, this._correlationId, typedData ] );
		this._isComplete = true;
	};

	/**
	 * Callback for the autoAck timeout. Executes ack
	 * if autoAck is not disabled
	 *
	 * @private
	 * @returns {void}
	 */
	RpcResponse.prototype._performAutoAck = function() {
		if( this.autoAck === true ) {
			this.ack();
		}
	};

	module.exports = RpcResponse;


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		messageParser = __webpack_require__( 9 );

	/**
	 * This class represents a single remote procedure
	 * call made from the client to the server. It's main function
	 * is to encapsulate the logic around timeouts and to convert the
	 * incoming response data
	 *
	 * @param {Object}   options  deepstream client config
	 * @param {Function} callback the function that will be called once the request is complete or failed
	 * @param {Client} client
	 *
	 * @constructor
	 */
	var Rpc = function( name, callback, options, client ) {
		this._options = options;
		this._callback = callback;
		this._client = client;
		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._ackTimeout = this._ackTimeoutRegistry.add({
			topic: C.TOPIC.RPC,
			action: C.ACTIONS.ACK,
			name: name,
			timeout: this._options.rpcAckTimeout,
			callback: this.error.bind( this )
		});
		this._responseTimeout = this._ackTimeoutRegistry.add({
			topic: C.TOPIC.RPC,
			action: C.ACTIONS.REQUEST,
			name: name,
			event: C.EVENT.RESPONSE_TIMEOUT,
			timeout: this._options.rpcResponseTimeout,
			callback: this.error.bind( this )
		});
	};

	/**
	 * Called once an ack message is received from the server
	 *
	 * @public
	 * @returns {void}
	 */
	Rpc.prototype.ack = function() {
		this._ackTimeoutRegistry.remove({
			ackId: this._ackTimeout
		});
	};

	/**
	 * Called once a response message is received from the server.
	 * Converts the typed data and completes the request
	 *
	 * @param   {String} data typed value
	 *
	 * @public
	 * @returns {void}
	 */
	Rpc.prototype.respond = function( data ) {
		var convertedData = messageParser.convertTyped( data, this._client );
		this._callback( null, convertedData );
		this._complete();
	};

	/**
	 * Callback for error messages received from the server. Once
	 * an error is received the request is considered completed. Even
	 * if a response arrives later on it will be ignored / cause an
	 * UNSOLICITED_MESSAGE error
	 *
	 * @param   {String} errorMsg @TODO should be CODE and message
	 *
	 * @public
	 * @returns {void}
	 */
	Rpc.prototype.error = function(timeout) {
		this._callback( timeout.event || timeout );
		this._complete();
	};

	/**
	 * Called after either an error or a response
	 * was received
	 *
	 * @private
	 * @returns {void}
	 */
	Rpc.prototype._complete = function() {
		this._ackTimeoutRegistry.remove({
			ackId: this._ackTimeout
		});
		this._ackTimeoutRegistry.remove({
			ackId: this._responseTimeout
		});
	};

	module.exports = Rpc;

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	var Record = __webpack_require__( 26 ),
		AnonymousRecord = __webpack_require__( 28 ),
		List = __webpack_require__( 29 ),
		Listener = __webpack_require__( 21 ),
		SingleNotifier = __webpack_require__( 30 ),
		C = __webpack_require__( 4 ),
		messageParser = __webpack_require__( 9 ),
		EventEmitter = __webpack_require__( 6 );

	/**
	 * A collection of factories for records. This class
	 * is exposed as client.record
	 *
	 * @param {Object} options    deepstream options
	 * @param {Connection} connection
	 * @param {Client} client
	 */
	var RecordHandler = function( options, connection, client ) {
		this._options = options;
		this._connection = connection;
		this._client = client;
		this._records = {};
		this._lists = {};
		this._listener = {};
		this._destroyEventEmitter = new EventEmitter();

		this._hasRegistry = new SingleNotifier( client, connection, C.TOPIC.RECORD, C.ACTIONS.HAS, this._options.recordReadTimeout );
		this._snapshotRegistry = new SingleNotifier( client, connection, C.TOPIC.RECORD, C.ACTIONS.SNAPSHOT, this._options.recordReadTimeout );
	};

	/**
	 * Returns an existing record or creates a new one.
	 *
	 * @param   {String} name          		the unique name of the record
	 * @param   {[Object]} recordOptions 	A map of parameters for this particular record.
	 *                                    	{ persist: true }
	 *
	 * @public
	 * @returns {Record}
	 */
	RecordHandler.prototype.getRecord = function( name, recordOptions ) {
		if( !this._records[ name ] ) {
			this._records[ name ] = new Record( name, recordOptions || {}, this._connection, this._options, this._client );
			this._records[ name ].on( 'error', this._onRecordError.bind( this, name ) );
			this._records[ name ].on( 'destroyPending', this._onDestroyPending.bind( this, name ) );
			this._records[ name ].on( 'delete', this._removeRecord.bind( this, name ) );
			this._records[ name ].on( 'discard', this._removeRecord.bind( this, name ) );
		}

		this._records[ name ].usages++;

		return this._records[ name ];
	};

	/**
	 * Returns an existing List or creates a new one. A list is a specialised
	 * type of record that holds an array of recordNames.
	 *
	 * @param   {String} name       the unique name of the list
	 * @param   {[Object]} options 	A map of parameters for this particular list.
	 *                              { persist: true }
	 *
	 * @public
	 * @returns {List}
	 */
	RecordHandler.prototype.getList = function( name, options ) {
		if( !this._lists[ name ] ) {
			this._lists[ name ] = new List( this, name, options );
		} else {
			this._records[ name ].usages++;
		}
		return this._lists[ name ];
	};

	/**
	 * Returns an anonymous record. A anonymous record is effectively
	 * a wrapper that mimicks the API of a record, but allows for the
	 * underlying record to be swapped without loosing subscriptions etc.
	 *
	 * This is particularly useful when selecting from a number of similarly
	 * structured records. E.g. a list of users that can be choosen from a list
	 *
	 * The only API difference to a normal record is an additional setName( name ) method.
	 *
	 *
	 * @public
	 * @returns {AnonymousRecord}
	 */
	RecordHandler.prototype.getAnonymousRecord = function() {
		return new AnonymousRecord( this );
	};

	/**
	 * Allows to listen for record subscriptions made by this or other clients. This
	 * is useful to create "active" data providers, e.g. providers that only provide
	 * data for a particular record if a user is actually interested in it
	 *
	 * @param   {String}   pattern  A combination of alpha numeric characters and wildcards( * )
	 * @param   {Function} callback
	 *
	 * @public
	 * @returns {void}
	 */
	RecordHandler.prototype.listen = function( pattern, callback ) {
		if ( typeof pattern !== 'string' || pattern.length === 0 ) {
			throw new Error( 'invalid argument pattern' );
		}
		if ( typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		if( this._listener[ pattern ] && !this._listener[ pattern ].destroyPending ) {
			return this._client._$onError( C.TOPIC.RECORD, C.EVENT.LISTENER_EXISTS, pattern );
		}

		if( this._listener[ pattern ] ) {
			this._listener[ pattern ].destroy();
		}
		this._listener[ pattern ] = new Listener( C.TOPIC.RECORD, pattern, callback, this._options, this._client, this._connection );
	};

	/**
	 * Removes a listener that was previously registered with listenForSubscriptions
	 *
	 * @param   {String}   pattern  A combination of alpha numeric characters and wildcards( * )
	 * @param   {Function} callback
	 *
	 * @public
	 * @returns {void}
	 */
	RecordHandler.prototype.unlisten = function( pattern ) {
		if ( typeof pattern !== 'string' || pattern.length === 0 ) {
			throw new Error( 'invalid argument pattern' );
		}

		var listener = this._listener[ pattern ];
		if( listener && !listener.destroyPending ) {
			listener.sendDestroy();
		} else if( this._listener[ pattern ] ) {
			this._listener[ pattern ].destroy();
			delete this._listener[ pattern ];
		} else {
			this._client._$onError( C.TOPIC.RECORD, C.EVENT.NOT_LISTENING, pattern );
		}
	};

	/**
	 * Retrieve the current record data without subscribing to changes
	 *
	 * @param   {String}	name the unique name of the record
	 * @param   {Function}	callback
	 *
	 * @public
	 */
	RecordHandler.prototype.snapshot = function( name, callback ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}

		if( this._records[ name ] && this._records[ name ].isReady ) {
			callback( null, this._records[ name ].get() );
		} else {
			this._snapshotRegistry.request( name, callback );
		}
	};

	/**
	 * Allows the user to query to see whether or not the record exists.
	 *
	 * @param   {String}	name the unique name of the record
	 * @param   {Function}	callback
	 *
	 * @public
	 */
	RecordHandler.prototype.has = function( name, callback ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}

		if( this._records[ name ] ) {
			callback( null, true );
		} else {
			this._hasRegistry.request( name, callback );
		}
	};

	/**
	 * Will be called by the client for incoming messages on the RECORD topic
	 *
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @package private
	 * @returns {void}
	 */
	RecordHandler.prototype._$handle = function( message ) {
		var name;

		if( message.action === C.ACTIONS.ERROR &&
			( message.data[ 0 ] !== C.EVENT.VERSION_EXISTS &&
				message.data[ 0 ] !== C.ACTIONS.SNAPSHOT &&
				message.data[ 0 ] !== C.ACTIONS.HAS  &&
				message.data[ 0 ] !== C.EVENT.MESSAGE_DENIED
			)
		) {
			message.processedError = true;
			this._client._$onError( C.TOPIC.RECORD, message.data[ 0 ], message.data[ 1 ] );
			return;
		}

		if( message.action === C.ACTIONS.ACK || message.action === C.ACTIONS.ERROR ) {
			name = message.data[ 1 ];

			/*
			 * The following prevents errors that occur when a record is discarded or deleted and
			 * recreated before the discard / delete ack message is received.
			 *
			 * A (presumably unsolvable) problem remains when a client deletes a record in the exact moment
			 * between another clients creation and read message for the same record
			 */
			if( message.data[ 0 ] === C.ACTIONS.DELETE ||
				  message.data[ 0 ] === C.ACTIONS.UNSUBSCRIBE ||
				 ( message.data[ 0 ] === C.EVENT.MESSAGE_DENIED && message.data[ 2 ] === C.ACTIONS.DELETE  )
				) {
				this._destroyEventEmitter.emit( 'destroy_ack_' + name, message );

				if( message.data[ 0 ] === C.ACTIONS.DELETE && this._records[ name ] ) {
					this._records[ name ]._$onMessage( message );
				}

				return;
			}

			if( message.data[ 0 ] === C.ACTIONS.SNAPSHOT ) {
				message.processedError = true;
				this._snapshotRegistry.recieve( name, message.data[ 2 ] );
				return;
			}

			if( message.data[ 0 ] === C.ACTIONS.HAS ) {
				message.processedError = true;
				this._snapshotRegistry.recieve( name, message.data[ 2 ] );
				return;
			}

		} else {
			name = message.data[ 0 ];
		}

		var processed = false;

		if( this._records[ name ] ) {
			processed = true;
			this._records[ name ]._$onMessage( message );
		}

		if( message.action === C.ACTIONS.READ && this._snapshotRegistry.hasRequest( name ) ) {
			processed = true;
			this._snapshotRegistry.recieve( name, null, JSON.parse( message.data[ 2 ] ) );
		}

		if( message.action === C.ACTIONS.HAS && this._hasRegistry.hasRequest( name ) ) {
			processed = true;
			this._hasRegistry.recieve( name, null, messageParser.convertTyped( message.data[ 1 ] ) );
		}

		if( message.action === C.ACTIONS.ACK && message.data[ 0 ] === C.ACTIONS.UNLISTEN &&
			this._listener[ name ] && this._listener[ name ].destroyPending
		) {
			processed = true;
			this._listener[ name ].destroy();
			delete this._listener[ name ];
		} else if( this._listener[ name ] ) {
			processed = true;
			this._listener[ name ]._$onMessage( message );
		} else if( message.action === C.ACTIONS.SUBSCRIPTION_FOR_PATTERN_REMOVED ) {
			// An unlisten ACK was received before an PATTERN_REMOVED which is a valid case
			processed = true;
		}  else if( message.action === C.ACTIONS.SUBSCRIPTION_HAS_PROVIDER ) {
			// record can receive a HAS_PROVIDER after discarding the record
			processed = true;
		}

		if( !processed ) {
			message.processedError = true;
			this._client._$onError( C.TOPIC.RECORD, C.EVENT.UNSOLICITED_MESSAGE, name );
		}
	};

	/**
	 * Callback for 'error' events from the record.
	 *
	 * @param   {String} recordName
	 * @param   {String} error
	 *
	 * @private
	 * @returns {void}
	 */
	RecordHandler.prototype._onRecordError = function( recordName, error ) {
		this._client._$onError( C.TOPIC.RECORD, error, recordName );
	};

	/**
	 * When the client calls discard or delete on a record, there is a short delay
	 * before the corresponding ACK message is received from the server. To avoid
	 * race conditions if the record is re-requested straight away the old record is
	 * removed from the cache straight awy and will only listen for one last ACK message
	 *
	 * @param   {String} recordName The name of the record that was just deleted / discarded
	 *
	 * @private
	 * @returns {void}
	 */
	RecordHandler.prototype._onDestroyPending = function( recordName ) {
		if ( !this._records[ recordName ] ) {
			this.emit( 'error', 'Record \'' + recordName + '\' does not exists' );
			return;
		}
		var onMessage = this._records[ recordName ]._$onMessage.bind( this._records[ recordName ] );
		this._destroyEventEmitter.once( 'destroy_ack_' + recordName, onMessage );
		this._removeRecord( recordName );
	};

	/**
	 * Callback for 'deleted' and 'discard' events from a record. Removes the record from
	 * the registry
	 *
	 * @param   {String} recordName
	 *
	 * @returns {void}
	 */
	RecordHandler.prototype._removeRecord = function( recordName ) {
		delete this._records[ recordName ];
		delete this._lists[ recordName ];
	};

	module.exports = RecordHandler;


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var jsonPath = __webpack_require__( 27 ),
		utils = __webpack_require__( 11 ),
		ResubscribeNotifier = __webpack_require__( 20 ),
		EventEmitter = __webpack_require__( 6 ),
		C = __webpack_require__( 4 ),
		messageBuilder = __webpack_require__( 10 ),
		messageParser = __webpack_require__( 9 );

	/**
	 * This class represents a single record - an observable
	 * dataset returned by client.record.getRecord()
	 *
	 * @extends {EventEmitter}
	 *
	 * @param {String} name          		The unique name of the record
	 * @param {Object} recordOptions 		A map of options, e.g. { persist: true }
	 * @param {Connection} Connection		The instance of the server connection
	 * @param {Object} options				Deepstream options
	 * @param {Client} client				deepstream.io client
	 *
	 * @constructor
	 */
	var Record = function( name, recordOptions, connection, options, client ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}

		this.name = name;
		this.usages = 0;
		this._recordOptions = recordOptions;
		this._connection = connection;
		this._client = client;
		this._options = options;
		this.isReady = false;
		this.isDestroyed = false;
		this.hasProvider = false;
		this._$data = Object.create( null );
		this.version = null;
		this._eventEmitter = new EventEmitter();
		this._queuedMethodCalls = [];
		this._writeCallbacks = {};

		this._mergeStrategy = null;
		if( options.mergeStrategy ) {
			this.setMergeStrategy( options.mergeStrategy );
		}

		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._resubscribeNotifier = new ResubscribeNotifier( this._client, this._sendRead.bind( this ) );

		this._readAckTimeout = this._ackTimeoutRegistry.add({
			topic: C.TOPIC.RECORD,
			name: name,
			action: C.ACTIONS.SUBSCRIBE,
			timeout: this._options.recordReadAckTimeout
		});
		this._responseTimeout = this._ackTimeoutRegistry.add({
			topic: C.TOPIC.RECORD,
			name: name,
			action: C.ACTIONS.READ,
			event: C.EVENT.RESPONSE_TIMEOUT,
			timeout: this._options.recordReadTimeout
		});
		this._sendRead();
	};

	EventEmitter( Record.prototype );

	/**
	 * Set a merge strategy to resolve any merge conflicts that may occur due
	 * to offline work or write conflicts. The function will be called with the
	 * local record, the remote version/data and a callback to call once the merge has
	 * completed or if an error occurs ( which leaves it in an inconsistent state until
	 * the next update merge attempt ).
	 *
	 * @param   {Function} mergeStrategy A Function that can resolve merge issues.
	 *
	 * @public
	 * @returns {void}
	 */
	Record.prototype.setMergeStrategy = function( mergeStrategy ) {
		if( typeof mergeStrategy === 'function' ) {
			this._mergeStrategy = mergeStrategy;
		} else {
			throw new Error( 'Invalid merge strategy: Must be a Function' );
		}
	};


	/**
	 * Returns a copy of either the entire dataset of the record
	 * or - if called with a path - the value of that path within
	 * the record's dataset.
	 *
	 * Returning a copy rather than the actual value helps to prevent
	 * the record getting out of sync due to unintentional changes to
	 * its data
	 *
	 * @param   {[String]} path A JSON path, e.g. users[ 2 ].firstname
	 *
	 * @public
	 * @returns {Mixed} value
	 */
	Record.prototype.get = function( path ) {
		return jsonPath.get( this._$data, path, this._options.recordDeepCopy );
	};

	/**
	 * Sets the value of either the entire dataset
	 * or of a specific path within the record
	 * and submits the changes to the server
	 *
	 * If the new data is equal to the current data, nothing will happen
	 *
	 * @param {[String|Object]} pathOrData Either a JSON path when called with two arguments or the data itself
	 * @param {Object} data     The data that should be stored in the record
	 *
	 * @public
	 * @returns {void}
	 */
	Record.prototype.set = function( pathOrData, dataOrCallback, callback ) {
		var path,
			data;
		// set( object )
		if( arguments.length === 1 ) {
			if( typeof pathOrData !== 'object' )
				throw new Error( 'invalid argument data' );
			data = pathOrData;
		}
		else if( arguments.length === 2 ) {
			// set( path, data )
			if( ( typeof pathOrData === 'string' && pathOrData.length !== 0 ) && typeof dataOrCallback !== 'function' ) {
				path = pathOrData;
				data = dataOrCallback
			}
			// set( data, callback )
			else if( typeof pathOrData === 'object' && typeof dataOrCallback === 'function' ) {
				data = pathOrData;
				callback = dataOrCallback;
			}
			else {
				throw new Error( 'invalid argument path' )
			}
		}
		// set( path, data, callback )
		else if( arguments.length === 3 ) {
			if( typeof pathOrData !== 'string' || pathOrData.length === 0 || typeof callback !== 'function' ) {
				throw new Error( 'invalid arguments, must pass in a string, a value and a function')
			}
			path = pathOrData;
			data = dataOrCallback;
		}

		if( this._checkDestroyed( 'set' ) ) {
			return this;
		}

		if( !this.isReady ) {
			this._queuedMethodCalls.push({ method: 'set', args: arguments });
			return this;
		}

		var oldValue = this._$data;
		var newValue = jsonPath.set( oldValue, path, data, this._options.recordDeepCopy );

		if ( oldValue === newValue ) {
			return this;
		}

		var config;
		if( callback !== undefined ) {
			config = {};
			config.writeSuccess = true;
			this._setUpCallback(this.version, callback)
			var connectionState = this._client.getConnectionState();
			if( connectionState === C.CONNECTION_STATE.CLOSED || connectionState === C.CONNECTION_STATE.RECONNECTING ) {
				callback( 'Connection error: error updating record as connection was closed' );
			}
		}
		this._sendUpdate( path, data, config );
		this._applyChange( newValue );
		return this;
	};

	/**
	 * Subscribes to changes to the records dataset.
	 *
	 * Callback is the only mandatory argument.
	 *
	 * When called with a path, it will only subscribe to updates
	 * to that path, rather than the entire record
	 *
	 * If called with true for triggerNow, the callback will
	 * be called immediatly with the current value
	 *
	 * @param   {[String]}		path			A JSON path within the record to subscribe to
	 * @param   {Function} 		callback       	Callback function to notify on changes
	 * @param   {[Boolean]}		triggerNow      A flag to specify whether the callback should be invoked immediatly
	 *                                       	with the current value
	 *
	 * @public
	 * @returns {void}
	 */
	Record.prototype.subscribe = function( path, callback, triggerNow ) {
		var args = this._normalizeArguments( arguments );

		if ( args.path !== undefined && ( typeof args.path !== 'string' || args.path.length === 0 ) ) {
			throw new Error( 'invalid argument path' );
		}
		if ( typeof args.callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		if( this._checkDestroyed( 'subscribe' ) ) {
			return;
		}

		if( args.triggerNow ) {
			this.whenReady( function () {
				this._eventEmitter.on( args.path, args.callback );
				args.callback( this.get( args.path ) );
			}.bind(this) );
		} else {
			this._eventEmitter.on( args.path, args.callback );
		}
	};

	/**
	 * Removes a subscription that was previously made using record.subscribe()
	 *
	 * Can be called with a path to remove the callback for this specific
	 * path or only with a callback which removes it from the generic subscriptions
	 *
	 * Please Note: unsubscribe is a purely client side operation. If the app is no longer
	 * interested in receiving updates for this record from the server it needs to call
	 * discard instead
	 *
	 * @param   {[String|Function]}   pathOrCallback A JSON path
	 * @param   {Function} 			  callback   	The callback method. Please note, if a bound method was passed to
	 *                                	   			subscribe, the same method must be passed to unsubscribe as well.
	 *
	 * @public
	 * @returns {void}
	 */
	Record.prototype.unsubscribe = function( pathOrCallback, callback ) {
		var args = this._normalizeArguments( arguments );

		if ( args.path !== undefined && ( typeof args.path !== 'string' || args.path.length === 0 ) ) {
			throw new Error( 'invalid argument path' );
		}
		if ( args.callback !== undefined && typeof args.callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		if( this._checkDestroyed( 'unsubscribe' ) ) {
			return;
		}
		this._eventEmitter.off( args.path, args.callback );
	};

	/**
	 * Removes all change listeners and notifies the server that the client is
	 * no longer interested in updates for this record
	 *
	 * @public
	 * @returns {void}
	 */
	Record.prototype.discard = function() {
		if( this._checkDestroyed( 'discard' ) ) {
			return;
		}
		this.whenReady( function() {
			this.usages--;
			if( this.usages <= 0 ) {
					this.emit( 'destroyPending' );
					this._discardTimeout = this._ackTimeoutRegistry.add({
						topic: C.TOPIC.RECORD,
						name: this.name,
						action: C.ACTIONS.UNSUBSCRIBE
					});
					this._connection.sendMsg( C.TOPIC.RECORD, C.ACTIONS.UNSUBSCRIBE, [ this.name ] );
			}
		}.bind( this ) );
	};

	/**
	 * Deletes the record on the server.
	 *
	 * @public
	 * @returns {void}
	 */
	Record.prototype.delete = function() {
		if( this._checkDestroyed( 'delete' ) ) {
			return;
		}
		this.whenReady( function() {
			this.emit( 'destroyPending' );
			this._deleteAckTimeout = this._ackTimeoutRegistry.add({
				topic: C.TOPIC.RECORD,
				name: this.name,
				action: C.ACTIONS.DELETE,
				event: C.EVENT.DELETE_TIMEOUT,
				timeout: this._options.recordDeleteTimeout
			});
			this._connection.sendMsg( C.TOPIC.RECORD, C.ACTIONS.DELETE, [ this.name ] );
		}.bind( this ) );
	};

	/**
	 * Convenience method, similar to promises. Executes callback
	 * whenever the record is ready, either immediatly or once the ready
	 * event is fired
	 *
	 * @param   {Function} callback Will be called when the record is ready
	 *
	 * @returns {void}
	 */
	Record.prototype.whenReady = function( callback ) {
		if( this.isReady === true ) {
			callback( this );
		} else {
			this.once( 'ready', callback.bind( this, this ) );
		}
	};

	/**
	 * Callback for incoming messages from the message handler
	 *
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @package private
	 * @returns {void}
	 */
	Record.prototype._$onMessage = function( message ) {
		if( message.action === C.ACTIONS.READ ) {
			if( this.version === null ) {
				this._ackTimeoutRegistry.clear(message);
				this._onRead( message );
			} else {
				this._applyUpdate( message, this._client );
			}
		}
		else if( message.action === C.ACTIONS.ACK ) {
			this._processAckMessage( message );
		}
		else if( message.action === C.ACTIONS.UPDATE || message.action === C.ACTIONS.PATCH ) {
			this._applyUpdate( message, this._client );
		}
		else if( message.action === C.ACTIONS.WRITE_ACKNOWLEDGEMENT ) {
			var versions = JSON.parse(message.data[ 1 ]);
			for (var i = 0; i < versions.length; i++) {
				var callback = this._writeCallbacks[ versions[ i ] ];
				if( callback !== undefined ) {
					callback( messageParser.convertTyped( message.data[ 2 ], this._client ) )
					delete this._writeCallbacks[ versions[ i ] ];
				}
			}
		}
		// Otherwise it should be an error, and dealt with accordingly
		else if( message.data[ 0 ] === C.EVENT.VERSION_EXISTS ) {
			this._recoverRecord( message.data[ 2 ], JSON.parse( message.data[ 3 ] ), message );
		}
		else if( message.data[ 0 ] === C.EVENT.MESSAGE_DENIED ) {
			this._clearTimeouts();
		} else if( message.action === C.ACTIONS.SUBSCRIPTION_HAS_PROVIDER ) {
			var hasProvider = messageParser.convertTyped( message.data[ 1 ], this._client );
			this.hasProvider = hasProvider;
			this.emit( 'hasProviderChanged', hasProvider );
		}
	};

	/**
	 * Called when a merge conflict is detected by a VERSION_EXISTS error or if an update recieved
	 * is directly after the clients. If no merge strategy is configure it will emit a VERSION_EXISTS
	 * error and the record will remain in an inconsistent state.
	 *
	 * @param   {Number} remoteVersion The remote version number
	 * @param   {Object} remoteData The remote object data
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._recoverRecord = function( remoteVersion, remoteData, message ) {
		message.processedError = true;
		if( this._mergeStrategy ) {
			this._mergeStrategy( this, remoteData, remoteVersion, this._onRecordRecovered.bind( this, remoteVersion, remoteData, message ) );
		}
		else {
			this.emit( 'error', C.EVENT.VERSION_EXISTS, 'received update for ' + remoteVersion + ' but version is ' + this.version );
		}
	};

	Record.prototype._sendUpdate = function ( path, data, config ) {
		this.version++;
		var msgData;
		if( !path ) {
			msgData = config === undefined ?
				[ this.name, this.version, data ] :
				[ this.name, this.version, data, config ];
			this._connection.sendMsg( C.TOPIC.RECORD, C.ACTIONS.UPDATE, msgData );
		} else {
			msgData = config === undefined ?
				[ this.name, this.version, path, messageBuilder.typed( data ) ] :
				[ this.name, this.version, path, messageBuilder.typed( data ), config ];
			this._connection.sendMsg( C.TOPIC.RECORD, C.ACTIONS.PATCH, msgData );
		}
	};

	/**
	 * Callback once the record merge has completed. If successful it will set the
	 * record state, else emit and error and the record will remain in an
	 * inconsistent state until the next update.
	 *
	 * @param   {Number} remoteVersion The remote version number
	 * @param   {Object} remoteData The remote object data
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._onRecordRecovered = function( remoteVersion, remoteData, message, error, data ) {
		if( !error ) {
			var oldVersion = this.version;
			this.version = remoteVersion;

			var oldValue = this._$data;
			var newValue = jsonPath.set( oldValue, undefined, data, false );
			if ( oldValue === newValue ) {
				return;
			}

			var config = message.data[ 4 ];
			if( config && JSON.parse( config ).writeSuccess ) {
				var callback = this._writeCallbacks[ oldVersion ];
				delete this._writeCallbacks[ oldVersion ];
				this._setUpCallback( this.version, callback )
			}
			this._sendUpdate( undefined, data, config );
			this._applyChange( newValue );
		} else {
			this.emit( 'error', C.EVENT.VERSION_EXISTS, 'received update for ' + remoteVersion + ' but version is ' + this.version );
		}
	};

	/**
	 * Callback for ack-messages. Acks can be received for
	 * subscriptions, discards and deletes
	 *
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._processAckMessage = function( message ) {
		var acknowledgedAction = message.data[ 0 ];

		if( acknowledgedAction === C.ACTIONS.SUBSCRIBE ) {
			this._ackTimeoutRegistry.clear(message);
		}

		else if( acknowledgedAction === C.ACTIONS.DELETE ) {
			this.emit( 'delete' );
			this._destroy();
		}

		else if( acknowledgedAction === C.ACTIONS.UNSUBSCRIBE ) {
			this.emit( 'discard' );
			this._destroy();
		}
	};

	/**
	 * Applies incoming updates and patches to the record's dataset
	 *
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._applyUpdate = function( message ) {
		var version = parseInt( message.data[ 1 ], 10 );
		var data;
		if( message.action === C.ACTIONS.PATCH ) {
			data = messageParser.convertTyped( message.data[ 3 ], this._client );
		} else {
			data = JSON.parse( message.data[ 2 ] );
		}

		if( this.version === null ) {
			this.version = version;
		}
		else if( this.version + 1 !== version ) {
			if( message.action === C.ACTIONS.PATCH ) {
				/**
				* Request a snapshot so that a merge can be done with the read reply which contains
				* the full state of the record
				**/
				this._connection.sendMsg( C.TOPIC.RECORD, C.ACTIONS.SNAPSHOT, [ this.name ] );
			} else {
				this._recoverRecord( version, data, message );
			}
			return;
		}

		this.version = version;
		this._applyChange( jsonPath.set( this._$data, message.action === C.ACTIONS.PATCH ? message.data[ 2 ] : undefined, data ) );
	};

	/**
	 * Callback for incoming read messages
	 *
	 * @param   {Object} message parsed and validated deepstream message
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._onRead = function( message ) {
		this.version = parseInt( message.data[ 1 ], 10 );
		this._applyChange( jsonPath.set( this._$data, undefined, JSON.parse( message.data[ 2 ] ) ) );
		this._setReady();
	};

	/**
	 * Invokes method calls that where queued while the record wasn't ready
	 * and emits the ready event
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._setReady = function() {
		this.isReady = true;
		for( var i = 0; i < this._queuedMethodCalls.length; i++ ) {
			this[ this._queuedMethodCalls[ i ].method ].apply( this, this._queuedMethodCalls[ i ].args );
		}
		this._queuedMethodCalls = [];
		this.emit( 'ready' );
	};

	Record.prototype._setUpCallback = function(currentVersion, callback) {
		var newVersion = Number( this.version ) + 1;
		this._writeCallbacks[ newVersion ] = callback;
	}

	/**
	 * Sends the read message, either initially at record
	 * creation or after a lost connection has been re-established
	 *
	 * @private
	 * @returns {void}
	 */
	 Record.prototype._sendRead = function() {
	 	this._connection.sendMsg( C.TOPIC.RECORD, C.ACTIONS.CREATEORREAD, [ this.name ] );
	 };

	/**
	 * Compares the new values for every path with the previously stored ones and
	 * updates the subscribers if the value has changed
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._applyChange = function( newData ) {
		if ( this.isDestroyed ) {
			return;
		}

		var oldData = this._$data;
		this._$data = newData;

		var paths = this._eventEmitter.eventNames();
		for ( var i = 0; i < paths.length; i++ ) {
			var newValue = jsonPath.get( newData, paths[ i ], false );
			var oldValue = jsonPath.get( oldData, paths[ i ], false );

			if( newValue !== oldValue ) {
				this._eventEmitter.emit( paths[ i ], this.get( paths[ i ] ) );
			}
		}
	};

	/**
	 * Creates a map based on the types of the provided arguments
	 *
	 * @param {Arguments} args
	 *
	 * @private
	 * @returns {Object} arguments map
	 */
	Record.prototype._normalizeArguments = function( args ) {
		// If arguments is already a map of normalized parameters
		// (e.g. when called by AnonymousRecord), just return it.
		if( args.length === 1 && typeof args[ 0 ] === 'object' ) {
			return args[ 0 ];
		}

		var result = Object.create( null );

		for( var i = 0; i < args.length; i++ ) {
			if( typeof args[ i ] === 'string' ) {
				result.path = args[ i ];
			}
			else if( typeof args[ i ] === 'function' ) {
				result.callback = args[ i ];
			}
			else if( typeof args[ i ] === 'boolean' ) {
				result.triggerNow = args[ i ];
			}
		}

		return result;
	};

	/**
	 * Clears all timeouts that are set when the record is created
	 *
	 * @private
	 * @returns {void}
	 */
	Record.prototype._clearTimeouts = function() {
		this._ackTimeoutRegistry.remove({ ackId: this._readAckTimeout, silent: true });
		this._ackTimeoutRegistry.remove({ ackId: this._responseTimeout, silent: true });
		this._ackTimeoutRegistry.remove({ ackId: this._deleteAckTimeout, silent: true });
		this._ackTimeoutRegistry.remove({ ackId: this._discardTimeout, silent: true });
	};

	/**
	 * A quick check that's carried out by most methods that interact with the record
	 * to make sure it hasn't been destroyed yet - and to handle it gracefully if it has.
	 *
	 * @param   {String} methodName The name of the method that invoked this check
	 *
	 * @private
	 * @returns {Boolean} is destroyed
	 */
	Record.prototype._checkDestroyed = function( methodName ) {
		if( this.isDestroyed ) {
			this.emit( 'error', 'Can\'t invoke \'' + methodName + '\'. Record \'' + this.name + '\' is already destroyed' );
			return true;
		}

		return false;
	};

	/**
	 * Destroys the record and nulls all
	 * its dependencies
	 *
	 * @private
	 * @returns {void}
	 */
	 Record.prototype._destroy = function() {
	 	this._clearTimeouts();
	 	this._eventEmitter.off();
	 	this._resubscribeNotifier.destroy();
	 	this.isDestroyed = true;
	 	this.isReady = false;
	 	this._client = null;
		this._eventEmitter = null;
		this._connection = null;
	 };

	module.exports = Record;


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	var utils = __webpack_require__( 11 );
	var PARTS_REG_EXP = /([^\.\[\]\s]+)/g;

	var cache = Object.create( null );

	/**
	 * Returns the value of the path or
	 * undefined if the path can't be resolved
	 *
	 * @public
	 * @returns {Mixed}
	 */
	module.exports.get = function ( data, path, deepCopy ) {
		var tokens = tokenize( path );

		for( var i = 0; i < tokens.length; i++ ) {
			if ( data === undefined ) {
				return undefined;
			}
			if ( typeof data !== 'object' ) {
				throw new Error( 'invalid data or path' );
			}
			data = data[ tokens[ i ] ];
		}

		return deepCopy !== false ? utils.deepCopy( data ) : data;
	};

	/**
	 * Sets the value of the path. If the path (or parts
	 * of it) doesn't exist yet, it will be created
	 *
	 * @param {Mixed} value
	 *
	 * @public
	 * @returns {Mixed} updated value
	 */
	module.exports.set = function( data, path, value, deepCopy ) {
		var tokens = tokenize( path );

		if ( tokens.length === 0 ) {
			return patch( data, value, deepCopy );
		}

		var oldValue = module.exports.get( data, path, false );
		var newValue = patch( oldValue, value, deepCopy );

		if ( newValue === oldValue ) {
			return data;
		}

		var result = utils.shallowCopy( data );

		var node = result;
		for( var i = 0; i < tokens.length; i++ ) {
			if ( i === tokens.length - 1) {
				node[ tokens[ i ] ] = newValue;
			}
			else if( node[ tokens[ i ] ] !== undefined ) {
				node = node[ tokens[ i ] ] = utils.shallowCopy( node[ tokens[ i ] ] );
			}
			else if( tokens[ i + 1 ] && !isNaN( tokens[ i + 1 ] ) ){
				node = node[ tokens[ i ] ] = [];
			}
			else {
				node = node[ tokens[ i ] ] = Object.create( null );
			}
		}

		return result;
	};

	/**
	 * Merge the new value into the old value
	 * @param  {Mixed} oldValue
	 * @param  {Mixed} newValue
	 * @param  {boolean} deepCopy
	 * @return {Mixed}
	 */
	function patch( oldValue, newValue, deepCopy ) {
		var i;
		var j;
		if ( oldValue === null || newValue === null ) {
			return newValue;
		}
		else if ( Array.isArray( oldValue ) && Array.isArray( newValue ) ) {
			var arr;
			for ( i = 0; i < newValue.length; i++ ) {
				var value = patch( oldValue[ i ], newValue[ i ], false );
				if ( !arr ) {
					if ( value === oldValue[ i ] ) {
						continue
					}
					arr = [];
					for (	j = 0; j < i; ++j) {
						arr[ j ] = oldValue[ j ];
					}
				}
				arr[ i ] = value;
			}
			arr = arr && deepCopy !== false ? utils.deepCopy( arr ) : arr;
			arr = arr || (oldValue.length === newValue.length ? oldValue : newValue);
			return arr;
		}
		else if ( !Array.isArray( newValue ) && typeof oldValue === 'object' && typeof newValue === 'object' ) {
			var obj;
			var props = Object.keys( newValue );
			for ( i = 0; i < props.length; i++ ) {
				var value = patch( oldValue[ props[ i ] ], newValue[ props[ i ] ], false );
				if ( !obj ) {
					if ( value === oldValue[ props[ i ] ]) {
						continue;
					}
					obj = Object.create( null );
					for ( j = 0; j < i; ++j) {
						obj[ props[ j ] ] = oldValue[ props[ j ] ];
					}
				}
				obj[ props[ i ] ] = newValue[ props[ i ] ];
			}
			obj = obj && deepCopy !== false ? utils.deepCopy( obj ) : obj;
			obj = obj || (Object.keys(oldValue).length === props.length ? oldValue : newValue);
			return obj;
		}
		else if (newValue !== oldValue) {
			return deepCopy !== false ? utils.deepCopy( newValue ) : newValue;
		}
	  else {
	    return oldValue;
	  }
	}

	/**
	 * Parses the path. Splits it into
	 * keys for objects and indices for arrays.
	 *
	 * @returns Array of tokens
	 */
	function tokenize( path ) {
		if ( cache[ path ] ) {
			return cache[ path ];
		}

		var parts = String(path) !== 'undefined' ? String( path ).match(PARTS_REG_EXP) : [];

		if ( !parts ) {
			throw new Error('invalid path ' + path)
		}

		return cache[ path ] = parts;
	};


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	var Record = __webpack_require__( 26 ),
		EventEmitter = __webpack_require__( 6 );

	/**
	 * An AnonymousRecord is a record without a predefined name. It
	 * acts like a wrapper around an actual record that can
	 * be swapped out for another one whilst keeping all bindings intact.
	 *
	 * Imagine a customer relationship management system with a list of users
	 * on the left and a user detail panel on the right. The user detail
	 * panel could use the anonymous record to set up its bindings, yet whenever
	 * a user is chosen from the list of existing users the anonymous record's
	 * setName method is called and the detail panel will update to
	 * show the selected user's details
	 *
	 * @param {RecordHandler} recordHandler
	 * 
	 * @constructor
	 */
	var AnonymousRecord = function( recordHandler ) {
		this.name = null;
		this._recordHandler = recordHandler;
		this._record = null;
		this._subscriptions = [];
		this._proxyMethod( 'delete' );
		this._proxyMethod( 'set' );
		this._proxyMethod( 'discard' );
	};

	EventEmitter( AnonymousRecord.prototype );

	/**
	 * Proxies the actual record's get method. It is valid
	 * to call get prior to setName - if no record exists,
	 * the method returns undefined
	 *
	 * @param   {[String]} path A json path. If non is provided,
	 *                          the entire record is returned.
	 *
	 * @public
	 * @returns {mixed}    the value of path or the entire object
	 */
	AnonymousRecord.prototype.get = function( path ) {
		if( this._record === null ) {
			return undefined;
		}

		return this._record.get( path );
	};

	/**
	 * Proxies the actual record's subscribe method. The same parameters
	 * can be used. Can be called prior to setName(). Please note, triggerIfReady
	 * will always be set to true to reflect changes in the underlying record.
	 *
	 * @param   {[String]} path 	A json path. If non is provided,
	 *	                          	it subscribes to changes for the entire record.
	 *
	 * @param 	{Function} callback A callback function that will be invoked whenever
	 *                              the subscribed path or record updates
	 *
	 * @public
	 * @returns {void}
	 */
	AnonymousRecord.prototype.subscribe = function() {
		var parameters = Record.prototype._normalizeArguments( arguments );
		parameters.triggerNow = true;
		this._subscriptions.push( parameters );

		if( this._record !== null ) {
			this._record.subscribe( parameters );
		}
	};

	/**
	 * Proxies the actual record's unsubscribe method. The same parameters
	 * can be used. Can be called prior to setName()
	 *
	 * @param   {[String]} path 	A json path. If non is provided,
	 *	                          	it subscribes to changes for the entire record.
	 *
	 * @param 	{Function} callback A callback function that will be invoked whenever
	 *                              the subscribed path or record updates
	 *
	 * @public
	 * @returns {void}
	 */
	AnonymousRecord.prototype.unsubscribe = function() {
		var parameters = Record.prototype._normalizeArguments( arguments ),
			subscriptions = [],
			i;

		for( i = 0; i < this._subscriptions.length; i++ ) {
			if(
				this._subscriptions[ i ].path !== parameters.path ||
				this._subscriptions[ i ].callback !== parameters.callback
			) {
				subscriptions.push( this._subscriptions[ i ] );
			}
		}

		this._subscriptions = subscriptions;

		if( this._record !== null ) {
			this._record.unsubscribe( parameters );
		}
	};

	/**
	 * Sets the underlying record the anonymous record is bound
	 * to. Can be called multiple times.
	 *
	 * @param {String} recordName
	 *
	 * @public
	 * @returns {void}
	 */
	AnonymousRecord.prototype.setName = function( recordName ) {
		this.name = recordName;
		
		var i;

		if( this._record !== null && !this._record.isDestroyed) {
			for( i = 0; i < this._subscriptions.length; i++ ) {
				this._record.unsubscribe( this._subscriptions[ i ] );
			}
			this._record.discard();
		}

		this._record = this._recordHandler.getRecord( recordName );

		for( i = 0; i < this._subscriptions.length; i++ ) {
			this._record.subscribe( this._subscriptions[ i ] );
		}

		this._record.whenReady( this.emit.bind( this, 'ready' ) );
		this.emit( 'nameChanged', recordName );
	};

	/**
	 * Adds the specified method to this method and forwards it
	 * to _callMethodOnRecord
	 *
	 * @param   {String} methodName
	 *
	 * @private
	 * @returns {void}
	 */
	AnonymousRecord.prototype._proxyMethod = function( methodName ) {
		this[ methodName ] = this._callMethodOnRecord.bind( this, methodName );
	};

	/**
	 * Invokes the specified method with the provided parameters on
	 * the underlying record. Throws erros if the method is not
	 * specified yet or doesn't expose the method in question
	 *
	 * @param   {String} methodName
	 *
	 * @private
	 * @returns {Mixed} the return value of the actual method
	 */
	AnonymousRecord.prototype._callMethodOnRecord = function( methodName ) {
		if( this._record === null ) {
			throw new Error( 'Can`t invoke ' + methodName + '. AnonymousRecord not initialised. Call setName first' );
		}

		if( typeof this._record[ methodName ] !== 'function' ) {
			throw new Error( methodName + ' is not a method on the record' );
		}

		var args = Array.prototype.slice.call( arguments, 1 );

		return this._record[ methodName ].apply( this._record, args );
	};

	module.exports = AnonymousRecord;

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	var EventEmitter = __webpack_require__( 6 ),
		Record = __webpack_require__( 26 ),
		C = __webpack_require__( 4 ),
		ENTRY_ADDED_EVENT = 'entry-added',
		ENTRY_REMOVED_EVENT = 'entry-removed',
		ENTRY_MOVED_EVENT = 'entry-moved';

	/**
	 * A List is a specialised Record that contains
	 * an Array of recordNames and provides a number
	 * of convinience methods for interacting with them.
	 *
	 * @param {RecordHanlder} recordHandler
	 * @param {String} name    The name of the list
	 *
	 * @constructor
	 */
	var List = function( recordHandler, name, options ) {
		if ( typeof name !== 'string' || name.length === 0 ) {
			throw new Error( 'invalid argument name' );
		}

		this._recordHandler = recordHandler;
		this._record = this._recordHandler.getRecord( name, options );
		this._record._applyUpdate = this._applyUpdate.bind( this );

		this._record.on( 'delete', this.emit.bind( this, 'delete' ) );
		this._record.on( 'discard', this._onDiscard.bind( this ) );
		this._record.on( 'ready', this._onReady.bind( this ) );

		this.isDestroyed = this._record.isDestroyed;
		this.isReady = this._record.isReady;
		this.name = name;
		this._queuedMethods = [];
		this._beforeStructure = null;
		this._hasAddListener = null;
		this._hasRemoveListener = null;
		this._hasMoveListener = null;

		this.delete = this._record.delete.bind( this._record );
		this.discard = this._record.discard.bind( this._record );
		this.whenReady = this._record.whenReady.bind( this );
	};

	EventEmitter( List.prototype );

	/**
	 * Returns the array of list entries or an
	 * empty array if the list hasn't been populated yet.
	 *
	 * @public
	 * @returns {Array} entries
	 */
	List.prototype.getEntries = function() {
		var entries = this._record.get();

		if( !( entries instanceof Array ) ) {
			return [];
		}

		return entries;
	};

	/**
	 * Returns true if the list is empty
	 *
	 * @public
	 * @returns {Boolean} isEmpty
	 */
	List.prototype.isEmpty = function() {
		return this.getEntries().length === 0;
	};

	/**
	 * Updates the list with a new set of entries
	 *
	 * @public
	 * @param {Array} entries
	 */
	List.prototype.setEntries = function( entries ) {
		var errorMsg = 'entries must be an array of record names',
			i;

		if( !( entries instanceof Array ) ) {
			throw new Error( errorMsg );
		}

		for( i = 0; i < entries.length; i++ ) {
			if( typeof entries[ i ] !== 'string' ) {
				throw new Error( errorMsg );
			}
		}

		if( this._record.isReady === false ) {
			this._queuedMethods.push( this.setEntries.bind( this, entries ) );
		} else {
			this._beforeChange();
			this._record.set( entries );
			this._afterChange();
		}
	};

	/**
	 * Removes an entry from the list
	 *
	 * @param {String} entry
	 * @param {Number} [index]
	 *
	 * @public
	 * @returns {void}
	 */
	List.prototype.removeEntry = function( entry, index ) {
		if( this._record.isReady === false ) {
			this._queuedMethods.push( this.removeEntry.bind( this, entry, index ) );
			return;
		}

		var currentEntries = this._record.get(),
			hasIndex = this._hasIndex( index ),
			entries = [],
			i;

		for( i = 0; i < currentEntries.length; i++ ) {
			if( currentEntries[i] !== entry || ( hasIndex && index !== i ) ) {
				entries.push( currentEntries[i] );
			}
		}
		this._beforeChange();
		this._record.set( entries );
		this._afterChange();
	};

	/**
	 * Adds an entry to the list
	 *
	 * @param {String} entry
	 * @param {Number} [index]
	 *
	 * @public
	 * @returns {void}
	 */
	List.prototype.addEntry = function( entry, index ) {
		if( typeof entry !== 'string' ) {
			throw new Error( 'Entry must be a recordName' );
		}

		if( this._record.isReady === false ) {
			this._queuedMethods.push( this.addEntry.bind( this, entry, index ) );
			return;
		}

		var hasIndex = this._hasIndex( index );
		var entries = this.getEntries();
		if( hasIndex ) {
			entries.splice( index, 0, entry );
		} else {
			entries.push( entry );
		}
		this._beforeChange();
		this._record.set( entries );
		this._afterChange();
	};

	/**
	 * Proxies the underlying Record's subscribe method. Makes sure
	 * that no path is provided
	 *
	 * @public
	 * @returns {void}
	 */
	List.prototype.subscribe = function() {
		var parameters = Record.prototype._normalizeArguments( arguments );

		if( parameters.path ) {
			throw new Error( 'path is not supported for List.subscribe' );
		}

		//Make sure the callback is invoked with an empty array for new records
		var listCallback = function( callback ) {
			callback( this.getEntries() );
		}.bind( this, parameters.callback );

		/**
		* Adding a property onto a function directly is terrible practice,
		* and we will change this as soon as we have a more seperate approach
		* of creating lists that doesn't have records default state.
		*
		* The reason we are holding a referencing to wrapped array is so that
		* on unsubscribe it can provide a reference to the actual method the
		* record is subscribed too.
		**/
		parameters.callback.wrappedCallback = listCallback;
		parameters.callback = listCallback;

		this._record.subscribe( parameters );
	};

	/**
	 * Proxies the underlying Record's unsubscribe method. Makes sure
	 * that no path is provided
	 *
	 * @public
	 * @returns {void}
	 */
	List.prototype.unsubscribe = function() {
		var parameters = Record.prototype._normalizeArguments( arguments );

		if( parameters.path ) {
			throw new Error( 'path is not supported for List.unsubscribe' );
		}

		parameters.callback = parameters.callback.wrappedCallback;
		this._record.unsubscribe( parameters );
	};

	/**
	 * Listens for changes in the Record's ready state
	 * and applies them to this list
	 *
	 * @private
	 * @returns {void}
	 */
	List.prototype._onReady = function() {
		this.isReady = true;

		for( var i = 0; i < this._queuedMethods.length; i++ ) {
			this._queuedMethods[ i ]();
		}

		this._queuedMethods = [];
		this.emit( 'ready' );
	};

	/**
	 * Listens for the record discard event and applies
	 * changes to list
	 *
	 * @private
	 * @returns {void}
	 */
	List.prototype._onDiscard = function() {
		this.isDestroyed = true;
		this.emit( 'discard' );
	};

	/**
	 * Proxies the underlying Record's _update method. Set's
	 * data to an empty array if no data is provided.
	 *
	 * @param   {null}   path must (should :-)) be null
	 * @param   {Array}  data
	 *
	 * @private
	 * @returns {void}
	 */
	List.prototype._applyUpdate = function( message ) {
		if( message.action === C.ACTIONS.PATCH ) {
			throw new Error( 'PATCH is not supported for Lists' );
		}

		if( message.data[ 2 ].charAt( 0 ) !== '[' ) {
			message.data[ 2 ] = '[]';
		}

		this._beforeChange();
		Record.prototype._applyUpdate.call( this._record, message );
		this._afterChange();
	};

	/**
	 * Validates that the index provided is within the current set of entries.
	 *
	 * @param {Number} index
	 *
	 * @private
	 * @returns {Number}
	 */
	List.prototype._hasIndex = function( index ) {
		var hasIndex = false;
		var entries = this.getEntries();
		if( index !== undefined ) {
			if( isNaN( index ) ) {
				throw new Error( 'Index must be a number' );
			}
			if( index !== entries.length && ( index >= entries.length || index < 0 ) ) {
				throw new Error( 'Index must be within current entries' );
			}
			hasIndex = true;
		}
		return hasIndex;
	};

	/**
	 * Establishes the current structure of the list, provided the client has attached any
	 * add / move / remove listener
	 *
	 * This will be called before any change to the list, regardsless if the change was triggered
	 * by an incoming message from the server or by the client
	 *
	 * @private
	 * @returns {void}
	 */
	List.prototype._beforeChange = function() {
		this._hasAddListener = this.listeners( ENTRY_ADDED_EVENT ).length > 0;
		this._hasRemoveListener = this.listeners( ENTRY_REMOVED_EVENT ).length > 0;
		this._hasMoveListener = this.listeners( ENTRY_MOVED_EVENT ).length > 0;

		if( this._hasAddListener || this._hasRemoveListener || this._hasMoveListener ) {
			this._beforeStructure = this._getStructure();
		} else {
			this._beforeStructure = null;
		}
	};

	/**
	 * Compares the structure of the list after a change to its previous structure and notifies
	 * any add / move / remove listener. Won't do anything if no listeners are attached.
	 *
	 * @private
	 * @returns {void}
	 */
	List.prototype._afterChange = function() {
		if( this._beforeStructure === null ) {
			return;
		}

		var after = this._getStructure();
		var before = this._beforeStructure;
		var entry, i;

		if( this._hasRemoveListener ) {
			for( entry in before ) {
				for( i = 0; i < before[ entry ].length; i++ ) {
					if( after[ entry ] === undefined || after[ entry ][ i ] === undefined ) {
						this.emit( ENTRY_REMOVED_EVENT, entry, before[ entry ][ i ] );
					}
				}
			}
		}

		if( this._hasAddListener || this._hasMoveListener ) {
			for( entry in after ) {
				if( before[ entry ] === undefined ) {
					for( i = 0; i < after[ entry ].length; i++ ) {
						this.emit( ENTRY_ADDED_EVENT, entry, after[ entry ][ i ] );
					}
				} else {
					for( i = 0; i < after[ entry ].length; i++ ) {
						if( before[ entry ][ i ] !== after[ entry ][ i ] ) {
							if( before[ entry ][ i ] === undefined ) {
								this.emit( ENTRY_ADDED_EVENT, entry, after[ entry ][ i ] );
							} else {
								this.emit( ENTRY_MOVED_EVENT, entry, after[ entry ][ i ] );
							}
						}
					}
				}
			}
		}
	};

	/**
	 * Iterates through the list and creates a map with the entry as a key
	 * and an array of its position(s) within the list as a value, e.g.
	 *
	 * {
	 * 	'recordA': [ 0, 3 ],
	 * 	'recordB': [ 1 ],
	 * 	'recordC': [ 2 ]
	 * }
	 *
	 * @private
	 * @returns {Array} structure
	 */
	List.prototype._getStructure = function() {
		var structure = {};
		var i;
		var entries = this._record.get();

		for( i = 0; i < entries.length; i++ ) {
			if( structure[ entries[ i ] ] === undefined ) {
				structure[ entries[ i ] ] = [ i ];
			} else {
				structure[ entries[ i ] ].push( i );
			}
		}

		return structure;
	};

	module.exports = List;


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		ResubscribeNotifier = __webpack_require__( 20 );

	/**
	 * Provides a scaffold for subscriptionless requests to deepstream, such as the SNAPSHOT
	 * and HAS functionality. The SingleNotifier multiplexes all the client requests so
	 * that they can can be notified at once, and also includes reconnection funcionality
	 * incase the connection drops.
	 *
	 * @param {Client} client          The deepstream client
	 * @param {Connection} connection  The deepstream connection
	 * @param {String} topic           Constant. One of C.TOPIC
	 * @param {String} action          Constant. One of C.ACTIONS
	 * @param {Number} timeoutDuration The duration of the timeout in milliseconds
	 *
	 * @constructor
	 */
	var SingleNotifier = function( client, connection, topic, action, timeoutDuration ) {
		this._client = client;
		this._connection = connection;
		this._topic = topic;
		this._action = action;
		this._timeoutDuration = timeoutDuration;
		this._requests = {};
		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._resubscribeNotifier = new ResubscribeNotifier( this._client, this._resendRequests.bind( this ) );
		this._onResponseTimeout = this._onResponseTimeout.bind(this);
	};

	/**
	 * Check if there is a request pending with a specified name
	 *
	 * @param {String} name An identifier for the request, e.g. a record name
	 *
	 * @public
	 * @returns {void}
	 */
	SingleNotifier.prototype.hasRequest = function( name ) {
		return !!this._requests[ name ];
	};

	/**
	 * Add a request. If one has already been made it will skip the server request
	 * and multiplex the response
	 *
	 * @param {String} name An identifier for the request, e.g. a record name

	 *
	 * @public
	 * @returns {void}
	 */
	SingleNotifier.prototype.request = function( name, callback ) {
		var responseTimeout;

		if( !this._requests[ name ] ) {
			this._requests[ name ] = [];
			this._connection.sendMsg( this._topic, this._action, [ name ] );
		}

		var ackId = this._ackTimeoutRegistry.add({
			topic: this._topic,
			event: C.EVENT.RESPONSE_TIMEOUT,
			name: name,
			action: this._action,
			timeout: this._timeoutDuration,
			callback: this._onResponseTimeout
		});
		this._requests[ name ].push({ callback: callback, ackId: ackId });
	};

	/**
	 * Process a response for a request. This has quite a flexible API since callback functions
	 * differ greatly and helps maximise reuse.
	 *
	 * @param {String} name An identifier for the request, e.g. a record name
	 * @param {String} error Error message
	 * @param {Object} data If successful, the response data
	 *
	 * @public
	 * @returns {void}
	 */
	SingleNotifier.prototype.recieve = function( name, error, data ) {
		var entries = this._requests[ name ];

		if( !entries ) {
			this._client._$onError( this._topic, C.EVENT.UNSOLICITED_MESSAGE, 'no entry for ' + name );
			return;
		}

		for( i=0; i < entries.length; i++ ) {
			entry = entries[ i ];
			this._ackTimeoutRegistry.remove({
				ackId: entry.ackId
			});
			entry.callback( error, data );
		}
		delete this._requests[ name ];
	};

	/**
	 * Will be invoked if a timeout occurs before a response arrives from the server
	 *
	 * @param {String} name An identifier for the request, e.g. a record name
	 *
	 * @private
	 * @returns {void}
	 */
	SingleNotifier.prototype._onResponseTimeout = function( timeout ) {
		var msg = 'No response received in time for ' + this._topic + '|' + this._action + '|' + timeout.name;
		this._client._$onError( this._topic, C.EVENT.RESPONSE_TIMEOUT, msg );
	};

	/**
	 * Resends all the requests once the connection is back up
	 *
	 * @private
	 * @returns {void}
	 */
	SingleNotifier.prototype._resendRequests = function() {
		for( var request in this._requests ) {
			this._connection.sendMsg( this._topic, this._action, [ request ] );
		}
	};

	module.exports = SingleNotifier;

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	var EventEmitter = __webpack_require__( 6 ),
		C = __webpack_require__( 4 ),
		messageParser = __webpack_require__( 9 ),
		messageBuilder = __webpack_require__( 10 ),
		ResubscribeNotifier = __webpack_require__( 20 );

	/**
	 * The main class for presence in deepstream
	 *
	 * Provides the presence interface and handles incoming messages
	 * on the presence topic
	 *
	 * @param {Object} options deepstream configuration options
	 * @param {Connection} connection
	 * @param {Client} client
	 *
	 * @constructor
	 * @public
	 */
	var PresenceHandler = function( options, connection, client ) {
		this._options = options;
		this._connection = connection;
		this._client = client;
		this._emitter = new EventEmitter();
		this._ackTimeoutRegistry = client._$getAckTimeoutRegistry();
		this._resubscribeNotifier = new ResubscribeNotifier( this._client, this._resubscribe.bind( this ) );
	};

	/**
	 * Queries for clients logged into deepstream.
	 *
	 * @param   {Function} callback Will be invoked with an array of clients
	 *
	 * @public
	 * @returns {void}
	 */
	PresenceHandler.prototype.getAll = function( callback ) {
		if( !this._emitter.hasListeners( C.ACTIONS.QUERY ) ) {
			// At least one argument is required for a message to be permissionable
			this._connection.sendMsg( C.TOPIC.PRESENCE, C.ACTIONS.QUERY, [ C.ACTIONS.QUERY ] );
		}
		this._emitter.once( C.ACTIONS.QUERY, callback );
	};

	/**
	 * Subscribes to client logins or logouts in deepstream
	 *
	 * @param   {Function} callback Will be invoked with the username of a client,
	 *                              and a boolean to indicate if it was a login or
	 *                              logout event
	 * @public
	 * @returns {void}
	 */
	PresenceHandler.prototype.subscribe = function( callback ) {
		if ( callback !== undefined && typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		if( !this._emitter.hasListeners( C.TOPIC.PRESENCE ) ) {
			this._ackTimeoutRegistry.add({
				topic: C.TOPIC.PRESENCE,
				action: C.ACTIONS.SUBSCRIBE,
				name: C.TOPIC.PRESENCE
			});
			this._connection.sendMsg( C.TOPIC.PRESENCE, C.ACTIONS.SUBSCRIBE, [ C.ACTIONS.SUBSCRIBE ] );
		}

		this._emitter.on( C.TOPIC.PRESENCE, callback );
	};

	/**
	 * Removes a callback for a specified presence event
	 *
	 * @param   {Function} callback The callback to unregister via {PresenceHandler#unsubscribe}
	 *
	 * @public
	 * @returns {void}
	 */
	PresenceHandler.prototype.unsubscribe = function( callback ) {
		if ( callback !== undefined && typeof callback !== 'function' ) {
			throw new Error( 'invalid argument callback' );
		}

		this._emitter.off( C.TOPIC.PRESENCE, callback );

		if( !this._emitter.hasListeners( C.TOPIC.PRESENCE ) ) {
			this._ackTimeoutRegistry.add({
				topic: C.TOPIC.PRESENCE,
				action: C.ACTIONS.UNSUBSCRIBE,
				name: C.TOPIC.PRESENCE
			});
			this._connection.sendMsg( C.TOPIC.PRESENCE, C.ACTIONS.UNSUBSCRIBE, [ C.ACTIONS.UNSUBSCRIBE ] );
		}
	};

	/**
	 * Handles incoming messages from the server
	 *
	 * @param   {Object} message parsed deepstream message
	 *
	 * @package private
	 * @returns {void}
	 */
	PresenceHandler.prototype._$handle = function( message ) {
		if( message.action === C.ACTIONS.ERROR && message.data[ 0 ] === C.EVENT.MESSAGE_DENIED ) {
			this._ackTimeoutRegistry.remove( C.TOPIC.PRESENCE, message.data[ 1 ] );
			message.processedError = true;
			this._client._$onError( C.TOPIC.PRESENCE, C.EVENT.MESSAGE_DENIED, message.data[ 1 ] );
		}
		else if( message.action === C.ACTIONS.ACK ) {
			this._ackTimeoutRegistry.clear( message );
		}
		else if( message.action === C.ACTIONS.PRESENCE_JOIN ) {
			this._emitter.emit( C.TOPIC.PRESENCE, message.data[ 0 ], true );
		}
		else if( message.action === C.ACTIONS.PRESENCE_LEAVE ) {
			this._emitter.emit( C.TOPIC.PRESENCE, message.data[ 0 ], false );
		}
		else if( message.action === C.ACTIONS.QUERY ) {
			this._emitter.emit( C.ACTIONS.QUERY, message.data );
		}
		else {
			this._client._$onError( C.TOPIC.PRESENCE, C.EVENT.UNSOLICITED_MESSAGE, message.action );
		}
	};

	/**
	 * Resubscribes to presence subscription when connection is lost
	 *
	 * @package private
	 * @returns {void}
	 */
	PresenceHandler.prototype._resubscribe = function() {
		var callbacks = this._emitter._callbacks;
		if( callbacks && callbacks[ C.TOPIC.PRESENCE ] ) {
			this._connection.sendMsg( C.TOPIC.PRESENCE, C.ACTIONS.SUBSCRIBE, [ C.ACTIONS.SUBSCRIBE ] );
		}
	};

	module.exports = PresenceHandler;

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var MERGE_STRATEGIES = __webpack_require__(5);

	module.exports = {
		/**
		 * @param {Number} heartBeatInterval How often you expect the heartbeat to be sent. If two heatbeats are missed
		 * in a row the client will consider the server to have disconnected and will close the connection in order to 
		 * establish a new one.
		 */
		heartbeatInterval: 30000,

		/**
		 * @param {Boolean} recordPersistDefault Whether records should be
		 *                                       persisted by default. Can be overwritten
		 *                                       for individual records when calling getRecord( name, persist );
		 */
		recordPersistDefault: true,

		/**
		 * @param {Number} reconnectIntervalIncrement Specifies the number of milliseconds by which the time until
		 *                                            the next reconnection attempt will be incremented after every
		 *                                            unsuccesful attempt.
		 *                                            E.g. for 1500: if the connection is lost, the client will attempt to reconnect
		 *                                            immediatly, if that fails it will try again after 1.5 seconds, if that fails
		 *                                            it will try again after 3 seconds and so on
		 */
		reconnectIntervalIncrement: 4000,

		/**
		 * @param {Number} maxReconnectInterval       Specifies the maximum number of milliseconds for the reconnectIntervalIncrement
		 *                                            The amount of reconnections will reach this value
		 *                                            then reconnectIntervalIncrement will be ignored.
		 */
		maxReconnectInterval: 180000,

		/**
		 * @param {Number} maxReconnectAttempts		The number of reconnection attempts until the client gives
		 *                                       	up and declares the connection closed
		 */
		maxReconnectAttempts: 5,

		/**
		 * @param {Number} rpcAckTimeout			The number of milliseconds after which a rpc will create an error if
		 * 											no Ack-message has been received
		 */
		rpcAckTimeout: 15000,

		/**
		 * @param {Number} rpcResponseTimeout		The number of milliseconds after which a rpc will create an error if
		 * 											no response-message has been received
		 */
		rpcResponseTimeout: 15000,

		/**
		 * @param {Number} subscriptionTimeout		The number of milliseconds that can pass after providing/unproviding a RPC or subscribing/unsubscribing/
		 * 											listening to a record before an error is thrown
		 */
		subscriptionTimeout: 15000,

		/**
		 * @param {Number} maxMessagesPerPacket	If the implementation tries to send a large number of messages at the same
		 *                                      	time, the deepstream client will try to split them into smaller packets and send
		 *                                      	these every <timeBetweenSendingQueuedPackages> ms.
		 *
		 *                                       	This parameter specifies the number of messages after which deepstream sends the
		 *                                       	packet and queues the remaining messages. Set to Infinity to turn the feature off.
		 *
		 */
		maxMessagesPerPacket: 100,


		/**
		 * @param {Number} timeBetweenSendingQueuedPackages Please see description for maxMessagesPerPacket. Sets the time in ms.
		 */
		timeBetweenSendingQueuedPackages: 16,

		/**
		 * @param {Number} recordReadAckTimeout 	The number of milliseconds from the moment client.record.getRecord() is called
		 *                                       	until an error is thrown since no ack message has been received.
		 */
		recordReadAckTimeout: 15000,

		/**
		 * @param {Number} recordReadTimeout 		The number of milliseconds from the moment client.record.getRecord() is called
		 *                                       	until an error is thrown since no data has been received.
		 */
		recordReadTimeout: 15000,

		/**
		 * @param {Number} recordDeleteTimeout 	The number of milliseconds from the moment record.delete() is called
		 *                                       	until an error is thrown since no delete ack message had been received. Please
		 *                                       	take into account that the deletion is only complete after the record has been
		 *                                       	deleted from both cache and storage
		 */
		recordDeleteTimeout: 15000,

		/**
		 * @param {String} path path to connect to
		 */
		path: '/deepstream',

		/**
		 *  @param {Function} mergeStrategy 	This provides the default strategy used to deal with merge conflicts.
		 *                                  If the merge strategy is not succesfull it will set an error, else set the
		 *                                  returned data as the latest revision. This can be overriden on a per record
		 *                                  basis by setting the `setMergeStrategy`.
		 */
		mergeStrategy: MERGE_STRATEGIES.REMOTE_WINS,

		/**
		 * @param {Boolean} recordDeepCopy Setting to false disabled deepcopying of record data
		 *                                  when provided via `get()` in a `subscribe` callback. This
		 *                                  improves speed at the expense of the user having to ensure
		 *                                  object immutability.
		 */
		recordDeepCopy: true,

		/**
		 * @param {Object} nodeSocketOptions    Options to pass to the websocket constructor in node.
		 * @default null
		 * @see https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketaddress-protocols-options
		 */
		nodeSocketOptions: null
	};


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	var C = __webpack_require__( 4 ),
		EventEmitter = __webpack_require__( 6 );

	/**
	 * Subscriptions to events are in a pending state until deepstream acknowledges
	 * them. This is a pattern that's used by numerour classes. This registry aims
	 * to centralise the functionality necessary to keep track of subscriptions and
	 * their respective timeouts.
	 *
	 * @param {Client} client          The deepstream client
	 * @param {String} topic           Constant. One of C.TOPIC
	 * @param {Number} timeoutDuration The duration of the timeout in milliseconds
	 *
	 * @extends {EventEmitter}
	 * @constructor
	 */
	var AckTimeoutRegistry = function( client, options ) {
		this._options = options;
		this._client = client;
		this._register = {};
		this._counter = 1;
		client.on('connectionStateChanged', this._onConnectionStateChanged.bind(this));
	};

	EventEmitter( AckTimeoutRegistry.prototype );

	/**
	 * Add an entry
	 *
	 * @param {String} name An identifier for the subscription, e.g. a record name or an event name.
	 *
	 * @public
	 * @returns {Number} The timeout identifier
	 */
	AckTimeoutRegistry.prototype.add = function(timeout) {
		var timeoutDuration = timeout.timeout || this._options.subscriptionTimeout;

		if (this._client.getConnectionState() !== C.CONNECTION_STATE.OPEN || timeoutDuration < 1) {
			return -1;
		}

		this.remove(timeout);
		timeout.ackId = this._counter++;
		timeout.event = timeout.event || C.EVENT.ACK_TIMEOUT;
		timeout.__timeout = setTimeout(
			this._onTimeout.bind(this, timeout),
			timeoutDuration
		);
		this._register[ this._getUniqueName(timeout) ] = timeout;
		return timeout.ackId;
	};

	/**
	 * Remove an entry
	 *
	 * @param {String} name An identifier for the subscription, e.g. a record name or an event name.
	 *
	 * @public
	 * @returns {void}
	 */
	AckTimeoutRegistry.prototype.remove = function(timeout) {
		if( timeout.ackId ) {
			for(var uniqueName in this._register) {
				if(timeout.ackId === this._register[uniqueName].ackId) {
					this.clear( {
						topic: this._register[uniqueName].topic,
						action: this._register[uniqueName].action,
						data: [ this._register[uniqueName].name ]
					} );
				}
			}
		}

		if( this._register[ this._getUniqueName(timeout) ] ) {
			this.clear( {
				topic: timeout.topic,
				action: timeout.action,
				data: [ timeout.name ]
			} );
		}
	};

	/**
	 * Processes an incoming ACK-message and removes the corresponding subscription
	 *
	 * @param   {Object} message A parsed deepstream ACK message
	 *
	 * @public
	 * @returns {void}
	 */
	AckTimeoutRegistry.prototype.clear = function( message ) {
		var uniqueName;
		if (message.action === C.ACTIONS.ACK && message.data.length > 1) {
			uniqueName = message.topic + message.data[ 0 ] + (message.data[ 1 ] ? message.data[ 1 ] : '');
		} else {
			uniqueName = message.topic + message.action + message.data[ 0 ];
		}

		if( this._register[ uniqueName ] ) {
			clearTimeout( this._register[ uniqueName ].__timeout );
		}

		delete this._register[ uniqueName ];
	};

	/**
	 * Will be invoked if the timeout has occured before the ack message was received
	 *
	 * @param {Object} name The timeout object registered
	 *
	 * @private
	 * @returns {void}
	 */
	AckTimeoutRegistry.prototype._onTimeout = function(timeout) {
		delete this._register[ this._getUniqueName(timeout) ];

		if (timeout.callback) {
			delete timeout.__timeout
			delete timeout.timeout
			timeout.callback(timeout);
		} else {
			var msg = 'No ACK message received in time' + ( timeout.name ? ' for ' + timeout.name : '');
			this._client._$onError( timeout.topic, timeout.event, msg );
		}
	};

	/**
	 * Returns a unique name from the timeout
	 *
	 * @private
	 * @returns {void}
	 */
	AckTimeoutRegistry.prototype._getUniqueName = function(timeout) {
		return timeout.topic + timeout.action + (timeout.name ? timeout.name : '');
	};

	/**
	 * Remote all timeouts when connection disconnects
	 *
	 * @private
	 * @returns {void}
	 */
	AckTimeoutRegistry.prototype._onConnectionStateChanged = function(connectionState) {
		if (connectionState !== C.CONNECTION_STATE.OPEN) {
			for (var uniqueName in this._register) {
				clearTimeout( this._register[ uniqueName ].__timeout );
			}
		}
	}

	module.exports = AckTimeoutRegistry;


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	const Connection = __webpack_require__( 35 );
	const OutgoingFileTransfer = __webpack_require__( 80 );
	const IncomingFileTransfer = __webpack_require__( 82 );
	const ds = __webpack_require__( 2 );
	const utils = __webpack_require__( 81 );

	class Room{
		constructor() {
			this._connections = {};
			this._incomingTransfers = {};
			ds.record.subscribe( 'users', this._createConnections.bind( this ), true );
			ds.client.event.subscribe( 'rtc-signal/' + ds.roomId + '/' + ds.userId, this._onIncomingSignal.bind( this ) );
			ds.client.on( 'disconnect', this._removeConnection.bind( this ) );
			setInterval( this._checkConnections.bind( this ), 6000 );
		}

		addConnection( remoteUserId ) {
			this._connections[ remoteUserId ] = new Connection( this, remoteUserId );
		}

		sendFile( file, remoteUserId, transferId ) {
			new OutgoingFileTransfer( this, file, remoteUserId, transferId );
		}

		send( data, remoteUserId ) {
			this._connections[ remoteUserId ].send( data );
		}

		processIncomingData( data ) {
			if( typeof data === 'string' ) {
				var parts = data.split( ':' );

				if( parts[ 0 ] === 'TC' ) {
					this._finaliseTransfer( parts[ 1 ] );
				}
			} else {
				data = new Uint8Array( data );

				var transferId = '_' + utils.getIntFromByteArray( data, 0 );
				var chunkIndex = utils.getIntFromByteArray( data, 4 );

				if( !this._incomingTransfers[ transferId ] ) {
					this._incomingTransfers[ transferId ] = new IncomingFileTransfer( utils.getIntFromByteArray( data, 8 ), transferId );
				}

				this._incomingTransfers[ transferId ].addChunk( chunkIndex, data.slice( 12 ).buffer );
			}
		}

		hasConnection( remoteUserId ) {
			return !!this._connections[ remoteUserId ];
		}

		addNameToTransfer( transferId, filename ) {
			this._incomingTransfers[ '_'+transferId ].setName( filename );
		}

		_finaliseTransfer( transferId ) {
			var transfer = this._incomingTransfers[ '_' + transferId ];
			var validationResult = transfer.validate()
			if( validationResult === true ) {
				transfer.downloadFile();
				transfer.addOwnerToFile();
			} else {
				//TODO display to user
				console.log( 'transfer failed', validationResult );
			}
		}

		_checkConnections() {
			for( var remoteUserId in this._connections ) {
				if( this._connections[ remoteUserId ].isConnected() === false ) {
					this._removeConnection( remoteUserId );
				}
			}
		}

		_removeConnection( remoteUserId ) {
			if( this._connections[ remoteUserId ].isConnected() ) {
				this._connections[ remoteUserId ].destroy();
			}

			delete this._connections[ remoteUserId ];

			var data = ds.record.get();
			var userIndex = data.users.indexOf( remoteUserId );
			var filename;
			var ownerIndex;

			if( userIndex > -1 ) {
				data.users.splice( userIndex, 1 );
			}

			for( filename in data.files ) {
				ownerIndex = data.files[ filename ].owners.indexOf( remoteUserId )
				if( ownerIndex > -1 ) {
					data.files[ filename ].owners.splice( ownerIndex, 1 );
				}

				if( data.files[ filename ].owners.length === 0 ) {
					delete data.files[ filename ];
				}
			}
			console.log( 'setting', data );
			ds.record.set( data );
		}

		_onIncomingSignal( message ) {
			if( this._connections[ message.sender ] ) {
				this._connections[ message.sender ].processIncomingSignal( message.signal );
			} else {
				console.log( 'received signal for unknown connection ' + message.sender );
			}
		}

		_createConnections() {
			var users = ds.record.get( 'users' );
			var i;

			for( i = 0; i < users.length; i++ ) {
				if( users[ i ] === ds.userId ) {
					continue;
				}

				if( this._connections[ users[ i ] ] ) {
					continue;
				}

				this.addConnection( users[ i ] );
			}
		}
	}

	module.exports = new Room();

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	const Peer = __webpack_require__( 36 );
	const ds = __webpack_require__( 2 );
	window.ds = ds;
	module.exports = class Connection{
		constructor( room, remoteUserId ) {
			this._room = room;
			this._remoteUserId = remoteUserId;
			this._connection = new Peer({ initiator: ds.userId > remoteUserId, trickle: false });
			this._connection.on( 'error', this._onError.bind( this ) );
			this._connection.on( 'signal', this._onOutgoingSignal.bind( this ) );
			this._connection.on( 'connect', this._onConnect.bind( this ) );
			this._connection.on( 'close', this._onClose.bind( this ) );

			//Hack instead of using the official 'data' event - lets us handle the array buffer directly
			this._connection._onChannelMessage = this._onData.bind( this );
		}

		send( data ) {
			this._connection.send( data );
		}

		processIncomingSignal( signal ) {
			this._connection.signal( signal );
		}

		isConnected() {
			return !!this._connection.connected;
		}

		_onError( error ) {
			console.log( 'peer connection error', error );
		}

		_onOutgoingSignal( signal ) {
			signal.sdp = signal.sdp.replace( 'b=AS:30', 'b=AS:1638400' );
			ds.client.event.emit( 'rtc-signal/' + ds.roomId + '/' + this._remoteUserId, {
				sender: ds.userId,
				signal: signal
			});
		}

		_onConnect() {
			console.log( 'connected' );
		}

		_onData( event ) {
			this._room.processIncomingData( event.data );
		}

		_onClose() {
			ds.client.emit( 'disconnect', this._remoteUserId );
		}
	}


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = Peer

	var debug = __webpack_require__(41)('simple-peer')
	var getBrowserRTC = __webpack_require__(44)
	var inherits = __webpack_require__(45)
	var randombytes = __webpack_require__(46)
	var stream = __webpack_require__(47)

	var MAX_BUFFERED_AMOUNT = 64 * 1024

	inherits(Peer, stream.Duplex)

	/**
	 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
	 * Duplex stream.
	 * @param {Object} opts
	 */
	function Peer (opts) {
	  var self = this
	  if (!(self instanceof Peer)) return new Peer(opts)

	  self._id = randombytes(4).toString('hex').slice(0, 7)
	  self._debug('new peer %o', opts)

	  opts = Object.assign({
	    allowHalfOpen: false
	  }, opts)

	  stream.Duplex.call(self, opts)

	  self.channelName = opts.initiator
	    ? opts.channelName || randombytes(20).toString('hex')
	    : null

	  // Needed by _transformConstraints, so set this early
	  self._isChromium = typeof window !== 'undefined' && !!window.webkitRTCPeerConnection

	  self.initiator = opts.initiator || false
	  self.channelConfig = opts.channelConfig || Peer.channelConfig
	  self.config = opts.config || Peer.config
	  self.constraints = self._transformConstraints(opts.constraints || Peer.constraints)
	  self.offerConstraints = self._transformConstraints(opts.offerConstraints || {})
	  self.answerConstraints = self._transformConstraints(opts.answerConstraints || {})
	  self.reconnectTimer = opts.reconnectTimer || false
	  self.sdpTransform = opts.sdpTransform || function (sdp) { return sdp }
	  self.stream = opts.stream || false
	  self.trickle = opts.trickle !== undefined ? opts.trickle : true

	  self.destroyed = false
	  self.connected = false

	  self.remoteAddress = undefined
	  self.remoteFamily = undefined
	  self.remotePort = undefined
	  self.localAddress = undefined
	  self.localPort = undefined

	  self._wrtc = (opts.wrtc && typeof opts.wrtc === 'object')
	    ? opts.wrtc
	    : getBrowserRTC()

	  if (!self._wrtc) {
	    if (typeof window === 'undefined') {
	      throw new Error('No WebRTC support: Specify `opts.wrtc` option in this environment')
	    } else {
	      throw new Error('No WebRTC support: Not a supported browser')
	    }
	  }

	  self._pcReady = false
	  self._channelReady = false
	  self._iceComplete = false // ice candidate trickle done (got null candidate)
	  self._channel = null
	  self._pendingCandidates = []
	  self._previousStreams = []

	  self._chunk = null
	  self._cb = null
	  self._interval = null
	  self._reconnectTimeout = null

	  self._pc = new (self._wrtc.RTCPeerConnection)(self.config, self.constraints)

	  // We prefer feature detection whenever possible, but sometimes that's not
	  // possible for certain implementations.
	  self._isWrtc = Array.isArray(self._pc.RTCIceConnectionStates)
	  self._isReactNativeWebrtc = typeof self._pc._peerConnectionId === 'number'

	  self._pc.oniceconnectionstatechange = function () {
	    self._onIceStateChange()
	  }
	  self._pc.onicegatheringstatechange = function () {
	    self._onIceStateChange()
	  }
	  self._pc.onsignalingstatechange = function () {
	    self._onSignalingStateChange()
	  }
	  self._pc.onicecandidate = function (event) {
	    self._onIceCandidate(event)
	  }

	  // Other spec events, unused by this implementation:
	  // - onconnectionstatechange
	  // - onicecandidateerror
	  // - onfingerprintfailure

	  if (self.initiator) {
	    var createdOffer = false
	    self._pc.onnegotiationneeded = function () {
	      if (!createdOffer) self._createOffer()
	      createdOffer = true
	    }

	    self._setupData({
	      channel: self._pc.createDataChannel(self.channelName, self.channelConfig)
	    })
	  } else {
	    self._pc.ondatachannel = function (event) {
	      self._setupData(event)
	    }
	  }

	  if ('addTrack' in self._pc) {
	    // WebRTC Spec, Firefox
	    if (self.stream) {
	      self.stream.getTracks().forEach(function (track) {
	        self._pc.addTrack(track, self.stream)
	      })
	    }
	    self._pc.ontrack = function (event) {
	      self._onTrack(event)
	    }
	  } else {
	    // Chrome, etc. This can be removed once all browsers support `ontrack`
	    if (self.stream) self._pc.addStream(self.stream)
	    self._pc.onaddstream = function (event) {
	      self._onAddStream(event)
	    }
	  }

	  // HACK: wrtc doesn't fire the 'negotionneeded' event
	  if (self.initiator && self._isWrtc) {
	    self._pc.onnegotiationneeded()
	  }

	  self._onFinishBound = function () {
	    self._onFinish()
	  }
	  self.once('finish', self._onFinishBound)
	}

	Peer.WEBRTC_SUPPORT = !!getBrowserRTC()

	/**
	 * Expose config, constraints, and data channel config for overriding all Peer
	 * instances. Otherwise, just set opts.config, opts.constraints, or opts.channelConfig
	 * when constructing a Peer.
	 */
	Peer.config = {
	  iceServers: [
	    {
	      urls: 'stun:stun.l.google.com:19302'
	    },
	    {
	      urls: 'stun:global.stun.twilio.com:3478?transport=udp'
	    }
	  ]
	}
	Peer.constraints = {}
	Peer.channelConfig = {}

	Object.defineProperty(Peer.prototype, 'bufferSize', {
	  get: function () {
	    var self = this
	    return (self._channel && self._channel.bufferedAmount) || 0
	  }
	})

	Peer.prototype.address = function () {
	  var self = this
	  return { port: self.localPort, family: 'IPv4', address: self.localAddress }
	}

	Peer.prototype.signal = function (data) {
	  var self = this
	  if (self.destroyed) throw new Error('cannot signal after peer is destroyed')
	  if (typeof data === 'string') {
	    try {
	      data = JSON.parse(data)
	    } catch (err) {
	      data = {}
	    }
	  }
	  self._debug('signal()')

	  if (data.candidate) {
	    if (self._pc.remoteDescription) self._addIceCandidate(data.candidate)
	    else self._pendingCandidates.push(data.candidate)
	  }
	  if (data.sdp) {
	    self._pc.setRemoteDescription(new (self._wrtc.RTCSessionDescription)(data), function () {
	      if (self.destroyed) return

	      self._pendingCandidates.forEach(function (candidate) {
	        self._addIceCandidate(candidate)
	      })
	      self._pendingCandidates = []

	      if (self._pc.remoteDescription.type === 'offer') self._createAnswer()
	    }, function (err) { self._destroy(err) })
	  }
	  if (!data.sdp && !data.candidate) {
	    self._destroy(new Error('signal() called with invalid signal data'))
	  }
	}

	Peer.prototype._addIceCandidate = function (candidate) {
	  var self = this
	  try {
	    self._pc.addIceCandidate(
	      new self._wrtc.RTCIceCandidate(candidate),
	      noop,
	      function (err) { self._destroy(err) }
	    )
	  } catch (err) {
	    self._destroy(new Error('error adding candidate: ' + err.message))
	  }
	}

	/**
	 * Send text/binary data to the remote peer.
	 * @param {TypedArrayView|ArrayBuffer|Buffer|string|Blob|Object} chunk
	 */
	Peer.prototype.send = function (chunk) {
	  var self = this

	  // HACK: `wrtc` module crashes on Node.js Buffer, so convert to Uint8Array
	  // See: https://github.com/feross/simple-peer/issues/60
	  if (self._isWrtc && Buffer.isBuffer(chunk)) {
	    chunk = new Uint8Array(chunk)
	  }

	  self._channel.send(chunk)
	}

	Peer.prototype.destroy = function (onclose) {
	  var self = this
	  self._destroy(null, onclose)
	}

	Peer.prototype._destroy = function (err, onclose) {
	  var self = this
	  if (self.destroyed) return
	  if (onclose) self.once('close', onclose)

	  self._debug('destroy (error: %s)', err && (err.message || err))

	  self.readable = self.writable = false

	  if (!self._readableState.ended) self.push(null)
	  if (!self._writableState.finished) self.end()

	  self.destroyed = true
	  self.connected = false
	  self._pcReady = false
	  self._channelReady = false
	  self._previousStreams = null

	  clearInterval(self._interval)
	  clearTimeout(self._reconnectTimeout)
	  self._interval = null
	  self._reconnectTimeout = null
	  self._chunk = null
	  self._cb = null

	  if (self._onFinishBound) self.removeListener('finish', self._onFinishBound)
	  self._onFinishBound = null

	  if (self._pc) {
	    try {
	      self._pc.close()
	    } catch (err) {}

	    self._pc.oniceconnectionstatechange = null
	    self._pc.onicegatheringstatechange = null
	    self._pc.onsignalingstatechange = null
	    self._pc.onicecandidate = null
	    if ('addTrack' in self._pc) {
	      self._pc.ontrack = null
	    } else {
	      self._pc.onaddstream = null
	    }
	    self._pc.onnegotiationneeded = null
	    self._pc.ondatachannel = null
	  }

	  if (self._channel) {
	    try {
	      self._channel.close()
	    } catch (err) {}

	    self._channel.onmessage = null
	    self._channel.onopen = null
	    self._channel.onclose = null
	    self._channel.onerror = null
	  }
	  self._pc = null
	  self._channel = null

	  if (err) self.emit('error', err)
	  self.emit('close')
	}

	Peer.prototype._setupData = function (event) {
	  var self = this
	  if (!event.channel) {
	    // In some situations `pc.createDataChannel()` returns `undefined` (in wrtc),
	    // which is invalid behavior. Handle it gracefully.
	    // See: https://github.com/feross/simple-peer/issues/163
	    return self._destroy(new Error('Data channel event is missing `channel` property'))
	  }

	  self._channel = event.channel
	  self._channel.binaryType = 'arraybuffer'

	  if (typeof self._channel.bufferedAmountLowThreshold === 'number') {
	    self._channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT
	  }

	  self.channelName = self._channel.label

	  self._channel.onmessage = function (event) {
	    self._onChannelMessage(event)
	  }
	  self._channel.onbufferedamountlow = function () {
	    self._onChannelBufferedAmountLow()
	  }
	  self._channel.onopen = function () {
	    self._onChannelOpen()
	  }
	  self._channel.onclose = function () {
	    self._onChannelClose()
	  }
	  self._channel.onerror = function (err) {
	    self._destroy(err)
	  }
	}

	Peer.prototype._read = function () {}

	Peer.prototype._write = function (chunk, encoding, cb) {
	  var self = this
	  if (self.destroyed) return cb(new Error('cannot write after peer is destroyed'))

	  if (self.connected) {
	    try {
	      self.send(chunk)
	    } catch (err) {
	      return self._destroy(err)
	    }
	    if (self._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
	      self._debug('start backpressure: bufferedAmount %d', self._channel.bufferedAmount)
	      self._cb = cb
	    } else {
	      cb(null)
	    }
	  } else {
	    self._debug('write before connect')
	    self._chunk = chunk
	    self._cb = cb
	  }
	}

	// When stream finishes writing, close socket. Half open connections are not
	// supported.
	Peer.prototype._onFinish = function () {
	  var self = this
	  if (self.destroyed) return

	  if (self.connected) {
	    destroySoon()
	  } else {
	    self.once('connect', destroySoon)
	  }

	  // Wait a bit before destroying so the socket flushes.
	  // TODO: is there a more reliable way to accomplish this?
	  function destroySoon () {
	    setTimeout(function () {
	      self._destroy()
	    }, 1000)
	  }
	}

	Peer.prototype._createOffer = function () {
	  var self = this
	  if (self.destroyed) return

	  self._pc.createOffer(function (offer) {
	    if (self.destroyed) return
	    offer.sdp = self.sdpTransform(offer.sdp)
	    self._pc.setLocalDescription(offer, onSuccess, onError)

	    function onSuccess () {
	      if (self.destroyed) return
	      if (self.trickle || self._iceComplete) sendOffer()
	      else self.once('_iceComplete', sendOffer) // wait for candidates
	    }

	    function onError (err) {
	      self._destroy(err)
	    }

	    function sendOffer () {
	      var signal = self._pc.localDescription || offer
	      self._debug('signal')
	      self.emit('signal', {
	        type: signal.type,
	        sdp: signal.sdp
	      })
	    }
	  }, function (err) { self._destroy(err) }, self.offerConstraints)
	}

	Peer.prototype._createAnswer = function () {
	  var self = this
	  if (self.destroyed) return

	  self._pc.createAnswer(function (answer) {
	    if (self.destroyed) return
	    answer.sdp = self.sdpTransform(answer.sdp)
	    self._pc.setLocalDescription(answer, onSuccess, onError)

	    function onSuccess () {
	      if (self.destroyed) return
	      if (self.trickle || self._iceComplete) sendAnswer()
	      else self.once('_iceComplete', sendAnswer)
	    }

	    function onError (err) {
	      self._destroy(err)
	    }

	    function sendAnswer () {
	      var signal = self._pc.localDescription || answer
	      self._debug('signal')
	      self.emit('signal', {
	        type: signal.type,
	        sdp: signal.sdp
	      })
	    }
	  }, function (err) { self._destroy(err) }, self.answerConstraints)
	}

	Peer.prototype._onIceStateChange = function () {
	  var self = this
	  if (self.destroyed) return
	  var iceConnectionState = self._pc.iceConnectionState
	  var iceGatheringState = self._pc.iceGatheringState

	  self._debug(
	    'iceStateChange (connection: %s) (gathering: %s)',
	    iceConnectionState,
	    iceGatheringState
	  )
	  self.emit('iceStateChange', iceConnectionState, iceGatheringState)

	  if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
	    clearTimeout(self._reconnectTimeout)
	    self._pcReady = true
	    self._maybeReady()
	  }
	  if (iceConnectionState === 'disconnected') {
	    if (self.reconnectTimer) {
	      // If user has set `opt.reconnectTimer`, allow time for ICE to attempt a reconnect
	      clearTimeout(self._reconnectTimeout)
	      self._reconnectTimeout = setTimeout(function () {
	        self._destroy()
	      }, self.reconnectTimer)
	    } else {
	      self._destroy()
	    }
	  }
	  if (iceConnectionState === 'failed') {
	    self._destroy(new Error('Ice connection failed.'))
	  }
	  if (iceConnectionState === 'closed') {
	    self._destroy()
	  }
	}

	Peer.prototype.getStats = function (cb) {
	  var self = this

	  // Promise-based getStats() (standard)
	  if (self._pc.getStats.length === 0) {
	    self._pc.getStats().then(function (res) {
	      var reports = []
	      res.forEach(function (report) {
	        reports.push(report)
	      })
	      cb(null, reports)
	    }, function (err) { cb(err) })

	  // Two-parameter callback-based getStats() (deprecated, former standard)
	  } else if (self._isReactNativeWebrtc) {
	    self._pc.getStats(null, function (res) {
	      var reports = []
	      res.forEach(function (report) {
	        reports.push(report)
	      })
	      cb(null, reports)
	    }, function (err) { cb(err) })

	  // Single-parameter callback-based getStats() (non-standard)
	  } else if (self._pc.getStats.length > 0) {
	    self._pc.getStats(function (res) {
	      var reports = []
	      res.result().forEach(function (result) {
	        var report = {}
	        result.names().forEach(function (name) {
	          report[name] = result.stat(name)
	        })
	        report.id = result.id
	        report.type = result.type
	        report.timestamp = result.timestamp
	        reports.push(report)
	      })
	      cb(null, reports)
	    }, function (err) { cb(err) })

	  // Unknown browser, skip getStats() since it's anyone's guess which style of
	  // getStats() they implement.
	  } else {
	    cb(null, [])
	  }
	}

	Peer.prototype._maybeReady = function () {
	  var self = this
	  self._debug('maybeReady pc %s channel %s', self._pcReady, self._channelReady)
	  if (self.connected || self._connecting || !self._pcReady || !self._channelReady) return
	  self._connecting = true

	  self.getStats(function (err, items) {
	    if (self.destroyed) return

	    // Treat getStats error as non-fatal. It's not essential.
	    if (err) items = []

	    self._connecting = false
	    self.connected = true

	    var remoteCandidates = {}
	    var localCandidates = {}
	    var candidatePairs = {}

	    items.forEach(function (item) {
	      // TODO: Once all browsers support the hyphenated stats report types, remove
	      // the non-hypenated ones
	      if (item.type === 'remotecandidate' || item.type === 'remote-candidate') {
	        remoteCandidates[item.id] = item
	      }
	      if (item.type === 'localcandidate' || item.type === 'local-candidate') {
	        localCandidates[item.id] = item
	      }
	      if (item.type === 'candidatepair' || item.type === 'candidate-pair') {
	        candidatePairs[item.id] = item
	      }
	    })

	    items.forEach(function (item) {
	      // Spec-compliant
	      if (item.type === 'transport') {
	        setSelectedCandidatePair(candidatePairs[item.selectedCandidatePairId])
	      }

	      // Old implementations
	      if (
	        (item.type === 'googCandidatePair' && item.googActiveConnection === 'true') ||
	        ((item.type === 'candidatepair' || item.type === 'candidate-pair') && item.selected)
	      ) {
	        setSelectedCandidatePair(item)
	      }
	    })

	    function setSelectedCandidatePair (selectedCandidatePair) {
	      var local = localCandidates[selectedCandidatePair.localCandidateId]

	      if (local && local.ip) {
	        // Spec
	        self.localAddress = local.ip
	        self.localPort = Number(local.port)
	      } else if (local && local.ipAddress) {
	        // Firefox
	        self.localAddress = local.ipAddress
	        self.localPort = Number(local.portNumber)
	      } else if (typeof selectedCandidatePair.googLocalAddress === 'string') {
	        // TODO: remove this once Chrome 58 is released
	        local = selectedCandidatePair.googLocalAddress.split(':')
	        self.localAddress = local[0]
	        self.localPort = Number(local[1])
	      }

	      var remote = remoteCandidates[selectedCandidatePair.remoteCandidateId]

	      if (remote && remote.ip) {
	        // Spec
	        self.remoteAddress = remote.ip
	        self.remotePort = Number(remote.port)
	      } else if (remote && remote.ipAddress) {
	        // Firefox
	        self.remoteAddress = remote.ipAddress
	        self.remotePort = Number(remote.portNumber)
	      } else if (typeof selectedCandidatePair.googRemoteAddress === 'string') {
	        // TODO: remove this once Chrome 58 is released
	        remote = selectedCandidatePair.googRemoteAddress.split(':')
	        self.remoteAddress = remote[0]
	        self.remotePort = Number(remote[1])
	      }
	      self.remoteFamily = 'IPv4'

	      self._debug(
	        'connect local: %s:%s remote: %s:%s',
	        self.localAddress, self.localPort, self.remoteAddress, self.remotePort
	      )
	    }

	    if (self._chunk) {
	      try {
	        self.send(self._chunk)
	      } catch (err) {
	        return self._destroy(err)
	      }
	      self._chunk = null
	      self._debug('sent chunk from "write before connect"')

	      var cb = self._cb
	      self._cb = null
	      cb(null)
	    }

	    // If `bufferedAmountLowThreshold` and 'onbufferedamountlow' are unsupported,
	    // fallback to using setInterval to implement backpressure.
	    if (typeof self._channel.bufferedAmountLowThreshold !== 'number') {
	      self._interval = setInterval(function () { self._onInterval() }, 150)
	      if (self._interval.unref) self._interval.unref()
	    }

	    self._debug('connect')
	    self.emit('connect')
	  })
	}

	Peer.prototype._onInterval = function () {
	  if (!this._cb || !this._channel || this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
	    return
	  }
	  this._onChannelBufferedAmountLow()
	}

	Peer.prototype._onSignalingStateChange = function () {
	  var self = this
	  if (self.destroyed) return
	  self._debug('signalingStateChange %s', self._pc.signalingState)
	  self.emit('signalingStateChange', self._pc.signalingState)
	}

	Peer.prototype._onIceCandidate = function (event) {
	  var self = this
	  if (self.destroyed) return
	  if (event.candidate && self.trickle) {
	    self.emit('signal', {
	      candidate: {
	        candidate: event.candidate.candidate,
	        sdpMLineIndex: event.candidate.sdpMLineIndex,
	        sdpMid: event.candidate.sdpMid
	      }
	    })
	  } else if (!event.candidate) {
	    self._iceComplete = true
	    self.emit('_iceComplete')
	  }
	}

	Peer.prototype._onChannelMessage = function (event) {
	  var self = this
	  if (self.destroyed) return
	  var data = event.data
	  if (data instanceof ArrayBuffer) data = Buffer.from(data)
	  self.push(data)
	}

	Peer.prototype._onChannelBufferedAmountLow = function () {
	  var self = this
	  if (self.destroyed || !self._cb) return
	  self._debug('ending backpressure: bufferedAmount %d', self._channel.bufferedAmount)
	  var cb = self._cb
	  self._cb = null
	  cb(null)
	}

	Peer.prototype._onChannelOpen = function () {
	  var self = this
	  if (self.connected || self.destroyed) return
	  self._debug('on channel open')
	  self._channelReady = true
	  self._maybeReady()
	}

	Peer.prototype._onChannelClose = function () {
	  var self = this
	  if (self.destroyed) return
	  self._debug('on channel close')
	  self._destroy()
	}

	Peer.prototype._onAddStream = function (event) {
	  var self = this
	  if (self.destroyed) return
	  self._debug('on add stream')
	  self.emit('stream', event.stream)
	}

	Peer.prototype._onTrack = function (event) {
	  var self = this
	  if (self.destroyed) return
	  self._debug('on track')
	  var id = event.streams[0].id
	  if (self._previousStreams.indexOf(id) !== -1) return // Only fire one 'stream' event, even though there may be multiple tracks per stream
	  self._previousStreams.push(id)
	  self.emit('stream', event.streams[0])
	}

	Peer.prototype._debug = function () {
	  var self = this
	  var args = [].slice.call(arguments)
	  args[0] = '[' + self._id + '] ' + args[0]
	  debug.apply(null, args)
	}

	// Transform constraints objects into the new format (unless Chromium)
	// TODO: This can be removed when Chromium supports the new format
	Peer.prototype._transformConstraints = function (constraints) {
	  var self = this

	  if (Object.keys(constraints).length === 0) {
	    return constraints
	  }

	  if ((constraints.mandatory || constraints.optional) && !self._isChromium) {
	    // convert to new format

	    // Merge mandatory and optional objects, prioritizing mandatory
	    var newConstraints = Object.assign({}, constraints.optional, constraints.mandatory)

	    // fix casing
	    if (newConstraints.OfferToReceiveVideo !== undefined) {
	      newConstraints.offerToReceiveVideo = newConstraints.OfferToReceiveVideo
	      delete newConstraints['OfferToReceiveVideo']
	    }

	    if (newConstraints.OfferToReceiveAudio !== undefined) {
	      newConstraints.offerToReceiveAudio = newConstraints.OfferToReceiveAudio
	      delete newConstraints['OfferToReceiveAudio']
	    }

	    return newConstraints
	  } else if (!constraints.mandatory && !constraints.optional && self._isChromium) {
	    // convert to old format

	    // fix casing
	    if (constraints.offerToReceiveVideo !== undefined) {
	      constraints.OfferToReceiveVideo = constraints.offerToReceiveVideo
	      delete constraints['offerToReceiveVideo']
	    }

	    if (constraints.offerToReceiveAudio !== undefined) {
	      constraints.OfferToReceiveAudio = constraints.offerToReceiveAudio
	      delete constraints['offerToReceiveAudio']
	    }

	    return {
	      mandatory: constraints // NOTE: All constraints are upgraded to mandatory
	    }
	  }

	  return constraints
	}

	function noop () {}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(37).Buffer))

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(38)
	var ieee754 = __webpack_require__(39)
	var isArray = __webpack_require__(40)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var rootParent = {}

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
	 *     on objects.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	function typedArraySupport () {
	  function Bar () {}
	  try {
	    var arr = new Uint8Array(1)
	    arr.foo = function () { return 42 }
	    arr.constructor = Bar
	    return arr.foo() === 42 && // typed array instances can be augmented
	        arr.constructor === Bar && // constructor can be set
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (arg) {
	  if (!(this instanceof Buffer)) {
	    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
	    if (arguments.length > 1) return new Buffer(arg, arguments[1])
	    return new Buffer(arg)
	  }

	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    this.length = 0
	    this.parent = undefined
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    return fromNumber(this, arg)
	  }

	  // Slightly less common case.
	  if (typeof arg === 'string') {
	    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
	  }

	  // Unusual.
	  return fromObject(this, arg)
	}

	function fromNumber (that, length) {
	  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < length; i++) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

	  // Assumption: byteLength() return value is always < kMaxLength.
	  var length = byteLength(string, encoding) | 0
	  that = allocate(that, length)

	  that.write(string, encoding)
	  return that
	}

	function fromObject (that, object) {
	  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

	  if (isArray(object)) return fromArray(that, object)

	  if (object == null) {
	    throw new TypeError('must start with number, buffer, array or string')
	  }

	  if (typeof ArrayBuffer !== 'undefined') {
	    if (object.buffer instanceof ArrayBuffer) {
	      return fromTypedArray(that, object)
	    }
	    if (object instanceof ArrayBuffer) {
	      return fromArrayBuffer(that, object)
	    }
	  }

	  if (object.length) return fromArrayLike(that, object)

	  return fromJsonObject(that, object)
	}

	function fromBuffer (that, buffer) {
	  var length = checked(buffer.length) | 0
	  that = allocate(that, length)
	  buffer.copy(that, 0, 0, length)
	  return that
	}

	function fromArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Duplicate of fromArray() to keep fromArray() monomorphic.
	function fromTypedArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  // Truncating the elements is probably not what people expect from typed
	  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
	  // of the old Buffer constructor.
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    array.byteLength
	    that = Buffer._augment(new Uint8Array(array))
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromTypedArray(that, new Uint8Array(array))
	  }
	  return that
	}

	function fromArrayLike (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
	// Returns a zero-length buffer for inputs that don't conform to the spec.
	function fromJsonObject (that, object) {
	  var array
	  var length = 0

	  if (object.type === 'Buffer' && isArray(object.data)) {
	    array = object.data
	    length = checked(array.length) | 0
	  }
	  that = allocate(that, length)

	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	} else {
	  // pre-set for values that may exist in the future
	  Buffer.prototype.length = undefined
	  Buffer.prototype.parent = undefined
	}

	function allocate (that, length) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = Buffer._augment(new Uint8Array(length))
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that.length = length
	    that._isBuffer = true
	  }

	  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
	  if (fromPool) that.parent = rootParent

	  return that
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (subject, encoding) {
	  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

	  var buf = new Buffer(subject, encoding)
	  delete buf.parent
	  return buf
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  var i = 0
	  var len = Math.min(x, y)
	  while (i < len) {
	    if (a[i] !== b[i]) break

	    ++i
	  }

	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; i++) {
	      length += list[i].length
	    }
	  }

	  var buf = new Buffer(length)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	function byteLength (string, encoding) {
	  if (typeof string !== 'string') string = '' + string

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'binary':
	      // Deprecated
	      case 'raw':
	      case 'raws':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  start = start | 0
	  end = end === undefined || end === Infinity ? this.length : end | 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return 0
	  return Buffer.compare(this, b)
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
	  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
	  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
	  byteOffset >>= 0

	  if (this.length === 0) return -1
	  if (byteOffset >= this.length) return -1

	  // Negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

	  if (typeof val === 'string') {
	    if (val.length === 0) return -1 // special case: looking for empty string always fails
	    return String.prototype.indexOf.call(this, val, byteOffset)
	  }
	  if (Buffer.isBuffer(val)) {
	    return arrayIndexOf(this, val, byteOffset)
	  }
	  if (typeof val === 'number') {
	    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
	      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
	    }
	    return arrayIndexOf(this, [ val ], byteOffset)
	  }

	  function arrayIndexOf (arr, val, byteOffset) {
	    var foundIndex = -1
	    for (var i = 0; byteOffset + i < arr.length; i++) {
	      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
	      } else {
	        foundIndex = -1
	      }
	    }
	    return -1
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	// `get` is deprecated
	Buffer.prototype.get = function get (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` is deprecated
	Buffer.prototype.set = function set (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) throw new Error('Invalid hex string')
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    var swap = encoding
	    encoding = offset
	    offset = length | 0
	    length = swap
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'binary':
	        return binaryWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  if (newBuf.length) newBuf.parent = this.parent || this

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	  if (offset < 0) throw new RangeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; i--) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; i++) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), targetStart)
	  }

	  return len
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new RangeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function _augment (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array set method before overwriting
	  arr._set = arr.set

	  // deprecated
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.indexOf = BP.indexOf
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUIntLE = BP.readUIntLE
	  arr.readUIntBE = BP.readUIntBE
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readIntLE = BP.readIntLE
	  arr.readIntBE = BP.readIntBE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUIntLE = BP.writeUIntLE
	  arr.writeUIntBE = BP.writeUIntBE
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeIntLE = BP.writeIntLE
	  arr.writeIntBE = BP.writeIntBE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; i++) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(37).Buffer, (function() { return this; }())))

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)
		var PLUS_URL_SAFE = '-'.charCodeAt(0)
		var SLASH_URL_SAFE = '_'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS ||
			    code === PLUS_URL_SAFE)
				return 62 // '+'
			if (code === SLASH ||
			    code === SLASH_URL_SAFE)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}( false ? (this.base64js = {}) : exports))


/***/ },
/* 39 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 40 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * This is the web browser implementation of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = __webpack_require__(42);
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = 'undefined' != typeof chrome
	               && 'undefined' != typeof chrome.storage
	                  ? chrome.storage.local
	                  : localstorage();

	/**
	 * Colors.
	 */

	exports.colors = [
	  'lightseagreen',
	  'forestgreen',
	  'goldenrod',
	  'dodgerblue',
	  'darkorchid',
	  'crimson'
	];

	/**
	 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	 * and the Firebug extension (any Firefox version) are known
	 * to support "%c" CSS customizations.
	 *
	 * TODO: add a `localStorage` variable to explicitly enable/disable colors
	 */

	function useColors() {
	  // NB: In an Electron preload script, document will be defined but not fully
	  // initialized. Since we know we're in Chrome, we'll just detect this case
	  // explicitly
	  if (typeof window !== 'undefined' && window && typeof window.process !== 'undefined' && window.process.type === 'renderer') {
	    return true;
	  }

	  // is webkit? http://stackoverflow.com/a/16459606/376773
	  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	  return (typeof document !== 'undefined' && document && 'WebkitAppearance' in document.documentElement.style) ||
	    // is firebug? http://stackoverflow.com/a/398120/376773
	    (typeof window !== 'undefined' && window && window.console && (console.firebug || (console.exception && console.table))) ||
	    // is firefox >= v31?
	    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
	    (typeof navigator !== 'undefined' && navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
	    // double check webkit in userAgent just in case we are in a worker
	    (typeof navigator !== 'undefined' && navigator && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
	}

	/**
	 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	 */

	exports.formatters.j = function(v) {
	  try {
	    return JSON.stringify(v);
	  } catch (err) {
	    return '[UnexpectedJSONParseError]: ' + err.message;
	  }
	};


	/**
	 * Colorize log arguments if enabled.
	 *
	 * @api public
	 */

	function formatArgs(args) {
	  var useColors = this.useColors;

	  args[0] = (useColors ? '%c' : '')
	    + this.namespace
	    + (useColors ? ' %c' : ' ')
	    + args[0]
	    + (useColors ? '%c ' : ' ')
	    + '+' + exports.humanize(this.diff);

	  if (!useColors) return;

	  var c = 'color: ' + this.color;
	  args.splice(1, 0, c, 'color: inherit')

	  // the final "%c" is somewhat tricky, because there could be other
	  // arguments passed either before or after the %c, so we need to
	  // figure out the correct index to insert the CSS into
	  var index = 0;
	  var lastC = 0;
	  args[0].replace(/%[a-zA-Z%]/g, function(match) {
	    if ('%%' === match) return;
	    index++;
	    if ('%c' === match) {
	      // we only are interested in the *last* %c
	      // (the user may have provided their own)
	      lastC = index;
	    }
	  });

	  args.splice(lastC, 0, c);
	}

	/**
	 * Invokes `console.log()` when available.
	 * No-op when `console.log` is not a "function".
	 *
	 * @api public
	 */

	function log() {
	  // this hackery is required for IE8/9, where
	  // the `console.log` function doesn't have 'apply'
	  return 'object' === typeof console
	    && console.log
	    && Function.prototype.apply.call(console.log, console, arguments);
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */

	function save(namespaces) {
	  try {
	    if (null == namespaces) {
	      exports.storage.removeItem('debug');
	    } else {
	      exports.storage.debug = namespaces;
	    }
	  } catch(e) {}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
	  var r;
	  try {
	    r = exports.storage.debug;
	  } catch(e) {}

	  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	  if (!r && typeof process !== 'undefined' && 'env' in process) {
	    r = process.env.DEBUG;
	  }

	  return r;
	}

	/**
	 * Enable namespaces listed in `localStorage.debug` initially.
	 */

	exports.enable(load());

	/**
	 * Localstorage attempts to return the localstorage.
	 *
	 * This is necessary because safari throws
	 * when a user disables cookies/localstorage
	 * and you attempt to access it.
	 *
	 * @return {LocalStorage}
	 * @api private
	 */

	function localstorage() {
	  try {
	    return window.localStorage;
	  } catch (e) {}
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = __webpack_require__(43);

	/**
	 * The currently active debug mode names, and names to skip.
	 */

	exports.names = [];
	exports.skips = [];

	/**
	 * Map of special "%n" handling functions, for the debug "format" argument.
	 *
	 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	 */

	exports.formatters = {};

	/**
	 * Previous log timestamp.
	 */

	var prevTime;

	/**
	 * Select a color.
	 * @param {String} namespace
	 * @return {Number}
	 * @api private
	 */

	function selectColor(namespace) {
	  var hash = 0, i;

	  for (i in namespace) {
	    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
	    hash |= 0; // Convert to 32bit integer
	  }

	  return exports.colors[Math.abs(hash) % exports.colors.length];
	}

	/**
	 * Create a debugger with the given `namespace`.
	 *
	 * @param {String} namespace
	 * @return {Function}
	 * @api public
	 */

	function createDebug(namespace) {

	  function debug() {
	    // disabled?
	    if (!debug.enabled) return;

	    var self = debug;

	    // set `diff` timestamp
	    var curr = +new Date();
	    var ms = curr - (prevTime || curr);
	    self.diff = ms;
	    self.prev = prevTime;
	    self.curr = curr;
	    prevTime = curr;

	    // turn the `arguments` into a proper Array
	    var args = new Array(arguments.length);
	    for (var i = 0; i < args.length; i++) {
	      args[i] = arguments[i];
	    }

	    args[0] = exports.coerce(args[0]);

	    if ('string' !== typeof args[0]) {
	      // anything else let's inspect with %O
	      args.unshift('%O');
	    }

	    // apply any `formatters` transformations
	    var index = 0;
	    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
	      // if we encounter an escaped % then don't increase the array index
	      if (match === '%%') return match;
	      index++;
	      var formatter = exports.formatters[format];
	      if ('function' === typeof formatter) {
	        var val = args[index];
	        match = formatter.call(self, val);

	        // now we need to remove `args[index]` since it's inlined in the `format`
	        args.splice(index, 1);
	        index--;
	      }
	      return match;
	    });

	    // apply env-specific formatting (colors, etc.)
	    exports.formatArgs.call(self, args);

	    var logFn = debug.log || exports.log || console.log.bind(console);
	    logFn.apply(self, args);
	  }

	  debug.namespace = namespace;
	  debug.enabled = exports.enabled(namespace);
	  debug.useColors = exports.useColors();
	  debug.color = selectColor(namespace);

	  // env-specific initialization logic for debug instances
	  if ('function' === typeof exports.init) {
	    exports.init(debug);
	  }

	  return debug;
	}

	/**
	 * Enables a debug mode by namespaces. This can include modes
	 * separated by a colon and wildcards.
	 *
	 * @param {String} namespaces
	 * @api public
	 */

	function enable(namespaces) {
	  exports.save(namespaces);

	  exports.names = [];
	  exports.skips = [];

	  var split = (namespaces || '').split(/[\s,]+/);
	  var len = split.length;

	  for (var i = 0; i < len; i++) {
	    if (!split[i]) continue; // ignore empty strings
	    namespaces = split[i].replace(/\*/g, '.*?');
	    if (namespaces[0] === '-') {
	      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
	    } else {
	      exports.names.push(new RegExp('^' + namespaces + '$'));
	    }
	  }
	}

	/**
	 * Disable debug output.
	 *
	 * @api public
	 */

	function disable() {
	  exports.enable('');
	}

	/**
	 * Returns true if the given mode name is enabled, false otherwise.
	 *
	 * @param {String} name
	 * @return {Boolean}
	 * @api public
	 */

	function enabled(name) {
	  var i, len;
	  for (i = 0, len = exports.skips.length; i < len; i++) {
	    if (exports.skips[i].test(name)) {
	      return false;
	    }
	  }
	  for (i = 0, len = exports.names.length; i < len; i++) {
	    if (exports.names[i].test(name)) {
	      return true;
	    }
	  }
	  return false;
	}

	/**
	 * Coerce `val`.
	 *
	 * @param {Mixed} val
	 * @return {Mixed}
	 * @api private
	 */

	function coerce(val) {
	  if (val instanceof Error) return val.stack || val.message;
	  return val;
	}


/***/ },
/* 43 */
/***/ function(module, exports) {

	/**
	 * Helpers.
	 */

	var s = 1000
	var m = s * 60
	var h = m * 60
	var d = h * 24
	var y = d * 365.25

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} options
	 * @throws {Error} throw an error if val is not a non-empty string or a number
	 * @return {String|Number}
	 * @api public
	 */

	module.exports = function (val, options) {
	  options = options || {}
	  var type = typeof val
	  if (type === 'string' && val.length > 0) {
	    return parse(val)
	  } else if (type === 'number' && isNaN(val) === false) {
	    return options.long ?
				fmtLong(val) :
				fmtShort(val)
	  }
	  throw new Error('val is not a non-empty string or a valid number. val=' + JSON.stringify(val))
	}

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = String(str)
	  if (str.length > 10000) {
	    return
	  }
	  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str)
	  if (!match) {
	    return
	  }
	  var n = parseFloat(match[1])
	  var type = (match[2] || 'ms').toLowerCase()
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n
	    default:
	      return undefined
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function fmtShort(ms) {
	  if (ms >= d) {
	    return Math.round(ms / d) + 'd'
	  }
	  if (ms >= h) {
	    return Math.round(ms / h) + 'h'
	  }
	  if (ms >= m) {
	    return Math.round(ms / m) + 'm'
	  }
	  if (ms >= s) {
	    return Math.round(ms / s) + 's'
	  }
	  return ms + 'ms'
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function fmtLong(ms) {
	  return plural(ms, d, 'day') ||
	    plural(ms, h, 'hour') ||
	    plural(ms, m, 'minute') ||
	    plural(ms, s, 'second') ||
	    ms + ' ms'
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, n, name) {
	  if (ms < n) {
	    return
	  }
	  if (ms < n * 1.5) {
	    return Math.floor(ms / n) + ' ' + name
	  }
	  return Math.ceil(ms / n) + ' ' + name + 's'
	}


/***/ },
/* 44 */
/***/ function(module, exports) {

	// originally pulled out of simple-peer

	module.exports = function getBrowserRTC () {
	  if (typeof window === 'undefined') return null
	  var wrtc = {
	    RTCPeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection ||
	      window.webkitRTCPeerConnection,
	    RTCSessionDescription: window.RTCSessionDescription ||
	      window.mozRTCSessionDescription || window.webkitRTCSessionDescription,
	    RTCIceCandidate: window.RTCIceCandidate || window.mozRTCIceCandidate ||
	      window.webkitRTCIceCandidate
	  }
	  if (!wrtc.RTCPeerConnection) return null
	  return wrtc
	}


/***/ },
/* 45 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, Buffer, process) {'use strict'

	function oldBrowser () {
	  throw new Error('secure random number generation not supported by this browser\nuse chrome, FireFox or Internet Explorer 11')
	}

	var crypto = global.crypto || global.msCrypto

	if (crypto && crypto.getRandomValues) {
	  module.exports = randomBytes
	} else {
	  module.exports = oldBrowser
	}

	function randomBytes (size, cb) {
	  // phantomjs needs to throw
	  if (size > 65536) throw new Error('requested too many random bytes')
	  // in case browserify  isn't using the Uint8Array version
	  var rawBytes = new global.Uint8Array(size)

	  // This will not work in older browsers.
	  // See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
	  if (size > 0) {  // getRandomValues fails on IE if size == 0
	    crypto.getRandomValues(rawBytes)
	  }
	  // phantomjs doesn't like a buffer being passed here
	  var bytes = new Buffer(rawBytes.buffer)

	  if (typeof cb === 'function') {
	    return process.nextTick(function () {
	      cb(null, bytes)
	    })
	  }

	  return bytes
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(37).Buffer, __webpack_require__(12)))

/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {var Stream = (function (){
	  try {
	    return __webpack_require__(48); // hack to fix a circular dependency issue when used with browserify
	  } catch(_){}
	}());
	exports = module.exports = __webpack_require__(66);
	exports.Stream = Stream || exports;
	exports.Readable = exports;
	exports.Writable = __webpack_require__(74);
	exports.Duplex = __webpack_require__(73);
	exports.Transform = __webpack_require__(78);
	exports.PassThrough = __webpack_require__(79);

	if (!process.browser && process.env.READABLE_STREAM === 'disable' && Stream) {
	  module.exports = Stream;
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Stream;

	var EE = __webpack_require__(49).EventEmitter;
	var inherits = __webpack_require__(50);

	inherits(Stream, EE);
	Stream.Readable = __webpack_require__(51);
	Stream.Writable = __webpack_require__(62);
	Stream.Duplex = __webpack_require__(63);
	Stream.Transform = __webpack_require__(64);
	Stream.PassThrough = __webpack_require__(65);

	// Backwards-compat with node 0.4.x
	Stream.Stream = Stream;



	// old-style streams.  Note that the pipe method (the only relevant
	// part of this class) is overridden in the Readable class.

	function Stream() {
	  EE.call(this);
	}

	Stream.prototype.pipe = function(dest, options) {
	  var source = this;

	  function ondata(chunk) {
	    if (dest.writable) {
	      if (false === dest.write(chunk) && source.pause) {
	        source.pause();
	      }
	    }
	  }

	  source.on('data', ondata);

	  function ondrain() {
	    if (source.readable && source.resume) {
	      source.resume();
	    }
	  }

	  dest.on('drain', ondrain);

	  // If the 'end' option is not supplied, dest.end() will be called when
	  // source gets the 'end' or 'close' events.  Only dest.end() once.
	  if (!dest._isStdio && (!options || options.end !== false)) {
	    source.on('end', onend);
	    source.on('close', onclose);
	  }

	  var didOnEnd = false;
	  function onend() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    dest.end();
	  }


	  function onclose() {
	    if (didOnEnd) return;
	    didOnEnd = true;

	    if (typeof dest.destroy === 'function') dest.destroy();
	  }

	  // don't leave dangling pipes when there are errors.
	  function onerror(er) {
	    cleanup();
	    if (EE.listenerCount(this, 'error') === 0) {
	      throw er; // Unhandled stream error in pipe.
	    }
	  }

	  source.on('error', onerror);
	  dest.on('error', onerror);

	  // remove all the event listeners that were added.
	  function cleanup() {
	    source.removeListener('data', ondata);
	    dest.removeListener('drain', ondrain);

	    source.removeListener('end', onend);
	    source.removeListener('close', onclose);

	    source.removeListener('error', onerror);
	    dest.removeListener('error', onerror);

	    source.removeListener('end', cleanup);
	    source.removeListener('close', cleanup);

	    dest.removeListener('close', cleanup);
	  }

	  source.on('end', cleanup);
	  source.on('close', cleanup);

	  dest.on('close', cleanup);

	  dest.emit('pipe', source);

	  // Allow for unix-like usage: A.pipe(B).pipe(C)
	  return dest;
	};


/***/ },
/* 49 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      } else {
	        // At least give some kind of context to the user
	        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
	        err.context = er;
	        throw err;
	      }
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 50 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {exports = module.exports = __webpack_require__(52);
	exports.Stream = __webpack_require__(48);
	exports.Readable = exports;
	exports.Writable = __webpack_require__(58);
	exports.Duplex = __webpack_require__(57);
	exports.Transform = __webpack_require__(60);
	exports.PassThrough = __webpack_require__(61);
	if (!process.browser && process.env.READABLE_STREAM === 'disable') {
	  module.exports = __webpack_require__(48);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 52 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	module.exports = Readable;

	/*<replacement>*/
	var isArray = __webpack_require__(53);
	/*</replacement>*/


	/*<replacement>*/
	var Buffer = __webpack_require__(37).Buffer;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	var EE = __webpack_require__(49).EventEmitter;

	/*<replacement>*/
	if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	var Stream = __webpack_require__(48);

	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(55);
	/*</replacement>*/

	var StringDecoder;


	/*<replacement>*/
	var debug = __webpack_require__(56);
	if (debug && debug.debuglog) {
	  debug = debug.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/


	util.inherits(Readable, Stream);

	function ReadableState(options, stream) {
	  var Duplex = __webpack_require__(57);

	  options = options || {};

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.buffer = [];
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;


	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder)
	      StringDecoder = __webpack_require__(59).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  var Duplex = __webpack_require__(57);

	  if (!(this instanceof Readable))
	    return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function(chunk, encoding) {
	  var state = this._readableState;

	  if (util.isString(chunk) && !state.objectMode) {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = new Buffer(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function(chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (util.isNullOrUndefined(chunk)) {
	    state.reading = false;
	    if (!state.ended)
	      onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var e = new Error('stream.unshift() after end event');
	      stream.emit('error', e);
	    } else {
	      if (state.decoder && !addToFront && !encoding)
	        chunk = state.decoder.write(chunk);

	      if (!addToFront)
	        state.reading = false;

	      // if we want the data now, just emit it.
	      if (state.flowing && state.length === 0 && !state.sync) {
	        stream.emit('data', chunk);
	        stream.read(0);
	      } else {
	        // update the buffer info.
	        state.length += state.objectMode ? 1 : chunk.length;
	        if (addToFront)
	          state.buffer.unshift(chunk);
	        else
	          state.buffer.push(chunk);

	        if (state.needReadable)
	          emitReadable(stream);
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}



	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended &&
	         (state.needReadable ||
	          state.length < state.highWaterMark ||
	          state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function(enc) {
	  if (!StringDecoder)
	    StringDecoder = __webpack_require__(59).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 128MB
	var MAX_HWM = 0x800000;
	function roundUpToNextPowerOf2(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2
	    n--;
	    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
	    n++;
	  }
	  return n;
	}

	function howMuchToRead(n, state) {
	  if (state.length === 0 && state.ended)
	    return 0;

	  if (state.objectMode)
	    return n === 0 ? 0 : 1;

	  if (isNaN(n) || util.isNull(n)) {
	    // only flow one buffer at a time
	    if (state.flowing && state.buffer.length)
	      return state.buffer[0].length;
	    else
	      return state.length;
	  }

	  if (n <= 0)
	    return 0;

	  // If we're asking for more than the target buffer level,
	  // then raise the water mark.  Bump up to the next highest
	  // power of 2, to prevent increasing it excessively in tiny
	  // amounts.
	  if (n > state.highWaterMark)
	    state.highWaterMark = roundUpToNextPowerOf2(n);

	  // don't have that much.  return null, unless we've ended.
	  if (n > state.length) {
	    if (!state.ended) {
	      state.needReadable = true;
	      return 0;
	    } else
	      return state.length;
	  }

	  return n;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function(n) {
	  debug('read', n);
	  var state = this._readableState;
	  var nOrig = n;

	  if (!util.isNumber(n) || n > 0)
	    state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 &&
	      state.needReadable &&
	      (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended)
	      endReadable(this);
	    else
	      emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0)
	      endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  }

	  if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0)
	      state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	  }

	  // If _read pushed data synchronously, then `reading` will be false,
	  // and we need to re-evaluate how much data we can return to the user.
	  if (doRead && !state.reading)
	    n = howMuchToRead(nOrig, state);

	  var ret;
	  if (n > 0)
	    ret = fromList(n, state);
	  else
	    ret = null;

	  if (util.isNull(ret)) {
	    state.needReadable = true;
	    n = 0;
	  }

	  state.length -= n;

	  // If we have nothing in the buffer, then we want to know
	  // as soon as we *do* get something into the buffer.
	  if (state.length === 0 && !state.ended)
	    state.needReadable = true;

	  // If we tried to read() past the EOF, then emit end on the next tick.
	  if (nOrig !== n && state.ended && state.length === 0)
	    endReadable(this);

	  if (!util.isNull(ret))
	    this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}


	function onEofChunk(stream, state) {
	  if (state.decoder && !state.ended) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync)
	      process.nextTick(function() {
	        emitReadable_(stream);
	      });
	    else
	      emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}


	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    process.nextTick(function() {
	      maybeReadMore_(stream, state);
	    });
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended &&
	         state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;
	    else
	      len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function(n) {
	  this.emit('error', new Error('not implemented'));
	};

	Readable.prototype.pipe = function(dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
	              dest !== process.stdout &&
	              dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted)
	    process.nextTick(endFn);
	  else
	    src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain &&
	        (!dest._writableState || dest._writableState.needDrain))
	      ondrain();
	  }

	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    var ret = dest.write(chunk);
	    if (false === ret) {
	      debug('false write response, pause',
	            src._readableState.awaitDrain);
	      src._readableState.awaitDrain++;
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EE.listenerCount(dest, 'error') === 0)
	      dest.emit('error', er);
	  }
	  // This is a brutally ugly hack to make sure that our error handler
	  // is attached before any userland ones.  NEVER DO THIS.
	  if (!dest._events || !dest._events.error)
	    dest.on('error', onerror);
	  else if (isArray(dest._events.error))
	    dest._events.error.unshift(onerror);
	  else
	    dest._events.error = [onerror, dest._events.error];



	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function() {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain)
	      state.awaitDrain--;
	    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}


	Readable.prototype.unpipe = function(dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0)
	    return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes)
	      return this;

	    if (!dest)
	      dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest)
	      dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++)
	      dests[i].emit('unpipe', this);
	    return this;
	  }

	  // try to find the right one.
	  var i = indexOf(state.pipes, dest);
	  if (i === -1)
	    return this;

	  state.pipes.splice(i, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1)
	    state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function(ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  // If listening to data, and it has not explicitly been paused,
	  // then call resume to start the flow of data on the next tick.
	  if (ev === 'data' && false !== this._readableState.flowing) {
	    this.resume();
	  }

	  if (ev === 'readable' && this.readable) {
	    var state = this._readableState;
	    if (!state.readableListening) {
	      state.readableListening = true;
	      state.emittedReadable = false;
	      state.needReadable = true;
	      if (!state.reading) {
	        var self = this;
	        process.nextTick(function() {
	          debug('readable nexttick read 0');
	          self.read(0);
	        });
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function() {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    if (!state.reading) {
	      debug('resume read 0');
	      this.read(0);
	    }
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    process.nextTick(function() {
	      resume_(stream, state);
	    });
	  }
	}

	function resume_(stream, state) {
	  state.resumeScheduled = false;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading)
	    stream.read(0);
	}

	Readable.prototype.pause = function() {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  if (state.flowing) {
	    do {
	      var chunk = stream.read();
	    } while (null !== chunk && state.flowing);
	  }
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function(stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function() {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length)
	        self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function(chunk) {
	    debug('wrapped data');
	    if (state.decoder)
	      chunk = state.decoder.write(chunk);
	    if (!chunk || !state.objectMode && !chunk.length)
	      return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
	      this[i] = function(method) { return function() {
	        return stream[method].apply(stream, arguments);
	      }}(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function(ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function(n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};



	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	function fromList(n, state) {
	  var list = state.buffer;
	  var length = state.length;
	  var stringMode = !!state.decoder;
	  var objectMode = !!state.objectMode;
	  var ret;

	  // nothing in the list, definitely empty.
	  if (list.length === 0)
	    return null;

	  if (length === 0)
	    ret = null;
	  else if (objectMode)
	    ret = list.shift();
	  else if (!n || n >= length) {
	    // read it all, truncate the array.
	    if (stringMode)
	      ret = list.join('');
	    else
	      ret = Buffer.concat(list, length);
	    list.length = 0;
	  } else {
	    // read just some of it.
	    if (n < list[0].length) {
	      // just take a part of the first list item.
	      // slice is the same for buffers and strings.
	      var buf = list[0];
	      ret = buf.slice(0, n);
	      list[0] = buf.slice(n);
	    } else if (n === list[0].length) {
	      // first list is a perfect match
	      ret = list.shift();
	    } else {
	      // complex case.
	      // we have enough to cover it, but it spans past the first buffer.
	      if (stringMode)
	        ret = '';
	      else
	        ret = new Buffer(n);

	      var c = 0;
	      for (var i = 0, l = list.length; i < l && c < n; i++) {
	        var buf = list[0];
	        var cpy = Math.min(n - c, buf.length);

	        if (stringMode)
	          ret += buf.slice(0, cpy);
	        else
	          buf.copy(ret, c, 0, cpy);

	        if (cpy < buf.length)
	          list[0] = buf.slice(cpy);
	        else
	          list.shift();

	        c += cpy;
	      }
	    }
	  }

	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0)
	    throw new Error('endReadable called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    process.nextTick(function() {
	      // Check that we didn't get one last unshift.
	      if (!state.endEmitted && state.length === 0) {
	        state.endEmitted = true;
	        stream.readable = false;
	        stream.emit('end');
	      }
	    });
	  }
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf (xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 53 */
/***/ function(module, exports) {

	module.exports = Array.isArray || function (arr) {
	  return Object.prototype.toString.call(arr) == '[object Array]';
	};


/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.

	function isArray(arg) {
	  if (Array.isArray) {
	    return Array.isArray(arg);
	  }
	  return objectToString(arg) === '[object Array]';
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = Buffer.isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(37).Buffer))

/***/ },
/* 55 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 56 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	module.exports = Duplex;

	/*<replacement>*/
	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) keys.push(key);
	  return keys;
	}
	/*</replacement>*/


	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(55);
	/*</replacement>*/

	var Readable = __webpack_require__(52);
	var Writable = __webpack_require__(58);

	util.inherits(Duplex, Readable);

	forEach(objectKeys(Writable.prototype), function(method) {
	  if (!Duplex.prototype[method])
	    Duplex.prototype[method] = Writable.prototype[method];
	});

	function Duplex(options) {
	  if (!(this instanceof Duplex))
	    return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false)
	    this.readable = false;

	  if (options && options.writable === false)
	    this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false)
	    this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended)
	    return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  process.nextTick(this.end.bind(this));
	}

	function forEach (xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// A bit simpler than readable streams.
	// Implement an async ._write(chunk, cb), and it'll handle all
	// the drain event emission and buffering.

	module.exports = Writable;

	/*<replacement>*/
	var Buffer = __webpack_require__(37).Buffer;
	/*</replacement>*/

	Writable.WritableState = WritableState;


	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(55);
	/*</replacement>*/

	var Stream = __webpack_require__(48);

	util.inherits(Writable, Stream);

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	}

	function WritableState(options, stream) {
	  var Duplex = __webpack_require__(57);

	  options = options || {};

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex)
	    this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function(er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.buffer = [];

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;
	}

	function Writable(options) {
	  var Duplex = __webpack_require__(57);

	  // Writable ctor is applied to Duplexes, though they're not
	  // instanceof Writable, they're instanceof Readable.
	  if (!(this instanceof Writable) && !(this instanceof Duplex))
	    return new Writable(options);

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function() {
	  this.emit('error', new Error('Cannot pipe. Not readable.'));
	};


	function writeAfterEnd(stream, state, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  process.nextTick(function() {
	    cb(er);
	  });
	}

	// If we get something that is not a buffer, string, null, or undefined,
	// and we're not in objectMode, then that's an error.
	// Otherwise stream chunks are all considered to be of length=1, and the
	// watermarks determine how many objects to keep in the buffer, rather than
	// how many bytes or characters.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  if (!util.isBuffer(chunk) &&
	      !util.isString(chunk) &&
	      !util.isNullOrUndefined(chunk) &&
	      !state.objectMode) {
	    var er = new TypeError('Invalid non-string/buffer chunk');
	    stream.emit('error', er);
	    process.nextTick(function() {
	      cb(er);
	    });
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function(chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;

	  if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  else if (!encoding)
	    encoding = state.defaultEncoding;

	  if (!util.isFunction(cb))
	    cb = function() {};

	  if (state.ended)
	    writeAfterEnd(this, state, cb);
	  else if (validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function() {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function() {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing &&
	        !state.corked &&
	        !state.finished &&
	        !state.bufferProcessing &&
	        state.buffer.length)
	      clearBuffer(this, state);
	  }
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode &&
	      state.decodeStrings !== false &&
	      util.isString(chunk)) {
	    chunk = new Buffer(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, chunk, encoding, cb) {
	  chunk = decodeChunk(state, chunk, encoding);
	  if (util.isBuffer(chunk))
	    encoding = 'buffer';
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret)
	    state.needDrain = true;

	  if (state.writing || state.corked)
	    state.buffer.push(new WriteReq(chunk, encoding, cb));
	  else
	    doWrite(stream, state, false, len, chunk, encoding, cb);

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev)
	    stream._writev(chunk, state.onwrite);
	  else
	    stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  if (sync)
	    process.nextTick(function() {
	      state.pendingcb--;
	      cb(er);
	    });
	  else {
	    state.pendingcb--;
	    cb(er);
	  }

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er)
	    onwriteError(stream, state, sync, er, cb);
	  else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(stream, state);

	    if (!finished &&
	        !state.corked &&
	        !state.bufferProcessing &&
	        state.buffer.length) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      process.nextTick(function() {
	        afterWrite(stream, state, finished, cb);
	      });
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished)
	    onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}


	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;

	  if (stream._writev && state.buffer.length > 1) {
	    // Fast case, write everything using _writev()
	    var cbs = [];
	    for (var c = 0; c < state.buffer.length; c++)
	      cbs.push(state.buffer[c].callback);

	    // count the one we are adding, as well.
	    // TODO(isaacs) clean this up
	    state.pendingcb++;
	    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
	      for (var i = 0; i < cbs.length; i++) {
	        state.pendingcb--;
	        cbs[i](err);
	      }
	    });

	    // Clear buffer
	    state.buffer = [];
	  } else {
	    // Slow case, write chunks one-by-one
	    for (var c = 0; c < state.buffer.length; c++) {
	      var entry = state.buffer[c];
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);

	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        c++;
	        break;
	      }
	    }

	    if (c < state.buffer.length)
	      state.buffer = state.buffer.slice(c);
	    else
	      state.buffer.length = 0;
	  }

	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function(chunk, encoding, cb) {
	  cb(new Error('not implemented'));

	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function(chunk, encoding, cb) {
	  var state = this._writableState;

	  if (util.isFunction(chunk)) {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (util.isFunction(encoding)) {
	    cb = encoding;
	    encoding = null;
	  }

	  if (!util.isNullOrUndefined(chunk))
	    this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished)
	    endWritable(this, state, cb);
	};


	function needFinish(stream, state) {
	  return (state.ending &&
	          state.length === 0 &&
	          !state.finished &&
	          !state.writing);
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(stream, state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else
	      prefinish(stream, state);
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished)
	      process.nextTick(cb);
	    else
	      stream.once('finish', cb);
	  }
	  state.ended = true;
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(37).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.


	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	module.exports = Transform;

	var Duplex = __webpack_require__(57);

	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(55);
	/*</replacement>*/

	util.inherits(Transform, Duplex);


	function TransformState(options, stream) {
	  this.afterTransform = function(er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb)
	    return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (!util.isNullOrUndefined(data))
	    stream.push(data);

	  if (cb)
	    cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}


	function Transform(options) {
	  if (!(this instanceof Transform))
	    return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(options, this);

	  // when the writable side finishes, then flush out anything remaining.
	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  this.once('prefinish', function() {
	    if (util.isFunction(this._flush))
	      this._flush(function(er) {
	        done(stream, er);
	      });
	    else
	      done(stream);
	  });
	}

	Transform.prototype.push = function(chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function(chunk, encoding, cb) {
	  throw new Error('not implemented');
	};

	Transform.prototype._write = function(chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform ||
	        rs.needReadable ||
	        rs.length < rs.highWaterMark)
	      this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function(n) {
	  var ts = this._transformState;

	  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};


	function done(stream, er) {
	  if (er)
	    return stream.emit('error', er);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length)
	    throw new Error('calling transform done when ws.length != 0');

	  if (ts.transforming)
	    throw new Error('calling transform done when still transforming');

	  return stream.push(null);
	}


/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	module.exports = PassThrough;

	var Transform = __webpack_require__(60);

	/*<replacement>*/
	var util = __webpack_require__(54);
	util.inherits = __webpack_require__(55);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough))
	    return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function(chunk, encoding, cb) {
	  cb(null, chunk);
	};


/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(58)


/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(57)


/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(60)


/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(61)


/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = Readable;

	/*<replacement>*/
	var processNextTick = __webpack_require__(67);
	/*</replacement>*/

	/*<replacement>*/
	var isArray = __webpack_require__(68);
	/*</replacement>*/

	/*<replacement>*/
	var Duplex;
	/*</replacement>*/

	Readable.ReadableState = ReadableState;

	/*<replacement>*/
	var EE = __webpack_require__(49).EventEmitter;

	var EElistenerCount = function (emitter, type) {
	  return emitter.listeners(type).length;
	};
	/*</replacement>*/

	/*<replacement>*/
	var Stream;
	(function () {
	  try {
	    Stream = __webpack_require__(48);
	  } catch (_) {} finally {
	    if (!Stream) Stream = __webpack_require__(49).EventEmitter;
	  }
	})();
	/*</replacement>*/

	var Buffer = __webpack_require__(37).Buffer;
	/*<replacement>*/
	var bufferShim = __webpack_require__(69);
	/*</replacement>*/

	/*<replacement>*/
	var util = __webpack_require__(70);
	util.inherits = __webpack_require__(45);
	/*</replacement>*/

	/*<replacement>*/
	var debugUtil = __webpack_require__(71);
	var debug = void 0;
	if (debugUtil && debugUtil.debuglog) {
	  debug = debugUtil.debuglog('stream');
	} else {
	  debug = function () {};
	}
	/*</replacement>*/

	var BufferList = __webpack_require__(72);
	var StringDecoder;

	util.inherits(Readable, Stream);

	function prependListener(emitter, event, fn) {
	  // Sadly this is not cacheable as some libraries bundle their own
	  // event emitter implementation with them.
	  if (typeof emitter.prependListener === 'function') {
	    return emitter.prependListener(event, fn);
	  } else {
	    // This is a hack to make sure that our error handler is attached before any
	    // userland ones.  NEVER DO THIS. This is here only because this code needs
	    // to continue to work with older versions of Node.js that do not include
	    // the prependListener() method. The goal is to eventually remove this hack.
	    if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
	  }
	}

	function ReadableState(options, stream) {
	  Duplex = Duplex || __webpack_require__(73);

	  options = options || {};

	  // object stream flag. Used to make read(n) ignore n and to
	  // make all the buffer merging and length checks go away
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

	  // the point at which it stops calling _read() to fill the buffer
	  // Note: 0 is a valid value, means "don't call _read preemptively ever"
	  var hwm = options.highWaterMark;
	  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  // A linked list is used to store data chunks instead of an array because the
	  // linked list can remove elements from the beginning faster than
	  // array.shift()
	  this.buffer = new BufferList();
	  this.length = 0;
	  this.pipes = null;
	  this.pipesCount = 0;
	  this.flowing = null;
	  this.ended = false;
	  this.endEmitted = false;
	  this.reading = false;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // whenever we return null, then we set a flag to say
	  // that we're awaiting a 'readable' event emission.
	  this.needReadable = false;
	  this.emittedReadable = false;
	  this.readableListening = false;
	  this.resumeScheduled = false;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // when piping, we only care about 'readable' events that happen
	  // after read()ing all the bytes and not getting any pushback.
	  this.ranOut = false;

	  // the number of writers that are awaiting a drain event in .pipe()s
	  this.awaitDrain = 0;

	  // if true, a maybeReadMore has been scheduled
	  this.readingMore = false;

	  this.decoder = null;
	  this.encoding = null;
	  if (options.encoding) {
	    if (!StringDecoder) StringDecoder = __webpack_require__(77).StringDecoder;
	    this.decoder = new StringDecoder(options.encoding);
	    this.encoding = options.encoding;
	  }
	}

	function Readable(options) {
	  Duplex = Duplex || __webpack_require__(73);

	  if (!(this instanceof Readable)) return new Readable(options);

	  this._readableState = new ReadableState(options, this);

	  // legacy
	  this.readable = true;

	  if (options && typeof options.read === 'function') this._read = options.read;

	  Stream.call(this);
	}

	// Manually shove something into the read() buffer.
	// This returns true if the highWaterMark has not been hit yet,
	// similar to how Writable.write() returns true if you should
	// write() some more.
	Readable.prototype.push = function (chunk, encoding) {
	  var state = this._readableState;

	  if (!state.objectMode && typeof chunk === 'string') {
	    encoding = encoding || state.defaultEncoding;
	    if (encoding !== state.encoding) {
	      chunk = bufferShim.from(chunk, encoding);
	      encoding = '';
	    }
	  }

	  return readableAddChunk(this, state, chunk, encoding, false);
	};

	// Unshift should *always* be something directly out of read()
	Readable.prototype.unshift = function (chunk) {
	  var state = this._readableState;
	  return readableAddChunk(this, state, chunk, '', true);
	};

	Readable.prototype.isPaused = function () {
	  return this._readableState.flowing === false;
	};

	function readableAddChunk(stream, state, chunk, encoding, addToFront) {
	  var er = chunkInvalid(state, chunk);
	  if (er) {
	    stream.emit('error', er);
	  } else if (chunk === null) {
	    state.reading = false;
	    onEofChunk(stream, state);
	  } else if (state.objectMode || chunk && chunk.length > 0) {
	    if (state.ended && !addToFront) {
	      var e = new Error('stream.push() after EOF');
	      stream.emit('error', e);
	    } else if (state.endEmitted && addToFront) {
	      var _e = new Error('stream.unshift() after end event');
	      stream.emit('error', _e);
	    } else {
	      var skipAdd;
	      if (state.decoder && !addToFront && !encoding) {
	        chunk = state.decoder.write(chunk);
	        skipAdd = !state.objectMode && chunk.length === 0;
	      }

	      if (!addToFront) state.reading = false;

	      // Don't add to the buffer if we've decoded to an empty string chunk and
	      // we're not in object mode
	      if (!skipAdd) {
	        // if we want the data now, just emit it.
	        if (state.flowing && state.length === 0 && !state.sync) {
	          stream.emit('data', chunk);
	          stream.read(0);
	        } else {
	          // update the buffer info.
	          state.length += state.objectMode ? 1 : chunk.length;
	          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

	          if (state.needReadable) emitReadable(stream);
	        }
	      }

	      maybeReadMore(stream, state);
	    }
	  } else if (!addToFront) {
	    state.reading = false;
	  }

	  return needMoreData(state);
	}

	// if it's past the high water mark, we can push in some more.
	// Also, if we have no data yet, we can stand some
	// more bytes.  This is to work around cases where hwm=0,
	// such as the repl.  Also, if the push() triggered a
	// readable event, and the user called read(largeNumber) such that
	// needReadable was set, then we ought to push more, so that another
	// 'readable' event will be triggered.
	function needMoreData(state) {
	  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
	}

	// backwards compatibility.
	Readable.prototype.setEncoding = function (enc) {
	  if (!StringDecoder) StringDecoder = __webpack_require__(77).StringDecoder;
	  this._readableState.decoder = new StringDecoder(enc);
	  this._readableState.encoding = enc;
	  return this;
	};

	// Don't raise the hwm > 8MB
	var MAX_HWM = 0x800000;
	function computeNewHighWaterMark(n) {
	  if (n >= MAX_HWM) {
	    n = MAX_HWM;
	  } else {
	    // Get the next highest power of 2 to prevent increasing hwm excessively in
	    // tiny amounts
	    n--;
	    n |= n >>> 1;
	    n |= n >>> 2;
	    n |= n >>> 4;
	    n |= n >>> 8;
	    n |= n >>> 16;
	    n++;
	  }
	  return n;
	}

	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function howMuchToRead(n, state) {
	  if (n <= 0 || state.length === 0 && state.ended) return 0;
	  if (state.objectMode) return 1;
	  if (n !== n) {
	    // Only flow one buffer at a time
	    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
	  }
	  // If we're asking for more than the current hwm, then raise the hwm.
	  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
	  if (n <= state.length) return n;
	  // Don't have enough
	  if (!state.ended) {
	    state.needReadable = true;
	    return 0;
	  }
	  return state.length;
	}

	// you can override either this method, or the async _read(n) below.
	Readable.prototype.read = function (n) {
	  debug('read', n);
	  n = parseInt(n, 10);
	  var state = this._readableState;
	  var nOrig = n;

	  if (n !== 0) state.emittedReadable = false;

	  // if we're doing read(0) to trigger a readable event, but we
	  // already have a bunch of data in the buffer, then just trigger
	  // the 'readable' event and move on.
	  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
	    debug('read: emitReadable', state.length, state.ended);
	    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
	    return null;
	  }

	  n = howMuchToRead(n, state);

	  // if we've ended, and we're now clear, then finish it up.
	  if (n === 0 && state.ended) {
	    if (state.length === 0) endReadable(this);
	    return null;
	  }

	  // All the actual chunk generation logic needs to be
	  // *below* the call to _read.  The reason is that in certain
	  // synthetic stream cases, such as passthrough streams, _read
	  // may be a completely synchronous operation which may change
	  // the state of the read buffer, providing enough data when
	  // before there was *not* enough.
	  //
	  // So, the steps are:
	  // 1. Figure out what the state of things will be after we do
	  // a read from the buffer.
	  //
	  // 2. If that resulting state will trigger a _read, then call _read.
	  // Note that this may be asynchronous, or synchronous.  Yes, it is
	  // deeply ugly to write APIs this way, but that still doesn't mean
	  // that the Readable class should behave improperly, as streams are
	  // designed to be sync/async agnostic.
	  // Take note if the _read call is sync or async (ie, if the read call
	  // has returned yet), so that we know whether or not it's safe to emit
	  // 'readable' etc.
	  //
	  // 3. Actually pull the requested chunks out of the buffer and return.

	  // if we need a readable event, then we need to do some reading.
	  var doRead = state.needReadable;
	  debug('need readable', doRead);

	  // if we currently have less than the highWaterMark, then also read some
	  if (state.length === 0 || state.length - n < state.highWaterMark) {
	    doRead = true;
	    debug('length less than watermark', doRead);
	  }

	  // however, if we've ended, then there's no point, and if we're already
	  // reading, then it's unnecessary.
	  if (state.ended || state.reading) {
	    doRead = false;
	    debug('reading or ended', doRead);
	  } else if (doRead) {
	    debug('do read');
	    state.reading = true;
	    state.sync = true;
	    // if the length is currently zero, then we *need* a readable event.
	    if (state.length === 0) state.needReadable = true;
	    // call internal read method
	    this._read(state.highWaterMark);
	    state.sync = false;
	    // If _read pushed data synchronously, then `reading` will be false,
	    // and we need to re-evaluate how much data we can return to the user.
	    if (!state.reading) n = howMuchToRead(nOrig, state);
	  }

	  var ret;
	  if (n > 0) ret = fromList(n, state);else ret = null;

	  if (ret === null) {
	    state.needReadable = true;
	    n = 0;
	  } else {
	    state.length -= n;
	  }

	  if (state.length === 0) {
	    // If we have nothing in the buffer, then we want to know
	    // as soon as we *do* get something into the buffer.
	    if (!state.ended) state.needReadable = true;

	    // If we tried to read() past the EOF, then emit end on the next tick.
	    if (nOrig !== n && state.ended) endReadable(this);
	  }

	  if (ret !== null) this.emit('data', ret);

	  return ret;
	};

	function chunkInvalid(state, chunk) {
	  var er = null;
	  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  return er;
	}

	function onEofChunk(stream, state) {
	  if (state.ended) return;
	  if (state.decoder) {
	    var chunk = state.decoder.end();
	    if (chunk && chunk.length) {
	      state.buffer.push(chunk);
	      state.length += state.objectMode ? 1 : chunk.length;
	    }
	  }
	  state.ended = true;

	  // emit 'readable' now to make sure it gets picked up.
	  emitReadable(stream);
	}

	// Don't emit readable right away in sync mode, because this can trigger
	// another read() call => stack overflow.  This way, it might trigger
	// a nextTick recursion warning, but that's not so bad.
	function emitReadable(stream) {
	  var state = stream._readableState;
	  state.needReadable = false;
	  if (!state.emittedReadable) {
	    debug('emitReadable', state.flowing);
	    state.emittedReadable = true;
	    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
	  }
	}

	function emitReadable_(stream) {
	  debug('emit readable');
	  stream.emit('readable');
	  flow(stream);
	}

	// at this point, the user has presumably seen the 'readable' event,
	// and called read() to consume some data.  that may have triggered
	// in turn another _read(n) call, in which case reading = true if
	// it's in progress.
	// However, if we're not ended, or reading, and the length < hwm,
	// then go ahead and try to read some more preemptively.
	function maybeReadMore(stream, state) {
	  if (!state.readingMore) {
	    state.readingMore = true;
	    processNextTick(maybeReadMore_, stream, state);
	  }
	}

	function maybeReadMore_(stream, state) {
	  var len = state.length;
	  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
	    debug('maybeReadMore read 0');
	    stream.read(0);
	    if (len === state.length)
	      // didn't get any data, stop spinning.
	      break;else len = state.length;
	  }
	  state.readingMore = false;
	}

	// abstract method.  to be overridden in specific implementation classes.
	// call cb(er, data) where data is <= n in length.
	// for virtual (non-string, non-buffer) streams, "length" is somewhat
	// arbitrary, and perhaps not very meaningful.
	Readable.prototype._read = function (n) {
	  this.emit('error', new Error('_read() is not implemented'));
	};

	Readable.prototype.pipe = function (dest, pipeOpts) {
	  var src = this;
	  var state = this._readableState;

	  switch (state.pipesCount) {
	    case 0:
	      state.pipes = dest;
	      break;
	    case 1:
	      state.pipes = [state.pipes, dest];
	      break;
	    default:
	      state.pipes.push(dest);
	      break;
	  }
	  state.pipesCount += 1;
	  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

	  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

	  var endFn = doEnd ? onend : cleanup;
	  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

	  dest.on('unpipe', onunpipe);
	  function onunpipe(readable) {
	    debug('onunpipe');
	    if (readable === src) {
	      cleanup();
	    }
	  }

	  function onend() {
	    debug('onend');
	    dest.end();
	  }

	  // when the dest drains, it reduces the awaitDrain counter
	  // on the source.  This would be more elegant with a .once()
	  // handler in flow(), but adding and removing repeatedly is
	  // too slow.
	  var ondrain = pipeOnDrain(src);
	  dest.on('drain', ondrain);

	  var cleanedUp = false;
	  function cleanup() {
	    debug('cleanup');
	    // cleanup event handlers once the pipe is broken
	    dest.removeListener('close', onclose);
	    dest.removeListener('finish', onfinish);
	    dest.removeListener('drain', ondrain);
	    dest.removeListener('error', onerror);
	    dest.removeListener('unpipe', onunpipe);
	    src.removeListener('end', onend);
	    src.removeListener('end', cleanup);
	    src.removeListener('data', ondata);

	    cleanedUp = true;

	    // if the reader is waiting for a drain event from this
	    // specific writer, then it would cause it to never start
	    // flowing again.
	    // So, if this is awaiting a drain, then we just call it now.
	    // If we don't know, then assume that we are waiting for one.
	    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
	  }

	  // If the user pushes more data while we're writing to dest then we'll end up
	  // in ondata again. However, we only want to increase awaitDrain once because
	  // dest will only emit one 'drain' event for the multiple writes.
	  // => Introduce a guard on increasing awaitDrain.
	  var increasedAwaitDrain = false;
	  src.on('data', ondata);
	  function ondata(chunk) {
	    debug('ondata');
	    increasedAwaitDrain = false;
	    var ret = dest.write(chunk);
	    if (false === ret && !increasedAwaitDrain) {
	      // If the user unpiped during `dest.write()`, it is possible
	      // to get stuck in a permanently paused state if that write
	      // also returned false.
	      // => Check whether `dest` is still a piping destination.
	      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
	        debug('false write response, pause', src._readableState.awaitDrain);
	        src._readableState.awaitDrain++;
	        increasedAwaitDrain = true;
	      }
	      src.pause();
	    }
	  }

	  // if the dest has an error, then stop piping into it.
	  // however, don't suppress the throwing behavior for this.
	  function onerror(er) {
	    debug('onerror', er);
	    unpipe();
	    dest.removeListener('error', onerror);
	    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
	  }

	  // Make sure our error handler is attached before userland ones.
	  prependListener(dest, 'error', onerror);

	  // Both close and finish should trigger unpipe, but only once.
	  function onclose() {
	    dest.removeListener('finish', onfinish);
	    unpipe();
	  }
	  dest.once('close', onclose);
	  function onfinish() {
	    debug('onfinish');
	    dest.removeListener('close', onclose);
	    unpipe();
	  }
	  dest.once('finish', onfinish);

	  function unpipe() {
	    debug('unpipe');
	    src.unpipe(dest);
	  }

	  // tell the dest that it's being piped to
	  dest.emit('pipe', src);

	  // start the flow if it hasn't been started already.
	  if (!state.flowing) {
	    debug('pipe resume');
	    src.resume();
	  }

	  return dest;
	};

	function pipeOnDrain(src) {
	  return function () {
	    var state = src._readableState;
	    debug('pipeOnDrain', state.awaitDrain);
	    if (state.awaitDrain) state.awaitDrain--;
	    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
	      state.flowing = true;
	      flow(src);
	    }
	  };
	}

	Readable.prototype.unpipe = function (dest) {
	  var state = this._readableState;

	  // if we're not piping anywhere, then do nothing.
	  if (state.pipesCount === 0) return this;

	  // just one destination.  most common case.
	  if (state.pipesCount === 1) {
	    // passed in one, but it's not the right one.
	    if (dest && dest !== state.pipes) return this;

	    if (!dest) dest = state.pipes;

	    // got a match.
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;
	    if (dest) dest.emit('unpipe', this);
	    return this;
	  }

	  // slow case. multiple pipe destinations.

	  if (!dest) {
	    // remove all.
	    var dests = state.pipes;
	    var len = state.pipesCount;
	    state.pipes = null;
	    state.pipesCount = 0;
	    state.flowing = false;

	    for (var i = 0; i < len; i++) {
	      dests[i].emit('unpipe', this);
	    }return this;
	  }

	  // try to find the right one.
	  var index = indexOf(state.pipes, dest);
	  if (index === -1) return this;

	  state.pipes.splice(index, 1);
	  state.pipesCount -= 1;
	  if (state.pipesCount === 1) state.pipes = state.pipes[0];

	  dest.emit('unpipe', this);

	  return this;
	};

	// set up data events if they are asked for
	// Ensure readable listeners eventually get something
	Readable.prototype.on = function (ev, fn) {
	  var res = Stream.prototype.on.call(this, ev, fn);

	  if (ev === 'data') {
	    // Start flowing on next tick if stream isn't explicitly paused
	    if (this._readableState.flowing !== false) this.resume();
	  } else if (ev === 'readable') {
	    var state = this._readableState;
	    if (!state.endEmitted && !state.readableListening) {
	      state.readableListening = state.needReadable = true;
	      state.emittedReadable = false;
	      if (!state.reading) {
	        processNextTick(nReadingNextTick, this);
	      } else if (state.length) {
	        emitReadable(this, state);
	      }
	    }
	  }

	  return res;
	};
	Readable.prototype.addListener = Readable.prototype.on;

	function nReadingNextTick(self) {
	  debug('readable nexttick read 0');
	  self.read(0);
	}

	// pause() and resume() are remnants of the legacy readable stream API
	// If the user uses them, then switch into old mode.
	Readable.prototype.resume = function () {
	  var state = this._readableState;
	  if (!state.flowing) {
	    debug('resume');
	    state.flowing = true;
	    resume(this, state);
	  }
	  return this;
	};

	function resume(stream, state) {
	  if (!state.resumeScheduled) {
	    state.resumeScheduled = true;
	    processNextTick(resume_, stream, state);
	  }
	}

	function resume_(stream, state) {
	  if (!state.reading) {
	    debug('resume read 0');
	    stream.read(0);
	  }

	  state.resumeScheduled = false;
	  state.awaitDrain = 0;
	  stream.emit('resume');
	  flow(stream);
	  if (state.flowing && !state.reading) stream.read(0);
	}

	Readable.prototype.pause = function () {
	  debug('call pause flowing=%j', this._readableState.flowing);
	  if (false !== this._readableState.flowing) {
	    debug('pause');
	    this._readableState.flowing = false;
	    this.emit('pause');
	  }
	  return this;
	};

	function flow(stream) {
	  var state = stream._readableState;
	  debug('flow', state.flowing);
	  while (state.flowing && stream.read() !== null) {}
	}

	// wrap an old-style stream as the async data source.
	// This is *not* part of the readable stream interface.
	// It is an ugly unfortunate mess of history.
	Readable.prototype.wrap = function (stream) {
	  var state = this._readableState;
	  var paused = false;

	  var self = this;
	  stream.on('end', function () {
	    debug('wrapped end');
	    if (state.decoder && !state.ended) {
	      var chunk = state.decoder.end();
	      if (chunk && chunk.length) self.push(chunk);
	    }

	    self.push(null);
	  });

	  stream.on('data', function (chunk) {
	    debug('wrapped data');
	    if (state.decoder) chunk = state.decoder.write(chunk);

	    // don't skip over falsy values in objectMode
	    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

	    var ret = self.push(chunk);
	    if (!ret) {
	      paused = true;
	      stream.pause();
	    }
	  });

	  // proxy all the other methods.
	  // important when wrapping filters and duplexes.
	  for (var i in stream) {
	    if (this[i] === undefined && typeof stream[i] === 'function') {
	      this[i] = function (method) {
	        return function () {
	          return stream[method].apply(stream, arguments);
	        };
	      }(i);
	    }
	  }

	  // proxy certain important events.
	  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
	  forEach(events, function (ev) {
	    stream.on(ev, self.emit.bind(self, ev));
	  });

	  // when we try to consume some more bytes, simply unpause the
	  // underlying stream.
	  self._read = function (n) {
	    debug('wrapped _read', n);
	    if (paused) {
	      paused = false;
	      stream.resume();
	    }
	  };

	  return self;
	};

	// exposed for testing purposes only.
	Readable._fromList = fromList;

	// Pluck off n bytes from an array of buffers.
	// Length is the combined lengths of all the buffers in the list.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function fromList(n, state) {
	  // nothing buffered
	  if (state.length === 0) return null;

	  var ret;
	  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
	    // read it all, truncate the list
	    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
	    state.buffer.clear();
	  } else {
	    // read part of list
	    ret = fromListPartial(n, state.buffer, state.decoder);
	  }

	  return ret;
	}

	// Extracts only enough buffered data to satisfy the amount requested.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function fromListPartial(n, list, hasStrings) {
	  var ret;
	  if (n < list.head.data.length) {
	    // slice is the same for buffers and strings
	    ret = list.head.data.slice(0, n);
	    list.head.data = list.head.data.slice(n);
	  } else if (n === list.head.data.length) {
	    // first chunk is a perfect match
	    ret = list.shift();
	  } else {
	    // result spans more than one buffer
	    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
	  }
	  return ret;
	}

	// Copies a specified amount of characters from the list of buffered data
	// chunks.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function copyFromBufferString(n, list) {
	  var p = list.head;
	  var c = 1;
	  var ret = p.data;
	  n -= ret.length;
	  while (p = p.next) {
	    var str = p.data;
	    var nb = n > str.length ? str.length : n;
	    if (nb === str.length) ret += str;else ret += str.slice(0, n);
	    n -= nb;
	    if (n === 0) {
	      if (nb === str.length) {
	        ++c;
	        if (p.next) list.head = p.next;else list.head = list.tail = null;
	      } else {
	        list.head = p;
	        p.data = str.slice(nb);
	      }
	      break;
	    }
	    ++c;
	  }
	  list.length -= c;
	  return ret;
	}

	// Copies a specified amount of bytes from the list of buffered data chunks.
	// This function is designed to be inlinable, so please take care when making
	// changes to the function body.
	function copyFromBuffer(n, list) {
	  var ret = bufferShim.allocUnsafe(n);
	  var p = list.head;
	  var c = 1;
	  p.data.copy(ret);
	  n -= p.data.length;
	  while (p = p.next) {
	    var buf = p.data;
	    var nb = n > buf.length ? buf.length : n;
	    buf.copy(ret, ret.length - n, 0, nb);
	    n -= nb;
	    if (n === 0) {
	      if (nb === buf.length) {
	        ++c;
	        if (p.next) list.head = p.next;else list.head = list.tail = null;
	      } else {
	        list.head = p;
	        p.data = buf.slice(nb);
	      }
	      break;
	    }
	    ++c;
	  }
	  list.length -= c;
	  return ret;
	}

	function endReadable(stream) {
	  var state = stream._readableState;

	  // If we get here before consuming all the bytes, then that is a
	  // bug in node.  Should never happen.
	  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

	  if (!state.endEmitted) {
	    state.ended = true;
	    processNextTick(endReadableNT, state, stream);
	  }
	}

	function endReadableNT(state, stream) {
	  // Check that we didn't get one last unshift.
	  if (!state.endEmitted && state.length === 0) {
	    state.endEmitted = true;
	    stream.readable = false;
	    stream.emit('end');
	  }
	}

	function forEach(xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

	function indexOf(xs, x) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    if (xs[i] === x) return i;
	  }
	  return -1;
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	if (!process.version ||
	    process.version.indexOf('v0.') === 0 ||
	    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
	  module.exports = nextTick;
	} else {
	  module.exports = process.nextTick;
	}

	function nextTick(fn, arg1, arg2, arg3) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('"callback" argument must be a function');
	  }
	  var len = arguments.length;
	  var args, i;
	  switch (len) {
	  case 0:
	  case 1:
	    return process.nextTick(fn);
	  case 2:
	    return process.nextTick(function afterTickOne() {
	      fn.call(null, arg1);
	    });
	  case 3:
	    return process.nextTick(function afterTickTwo() {
	      fn.call(null, arg1, arg2);
	    });
	  case 4:
	    return process.nextTick(function afterTickThree() {
	      fn.call(null, arg1, arg2, arg3);
	    });
	  default:
	    args = new Array(len - 1);
	    i = 0;
	    while (i < args.length) {
	      args[i++] = arguments[i];
	    }
	    return process.nextTick(function afterTick() {
	      fn.apply(null, args);
	    });
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12)))

/***/ },
/* 68 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var buffer = __webpack_require__(37);
	var Buffer = buffer.Buffer;
	var SlowBuffer = buffer.SlowBuffer;
	var MAX_LEN = buffer.kMaxLength || 2147483647;
	exports.alloc = function alloc(size, fill, encoding) {
	  if (typeof Buffer.alloc === 'function') {
	    return Buffer.alloc(size, fill, encoding);
	  }
	  if (typeof encoding === 'number') {
	    throw new TypeError('encoding must not be number');
	  }
	  if (typeof size !== 'number') {
	    throw new TypeError('size must be a number');
	  }
	  if (size > MAX_LEN) {
	    throw new RangeError('size is too large');
	  }
	  var enc = encoding;
	  var _fill = fill;
	  if (_fill === undefined) {
	    enc = undefined;
	    _fill = 0;
	  }
	  var buf = new Buffer(size);
	  if (typeof _fill === 'string') {
	    var fillBuf = new Buffer(_fill, enc);
	    var flen = fillBuf.length;
	    var i = -1;
	    while (++i < size) {
	      buf[i] = fillBuf[i % flen];
	    }
	  } else {
	    buf.fill(_fill);
	  }
	  return buf;
	}
	exports.allocUnsafe = function allocUnsafe(size) {
	  if (typeof Buffer.allocUnsafe === 'function') {
	    return Buffer.allocUnsafe(size);
	  }
	  if (typeof size !== 'number') {
	    throw new TypeError('size must be a number');
	  }
	  if (size > MAX_LEN) {
	    throw new RangeError('size is too large');
	  }
	  return new Buffer(size);
	}
	exports.from = function from(value, encodingOrOffset, length) {
	  if (typeof Buffer.from === 'function' && (!global.Uint8Array || Uint8Array.from !== Buffer.from)) {
	    return Buffer.from(value, encodingOrOffset, length);
	  }
	  if (typeof value === 'number') {
	    throw new TypeError('"value" argument must not be a number');
	  }
	  if (typeof value === 'string') {
	    return new Buffer(value, encodingOrOffset);
	  }
	  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
	    var offset = encodingOrOffset;
	    if (arguments.length === 1) {
	      return new Buffer(value);
	    }
	    if (typeof offset === 'undefined') {
	      offset = 0;
	    }
	    var len = length;
	    if (typeof len === 'undefined') {
	      len = value.byteLength - offset;
	    }
	    if (offset >= value.byteLength) {
	      throw new RangeError('\'offset\' is out of bounds');
	    }
	    if (len > value.byteLength - offset) {
	      throw new RangeError('\'length\' is out of bounds');
	    }
	    return new Buffer(value.slice(offset, offset + len));
	  }
	  if (Buffer.isBuffer(value)) {
	    var out = new Buffer(value.length);
	    value.copy(out, 0, 0, value.length);
	    return out;
	  }
	  if (value) {
	    if (Array.isArray(value) || (typeof ArrayBuffer !== 'undefined' && value.buffer instanceof ArrayBuffer) || 'length' in value) {
	      return new Buffer(value);
	    }
	    if (value.type === 'Buffer' && Array.isArray(value.data)) {
	      return new Buffer(value.data);
	    }
	  }

	  throw new TypeError('First argument must be a string, Buffer, ' + 'ArrayBuffer, Array, or array-like object.');
	}
	exports.allocUnsafeSlow = function allocUnsafeSlow(size) {
	  if (typeof Buffer.allocUnsafeSlow === 'function') {
	    return Buffer.allocUnsafeSlow(size);
	  }
	  if (typeof size !== 'number') {
	    throw new TypeError('size must be a number');
	  }
	  if (size >= MAX_LEN) {
	    throw new RangeError('size is too large');
	  }
	  return new SlowBuffer(size);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.

	function isArray(arg) {
	  if (Array.isArray) {
	    return Array.isArray(arg);
	  }
	  return objectToString(arg) === '[object Array]';
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = Buffer.isBuffer;

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(37).Buffer))

/***/ },
/* 71 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Buffer = __webpack_require__(37).Buffer;
	/*<replacement>*/
	var bufferShim = __webpack_require__(69);
	/*</replacement>*/

	module.exports = BufferList;

	function BufferList() {
	  this.head = null;
	  this.tail = null;
	  this.length = 0;
	}

	BufferList.prototype.push = function (v) {
	  var entry = { data: v, next: null };
	  if (this.length > 0) this.tail.next = entry;else this.head = entry;
	  this.tail = entry;
	  ++this.length;
	};

	BufferList.prototype.unshift = function (v) {
	  var entry = { data: v, next: this.head };
	  if (this.length === 0) this.tail = entry;
	  this.head = entry;
	  ++this.length;
	};

	BufferList.prototype.shift = function () {
	  if (this.length === 0) return;
	  var ret = this.head.data;
	  if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
	  --this.length;
	  return ret;
	};

	BufferList.prototype.clear = function () {
	  this.head = this.tail = null;
	  this.length = 0;
	};

	BufferList.prototype.join = function (s) {
	  if (this.length === 0) return '';
	  var p = this.head;
	  var ret = '' + p.data;
	  while (p = p.next) {
	    ret += s + p.data;
	  }return ret;
	};

	BufferList.prototype.concat = function (n) {
	  if (this.length === 0) return bufferShim.alloc(0);
	  if (this.length === 1) return this.head.data;
	  var ret = bufferShim.allocUnsafe(n >>> 0);
	  var p = this.head;
	  var i = 0;
	  while (p) {
	    p.data.copy(ret, i);
	    i += p.data.length;
	    p = p.next;
	  }
	  return ret;
	};

/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

	// a duplex stream is just a stream that is both readable and writable.
	// Since JS doesn't have multiple prototypal inheritance, this class
	// prototypally inherits from Readable, and then parasitically from
	// Writable.

	'use strict';

	/*<replacement>*/

	var objectKeys = Object.keys || function (obj) {
	  var keys = [];
	  for (var key in obj) {
	    keys.push(key);
	  }return keys;
	};
	/*</replacement>*/

	module.exports = Duplex;

	/*<replacement>*/
	var processNextTick = __webpack_require__(67);
	/*</replacement>*/

	/*<replacement>*/
	var util = __webpack_require__(70);
	util.inherits = __webpack_require__(45);
	/*</replacement>*/

	var Readable = __webpack_require__(66);
	var Writable = __webpack_require__(74);

	util.inherits(Duplex, Readable);

	var keys = objectKeys(Writable.prototype);
	for (var v = 0; v < keys.length; v++) {
	  var method = keys[v];
	  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
	}

	function Duplex(options) {
	  if (!(this instanceof Duplex)) return new Duplex(options);

	  Readable.call(this, options);
	  Writable.call(this, options);

	  if (options && options.readable === false) this.readable = false;

	  if (options && options.writable === false) this.writable = false;

	  this.allowHalfOpen = true;
	  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

	  this.once('end', onend);
	}

	// the no-half-open enforcer
	function onend() {
	  // if we allow half-open state, or if the writable side ended,
	  // then we're ok.
	  if (this.allowHalfOpen || this._writableState.ended) return;

	  // no more data can be written.
	  // But allow more writes to happen in this tick.
	  processNextTick(onEndNT, this);
	}

	function onEndNT(self) {
	  self.end();
	}

	function forEach(xs, f) {
	  for (var i = 0, l = xs.length; i < l; i++) {
	    f(xs[i], i);
	  }
	}

/***/ },
/* 74 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process, setImmediate) {// A bit simpler than readable streams.
	// Implement an async ._write(chunk, encoding, cb), and it'll handle all
	// the drain event emission and buffering.

	'use strict';

	module.exports = Writable;

	/*<replacement>*/
	var processNextTick = __webpack_require__(67);
	/*</replacement>*/

	/*<replacement>*/
	var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
	/*</replacement>*/

	/*<replacement>*/
	var Duplex;
	/*</replacement>*/

	Writable.WritableState = WritableState;

	/*<replacement>*/
	var util = __webpack_require__(70);
	util.inherits = __webpack_require__(45);
	/*</replacement>*/

	/*<replacement>*/
	var internalUtil = {
	  deprecate: __webpack_require__(76)
	};
	/*</replacement>*/

	/*<replacement>*/
	var Stream;
	(function () {
	  try {
	    Stream = __webpack_require__(48);
	  } catch (_) {} finally {
	    if (!Stream) Stream = __webpack_require__(49).EventEmitter;
	  }
	})();
	/*</replacement>*/

	var Buffer = __webpack_require__(37).Buffer;
	/*<replacement>*/
	var bufferShim = __webpack_require__(69);
	/*</replacement>*/

	util.inherits(Writable, Stream);

	function nop() {}

	function WriteReq(chunk, encoding, cb) {
	  this.chunk = chunk;
	  this.encoding = encoding;
	  this.callback = cb;
	  this.next = null;
	}

	function WritableState(options, stream) {
	  Duplex = Duplex || __webpack_require__(73);

	  options = options || {};

	  // object stream flag to indicate whether or not this stream
	  // contains buffers or objects.
	  this.objectMode = !!options.objectMode;

	  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

	  // the point at which write() starts returning false
	  // Note: 0 is a valid value, means that we always return false if
	  // the entire buffer is not flushed immediately on write()
	  var hwm = options.highWaterMark;
	  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
	  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

	  // cast to ints.
	  this.highWaterMark = ~~this.highWaterMark;

	  // drain event flag.
	  this.needDrain = false;
	  // at the start of calling end()
	  this.ending = false;
	  // when end() has been called, and returned
	  this.ended = false;
	  // when 'finish' is emitted
	  this.finished = false;

	  // should we decode strings into buffers before passing to _write?
	  // this is here so that some node-core streams can optimize string
	  // handling at a lower level.
	  var noDecode = options.decodeStrings === false;
	  this.decodeStrings = !noDecode;

	  // Crypto is kind of old and crusty.  Historically, its default string
	  // encoding is 'binary' so we have to make this configurable.
	  // Everything else in the universe uses 'utf8', though.
	  this.defaultEncoding = options.defaultEncoding || 'utf8';

	  // not an actual buffer we keep track of, but a measurement
	  // of how much we're waiting to get pushed to some underlying
	  // socket or file.
	  this.length = 0;

	  // a flag to see when we're in the middle of a write.
	  this.writing = false;

	  // when true all writes will be buffered until .uncork() call
	  this.corked = 0;

	  // a flag to be able to tell if the onwrite cb is called immediately,
	  // or on a later tick.  We set this to true at first, because any
	  // actions that shouldn't happen until "later" should generally also
	  // not happen before the first write call.
	  this.sync = true;

	  // a flag to know if we're processing previously buffered items, which
	  // may call the _write() callback in the same tick, so that we don't
	  // end up in an overlapped onwrite situation.
	  this.bufferProcessing = false;

	  // the callback that's passed to _write(chunk,cb)
	  this.onwrite = function (er) {
	    onwrite(stream, er);
	  };

	  // the callback that the user supplies to write(chunk,encoding,cb)
	  this.writecb = null;

	  // the amount that is being written when _write is called.
	  this.writelen = 0;

	  this.bufferedRequest = null;
	  this.lastBufferedRequest = null;

	  // number of pending user-supplied write callbacks
	  // this must be 0 before 'finish' can be emitted
	  this.pendingcb = 0;

	  // emit prefinish if the only thing we're waiting for is _write cbs
	  // This is relevant for synchronous Transform streams
	  this.prefinished = false;

	  // True if the error was already emitted and should not be thrown again
	  this.errorEmitted = false;

	  // count buffered requests
	  this.bufferedRequestCount = 0;

	  // allocate the first CorkedRequest, there is always
	  // one allocated and free to use, and we maintain at most two
	  this.corkedRequestsFree = new CorkedRequest(this);
	}

	WritableState.prototype.getBuffer = function getBuffer() {
	  var current = this.bufferedRequest;
	  var out = [];
	  while (current) {
	    out.push(current);
	    current = current.next;
	  }
	  return out;
	};

	(function () {
	  try {
	    Object.defineProperty(WritableState.prototype, 'buffer', {
	      get: internalUtil.deprecate(function () {
	        return this.getBuffer();
	      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
	    });
	  } catch (_) {}
	})();

	// Test _writableState for inheritance to account for Duplex streams,
	// whose prototype chain only points to Readable.
	var realHasInstance;
	if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
	  realHasInstance = Function.prototype[Symbol.hasInstance];
	  Object.defineProperty(Writable, Symbol.hasInstance, {
	    value: function (object) {
	      if (realHasInstance.call(this, object)) return true;

	      return object && object._writableState instanceof WritableState;
	    }
	  });
	} else {
	  realHasInstance = function (object) {
	    return object instanceof this;
	  };
	}

	function Writable(options) {
	  Duplex = Duplex || __webpack_require__(73);

	  // Writable ctor is applied to Duplexes, too.
	  // `realHasInstance` is necessary because using plain `instanceof`
	  // would return false, as no `_writableState` property is attached.

	  // Trying to use the custom `instanceof` for Writable here will also break the
	  // Node.js LazyTransform implementation, which has a non-trivial getter for
	  // `_writableState` that would lead to infinite recursion.
	  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
	    return new Writable(options);
	  }

	  this._writableState = new WritableState(options, this);

	  // legacy.
	  this.writable = true;

	  if (options) {
	    if (typeof options.write === 'function') this._write = options.write;

	    if (typeof options.writev === 'function') this._writev = options.writev;
	  }

	  Stream.call(this);
	}

	// Otherwise people can pipe Writable streams, which is just wrong.
	Writable.prototype.pipe = function () {
	  this.emit('error', new Error('Cannot pipe, not readable'));
	};

	function writeAfterEnd(stream, cb) {
	  var er = new Error('write after end');
	  // TODO: defer error events consistently everywhere, not just the cb
	  stream.emit('error', er);
	  processNextTick(cb, er);
	}

	// Checks that a user-supplied chunk is valid, especially for the particular
	// mode the stream is in. Currently this means that `null` is never accepted
	// and undefined/non-string values are only allowed in object mode.
	function validChunk(stream, state, chunk, cb) {
	  var valid = true;
	  var er = false;

	  if (chunk === null) {
	    er = new TypeError('May not write null values to stream');
	  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
	    er = new TypeError('Invalid non-string/buffer chunk');
	  }
	  if (er) {
	    stream.emit('error', er);
	    processNextTick(cb, er);
	    valid = false;
	  }
	  return valid;
	}

	Writable.prototype.write = function (chunk, encoding, cb) {
	  var state = this._writableState;
	  var ret = false;
	  var isBuf = Buffer.isBuffer(chunk);

	  if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

	  if (typeof cb !== 'function') cb = nop;

	  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
	    state.pendingcb++;
	    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
	  }

	  return ret;
	};

	Writable.prototype.cork = function () {
	  var state = this._writableState;

	  state.corked++;
	};

	Writable.prototype.uncork = function () {
	  var state = this._writableState;

	  if (state.corked) {
	    state.corked--;

	    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
	  }
	};

	Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
	  // node::ParseEncoding() requires lower case.
	  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
	  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
	  this._writableState.defaultEncoding = encoding;
	  return this;
	};

	function decodeChunk(state, chunk, encoding) {
	  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
	    chunk = bufferShim.from(chunk, encoding);
	  }
	  return chunk;
	}

	// if we're already writing something, then just put this
	// in the queue, and wait our turn.  Otherwise, call _write
	// If we return false, then we need a drain event, so set that flag.
	function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
	  if (!isBuf) {
	    chunk = decodeChunk(state, chunk, encoding);
	    if (Buffer.isBuffer(chunk)) encoding = 'buffer';
	  }
	  var len = state.objectMode ? 1 : chunk.length;

	  state.length += len;

	  var ret = state.length < state.highWaterMark;
	  // we must ensure that previous needDrain will not be reset to false.
	  if (!ret) state.needDrain = true;

	  if (state.writing || state.corked) {
	    var last = state.lastBufferedRequest;
	    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
	    if (last) {
	      last.next = state.lastBufferedRequest;
	    } else {
	      state.bufferedRequest = state.lastBufferedRequest;
	    }
	    state.bufferedRequestCount += 1;
	  } else {
	    doWrite(stream, state, false, len, chunk, encoding, cb);
	  }

	  return ret;
	}

	function doWrite(stream, state, writev, len, chunk, encoding, cb) {
	  state.writelen = len;
	  state.writecb = cb;
	  state.writing = true;
	  state.sync = true;
	  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
	  state.sync = false;
	}

	function onwriteError(stream, state, sync, er, cb) {
	  --state.pendingcb;
	  if (sync) processNextTick(cb, er);else cb(er);

	  stream._writableState.errorEmitted = true;
	  stream.emit('error', er);
	}

	function onwriteStateUpdate(state) {
	  state.writing = false;
	  state.writecb = null;
	  state.length -= state.writelen;
	  state.writelen = 0;
	}

	function onwrite(stream, er) {
	  var state = stream._writableState;
	  var sync = state.sync;
	  var cb = state.writecb;

	  onwriteStateUpdate(state);

	  if (er) onwriteError(stream, state, sync, er, cb);else {
	    // Check if we're actually ready to finish, but don't emit yet
	    var finished = needFinish(state);

	    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
	      clearBuffer(stream, state);
	    }

	    if (sync) {
	      /*<replacement>*/
	      asyncWrite(afterWrite, stream, state, finished, cb);
	      /*</replacement>*/
	    } else {
	      afterWrite(stream, state, finished, cb);
	    }
	  }
	}

	function afterWrite(stream, state, finished, cb) {
	  if (!finished) onwriteDrain(stream, state);
	  state.pendingcb--;
	  cb();
	  finishMaybe(stream, state);
	}

	// Must force callback to be called on nextTick, so that we don't
	// emit 'drain' before the write() consumer gets the 'false' return
	// value, and has a chance to attach a 'drain' listener.
	function onwriteDrain(stream, state) {
	  if (state.length === 0 && state.needDrain) {
	    state.needDrain = false;
	    stream.emit('drain');
	  }
	}

	// if there's something in the buffer waiting, then process it
	function clearBuffer(stream, state) {
	  state.bufferProcessing = true;
	  var entry = state.bufferedRequest;

	  if (stream._writev && entry && entry.next) {
	    // Fast case, write everything using _writev()
	    var l = state.bufferedRequestCount;
	    var buffer = new Array(l);
	    var holder = state.corkedRequestsFree;
	    holder.entry = entry;

	    var count = 0;
	    while (entry) {
	      buffer[count] = entry;
	      entry = entry.next;
	      count += 1;
	    }

	    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

	    // doWrite is almost always async, defer these to save a bit of time
	    // as the hot path ends with doWrite
	    state.pendingcb++;
	    state.lastBufferedRequest = null;
	    if (holder.next) {
	      state.corkedRequestsFree = holder.next;
	      holder.next = null;
	    } else {
	      state.corkedRequestsFree = new CorkedRequest(state);
	    }
	  } else {
	    // Slow case, write chunks one-by-one
	    while (entry) {
	      var chunk = entry.chunk;
	      var encoding = entry.encoding;
	      var cb = entry.callback;
	      var len = state.objectMode ? 1 : chunk.length;

	      doWrite(stream, state, false, len, chunk, encoding, cb);
	      entry = entry.next;
	      // if we didn't call the onwrite immediately, then
	      // it means that we need to wait until it does.
	      // also, that means that the chunk and cb are currently
	      // being processed, so move the buffer counter past them.
	      if (state.writing) {
	        break;
	      }
	    }

	    if (entry === null) state.lastBufferedRequest = null;
	  }

	  state.bufferedRequestCount = 0;
	  state.bufferedRequest = entry;
	  state.bufferProcessing = false;
	}

	Writable.prototype._write = function (chunk, encoding, cb) {
	  cb(new Error('_write() is not implemented'));
	};

	Writable.prototype._writev = null;

	Writable.prototype.end = function (chunk, encoding, cb) {
	  var state = this._writableState;

	  if (typeof chunk === 'function') {
	    cb = chunk;
	    chunk = null;
	    encoding = null;
	  } else if (typeof encoding === 'function') {
	    cb = encoding;
	    encoding = null;
	  }

	  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

	  // .end() fully uncorks
	  if (state.corked) {
	    state.corked = 1;
	    this.uncork();
	  }

	  // ignore unnecessary end() calls.
	  if (!state.ending && !state.finished) endWritable(this, state, cb);
	};

	function needFinish(state) {
	  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
	}

	function prefinish(stream, state) {
	  if (!state.prefinished) {
	    state.prefinished = true;
	    stream.emit('prefinish');
	  }
	}

	function finishMaybe(stream, state) {
	  var need = needFinish(state);
	  if (need) {
	    if (state.pendingcb === 0) {
	      prefinish(stream, state);
	      state.finished = true;
	      stream.emit('finish');
	    } else {
	      prefinish(stream, state);
	    }
	  }
	  return need;
	}

	function endWritable(stream, state, cb) {
	  state.ending = true;
	  finishMaybe(stream, state);
	  if (cb) {
	    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
	  }
	  state.ended = true;
	  stream.writable = false;
	}

	// It seems a linked list but it is not
	// there will be only 2 of these for each stream
	function CorkedRequest(state) {
	  var _this = this;

	  this.next = null;
	  this.entry = null;
	  this.finish = function (err) {
	    var entry = _this.entry;
	    _this.entry = null;
	    while (entry) {
	      var cb = entry.callback;
	      state.pendingcb--;
	      cb(err);
	      entry = entry.next;
	    }
	    if (state.corkedRequestsFree) {
	      state.corkedRequestsFree.next = _this;
	    } else {
	      state.corkedRequestsFree = _this;
	    }
	  };
	}
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(12), __webpack_require__(75).setImmediate))

/***/ },
/* 75 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(12).nextTick;
	var apply = Function.prototype.apply;
	var slice = Array.prototype.slice;
	var immediateIds = {};
	var nextImmediateId = 0;

	// DOM APIs, for completeness

	exports.setTimeout = function() {
	  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
	};
	exports.setInterval = function() {
	  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
	};
	exports.clearTimeout =
	exports.clearInterval = function(timeout) { timeout.close(); };

	function Timeout(id, clearFn) {
	  this._id = id;
	  this._clearFn = clearFn;
	}
	Timeout.prototype.unref = Timeout.prototype.ref = function() {};
	Timeout.prototype.close = function() {
	  this._clearFn.call(window, this._id);
	};

	// Does not start the time, just sets up the members needed.
	exports.enroll = function(item, msecs) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = msecs;
	};

	exports.unenroll = function(item) {
	  clearTimeout(item._idleTimeoutId);
	  item._idleTimeout = -1;
	};

	exports._unrefActive = exports.active = function(item) {
	  clearTimeout(item._idleTimeoutId);

	  var msecs = item._idleTimeout;
	  if (msecs >= 0) {
	    item._idleTimeoutId = setTimeout(function onTimeout() {
	      if (item._onTimeout)
	        item._onTimeout();
	    }, msecs);
	  }
	};

	// That's not how node.js implements it but the exposed api is the same.
	exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
	  var id = nextImmediateId++;
	  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

	  immediateIds[id] = true;

	  nextTick(function onNextTick() {
	    if (immediateIds[id]) {
	      // fn.call() is faster so we optimize for the common use-case
	      // @see http://jsperf.com/call-apply-segu
	      if (args) {
	        fn.apply(null, args);
	      } else {
	        fn.call(null);
	      }
	      // Prevent ids from leaking
	      exports.clearImmediate(id);
	    }
	  });

	  return id;
	};

	exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
	  delete immediateIds[id];
	};
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(75).setImmediate, __webpack_require__(75).clearImmediate))

/***/ },
/* 76 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {
	/**
	 * Module exports.
	 */

	module.exports = deprecate;

	/**
	 * Mark that a method should not be used.
	 * Returns a modified function which warns once by default.
	 *
	 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
	 *
	 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
	 * will throw an Error when invoked.
	 *
	 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
	 * will invoke `console.trace()` instead of `console.error()`.
	 *
	 * @param {Function} fn - the function to deprecate
	 * @param {String} msg - the string to print to the console when `fn` is invoked
	 * @returns {Function} a new "deprecated" version of `fn`
	 * @api public
	 */

	function deprecate (fn, msg) {
	  if (config('noDeprecation')) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (config('throwDeprecation')) {
	        throw new Error(msg);
	      } else if (config('traceDeprecation')) {
	        console.trace(msg);
	      } else {
	        console.warn(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	}

	/**
	 * Checks `localStorage` for boolean values for the given `name`.
	 *
	 * @param {String} name
	 * @returns {Boolean}
	 * @api private
	 */

	function config (name) {
	  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
	  try {
	    if (!global.localStorage) return false;
	  } catch (_) {
	    return false;
	  }
	  var val = global.localStorage[name];
	  if (null == val) return false;
	  return String(val).toLowerCase() === 'true';
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var Buffer = __webpack_require__(37).Buffer;

	var isBufferEncoding = Buffer.isEncoding
	  || function(encoding) {
	       switch (encoding && encoding.toLowerCase()) {
	         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
	         default: return false;
	       }
	     }


	function assertEncoding(encoding) {
	  if (encoding && !isBufferEncoding(encoding)) {
	    throw new Error('Unknown encoding: ' + encoding);
	  }
	}

	// StringDecoder provides an interface for efficiently splitting a series of
	// buffers into a series of JS strings without breaking apart multi-byte
	// characters. CESU-8 is handled as part of the UTF-8 encoding.
	//
	// @TODO Handling all encodings inside a single object makes it very difficult
	// to reason about this code, so it should be split up in the future.
	// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
	// points as used by CESU-8.
	var StringDecoder = exports.StringDecoder = function(encoding) {
	  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
	  assertEncoding(encoding);
	  switch (this.encoding) {
	    case 'utf8':
	      // CESU-8 represents each of Surrogate Pair by 3-bytes
	      this.surrogateSize = 3;
	      break;
	    case 'ucs2':
	    case 'utf16le':
	      // UTF-16 represents each of Surrogate Pair by 2-bytes
	      this.surrogateSize = 2;
	      this.detectIncompleteChar = utf16DetectIncompleteChar;
	      break;
	    case 'base64':
	      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
	      this.surrogateSize = 3;
	      this.detectIncompleteChar = base64DetectIncompleteChar;
	      break;
	    default:
	      this.write = passThroughWrite;
	      return;
	  }

	  // Enough space to store all bytes of a single character. UTF-8 needs 4
	  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
	  this.charBuffer = new Buffer(6);
	  // Number of bytes received for the current incomplete multi-byte character.
	  this.charReceived = 0;
	  // Number of bytes expected for the current incomplete multi-byte character.
	  this.charLength = 0;
	};


	// write decodes the given buffer and returns it as JS string that is
	// guaranteed to not contain any partial multi-byte characters. Any partial
	// character found at the end of the buffer is buffered up, and will be
	// returned when calling write again with the remaining bytes.
	//
	// Note: Converting a Buffer containing an orphan surrogate to a String
	// currently works, but converting a String to a Buffer (via `new Buffer`, or
	// Buffer#write) will replace incomplete surrogates with the unicode
	// replacement character. See https://codereview.chromium.org/121173009/ .
	StringDecoder.prototype.write = function(buffer) {
	  var charStr = '';
	  // if our last write ended with an incomplete multibyte character
	  while (this.charLength) {
	    // determine how many remaining bytes this buffer has to offer for this char
	    var available = (buffer.length >= this.charLength - this.charReceived) ?
	        this.charLength - this.charReceived :
	        buffer.length;

	    // add the new bytes to the char buffer
	    buffer.copy(this.charBuffer, this.charReceived, 0, available);
	    this.charReceived += available;

	    if (this.charReceived < this.charLength) {
	      // still not enough chars in this buffer? wait for more ...
	      return '';
	    }

	    // remove bytes belonging to the current character from the buffer
	    buffer = buffer.slice(available, buffer.length);

	    // get the character that was split
	    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

	    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	    var charCode = charStr.charCodeAt(charStr.length - 1);
	    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	      this.charLength += this.surrogateSize;
	      charStr = '';
	      continue;
	    }
	    this.charReceived = this.charLength = 0;

	    // if there are no more bytes in this buffer, just emit our char
	    if (buffer.length === 0) {
	      return charStr;
	    }
	    break;
	  }

	  // determine and set charLength / charReceived
	  this.detectIncompleteChar(buffer);

	  var end = buffer.length;
	  if (this.charLength) {
	    // buffer the incomplete character bytes we got
	    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
	    end -= this.charReceived;
	  }

	  charStr += buffer.toString(this.encoding, 0, end);

	  var end = charStr.length - 1;
	  var charCode = charStr.charCodeAt(end);
	  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
	  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
	    var size = this.surrogateSize;
	    this.charLength += size;
	    this.charReceived += size;
	    this.charBuffer.copy(this.charBuffer, size, 0, size);
	    buffer.copy(this.charBuffer, 0, 0, size);
	    return charStr.substring(0, end);
	  }

	  // or just emit the charStr
	  return charStr;
	};

	// detectIncompleteChar determines if there is an incomplete UTF-8 character at
	// the end of the given buffer. If so, it sets this.charLength to the byte
	// length that character, and sets this.charReceived to the number of bytes
	// that are available for this character.
	StringDecoder.prototype.detectIncompleteChar = function(buffer) {
	  // determine how many bytes we have to check at the end of this buffer
	  var i = (buffer.length >= 3) ? 3 : buffer.length;

	  // Figure out if one of the last i bytes of our buffer announces an
	  // incomplete char.
	  for (; i > 0; i--) {
	    var c = buffer[buffer.length - i];

	    // See http://en.wikipedia.org/wiki/UTF-8#Description

	    // 110XXXXX
	    if (i == 1 && c >> 5 == 0x06) {
	      this.charLength = 2;
	      break;
	    }

	    // 1110XXXX
	    if (i <= 2 && c >> 4 == 0x0E) {
	      this.charLength = 3;
	      break;
	    }

	    // 11110XXX
	    if (i <= 3 && c >> 3 == 0x1E) {
	      this.charLength = 4;
	      break;
	    }
	  }
	  this.charReceived = i;
	};

	StringDecoder.prototype.end = function(buffer) {
	  var res = '';
	  if (buffer && buffer.length)
	    res = this.write(buffer);

	  if (this.charReceived) {
	    var cr = this.charReceived;
	    var buf = this.charBuffer;
	    var enc = this.encoding;
	    res += buf.slice(0, cr).toString(enc);
	  }

	  return res;
	};

	function passThroughWrite(buffer) {
	  return buffer.toString(this.encoding);
	}

	function utf16DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 2;
	  this.charLength = this.charReceived ? 2 : 0;
	}

	function base64DetectIncompleteChar(buffer) {
	  this.charReceived = buffer.length % 3;
	  this.charLength = this.charReceived ? 3 : 0;
	}


/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	// a transform stream is a readable/writable stream where you do
	// something with the data.  Sometimes it's called a "filter",
	// but that's not a great name for it, since that implies a thing where
	// some bits pass through, and others are simply ignored.  (That would
	// be a valid example of a transform, of course.)
	//
	// While the output is causally related to the input, it's not a
	// necessarily symmetric or synchronous transformation.  For example,
	// a zlib stream might take multiple plain-text writes(), and then
	// emit a single compressed chunk some time in the future.
	//
	// Here's how this works:
	//
	// The Transform stream has all the aspects of the readable and writable
	// stream classes.  When you write(chunk), that calls _write(chunk,cb)
	// internally, and returns false if there's a lot of pending writes
	// buffered up.  When you call read(), that calls _read(n) until
	// there's enough pending readable data buffered up.
	//
	// In a transform stream, the written data is placed in a buffer.  When
	// _read(n) is called, it transforms the queued up data, calling the
	// buffered _write cb's as it consumes chunks.  If consuming a single
	// written chunk would result in multiple output chunks, then the first
	// outputted bit calls the readcb, and subsequent chunks just go into
	// the read buffer, and will cause it to emit 'readable' if necessary.
	//
	// This way, back-pressure is actually determined by the reading side,
	// since _read has to be called to start processing a new chunk.  However,
	// a pathological inflate type of transform can cause excessive buffering
	// here.  For example, imagine a stream where every byte of input is
	// interpreted as an integer from 0-255, and then results in that many
	// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
	// 1kb of data being output.  In this case, you could write a very small
	// amount of input, and end up with a very large amount of output.  In
	// such a pathological inflating mechanism, there'd be no way to tell
	// the system to stop doing the transform.  A single 4MB write could
	// cause the system to run out of memory.
	//
	// However, even in such a pathological case, only a single written chunk
	// would be consumed, and then the rest would wait (un-transformed) until
	// the results of the previous transformed chunk were consumed.

	'use strict';

	module.exports = Transform;

	var Duplex = __webpack_require__(73);

	/*<replacement>*/
	var util = __webpack_require__(70);
	util.inherits = __webpack_require__(45);
	/*</replacement>*/

	util.inherits(Transform, Duplex);

	function TransformState(stream) {
	  this.afterTransform = function (er, data) {
	    return afterTransform(stream, er, data);
	  };

	  this.needTransform = false;
	  this.transforming = false;
	  this.writecb = null;
	  this.writechunk = null;
	  this.writeencoding = null;
	}

	function afterTransform(stream, er, data) {
	  var ts = stream._transformState;
	  ts.transforming = false;

	  var cb = ts.writecb;

	  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

	  ts.writechunk = null;
	  ts.writecb = null;

	  if (data !== null && data !== undefined) stream.push(data);

	  cb(er);

	  var rs = stream._readableState;
	  rs.reading = false;
	  if (rs.needReadable || rs.length < rs.highWaterMark) {
	    stream._read(rs.highWaterMark);
	  }
	}

	function Transform(options) {
	  if (!(this instanceof Transform)) return new Transform(options);

	  Duplex.call(this, options);

	  this._transformState = new TransformState(this);

	  var stream = this;

	  // start out asking for a readable event once data is transformed.
	  this._readableState.needReadable = true;

	  // we have implemented the _read method, and done the other things
	  // that Readable wants before the first _read call, so unset the
	  // sync guard flag.
	  this._readableState.sync = false;

	  if (options) {
	    if (typeof options.transform === 'function') this._transform = options.transform;

	    if (typeof options.flush === 'function') this._flush = options.flush;
	  }

	  // When the writable side finishes, then flush out anything remaining.
	  this.once('prefinish', function () {
	    if (typeof this._flush === 'function') this._flush(function (er, data) {
	      done(stream, er, data);
	    });else done(stream);
	  });
	}

	Transform.prototype.push = function (chunk, encoding) {
	  this._transformState.needTransform = false;
	  return Duplex.prototype.push.call(this, chunk, encoding);
	};

	// This is the part where you do stuff!
	// override this function in implementation classes.
	// 'chunk' is an input chunk.
	//
	// Call `push(newChunk)` to pass along transformed output
	// to the readable side.  You may call 'push' zero or more times.
	//
	// Call `cb(err)` when you are done with this chunk.  If you pass
	// an error, then that'll put the hurt on the whole operation.  If you
	// never call cb(), then you'll never get another chunk.
	Transform.prototype._transform = function (chunk, encoding, cb) {
	  throw new Error('_transform() is not implemented');
	};

	Transform.prototype._write = function (chunk, encoding, cb) {
	  var ts = this._transformState;
	  ts.writecb = cb;
	  ts.writechunk = chunk;
	  ts.writeencoding = encoding;
	  if (!ts.transforming) {
	    var rs = this._readableState;
	    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
	  }
	};

	// Doesn't matter what the args are here.
	// _transform does all the work.
	// That we got here means that the readable side wants more data.
	Transform.prototype._read = function (n) {
	  var ts = this._transformState;

	  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
	    ts.transforming = true;
	    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
	  } else {
	    // mark that we need a transform, so that any data that comes in
	    // will get processed, now that we've asked for it.
	    ts.needTransform = true;
	  }
	};

	function done(stream, er, data) {
	  if (er) return stream.emit('error', er);

	  if (data !== null && data !== undefined) stream.push(data);

	  // if there's nothing in the write buffer, then that means
	  // that nothing more will ever be provided
	  var ws = stream._writableState;
	  var ts = stream._transformState;

	  if (ws.length) throw new Error('Calling transform done when ws.length != 0');

	  if (ts.transforming) throw new Error('Calling transform done when still transforming');

	  return stream.push(null);
	}

/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {

	// a passthrough stream.
	// basically just the most minimal sort of Transform stream.
	// Every written chunk gets output as-is.

	'use strict';

	module.exports = PassThrough;

	var Transform = __webpack_require__(78);

	/*<replacement>*/
	var util = __webpack_require__(70);
	util.inherits = __webpack_require__(45);
	/*</replacement>*/

	util.inherits(PassThrough, Transform);

	function PassThrough(options) {
	  if (!(this instanceof PassThrough)) return new PassThrough(options);

	  Transform.call(this, options);
	}

	PassThrough.prototype._transform = function (chunk, encoding, cb) {
	  cb(null, chunk);
	};

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	const BYTES_PER_CHUNK = 1200;
	const TRANSFER_COMPLETE = 'TC';
	const utils = __webpack_require__( 81 );
	const ds = __webpack_require__( 2 );

	module.exports = class OutgoingFileTransfer{
		constructor( room, file, remoteUserId, transferId ) {
			this._room = room;
			this._file = file;
			this._remoteUserId = remoteUserId;
			this._currentChunk = 0;
			this._transferId = transferId;
			this._fileReader = new FileReader();
			this._fileReader.onload = this._onRead.bind( this );
			this._fileReader.onerror = this._onError.bind( this );
			this._readNextChunk();
		}

		_readNextChunk() {
			var start = BYTES_PER_CHUNK * this._currentChunk;
			var end = Math.min( this._file.size, start + BYTES_PER_CHUNK );
			this._fileReader.readAsArrayBuffer( this._file.slice( start, end ) );
		}

		_onRead( ) {
			const data = new Uint8Array( this._fileReader.result.byteLength + 12 );

			utils.setIntInByteArray( this._transferId, data, 0 );
			utils.setIntInByteArray( this._currentChunk, data, 4 );
			utils.setIntInByteArray( this._file.size, data, 8 );

			data.set( new Uint8Array( this._fileReader.result ), 12 )

			this._room.send( data.buffer, this._remoteUserId );
			this._currentChunk++;

			if( BYTES_PER_CHUNK * this._currentChunk < this._file.size ) {
				this._readNextChunk();
			} else {
				this._room.send( TRANSFER_COMPLETE + ':' + this._transferId, this._remoteUserId );
			}

			ds.client.emit( 'file-progress/_' + this._transferId, ( this._currentChunk * BYTES_PER_CHUNK ) / this._file.size );
		}

		_onError( error ) {
			console.log( 'error reading file', error );
		}
	}

/***/ },
/* 81 */
/***/ function(module, exports) {

	const SIZE_SHORT_CODES = [ 'KB', 'MB', 'GB', 'TB', 'PB' ];

	/**
	* Converts file sizes in byte to a human readable format, e.g. "2.34 MB"
	*
	* @param   {Number} size the file size in bytes
	*
	* @returns {String} human readable filesize
	*/
	exports.convertFileSize = function( size ) {
		if( size < 1024 ) {
			return size + SIZE_SHORT_CODES[ 0 ];
		}

		for( var i = 2; i < SIZE_SHORT_CODES.length - 1; i++ ) {
			if ( size < Math.pow( 1024, i ) ) {
				return ( size / Math.pow( 1024, i - 1 ) ).toFixed( 2 ) + ' ' + SIZE_SHORT_CODES[ i - 2 ];
			}
		}
	};

	/**
	 * Replaces some unsupported characters, e.g. .[ ] / with underscores
	 *
	 * @param   {String} fileName
	 *
	 * @returns {String} escaped filename
	 */
	exports.toJsonPath = function( fileName ) {
		return fileName.replace( /[\.\[\]\ ]/g, '_' );
	};

	/**
	 * A convenience method to remove an entry from an array within a record
	 *
	 * @param   {ds.Record} record the record that contains the array
	 * @param   {String} path a path locating the array within the record
	 * @param   {Mixed} item the item to be added
	 *
	 * @returns {void}
	 */
	exports.removeFromArray = function( record, path, item ) {
		var arr = record.get( path );
		var index = arr.indexOf( item );

		if( index > -1 ) {
			arr.splice( index, 1 );
		}

		record.set( path, arr );
	};

	/**
	 * A convenience method to add an entry to an array within a record
	 *
	 * @param   {ds.Record} record the record that contains the array
	 * @param   {String} path a path locating the array within the record
	 * @param   {Mixed} item the item to be added
	 *
	 * @returns {void}
	 */
	exports.addToArray = function( record, path, item, unique ) {
		var arr = record.get( path );
		if( unique === true && arr.indexOf( item ) > -1 ) {
			return;
		}
		arr.push( item );
		record.set( path, arr );
	};

	/**
	 * Opposite of [utils.getIntFromByteArray]. Breaks an integer into up to four bytes
	 * and stores them in a byte array at a specified index
	 *
	 * @param {Number} val        	Integer value to be stored
	 * @param {ByteArray} byteArray A byte array in which the value should be stored
	 * @param {Number} startIndex	An integer specifying the start index at which to store the value
	 *
	 * @return {ByteArray} The manipulated byte array
	 */
	exports.setIntInByteArray = function( val, byteArray, startIndex ) {
	    var index, byte;

	    for ( index = 0; index < 4; index ++ ) {
	        byte = val & 0xff;
	        byteArray[ index + startIndex ] = byte;
	        val = ( val - byte ) / 256;
	    }

	    return byteArray;
	};

	/**
	 * Opposite of [utils.setIntInByteArray]. Reads four bytes from an array and transforms them into
	 * an integer
	 *
	 * @param   {ByteArray} byteArray 	ByteArray to read from
	 * @param   {Number} 	startIndex	Integer specifying the start index from which to start reading
	 *
	 * @returns {Number} The resulting Integer
	 */
	exports.getIntFromByteArray = function( byteArray, startIndex ) {
	    var value = 0, i;
	    for ( i = startIndex + 3; i >= startIndex; i--) {
	        value = (value * 256) + byteArray[i];
	    }

	    return value;
	};

	/**
	 * Takes an array of ArrayBuffers, turns them into a Blob Url and
	 * prompts the browser to download it
	 *
	 * @param   {ArrayBuffer|Array} data Single ArrayBuffer or array of ArrayBuffers
	 * @param   {String} fileName The name under which to store the downloaded file
	 *
	 * @returns {void}
	 */
	exports.downloadFile = function( data, fileName ) {
		var blob = new window.Blob( data );
		var anchor = document.createElement( 'a' );
		anchor.href = URL.createObjectURL( blob );
		anchor.download = fileName;
		anchor.textContent = 'XXXXXXX';

		if( anchor.click ) {
			anchor.click();
		} else {
			var evt = document.createEvent( 'MouseEvents' );
			evt.initMouseEvent( 'click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null );
			anchor.dispatchEvent( evt );
		}
	}

/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	const BYTES_PER_CHUNK = 1200;
	const utils = __webpack_require__( 81 );
	const ds = __webpack_require__( 2 );

	module.exports = class IncomingFileTransfer{
		constructor( size, transferId ) {
			this._size = size;
			this._transferId = transferId;
			this._receivedLength = 0;
			this._data = [];
			this._indices = [];
		}

		addChunk( index, chunk ) {
			this._data.push( chunk );
			this._receivedLength += chunk.byteLength;
			this._indices.push( index );
			ds.client.emit( 'file-progress/' + this._transferId, this._receivedLength / this._size );
		}

		setName( filename ) {
			this._filename = filename;
		}

		downloadFile() {
			utils.downloadFile( this._data, this._filename );
		}

		addOwnerToFile() {
			utils.addToArray( ds.record, 'files.' + utils.toJsonPath( this._filename ) + '.owners', ds.userId, true );
		}

		validate() {
			if( this._indices.length !== Math.ceil( this._size / BYTES_PER_CHUNK ) ) {
				return 'Missing chunks';
			}

			for( var i = 0; i < this._indices.length; i++ ) {
				if( i !== this._indices[ i ] ) {
					return 'chunks out of order';
				}
			}

			if( this._size !== this._receivedLength ) {
				return 'expected size was ' + this._size + ' but only received ' + this._receivedLength;
			}

			return true;
		}
	}

/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {

	const record = __webpack_require__( 2 ).record;
	const ds = __webpack_require__( 2 );
	const utils = __webpack_require__( 81 );
	const room = __webpack_require__( 34 );

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
				isOwner: this.$props.fileItem.owners.indexOf( ds.userId ) > -1,

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
					destination: ds.userId
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
				room.addNameToTransfer( uuid, this.$props.fileItem.name );
				this.transfers.push({
					uuid: uuid,
					origin: origin,
					destination: 'me'
				});
			},

			updateOwners( owners ) {
				this.$data.ownerCount = owners ? owners.length : 0;
			},

			convertFileSize: utils.convertFileSize
		}
	});

/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	const ds = __webpack_require__( 2 );

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



/***/ },
/* 85 */
/***/ function(module, exports, __webpack_require__) {

	const roomId = __webpack_require__( 2 ).roomId;

	Vue.component( 'room-name', {
		template: `
			<div class="room-name">
				<span>{{roomName}}</span>
				<i class="material-icons copy" title="copy to clipboard">assignment</i>
			</div>
		`,
		data: function() {
			return {
				roomName: document.location.origin + '?' + roomId
			}
		},
		mounted(){
			const clipboardButton = this.$el.querySelector( '.copy' );
			clipboardButton.setAttribute( 'data-clipboard-text', this.$data.roomName );
			var zc = new ZeroClipboard( clipboardButton );
			zc.on( 'ready', function(){
				clipboardButton.style.opacity = '1';
			});
		}
	});

/***/ },
/* 86 */
/***/ function(module, exports, __webpack_require__) {

	const ds = __webpack_require__( 2 );

	Vue.component( 'users', {
		template: `
			<div class="users">{{userString}}</div>
		`,
		data: function() {
			return {
				userString: 'You are alone in this room'
			}
		},
		created: function() {
			ds.record.subscribe( 'users', this.createUserString.bind( this ), true );
		},
		methods: {
			createUserString: function( users ) {
				if( users.length === 1 ) {
					this.$data.userString = 'You are alone in this room';
				} else {
					this.$data.userString = 'You are in this room with ' + ( users.length - 1 ) + ' other user' + ( users.length > 2 ? 's': '' );
				}
			}
		}
	});

/***/ }
/******/ ]);