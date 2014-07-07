/**
 *  matchmaker.js
 */

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

  // The root of your session data.
  this.SESSION_LOCATION = firebaseBaseUrl;
  this.sessionRef = new Firebase(this.SESSION_LOCATION);

  this.AVAILABLE_SESSIONS_LOCATION = 'available_sessions';
  this.FULL_SESSIONS_LOCATION = 'full_sessions';
  this.ALL_SESSIONS_LOCATION = 'sessions';
  this.MAX_USERS_PER_SESSION = 4;
  this.SESSION_CLEANUP_TIMEOUT = 30 * 1000; // in milliseconds

  this.joinedSession = null;
  this.myWorker = null;

}

/**
 *  joinOrCreateSession(username, peerId, joinedSessionCallback)
 *
 *  username: Display name of user
 *  peerId: Unique user ID
 *  joinedSessionCallback(sessionData, isNewGame):
 *     Will be called at the end when
 *     we either joined or created a game
 *
 *  sessionData: of this form
 *  {
 *    "hostPeerId": "87b3fvv9ezgaxlxr",
 *    "id": 9116827,
 *    "lastUpdateTime": 1404707577851,
 *    "users": [{
 *      "peerId": "87b3fvv9ezgaxlxr",
 *      "username": "Ninja Roy"
 *    }, {
 *      "peerId": "r6isnaab5aikvs4i",
 *       "username": "Town Crusher"
 *   }]
 *  }
 */
MatchmakerTown.prototype.joinOrCreateSession = function(username, peerId, joinedSessionCallback) {
  var self = this;

  // if there are any inactive sessions clean them up
  callAsyncCleanupInactiveSessions.call(this);
  console.log('trying to join session');
  initializeServerHelperWorker.call(this, window);
  var availableSessionsDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION);
  availableSessionsDataRef.once('value', function(data) {
    // only join a session if one isn't joined already
    if (self.joinedSession == null) {
      self.joinedSession = -1;
      if (data.val() === null) {
        // there are no available sessions, so create one
        var sessionData = createNewSessionData.call(self, username, peerId);
        createNewSessionInFirebase.call(self, username, peerId, sessionData);
        joinedSessionCallback(sessionData, true);
      } else {
        var jsonObj = data.val();
        var sessionId;

        // stupid javascript won't tell me how many session elements
        // are in the jsonObj, so count em up
        var numAvailableSessions = 0;
        for (var key in jsonObj) {
          numAvailableSessions++;
        }

        // iterate through the child sessions and try
        // to join each one
        var counter = 0;
        for (var key in jsonObj) {
          counter++;
          if (jsonObj.hasOwnProperty(key)) {
            sessionId = jsonObj[key];
            getSessionLastUpdateTime.call(
              self,
              sessionId,
              username,
              peerId,
              joinedSessionCallback,
              doneGettingUpdateTime.bind(self),
              counter == numAvailableSessions);
          }
        }
      }
    }
  });
}


/**
 * removePeerFromSession(sessionId, peerId):
 * remove a peer from the session
 *
 */
MatchmakerTown.prototype.removePeerFromSession = function(sessionId, peerId) {
  var self = this;

  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.once('value', function(data) {
    if (!data.val()) {
      // something's wrong, probably the Firebase data was deleted
      return;
    }
    if (data.val().hostPeerId == peerId) {
      findNewHostPeerId.call(self, sessionId, peerId, switchToNewHost);
    }

    // Firebase weirdness: the users array can still have undefined elements
    // which represents users that have left the session. So trim out the 
    // undefined elements to see the actual array of current users
    var numUsersInSession = data.child('users').val().clean(undefined).length;
    data.child('users').forEach(function(childSnapshot) {
      // if we've found the ref that represents the given peer, remove it
      if (childSnapshot.val() && childSnapshot.val().peerId == peerId) {
        childSnapshot.ref().remove();
        // if this user was the last one in the session, now there are 0, 
        // so delete the session
        if (numUsersInSession == 1) {
          deleteSession.call(self, sessionId);
        } else {
          // if it was full, now it has one open slot, set it to available
          if (numUsersInSession == self.MAX_USERS_PER_SESSION) {
            moveSessionFromFullToAvailable.call(self, sessionId);
          }
        }
      }
    });
  });
}

/*
 * switchToNewHost(sessionId, newHostPeerId):
 * if for whatever reason there is a new host, store that in Firebase
 *
 */
MatchmakerTown.prototype.switchToNewHost = function(sessionId, newHostPeerId) {
  if (!newHostPeerId) {
    return;
  }
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).child('hostPeerId').set(newHostPeerId);
}


/*
 * private functions
 */

function createNewSessionData(username, peerId) {
  var sessionId = createNewSessionId.call(this);
  return {
    id: sessionId,
    hostPeerId: peerId,
    users: [{
      peerId: peerId,
      username: username
    }]
  };
}

function doneGettingUpdateTime(lastUpdateTime, sessionId, isTheLastSession, username, peerId, joinedSessionCallback) {
  // if the session is still active join it
  if (lastUpdateTime) {
    if (!isTimeoutTooLong.call(this, lastUpdateTime)) {
      joinExistingSession.call(this, sessionId, username, peerId, joinedSessionCallback);
      return;
    } else {
      callAsyncCleanupInactiveSessions.call(this);
    }
  }
  // if we got here, and this is the last session, that means there are no available sessions
  // so create one
  if (isTheLastSession) {
    console.log('no available sessions found, only inactive ones, so creating a new one...');
    var sessionData = createNewSessionData.call(this, username, peerId);
    createNewSessionInFirebase.call(this, username, peerId, sessionData);
    joinedSessionCallback(sessionData, true);
  }
}

function getSessionLastUpdateTime(sessionId, username, peerId, joinedSessionCallback, doneGettingUpdateTimeCallback, isTheLastSession) {
  var self = this;
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).once('value', function(data) {
    if (data.val() && data.val().lastUpdateTime) {
      console.log('found update time: ' + data.val().lastUpdateTime)
      doneGettingUpdateTimeCallback(data.val().lastUpdateTime, sessionId, isTheLastSession, username, peerId, joinedSessionCallback, self);
    }
  });
}

function initializeServerPing() {
  setServerStatusAsStillActive.call(this);
  window.setInterval(setServerStatusAsStillActive.bind(this), 10000);
}

function initializeServerHelperWorker(windowObject) {
  if (typeof(windowObject.Worker) !== "undefined") {
    //TODO: make this a module
    this.myWorker = new Worker("asyncmessager.js");
    this.myWorker.addEventListener('message', processMessageEvent.bind(this), false);
  } else {
    console.log("Sorry, your browser does not support Web Workers...");
    // fine, we'll do it synchronously
    cleanupSessions.call(this);
  }
}

function callAsyncCleanupInactiveSessions() {
  // do it on a web worker thread
  if (this.myWorker) {
    this.myWorker.postMessage({
      cmd: 'cleanup_inactive_sessions'
    });
  }
}

function setServerStatusAsStillActive() {
  console.log('pinging server');
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(this.joinedSession).child('lastUpdateTime').set((new Date()).getTime());
}

function cleanupSessions() {
  var self = this;

  console.log('cleaning up inactive sessions');
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).once('value', function(dataSnapshot) {
    dataSnapshot.forEach(function(childSnapshot) {
      var shouldDeleteSession = false;
      var sessionData = childSnapshot.val();
      if (!sessionData) {
        shouldDeleteSession = true;
      }
      if (sessionData.users == null || sessionData.users.length == 0) {
        console.log('session has no users');
        shouldDeleteSession = true;
      }
      if (isTimeoutTooLong.call(self, sessionData.lastUpdateTime)) {
        console.log("session hasn't been updated since " + sessionData.lastUpdateTime);
        shouldDeleteSession = true;
      }

      if (shouldDeleteSession) {
        deleteSession.call(self, childSnapshot.name());
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
  return (currentTime - lastUpdateTime > this.SESSION_CLEANUP_TIMEOUT);
}

function processMessageEvent(event) {
  switch (event.data) {
    case 'cleanup_inactive_sessions':
      cleanupSessions.call(this);
      break;
    default:
      break;
  }
}

function findNewHostPeerId(sessionId, existingHostPeerId, callback) {
  var self = this;

  // reset the hostPeerId so it prevents the leaving host's browser
  // if it tries to switch again before this is done
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).child('hostPeerId').remove();

  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).once('value', function(data) {
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
        callback(sessionId, users[i].peerId);
      }
    }
    callback(sessionId, null);
  });
}

function deleteSession(sessionId) {
  removeSessionFromAvailableSessions.call(this, sessionId);
  removeSessionFromFullSessions.call(this, sessionId);
  removeSession.call(this, sessionId);
}

function removeSession(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.remove();
}

function createNewSessionInFirebase(username, peerId, sessionData) {
  console.log('creating new session');
  var newSessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionData.id);
  newSessionDataRef.set(sessionData);
  var newAvailableSessionDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION).child(sessionData.id);
  newAvailableSessionDataRef.set(sessionData.id);
  this.joinedSession = sessionData.id;
  initializeServerPing.call(this);
}

function createNewSessionId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingSession(sessionId, username, peerId, joinedSessionCallback) {
  // if a session has already been joined on another thread, don't join another one
  if (this.joinedSession && this.joinedSession >= 0) {
    return;
  }
  this.joinedSession = sessionId;
  asyncGetSessionData.call(this, sessionId, username, peerId, joinedSessionCallback.bind(this), doneGettingSessionData.bind(this));
};

function asyncGetSessionData(sessionId, username, peerId, joinedSessionCallback, doneGettingSessionDataCallback) {
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.once('value', function(data) {
    doneGettingSessionDataCallback(data, username, peerId, joinedSessionCallback);
  });
}

function doneGettingSessionData(sessionDataSnapshot, username, peerId, joinedSessionCallback) {
  var sessionData = sessionDataSnapshot.val();
  var newUser = {
    peerId: peerId,
    username: username
  };
  // weirdness: i want to just push newUser onto sessionData.users, but
  // that messes up the array I guess
  var usersArray = [];
  for (var i = 0; i < sessionData.users.length; i++) {
    if (sessionData.users[i]) {
      usersArray.push(sessionData.users[i]);
    }
  }
  usersArray.push(newUser);
  sessionData.users = usersArray;
  var sessionDataRef = sessionDataSnapshot.ref();
  sessionDataRef.set(sessionData);
  console.log('joining session ' + sessionData.id);
  // Firebase weirdness: the users array can still have undefined elements
  // which represents users that have left the session. So trim out the 
  // undefined elements to see the actual array of current users
  if (usersArray.length == this.MAX_USERS_PER_SESSION) {
    setSessionToFull.call(this, sessionData.id);
  }
  var peerIdsArray = [];
  for (var j = 0; j < sessionData.users.length; j++) {
    peerIdsArray.push(sessionData.users[j].peerId);
  }
  initializeServerPing.call(this);
  joinedSessionCallback(sessionData, false);
}

function setSessionToFull(sessionId) {
  removeSessionFromAvailableSessions.call(this, sessionId);
  addSessionToFullSessionsList.call(this, sessionId);
}

function removeSessionFromAvailableSessions(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.remove();
}

function addSessionToFullSessionsList(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.FULL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.set(sessionId);
}

function moveSessionFromFullToAvailable(sessionId) {
  removeSessionFromFullSessions.call(this, sessionId);
  addSessionToAvailableSessionsList.call(this, sessionId);
}

function removeSessionFromFullSessions(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.FULL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.remove();
}

function addSessionToAvailableSessionsList(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.set(sessionId);
}


// // returns null if the user wasn't found in the session
// function removeUserFromSessionData(peerId, sessionData) {
//   // if something's wrong, just return
//   if (!sessionData || !sessionData.users) {
//     return null;
//   }

//   // TODO: Firebase has a better way of doing this
//   var foundPeer = false;

//   // Firebase weirdness: the users array can still have undefined elements
//   // which represents users that have left the session. So trim out the 
//   // undefined elements to see the actual array of current users
//   sessionData.users = sessionData.users.clean(undefined);

//   usersWithoutPeer = [];
//   for (i = 0; i < sessionData.users.length; i++) {
//     if (sessionData.users[i].peerId == peerId) {
//       foundPeer = true;
//     } else {
//       usersWithoutPeer.push(sessionData.users[i]);
//     }
//   }

//   if (foundPeer) {
//     sessionData.users = usersWithoutPeer;
//     return sessionData;
//   } else {
//     return null;
//   }