/**
 * Request the deepstream client
 *
 * @type {Deepstream.Factory} the deepstream client factory
 */
const deepstream = require( 'deepstream.io-client-js' );

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
		files: [],
		roomToken: null,
		broadcasters: {}
	});
}

exports.client = client;
exports.roomId = roomId;
exports.record = record;
exports.isFirstInRoom = isFirstInRoom;

window.rec = record;