/* YOUR SMUGGLER MISSION, IF YOU CHOOSE TO ACCEPT, IS TO JOIN TEAM
 * TOWN AND TRY TO DEFEAT TEAM CRUSH.  AND YOU MUST ACCEPT...
 */

// TODO: use require.js to load utilities and matchmaker.js instead of 
// loading them in order in mapgame.html

var map; // the map canvas from the Google Maps v3 javascript API
var mapZoomLevel = 18;
var mapData; // the level data for this map (base locations)

var markerLatLng;
var itemMarker = null;
var itemObject = null;

// default to the grand canyon, but this will be loaded from a map file
var mapCenter = new google.maps.LatLng(36.151103, -113.208565);

// team data

// the team objects will be of this form:
// {
//   users: [123456789,987654321],
//   baseObject: {
//     location: <location_object>,
//     marker: <marker_object>
//   },
//   numItemsCollected: 0
// }
var myTeamObject = {
  baseObject: {
    location: mapCenter
  },
  numItemsCollected: 0
};
var teamCrushObject = null;



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

// gameplay
var collectedItem = null;
var otherUserNumItems = 0;
var userIdOfCarWithItem = null;
var destination = null;
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
//     numItems: 0
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

var baseIcon = {
  url: 'images/fort.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};

var teamCrushBaseIcon = {
  url: 'images/opponent_fort.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};

var baseTransparentIcon = {
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
    myTeamObject.users = [peer.id];
  } else {
    // someone else is already the host
    hostPeerId = gameData.hostPeerId;
  }
}

function connectToAllNonHostUsers(nonHostPeerIds) {
  for (var i = 0; i < nonHostPeerIds.length; i++) {
    connectToPeer(nonHostPeerIds[i]);
  }
}

function createTeamCrushObject(teamCrushPeerIds, baseLat, baseLng) {
  teamCrushObject = {};
  teamCrushObject.users = teamCrushPeerIds;
  teamCrushObject.baseObject = createTeamCrushBase(baseLat, baseLng);
  teamCrushObject.numItemsCollected = 0;
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
  setGameToNewLocation(location);
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
    itemMarker = new google.maps.Marker({
      map: map,
      title: 'Item',
      icon: itemIcon,
      optimized: false
    });
    myTeamObject.baseObject.marker = new google.maps.Marker({
      title: 'Team Town Base',
      map: map,
      position: new google.maps.LatLng(mapData.map.teamTownBaseLatLng.lat, mapData.map.teamTownBaseLatLng.lng),
      icon: baseIcon
    });
    randomlyPutItems();
    mapIsReadyCallback();
  });
}

function createTeamCrushBase(lat, lng) {
  var teamCrushBaseObject = {};
  teamCrushBaseObject.location = new google.maps.LatLng(lat, lng);
  teamCrushBaseObject.marker = new google.maps.Marker({
    title: 'Team Crush Base',
    map: map,
    position: teamCrushBaseObject.location,
    icon: teamCrushBaseIcon
  });
  return teamCrushBaseObject;
}

function randomlyPutItems() {
  var randomLocation = getRandomLocationForItem();
  var itemId = getRandomInRange(1, 1000000, 0);
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
    randomLocation = new google.maps.LatLng(randomLat, randomLng)
    if (google.maps.geometry.spherical.computeDistanceBetween(randomLocation, myTeamObject.baseObject.location) > minItemDistanceFromBase) {
      return randomLocation;
    }
    console.log('item too close to base, choosing another location...');
  }
}

function putNewItemOnMap(location, itemId) {
  // eventually this should be redundant to clear this, but while
  // there's a bug on multiplayer joining, clear it again
  collectedItem = null;
  myTeamObject.baseObject.marker.setIcon(baseTransparentIcon);
  // teamCrushObject will be null if the other team isn't in the
  // game yet
  if (teamCrushObject) {
    teamCrushObject.baseObject.marker.setIcon(teamCrushBaseTransparentIcon);
  }
  markerLatLng = location;
  itemMarker.setMap(map);
  itemMarker.setPosition(markerLatLng);
  destination = markerLatLng;
  itemObject = {
    id: itemId,
    marker: itemMarker
  };
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
  if (markerLatLng) {
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
    addNewUserToUI(otherUserPeerId);
  }

  initializePeerConnection(peerJsConnection, otherUserPeerId)
  addCarDataToUserObject(otherUserPeerId);
  randomlyPutItems();
}

function addNewUserToUI(newUserPeerId) {
  var newUserScoreTextHtml = '<span id="score-' + newUserPeerId +
    '" class="border emphasized" ><span id="username-' + newUserPeerId + '">' +
    newUserPeerId + '</span> collected: <span class="num-items-collected">0</span></span>';
  // convert HTML to jquery object
  var newUserScoreDomElement = $($.parseHTML(newUserScoreTextHtml));
  $('#scores').append(newUserScoreDomElement);
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

  removeUserFromUI(otherUserPeerId);

  // if I am the host, I'll be the one to tell Firebase to remove this other user
  if (hostPeerId == peer.id) {
    removePeerFromGame(gameId, otherUserPeerId);
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

function removeUserFromUI(peerId) {
  // remove the other user's car from the map
  otherUsers[peerId].car.marker.setMap(null);

  // remove their score box
  var scoreElemSelector = '#score-' + peerId;
  $(scoreElemSelector).remove();
}

function otherUserChangedLocation(location) {
  setGameToNewLocation(location);
}

function dataReceived(data) {
  if (data.peerId) {
    if (!otherUsers[data.peerId]) {
      otherUsers[data.peerId] = {};
    }
    otherUsers[data.peerId].lastUpdateTime = (new Date()).getTime();
  }

  if (data.event) {
    if (data.event.name == 'new_location') {
      console.log('received event: new location ' + data.event.lat + ',' + data.event.lng);
      if (data.event.originating_peer_id != peer.id) {
        otherUserChangedLocation(new google.maps.LatLng(data.event.lat, data.event.lng));
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
      console.log('received event: new item with id ' + data.event.id);
      userIdOfCarWithItem = null;
      fadeArrowToImage('arrow.png');
      // Only update if someone else caused the new item placement.
      // if this user did it, it was already placed
      if (data.event.host_user && data.event.host_user != peer.id) {
        markerLatLng = new google.maps.LatLng(data.event.location.lat, data.event.location.lng);
        putNewItemOnMap(markerLatLng, data.event.id);
      }

    }
    if (data.event.name == 'item_returned') {
      console.log('received event: item returned by user ' + data.event.user_id_of_car_that_returned_item + ' which gives them ' + data.event.now_num_items);
      userIdOfCarWithItem = null;
      if (data.event.user_id_of_car_that_returned_item != peer.id) {
        myTeamObject.baseObject.marker.setIcon(baseTransparentIcon);
        if (teamCrushObject) {
          teamCrushObject.baseObject.marker.setIcon(teamCrushBaseTransparentIcon);
        }
        otherUserReturnedItem(data.event.user_id_of_car_that_returned_item, data.event.now_num_items);
      }
    }
    if (data.event.name == 'item_transferred') {
      console.log('received event: item ' + data.event.id + ' transferred by user ' + data.event.fromUserPeerId + ' to user ' + data.event.toUserPeerId);
      userIdOfCarWithItem = data.event.toUserPeerId;
      if (data.event.toUserPeerId == peer.id) {
        // the item was transferred to this user
        fadeArrowToImage('arrow_blue.png');
        itemObject = {
          id: data.event.id,
          marker: null
        };
        timeOfLastTransfer = (new Date()).getTime();
        console.log('someone transferred at ' + timeOfLastTransfer);
        userCollidedWithItem(itemObject);
      } else {
        // set the arrow to point to the new user who has the item
        destination = otherUsers[data.event.toUserPeerId].car.location;
      }
    }
  }

  if (data.peerId && data.username && !otherUsers[data.peerId].username) {
    updateUsername(data.peerId, data.username);
  }

  if (data.peerId && data.carLatLng && otherUsers[data.peerId] && otherUsers[data.peerId].car) {
    moveOtherCar(otherUsers[data.peerId], new google.maps.LatLng(data.carLatLng.lat, data.carLatLng.lng));
  }
}

function updateUsername(peerId, username) {
  otherUsers[peerId].username = username;
  var userElemSelector = '#username-' + peerId;
  $(userElemSelector).text(username);
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
  fadeArrowToImage('arrow.png');
  otherUserNumItems = nowNumItemsForUser;
  updateUserScore(otherUserPeerId, nowNumItemsForUser);
  var scoreElemSelector = '#score-' + otherUserPeerId + ' span.num-items-collected';
  flashElement($(scoreElemSelector));
}

function updateUserScore(peerId, userScore) {
  otherUsers[peerId].score = userScore;
  var scoreElemSelector = '#score-' + peerId + ' span.num-items-collected';
  $(scoreElemSelector).text(userScore);
}

function moveOtherCar(otherUserObject, newLocation) {
  otherUserObject.car.location = newLocation;
  transferItemIfCarsHaveCollided(otherUserObject.car.location, otherUserObject.peerId);
  otherUserObject.car.marker.setPosition(otherUserObject.car.location);
}

function transferItemIfCarsHaveCollided(otherCarLocation, otherUserPeerId) {
  // if this isn't the user with the item, then ignore it. We'll only
  // transfer an item from the perspected of the user with the item
  if (!collectedItem) {
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
  userIdOfCarWithItem = toUserPeerId;
  fadeArrowToImage('arrow_red.png');
}

function otherUserCollectedItem(userId) {
  console.log('other user collected item');
  fadeArrowToImage('arrow_red.png');
  itemMarker.setMap(null);
  myTeamObject.baseObject.marker.setIcon(baseIcon);
  if (teamCrushObject) {
    teamCrushObject.baseObject.marker.setIcon(teamCrushBaseIcon);
  }
  userIdOfCarWithItem = userId;
}

function userReturnedItemToBase() {
  console.log('user returned item to base');
  fadeArrowToImage('arrow.png');
  incrementItemCount();
  collectedItem = null;
  myTeamObject.baseObject.marker.setIcon(baseTransparentIcon);
  if (teamCrushObject) {
    teamCrushObject.baseObject.marker.setIcon(teamCrushBaseTransparentIcon);
  }
}

function incrementItemCount() {
  myTeamObject.numItemsCollected++;
  $('#num-items-collected').text(myTeamObject.numItemsCollected);
  flashElement($('#num-items-collected'));
}

function flashElement(jqueryElem) {
  jqueryElem.fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
}

function userCollidedWithItem(collisionItemObject) {
  collectedItem = collisionItemObject;
  itemMarker.setMap(null);
  myTeamObject.baseObject.marker.setIcon(baseIcon);
  if (teamCrushObject) {
    teamCrushObject.baseObject.marker.setIcon(teamCrushBaseIcon);
  }
  itemObject.marker = null;
  destination = myTeamObject.baseObject.location;
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

  if (userIdOfCarWithItem) {
    // check for collisions between one car with an item and one without
    if (userIdOfCarWithItem == peer.id) {
      // if this user has an item, check to see if they are colliding
      // with any other user, and if so, transfer the item
      for (var user in otherUsers) {
        transferItemIfCarsHaveCollided(otherUsers[user].car.location, otherUsers[user].peerId);
      }
    } else {
      // if another user has an item, constantly set the destination to their location
      destination = otherUsers[userIdOfCarWithItem].car.location;
    }
  }

  // check if user collided with an item or the base
  var collisionMarker = getCollisionMarker();
  if (collisionMarker) {
    if (!collectedItem && collisionMarker == itemMarker) {
      // user just picked up an item
      fadeArrowToImage('arrow_blue.png');
      userCollidedWithItem(itemObject);
      broadcastItemCollected(itemObject.id);
    } else if (collectedItem && collisionMarker == myTeamObject.baseObject.marker) {
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

function cleanupAnyDroppedConnections() {
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
        now_num_items: numItemsCollected,
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
    userIdOfCarWithItem = peer.id;
    otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_collected',
        id: itemId,
        user_id_of_car_with_item: userIdOfCarWithItem
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
  if (destination) {
    var maxDistanceAllowed = carToItemCollisionDistance;
    var distance = google.maps.geometry.spherical.computeDistanceBetween(mapCenter, destination);
    // The base is bigger, so be more lenient when checking for a base collision
    if (destination == myTeamObject.baseObject.location) {
      maxDistanceAllowed = carToBaseCollisionDistance;
    }
    if (distance < maxDistanceAllowed) {
      if (destination == markerLatLng) {
        console.log('user ' + peer.id + ' collided with item');
        return itemMarker;
      } else if (destination == myTeamObject.baseObject.location) {
        if (collectedItem) {
          console.log('user ' + peer.id + ' has an item and collided with base');
        }
        return myTeamObject.baseObject.marker;
      }
    }
  }
  return null;
}

function setGameToNewLocation(location) {
  myTeamObject.baseObject.location = location;
  myTeamObject.baseObject.marker.setPosition(location);
  mapCenter = location;
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