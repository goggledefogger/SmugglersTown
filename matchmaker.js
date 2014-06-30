/**
 *  matchmaker.js
 */

/**
 *  deps
 */
//var inherits = require('inherits');
//var EventEmitter = require('events').EventEmitter;

/**
 *  export class
 */
module.exports = MatchmakerTown;

/**
 *  constructor
 */
function MatchmakerTown(firebaseBaseUrl) {
  if (!(this instanceof MatchmakerTown))
    return new MatchmakerTown(firebaseBaseUrl);

  // The root of your game data.
  this.GAME_LOCATION = firebaseBaseUrl;
  this.gameRef = new Firebase(this.GAME_LOCATION);

  this.AVAILABLE_GAMES_LOCATION = 'available_games';
  this.FULL_GAMES_LOCATION = 'full_games';
  this.ALL_GAMES_LOCATION = 'games';
  this.MAX_USERS_PER_GAME = 4;
  this.GAME_CLEANUP_TIMEOUT = 30 * 1000; // in milliseconds

  this.joinedGame = null;
  this.myWorker = null;
  //  EventEmitter.call(this);

}
//inherits(MatchmakerTown, EventEmitter);

/**
 *  connect to a game
 */
MatchmakerTown.prototype.joinOrCreateGame = function(username, peerId, connectToUsersCallback, joinedGameCallback) {
  var self = this;

  callAsyncCleanupInactiveGames.call(this);
  console.log('trying to join game');
  initializeServerHelperWorker.call(this);
  var availableGamesDataRef = gameRef.child(this.AVAILABLE_GAMES_LOCATION);
  availableGamesDataRef.once('value', function(data) {
    // only join a game if one isn't joined already
    if (this.joinedGame == null) {
      this.joinedGame = -1;
      if (data.val() === null) {
        // there are no available games, so create one
        var gameData = createNewGame.call(this, username, peerId);
        joinedGameCallback.call(this, gameData, true);
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
            getGameLastUpdateTime.call(this, gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTime, counter == numAvailableGames);
          }
        }
      }
    }
  });
}


/**
 *  remove a peer from the game
 */
function removePeerFromGame(gameId, peerId) {
  var self = this;

  var gameDataRef = this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.once('value', function(data) {
    if (!data.val()) {
      // something's wrong, probably the Firebase data was deleted
      return;
    }
    if (data.val().hostPeerId == this.peerId) {
      findNewHostPeerId.call(this, gameId, peerId, switchToNewHost);
    }

    // Firebase weirdness: the users array can still have undefined elements
    // which represents users that have left the game. So trim out the 
    // undefined elements to see the actual array of current users
    var numUsersInGame = data.child('users').val().clean(undefined).length;
    data.child('users').forEach(function(childSnapshot) {
      // if we've found the ref that represents the given peer, remove it
      if (childSnapshot.val() && childSnapshot.val().peerId == this.peerId) {
        childSnapshot.ref().remove();
        // if this user was the last one in the game, now there are 0, 
        // so delete the game
        if (numUsersInGame == 1) {
          deleteGame.call(this, gameId);
        } else {
          // if it was full, now it has one open slot, set it to available
          if (numUsersInGame == this.MAX_USERS_PER_GAME) {
            moveGameFromFullToAvailable.call(this, gameId);
          }
        }
      }
    });
  });
}



function doneGettingUpdateTime(lastUpdateTime, gameId, isTheLastGame, username, peerId, connectToUsersCallback, joinedGameCallback) {
  // if the game is still active join it
  if (lastUpdateTime) {
    if (!this.isTimeoutTooLong(lastUpdateTime)) {
      this.joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback);
      return;
    } else {
      this.callAsyncCleanupInactiveGames();
    }
  }
  // if we got here, and this is the last game, that means there are no available games
  // so create one
  if (isTheLastGame) {
    console.log('no available games found, only inactive ones, so creating a new one...');
    var gameData = this.createNewGame(username, peerId);
    joinedGameCallback(gameData, true);
  }
}

function getGameLastUpdateTime(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTimeCallback, isTheLastGame) {
  gameRef.child(this.ALL_GAMES_LOCATION).child(gameId).once('value', function(data) {
    if (data.val() && data.val().lastUpdateTime) {
      console.log('found update time: ' + data.val().lastUpdateTime)
      doneGettingUpdateTimeCallback(data.val().lastUpdateTime, gameId, isTheLastGame, username, peerId, connectToUsersCallback, joinedGameCallback);
    }
  });
}

function initializeServerPing() {
  this.setServerStatusAsStillActive();
  window.setInterval(this.setServerStatusAsStillActive, 10000);
}

function initializeServerHelperWorker() {
  if (typeof(this.Worker) !== "undefined") {
    this.myWorker = new Worker("asyncmessager.js");
    this.myWorker.addEventListener('message', this.processMessageEvent, false);
  } else {
    console.log("Sorry, your browser does not support Web Workers...");
  }
}

function callAsyncCleanupInactiveGames() {
  // do it on a web worker thread
  if (this.myWorker) {
    this.myWorker.postMessage({
      cmd: 'cleanup_inactive_games'
    });
  }
}


function setServerStatusAsStillActive() {
  console.log('pinging server');
  gameRef.child(this.ALL_GAMES_LOCATION).child(this.joinedGame).child('lastUpdateTime').set((new Date()).getTime());
}

function cleanupGames() {
  console.log('cleaning up inactive games');
  var gameDataRef = this.gameRef.child(this.ALL_GAMES_LOCATION).once('value', function(dataSnapshot) {
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
      if (this.isTimeoutTooLong(gameData.lastUpdateTime)) {
        console.log("game hasn't been updated since " + gameData.lastUpdateTime);
        shouldDeleteGame = true;
      }

      if (shouldDeleteGame) {
        this.deleteGame(childSnapshot.name());
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
  return (currentTime - lastUpdateTime > this.GAME_CLEANUP_TIMEOUT);
}

function processMessageEvent(event) {
  switch (event.data) {
    case 'cleanup_inactive_games':
      this.cleanupGames();
      break;
    default:
      break;
  }
}


function findNewHostPeerId(gameId, existingHostPeerId, callback) {
  // reset the hostPeerId so it prevents the leaving host's browser
  // if it tries to switch again before this is done
  this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId).child('hostPeerId').remove();

  this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId).once('value', function(data) {
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
  this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId).child('hostPeerId').set(newHostPeerId);
}

function deleteGame(gameId) {
  this.removeGameFromAvailableGames(gameId);
  this.removeGameFromFullGames(gameId);
  this.removeGame(gameId);
}

function removeGame(gameId) {
  var gameDataRef = this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function createNewGame(username, peerId) {
  console.log('creating new game');
  var gameId = this.createNewGameId();
  var gameData = {
    id: gameId,
    hostPeerId: peerId,
    users: [{
      peerId: peerId,
      username: username
    }]
  }
  var newGameDataRef = this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId);
  newGameDataRef.set(gameData);
  var newAvailableGameDataRef = this.gameRef.child(this.AVAILABLE_GAMES_LOCATION).child(gameId);
  newAvailableGameDataRef.set(gameId);
  this.joinedGame = gameId;
  this.initializeServerPing();
  return gameData;
}


function createNewGameId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback) {
  // if a game has already been joined on another thread, don't join another one
  if (this.joinedGame && this.joinedGame >= 0) {
    return;
  }
  this.joinedGame = gameId;
  this.asyncGetGameData(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, this.doneGettingGameData);
};

function asyncGetGameData(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingGameDataCallback) {
  var gameDataRef = this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId);
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
  if (usersArray.length == this.MAX_USERS_PER_GAME) {
    this.setGameToFull(gameData.id);
  }
  var peerIdsArray = [];
  for (var j = 0; j < gameData.users.length; j++) {
    peerIdsArray.push(gameData.users[j].peerId);
  }
  connectToUsersCallback(peerIdsArray);
  this.initializeServerPing();
  joinedGameCallback(gameData, false);
}

function setGameToFull(gameId) {
  this.removeGameFromAvailableGames(gameId);
  this.addGameToFullGamesList(gameId);
}

function removeGameFromAvailableGames(gameId) {
  var gameDataRef = this.gameRef.child(this.AVAILABLE_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function addGameToFullGamesList(gameId) {
  var gameDataRef = gameRef.child(this.FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.set(gameId);
}

function moveGameFromFullToAvailable(gameId) {
  this.removeGameFromFullGames(gameId);
  this.addGameToAvailableGamesList(gameId);
}

function removeGameFromFullGames(gameId) {
  var gameDataRef = gameRef.child(this.FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function addGameToAvailableGamesList(gameId) {
  var gameDataRef = gameRef.child(this.AVAILABLE_GAMES_LOCATION).child(gameId);
  gameDataRef.set(gameId);
}


// // returns null if the user wasn't found in the game
// function removeUserFromGameData(peerId, gameData) {
//   // if something's wrong, just return
//   if (!gameData || !gameData.users) {
//     return null;
//   }

//   // TODO: Firebase has a better way of doing this
//   var foundPeer = false;

//   // Firebase weirdness: the users array can still have undefined elements
//   // which represents users that have left the game. So trim out the 
//   // undefined elements to see the actual array of current users
//   gameData.users = gameData.users.clean(undefined);

//   usersWithoutPeer = [];
//   for (i = 0; i < gameData.users.length; i++) {
//     if (gameData.users[i].peerId == peerId) {
//       foundPeer = true;
//     } else {
//       usersWithoutPeer.push(gameData.users[i]);
//     }
//   }

//   if (foundPeer) {
//     gameData.users = usersWithoutPeer;
//     return gameData;
//   } else {
//     return null;
//   }