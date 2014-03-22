// TODO: use require.js to load matchmaker.js instead of 
// loading them in order in mapgame.html

console.log('loading js file');

var map; // the map canvas from the Google Maps v3 javascript API
var mapZoomLevel = 18;
var mapData; // the level data for this map (base locations)
var markerLatLng;
var itemMarker = null;
var itemObject = null;
var baseMarker = null;
// default to the grand canyon, but this will be loaded from a map file
var mapCenter = new google.maps.LatLng(36.151103, -113.208565);
var baseLatLng = mapCenter; // for now the base always starts at the center of the map
// for time-based game loop
var now;
var dt = 0;
var last = timestamp();
var step = 1 / 60;

// user data
var username = null;

// game hosting data
var gameId = null;

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
var otherCarLocation = null;
var otherCarMarker = null;
var minItemDistanceFromBase = 300;

// gameplay
var collectedItem = null;
var numItemsCollected = 0;
var otherUserNumItems = 0;
var userIdOfCarWithItem = null;
var destination = null;
var timeDelayBetweenTransfers = 1000; // in ms
var timeOfLastTransfer = null;

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

var baseTransparentIcon = {
  url: 'images/fort_transparent.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(75, 120)
};

/** Adds to the Number prototye: Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}
/** Adds to the Number prototye: Converts numeric radians to degrees */
if (typeof(Number.prototype.toDeg) === "undefined") {
  Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
  }
}

// peer JS connection (for multiplayer webRTC)
var peerJsConnection = null;
var peer = new Peer({
  key: 'j3m0qtddeshpk3xr'
});
peer.on('open', function(id) {
  console.log('My peer ID is: ' + id);
  $('#peer-id').text(id);
  $('#peer-connection-status').text('no game joined');
});
peer.on('connection', connectedToPeer);


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
  joinOrCreateGame(username, peer.id, gameJoined)
}

function gameJoined(id, isNewGame, hostPeerId) {
  gameId = id;
  if (isNewGame) {

  } else {
    connectToPeer(hostPeerId);
  }
}


function bindKeyAndButtonEvents() {
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
    baseMarker = new google.maps.Marker({
      title: 'Base',
      map: map,
      position: baseLatLng,
      icon: baseIcon
    })
    randomlyPutItems();
    mapIsReadyCallback();
  });
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
    if (google.maps.geometry.spherical.computeDistanceBetween(randomLocation, baseLatLng) > minItemDistanceFromBase) {
      return randomLocation;
    }
    console.log('item too close to base, choosing another location...');
  }
}

function putNewItemOnMap(location, itemId) {
  // eventually this should be redundant to clear this, but while
  // there's a bug on multiplayer joining, clear it again
  collectedItem = null;
  baseMarker.setIcon(baseTransparentIcon);

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

function connectToPeer(peerId) {
  console.log('trying to connect to ' + peerId);
  $('#peer-connection-status').text('trying to connect to ' + peerId);
  peerJsConnection = peer.connect(peerId);
  peerJsConnection.on('open', function() {
    console.log('connection open');
    connectedToPeer(peerJsConnection);
  });
  peerJsConnection.on('error', function(err) {
    alert(err);
  });
}

function connectedToPeer(conn) {
  console.log('connected to ' + conn.peer);
  $('#peer-connection-status').text('connected to ' + conn.peer);
  peerJsConnection = conn;
  peerJsConnection.on('close', function() {
    console.log('closing connection');
    peerConnectionClosed();
  });
  peerJsConnection.on('data', function(data) {
    dataReceived(data);
  });
  randomlyPutItems();
}

function peerConnectionClosed() {
  otherCarMarker.setMap(null);
  removeMeFromGameHost(gameId, peer.id);
}

function fadeArrowToImage(imageFileName) {
  $("#arrow-img").attr('src', 'images/' + imageFileName);
}

function otherUserChangedLocation(location) {
  setGameToNewLocation(location);
}

function dataReceived(data) {
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
        baseMarker.setIcon(baseTransparentIcon);
        otherUserReturnedItem(data.event.now_num_items);
      }
    }
    if (data.event.name == 'item_transferred') {
      console.log('received event: item ' + data.event.id + ' transferred by user ' + data.event.fromUserPeerId + ' to user ' + data.event.toUserPeerId);
      if (data.event.toUserPeerId == peer.id) {
        // the item was transferred to this user
        fadeArrowToImage('arrow_blue.png');
        itemObject = {
          id: data.event.id,
          marker: null
        };
        timeOfLastTransfer = (new Date()).getTime();
        console.log('someone transferred to me at ' + timeOfLastTransfer);
        userIdOfCarWithItem = data.event.toUserPeerId;
        userCollidedWithItem(itemObject);
      }
    }
  }

  if (data.carLatLng) {
    if (!otherCarLocation) {
      otherCarMarker = new google.maps.Marker({
        map: map,
        title: 'Other Car',
        icon: otherCarIcon
      });
    }
    otherCarLocation = new google.maps.LatLng(data.carLatLng.lat, data.carLatLng.lng);
    moveOtherCar(otherCarLocation, data.peerId);
  }
}

function otherUserReturnedItem(nowNumItemsForUser) {
  fadeArrowToImage('arrow.png');
  otherUserNumItems = nowNumItemsForUser;
  $('#num-items-opponent-collected').text(otherUserNumItems);
  flashElement($('#num-items-opponent-collected'));
}

function moveOtherCar(location, otherUserPeerId) {
  checkForCarCollision(location, otherUserPeerId);
  otherCarMarker.setPosition(location);
}

function checkForCarCollision(otherCarLocation, otherUserPeerId) {
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
  baseMarker.setIcon(baseIcon);
  userIdOfCarWithItem = userId;
}

function userReturnedItemToBase() {
  console.log('user returned item to base');
  fadeArrowToImage('arrow.png');
  incrementItemCount();
  collectedItem = null;
  baseMarker.setIcon(baseTransparentIcon);
}

function incrementItemCount() {
  numItemsCollected++;
  $('#num-items-collected').text(numItemsCollected);
  flashElement($('#num-items-collected'));
}

function flashElement(jqueryElem) {
  jqueryElem.fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
}

function userCollidedWithItem(collisionItemObject) {
  collectedItem = collisionItemObject;
  itemMarker.setMap(null);
  baseMarker.setIcon(baseIcon);
  itemObject.marker = null;
  destination = baseLatLng;
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
  // if another user has an item, constantly set the destination to their location
  if (!collectedItem && userIdOfCarWithItem && userIdOfCarWithItem != peer.id) {
    destination = otherCarLocation;
  }
  var collisionMarker = getCollisionMarker();
  if (collisionMarker) {
    if (!collectedItem && collisionMarker == itemMarker) {
      // user just picked up an item
      fadeArrowToImage('arrow_blue.png');
      userCollidedWithItem(itemObject);
      broadcastItemCollected(itemObject.id);
    } else if (collectedItem && collisionMarker == baseMarker) {
      // user has an item and is back at the base
      userReturnedItemToBase();
      broadcastItemReturned(peer.id);
      randomlyPutItems();
    }
  }
  broadcastMyCarLocation();
}

function render(dt) {
  $("#car-img").attr("style", rotationCss);
  $("#arrow-img").attr("style", arrowRotationCss);
}

function broadcastMyCarLocation() {
  if (peerJsConnection && peerJsConnection.open && mapCenter) {
    peerJsConnection.send({
      carLatLng: {
        lat: mapCenter.lat(),
        lng: mapCenter.lng()
      },
      peerId: peer.id
    });
  }
}

function broadcastNewItem(location, itemId) {
  if (peerJsConnection && peerJsConnection.open) {
    var simpleItemLatLng = {
      lat: location.lat(),
      lng: location.lng()
    };

    peerJsConnection.send({
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

function broadcastItemReturned() {
  console.log('broadcasting item returned');
  if (!peerJsConnection || !peerJsConnection.open) {
    return;
  }
  peerJsConnection.send({
    event: {
      name: 'item_returned',
      user_id_of_car_that_returned_item: peer.id,
      now_num_items: numItemsCollected,
    }
  });
}

function broadcastItemCollected(itemId) {
  console.log('broadcasting item id ' + itemId + ' collected by user ' + peer.id);
  if (!peerJsConnection || !peerJsConnection.open) {
    return;
  }
  userIdOfCarWithItem = peer.id;
  peerJsConnection.send({
    event: {
      name: 'item_collected',
      id: itemId,
      user_id_of_car_with_item: userIdOfCarWithItem
    }
  });
}

function broadcastTransferOfItem(itemId, fromUserPeerId, toUserPeerId) {
  console.log('broadcasting item transferred ' + itemId + ' from ' + fromUserPeerId + ' to ' + toUserPeerId);
  if (!peerJsConnection || !peerJsConnection.open) {
    return;
  }
  peerJsConnection.send({
    event: {
      name: 'item_transferred',
      id: itemId,
      fromUserPeerId: fromUserPeerId,
      toUserPeerId: toUserPeerId
    }
  });
}

function broadcastNewLocation(location) {
  console.log('broadcasting new location: ' + location.lat() + ',' + location.lng());
  if (!peerJsConnection || !peerJsConnection.open) {
    return;
  }
  peerJsConnection.send({
    event: {
      name: 'new_location',
      lat: location.lat(),
      lng: location.lng(),
      originating_peer_id: peer.id
    }
  });
}

// checks to see if they have collided with either an item or the base
function getCollisionMarker() {
  if (destination) {
    var maxDistanceAllowed = carToItemCollisionDistance;
    var distance = google.maps.geometry.spherical.computeDistanceBetween(mapCenter, destination);
    // The base is bigger, so be more lenient when checking for a base collision
    if (destination == baseLatLng) {
      maxDistanceAllowed = carToBaseCollisionDistance;
    }
    if (distance < maxDistanceAllowed) {
      if (destination == markerLatLng) {
        console.log('user ' + peer.id + ' collided with item');
        return itemMarker;
      } else if (destination == baseLatLng) {
        if (collectedItem) {
          console.log('user ' + peer.id + ' has an item and collided with base');
        }
        return baseMarker;
      }
    }
  }
  return null;
}

function setGameToNewLocation(location) {
  baseLatLng = location;
  baseMarker.setPosition(baseLatLng);
  mapCenter = baseLatLng;
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

$(window).unload(function() {
  if (peer) {
    removeMeFromGameHost(gameId, peer.id);
  }
});