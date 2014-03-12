console.log('loading js file');

var map;
var markerImage;
var mapData;
var markerLatLng;
var itemMarker = null;
var itemObject = null;
var baseMarker = null;
// default to the grand canyon, but this should be loaded from a map file
var mapCenter = new google.maps.LatLng(36.151103, -113.208565);
var baseLatLng = new google.maps.LatLng(36.151103, -113.208565);
var now;
var dt = 0;
var last = timestamp();
var step = 1 / 60;
var rotation = 0;
var deceleration = 1.1;
var maxSpeed = 15;
var rotationCss = '';
var arrowRotationCss = '';
var mapDataLoaded = false;
var collectedItem = null;
var mapWidth = 0.004;
var mapHeight = 0.004;
var otherCarLocation = null;
var otherCarMarker = null;
var userIdOfCarWithItem = null;
var destination = null;
var timeDelayBetweenTransfers = 1000; // in ms
var timeOfLastTransfer = null;

var itemIcon = {
  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
  scale: 10
};
var otherCarIcon = {
  url: 'images/car_red.png',
  origin: new google.maps.Point(0, 0),
  anchor: new google.maps.Point(16, 32)
}
var baseIcon = {
  path: google.maps.SymbolPath.CIRCLE,
  scale: 15
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

  loadMapData();

  rightDown = false;
  leftDown = false;
  upDown = false;
  downDown = false;
  speed = 0;
  rotation = 0;
  horizontalSpeed = 0;
  rotationCss = '';

  console.log('init javascript in HTML');
  //tryFindingLocation();
  var mapOptions = {
    zoom: 18,
    center: mapCenter,
    keyboardShortcuts: false,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    disableDefaultUI: true,
    minZoom: 18,
    maxZoom: 18,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    draggable: false,
  }

  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  google.maps.event.addListener(map, 'click', function(e) {
    contextmenu: true
  });

  // not necessary
  google.maps.event.addListener(map, "rightclick", showContextMenu);

  $(document).keydown(onKeyDown);
  $(document).keyup(onKeyUp);
  $('#connect-button').click(function(evt) {
    var peerId = $('#peer-id-textbox').val();
    console.log('peer id connecting: ' + peerId);
    connectToPeer(peerId);
  });

  // start the game loop
  requestAnimationFrame(frame);
}

function loadMapData() {
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
      icon: itemIcon
    });
    baseMarker = new google.maps.Marker({
      title: 'Base',
      position: baseLatLng,
      icon: baseIcon
    })
    randomlyPutItems();
  });
}

function randomlyPutItems() {
  randomLat = getRandomInRange(mapCenter.lat() - (mapWidth / 2.0), mapCenter.lat() + (mapWidth / 2.0), 7);
  randomLng = getRandomInRange(mapCenter.lng() - (mapHeight / 2.0), mapCenter.lng() + (mapHeight / 2.0), 7);
  console.log(randomLat + ',' + randomLng);
  var randomLocation = new google.maps.LatLng(randomLat, randomLng)
  var itemId = getRandomInRange(1, 1000000, 0);
  putNewItemOnMap(randomLocation, itemId);
  broadcastNewItem(randomLocation, itemId);
}

function putNewItemOnMap(location, itemId) {
  // eventually this should be redundant to clear this, but while
  // there's a bug on multiplayer joining, clear it again
  collectedItem = null;
  baseMarker.setMap(null);

  markerLatLng = location
  itemMarker.setMap(map);
  itemMarker.setPosition(markerLatLng);
  itemMarker.setAnimation(google.maps.Animation.BOUNCE);
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
    newLat = map.getCenter().lat() + (speed / 1000000);
    newLong = map.getCenter().lng() + (horizontalSpeed / 500000);
    mapCenter = new google.maps.LatLng(newLat, newLong);
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
}

function dataReceived(data) {
  if (data.event) {
    if (data.event.name == 'item_collected') {
      console.log('received event: item collected by ' + data.event.user_id_of_car_with_item);
      if (data.event.user_id_of_car_with_item != peer.id) {
        otherUserCollectedItem(data.event.user_id_of_car_with_item);
      }
    }
    if (data.event.name == 'new_item') {
      console.log('received event: new item with id ' + data.event.id);
      userIdOfCarWithItem = null;
      // Only update if someone else caused the new item placement.
      // if this user did it, it was already placed
      if (data.event.host_user != peer.id) {
        markerLatLng = new google.maps.LatLng(data.event.location.lat, data.event.location.lng);
        putNewItemOnMap(markerLatLng, data.event.id);
      }

    }
    if (data.event.name == 'item_returned') {
      console.log('received event: item returned by user ' + data.event.user_id_of_car_that_returned_item);
      userIdOfCarWithItem = null;
      if (data.event.user_id_of_car_that_returned_item != peer.id) {
        baseMarker.setMap(null);
      }
    }
    if (data.event.name == 'item_transferred') {
      console.log('received event: item ' + data.event.id + ' transferred by user ' + data.event.fromUserPeerId + ' to user ' + data.event.toUserPeerId);
      if (data.event.toUserPeerId == peer.id) {
        // the item was transferred to this user
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
}

function otherUserCollectedItem(userId) {
  console.log('other user collected item');
  itemMarker.setMap(null);
  baseMarker.setMap(map);
  userIdOfCarWithItem = userId;
}

function userReturnedItemToBase() {
  collectedItem = null;
  randomlyPutItems();
  baseMarker.setMap(null);
}

function userCollidedWithItem(collisionItemObject) {
  collectedItem = collisionItemObject;
  itemMarker.setMap(null);
  baseMarker.setMap(map);
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
      userCollidedWithItem(itemObject);
      broadcastItemCollected(itemObject.id);
    } else if (collectedItem && collisionMarker == baseMarker) {
      // user has an item and is back at the base
      userReturnedItemToBase();
      broadcastItemReturned(peer.id);
    }
  }
  broadcastMyCarLocation();
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
        hose_user: peer.id,
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
      user_id_of_car_that_returned_item: peer.id
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

function getCollisionMarker() {
  if (destination) {
    var distance = google.maps.geometry.spherical.computeDistanceBetween(mapCenter, destination);
    if (distance < 20) {
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

function getRandomInRange(from, to, fixed) {
  return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
  // .toFixed() returns string, so ' * 1' is a trick to convert to number
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


function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function render(dt) {
  $("#car-img").attr("style", rotationCss);
  $("#arrow-img").attr("style", arrowRotationCss);
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

  /*
   menu_event.initMouseEvent("contextmenu", true, true, e.view, 1,
      e.screenX, e.screenY, e.clientX, e.clientY,
      false, false, false, false, 2, null);
*/

  menu_event.initMouseEvent("contextmenu", true, true,
    e.view, 1, 0, 0, 0, 0, false,
    false, false, false, 2, null);


  // fire the new event.
  e.originalTarget.dispatchEvent(menu_event);
}