// The root of your game data.
var GAME_LOCATION = 'https://smugglerstown.firebaseio.com/';
var gameRef = new Firebase(GAME_LOCATION);

var AVAILABLE_GAMES_LOCATION = 'available_games';
var FULL_GAMES_LOCATION = 'full_games';
var ALL_GAMES_LOCATION = 'games';
var MAX_USERS_PER_GAME = 2;

var joinedGame = null;

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

function addGameToFullGamesList(gameId) {
  var gameDataRef = gameRef.child(FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.set(gameId);
}


function removePeerFromGame(gameId, peerId) {
  // check full games and available games
  removePeerFromGameList([FULL_GAMES_LOCATION, AVAILABLE_GAMES_LOCATION], peerId);
}

function removePeerFromGameList(gameLocationsArray, peerId) {
  var gameListRef = null;
  // iterate through all locations to find the peer's game
  for (i = 0; i < gameLocationsArray.length; i++) {
    var gameListRef = gameRef.child(gameLocationsArray[i]);
    gameListRef.once('value', function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        var gameData = childSnapshot.val();
        if (gameData.id == gameId) {
          gameData = removeUserFromGameData(peerId, gameData);
          // if the user was actually removed from the game,
          // update Firebase and move the game from FULL to AVAILABLE
          if (gameData != null) {
            // save the new gameData to Firebase
            childSnapshot.ref().set(gameData);
            // TODO: check to see if game is empty, then delete
            //moveGameFromFullToAvailable(childSnapshot.ref(), gameData);
          }
        }
      });
    });
  }
}

function moveGameFromFullToAvailable(gameToMoveRef, gameData) {
  var availableGamesRef = gameRef.child(AVAILABLE_GAMES_LOCATION);

  availableGamesRef.once('value', function(snapshot) {
    // if this is the first available game, create the ref in Firebase
    if (snapshot.val() === null) {
      availableGamesRef.set([gameData]);
    } else {
      // get the existing list of available games and add this to it
      var availableGameData = snapshot.val();
      console.log(availableGameData);
      availableGameData.push(gameData);
      //snapshot.ref().set(availableGameData);
    }
  });
  gameToMoveRef.remove();
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

function removeGameFromAvailableGames(gameId) {
  var gameDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}