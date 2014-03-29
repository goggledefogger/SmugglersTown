// The root of your game data.
var GAME_LOCATION = 'https://smugglerstown.firebaseio.com/';
var gameRef = new Firebase(GAME_LOCATION);

var AVAILABLE_GAMES_LOCATION = 'available_games';
var FULL_GAMES_LOCATION = 'full_games';
var ALL_GAMES_LOCATION = 'games';
var MAX_USERS_PER_GAME = 4;
var GAME_CLEANUP_TIMEOUT = 30 * 1000; // in milliseconds

var joinedGame = null;
var myWorker = null;

// this is one of the public points of entry
function joinOrCreateGame(username, peerId, connectToUsersCallback, joinedGameCallback) {
  callAsyncCleanupInactiveGames();
  console.log('trying to join game');
  initializeServerHelperWorker();
  var availableGamesDataRef = gameRef.child(AVAILABLE_GAMES_LOCATION);
  availableGamesDataRef.once('value', function(data) {
    // only join a game if one isn't joined already
    if (joinedGame == null) {
      joinedGame = -1;
      if (data.val() === null) {
        // there are no available games, so create one
        var gameData = createNewGame(username, peerId);
        joinedGameCallback(gameData, true);
      } else {
        var jsonObj = data.val();
        var gameId;

        // stupid javascript won't tell me how many game elements
        // are in the jsonObj, so count em up
        var numAvailableGames = 0;
        for (var key in jsonObj) {
          numAvailableGames++;
        }

        // iterate through the child games and try
        // to join each one
        var counter = 0;
        for (var key in jsonObj) {
          counter++;
          if (jsonObj.hasOwnProperty(key)) {
            gameId = jsonObj[key];
            getGameLastUpdateTime(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTime, counter == numAvailableGames);
          }
        }
      }
    }
  });
}

function doneGettingUpdateTime(lastUpdateTime, gameId, isTheLastGame, username, peerId, connectToUsersCallback, joinedGameCallback) {
  // if the game is still active join it
  if (lastUpdateTime) {
    if (!isTimeoutTooLong(lastUpdateTime)) {
      joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback);
      return;
    } else {
      callAsyncCleanupInactiveGames();
    }
  }
  // if we got here, and this is the last game, that means there are no available games
  // so create one
  if (isTheLastGame) {
    console.log('no available games found, only inactive ones, so creating a new one...');
    var gameData = createNewGame(username, peerId);
    joinedGameCallback(gameData, true);
  }
}

function getGameLastUpdateTime(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTimeCallback, isTheLastGame) {
  gameRef.child(ALL_GAMES_LOCATION).child(gameId).once('value', function(data) {
    if (data.val() && data.val().lastUpdateTime) {
      console.log('found update time: ' + data.val().lastUpdateTime)
      doneGettingUpdateTimeCallback(data.val().lastUpdateTime, gameId, isTheLastGame, username, peerId, connectToUsersCallback, joinedGameCallback);
    }
  });
}

function initializeServerPing() {
  setServerStatusAsStillActive();
  window.setInterval(setServerStatusAsStillActive, 10000);
}

function initializeServerHelperWorker() {
  if (typeof(Worker) !== "undefined") {
    myWorker = new Worker("asyncmessager.js");
    myWorker.addEventListener('message', processMessageEvent, false);
  } else {
    console.log("Sorry, your browser does not support Web Workers...");
  }
}

function callAsyncCleanupInactiveGames() {
  // do it on a web worker thread
  if (myWorker) {
    myWorker.postMessage({
      cmd: 'cleanup_inactive_games'
    });
  }
}


function setServerStatusAsStillActive() {
  console.log('pinging server');
  gameRef.child(ALL_GAMES_LOCATION).child(joinedGame).child('lastUpdateTime').set((new Date()).getTime());
}

function cleanupGames() {
  console.log('cleaning up inactive games');
  var gameDataRef = gameRef.child(ALL_GAMES_LOCATION).once('value', function(dataSnapshot) {
    dataSnapshot.forEach(function(childSnapshot) {
      var shouldDeleteGame = false;
      var gameData = childSnapshot.val();
      if (!gameData) {
        shouldDeleteGame = true;
      }
      if (gameData.users == null || gameData.users.length == 0) {
        console.log('game has no users');
        shouldDeleteGame = true;
      }
      if (isTimeoutTooLong(gameData.lastUpdateTime)) {
        console.log("game hasn't been updated since " + gameData.lastUpdateTime);
        shouldDeleteGame = true;
      }

      if (shouldDeleteGame) {
        deleteGame(childSnapshot.name());
        childSnapshot.ref().remove();

      }
    });
  });
}


function isTimeoutTooLong(lastUpdateTime) {
  if (!lastUpdateTime) {
    return false;
  }
  var currentTime = (new Date()).getTime();
  return (currentTime - lastUpdateTime > GAME_CLEANUP_TIMEOUT);
}

function processMessageEvent(event) {
  switch (event.data) {
    case 'cleanup_inactive_games':
      cleanupGames();
      break;
    default:
      break;
  }
}

// another public point of entry
function removePeerFromGame(gameId, peerId) {
  var gameDataRef = gameRef.child(ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.once('value', function(data) {
    if (!data.val()) {
      // something's wrong, probably the Firebase data was deleted
      return;
    }
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
  removeGameFromFullGames(gameId);
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
  initializeServerPing();
  return gameData;
}


function createNewGameId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback) {
  // if a game has already been joined on another thread, don't join another one
  if (joinedGame && joinedGame >= 0) {
    return;
  }
  joinedGame = gameId;
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
  initializeServerPing();
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