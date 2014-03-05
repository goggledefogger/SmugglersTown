console.log('loading js file');

var map,
  markerImage,
  mapData,
  markerLatLng;
var marker = null;
// default to the grand canyon, but this should be loaded from a map file
var mapCenter = new google.maps.LatLng(36.151103, -113.208565);
var baseLatLng = new google.maps.LatLng(36.151103, -113.208565);
var now,
  dt = 0,
  last = timestamp(),
  step = 1 / 60;
var rotation = 0;
var deceleration = 1.1;
var maxSpeed = 15;
var rotationCss = '';
var arrowRotationCss = '';
var mapDataLoaded = false;
var collectedItem = null;
var mapWidth = 0.004;
var mapHeight = 0.004;

var itemIcon = {
  path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
  scale: 10
};
var baseIcon = {
  path: google.maps.SymbolPath.CIRCLE,
  scale: 15
};

/** Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() {
    return this * Math.PI / 180;
  }
}
/** Converts numeric radians to degrees */
if (typeof(Number.prototype.toDeg) === "undefined") {
  Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
  }
}


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

  // start the agame loop
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
    marker = new google.maps.Marker({
      map: map,
      title: 'Item'
    });
    randomlyPutItems();
  });
}

function randomlyPutItems() {
  randomLat = getRandomInRange(mapCenter.lat() - (mapWidth / 2.0), mapCenter.lat() + (mapWidth / 2.0), 7);
  randomLng = getRandomInRange(mapCenter.lng() - (mapHeight / 2.0), mapCenter.lng() + (mapHeight / 2.0), 7);
  markerLatLng = new google.maps.LatLng(randomLat, randomLng);
  console.log(randomLat + ',' + randomLng);
  marker.setPosition(markerLatLng);
  marker.setIcon(itemIcon);
  marker.setAnimation(google.maps.Animation.BOUNCE);
}

function getRandomInRange(from, to, fixed) {
  return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
  // .toFixed() returns string, so ' * 1' is a trick to convert to number
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

function rotateCar() {
  rotation = getAngle(speed, horizontalSpeed);
  rotationCss = '-ms-transform: rotate(' + rotation + 'deg); /* IE 9 */ -webkit-transform: rotate(' + rotation + 'deg); /* Chrome, Safari, Opera */ transform: rotate(' + rotation + 'deg);';
}

function rotateArrow() {
  arrowRotation = computeBearingAngle(mapCenter.lat(), mapCenter.lng(), markerLatLng.lat(), markerLatLng.lng());
  arrowRotationCss = '-ms-transform: rotate(' + arrowRotation + 'deg); /* IE 9 */ -webkit-transform: rotate(' + arrowRotation + 'deg); /* Chrome, Safari, Opera */ transform: rotate(' + arrowRotation + 'deg);';
}

function getAngle(vx, vy) {
  return (Math.atan2(vy, vx)) * (180 / Math.PI);
}

function update(step) {
  moveCar();
  var collisionItem = getCollisionItem();
  if (collisionItem) {
    if (!collectedItem) {
      // user just picked up an item
      userCollidedWithItem(collisionItem);
    } else {
      // user has an item and is back at the base
      userReturnedItemToBase();
    }
  }
}

function userReturnedItemToBase() {
  collectedItem = null;
  randomlyPutItems();
}

function userCollidedWithItem(collisionItem) {
  collectedItem = collisionItem;
  changeDestination(baseLatLng);
  marker.setAnimation(null);
  marker.setIcon(baseIcon);
}

function changeDestination(location) {
  markerLatLng = location;
  marker.setPosition(markerLatLng);
}

function getCollisionItem() {
  if (markerLatLng) {
    var distance = google.maps.geometry.spherical.computeDistanceBetween(mapCenter, markerLatLng);
    if (distance < 20) {
      return marker;
    }
  }
  return null;
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