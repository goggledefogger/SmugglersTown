// The root of your game data.
var GAME_LOCATION = 'https://smugglerstown.firebaseio.com/';
var gameRef = new Firebase(GAME_LOCATION);

var AVAILABLE_GAMES_LOCATION = 'available_games';
var FULL_GAMES_LOCATION = 'full_games';
var ALL_GAMES_LOCATION = 'games';
var MAX_USERS_PER_GAME = 2;

var joinedGame = null;

// this is one of the public points of entry
function joinOrCreateGame(username, peerId, callback) {
  console.log('trying to join game');
  var availableGamesDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION);
  availableGamesDataRef.once('value', function(data) {

    // only join a game if one isn't joined already
    if (joinedGame == null) {
      joinedGame = 1;
      if (data.val() === null) {
        // there are no available games, so create one
        var gameData = createNewGame(username, peerId);
        callback(gameData, true);
      } else {
        var jsonObj = data.val();
        var gameId;
        for (var key in jsonObj) {
          if (jsonObj.hasOwnProperty(key)) {
            gameId = jsonObj[key];
            break;
          }
        }
        // for now, just join the first game in the array
        joinExistingGame(gameId, username, peerId, callback);
      }
    }
  });
}

// another public point of entry
function removePeerFromGame(gameId, peerId) {
  var gameDataRef = gameRef.child(ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.once('value', function(data) {
    if (data.val().hostPeerId == peerId) {
      findNewHostPeerId(gameId, peerId, switchToNewHost);
    }
    var numUsersInGame = data.val().users.length;
    data.child('users').forEach(function(childSnapshot) {
      // if we've found the ref that represents the given peer, remove it
      if (childSnapshot.val() && childSnapshot.val().peerId == peerId) {
        childSnapshot.ref().remove();
        // if this user was the last one in the game, now there are 0, 
        // so delete the game
        if (numUsersInGame == 1) {
          deleteGame(gameId);
        } else {
          // if it was full, now it has one open slot, set it to available
          if (numUsersInGame == MAX_USERS_PER_GAME) {
            moveGameFromFullToAvailable(gameId);
          }
        }
      }
    });
  });
}

function findNewHostPeerId(gameId, existingHostPeerId, callback) {
  gameRef.child(ALL_GAMES_LOCATION).child(gameId).once('value', function(data) {
    var users = data.val().users;
    for (var i = 0; i < users.length; i++) {
      if (users[i] && users[i].peerId != existingHostPeerId) {
        // we've found a new user to be the host, return their id
        callback(gameId, users[i].peerId);
      }
    }
    callback(gameId, null);
  });
}

function switchToNewHost(gameId, newHostPeerId) {
  if (!newHostPeerId) {
    return;
  }
  gameRef.child(ALL_GAMES_LOCATION).child(gameId).child('hostPeerId').set(newHostPeerId);
}

function deleteGame(gameId) {
  removeGameFromAvailableGames(gameId);
  removeGame(gameId);
}

function removeGame(gameId) {
  var gameDataRef = gameRef.child(ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function createNewGame(username, peerId) {
  console.log('creating new game');
  var gameId = createNewGameId();
  var gameData = {
    id: gameId,
    hostPeerId: peerId,
    users: [{
      peerId: peerId,
      username: username
    }]
  }
  var newGameDataRef = gameRef.child(ALL_GAMES_LOCATION).child(gameId);
  newGameDataRef.set(gameData);
  var newAvailableGameDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION).child(gameId);
  newAvailableGameDataRef.set(gameId);
  joinedGame = gameId;
  return gameData;
}


function createNewGameId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingGame(gameId, username, peerId, joinedGameCallback) {
  asyncGetGameData(gameId, username, peerId, joinedGameCallback, doneGettingGameData);
};

function asyncGetGameData(gameId, username, peerId, joinedGameCallback, doneGettingGameDataCallback) {
  var gameDataRef = gameRef.child(ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.once('value', function(data) {
    doneGettingGameDataCallback(data, username, peerId, joinedGameCallback);
  });
}

function doneGettingGameData(gameDataSnapshot, username, peerId, joinedGameCallback) {
  var gameData = gameDataSnapshot.val();
  // annoying, but if this gets 
  gameData.users.push({
    peerId: peerId,
    username: username
  });
  var gameDataRef = gameDataSnapshot.ref();
  gameDataRef.set(gameData);
  console.log('joining game ' + gameData.id);
  joinedGame = gameData.id;
  if (gameData.users.length == MAX_USERS_PER_GAME) {
    setGameToFull(gameData.id);
  }
  joinedGameCallback(gameData, false);
}

function setGameToFull(gameId) {
  removeGameFromAvailableGames(gameId);
  addGameToFullGamesList(gameId);
}

function removeGameFromAvailableGames(gameId) {
  var gameDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function addGameToFullGamesList(gameId) {
  var gameDataRef = gameRef.child(FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.set(gameId);
}

function moveGameFromFullToAvailable(gameId) {
  removeGameFromFullGames(gameId);
  addGameToAvailableGamesList(gameId);
}

function removeGameFromFullGames(gameId) {
  var gameDataRef = gameRef.child(FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function addGameToAvailableGamesList(gameId) {
  var gameDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION).child(gameId);
  gameDataRef.set(gameId);
}


// returns null if the user wasn't found in the game
function removeUserFromGameData(peerId, gameData) {
  // if something's wrong, just return
  if (!gameData || !gameData.users) {
    return null;
  }


  // TODO: Firebase has a better way of doing this
  var foundPeer = false;

  usersWithoutPeer = [];
  for (i = 0; i < gameData.users.length; i++) {
    if (gameData.users[i].peerId == peerId) {
      foundPeer = true;
    } else {
      usersWithoutPeer.push(gameData.users[i]);
    }
  }

  if (foundPeer) {
    gameData.users = usersWithoutPeer;
    return gameData;
  } else {
    return null;
  }


}