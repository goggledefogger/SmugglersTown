// The root of your game data.
var GAME_LOCATION = 'https://smugglerstown.firebaseio.com/';
var gameRef = new Firebase(GAME_LOCATION);

var AVAILABLE_GAMES_LOCATION = 'available_games';
var FULL_GAMES_LOCATION = 'full_games';
var ALL_GAMES_LOCATION = 'games';
var MAX_USERS_PER_GAME = 4;

var joinedGame = null;

// this is one of the public points of entry
function joinOrCreateGame(username, peerId, connectToUsersCallback, joinedGameCallback) {
  console.log('trying to join game');
  var availableGamesDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION);
  availableGamesDataRef.once('value', function(data) {

    // only join a game if one isn't joined already
    if (joinedGame == null) {
      joinedGame = 1;
      if (data.val() === null) {
        // there are no available games, so create one
        var gameData = createNewGame(username, peerId);
        joinedGameCallback(gameData, true);
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
        joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback);
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

    // Firebase weirdness: the users array can still have undefined elements
    // which represents users that have left the game. So trim out the 
    // undefined elements to see the actual array of current users
    var numUsersInGame = data.child('users').val().clean(undefined).length;
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
  // reset the hostPeerId so it prevents the leaving host's browser
  // if it tries to switch again before this is done
  gameRef.child(ALL_GAMES_LOCATION).child(gameId).child('hostPeerId').remove();

  gameRef.child(ALL_GAMES_LOCATION).child(gameId).once('value', function(data) {
    var users = data.child('users').val();

    // if for whatever reason this is called and something's not right, just
    // return
    if (!users) {
      return;
    }

    users = users.clean(undefined);
    if (users.length == 0) {
      return;
    }

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

function joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback) {
  asyncGetGameData(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingGameData);
};

function asyncGetGameData(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingGameDataCallback) {
  var gameDataRef = gameRef.child(ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.once('value', function(data) {
    doneGettingGameDataCallback(data, username, peerId, connectToUsersCallback, joinedGameCallback);
  });
}

function doneGettingGameData(gameDataSnapshot, username, peerId, connectToUsersCallback, joinedGameCallback) {
  var gameData = gameDataSnapshot.val();
  var newUser = {
    peerId: peerId,
    username: username
  };
  // weirdness: i want to just push newUser onto gameData.users, but
  // that messes up the array I guess
  var usersArray = [];
  for (var i = 0; i < gameData.users.length; i++) {
    if (gameData.users[i]) {
      usersArray.push(gameData.users[i]);
    }
  }
  usersArray.push(newUser);
  gameData.users = usersArray;
  var gameDataRef = gameDataSnapshot.ref();
  gameDataRef.set(gameData);
  console.log('joining game ' + gameData.id);
  joinedGame = gameData.id;
  // Firebase weirdness: the users array can still have undefined elements
  // which represents users that have left the game. So trim out the 
  // undefined elements to see the actual array of current users
  if (usersArray.length == MAX_USERS_PER_GAME) {
    setGameToFull(gameData.id);
  }
  var peerIdsArray = [];
  for (var j = 0; j < gameData.users.length; j++) {
    peerIdsArray.push(gameData.users[j].peerId);
  }
  connectToUsersCallback(peerIdsArray);
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

  // Firebase weirdness: the users array can still have undefined elements
  // which represents users that have left the game. So trim out the 
  // undefined elements to see the actual array of current users
  gameData.users = gameData.users.clean(undefined);

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