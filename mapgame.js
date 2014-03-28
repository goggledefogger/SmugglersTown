/* YOUR SMUGGLER MISSION, IF YOU CHOOSE TO ACCEPT, IS TO JOIN TEAM
 * TOWN AND TRY TO DEFEAT TEAM CRUSH.  AND YOU MUST ACCEPT...
 */

var keepAliveParamName = 'keepalive';
var qs = new QueryString();

// TODO: use require.js to load utilities and matchmaker.js instead of 
// loading them in order in mapgame.html

var map; // the map canvas from the Google Maps v3 javascript API
var mapZoomLevel = 18;
var mapData; // the level data for this map (base locations)

var itemMapObject = null;
// the itemMapObject will be of this form:
// {
//   location: <google_maps_LatLng_object>,
//   marker: <google_maps_Marker_object>
// }

// default to the grand canyon, but this will be loaded from a map file
var mapCenter = new google.maps.LatLng(36.151103, -113.208565);

// team data
// the team objects will be of this form:
// {
//   users: [{
//     peerId: 123456789,
//     username: 'roy'
//   }, {
//     peerId: 987654321,
//     username: 'ham'
//   }],
//   baseObject: {
//     location: {
//       lat: 34,
//       lng: -133
//     }
//   },
//   numItemsReturned: 0
// }
var teamTownObject = {
  users: [],
  baseObject: {
    location: {
      lat: 36.151103,
      lng: -113.208565
    }
  },
  numItemsReturned: 0
};
var teamCrushObject = {
  users: [],
  baseObject: {
    location: {
      lat: 36.151103,
      lng: -113.208565
    }
  },
  numItemsReturned: 0
};

// for time-based game loop
var now;
var dt = 0;
var last = timestamp();
var step = 1 / 60;

// user data
var username = null;

// game hosting data
var gameId = null;
var hostPeerId = null;

// car properties
var rotation = 0;
var deceleration = 1.1;
var maxSpeed = 18;
var rotationCss = '';
var arrowRotationCss = '';
var latitudeSpeedFactor = 1000000;
var longitudeSpeedFactor = 500000;

// collision engine info
var carToItemCollisionDistance = 20;
var carToBaseCollisionDistance = 43;

// map data
var mapDataLoaded = false;
var widthOfAreaToPutItems = 0.008; // in latitude degrees
var heightOfAreaToPutItems = 0.008; // in longitude degrees
var minItemDistanceFromBase = 300;

// these map objects will be of the form:
// {
//   location: <google_maps_LatLng_object>,
//   marker: <google_maps_Marker_object>
// }
var teamTownBaseMapObject = {
  location: mapCenter,
  marker: null
}
var teamCrushBaseMapObject = null;
var myTeamBaseMapObject = teamTownBaseMapObject;

// gameplay

var gameDataObject = {
  teamTownObject: teamTownObject,
  teamCrushObject: teamCrushObject,
  peerIdOfCarWithItem: null,
};
// this will be of the form
// {
//   teamTownObject: <team_object>,
//   teamCrushObject: <team_object>,
//   peerIdOfCarWithItem: null,
//   itemObject: {
//     id: 576,
//     location: {
//       lat: 34,
//       lng: -133
//     }
//   }
// }


var collectedItem = null;
// set the initial destination to whatever, it will be reset 
// when an item is first placed
var destination = new google.maps.LatLng(45.489391, -122.647586);
var timeDelayBetweenTransfers = 1000; // in ms
var timeOfLastTransfer = null;

// object of the other users
var otherUsers = {};
// the otherUsers data will be of this form:
// {
//   123456789: {
//     peerId: 12346789,
//     username: helloroy,
//     car: {
//       location: <location_object>,
//       marker: <marker_object>
//     },
//     peerJsConnection: <peerJsConnection_object>,
//     lastUpdateTime: <time_object>,
//     numItems: 0,
//     hasBeenInitialized: true
//   },
//   987654321: {
//     peerId: 987654321,
//     username: towntown9000,
//     car: {
//       location: <location_object>,
//       marker: <marker_object>
//     },
//     peerJsConnection: <peerJsConnection_object>,
//     lastUpdateTime: <time_object>,
//     numItems: 5
//   }
// }

// images
var itemIcon = {
  url: 'images/smoking_toilet_small.gif'
};

var otherCarIcon = {
  url: 'images/car_red.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(16, 32)
};

var teamTownBaseIcon = {
  url: 'images/fort.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};

var teamCrushBaseIcon = {
  url: 'images/opponent_fort.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};

var teamTownBaseTransparentIcon = {
  url: 'images/fort_transparent.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};

var teamCrushBaseTransparentIcon = {
  url: 'images/opponent_fort_transparent.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};


// peer JS connection (for multiplayer webRTC)
var peer = new Peer({
  key: 'j3m0qtddeshpk3xr'
});
peer.on('open', function(id) {
  console.log('My peer ID is: ' + id);
  $('#peer-id').text(id);
  $('#peer-connection-status').text('waiting for a smuggler to battle...');
});
peer.on('connection', connectedToPeer);
var ACTIVE_CONNECTION_TIMEOUT_IN_SECONDS = 30 * 1000;


function initialize() {
  username = prompt('Choose your Smuggler Name:', 'Ninja Roy');
  loadMapData(mapIsReady);

  // these are set to true when keys are being pressed
  rightDown = false;
  leftDown = false;
  upDown = false;
  downDown = false;

  speed = 0;
  rotation = 0;
  horizontalSpeed = 0;
  rotationCss = '';

  //tryFindingLocation();
  createMapOnPage();

  bindKeyAndButtonEvents();

  // start the game loop
  requestAnimationFrame(frame);
}

function mapIsReady() {
  joinOrCreateGame(username, peer.id, connectToAllNonHostUsers, gameJoined)
}

function gameJoined(gameData, isNewGame) {
  gameId = gameData.id;
  if (isNewGame) {
    // we're hosting the game ourself
    hostPeerId = peer.id;
    // first user is always on team town
    gameDataObject.teamTownObject.users = [{
      peerId: peer.id,
      username: username
    }];
    $('#team-town-text').css('background-color', 'red');
  } else {
    // someone else is already the host
    hostPeerId = gameData.hostPeerId;
    activateTeamCrushInUI();
  }
  updateUsernamesInUI();
}

function updateUsernamesInUI() {
  var teamTownJqueryElem = $('#team-town-usernames');
  updateTeamUsernamesInUI(teamTownJqueryElem, gameDataObject.teamTownObject.users);
  var teamCrushJqueryElem = $('#team-crush-usernames');
  updateTeamUsernamesInUI(teamCrushJqueryElem, gameDataObject.teamCrushObject.users);
}


function updateTeamUsernamesInUI(teamUsernamesJqueryElem, userObjectsArray) {
  // clear the current list of usernames
  teamUsernamesJqueryElem.empty();
  for (var i = 0; i < userObjectsArray.length; i++) {
    var newJqueryElem = $($.parseHTML(
      '<li id="username-' +
      userObjectsArray[i].peerId +
      '">' + userObjectsArray[i].username + '</li>'
    ));
    $(teamUsernamesJqueryElem).append(newJqueryElem);
    // reset my username to be highlighted, in case it wasn't done before
    $('#username-' + peer.id).css('background-color', 'red');
  }
}

function activateTeamCrushInUI() {
  $('#team-crush-text').css('opacity', '1');
  var teamCrushScore = 0;
  if (gameDataObject.teamCrushObject.numItemsReturned) {
    teamCrushScore = gameDataObject.teamCrushObject.numItemsReturned;
  }
  $('#num-items-team-crush').text(teamCrushScore);
}


function connectToAllNonHostUsers(nonHostPeerIds) {
  for (var i = 0; i < nonHostPeerIds.length; i++) {
    if (nonHostPeerIds[i] != peer.id) {
      connectToPeer(nonHostPeerIds[i]);
    }
  }
}

function bindKeyAndButtonEvents() {
  $(window).resize(function() {
    resizeMapToFit();
  });

  $(document).keydown(onKeyDown);
  $(document).keyup(onKeyUp);
  $('#connect-button').click(function(evt) {
    var peerId = $('#peer-id-textbox').val();
    console.log('peer id connecting: ' + peerId);
    connectToPeer(peerId);
  });
  $('#set-center-button').click(function(evt) {
    var searchTerm = $('#map-center-textbox').val();
    if (!searchTerm) {
      return;
    }
    console.log('setting center to: ' + searchTerm);
    newLocation = searchAndCenterMap(searchTerm);
    broadcastNewLocation(newLocation);
    randomlyPutItems();
  });
  window.onbeforeunload = disconnectFromGame;
}

function disconnectFromGame() {
  if (peer && peer.id && gameId) {
    removePeerFromGame(gameId, peer.id);
  }
}

function createMapOnPage() {
  var mapOptions = {
    zoom: mapZoomLevel,
    center: mapCenter,
    keyboardShortcuts: false,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    disableDefaultUI: true,
    minZoom: mapZoomLevel,
    maxZoom: mapZoomLevel,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    draggable: false,
  }

  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  // not necessary, just want to allow the right-click context menu
  google.maps.event.addListener(map, 'click', function(e) {
    contextmenu: true
  });
  google.maps.event.addListener(map, "rightclick", showContextMenu);

  resizeMapToFit();
}

function resizeMapToFit() {
  $('body').height($(window).height() - 2);
  var mainHeight = $('body').height();
  var contentHeight =
    $('#header').outerHeight() +
    $('#footer').outerHeight();
  var h = mainHeight - contentHeight;
  $('#map-body').height(h);
}

function searchAndCenterMap(searchTerm) {
  var parts = searchTerm.split(',');
  if (!parts) {
    // bad search input, must be in lat,lng form
    return;
  }
  var latString = parts[0];
  var lngString = parts[1];
  var location = new google.maps.LatLng(latString, lngString);
  setGameToNewLocation(latString, lngString);
  return location;
}

function loadMapData(mapIsReadyCallback) {
  mapDataLoaded = false;
  console.log('loading map data');
  $.getJSON("maps/grandcanyon.json", function(json) {
    console.log('map data loaded');
    mapData = json;
    mapDataLoaded = true;
    mapCenter = new google.maps.LatLng(mapData.map.centerLatLng.lat, mapData.map.centerLatLng.lng);
    map.setCenter(mapCenter);
    var teamTownBaseLocation = new google.maps.LatLng(mapData.map.teamTownBaseLatLng.lat, mapData.map.teamTownBaseLatLng.lng);
    teamTownBaseMapObject.marker = new google.maps.Marker({
      title: 'Team Town Base',
      map: map,
      position: teamTownBaseLocation,
      icon: teamTownBaseIcon
    });
    gameDataObject.teamCrushObject.baseObject = createTeamCrushBase(
      mapData.map.teamCrushBaseLatLng.lat,
      mapData.map.teamCrushBaseLatLng.lng
    );
    var teamCrushBaseLocation = new google.maps.LatLng(
      mapData.map.teamCrushBaseLatLng.lat,
      mapData.map.teamCrushBaseLatLng.lng
    );
    teamCrushBaseMapObject.marker = new google.maps.Marker({
      title: 'Team Crush Base',
      map: map,
      position: teamCrushBaseLocation,
      icon: teamCrushBaseIcon
    });
    randomlyPutItems();
    mapIsReadyCallback();
  });
}

function createTeamCrushMapObject(baseLat, baseLng) {
  var teamCrushBaseLocation = new google.maps.LatLng(mapData.map.teamTownBaseLatLng.lat, mapData.map.teamTownBaseLatLng.lng);
  teamCrushBaseMapObject.marker = new google.maps.Marker({
    title: 'Team Crush Base',
    map: map,
    position: teamCrushBaseLocation,
    icon: teamTownBaseIcon
  });
}

function createTeamCrushBase(lat, lng) {
  // if there's already a team Crush base on the map, remove it
  if (teamCrushBaseMapObject && teamCrushBaseMapObject.marker) {
    teamCrushBaseMapObject.marker.setMap(null);
  }

  var teamCrushBaseObject = {};
  teamCrushBaseObject.location = {
    lat: lat,
    lng: lng
  };

  teamCrushBaseMapObject = {};
  teamCrushBaseMapObject.location = new google.maps.LatLng(teamCrushBaseObject.location.lat, teamCrushBaseObject.location.lng);
  teamCrushBaseMapObject.marker = new google.maps.Marker({
    title: 'Team Crush Base',
    map: map,
    position: teamCrushBaseMapObject.location,
    icon: teamCrushBaseIcon
  });

  return teamCrushBaseObject;
}

function randomlyPutItems() {
  var randomLocation = getRandomLocationForItem();
  var itemId = getRandomInRange(1, 1000000, 0);
  gameDataObject.itemObject = {
    id: itemId,
    location: {
      lat: randomLocation.lat(),
      lng: randomLocation.lng()
    }
  }
  putNewItemOnMap(randomLocation, itemId);
  broadcastNewItem(randomLocation, itemId);
}

function getRandomLocationForItem() {
  // Find a random location that works, and if it's too close
  // to the base, pick another location
  var randomLocation = null;
  while (true) {
    randomLat = getRandomInRange(mapCenter.lat() -
      (widthOfAreaToPutItems / 2.0), mapCenter.lat() + (widthOfAreaToPutItems / 2.0), 7);
    randomLng = getRandomInRange(mapCenter.lng() -
      (heightOfAreaToPutItems / 2.0), mapCenter.lng() + (heightOfAreaToPutItems / 2.0), 7);
    console.log('trying to put item at: ' + randomLat + ',' + randomLng);
    randomLocation = new google.maps.LatLng(randomLat, randomLng);
    if (google.maps.geometry.spherical.computeDistanceBetween(randomLocation, teamTownBaseMapObject.location) > minItemDistanceFromBase) {
      return randomLocation;
    }
    console.log('item too close to base, choosing another location...');
  }
}

function putNewItemOnMap(location, itemId) {
  // eventually this should be redundant to clear this, but while
  // there's a bug on multiplayer joining, clear it again
  collectedItem = null;

  // set the base icon images to be the lighter ones
  teamTownBaseMapObject.marker.setIcon(teamTownBaseTransparentIcon);
  teamCrushBaseMapObject.marker.setIcon(teamCrushBaseTransparentIcon);

  // in case there's a lingering item, remove it
  if (itemMapObject && itemMapObject.marker && itemMapObject.marker.map) {
    itemMapObject.marker.setMap(null);
  }

  var itemMarker = new google.maps.Marker({
    map: map,
    title: 'Item',
    icon: itemIcon,
    //TODO: FIX STUPID GOOGLE MAPS BUG that causes the gif marker
    //      to mysteriously not show up sometimes
    //optimized: false,
    position: location
  });

  itemMapObject = {
    marker: itemMarker,
    location: location
  };

  gameDataObject.itemObject.location = {
    lat: location.lat(),
    lng: location.lng()
  };

  setDestination(location, 'arrow.png');
  return itemId;
}


function moveCar() {
  // if Up or Down key is pressed, change the speed. Otherwise,
  // decelerate at a standard rate
  if (upDown || downDown) {
    if (upDown) {
      if (speed <= maxSpeed) {
        speed += 1;
      }
    }
    if (downDown) {
      if (speed >= -maxSpeed) {
        speed -= 1;
      }
    }

  } else {
    if (speed > -0.01 && speed < 0.01) {
      speed = 0;
    } else {
      speed /= deceleration;
    }
  }

  // if Left or Right key is pressed, change the horizontal speed.
  // Otherwise, decelerate at a standard rate
  if (leftDown || rightDown) {
    if (rightDown) {
      if (horizontalSpeed <= maxSpeed) {
        horizontalSpeed += 1;
      }
    }
    if (leftDown) {
      if (horizontalSpeed >= -maxSpeed) {
        horizontalSpeed -= 1;
      }
    }
  } else {
    if (horizontalSpeed > -0.01 && horizontalSpeed < 0.01) {
      horizontalSpeed = 0;
    } else {
      horizontalSpeed /= deceleration;
    }
  }

  // optimization - only if the car is moving should we spend
  // time resetting the map
  if (speed != 0 || horizontalSpeed != 0) {
    newLat = map.getCenter().lat() + (speed / latitudeSpeedFactor);
    newLng = map.getCenter().lng() + (horizontalSpeed / longitudeSpeedFactor);
    mapCenter = new google.maps.LatLng(newLat, newLng);
    map.setCenter(mapCenter);

  }

  rotateCar();
  if (teamTownBaseMapObject.location) {
    rotateArrow();
  }
}

function connectToPeer(otherUserPeerId) {
  console.log('trying to connect to ' + otherUserPeerId);
  $('#peer-connection-status').text('trying to connect to ' + otherUserPeerId);
  var peerJsConnection = peer.connect(otherUserPeerId);
  peerJsConnection.on('open', function() {
    console.log('connection open');
    connectedToPeer(peerJsConnection);
  });
  peerJsConnection.on('error', function(err) {
    alert(err);
  });
}

function connectedToPeer(peerJsConnection) {
  var otherUserPeerId = peerJsConnection.peer;
  console.log('connected to ' + otherUserPeerId);
  $('#peer-connection-status').text('connected to ' + otherUserPeerId);

  // if this is the first time we've connected to this uesr,
  // add the HTML for the new user
  if (!otherUsers[otherUserPeerId] || !otherUsers[otherUserPeerId].peerJsConnection) {
    initializePeerConnection(peerJsConnection, otherUserPeerId);
    assignUserToTeam(otherUserPeerId);
  }
  addCarDataToUserObject(otherUserPeerId);
  updateUsernamesInUI();
}

function assignUserToTeam(otherUserPeerId) {
  // if the user is already on a team, ignore this
  if (isUserOnTeam(otherUserPeerId, gameDataObject.teamTownObject.users) ||
    isUserOnTeam(otherUserPeerId, gameDataObject.teamCrushObject.users)) {
    return;
  }

  var userObject = {
    peerId: otherUserPeerId,
    username: null
  };
  // for now, just alternate who goes on each team
  if (gameDataObject.teamTownObject.users.length > gameDataObject.teamCrushObject.users.length) {
    activateTeamCrushInUI();
    gameDataObject.teamCrushObject.users.push(userObject);
  } else {
    gameDataObject.teamTownObject.users.push(userObject);
  }
}

function isUserOnTeam(peerId, userObjectsArray) {
  for (var i = 0; i < userObjectsArray.length; i++) {
    if (userObjectsArray[i].peerId == peerId) {
      return true;
    }
  }
  return false;
}

function assignMyTeamInUI() {
  if (userIsOnTownTeam(peer.id)) {
    $('#team-town-text').css('background-color', 'red');
    $('#team-crush-text').css('background-color', '#667');
  } else {
    $('#team-crush-text').css('background-color', 'red');
    $('#team-town-text').css('background-color', '#666');
  }
}

function initializePeerConnection(peerJsConnection, otherUserPeerId) {
  if (!otherUsers[otherUserPeerId]) {
    otherUsers[otherUserPeerId] = {};
  }
  otherUsers[otherUserPeerId].peerJsConnection = peerJsConnection;
  otherUsers[otherUserPeerId].peerJsConnection.on('close', function() {
    console.log('closing connection');
    otherUserDisconnected(otherUserPeerId);
  });
  otherUsers[otherUserPeerId].peerJsConnection.on('data', function(data) {
    dataReceived(data);
  });
}

function fadeArrowToImage(imageFileName) {
  $("#arrow-img").attr('src', 'images/' + imageFileName);
}

function otherUserDisconnected(otherUserPeerId) {
  // should be called after the peerJs connection
  // has already been closed
  if (!otherUsers[otherUserPeerId]) {
    return;
  }

  removeUserFromTeam(otherUserPeerId);
  removeUserFromUI(otherUserPeerId);

  // if I am the host, I'll be the one to tell Firebase to remove this other user
  if (hostPeerId == peer.id) {
    removePeerFromGame(gameId, otherUserPeerId);
    // not sure if we want to do this, but to keep things in sync, might
    // as well broadcast the game state to all users
    broadcastGameStateToAllPeers();
  } else {
    // if the user who disconnected was the host, I should become a new host
    if (hostPeerId == otherUserPeerId) {
      // TODO: figure out how to only do this if the disconnect was initiated
      // by the existing host. We don't want this code to run if this user
      // was the one to disconnect

      // switchToNewHost(gameId, peer.id);
      // hostPeerId = peer.id;
    }
  }

  // delete that user's data
  delete otherUsers[otherUserPeerId];

  // if there are no users left, show the waiting message
  if (Object.keys(otherUsers).length == 0) {
    $('#peer-connection-status').text('waiting for a smuggler to battle...');
  }

}

function removeUserFromTeam(userPeerId) {
  for (var i = gameDataObject.teamTownObject.users.length - 1; i >= 0; i--) {
    if (gameDataObject.teamTownObject.users[i].peerId == userPeerId) {
      gameDataObject.teamTownObject.users.splice(i, 1);
    }
  }
  for (var j = gameDataObject.teamCrushObject.users.length - 1; j >= 0; j--) {
    if (gameDataObject.teamCrushObject.users[j].peerId == userPeerId) {
      gameDataObject.teamCrushObject.users.splice(j, 1);
    }
  }
}

function removeUserFromUI(peerId) {
  // remove the other user's car from the map
  otherUsers[peerId].car.marker.setMap(null);

  // if their team has no more users, grey out
  // their score box
  if (gameDataObject.teamCrushObject.users.length == 0) {
    $('#team-crush-text').css('opacity', '0.3');
  }
}

function otherUserChangedLocation(lat, lng) {
  setGameToNewLocation(lat, lng);
}

function broadcastGameStateToAllPeers() {
  for (var user in otherUsers) {
    broadcastGameState(user);
  }
}

function dataReceived(data) {
  if (data.peerId) {
    // if we are the host, and the user who sent this data hasn't been given the initial game
    // state, then broadcast it to them
    if (otherUsers[data.peerId] && !otherUsers[data.peerId].hasBeenInitialized && hostPeerId == peer.id) {
      otherUsers[data.peerId].hasBeenInitialized = true;
      // not sure if we should do this or not, but at least it resets the game
      // state to what we, the host, think it is
      broadcastGameStateToAllPeers();
      // if not that, then we should just broadcast to the new guy like this:
      // broadcastGameState(data.peerId);
    }
    otherUsers[data.peerId].lastUpdateTime = (new Date()).getTime();
  }

  if (data.event) {
    if (data.event.name == 'update_game_state') {
      console.log('received event: update game state');
      gameDataObject = data.event.gameDataObject;
      // need to make this call because we can be in a situation where the host
      // doesn't know our username yet, so we need to manually set it in our
      // own UI first.
      updateUsername(peer.id, username);
      updateUIWithNewGameState();
      assignMyTeamBase();
    }
    if (data.event.name == 'new_location') {
      console.log('received event: new location ' + data.event.lat + ',' + data.event.lng);
      if (data.event.originating_peer_id != peer.id) {
        otherUserChangedLocation(data.event.lat, data.event.lng);
        return;
      }
    }
    if (data.event.name == 'item_collected') {
      console.log('received event: item collected by ' + data.event.user_id_of_car_with_item);
      if (data.event.user_id_of_car_with_item != peer.id) {
        otherUserCollectedItem(data.event.user_id_of_car_with_item);
      }
    }
    if (data.event.name == 'new_item') {
      console.log('received event: new item at ' +
        data.event.location.lat + ',' + data.event.location.lng +
        ' with id ' + data.event.id);
      gameDataObject.peerIdOfCarWithItem = null;
      // Only update if someone else caused the new item placement.
      // if this user did it, it was already placed
      if (data.event.host_user && data.event.host_user != peer.id) {
        var itemLocation = new google.maps.LatLng(data.event.location.lat, data.event.location.lng);
        putNewItemOnMap(itemLocation, data.event.id);
      }

    }
    if (data.event.name == 'item_returned') {
      console.log('received event: item returned by user ' + data.event.user_id_of_car_that_returned_item + ' which gives them ' + data.event.now_num_items);
      gameDataObject.peerIdOfCarWithItem = null;
      if (data.event.user_id_of_car_that_returned_item != peer.id) {
        teamTownBaseMapObject.marker.setIcon(teamTownBaseTransparentIcon);
        teamCrushBaseMapObject.marker.setIcon(teamCrushBaseTransparentIcon);
        otherUserReturnedItem(data.event.user_id_of_car_that_returned_item, data.event.now_num_items);
      }
    }
    if (data.event.name == 'item_transferred') {
      console.log('received event: item ' + data.event.id + ' transferred by user ' + data.event.fromUserPeerId + ' to user ' + data.event.toUserPeerId);
      gameDataObject.peerIdOfCarWithItem = data.event.toUserPeerId;
      if (data.event.toUserPeerId == peer.id) {
        // the item was transferred to this user
        gameDataObject.itemObject = {
          id: data.event.id,
          location: null
        };
        timeOfLastTransfer = (new Date()).getTime();
        console.log('someone transferred at ' + timeOfLastTransfer);
        userCollidedWithItem(gameDataObject.itemObject);
      } else {
        // set the arrow to point to the new user who has the item
        destination = otherUsers[data.event.toUserPeerId].car.location;
      }
    }
  }

  // if the user sent a username that we haven't seen yet, set it
  if (data.peerId && data.username && !otherUsers[data.peerId].username) {
    updateUsername(data.peerId, data.username);
  }

  if (data.peerId && data.carLatLng && otherUsers[data.peerId] && otherUsers[data.peerId].car) {
    moveOtherCar(otherUsers[data.peerId], new google.maps.LatLng(data.carLatLng.lat, data.carLatLng.lng));
  }
}

function assignMyTeamBase() {
  if (userIsOnTownTeam(peer.id)) {
    myTeamBaseMapObject = teamTownBaseMapObject;
  } else {
    myTeamBaseMapObject = teamCrushBaseMapObject;
  }
}

function updateUsername(peerId, username) {
  for (var i = 0; i < gameDataObject.teamTownObject.users.length; i++) {
    if (gameDataObject.teamTownObject.users[i].peerId == peerId) {
      gameDataObject.teamTownObject.users[i].username = username;
    }
  }
  for (var j = 0; j < gameDataObject.teamCrushObject.users.length; j++) {
    if (gameDataObject.teamCrushObject.users[j].peerId == peerId) {
      gameDataObject.teamCrushObject.users[j].username = username;
    }
  }
  updateUsernamesInUI();
}

function updateUIWithNewGameState() {
  updateUsernamesInUI();
  // if someone has the item
  if (gameDataObject.peerIdOfCarWithItem) {
    itemMapObject.marker.setMap(null);
    // if I have the item, make the destination my team's base
    if (gameDataObject.peerIdOfCarWithItem == peer.id) {
      setDestination(myTeamBaseMapObject.location, 'arrow_blue.png');
    } else {
      // another user has the item, but the setDestination call
      // will be taken care of when the user sends their location data
    }
  } else {
    // if nobody has the item, put it on the map in the right place,
    // and set the new item location as the destination
    if (gameDataObject.itemObject && gameDataObject.itemObject.location) {
      moveItemOnMap(gameDataObject.itemObject.location.lat, gameDataObject.itemObject.location.lng);
    }
    setDestination(itemMapObject.location, 'arrow.png');
  }
  updateScoresInUI(gameDataObject.teamTownObject.numItemsReturned, gameDataObject.teamCrushObject.numItemsReturned);
  assignMyTeamInUI();
}

function updateScoresInUI(teamTownNumItemsReturned, teamCrushNumItemsReturned) {
  $('#num-items-team-town').text(teamTownNumItemsReturned);
  flashElement($('#num-items-team-town'));
  $('#num-items-team-crush').text(teamCrushNumItemsReturned);
  flashElement($('#num-items-team-crush'));
}

function moveItemOnMap(lat, lng) {
  console.log('moving item to new location: ' + lat + ',' + lng);
  gameDataObject.itemObject.location.lat = lat;
  gameDataObject.itemObject.location.lng = lng;
  itemMapObject.location = new google.maps.LatLng(lat, lng);
  itemMapObject.marker.setPosition(itemMapObject.location);
}

function addCarDataToUserObject(peerId) {
  if (!otherUsers[peerId]) {
    otherUsers[peerId] = {};
  }
  var otherCarMarker = new google.maps.Marker({
    map: map,
    title: peerId,
    icon: otherCarIcon
  });

  otherUsers[peerId].peerId = peerId;
  otherUsers[peerId].car = {
    marker: otherCarMarker
  };
}

function otherUserReturnedItem(otherUserPeerId, nowNumItemsForUser) {
  gameDataObject.peerIdOfCarWithItem = null;
  incrementItemCount(userIsOnTownTeam(otherUserPeerId))
  fadeArrowToImage('arrow.png');
}

function moveOtherCar(otherUserObject, newLocation) {
  otherUserObject.car.location = newLocation;
  // if the other car has an item, update the destination
  // to be it
  if (gameDataObject.peerIdOfCarWithItem == otherUserObject.peerId) {
    setDestination(newLocation, 'arrow_red.png');
  }
  transferItemIfCarsHaveCollided(otherUserObject.car.location, otherUserObject.peerId);
  otherUserObject.car.marker.setPosition(otherUserObject.car.location);
}

function transferItemIfCarsHaveCollided(otherCarLocation, otherUserPeerId) {
  // if we don't know the other car's location, or if this isn't the user with
  //  the item, then ignore it. We'll only transfer an item from the perspected
  //  of the user with the item
  if (!otherCarLocation || !collectedItem) {
    return;
  }
  if (timeOfLastTransfer) {
    var timeSinceLastTransfer = ((new Date()).getTime()) - timeOfLastTransfer;
    // if not enough time has passed since the last transfer, return
    if (timeSinceLastTransfer < timeDelayBetweenTransfers) {
      return;
    } else {
      // optimization: reset this so we don't waste time calculating in the future
      timeOfLastTransfer = null;
    }
  }

  var distance = google.maps.geometry.spherical.computeDistanceBetween(mapCenter, otherCarLocation);
  // if this user (that has the item) is close enough to call it a
  // collision, transfer it to the other user
  if (distance < 20) {
    transferItem(collectedItem.id, peer.id, otherUserPeerId);
  }
}

function transferItem(itemObjectId, fromUserPeerId, toUserPeerId) {
  console.log('item ' + itemObjectId + ' transferred from ' + fromUserPeerId + ' to ' + toUserPeerId);
  timeOfLastTransfer = (new Date()).getTime();
  broadcastTransferOfItem(itemObjectId, fromUserPeerId, toUserPeerId, timeOfLastTransfer);
  collectedItem = null;
  gameDataObject.peerIdOfCarWithItem = toUserPeerId;
  setDestination(otherUsers[toUserPeerId].car.location, 'arrow_red.png');
}

function otherUserCollectedItem(userId) {
  console.log('other user collected item');
  gameDataObject.peerIdOfCarWithItem = userId;
  itemMapObject.marker.setMap(null);
  fadeArrowToImage('arrow_red.png');
  teamTownBaseMapObject.marker.setIcon(teamTownBaseIcon);
  teamCrushBaseMapObject.marker.setIcon(teamCrushBaseIcon);

}

function userReturnedItemToBase() {
  console.log('user returned item to base');
  gameDataObject.peerIdOfCarWithItem = null;
  fadeArrowToImage('arrow.png');
  incrementItemCount(userIsOnTownTeam(peer.id));
  collectedItem = null;
  teamTownBaseMapObject.marker.setIcon(teamTownBaseTransparentIcon);
  teamCrushBaseMapObject.marker.setIcon(teamCrushBaseTransparentIcon);
}

function userIsOnTownTeam(peerId) {
  for (var i = gameDataObject.teamTownObject.users.length - 1; i >= 0; i--) {
    if (gameDataObject.teamTownObject.users[i].peerId == peerId) {
      return true;
    }
  }
}

function incrementItemCount(isTeamTown) {
  if (isTeamTown) {
    gameDataObject.teamTownObject.numItemsReturned++;
    $('#num-items-team-town').text(gameDataObject.teamTownObject.numItemsReturned);
    flashElement($('#num-items-team-town'));
  } else {
    gameDataObject.teamCrushObject.numItemsReturned++;
    $('#num-items-team-crush').text(gameDataObject.teamCrushObject.numItemsReturned);
    flashElement($('#num-items-team-crush'));
  }
}

function flashElement(jqueryElem) {
  jqueryElem.fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
}

function userCollidedWithItem(collisionItemObject) {
  collectedItem = collisionItemObject;
  itemMapObject.marker.setMap(null);
  collisionItemObject.location = null;
  gameDataObject.peerIdOfCarWithItem = peer.id;
  teamTownBaseMapObject.marker.setIcon(teamTownBaseIcon);
  teamCrushBaseMapObject.marker.setIcon(teamCrushBaseIcon);
  setDestination(myTeamBaseMapObject.location, 'arrow_blue.png');
}

function setDestination(location, arrowImageName) {
  destination = location;
  fadeArrowToImage(arrowImageName);
}

function rotateCar() {
  rotation = getAngle(speed, horizontalSpeed);
  rotationCss = '-ms-transform: rotate(' + rotation + 'deg); /* IE 9 */ -webkit-transform: rotate(' + rotation + 'deg); /* Chrome, Safari, Opera */ transform: rotate(' + rotation + 'deg);';
}

function rotateArrow() {
  arrowRotation = computeBearingAngle(mapCenter.lat(), mapCenter.lng(), destination.lat(), destination.lng());
  arrowRotationCss = '-ms-transform: rotate(' + arrowRotation + 'deg); /* IE 9 */ -webkit-transform: rotate(' + arrowRotation + 'deg); /* Chrome, Safari, Opera */ transform: rotate(' + arrowRotation + 'deg);';
}

function update(step) {
  moveCar();

  if (gameDataObject && gameDataObject.peerIdOfCarWithItem) {
    // check for collisions between one car with an item and one without
    if (gameDataObject.peerIdOfCarWithItem == peer.id) {
      // if this user has an item, check to see if they are colliding
      // with any other user, and if so, transfer the item
      for (var user in otherUsers) {
        transferItemIfCarsHaveCollided(otherUsers[user].car.location, otherUsers[user].peerId);
      }
    } else {
      // if another user has an item, and their car has a location,
      // then constantly set the destination to their location
      if (otherUsers[gameDataObject.peerIdOfCarWithItem] && otherUsers[gameDataObject.peerIdOfCarWithItem].car.location) {
        destination = otherUsers[gameDataObject.peerIdOfCarWithItem].car.location;
      }
    }
  }

  // check if user collided with an item or the base
  var collisionMarker = getCollisionMarker();
  if (collisionMarker) {
    if (!collectedItem && collisionMarker == itemMapObject.marker) {
      // user just picked up an item
      userCollidedWithItem(gameDataObject.itemObject);
      broadcastItemCollected(gameDataObject.itemObject.id);
    } else if (collectedItem && collisionMarker == myTeamBaseMapObject.marker) {
      // user has an item and is back at the base
      userReturnedItemToBase();
      broadcastItemReturned(peer.id);
      randomlyPutItems();
    }
  }

  broadcastMyCarLocation();

  // if the game has started and we're the host, check
  // for any peers who haven't sent an update in too long
  if (hostPeerId && peer && peer.id && hostPeerId == peer.id) {
    cleanupAnyDroppedConnections();
  }
}

function shouldKeepAlive() {
  return qs.value(keepAliveParamName) == 'true';
}

function cleanupAnyDroppedConnections() {
  if (shouldKeepAlive()) {
    return;
  }

  var timeNow = (new Date()).getTime();
  for (var user in otherUsers) {
    // if it's been longer than the timeout since we've heard from
    // this user, remove them from the game
    if (otherUsers[user].lastUpdateTime && (timeNow - otherUsers[user].lastUpdateTime > ACTIVE_CONNECTION_TIMEOUT_IN_SECONDS)) {
      closePeerJsConnection(user);
    }
  }
}

function closePeerJsConnection(otherUserPeerId) {
  if (otherUsers[otherUserPeerId] && otherUsers[otherUserPeerId].peerJsConnection) {
    otherUsers[otherUserPeerId].peerJsConnection.close();
  }
}

function render(dt) {
  $("#car-img").attr("style", rotationCss);
  $("#arrow-img").attr("style", arrowRotationCss);
}

function broadcastMyCarLocation() {
  for (var user in otherUsers) {
    if (otherUsers[user].peerJsConnection && otherUsers[user].peerJsConnection.open && mapCenter) {
      otherUsers[user].peerJsConnection.send({
        carLatLng: {
          lat: mapCenter.lat(),
          lng: mapCenter.lng()
        },
        peerId: peer.id,
        username: username
      });
    }
  }
}

function broadcastGameState(otherUserPeerId) {
  console.log('broadcasting game state to ' + otherUserPeerId);
  if (!otherUsers[otherUserPeerId] || !otherUsers[otherUserPeerId].peerJsConnection) {
    return;
  }

  var updateGameStateEventObject = {
    event: {
      name: 'update_game_state',
      gameDataObject: gameDataObject
    }
  };
  otherUsers[otherUserPeerId].peerJsConnection.send(updateGameStateEventObject);
}

function broadcastNewItem(location, itemId) {
  for (var user in otherUsers) {
    if (otherUsers[user].peerJsConnection && otherUsers[user].peerJsConnection.open) {
      var simpleItemLatLng = {
        lat: location.lat(),
        lng: location.lng()
      };

      otherUsers[user].peerJsConnection.send({
        event: {
          name: 'new_item',
          host_user: peer.id,
          location: {
            lat: simpleItemLatLng.lat,
            lng: simpleItemLatLng.lng
          },
          id: itemId
        }
      });
    }
  }
}

function broadcastItemReturned() {
  for (var user in otherUsers) {
    console.log('broadcasting item returned');
    if (!otherUsers[user].peerJsConnection || !otherUsers[user].peerJsConnection.open) {
      return;
    }
    otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_returned',
        user_id_of_car_that_returned_item: peer.id,
        now_num_items: gameDataObject.teamTownObject.numItemsReturned,
      }
    });
  }
}

function broadcastItemCollected(itemId) {
  console.log('broadcasting item id ' + itemId + ' collected by user ' + peer.id);
  for (var user in otherUsers) {
    if (!otherUsers[user].peerJsConnection || !otherUsers[user].peerJsConnection.open) {
      return;
    }
    gameDataObject.peerIdOfCarWithItem = peer.id;
    otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_collected',
        id: itemId,
        user_id_of_car_with_item: gameDataObject.peerIdOfCarWithItem
      }
    });
  }
}

function broadcastTransferOfItem(itemId, fromUserPeerId, toUserPeerId) {
  console.log('broadcasting item transferred ' + itemId + ' from ' + fromUserPeerId + ' to ' + toUserPeerId);
  for (var user in otherUsers) {
    if (!otherUsers[user].peerJsConnection || !otherUsers[user].peerJsConnection.open) {
      return;
    }
    otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_transferred',
        id: itemId,
        fromUserPeerId: fromUserPeerId,
        toUserPeerId: toUserPeerId
      }
    });
  }
}

function broadcastNewLocation(location) {
  console.log('broadcasting new location: ' + location.lat() + ',' + location.lng());
  for (var user in otherUsers) {
    if (!otherUsers[user].peerJsConnection || !otherUsers[user].peerJsConnection.open) {
      return;
    }
    otherUsers[user].peerJsConnection.send({
      event: {
        name: 'new_location',
        lat: location.lat(),
        lng: location.lng(),
        originating_peer_id: peer.id
      }
    });
  }
}

// checks to see if they have collided with either an item or the base
function getCollisionMarker() {
  // compute the distance between my car and the destination
  if (destination) {
    var maxDistanceAllowed = carToItemCollisionDistance;
    var distance = google.maps.geometry.spherical.computeDistanceBetween(mapCenter, destination);
    // The base is bigger, so be more lenient when checking for a base collision
    if (destination == myTeamBaseMapObject.location) {
      maxDistanceAllowed = carToBaseCollisionDistance;
    }
    if (distance < maxDistanceAllowed) {
      if (destination == itemMapObject.location) {
        console.log('user ' + peer.id + ' collided with item');
        return itemMapObject.marker;
      } else if (destination == myTeamBaseMapObject.location) {
        if (collectedItem) {
          console.log('user ' + peer.id + ' has an item and collided with base');
        }
        return myTeamBaseMapObject.marker;
      }
    }
  }
  return null;
}

function setGameToNewLocation(lat, lng) {
  teamTownBaseMapObject.location = new google.maps.LatLng(lat, lng);
  teamTownBaseMapObject.marker.setPosition(teamTownBaseMapObject.location);
  mapCenter = teamTownBaseMapObject.location;
  map.setCenter(mapCenter);
}

function getAngle(vx, vy) {
  return (Math.atan2(vy, vx)) * (180 / Math.PI);
}

function computeBearingAngle(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var dLat = (lat2 - lat1).toRad();
  var dLon = (lon2 - lon1).toRad();
  var lat1 = lat1.toRad();
  var lat2 = lat2.toRad();

  var angleInRadians = Math.atan2(Math.sin(dLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon));
  return angleInRadians.toDeg();
}

// key events
function onKeyDown(evt) {
  if (evt.keyCode == 39) {
    rightDown = true;
  } else if (evt.keyCode == 37) {
    leftDown = true;
  } else if (evt.keyCode == 38) {
    upDown = true;
  } else if (evt.keyCode == 40) {
    downDown = true;
  }
}

function onKeyUp(evt) {
  if (evt.keyCode == 39) {
    rightDown = false;
  } else if (evt.keyCode == 37) {
    leftDown = false;
  } else if (evt.keyCode == 38) {
    upDown = false;
  } else if (evt.keyCode == 40) {
    downDown = false;
  }
}

// game loop helpers
function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function frame() {
  now = timestamp();
  dt = dt + Math.min(1, (now - last) / 1000);
  while (dt > step) {
    dt = dt - step;
    update(step);
  }
  render(dt);
  last = now;
  requestAnimationFrame(frame);
}

// don't think we'll need to go to the user's location, but might be useful
function tryFindingLocation() {
  // Try HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = new google.maps.LatLng(position.coords.latitude,
        position.coords.longitude);
      map.setCenter(pos);
      mapCenter = pos;
    }, function() {
      handleNoGeolocation(true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation(false);
  }
}

function handleNoGeolocation(errorFlag) {
  if (errorFlag) {
    var content = 'Error: The Geolocation service failed.';
  } else {
    var content = 'Error: Your browser doesn\'t support geolocation.';
  }
}

// This can be removed, since it causes an error.  it's just allowing
// for right-clicking to show the browser's context menu.
function showContextMenu(e) {

  // create a contextmenu event.
  var menu_event = document.createEvent("MouseEvents");
  menu_event.initMouseEvent("contextmenu", true, true,
    e.view, 1, 0, 0, 0, 0, false,
    false, false, false, 2, null);

  // fire the new event.
  e.originalTarget.dispatchEvent(menu_event);
}

// $(window).unload(function() {
//   disconnectFromGame();
// });