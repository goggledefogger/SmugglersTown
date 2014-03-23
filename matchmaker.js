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
        var gameData = createNewGame(availableGamesDataRef, username, peerId);
        callback(gameData, true);
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
  var gameData = {
    id: gameId,
    hostPeerId: peerId,
    users: [{
      peerId: peerId,
      username: username
    }]
  }
  availableGamesDataRef.set([gameData]);
  joinedGame = gameId;
  return gameData;
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
  callback(gameData, false);
};

function setGameToFull(gameDataRef, gameData) {
  removeGameFromAvailableGames(gameDataRef);
  var fullGamesRef = gameRef.child(FULL_GAMES_LOCATION);
  fullGamesRef.push(gameData);
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
    gameListRef.on('value', function(dataSnapshot) {
      dataSnapshot.forEach(function(childSnapshot) {
        var gameData = childSnapshot.val();
        if (gameData.id == gameId) {
          gameData = removeUserFromGameData(peerId, gameData);
          // if the user was actually removed from the game,
          // update Firebase and move the game from FULL to AVAILABLE
          if (gameData != null) {
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

  availableGamesRef.on('value', function(snapshot) {
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

function removeGameFromAvailableGames(gameDataRef) {
  gameDataRef.remove();
}