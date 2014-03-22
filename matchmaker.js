// The root of your game data.
var GAME_LOCATION = 'https://smugglerstown.firebaseio.com/';
var gameRef = new Firebase(GAME_LOCATION);

var AVAILABLE_GAMES_LOCATION = 'available_games';
var FULL_GAMES_LOCATION = 'full_games';
var MAX_USERS_PER_GAME = 2;

var joinedGame = null;

function joinOrCreateGame(username, peerId, callback) {
  console.log('trying to join game');
  var availableGamesDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION);
  availableGamesDataRef.on('value', function(snapshot) {
    // watch out, this will be called if this specific data is changed,
    // so for example if someone's currently in a game and the Firebase
    // data gets deleted, or if a new available game is created in this
    // list, then this will fire

    // only join a game if one isn't joined already
    if (joinedGame == null) {
      joinedGame = 1;
      if (snapshot.val() === null) {
        // there are no available games, so create one
        var gameId = createNewGame(availableGamesDataRef, username, peerId);
        callback(gameId, true);
      } else {
        console.log(snapshot.child(0).val());
        // for now, just join the first game in the array
        joinExistingGame(snapshot.child(0), username, peerId, callback);
      }
    }
  });
}

function createNewGame(availableGamesDataRef, username, peerId) {
  console.log('creating new game');
  var gameId = createNewGameId();
  availableGamesDataRef.set([{
    id: gameId,
    users: [{
      peerId: peerId,
      username: username
    }]
  }]);
  joinedGame = gameId;
  return gameId;
}

function createNewGameId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingGame(gameDataSnapshot, username, peerId, callback) {
  var gameData = gameDataSnapshot.val();
  gameData.users.push({
    peerId: peerId,
    username: username
  });
  var gameDataRef = gameDataSnapshot.ref();
  gameDataRef.set(gameData);
  console.log('joining game ' + gameData.id);
  joinedGame = gameData.id;
  if (gameData.users.length == MAX_USERS_PER_GAME) {
    setGameToFull(gameDataSnapshot.ref(), gameData);
  }
  callback(gameData.id, false);
};

function setGameToFull(gameDataRef, gameData) {
  removeGameFromAvailableGames(gameDataRef);
  var fullGamesRef = gameRef.child(FULL_GAMES_LOCATION);
  fullGamesRef.push(gameData);
}

function removeMeFromGameHost(peerId) {
  // TODO
}

function removeGameFromAvailableGames(gameDataRef) {
  gameDataRef.remove();
}