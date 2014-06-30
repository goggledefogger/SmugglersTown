(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var SmugglersTown = require('./mapgame.js');

$(document).ready(function() {
    var game = new SmugglersTown('https://smugglerstown.firebaseio.com/');
});
},{"./mapgame.js":2}],2:[function(require,module,exports){
/* YOUR SMUGGLER MISSION, IF YOU CHOOSE TO ACCEPT, IS TO JOIN TEAM
 * TOWN AND TRY TO DEFEAT TEAM CRUSH.  AND YOU MUST ACCEPT...
 */

/**
 *  mapgame.js
 */

/**
 *  deps
 */
//var inherits = require('inherits');
//var EventEmitter = require('events').EventEmitter;
var MatchmakerTown = require('./matchmaker.js');

/**
 *  export class
 */
module.exports = SmugglersTown;

/**
 *  constructor
 */
function SmugglersTown(firebaseBaseUrl) {


  google.maps.event.addDomListener(window, 'load', this.initialize);


  this.keepAliveParamName = 'keepalive';
  this.qs = new QueryString();

  this.matchmakerTown = new MatchmakerTown(firebaseBaseUrl);

  this.map = null; // the map canvas from the Google Maps v3 javascript API
  this.mapZoomLevel = 18;
  this.mapData = null; // the level data for this map (base locations)

  this.itemMapObject = null;
  // the itemMapObject will be of this form:
  // {
  //   location: <google_maps_LatLng_object>,
  //   marker: <google_maps_Marker_object>
  // }

  // default to the grand canyon, but this will be loaded from a map file
  this.mapCenter = new google.maps.LatLng(36.151103, -113.208565);



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
  this.teamTownObject = {
    users: [],
    baseObject: {
      location: {
        lat: 36.151103,
        lng: -113.208565
      }
    },
    numItemsReturned: 0
  };
  this.teamCrushObject = {
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
  this.now;
  this.dt = 0;
  this.last = timestamp.call(this);
  this.step = 1 / 60;

  // user data
  this.username = null;

  // game hosting data
  this.gameId = null;
  this.hostPeerId = null;

  // car properties
  this.rotation = 0;
  this.deceleration = 1.1;
  this.MAX_NORMAL_SPEED = 18;
  this.MAX_BOOST_SPEED = 40;
  this.BOOST_FACTOR = 1.07;
  this.BOOST_CONSUMPTION_RATE = 0.5;
  this.maxSpeed = this.MAX_NORMAL_SPEED;
  this.rotationCss = '';
  this.arrowRotationCss = '';
  this.latitudeSpeedFactor = 1000000;
  this.longitudeSpeedFactor = 500000;

  // collision engine info
  this.carToItemCollisionDistance = 20;
  this.carToBaseCollisionDistance = 43;

  // map data
  this.mapDataLoaded = false;
  this.widthOfAreaToPutItems = 0.008; // in latitude degrees
  this.heightOfAreaToPutItems = 0.008; // in longitude degrees
  this.minItemDistanceFromBase = 300;

  // these map objects will be of the form:
  // {
  //   location: <google_maps_LatLng_object>,
  //   marker: <google_maps_Marker_object>
  // }
  this.teamTownBaseMapObject = {
    location: this.mapCenter,
    marker: null
  }
  this.teamCrushBaseMapObject = null;
  this.myTeamBaseMapObject = this.teamTownBaseMapObject;

  // gameplay

  this.gameDataObject = {
    teamTownObject: this.teamTownObject,
    teamCrushObject: this.teamCrushObject,
    peerIdOfCarWithItem: null,
    initialLocation: {
      lat: this.mapCenter.lat(),
      lng: this.mapCenter.lng()
    }
  };
  // this will be of the form
  // {
  //   teamTownObject: <team_object>,
  //   teamCrushObject: <team_object>,
  //   peerIdOfCarWithItem: null,
  //   initialLocation: {
  //     lat: 35,
  //     lng: -132
  // }
  //   itemObject: {
  //     id: 576,
  //     location: {
  //       lat: 34,
  //       lng: -133
  //     }
  //   }
  // }


  this.collectedItem = null;
  // set the initial destination to whatever, it will be reset 
  // when an item is first placed
  this.destination = new google.maps.LatLng(45.489391, -122.647586);
  this.timeDelayBetweenTransfers = 1000; // in ms
  this.timeOfLastTransfer = null;

  // object of the other users
  this.otherUsers = {};
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
  this.itemIcon = {
    url: 'images/smoking_toilet_small.gif'
  };

  this.teamCrushUserCarIcon = {
    url: 'images/crush_car.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(16, 32)
  };
  this.teamTownUserCarIcon = {
    url: 'images/car.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(16, 32)
  };
  this.teamTownOtherCarIcon = {
    url: 'images/team_town_other_car.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(16, 32)
  };
  this.teamCrushOtherCarIcon = {
    url: 'images/team_crush_other_car.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(16, 32)
  };

  this.teamTownBaseIcon = {
    url: 'images/fort.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(75, 120)
  };

  this.teamCrushBaseIcon = {
    url: 'images/opponent_fort.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(75, 120)
  };

  this.teamTownBaseTransparentIcon = {
    url: 'images/fort_transparent.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(75, 120)
  };

  this.teamCrushBaseTransparentIcon = {
    url: 'images/opponent_fort_transparent.png',
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(75, 120)
  };


  // peer JS connection (for multiplayer webRTC)
  this.peer = new Peer({
    key: 'j3m0qtddeshpk3xr'
  });
  this.peer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
    $('#peer-id').text(id);
    $('#peer-connection-status').text('waiting for a smuggler to battle...');
  });
  this.peer.on('connection', this.connectedToPeer);
  this.ACTIVE_CONNECTION_TIMEOUT_IN_SECONDS = 30 * 1000;
}

/**
 *  initialize the game
 */
SmugglersTown.prototype.initialize = function() {
  var self = this;

  this.username = prompt('Choose your Smuggler Name:', 'Ninja Roy');
  createMapOnPage.call(this);
  loadMapData.call(this, mapIsReady);

  // these are set to true when keys are being pressed
  this.rightDown = false;
  this.leftDown = false;
  this.upDown = false;
  this.downDown = false;
  this.ctrlDown = false;

  this.speed = 0;
  this.rotation = 0;
  this.horizontalSpeed = 0;
  this.rotationCss = '';

  //tryFindingLocation();


  bindKeyAndButtonEvents.call(this);

  initializeBoostBar.call(this);

  // start the game loop
  requestAnimationFrame.call(this, frame);
}


function initializeBoostBar() {
  $(function() {
    $("#boost-bar").progressbar({
      value: 100
    });
  });
}

function mapIsReady() {
  matchmakerTown.joinOrCreateGame(username, peer.id, connectToAllNonHostUsers, gameJoined)
}

function gameJoined(gameData, isNewGame) {
  gameId = gameData.id;
  if (isNewGame) {
    // we're hosting the game ourself
    hostPeerId = peer.id;
    // first user is always on team town
    this.gameData.teamTownObject.users = [{
      peerId: peer.id,
      username: username
    }];
    $('#team-town-text').css('background-color', 'yellow');
    $('#team-town-text').css('color', 'black');
  } else {
    // someone else is already the host
    hostPeerId = gameData.hostPeerId;
    activateTeamCrushInUI();
  }
  updateUsernamesInUI();
  updateCarIcons();
}

function updateUsernamesInUI() {
  var teamTownJqueryElem = $('#team-town-usernames');
  updateTeamUsernamesInUI(teamTownJqueryElem, this.gameDataObject.teamTownObject.users);
  var teamCrushJqueryElem = $('#team-crush-usernames');
  updateTeamUsernamesInUI(teamCrushJqueryElem, this.gameDataObject.teamCrushObject.users);
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
  }
}

function activateTeamCrushInUI() {
  $('#team-crush-text').css('opacity', '1');
  var teamCrushScore = 0;
  if (this.gameDataObject.teamCrushObject.numItemsReturned) {
    teamCrushScore = this.gameDataObject.teamCrushObject.numItemsReturned;
  }
  $('#num-items-team-crush').text(teamCrushScore);
}


function connectToAllNonHostUsers(nonHostPeerIds) {
  for (var i = 0; i < nonHostPeerIds.length; i++) {
    if (nonHostPeerIds[i] != peer.id) {
      connectToPeer.call(this, nonHostPeerIds[i]);
    }
  }
}

function bindKeyAndButtonEvents() {
  $(window).resize(function() {
    resizeMapToFit.call(this);
  });

  $(document).keydown(this.onKeyDown);
  $(document).keyup(this.onKeyUp);
  $('#connect-button').click(function(evt) {
    var peerId = $('#peer-id-textbox').val();
    console.log('peer id connecting: ' + peerId);
    connectToPeer.call(this, peerId);
  });
  $('#set-center-button').click(function(evt) {
    var searchTerm = $('#map-center-textbox').val();
    if (!searchTerm) {
      return;
    }
    console.log('setting center to: ' + searchTerm);
    searchAndCenterMap.call(this, searchTerm);
    broadcastNewLocation.call(this, mapCenter);
    randomlyPutItems.call(this);
  });
  window.onbeforeunload = this.disconnectFromGame;
}

function disconnectFromGame() {
  if (this.peer && this.peer.id && this.gameId) {
    matchmakerTown.removePeerFromGame(this.gameId, this.peer.id);
  }
}

function createMapOnPage() {
  var mapOptions = {
    zoom: this.mapZoomLevel,
    center: this.mapCenter,
    keyboardShortcuts: false,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    disableDefaultUI: true,
    minZoom: this.mapZoomLevel,
    maxZoom: this.mapZoomLevel,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    draggable: false,
  }

  this.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  // not necessary, just want to allow the right-click context menu
  google.maps.event.addListener(this.map, 'click', function(e) {
    contextmenu: true
  });
  google.maps.event.addListener(this.map, "rightclick", this.showContextMenu);

  resizeMapToFit.call(this);
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
  setGameToNewLocation.call(this, latString, lngString);
}

function loadMapData(mapIsReadyCallback) {
  var self = this;
  this.mapDataLoaded = false;
  console.log('loading map data');

  // TODO: 
  // to read static files in
  // you need to pass "-t brfs" to browserify
  // but it's cool cos you can inline base64 encoded images or utf8 html strings
  //$.getJSON("maps/grandcanyon.json", function(json) {
  $.getJSON("maps/portland.json", function(json) {
    console.log('map data loaded');
    self.mapData = json;
    self.mapDataLoaded = true;
    self.mapCenter = new google.maps.LatLng(self.mapData.map.centerLatLng.lat, self.mapData.map.centerLatLng.lng);
    self.map.setCenter(self.mapCenter);
    self.gameDataObject.initialLocation = {
      lat: self.mapCenter.lat(),
      lng: self.mapCenter.lng()
    };

    createTeamTownBase.call(self, self.mapData.map.teamTownBaseLatLng.lat, self.mapData.map.teamTownBaseLatLng.lng);
    createTeamCrushBase.call(this, self.mapData.map.teamCrushBaseLatLng.lat, self.mapData.map.teamCrushBaseLatLng.lng);
    self.myTeamBaseMapObject = self.teamTownBaseMapObject;

    randomlyPutItems.call(this);
    mapIsReadyCallback();
  });
}

function createTeamTownBase(lat, lng) {
  this.gameDataObject.teamTownObject.baseObject = createTeamTownBaseObject.call(this, lat, lng);
  createTeamTownBaseMapObject.call(this, lat, lng);
}

function createTeamCrushBase(lat, lng) {
  this.gameDataObject.teamCrushObject.baseObject = createTeamCrushBaseObject.call(this, lat, lng);
  createTeamCrushBaseMapObject.call(this, lat, lng);
}

function createTeamTownBaseMapObject(lat, lng) {
  // if there's already a team Town base on the map, remove it
  if (this.teamTownBaseMapObject && this.teamTownBaseMapObject.marker) {
    this.teamTownBaseMapObject.marker.setMap(null);
  }

  this.teamTownBaseMapObject = {};
  this.teamTownBaseMapObject.location = new google.maps.LatLng(lat, lng);
  this.teamTownBaseMapObject.marker = new google.maps.Marker({
    title: 'Team Town Base',
    map: this.map,
    position: this.teamTownBaseMapObject.location,
    icon: this.teamTownBaseIcon
  });
}

function createTeamTownBaseObject(lat, lng) {
  var teamTownBaseObject = {};
  teamTownBaseObject.location = {
    lat: lat,
    lng: lng
  };

  return teamTownBaseObject;
}

function createTeamCrushBaseMapObject(lat, lng) {
  // if there's already a team Crush base on the map, remove it
  if (this.teamCrushBaseMapObject && this.teamCrushBaseMapObject.marker) {
    this.teamCrushBaseMapObject.marker.setMap(null);
  }

  this.teamCrushBaseMapObject = {};
  this.teamCrushBaseMapObject.location = new google.maps.LatLng(lat, lng);
  this.teamCrushBaseMapObject.marker = new google.maps.Marker({
    title: 'Team Crush Base',
    map: this.map,
    position: this.teamCrushBaseMapObject.location,
    icon: this.teamCrushBaseIcon
  });
}

function createTeamCrushBaseObject(lat, lng) {

  var teamCrushBaseObject = {};
  teamCrushBaseObject.location = {
    lat: lat,
    lng: lng
  };

  return teamCrushBaseObject;
}

function randomlyPutItems() {
  var randomLocation = getRandomLocationForItem.call(this);
  var itemId = getRandomInRange(1, 1000000, 0);
  this.gameDataObject.itemObject = {
    id: itemId,
    location: {
      lat: randomLocation.lat(),
      lng: randomLocation.lng()
    }
  }
  putNewItemOnMap.call(this, randomLocation, itemId);
  broadcastNewItem.call(this, randomLocation, itemId);
}

function getRandomLocationForItem() {
  // Find a random location that works, and if it's too close
  // to the base, pick another location
  var randomLocation = null;
  var centerOfAreaLat = this.myTeamBaseMapObject.location.lat();
  var centerOfAreaLng = this.myTeamBaseMapObject.location.lng();
  while (true) {
    randomLat = getRandomInRange(centerOfAreaLat -
      (this.widthOfAreaToPutItems / 2.0), centerOfAreaLat + (this.widthOfAreaToPutItems / 2.0), 7);
    randomLng = getRandomInRange(centerOfAreaLng -
      (this.heightOfAreaToPutItems / 2.0), centerOfAreaLng + (this.heightOfAreaToPutItems / 2.0), 7);
    console.log('trying to put item at: ' + randomLat + ',' + randomLng);
    randomLocation = new google.maps.LatLng(randomLat, randomLng);
    if (google.maps.geometry.spherical.computeDistanceBetween(randomLocation, this.myTeamBaseMapObject.location) > this.minItemDistanceFromBase) {
      return randomLocation;
    }
    console.log('item too close to base, choosing another location...');
  }
}

function putNewItemOnMap(location, itemId) {
  // eventually this should be redundant to clear this, but while
  // there's a bug on multiplayer joining, clear it again
  this.collectedItem = null;
  this.gameDataObject.peerIdOfCarWithItem = null;

  // set the base icon images to be the lighter ones
  this.teamTownBaseMapObject.marker.setIcon(this.teamTownBaseTransparentIcon);
  this.teamCrushBaseMapObject.marker.setIcon(this.teamCrushBaseTransparentIcon);

  // in case there's a lingering item, remove it
  if (this.itemMapObject && this.itemMapObject.marker && this.itemMapObject.marker.map) {
    this.itemMapObject.marker.setMap(null);
  }

  var itemMarker = new google.maps.Marker({
    map: this.map,
    title: 'Item',
    icon: this.itemIcon,
    // //TODO: FIX STUPID GOOGLE MAPS BUG that causes the gif marker
    // //to mysteriously not show up sometimes
    // optimized: false,
    position: location
  });

  this.itemMapObject = {
    marker: itemMarker,
    location: location
  };

  this.gameDataObject.itemObject.location = {
    lat: location.lat(),
    lng: location.lng()
  };

  setDestination.call(this, location, 'arrow.png');
  return itemId;
}

function handleBoosting() {
  this.maxSpeed = this.MAX_NORMAL_SPEED;
  if ($('#boost-bar').progressbar("value") || $('#boost-bar').progressbar("value") == 0) {
    var boostBarValue = $('#boost-bar').progressbar("value");
    if (this.ctrlDown && boostBarValue > 0) {
      boostBarValue -= this.BOOST_CONSUMPTION_RATE;
      $('#boost-bar').progressbar("value", boostBarValue);
      this.maxSpeed = this.MAX_BOOST_SPEED;
      this.speed *= this.BOOST_FACTOR;
      if (Math.abs(this.speed) > this.maxSpeed) {
        if (this.speed < 0) {
          this.speed = -this.maxSpeed;
        } else {
          this.speed = this.maxSpeed;
        }
      }
      this.horizontalSpeed *= this.BOOST_FACTOR;
      if (Math.abs(this.horizontalSpeed) > this.maxSpeed) {
        if (this.horizontalSpeed < 0) {
          this.horizontalSpeed = -this.maxSpeed;
        } else {
          this.horizontalSpeed = this.maxSpeed;
        }
      }
    }
    if (this.ctrlDown && boostBarValue <= 0) {
      flashElement.call(this, $('#boost-bar'));
    }
  }

  return this.maxSpeed;
}

function moveCar() {
  this.maxSpeed = handleBoosting.call(this);

  // if Up or Down key is pressed, change the speed. Otherwise,
  // decelerate at a standard rate
  if (this.upDown || this.downDown) {
    if (this.upDown) {
      if (this.speed <= this.maxSpeed) {
        this.speed += 1;
      }
    }
    if (this.downDown) {
      if (this.speed >= -this.maxSpeed) {
        this.speed -= 1;
      }
    }

  }

  // if Left or Right key is pressed, change the horizontal speed.
  // Otherwise, decelerate at a standard rate
  if (this.leftDown || this.rightDown) {
    if (this.rightDown) {
      if (this.horizontalSpeed <= this.maxSpeed) {
        this.horizontalSpeed += 1;
      }
    }
    if (this.leftDown) {
      if (this.horizontalSpeed >= -this.maxSpeed) {
        this.horizontalSpeed -= 1;
      }
    }
  }

  if ((!this.upDown && !this.downDown) || (!this.ctrlDown && Math.abs(this.speed) > this.MAX_NORMAL_SPEED)) {
    if (speed > -0.01 && speed < 0.01) {
      speed = 0;
    } else {
      speed /= deceleration;
    }
  }

  if ((!leftDown && !rightDown) || (!ctrlDown && Math.abs(horizontalSpeed) > MAX_NORMAL_SPEED)) {
    if (this.horizontalSpeed > -0.01 && this.horizontalSpeed < 0.01) {
      this.horizontalSpeed = 0;
    } else {
      this.horizontalSpeed /= this.deceleration;
    }
  }

  // optimization - only if the car is moving should we spend
  // time resetting the map
  if (this.speed != 0 || this.horizontalSpeed != 0) {
    var newLat = this.map.getCenter().lat() + (this.speed / this.latitudeSpeedFactor);
    var newLng = this.map.getCenter().lng() + (this.horizontalSpeed / this.longitudeSpeedFactor);
    this.mapCenter = new google.maps.LatLng(newLat, newLng);
    this.map.setCenter(this.mapCenter);

  }

  rotateCar.call(this);
  if (this.teamTownBaseMapObject.location) {
    rotateArrow.call(this);
  }
}

function connectToPeer(otherUserPeerId) {
  console.log('trying to connect to ' + otherUserPeerId);
  $('#peer-connection-status').text('trying to connect to ' + otherUserPeerId);
  var peerJsConnection = this.peer.connect(otherUserPeerId);
  peerJsConnection.on('open', function() {
    console.log('connection open');
    connectedToPeer.call(this, peerJsConnection);
  });
  peerJsConnection.on('error', function(err) {
    console.log("PEERJS ERROR: ");
    console.log(err);
    throw "PeerJS connection error";
  });
}

function connectedToPeer(peerJsConnection) {
  var otherUserPeerId = peerJsConnection.peer;
  console.log('connected to ' + otherUserPeerId);
  $('#peer-connection-status').text('connected to ' + otherUserPeerId);

  // if this is the first time we've connected to this uesr,
  // add the HTML for the new user
  if (!this.otherUsers[otherUserPeerId] || !this.otherUsers[otherUserPeerId].peerJsConnection) {
    initializePeerConnection.call(this, peerJsConnection, otherUserPeerId);
    assignUserToTeam.call(this, otherUserPeerId);
    createOtherUserCar.call(this, otherUserPeerId);
  }
  updateUsernamesInUI.call(this);
}

function createOtherUserCar(otherUserPeerId) {
  this.otherUsers[otherUserPeerId].peerId = otherUserPeerId;
  this.otherUsers[otherUserPeerId].car = {};
}

function assignUserToTeam(otherUserPeerId) {
  // if the user is already on a team, ignore this
  if (isUserOnTeam.call(this, otherUserPeerId, this.gameDataObject.teamTownObject.users) ||
    isUserOnTeam.call(this, otherUserPeerId, this.gameDataObject.teamCrushObject.users)) {
    return;
  }

  var userObject = {
    peerId: otherUserPeerId,
    username: null
  };
  // for now, just alternate who goes on each team
  if (this.gameDataObject.teamTownObject.users.length > this.gameDataObject.teamCrushObject.users.length) {
    activateTeamCrushInUI.call(this);
    this.gameDataObject.teamCrushObject.users.push(userObject);
  } else {
    this.gameDataObject.teamTownObject.users.push(userObject);
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
  if (userIsOnTownTeam.call(this, this.peer.id)) {
    $('#team-town-text').css('background-color', 'yellow');
    $('#team-town-text').css('color', 'black');
    $('#team-crush-text').css('background-color', '#667');
  } else {
    $('#team-crush-text').css('background-color', 'red');
    $('#team-town-text').css('background-color', '#666');
  }
}

function initializePeerConnection(peerJsConnection, otherUserPeerId) {
  if (!this.otherUsers[otherUserPeerId]) {
    this.otherUsers[otherUserPeerId] = {};
  }
  this.otherUsers[otherUserPeerId].peerJsConnection = peerJsConnection;
  this.otherUsers[otherUserPeerId].peerJsConnection.on('close', function() {
    console.log('closing connection');
    otherUserDisconnected.call(this, otherUserPeerId);
  });
  this.otherUsers[otherUserPeerId].peerJsConnection.on('data', function(data) {
    dataReceived.call(this, data);
  });
}

function fadeArrowToImage(imageFileName) {
  $("#arrow-img").attr('src', 'images/' + imageFileName);
}

function otherUserDisconnected(otherUserPeerId) {
  // should be called after the peerJs connection
  // has already been closed
  if (!this.otherUsers[otherUserPeerId]) {
    return;
  }

  removeUserFromTeam.call(this, otherUserPeerId);
  removeUserFromUI.call(this, otherUserPeerId);

  // remove this user from the game in Firebase:
  matchmakerTown.removePeerFromGame(gameId, otherUserPeerId);

  if (this.hostPeerId == otherUserPeerId) {
    // if that user was the host, set us as the new host
    this.hostPeerId = this.peer.id;
    switchToNewHost.call(this, this.gameId, this.peer.id);
  }

  // if the user who disconnected currently had an item,
  // put out a new one
  if (this.gameDataObject.peerIdOfCarWithItem && this.gameDataObject.peerIdOfCarWithItem == otherUserPeerId && this.hostPeerId == this.peer.id) {
    randomlyPutItems.call(this);
  }

  // delete that user's data
  delete this.otherUsers[otherUserPeerId];

  // if there any users left, broadcast them the new game state
  if (Object.keys(this.otherUsers).length > 0) {
    broadcastGameStateToAllPeers.call(this);
  } else {
    $('#peer-connection-status').text('waiting for a smuggler to battle...');
  }

}

function removeUserFromTeam(userPeerId) {
  for (var i = this.gameDataObject.teamTownObject.users.length - 1; i >= 0; i--) {
    if (this.gameDataObject.teamTownObject.users[i].peerId == userPeerId) {
      this.gameDataObject.teamTownObject.users.splice(i, 1);
    }
  }
  for (var j = this.gameDataObject.teamCrushObject.users.length - 1; j >= 0; j--) {
    if (this.gameDataObject.teamCrushObject.users[j].peerId == userPeerId) {
      this.gameDataObject.teamCrushObject.users.splice(j, 1);
    }
  }
}

function removeUserFromUI(peerId) {
  // remove the other user's car from the map
  this.otherUsers[peerId].car.marker.setMap(null);

  // if their team has no more users, grey out
  // their score box
  if (this.gameDataObject.teamCrushObject.users.length == 0) {
    $('#team-crush-text').css('opacity', '0.3');
  }

  updateUsernamesInUI.call(this);
}

function otherUserChangedLocation(lat, lng) {
  setGameToNewLocation.call(this, lat, lng);
}

function broadcastGameStateToAllPeers() {
  for (var user in this.otherUsers) {
    broadcastGameState.call(this, user);
  }
}

function dataReceived(data) {
  if (data.peerId) {
    // if we are the host, and the user who sent this data hasn't been given the initial game
    // state, then broadcast it to them
    if (this.otherUsers[data.peerId] && !this.otherUsers[data.peerId].hasBeenInitialized && hostPeerId == peer.id) {
      this.otherUsers[data.peerId].hasBeenInitialized = true;
      // not sure if we should do this or not, but at least it resets the game
      // state to what we, the host, think it is
      broadcastGameStateToAllPeers();
      // if not that, then we should just broadcast to the new guy like this:
      // broadcastGameState(data.peerId);
    }
    if (this.otherUsers[data.peerId]) {
      this.otherUsers[data.peerId].lastUpdateTime = (new Date()).getTime();
    }
  }

  if (data.event) {
    if (data.event.name == 'update_game_state') {
      console.log('received event: update game state');
      // we only want to recenter the map in the case that this is a new user
      // joining for the first time, and the way to tell that is to see if the
      // initial location has changed.  Once the user is already joined, if a
      // location change is initiated, that will use the 'new_location' event 
      if (parseFloat(data.event.gameDataObject.initialLocation.lat) != parseFloat(gameDataObject.initialLocation.lat) ||
        parseFloat(data.event.gameDataObject.initialLocation.lng) != parseFloat(gameDataObject.initialLocation.lng)) {
        map.setCenter(new google.maps.LatLng(
          data.event.gameDataObject.initialLocation.lat,
          data.event.gameDataObject.initialLocation.lng));
      }
      gameDataObject = data.event.gameDataObject;
      // need to make this call because we can be in a situation where the host
      // doesn't know our username yet, so we need to manually set it in our
      // own UI first.
      updateUsername(peer.id, username);
      updateUIWithNewGameState();
      assignMyTeamBase();
      updateCarIcons();
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
        destination = this.otherUsers[data.event.toUserPeerId].car.location;
      }
    }
  }

  // if the user sent a username that we haven't seen yet, set it
  if (data.peerId && data.username && !this.otherUsers[data.peerId].username) {
    updateUsername(data.peerId, data.username);
  }

  if (data.peerId && data.carLatLng && this.otherUsers[data.peerId]) {
    moveOtherCar(this.otherUsers[data.peerId], new google.maps.LatLng(data.carLatLng.lat, data.carLatLng.lng));
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
  // recenter the map
  console.log('new location received: ' + gameDataObject.initialLocation);
  mapCenter = new google.maps.LatLng(gameDataObject.initialLocation.lat, gameDataObject.initialLocation.lng);
  updateBaseLocationsInUI();
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

function updateBaseLocationsInUI() {
  createTeamTownBaseMapObject(
    gameDataObject.teamTownObject.baseObject.location.lat,
    gameDataObject.teamTownObject.baseObject.location.lng);
  createTeamCrushBaseMapObject(
    gameDataObject.teamCrushObject.baseObject.location.lat,
    gameDataObject.teamCrushObject.baseObject.location.lng);
}

function updateCarIcons() {
  updateTeamUsersCarIcons(gameDataObject.teamTownObject.users, teamTownOtherCarIcon);
  updateTeamUsersCarIcons(gameDataObject.teamCrushObject.users, teamCrushOtherCarIcon);
  updateMyCarIcon();
}

function updateMyCarIcon() {
  var userCarImgSrc = 'images/crush_car.png';
  if (userIsOnTownTeam(peer.id)) {
    userCarImgSrc = 'images/car.png';
  }
  $('#car-img').attr('src', userCarImgSrc);
}

function updateTeamUsersCarIcons(teamUsers, teamCarIcon) {
  for (var i = 0; i < teamUsers.length; i++) {
    // remove any existing marker
    if (this.otherUsers[teamUsers[i].peerId] && this.otherUsers[teamUsers[i].peerId].car && this.otherUsers[teamUsers[i].peerId].car.marker) {
      this.otherUsers[teamUsers[i].peerId].car.marker.setMap(null);
    }

    if (teamUsers[i].peerId != peer.id) {
      this.otherUsers[teamUsers[i].peerId].car.marker = new google.maps.Marker({
        map: map,
        title: teamUsers[i].peerId,
        icon: teamCarIcon
      });
    }

  }
}

function updateScoresInUI(teamTownNumItemsReturned, teamCrushNumItemsReturned) {
  $('#num-items-team-town').text(teamTownNumItemsReturned);
  flashElement.call(this, $('#num-items-team-town'));
  $('#num-items-team-crush').text(teamCrushNumItemsReturned);
  flashElement.call(this, $('#num-items-team-crush'));
}

function moveItemOnMap(lat, lng) {
  console.log('moving item to new location: ' + lat + ',' + lng);
  gameDataObject.itemObject.location.lat = lat;
  gameDataObject.itemObject.location.lng = lng;
  itemMapObject.location = new google.maps.LatLng(lat, lng);
  itemMapObject.marker.setPosition(itemMapObject.location);
}

function otherUserReturnedItem(otherUserPeerId, nowNumItemsForUser) {
  gameDataObject.peerIdOfCarWithItem = null;
  incrementItemCount(userIsOnTownTeam(otherUserPeerId))
  fadeArrowToImage('arrow.png');
}

function moveOtherCar(otherUserObject, newLocation) {
  if (!otherUserObject.car) {
    return;
  }

  otherUserObject.car.location = newLocation;
  if (!otherUserObject.car.marker) {
    updateCarIcons();
  }
  // if the other car has an item, update the destination
  // to be it
  if (gameDataObject.peerIdOfCarWithItem == otherUserObject.peerId) {
    var arrowImg = 'arrow_red.png';
    if (userIsOnMyTeam(otherUserObject.peerId)) {
      arrowImg = 'arrow_green_blue.png';
    }
    setDestination(newLocation, arrowImg);
  }
  transferItemIfCarsHaveCollided(otherUserObject.car.location, otherUserObject.peerId);
  otherUserObject.car.marker.setPosition(otherUserObject.car.location);
}

function userIsOnMyTeam(otherUserPeerId) {
  var myTeam = null;
  var otherUserTeam = null;
  for (var i = 0; i < gameDataObject.teamTownObject.users.length; i++) {
    if (gameDataObject.teamTownObject.users[i].peerId == peer.id) {
      myTeam = 'town';
    }
    if (gameDataObject.teamTownObject.users[i].peerId == otherUserPeerId) {
      otherUserTeam = 'town';
    }
  }
  for (var i = 0; i < gameDataObject.teamCrushObject.users.length; i++) {
    if (gameDataObject.teamCrushObject.users[i].peerId == peer.id) {
      myTeam = 'crush';
    }
    if (gameDataObject.teamCrushObject.users[i].peerId == otherUserPeerId) {
      otherUserTeam = 'crush';
    }
  }
  return myTeam == otherUserTeam;
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
  var arrowImg = 'arrow_red.png';
  if (userIsOnMyTeam(toUserPeerId)) {
    arrowImg = 'arrow_green_blue.png';
  }
  setDestination(this.otherUsers[toUserPeerId].car.location, arrowImg);
}

function otherUserCollectedItem(userId) {
  console.log('other user collected item');
  gameDataObject.peerIdOfCarWithItem = userId;
  itemMapObject.marker.setMap(null);
  var arrowImg = 'arrow_red.png';
  if (userIsOnMyTeam(userId)) {
    arrowImg = 'arrow_green_blue.png';
  }
  fadeArrowToImage(arrowImg);
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
    if (this.gameDataObject.teamTownObject.users[i].peerId == peerId) {
      return true;
    }
  }
}

function incrementItemCount(isTeamTown) {
  if (isTeamTown) {
    this.gameDataObject.teamTownObject.numItemsReturned++;
    $('#num-items-team-town').text(this.gameDataObject.teamTownObject.numItemsReturned);
    flashElement.call(this, $('#num-items-team-town'));
  } else {
    this.gameDataObject.teamCrushObject.numItemsReturned++;
    $('#num-items-team-crush').text(this.gameDataObject.teamCrushObject.numItemsReturned);
    flashElement.call(this, $('#num-items-team-crush'));
  }
}

function flashElement(jqueryElem) {
  jqueryElem.fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
}

function userCollidedWithItem(collisionItemObject) {
  this.collectedItem = collisionItemObject;
  this.itemMapObject.marker.setMap(null);
  collisionItemObject.location = null;
  this.gameDataObject.peerIdOfCarWithItem = peer.id;
  this.teamTownBaseMapObject.marker.setIcon(this.teamTownBaseIcon);
  this.teamCrushBaseMapObject.marker.setIcon(this.teamCrushBaseIcon);
  setDestination.call(this, this.myTeamBaseMapObject.location, 'arrow_blue.png');
}

function setDestination(location, arrowImageName) {
  this.destination = location;
  fadeArrowToImage.call(this, arrowImageName);
}

function rotateCar() {
  this.rotation = getAngle.call(this, speed, horizontalSpeed);
  this.rotationCss = '-ms-transform: rotate(' + this.rotation + 'deg); /* IE 9 */ -webkit-transform: rotate(' + this.rotation + 'deg); /* Chrome, Safari, Opera */ transform: rotate(' + this.rotation + 'deg);';
}

function rotateArrow() {
  this.arrowRotation = computeBearingAngle.call(this, this.mapCenter.lat(), this.mapCenter.lng(), this.destination.lat(), this.destination.lng());
  this.arrowRotationCss = '-ms-transform: rotate(' + this.arrowRotation + 'deg); /* IE 9 */ -webkit-transform: rotate(' + this.arrowRotation + 'deg); /* Chrome, Safari, Opera */ transform: rotate(' + this.arrowRotation + 'deg);';
}

function update(step) {
  moveCar.call(this);

  if (this.gameDataObject && this.gameDataObject.peerIdOfCarWithItem) {
    // check for collisions between one car with an item and one without
    if (this.gameDataObject.peerIdOfCarWithItem == this.peer.id) {
      // if this user has an item, check to see if they are colliding
      // with any other user, and if so, transfer the item
      for (var user in this.otherUsers) {
        transferItemIfCarsHaveCollided.call(this, this.otherUsers[user].car.location, this.otherUsers[user].peerId);
      }
    } else {
      // if another user has an item, and their car has a location,
      // then constantly set the destination to their location
      if (this.otherUsers[this.gameDataObject.peerIdOfCarWithItem] && this.otherUsers[this.gameDataObject.peerIdOfCarWithItem].location && this.otherUsers[this.gameDataObject.peerIdOfCarWithItem].car.location) {
        this.destination = this.otherUsers[this.gameDataObject.peerIdOfCarWithItem].car.location;
      }
    }
  }

  // check if user collided with an item or the base
  var collisionMarker = getCollisionMarker();
  if (collisionMarker) {
    if (!collectedItem && collisionMarker == itemMapObject.marker) {
      // user just picked up an item
      userCollidedWithItem(this.gameDataObject.itemObject);
      broadcastItemCollected(this.gameDataObject.itemObject.id);
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
  $("#car-img").attr("style", this.rotationCss);
  $("#arrow-img").attr("style", this.arrowRotationCss);
}

function broadcastMyCarLocation() {
  for (var user in otherUsers) {
    if (this.otherUsers[user].peerJsConnection && this.otherUsers[user].peerJsConnection.open && mapCenter) {
      this.otherUsers[user].peerJsConnection.send({
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
  if (!this.otherUsers[otherUserPeerId] || !this.otherUsers[otherUserPeerId].peerJsConnection) {
    return;
  }

  var updateGameStateEventObject = {
    event: {
      name: 'update_game_state',
      gameDataObject: this.gameData
    }
  };
  this.otherUsers[otherUserPeerId].peerJsConnection.send(updateGameStateEventObject);
}

function broadcastNewItem(location, itemId) {
  for (var user in this.otherUsers) {
    if (this.otherUsers[user].peerJsConnection && this.otherUsers[user].peerJsConnection.open) {
      var simpleItemLatLng = {
        lat: location.lat(),
        lng: location.lng()
      };

      this.otherUsers[user].peerJsConnection.send({
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
  for (var user in this.otherUsers) {
    console.log('broadcasting item returned');
    if (!this.otherUsers[user].peerJsConnection || !this.otherUsers[user].peerJsConnection.open) {
      return;
    }
    this.otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_returned',
        user_id_of_car_that_returned_item: peer.id,
        now_num_items: this.gameData.teamTownObject.numItemsReturned,
      }
    });
  }
}

function broadcastItemCollected(itemId) {
  console.log('broadcasting item id ' + itemId + ' collected by user ' + peer.id);
  for (var user in this.otherUsers) {
    if (!this.otherUsers[user].peerJsConnection || !this.otherUsers[user].peerJsConnection.open) {
      return;
    }
    this.gameData.peerIdOfCarWithItem = peer.id;
    this.otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_collected',
        id: itemId,
        user_id_of_car_with_item: this.gameData.peerIdOfCarWithItem
      }
    });
  }
}

function broadcastTransferOfItem(itemId, fromUserPeerId, toUserPeerId) {
  console.log('broadcasting item transferred ' + itemId + ' from ' + fromUserPeerId + ' to ' + toUserPeerId);
  for (var user in this.otherUsers) {
    if (!this.otherUsers[user].peerJsConnection || !this.otherUsers[user].peerJsConnection.open) {
      return;
    }
    this.otherUsers[user].peerJsConnection.send({
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
  for (var user in this.otherUsers) {
    if (!this.otherUsers[user].peerJsConnection || !this.otherUsers[user].peerJsConnection.open) {
      return;
    }
    this.otherUsers[user].peerJsConnection.send({
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
  this.gameData.initialLocation = {
    lat: lat,
    lng: lng
  };
  createTeamTownBase(lat, lng);
  createTeamCrushBase((parseFloat(lat) + 0.006).toString(), (parseFloat(lng) + 0.008).toString());
  assignMyTeamBase();
  mapCenter = new google.maps.LatLng(lat, lng);
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
  } else if (evt.keyCode == 17) {
    ctrlDown = true;
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
  } else if (evt.keyCode == 17) {
    ctrlDown = false;
  }
}

// game loop helpers
function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

function frame() {
  this.now = timestamp.call(this);
  this.dt = this.dt + Math.min(1, (this.now - this.last) / 1000);
  while (this.dt > this.step) {
    this.dt = this.dt - this.step;
    update.call(this, this.step);
  }
  render.call(this, this.dt);
  this.last = this.now;
  requestAnimationFrame.call(this, frame);
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


// hack to allow for browser context menu on right-click
function mouseUp(e) {
  if (e.button == 2) { // right-click
    this.showContextMenu(e);
  }
}

// $(window).unload(function() {
//   disconnectFromGame();
// });
},{"./matchmaker.js":3}],3:[function(require,module,exports){
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
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvaW5kZXguanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9tYXBnYW1lLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWF0Y2htYWtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgU211Z2dsZXJzVG93biA9IHJlcXVpcmUoJy4vbWFwZ2FtZS5qcycpO1xuXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICB2YXIgZ2FtZSA9IG5ldyBTbXVnZ2xlcnNUb3duKCdodHRwczovL3NtdWdnbGVyc3Rvd24uZmlyZWJhc2Vpby5jb20vJyk7XG59KTsiLCIvKiBZT1VSIFNNVUdHTEVSIE1JU1NJT04sIElGIFlPVSBDSE9PU0UgVE8gQUNDRVBULCBJUyBUTyBKT0lOIFRFQU1cclxuICogVE9XTiBBTkQgVFJZIFRPIERFRkVBVCBURUFNIENSVVNILiAgQU5EIFlPVSBNVVNUIEFDQ0VQVC4uLlxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgbWFwZ2FtZS5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZGVwc1xyXG4gKi9cclxuLy92YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xyXG4vL3ZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBNYXRjaG1ha2VyVG93biA9IHJlcXVpcmUoJy4vbWF0Y2htYWtlci5qcycpO1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gU211Z2dsZXJzVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFNtdWdnbGVyc1Rvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcblxyXG5cclxuICBnb29nbGUubWFwcy5ldmVudC5hZGREb21MaXN0ZW5lcih3aW5kb3csICdsb2FkJywgdGhpcy5pbml0aWFsaXplKTtcclxuXHJcblxyXG4gIHRoaXMua2VlcEFsaXZlUGFyYW1OYW1lID0gJ2tlZXBhbGl2ZSc7XHJcbiAgdGhpcy5xcyA9IG5ldyBRdWVyeVN0cmluZygpO1xyXG5cclxuICB0aGlzLm1hdGNobWFrZXJUb3duID0gbmV3IE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCk7XHJcblxyXG4gIHRoaXMubWFwID0gbnVsbDsgLy8gdGhlIG1hcCBjYW52YXMgZnJvbSB0aGUgR29vZ2xlIE1hcHMgdjMgamF2YXNjcmlwdCBBUElcclxuICB0aGlzLm1hcFpvb21MZXZlbCA9IDE4O1xyXG4gIHRoaXMubWFwRGF0YSA9IG51bGw7IC8vIHRoZSBsZXZlbCBkYXRhIGZvciB0aGlzIG1hcCAoYmFzZSBsb2NhdGlvbnMpXHJcblxyXG4gIHRoaXMuaXRlbU1hcE9iamVjdCA9IG51bGw7XHJcbiAgLy8gdGhlIGl0ZW1NYXBPYmplY3Qgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG5cclxuICAvLyBkZWZhdWx0IHRvIHRoZSBncmFuZCBjYW55b24sIGJ1dCB0aGlzIHdpbGwgYmUgbG9hZGVkIGZyb20gYSBtYXAgZmlsZVxyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZygzNi4xNTExMDMsIC0xMTMuMjA4NTY1KTtcclxuXHJcblxyXG5cclxuICAvLyB0ZWFtIGRhdGFcclxuICAvLyB0aGUgdGVhbSBvYmplY3RzIHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIHVzZXJzOiBbe1xyXG4gIC8vICAgICBwZWVySWQ6IDEyMzQ1Njc4OSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdyb3knXHJcbiAgLy8gICB9LCB7XHJcbiAgLy8gICAgIHBlZXJJZDogOTg3NjU0MzIxLFxyXG4gIC8vICAgICB1c2VybmFtZTogJ2hhbSdcclxuICAvLyAgIH1dLFxyXG4gIC8vICAgYmFzZU9iamVjdDoge1xyXG4gIC8vICAgICBsb2NhdGlvbjoge1xyXG4gIC8vICAgICAgIGxhdDogMzQsXHJcbiAgLy8gICAgICAgbG5nOiAtMTMzXHJcbiAgLy8gICAgIH1cclxuICAvLyAgIH0sXHJcbiAgLy8gICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgLy8gfVxyXG4gIHRoaXMudGVhbVRvd25PYmplY3QgPSB7XHJcbiAgICB1c2VyczogW10sXHJcbiAgICBiYXNlT2JqZWN0OiB7XHJcbiAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgbG5nOiAtMTEzLjIwODU2NVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIH07XHJcbiAgdGhpcy50ZWFtQ3J1c2hPYmplY3QgPSB7XHJcbiAgICB1c2VyczogW10sXHJcbiAgICBiYXNlT2JqZWN0OiB7XHJcbiAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgbG5nOiAtMTEzLjIwODU2NVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIH07XHJcblxyXG4gIC8vIGZvciB0aW1lLWJhc2VkIGdhbWUgbG9vcFxyXG4gIHRoaXMubm93O1xyXG4gIHRoaXMuZHQgPSAwO1xyXG4gIHRoaXMubGFzdCA9IHRpbWVzdGFtcC5jYWxsKHRoaXMpO1xyXG4gIHRoaXMuc3RlcCA9IDEgLyA2MDtcclxuXHJcbiAgLy8gdXNlciBkYXRhXHJcbiAgdGhpcy51c2VybmFtZSA9IG51bGw7XHJcblxyXG4gIC8vIGdhbWUgaG9zdGluZyBkYXRhXHJcbiAgdGhpcy5nYW1lSWQgPSBudWxsO1xyXG4gIHRoaXMuaG9zdFBlZXJJZCA9IG51bGw7XHJcblxyXG4gIC8vIGNhciBwcm9wZXJ0aWVzXHJcbiAgdGhpcy5yb3RhdGlvbiA9IDA7XHJcbiAgdGhpcy5kZWNlbGVyYXRpb24gPSAxLjE7XHJcbiAgdGhpcy5NQVhfTk9STUFMX1NQRUVEID0gMTg7XHJcbiAgdGhpcy5NQVhfQk9PU1RfU1BFRUQgPSA0MDtcclxuICB0aGlzLkJPT1NUX0ZBQ1RPUiA9IDEuMDc7XHJcbiAgdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFID0gMC41O1xyXG4gIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9OT1JNQUxfU1BFRUQ7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyA9ICcnO1xyXG4gIHRoaXMubGF0aXR1ZGVTcGVlZEZhY3RvciA9IDEwMDAwMDA7XHJcbiAgdGhpcy5sb25naXR1ZGVTcGVlZEZhY3RvciA9IDUwMDAwMDtcclxuXHJcbiAgLy8gY29sbGlzaW9uIGVuZ2luZSBpbmZvXHJcbiAgdGhpcy5jYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZSA9IDIwO1xyXG4gIHRoaXMuY2FyVG9CYXNlQ29sbGlzaW9uRGlzdGFuY2UgPSA0MztcclxuXHJcbiAgLy8gbWFwIGRhdGFcclxuICB0aGlzLm1hcERhdGFMb2FkZWQgPSBmYWxzZTtcclxuICB0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsYXRpdHVkZSBkZWdyZWVzXHJcbiAgdGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zID0gMC4wMDg7IC8vIGluIGxvbmdpdHVkZSBkZWdyZWVzXHJcbiAgdGhpcy5taW5JdGVtRGlzdGFuY2VGcm9tQmFzZSA9IDMwMDtcclxuXHJcbiAgLy8gdGhlc2UgbWFwIG9iamVjdHMgd2lsbCBiZSBvZiB0aGUgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICBsb2NhdGlvbjogPGdvb2dsZV9tYXBzX0xhdExuZ19vYmplY3Q+LFxyXG4gIC8vICAgbWFya2VyOiA8Z29vZ2xlX21hcHNfTWFya2VyX29iamVjdD5cclxuICAvLyB9XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgPSB7XHJcbiAgICBsb2NhdGlvbjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBtYXJrZXI6IG51bGxcclxuICB9XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ID0gbnVsbDtcclxuICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgLy8gZ2FtZXBsYXlcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdCA9IHtcclxuICAgIHRlYW1Ub3duT2JqZWN0OiB0aGlzLnRlYW1Ub3duT2JqZWN0LFxyXG4gICAgdGVhbUNydXNoT2JqZWN0OiB0aGlzLnRlYW1DcnVzaE9iamVjdCxcclxuICAgIHBlZXJJZE9mQ2FyV2l0aEl0ZW06IG51bGwsXHJcbiAgICBpbml0aWFsTG9jYXRpb246IHtcclxuICAgICAgbGF0OiB0aGlzLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiB0aGlzLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfVxyXG4gIH07XHJcbiAgLy8gdGhpcyB3aWxsIGJlIG9mIHRoZSBmb3JtXHJcbiAgLy8ge1xyXG4gIC8vICAgdGVhbVRvd25PYmplY3Q6IDx0ZWFtX29iamVjdD4sXHJcbiAgLy8gICB0ZWFtQ3J1c2hPYmplY3Q6IDx0ZWFtX29iamVjdD4sXHJcbiAgLy8gICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gIC8vICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgLy8gICAgIGxhdDogMzUsXHJcbiAgLy8gICAgIGxuZzogLTEzMlxyXG4gIC8vIH1cclxuICAvLyAgIGl0ZW1PYmplY3Q6IHtcclxuICAvLyAgICAgaWQ6IDU3NixcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9XHJcbiAgLy8gfVxyXG5cclxuXHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICAvLyBzZXQgdGhlIGluaXRpYWwgZGVzdGluYXRpb24gdG8gd2hhdGV2ZXIsIGl0IHdpbGwgYmUgcmVzZXQgXHJcbiAgLy8gd2hlbiBhbiBpdGVtIGlzIGZpcnN0IHBsYWNlZFxyXG4gIHRoaXMuZGVzdGluYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKDQ1LjQ4OTM5MSwgLTEyMi42NDc1ODYpO1xyXG4gIHRoaXMudGltZURlbGF5QmV0d2VlblRyYW5zZmVycyA9IDEwMDA7IC8vIGluIG1zXHJcbiAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSBudWxsO1xyXG5cclxuICAvLyBvYmplY3Qgb2YgdGhlIG90aGVyIHVzZXJzXHJcbiAgdGhpcy5vdGhlclVzZXJzID0ge307XHJcbiAgLy8gdGhlIG90aGVyVXNlcnMgZGF0YSB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICAxMjM0NTY3ODk6IHtcclxuICAvLyAgICAgcGVlcklkOiAxMjM0Njc4OSxcclxuICAvLyAgICAgdXNlcm5hbWU6IGhlbGxvcm95LFxyXG4gIC8vICAgICBjYXI6IHtcclxuICAvLyAgICAgICBsb2NhdGlvbjogPGxvY2F0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgICAgbWFya2VyOiA8bWFya2VyX29iamVjdD5cclxuICAvLyAgICAgfSxcclxuICAvLyAgICAgcGVlckpzQ29ubmVjdGlvbjogPHBlZXJKc0Nvbm5lY3Rpb25fb2JqZWN0PixcclxuICAvLyAgICAgbGFzdFVwZGF0ZVRpbWU6IDx0aW1lX29iamVjdD4sXHJcbiAgLy8gICAgIG51bUl0ZW1zOiAwLFxyXG4gIC8vICAgICBoYXNCZWVuSW5pdGlhbGl6ZWQ6IHRydWVcclxuICAvLyAgIH0sXHJcbiAgLy8gICA5ODc2NTQzMjE6IHtcclxuICAvLyAgICAgcGVlcklkOiA5ODc2NTQzMjEsXHJcbiAgLy8gICAgIHVzZXJuYW1lOiB0b3dudG93bjkwMDAsXHJcbiAgLy8gICAgIGNhcjoge1xyXG4gIC8vICAgICAgIGxvY2F0aW9uOiA8bG9jYXRpb25fb2JqZWN0PixcclxuICAvLyAgICAgICBtYXJrZXI6IDxtYXJrZXJfb2JqZWN0PlxyXG4gIC8vICAgICB9LFxyXG4gIC8vICAgICBwZWVySnNDb25uZWN0aW9uOiA8cGVlckpzQ29ubmVjdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICBsYXN0VXBkYXRlVGltZTogPHRpbWVfb2JqZWN0PixcclxuICAvLyAgICAgbnVtSXRlbXM6IDVcclxuICAvLyAgIH1cclxuICAvLyB9XHJcblxyXG4gIC8vIGltYWdlc1xyXG4gIHRoaXMuaXRlbUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvc21va2luZ190b2lsZXRfc21hbGwuZ2lmJ1xyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoVXNlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvY3J1c2hfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbVRvd25Vc2VyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtVG93bk90aGVyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy90ZWFtX3Rvd25fb3RoZXJfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbUNydXNoT3RoZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3RlYW1fY3J1c2hfb3RoZXJfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvZm9ydC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvb3Bwb25lbnRfZm9ydC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2ZvcnRfdHJhbnNwYXJlbnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvb3Bwb25lbnRfZm9ydF90cmFuc3BhcmVudC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBwZWVyIEpTIGNvbm5lY3Rpb24gKGZvciBtdWx0aXBsYXllciB3ZWJSVEMpXHJcbiAgdGhpcy5wZWVyID0gbmV3IFBlZXIoe1xyXG4gICAga2V5OiAnajNtMHF0ZGRlc2hwazN4cidcclxuICB9KTtcclxuICB0aGlzLnBlZXIub24oJ29wZW4nLCBmdW5jdGlvbihpZCkge1xyXG4gICAgY29uc29sZS5sb2coJ015IHBlZXIgSUQgaXM6ICcgKyBpZCk7XHJcbiAgICAkKCcjcGVlci1pZCcpLnRleHQoaWQpO1xyXG4gICAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd3YWl0aW5nIGZvciBhIHNtdWdnbGVyIHRvIGJhdHRsZS4uLicpO1xyXG4gIH0pO1xyXG4gIHRoaXMucGVlci5vbignY29ubmVjdGlvbicsIHRoaXMuY29ubmVjdGVkVG9QZWVyKTtcclxuICB0aGlzLkFDVElWRV9DT05ORUNUSU9OX1RJTUVPVVRfSU5fU0VDT05EUyA9IDMwICogMTAwMDtcclxufVxyXG5cclxuLyoqXHJcbiAqICBpbml0aWFsaXplIHRoZSBnYW1lXHJcbiAqL1xyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB0aGlzLnVzZXJuYW1lID0gcHJvbXB0KCdDaG9vc2UgeW91ciBTbXVnZ2xlciBOYW1lOicsICdOaW5qYSBSb3knKTtcclxuICBjcmVhdGVNYXBPblBhZ2UuY2FsbCh0aGlzKTtcclxuICBsb2FkTWFwRGF0YS5jYWxsKHRoaXMsIG1hcElzUmVhZHkpO1xyXG5cclxuICAvLyB0aGVzZSBhcmUgc2V0IHRvIHRydWUgd2hlbiBrZXlzIGFyZSBiZWluZyBwcmVzc2VkXHJcbiAgdGhpcy5yaWdodERvd24gPSBmYWxzZTtcclxuICB0aGlzLmxlZnREb3duID0gZmFsc2U7XHJcbiAgdGhpcy51cERvd24gPSBmYWxzZTtcclxuICB0aGlzLmRvd25Eb3duID0gZmFsc2U7XHJcbiAgdGhpcy5jdHJsRG93biA9IGZhbHNlO1xyXG5cclxuICB0aGlzLnNwZWVkID0gMDtcclxuICB0aGlzLnJvdGF0aW9uID0gMDtcclxuICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG5cclxuICAvL3RyeUZpbmRpbmdMb2NhdGlvbigpO1xyXG5cclxuXHJcbiAgYmluZEtleUFuZEJ1dHRvbkV2ZW50cy5jYWxsKHRoaXMpO1xyXG5cclxuICBpbml0aWFsaXplQm9vc3RCYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gc3RhcnQgdGhlIGdhbWUgbG9vcFxyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZS5jYWxsKHRoaXMsIGZyYW1lKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVCb29zdEJhcigpIHtcclxuICAkKGZ1bmN0aW9uKCkge1xyXG4gICAgJChcIiNib29zdC1iYXJcIikucHJvZ3Jlc3NiYXIoe1xyXG4gICAgICB2YWx1ZTogMTAwXHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWFwSXNSZWFkeSgpIHtcclxuICBtYXRjaG1ha2VyVG93bi5qb2luT3JDcmVhdGVHYW1lKHVzZXJuYW1lLCBwZWVyLmlkLCBjb25uZWN0VG9BbGxOb25Ib3N0VXNlcnMsIGdhbWVKb2luZWQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhbWVKb2luZWQoZ2FtZURhdGEsIGlzTmV3R2FtZSkge1xyXG4gIGdhbWVJZCA9IGdhbWVEYXRhLmlkO1xyXG4gIGlmIChpc05ld0dhbWUpIHtcclxuICAgIC8vIHdlJ3JlIGhvc3RpbmcgdGhlIGdhbWUgb3Vyc2VsZlxyXG4gICAgaG9zdFBlZXJJZCA9IHBlZXIuaWQ7XHJcbiAgICAvLyBmaXJzdCB1c2VyIGlzIGFsd2F5cyBvbiB0ZWFtIHRvd25cclxuICAgIHRoaXMuZ2FtZURhdGEudGVhbVRvd25PYmplY3QudXNlcnMgPSBbe1xyXG4gICAgICBwZWVySWQ6IHBlZXIuaWQsXHJcbiAgICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gICAgfV07XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAneWVsbG93Jyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2NvbG9yJywgJ2JsYWNrJyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIHNvbWVvbmUgZWxzZSBpcyBhbHJlYWR5IHRoZSBob3N0XHJcbiAgICBob3N0UGVlcklkID0gZ2FtZURhdGEuaG9zdFBlZXJJZDtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSSgpO1xyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJKCk7XHJcbiAgdXBkYXRlQ2FySWNvbnMoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWVzSW5VSSgpIHtcclxuICB2YXIgdGVhbVRvd25KcXVlcnlFbGVtID0gJCgnI3RlYW0tdG93bi11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVG93bkpxdWVyeUVsZW0sIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpO1xyXG4gIHZhciB0ZWFtQ3J1c2hKcXVlcnlFbGVtID0gJCgnI3RlYW0tY3J1c2gtdXNlcm5hbWVzJyk7XHJcbiAgdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbUNydXNoSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0sIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICAvLyBjbGVhciB0aGUgY3VycmVudCBsaXN0IG9mIHVzZXJuYW1lc1xyXG4gIHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtLmVtcHR5KCk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VyT2JqZWN0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbmV3SnF1ZXJ5RWxlbSA9ICQoJC5wYXJzZUhUTUwoXHJcbiAgICAgICc8bGkgaWQ9XCJ1c2VybmFtZS0nICtcclxuICAgICAgdXNlck9iamVjdHNBcnJheVtpXS5wZWVySWQgK1xyXG4gICAgICAnXCI+JyArIHVzZXJPYmplY3RzQXJyYXlbaV0udXNlcm5hbWUgKyAnPC9saT4nXHJcbiAgICApKTtcclxuICAgICQodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0pLmFwcGVuZChuZXdKcXVlcnlFbGVtKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFjdGl2YXRlVGVhbUNydXNoSW5VSSgpIHtcclxuICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcclxuICB2YXIgdGVhbUNydXNoU2NvcmUgPSAwO1xyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKSB7XHJcbiAgICB0ZWFtQ3J1c2hTY29yZSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQ7XHJcbiAgfVxyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoU2NvcmUpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvQWxsTm9uSG9zdFVzZXJzKG5vbkhvc3RQZWVySWRzKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub25Ib3N0UGVlcklkcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG5vbkhvc3RQZWVySWRzW2ldICE9IHBlZXIuaWQpIHtcclxuICAgICAgY29ubmVjdFRvUGVlci5jYWxsKHRoaXMsIG5vbkhvc3RQZWVySWRzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJpbmRLZXlBbmRCdXR0b25FdmVudHMoKSB7XHJcbiAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpIHtcclxuICAgIHJlc2l6ZU1hcFRvRml0LmNhbGwodGhpcyk7XHJcbiAgfSk7XHJcblxyXG4gICQoZG9jdW1lbnQpLmtleWRvd24odGhpcy5vbktleURvd24pO1xyXG4gICQoZG9jdW1lbnQpLmtleXVwKHRoaXMub25LZXlVcCk7XHJcbiAgJCgnI2Nvbm5lY3QtYnV0dG9uJykuY2xpY2soZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICB2YXIgcGVlcklkID0gJCgnI3BlZXItaWQtdGV4dGJveCcpLnZhbCgpO1xyXG4gICAgY29uc29sZS5sb2coJ3BlZXIgaWQgY29ubmVjdGluZzogJyArIHBlZXJJZCk7XHJcbiAgICBjb25uZWN0VG9QZWVyLmNhbGwodGhpcywgcGVlcklkKTtcclxuICB9KTtcclxuICAkKCcjc2V0LWNlbnRlci1idXR0b24nKS5jbGljayhmdW5jdGlvbihldnQpIHtcclxuICAgIHZhciBzZWFyY2hUZXJtID0gJCgnI21hcC1jZW50ZXItdGV4dGJveCcpLnZhbCgpO1xyXG4gICAgaWYgKCFzZWFyY2hUZXJtKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdzZXR0aW5nIGNlbnRlciB0bzogJyArIHNlYXJjaFRlcm0pO1xyXG4gICAgc2VhcmNoQW5kQ2VudGVyTWFwLmNhbGwodGhpcywgc2VhcmNoVGVybSk7XHJcbiAgICBicm9hZGNhc3ROZXdMb2NhdGlvbi5jYWxsKHRoaXMsIG1hcENlbnRlcik7XHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgfSk7XHJcbiAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gdGhpcy5kaXNjb25uZWN0RnJvbUdhbWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc2Nvbm5lY3RGcm9tR2FtZSgpIHtcclxuICBpZiAodGhpcy5wZWVyICYmIHRoaXMucGVlci5pZCAmJiB0aGlzLmdhbWVJZCkge1xyXG4gICAgbWF0Y2htYWtlclRvd24ucmVtb3ZlUGVlckZyb21HYW1lKHRoaXMuZ2FtZUlkLCB0aGlzLnBlZXIuaWQpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTWFwT25QYWdlKCkge1xyXG4gIHZhciBtYXBPcHRpb25zID0ge1xyXG4gICAgem9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBjZW50ZXI6IHRoaXMubWFwQ2VudGVyLFxyXG4gICAga2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxyXG4gICAgbWFwVHlwZUlkOiBnb29nbGUubWFwcy5NYXBUeXBlSWQuU0FURUxMSVRFLFxyXG4gICAgZGlzYWJsZURlZmF1bHRVSTogdHJ1ZSxcclxuICAgIG1pblpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgbWF4Wm9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBzY3JvbGx3aGVlbDogZmFsc2UsXHJcbiAgICBkaXNhYmxlRG91YmxlQ2xpY2tab29tOiB0cnVlLFxyXG4gICAgZHJhZ2dhYmxlOiBmYWxzZSxcclxuICB9XHJcblxyXG4gIHRoaXMubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwLWNhbnZhcycpLCBtYXBPcHRpb25zKTtcclxuXHJcbiAgLy8gbm90IG5lY2Vzc2FyeSwganVzdCB3YW50IHRvIGFsbG93IHRoZSByaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xyXG4gICAgY29udGV4dG1lbnU6IHRydWVcclxuICB9KTtcclxuICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgXCJyaWdodGNsaWNrXCIsIHRoaXMuc2hvd0NvbnRleHRNZW51KTtcclxuXHJcbiAgcmVzaXplTWFwVG9GaXQuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzaXplTWFwVG9GaXQoKSB7XHJcbiAgJCgnYm9keScpLmhlaWdodCgkKHdpbmRvdykuaGVpZ2h0KCkgLSAyKTtcclxuICB2YXIgbWFpbkhlaWdodCA9ICQoJ2JvZHknKS5oZWlnaHQoKTtcclxuICB2YXIgY29udGVudEhlaWdodCA9XHJcbiAgICAkKCcjaGVhZGVyJykub3V0ZXJIZWlnaHQoKSArXHJcbiAgICAkKCcjZm9vdGVyJykub3V0ZXJIZWlnaHQoKTtcclxuICB2YXIgaCA9IG1haW5IZWlnaHQgLSBjb250ZW50SGVpZ2h0O1xyXG4gICQoJyNtYXAtYm9keScpLmhlaWdodChoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2VhcmNoQW5kQ2VudGVyTWFwKHNlYXJjaFRlcm0pIHtcclxuICB2YXIgcGFydHMgPSBzZWFyY2hUZXJtLnNwbGl0KCcsJyk7XHJcbiAgaWYgKCFwYXJ0cykge1xyXG4gICAgLy8gYmFkIHNlYXJjaCBpbnB1dCwgbXVzdCBiZSBpbiBsYXQsbG5nIGZvcm1cclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIGxhdFN0cmluZyA9IHBhcnRzWzBdO1xyXG4gIHZhciBsbmdTdHJpbmcgPSBwYXJ0c1sxXTtcclxuICBzZXRHYW1lVG9OZXdMb2NhdGlvbi5jYWxsKHRoaXMsIGxhdFN0cmluZywgbG5nU3RyaW5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZE1hcERhdGEobWFwSXNSZWFkeUNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMubWFwRGF0YUxvYWRlZCA9IGZhbHNlO1xyXG4gIGNvbnNvbGUubG9nKCdsb2FkaW5nIG1hcCBkYXRhJyk7XHJcblxyXG4gIC8vIFRPRE86IFxyXG4gIC8vIHRvIHJlYWQgc3RhdGljIGZpbGVzIGluXHJcbiAgLy8geW91IG5lZWQgdG8gcGFzcyBcIi10IGJyZnNcIiB0byBicm93c2VyaWZ5XHJcbiAgLy8gYnV0IGl0J3MgY29vbCBjb3MgeW91IGNhbiBpbmxpbmUgYmFzZTY0IGVuY29kZWQgaW1hZ2VzIG9yIHV0ZjggaHRtbCBzdHJpbmdzXHJcbiAgLy8kLmdldEpTT04oXCJtYXBzL2dyYW5kY2FueW9uLmpzb25cIiwgZnVuY3Rpb24oanNvbikge1xyXG4gICQuZ2V0SlNPTihcIm1hcHMvcG9ydGxhbmQuanNvblwiLCBmdW5jdGlvbihqc29uKSB7XHJcbiAgICBjb25zb2xlLmxvZygnbWFwIGRhdGEgbG9hZGVkJyk7XHJcbiAgICBzZWxmLm1hcERhdGEgPSBqc29uO1xyXG4gICAgc2VsZi5tYXBEYXRhTG9hZGVkID0gdHJ1ZTtcclxuICAgIHNlbGYubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzZWxmLm1hcERhdGEubWFwLmNlbnRlckxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAuY2VudGVyTGF0TG5nLmxuZyk7XHJcbiAgICBzZWxmLm1hcC5zZXRDZW50ZXIoc2VsZi5tYXBDZW50ZXIpO1xyXG4gICAgc2VsZi5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24gPSB7XHJcbiAgICAgIGxhdDogc2VsZi5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgIGxuZzogc2VsZi5tYXBDZW50ZXIubG5nKClcclxuICAgIH07XHJcblxyXG4gICAgY3JlYXRlVGVhbVRvd25CYXNlLmNhbGwoc2VsZiwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtVG93bkJhc2VMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLnRlYW1Ub3duQmFzZUxhdExuZy5sbmcpO1xyXG4gICAgY3JlYXRlVGVhbUNydXNoQmFzZS5jYWxsKHRoaXMsIHNlbGYubWFwRGF0YS5tYXAudGVhbUNydXNoQmFzZUxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAudGVhbUNydXNoQmFzZUxhdExuZy5sbmcpO1xyXG4gICAgc2VsZi5teVRlYW1CYXNlTWFwT2JqZWN0ID0gc2VsZi50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcblxyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gICAgbWFwSXNSZWFkeUNhbGxiYWNrKCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZShsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdCA9IGNyZWF0ZVRlYW1Ub3duQmFzZU9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2UobGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0ID0gY3JlYXRlVGVhbUNydXNoQmFzZU9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QobGF0LCBsbmcpIHtcclxuICAvLyBpZiB0aGVyZSdzIGFscmVhZHkgYSB0ZWFtIFRvd24gYmFzZSBvbiB0aGUgbWFwLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgJiYgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgPSB7fTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgdGl0bGU6ICdUZWFtIFRvd24gQmFzZScsXHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgcG9zaXRpb246IHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLFxyXG4gICAgaWNvbjogdGhpcy50ZWFtVG93bkJhc2VJY29uXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZU9iamVjdChsYXQsIGxuZykge1xyXG4gIHZhciB0ZWFtVG93bkJhc2VPYmplY3QgPSB7fTtcclxuICB0ZWFtVG93bkJhc2VPYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRlYW1Ub3duQmFzZU9iamVjdDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdChsYXQsIGxuZykge1xyXG4gIC8vIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIHRlYW0gQ3J1c2ggYmFzZSBvbiB0aGUgbWFwLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ICYmIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ID0ge307XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgdGl0bGU6ICdUZWFtIENydXNoIEJhc2UnLFxyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHBvc2l0aW9uOiB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubG9jYXRpb24sXHJcbiAgICBpY29uOiB0aGlzLnRlYW1DcnVzaEJhc2VJY29uXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2VPYmplY3QobGF0LCBsbmcpIHtcclxuXHJcbiAgdmFyIHRlYW1DcnVzaEJhc2VPYmplY3QgPSB7fTtcclxuICB0ZWFtQ3J1c2hCYXNlT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcblxyXG4gIHJldHVybiB0ZWFtQ3J1c2hCYXNlT2JqZWN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiByYW5kb21seVB1dEl0ZW1zKCkge1xyXG4gIHZhciByYW5kb21Mb2NhdGlvbiA9IGdldFJhbmRvbUxvY2F0aW9uRm9ySXRlbS5jYWxsKHRoaXMpO1xyXG4gIHZhciBpdGVtSWQgPSBnZXRSYW5kb21JblJhbmdlKDEsIDEwMDAwMDAsIDApO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCA9IHtcclxuICAgIGlkOiBpdGVtSWQsXHJcbiAgICBsb2NhdGlvbjoge1xyXG4gICAgICBsYXQ6IHJhbmRvbUxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICBsbmc6IHJhbmRvbUxvY2F0aW9uLmxuZygpXHJcbiAgICB9XHJcbiAgfVxyXG4gIHB1dE5ld0l0ZW1Pbk1hcC5jYWxsKHRoaXMsIHJhbmRvbUxvY2F0aW9uLCBpdGVtSWQpO1xyXG4gIGJyb2FkY2FzdE5ld0l0ZW0uY2FsbCh0aGlzLCByYW5kb21Mb2NhdGlvbiwgaXRlbUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tTG9jYXRpb25Gb3JJdGVtKCkge1xyXG4gIC8vIEZpbmQgYSByYW5kb20gbG9jYXRpb24gdGhhdCB3b3JrcywgYW5kIGlmIGl0J3MgdG9vIGNsb3NlXHJcbiAgLy8gdG8gdGhlIGJhc2UsIHBpY2sgYW5vdGhlciBsb2NhdGlvblxyXG4gIHZhciByYW5kb21Mb2NhdGlvbiA9IG51bGw7XHJcbiAgdmFyIGNlbnRlck9mQXJlYUxhdCA9IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbi5sYXQoKTtcclxuICB2YXIgY2VudGVyT2ZBcmVhTG5nID0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLmxuZygpO1xyXG4gIHdoaWxlICh0cnVlKSB7XHJcbiAgICByYW5kb21MYXQgPSBnZXRSYW5kb21JblJhbmdlKGNlbnRlck9mQXJlYUxhdCAtXHJcbiAgICAgICh0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIGNlbnRlck9mQXJlYUxhdCArICh0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIDcpO1xyXG4gICAgcmFuZG9tTG5nID0gZ2V0UmFuZG9tSW5SYW5nZShjZW50ZXJPZkFyZWFMbmcgLVxyXG4gICAgICAodGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgY2VudGVyT2ZBcmVhTG5nICsgKHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIDcpO1xyXG4gICAgY29uc29sZS5sb2coJ3RyeWluZyB0byBwdXQgaXRlbSBhdDogJyArIHJhbmRvbUxhdCArICcsJyArIHJhbmRvbUxuZyk7XHJcbiAgICByYW5kb21Mb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcocmFuZG9tTGF0LCByYW5kb21MbmcpO1xyXG4gICAgaWYgKGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKHJhbmRvbUxvY2F0aW9uLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pID4gdGhpcy5taW5JdGVtRGlzdGFuY2VGcm9tQmFzZSkge1xyXG4gICAgICByZXR1cm4gcmFuZG9tTG9jYXRpb247XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnaXRlbSB0b28gY2xvc2UgdG8gYmFzZSwgY2hvb3NpbmcgYW5vdGhlciBsb2NhdGlvbi4uLicpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHV0TmV3SXRlbU9uTWFwKGxvY2F0aW9uLCBpdGVtSWQpIHtcclxuICAvLyBldmVudHVhbGx5IHRoaXMgc2hvdWxkIGJlIHJlZHVuZGFudCB0byBjbGVhciB0aGlzLCBidXQgd2hpbGVcclxuICAvLyB0aGVyZSdzIGEgYnVnIG9uIG11bHRpcGxheWVyIGpvaW5pbmcsIGNsZWFyIGl0IGFnYWluXHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG5cclxuICAvLyBzZXQgdGhlIGJhc2UgaWNvbiBpbWFnZXMgdG8gYmUgdGhlIGxpZ2h0ZXIgb25lc1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuXHJcbiAgLy8gaW4gY2FzZSB0aGVyZSdzIGEgbGluZ2VyaW5nIGl0ZW0sIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLml0ZW1NYXBPYmplY3QgJiYgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlciAmJiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLm1hcCkge1xyXG4gICAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB2YXIgaXRlbU1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHRpdGxlOiAnSXRlbScsXHJcbiAgICBpY29uOiB0aGlzLml0ZW1JY29uLFxyXG4gICAgLy8gLy9UT0RPOiBGSVggU1RVUElEIEdPT0dMRSBNQVBTIEJVRyB0aGF0IGNhdXNlcyB0aGUgZ2lmIG1hcmtlclxyXG4gICAgLy8gLy90byBteXN0ZXJpb3VzbHkgbm90IHNob3cgdXAgc29tZXRpbWVzXHJcbiAgICAvLyBvcHRpbWl6ZWQ6IGZhbHNlLFxyXG4gICAgcG9zaXRpb246IGxvY2F0aW9uXHJcbiAgfSk7XHJcblxyXG4gIHRoaXMuaXRlbU1hcE9iamVjdCA9IHtcclxuICAgIG1hcmtlcjogaXRlbU1hcmtlcixcclxuICAgIGxvY2F0aW9uOiBsb2NhdGlvblxyXG4gIH07XHJcblxyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICBsbmc6IGxvY2F0aW9uLmxuZygpXHJcbiAgfTtcclxuXHJcbiAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCBsb2NhdGlvbiwgJ2Fycm93LnBuZycpO1xyXG4gIHJldHVybiBpdGVtSWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUJvb3N0aW5nKCkge1xyXG4gIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9OT1JNQUxfU1BFRUQ7XHJcbiAgaWYgKCQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpIHx8ICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpID09IDApIHtcclxuICAgIHZhciBib29zdEJhclZhbHVlID0gJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIik7XHJcbiAgICBpZiAodGhpcy5jdHJsRG93biAmJiBib29zdEJhclZhbHVlID4gMCkge1xyXG4gICAgICBib29zdEJhclZhbHVlIC09IHRoaXMuQk9PU1RfQ09OU1VNUFRJT05fUkFURTtcclxuICAgICAgJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIiwgYm9vc3RCYXJWYWx1ZSk7XHJcbiAgICAgIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9CT09TVF9TUEVFRDtcclxuICAgICAgdGhpcy5zcGVlZCAqPSB0aGlzLkJPT1NUX0ZBQ1RPUjtcclxuICAgICAgaWYgKE1hdGguYWJzKHRoaXMuc3BlZWQpID4gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIGlmICh0aGlzLnNwZWVkIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5zcGVlZCA9IC10aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLnNwZWVkID0gdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgKj0gdGhpcy5CT09TVF9GQUNUT1I7XHJcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLmhvcml6b250YWxTcGVlZCkgPiB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAtdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSB0aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuY3RybERvd24gJiYgYm9vc3RCYXJWYWx1ZSA8PSAwKSB7XHJcbiAgICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNib29zdC1iYXInKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5tYXhTcGVlZDtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZUNhcigpIHtcclxuICB0aGlzLm1heFNwZWVkID0gaGFuZGxlQm9vc3RpbmcuY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gaWYgVXAgb3IgRG93biBrZXkgaXMgcHJlc3NlZCwgY2hhbmdlIHRoZSBzcGVlZC4gT3RoZXJ3aXNlLFxyXG4gIC8vIGRlY2VsZXJhdGUgYXQgYSBzdGFuZGFyZCByYXRlXHJcbiAgaWYgKHRoaXMudXBEb3duIHx8IHRoaXMuZG93bkRvd24pIHtcclxuICAgIGlmICh0aGlzLnVwRG93bikge1xyXG4gICAgICBpZiAodGhpcy5zcGVlZCA8PSB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5zcGVlZCArPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5kb3duRG93bikge1xyXG4gICAgICBpZiAodGhpcy5zcGVlZCA+PSAtdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuc3BlZWQgLT0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG4gIC8vIGlmIExlZnQgb3IgUmlnaHQga2V5IGlzIHByZXNzZWQsIGNoYW5nZSB0aGUgaG9yaXpvbnRhbCBzcGVlZC5cclxuICAvLyBPdGhlcndpc2UsIGRlY2VsZXJhdGUgYXQgYSBzdGFuZGFyZCByYXRlXHJcbiAgaWYgKHRoaXMubGVmdERvd24gfHwgdGhpcy5yaWdodERvd24pIHtcclxuICAgIGlmICh0aGlzLnJpZ2h0RG93bikge1xyXG4gICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPD0gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkICs9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmxlZnREb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA+PSAtdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkIC09IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICgoIXRoaXMudXBEb3duICYmICF0aGlzLmRvd25Eb3duKSB8fCAoIXRoaXMuY3RybERvd24gJiYgTWF0aC5hYnModGhpcy5zcGVlZCkgPiB0aGlzLk1BWF9OT1JNQUxfU1BFRUQpKSB7XHJcbiAgICBpZiAoc3BlZWQgPiAtMC4wMSAmJiBzcGVlZCA8IDAuMDEpIHtcclxuICAgICAgc3BlZWQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc3BlZWQgLz0gZGVjZWxlcmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghbGVmdERvd24gJiYgIXJpZ2h0RG93bikgfHwgKCFjdHJsRG93biAmJiBNYXRoLmFicyhob3Jpem9udGFsU3BlZWQpID4gTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA+IC0wLjAxICYmIHRoaXMuaG9yaXpvbnRhbFNwZWVkIDwgMC4wMSkge1xyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAvPSB0aGlzLmRlY2VsZXJhdGlvbjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIG9wdGltaXphdGlvbiAtIG9ubHkgaWYgdGhlIGNhciBpcyBtb3Zpbmcgc2hvdWxkIHdlIHNwZW5kXHJcbiAgLy8gdGltZSByZXNldHRpbmcgdGhlIG1hcFxyXG4gIGlmICh0aGlzLnNwZWVkICE9IDAgfHwgdGhpcy5ob3Jpem9udGFsU3BlZWQgIT0gMCkge1xyXG4gICAgdmFyIG5ld0xhdCA9IHRoaXMubWFwLmdldENlbnRlcigpLmxhdCgpICsgKHRoaXMuc3BlZWQgLyB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdmFyIG5ld0xuZyA9IHRoaXMubWFwLmdldENlbnRlcigpLmxuZygpICsgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIC8gdGhpcy5sb25naXR1ZGVTcGVlZEZhY3Rvcik7XHJcbiAgICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobmV3TGF0LCBuZXdMbmcpO1xyXG4gICAgdGhpcy5tYXAuc2V0Q2VudGVyKHRoaXMubWFwQ2VudGVyKTtcclxuXHJcbiAgfVxyXG5cclxuICByb3RhdGVDYXIuY2FsbCh0aGlzKTtcclxuICBpZiAodGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgIHJvdGF0ZUFycm93LmNhbGwodGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0VG9QZWVyKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gY29ubmVjdCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3RyeWluZyB0byBjb25uZWN0IHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gIHZhciBwZWVySnNDb25uZWN0aW9uID0gdGhpcy5wZWVyLmNvbm5lY3Qob3RoZXJVc2VyUGVlcklkKTtcclxuICBwZWVySnNDb25uZWN0aW9uLm9uKCdvcGVuJywgZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnY29ubmVjdGlvbiBvcGVuJyk7XHJcbiAgICBjb25uZWN0ZWRUb1BlZXIuY2FsbCh0aGlzLCBwZWVySnNDb25uZWN0aW9uKTtcclxuICB9KTtcclxuICBwZWVySnNDb25uZWN0aW9uLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xyXG4gICAgY29uc29sZS5sb2coXCJQRUVSSlMgRVJST1I6IFwiKTtcclxuICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICB0aHJvdyBcIlBlZXJKUyBjb25uZWN0aW9uIGVycm9yXCI7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3RlZFRvUGVlcihwZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgdmFyIG90aGVyVXNlclBlZXJJZCA9IHBlZXJKc0Nvbm5lY3Rpb24ucGVlcjtcclxuICBjb25zb2xlLmxvZygnY29ubmVjdGVkIHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnY29ubmVjdGVkIHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICAvLyBpZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIGNvbm5lY3RlZCB0byB0aGlzIHVlc3IsXHJcbiAgLy8gYWRkIHRoZSBIVE1MIGZvciB0aGUgbmV3IHVzZXJcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdIHx8ICF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICBpbml0aWFsaXplUGVlckNvbm5lY3Rpb24uY2FsbCh0aGlzLCBwZWVySnNDb25uZWN0aW9uLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gICAgYXNzaWduVXNlclRvVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgICBjcmVhdGVPdGhlclVzZXJDYXIuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU90aGVyVXNlckNhcihvdGhlclVzZXJQZWVySWQpIHtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySWQgPSBvdGhlclVzZXJQZWVySWQ7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0uY2FyID0ge307XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnblVzZXJUb1RlYW0ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gaWYgdGhlIHVzZXIgaXMgYWxyZWFkeSBvbiBhIHRlYW0sIGlnbm9yZSB0aGlzXHJcbiAgaWYgKGlzVXNlck9uVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2VycykgfHxcclxuICAgIGlzVXNlck9uVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdXNlck9iamVjdCA9IHtcclxuICAgIHBlZXJJZDogb3RoZXJVc2VyUGVlcklkLFxyXG4gICAgdXNlcm5hbWU6IG51bGxcclxuICB9O1xyXG4gIC8vIGZvciBub3csIGp1c3QgYWx0ZXJuYXRlIHdobyBnb2VzIG9uIGVhY2ggdGVhbVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCA+IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCkge1xyXG4gICAgYWN0aXZhdGVUZWFtQ3J1c2hJblVJLmNhbGwodGhpcyk7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5wdXNoKHVzZXJPYmplY3QpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLnB1c2godXNlck9iamVjdCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1VzZXJPblRlYW0ocGVlcklkLCB1c2VyT2JqZWN0c0FycmF5KSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VyT2JqZWN0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodXNlck9iamVjdHNBcnJheVtpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnbk15VGVhbUluVUkoKSB7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKSB7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAneWVsbG93Jyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2NvbG9yJywgJ2JsYWNrJyk7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyM2NjcnKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICdyZWQnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjNjY2Jyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplUGVlckNvbm5lY3Rpb24ocGVlckpzQ29ubmVjdGlvbiwgb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSkge1xyXG4gICAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gPSB7fTtcclxuICB9XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbiA9IHBlZXJKc0Nvbm5lY3Rpb247XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5vbignY2xvc2UnLCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdjbG9zaW5nIGNvbm5lY3Rpb24nKTtcclxuICAgIG90aGVyVXNlckRpc2Nvbm5lY3RlZC5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfSk7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5vbignZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGRhdGFSZWNlaXZlZC5jYWxsKHRoaXMsIGRhdGEpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmYWRlQXJyb3dUb0ltYWdlKGltYWdlRmlsZU5hbWUpIHtcclxuICAkKFwiI2Fycm93LWltZ1wiKS5hdHRyKCdzcmMnLCAnaW1hZ2VzLycgKyBpbWFnZUZpbGVOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyRGlzY29ubmVjdGVkKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIHNob3VsZCBiZSBjYWxsZWQgYWZ0ZXIgdGhlIHBlZXJKcyBjb25uZWN0aW9uXHJcbiAgLy8gaGFzIGFscmVhZHkgYmVlbiBjbG9zZWRcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICByZW1vdmVVc2VyRnJvbVRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIHJlbW92ZVVzZXJGcm9tVUkuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICAvLyByZW1vdmUgdGhpcyB1c2VyIGZyb20gdGhlIGdhbWUgaW4gRmlyZWJhc2U6XHJcbiAgbWF0Y2htYWtlclRvd24ucmVtb3ZlUGVlckZyb21HYW1lKGdhbWVJZCwgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgaWYgKHRoaXMuaG9zdFBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgIC8vIGlmIHRoYXQgdXNlciB3YXMgdGhlIGhvc3QsIHNldCB1cyBhcyB0aGUgbmV3IGhvc3RcclxuICAgIHRoaXMuaG9zdFBlZXJJZCA9IHRoaXMucGVlci5pZDtcclxuICAgIHN3aXRjaFRvTmV3SG9zdC5jYWxsKHRoaXMsIHRoaXMuZ2FtZUlkLCB0aGlzLnBlZXIuaWQpO1xyXG4gIH1cclxuXHJcbiAgLy8gaWYgdGhlIHVzZXIgd2hvIGRpc2Nvbm5lY3RlZCBjdXJyZW50bHkgaGFkIGFuIGl0ZW0sXHJcbiAgLy8gcHV0IG91dCBhIG5ldyBvbmVcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtICYmIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBvdGhlclVzZXJQZWVySWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVsZXRlIHRoYXQgdXNlcidzIGRhdGFcclxuICBkZWxldGUgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF07XHJcblxyXG4gIC8vIGlmIHRoZXJlIGFueSB1c2VycyBsZWZ0LCBicm9hZGNhc3QgdGhlbSB0aGUgbmV3IGdhbWUgc3RhdGVcclxuICBpZiAoT2JqZWN0LmtleXModGhpcy5vdGhlclVzZXJzKS5sZW5ndGggPiAwKSB7XHJcbiAgICBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzLmNhbGwodGhpcyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnd2FpdGluZyBmb3IgYSBzbXVnZ2xlciB0byBiYXR0bGUuLi4nKTtcclxuICB9XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVc2VyRnJvbVRlYW0odXNlclBlZXJJZCkge1xyXG4gIGZvciAodmFyIGkgPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdXNlclBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLnNwbGljZShpLCAxKTtcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaiA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0ucGVlcklkID09IHVzZXJQZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMuc3BsaWNlKGosIDEpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21VSShwZWVySWQpIHtcclxuICAvLyByZW1vdmUgdGhlIG90aGVyIHVzZXIncyBjYXIgZnJvbSB0aGUgbWFwXHJcbiAgdGhpcy5vdGhlclVzZXJzW3BlZXJJZF0uY2FyLm1hcmtlci5zZXRNYXAobnVsbCk7XHJcblxyXG4gIC8vIGlmIHRoZWlyIHRlYW0gaGFzIG5vIG1vcmUgdXNlcnMsIGdyZXkgb3V0XHJcbiAgLy8gdGhlaXIgc2NvcmUgYm94XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzAuMycpO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDaGFuZ2VkTG9jYXRpb24obGF0LCBsbmcpIHtcclxuICBzZXRHYW1lVG9OZXdMb2NhdGlvbi5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycygpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgYnJvYWRjYXN0R2FtZVN0YXRlLmNhbGwodGhpcywgdXNlcik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkYXRhUmVjZWl2ZWQoZGF0YSkge1xyXG4gIGlmIChkYXRhLnBlZXJJZCkge1xyXG4gICAgLy8gaWYgd2UgYXJlIHRoZSBob3N0LCBhbmQgdGhlIHVzZXIgd2hvIHNlbnQgdGhpcyBkYXRhIGhhc24ndCBiZWVuIGdpdmVuIHRoZSBpbml0aWFsIGdhbWVcclxuICAgIC8vIHN0YXRlLCB0aGVuIGJyb2FkY2FzdCBpdCB0byB0aGVtXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5oYXNCZWVuSW5pdGlhbGl6ZWQgJiYgaG9zdFBlZXJJZCA9PSBwZWVyLmlkKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0uaGFzQmVlbkluaXRpYWxpemVkID0gdHJ1ZTtcclxuICAgICAgLy8gbm90IHN1cmUgaWYgd2Ugc2hvdWxkIGRvIHRoaXMgb3Igbm90LCBidXQgYXQgbGVhc3QgaXQgcmVzZXRzIHRoZSBnYW1lXHJcbiAgICAgIC8vIHN0YXRlIHRvIHdoYXQgd2UsIHRoZSBob3N0LCB0aGluayBpdCBpc1xyXG4gICAgICBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzKCk7XHJcbiAgICAgIC8vIGlmIG5vdCB0aGF0LCB0aGVuIHdlIHNob3VsZCBqdXN0IGJyb2FkY2FzdCB0byB0aGUgbmV3IGd1eSBsaWtlIHRoaXM6XHJcbiAgICAgIC8vIGJyb2FkY2FzdEdhbWVTdGF0ZShkYXRhLnBlZXJJZCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmxhc3RVcGRhdGVUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChkYXRhLmV2ZW50KSB7XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICd1cGRhdGVfZ2FtZV9zdGF0ZScpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiB1cGRhdGUgZ2FtZSBzdGF0ZScpO1xyXG4gICAgICAvLyB3ZSBvbmx5IHdhbnQgdG8gcmVjZW50ZXIgdGhlIG1hcCBpbiB0aGUgY2FzZSB0aGF0IHRoaXMgaXMgYSBuZXcgdXNlclxyXG4gICAgICAvLyBqb2luaW5nIGZvciB0aGUgZmlyc3QgdGltZSwgYW5kIHRoZSB3YXkgdG8gdGVsbCB0aGF0IGlzIHRvIHNlZSBpZiB0aGVcclxuICAgICAgLy8gaW5pdGlhbCBsb2NhdGlvbiBoYXMgY2hhbmdlZC4gIE9uY2UgdGhlIHVzZXIgaXMgYWxyZWFkeSBqb2luZWQsIGlmIGFcclxuICAgICAgLy8gbG9jYXRpb24gY2hhbmdlIGlzIGluaXRpYXRlZCwgdGhhdCB3aWxsIHVzZSB0aGUgJ25ld19sb2NhdGlvbicgZXZlbnQgXHJcbiAgICAgIGlmIChwYXJzZUZsb2F0KGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCkgIT0gcGFyc2VGbG9hdChnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0KSB8fFxyXG4gICAgICAgIHBhcnNlRmxvYXQoZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSAhPSBwYXJzZUZsb2F0KGdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpKSB7XHJcbiAgICAgICAgbWFwLnNldENlbnRlcihuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxyXG4gICAgICAgICAgZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0LFxyXG4gICAgICAgICAgZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSk7XHJcbiAgICAgIH1cclxuICAgICAgZ2FtZURhdGFPYmplY3QgPSBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0O1xyXG4gICAgICAvLyBuZWVkIHRvIG1ha2UgdGhpcyBjYWxsIGJlY2F1c2Ugd2UgY2FuIGJlIGluIGEgc2l0dWF0aW9uIHdoZXJlIHRoZSBob3N0XHJcbiAgICAgIC8vIGRvZXNuJ3Qga25vdyBvdXIgdXNlcm5hbWUgeWV0LCBzbyB3ZSBuZWVkIHRvIG1hbnVhbGx5IHNldCBpdCBpbiBvdXJcclxuICAgICAgLy8gb3duIFVJIGZpcnN0LlxyXG4gICAgICB1cGRhdGVVc2VybmFtZShwZWVyLmlkLCB1c2VybmFtZSk7XHJcbiAgICAgIHVwZGF0ZVVJV2l0aE5ld0dhbWVTdGF0ZSgpO1xyXG4gICAgICBhc3NpZ25NeVRlYW1CYXNlKCk7XHJcbiAgICAgIHVwZGF0ZUNhckljb25zKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICduZXdfbG9jYXRpb24nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGxvY2F0aW9uICcgKyBkYXRhLmV2ZW50LmxhdCArICcsJyArIGRhdGEuZXZlbnQubG5nKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQub3JpZ2luYXRpbmdfcGVlcl9pZCAhPSBwZWVyLmlkKSB7XHJcbiAgICAgICAgb3RoZXJVc2VyQ2hhbmdlZExvY2F0aW9uKGRhdGEuZXZlbnQubGF0LCBkYXRhLmV2ZW50LmxuZyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX2NvbGxlY3RlZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtIGNvbGxlY3RlZCBieSAnICsgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0pO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0gIT0gcGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNvbGxlY3RlZEl0ZW0oZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICduZXdfaXRlbScpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBuZXcgaXRlbSBhdCAnICtcclxuICAgICAgICBkYXRhLmV2ZW50LmxvY2F0aW9uLmxhdCArICcsJyArIGRhdGEuZXZlbnQubG9jYXRpb24ubG5nICtcclxuICAgICAgICAnIHdpdGggaWQgJyArIGRhdGEuZXZlbnQuaWQpO1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICAgICAgLy8gT25seSB1cGRhdGUgaWYgc29tZW9uZSBlbHNlIGNhdXNlZCB0aGUgbmV3IGl0ZW0gcGxhY2VtZW50LlxyXG4gICAgICAvLyBpZiB0aGlzIHVzZXIgZGlkIGl0LCBpdCB3YXMgYWxyZWFkeSBwbGFjZWRcclxuICAgICAgaWYgKGRhdGEuZXZlbnQuaG9zdF91c2VyICYmIGRhdGEuZXZlbnQuaG9zdF91c2VyICE9IHBlZXIuaWQpIHtcclxuICAgICAgICB2YXIgaXRlbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhkYXRhLmV2ZW50LmxvY2F0aW9uLmxhdCwgZGF0YS5ldmVudC5sb2NhdGlvbi5sbmcpO1xyXG4gICAgICAgIHB1dE5ld0l0ZW1Pbk1hcChpdGVtTG9jYXRpb24sIGRhdGEuZXZlbnQuaWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV9yZXR1cm5lZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtIHJldHVybmVkIGJ5IHVzZXIgJyArIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtICsgJyB3aGljaCBnaXZlcyB0aGVtICcgKyBkYXRhLmV2ZW50Lm5vd19udW1faXRlbXMpO1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtICE9IHBlZXIuaWQpIHtcclxuICAgICAgICB0ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICB0ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gICAgICAgIG90aGVyVXNlclJldHVybmVkSXRlbShkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSwgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV90cmFuc2ZlcnJlZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtICcgKyBkYXRhLmV2ZW50LmlkICsgJyB0cmFuc2ZlcnJlZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LmZyb21Vc2VyUGVlcklkICsgJyB0byB1c2VyICcgKyBkYXRhLmV2ZW50LnRvVXNlclBlZXJJZCk7XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBkYXRhLmV2ZW50LnRvVXNlclBlZXJJZDtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgICAgICAvLyB0aGUgaXRlbSB3YXMgdHJhbnNmZXJyZWQgdG8gdGhpcyB1c2VyXHJcbiAgICAgICAgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCA9IHtcclxuICAgICAgICAgIGlkOiBkYXRhLmV2ZW50LmlkLFxyXG4gICAgICAgICAgbG9jYXRpb246IG51bGxcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3NvbWVvbmUgdHJhbnNmZXJyZWQgYXQgJyArIHRpbWVPZkxhc3RUcmFuc2Zlcik7XHJcbiAgICAgICAgdXNlckNvbGxpZGVkV2l0aEl0ZW0oZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBhcnJvdyB0byBwb2ludCB0byB0aGUgbmV3IHVzZXIgd2hvIGhhcyB0aGUgaXRlbVxyXG4gICAgICAgIGRlc3RpbmF0aW9uID0gdGhpcy5vdGhlclVzZXJzW2RhdGEuZXZlbnQudG9Vc2VyUGVlcklkXS5jYXIubG9jYXRpb247XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGlmIHRoZSB1c2VyIHNlbnQgYSB1c2VybmFtZSB0aGF0IHdlIGhhdmVuJ3Qgc2VlbiB5ZXQsIHNldCBpdFxyXG4gIGlmIChkYXRhLnBlZXJJZCAmJiBkYXRhLnVzZXJuYW1lICYmICF0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLnVzZXJuYW1lKSB7XHJcbiAgICB1cGRhdGVVc2VybmFtZShkYXRhLnBlZXJJZCwgZGF0YS51c2VybmFtZSk7XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS5jYXJMYXRMbmcgJiYgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSkge1xyXG4gICAgbW92ZU90aGVyQ2FyKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0sIG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YS5jYXJMYXRMbmcubGF0LCBkYXRhLmNhckxhdExuZy5sbmcpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnbk15VGVhbUJhc2UoKSB7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0ocGVlci5pZCkpIHtcclxuICAgIG15VGVhbUJhc2VNYXBPYmplY3QgPSB0ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcbiAgfSBlbHNlIHtcclxuICAgIG15VGVhbUJhc2VNYXBPYmplY3QgPSB0ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0O1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWUocGVlcklkLCB1c2VybmFtZSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGogPSAwOyBqIDwgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVUlXaXRoTmV3R2FtZVN0YXRlKCkge1xyXG4gIC8vIHJlY2VudGVyIHRoZSBtYXBcclxuICBjb25zb2xlLmxvZygnbmV3IGxvY2F0aW9uIHJlY2VpdmVkOiAnICsgZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uKTtcclxuICBtYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQsIGdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpO1xyXG4gIHVwZGF0ZUJhc2VMb2NhdGlvbnNJblVJKCk7XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSSgpO1xyXG4gIC8vIGlmIHNvbWVvbmUgaGFzIHRoZSBpdGVtXHJcbiAgaWYgKGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0pIHtcclxuICAgIGl0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICAgIC8vIGlmIEkgaGF2ZSB0aGUgaXRlbSwgbWFrZSB0aGUgZGVzdGluYXRpb24gbXkgdGVhbSdzIGJhc2VcclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IHBlZXIuaWQpIHtcclxuICAgICAgc2V0RGVzdGluYXRpb24obXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93X2JsdWUucG5nJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBhbm90aGVyIHVzZXIgaGFzIHRoZSBpdGVtLCBidXQgdGhlIHNldERlc3RpbmF0aW9uIGNhbGxcclxuICAgICAgLy8gd2lsbCBiZSB0YWtlbiBjYXJlIG9mIHdoZW4gdGhlIHVzZXIgc2VuZHMgdGhlaXIgbG9jYXRpb24gZGF0YVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBpZiBub2JvZHkgaGFzIHRoZSBpdGVtLCBwdXQgaXQgb24gdGhlIG1hcCBpbiB0aGUgcmlnaHQgcGxhY2UsXHJcbiAgICAvLyBhbmQgc2V0IHRoZSBuZXcgaXRlbSBsb2NhdGlvbiBhcyB0aGUgZGVzdGluYXRpb25cclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ICYmIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgbW92ZUl0ZW1Pbk1hcChnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxhdCwgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG4gICAgfVxyXG4gICAgc2V0RGVzdGluYXRpb24oaXRlbU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93LnBuZycpO1xyXG4gIH1cclxuICB1cGRhdGVTY29yZXNJblVJKGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQsIGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICBhc3NpZ25NeVRlYW1JblVJKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUJhc2VMb2NhdGlvbnNJblVJKCkge1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdChcclxuICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubGF0LFxyXG4gICAgZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QoXHJcbiAgICBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sYXQsXHJcbiAgICBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVDYXJJY29ucygpIHtcclxuICB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucyhnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2VycywgdGVhbVRvd25PdGhlckNhckljb24pO1xyXG4gIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zKGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2VycywgdGVhbUNydXNoT3RoZXJDYXJJY29uKTtcclxuICB1cGRhdGVNeUNhckljb24oKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlTXlDYXJJY29uKCkge1xyXG4gIHZhciB1c2VyQ2FySW1nU3JjID0gJ2ltYWdlcy9jcnVzaF9jYXIucG5nJztcclxuICBpZiAodXNlcklzT25Ub3duVGVhbShwZWVyLmlkKSkge1xyXG4gICAgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY2FyLnBuZyc7XHJcbiAgfVxyXG4gICQoJyNjYXItaW1nJykuYXR0cignc3JjJywgdXNlckNhckltZ1NyYyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zKHRlYW1Vc2VycywgdGVhbUNhckljb24pIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRlYW1Vc2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBtYXJrZXJcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0gJiYgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhciAmJiB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlcikge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRlYW1Vc2Vyc1tpXS5wZWVySWQgIT0gcGVlci5pZCkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICAgIG1hcDogbWFwLFxyXG4gICAgICAgIHRpdGxlOiB0ZWFtVXNlcnNbaV0ucGVlcklkLFxyXG4gICAgICAgIGljb246IHRlYW1DYXJJY29uXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVNjb3Jlc0luVUkodGVhbVRvd25OdW1JdGVtc1JldHVybmVkLCB0ZWFtQ3J1c2hOdW1JdGVtc1JldHVybmVkKSB7XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKS50ZXh0KHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKSk7XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0ZWFtQ3J1c2hOdW1JdGVtc1JldHVybmVkKTtcclxuICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVJdGVtT25NYXAobGF0LCBsbmcpIHtcclxuICBjb25zb2xlLmxvZygnbW92aW5nIGl0ZW0gdG8gbmV3IGxvY2F0aW9uOiAnICsgbGF0ICsgJywnICsgbG5nKTtcclxuICBnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxhdCA9IGxhdDtcclxuICBnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxuZyA9IGxuZztcclxuICBpdGVtTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0UG9zaXRpb24oaXRlbU1hcE9iamVjdC5sb2NhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlclJldHVybmVkSXRlbShvdGhlclVzZXJQZWVySWQsIG5vd051bUl0ZW1zRm9yVXNlcikge1xyXG4gIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gIGluY3JlbWVudEl0ZW1Db3VudCh1c2VySXNPblRvd25UZWFtKG90aGVyVXNlclBlZXJJZCkpXHJcbiAgZmFkZUFycm93VG9JbWFnZSgnYXJyb3cucG5nJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVPdGhlckNhcihvdGhlclVzZXJPYmplY3QsIG5ld0xvY2F0aW9uKSB7XHJcbiAgaWYgKCFvdGhlclVzZXJPYmplY3QuY2FyKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uID0gbmV3TG9jYXRpb247XHJcbiAgaWYgKCFvdGhlclVzZXJPYmplY3QuY2FyLm1hcmtlcikge1xyXG4gICAgdXBkYXRlQ2FySWNvbnMoKTtcclxuICB9XHJcbiAgLy8gaWYgdGhlIG90aGVyIGNhciBoYXMgYW4gaXRlbSwgdXBkYXRlIHRoZSBkZXN0aW5hdGlvblxyXG4gIC8vIHRvIGJlIGl0XHJcbiAgaWYgKGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCkge1xyXG4gICAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gICAgaWYgKHVzZXJJc09uTXlUZWFtKG90aGVyVXNlck9iamVjdC5wZWVySWQpKSB7XHJcbiAgICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICAgIH1cclxuICAgIHNldERlc3RpbmF0aW9uKG5ld0xvY2F0aW9uLCBhcnJvd0ltZyk7XHJcbiAgfVxyXG4gIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZChvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uLCBvdGhlclVzZXJPYmplY3QucGVlcklkKTtcclxuICBvdGhlclVzZXJPYmplY3QuY2FyLm1hcmtlci5zZXRQb3NpdGlvbihvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlcklzT25NeVRlYW0ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdmFyIG15VGVhbSA9IG51bGw7XHJcbiAgdmFyIG90aGVyVXNlclRlYW0gPSBudWxsO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlci5pZCkge1xyXG4gICAgICBteVRlYW0gPSAndG93bic7XHJcbiAgICB9XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgICBvdGhlclVzZXJUZWFtID0gJ3Rvd24nO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlci5pZCkge1xyXG4gICAgICBteVRlYW0gPSAnY3J1c2gnO1xyXG4gICAgfVxyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAgIG90aGVyVXNlclRlYW0gPSAnY3J1c2gnO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbXlUZWFtID09IG90aGVyVXNlclRlYW07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZChvdGhlckNhckxvY2F0aW9uLCBvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBpZiB3ZSBkb24ndCBrbm93IHRoZSBvdGhlciBjYXIncyBsb2NhdGlvbiwgb3IgaWYgdGhpcyBpc24ndCB0aGUgdXNlciB3aXRoXHJcbiAgLy8gIHRoZSBpdGVtLCB0aGVuIGlnbm9yZSBpdC4gV2UnbGwgb25seSB0cmFuc2ZlciBhbiBpdGVtIGZyb20gdGhlIHBlcnNwZWN0ZWRcclxuICAvLyAgb2YgdGhlIHVzZXIgd2l0aCB0aGUgaXRlbVxyXG4gIGlmICghb3RoZXJDYXJMb2NhdGlvbiB8fCAhY29sbGVjdGVkSXRlbSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZiAodGltZU9mTGFzdFRyYW5zZmVyKSB7XHJcbiAgICB2YXIgdGltZVNpbmNlTGFzdFRyYW5zZmVyID0gKChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkpIC0gdGltZU9mTGFzdFRyYW5zZmVyO1xyXG4gICAgLy8gaWYgbm90IGVub3VnaCB0aW1lIGhhcyBwYXNzZWQgc2luY2UgdGhlIGxhc3QgdHJhbnNmZXIsIHJldHVyblxyXG4gICAgaWYgKHRpbWVTaW5jZUxhc3RUcmFuc2ZlciA8IHRpbWVEZWxheUJldHdlZW5UcmFuc2ZlcnMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gb3B0aW1pemF0aW9uOiByZXNldCB0aGlzIHNvIHdlIGRvbid0IHdhc3RlIHRpbWUgY2FsY3VsYXRpbmcgaW4gdGhlIGZ1dHVyZVxyXG4gICAgICB0aW1lT2ZMYXN0VHJhbnNmZXIgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGRpc3RhbmNlID0gZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4obWFwQ2VudGVyLCBvdGhlckNhckxvY2F0aW9uKTtcclxuICAvLyBpZiB0aGlzIHVzZXIgKHRoYXQgaGFzIHRoZSBpdGVtKSBpcyBjbG9zZSBlbm91Z2ggdG8gY2FsbCBpdCBhXHJcbiAgLy8gY29sbGlzaW9uLCB0cmFuc2ZlciBpdCB0byB0aGUgb3RoZXIgdXNlclxyXG4gIGlmIChkaXN0YW5jZSA8IDIwKSB7XHJcbiAgICB0cmFuc2Zlckl0ZW0oY29sbGVjdGVkSXRlbS5pZCwgcGVlci5pZCwgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZmVySXRlbShpdGVtT2JqZWN0SWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnaXRlbSAnICsgaXRlbU9iamVjdElkICsgJyB0cmFuc2ZlcnJlZCBmcm9tICcgKyBmcm9tVXNlclBlZXJJZCArICcgdG8gJyArIHRvVXNlclBlZXJJZCk7XHJcbiAgdGltZU9mTGFzdFRyYW5zZmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICBicm9hZGNhc3RUcmFuc2Zlck9mSXRlbShpdGVtT2JqZWN0SWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQsIHRpbWVPZkxhc3RUcmFuc2Zlcik7XHJcbiAgY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHRvVXNlclBlZXJJZDtcclxuICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uTXlUZWFtKHRvVXNlclBlZXJJZCkpIHtcclxuICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICB9XHJcbiAgc2V0RGVzdGluYXRpb24odGhpcy5vdGhlclVzZXJzW3RvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uLCBhcnJvd0ltZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckNvbGxlY3RlZEl0ZW0odXNlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ290aGVyIHVzZXIgY29sbGVjdGVkIGl0ZW0nKTtcclxuICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdXNlcklkO1xyXG4gIGl0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uTXlUZWFtKHVzZXJJZCkpIHtcclxuICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICB9XHJcbiAgZmFkZUFycm93VG9JbWFnZShhcnJvd0ltZyk7XHJcbiAgdGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1Ub3duQmFzZUljb24pO1xyXG4gIHRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbUNydXNoQmFzZUljb24pO1xyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gdXNlclJldHVybmVkSXRlbVRvQmFzZSgpIHtcclxuICBjb25zb2xlLmxvZygndXNlciByZXR1cm5lZCBpdGVtIHRvIGJhc2UnKTtcclxuICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBmYWRlQXJyb3dUb0ltYWdlKCdhcnJvdy5wbmcnKTtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQodXNlcklzT25Ub3duVGVhbShwZWVyLmlkKSk7XHJcbiAgY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgdGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlcklzT25Ub3duVGVhbShwZWVySWQpIHtcclxuICBmb3IgKHZhciBpID0gZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbmNyZW1lbnRJdGVtQ291bnQoaXNUZWFtVG93bikge1xyXG4gIGlmIChpc1RlYW1Ub3duKSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQrKztcclxuICAgICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQrKztcclxuICAgICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmbGFzaEVsZW1lbnQoanF1ZXJ5RWxlbSkge1xyXG4gIGpxdWVyeUVsZW0uZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJDb2xsaWRlZFdpdGhJdGVtKGNvbGxpc2lvbkl0ZW1PYmplY3QpIHtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBjb2xsaXNpb25JdGVtT2JqZWN0O1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIGNvbGxpc2lvbkl0ZW1PYmplY3QubG9jYXRpb24gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHBlZXIuaWQ7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlSWNvbik7XHJcbiAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXREZXN0aW5hdGlvbihsb2NhdGlvbiwgYXJyb3dJbWFnZU5hbWUpIHtcclxuICB0aGlzLmRlc3RpbmF0aW9uID0gbG9jYXRpb247XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsIGFycm93SW1hZ2VOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlQ2FyKCkge1xyXG4gIHRoaXMucm90YXRpb24gPSBnZXRBbmdsZS5jYWxsKHRoaXMsIHNwZWVkLCBob3Jpem9udGFsU3BlZWQpO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnLW1zLXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7IC8qIElFIDkgKi8gLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyAvKiBDaHJvbWUsIFNhZmFyaSwgT3BlcmEgKi8gdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsnO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGVBcnJvdygpIHtcclxuICB0aGlzLmFycm93Um90YXRpb24gPSBjb21wdXRlQmVhcmluZ0FuZ2xlLmNhbGwodGhpcywgdGhpcy5tYXBDZW50ZXIubGF0KCksIHRoaXMubWFwQ2VudGVyLmxuZygpLCB0aGlzLmRlc3RpbmF0aW9uLmxhdCgpLCB0aGlzLmRlc3RpbmF0aW9uLmxuZygpKTtcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnLW1zLXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsgLyogSUUgOSAqLyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsgLyogQ2hyb21lLCBTYWZhcmksIE9wZXJhICovIHRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsnO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoc3RlcCkge1xyXG4gIG1vdmVDYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QgJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIG9uZSBjYXIgd2l0aCBhbiBpdGVtIGFuZCBvbmUgd2l0aG91dFxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGhhcyBhbiBpdGVtLCBjaGVjayB0byBzZWUgaWYgdGhleSBhcmUgY29sbGlkaW5nXHJcbiAgICAgIC8vIHdpdGggYW55IG90aGVyIHVzZXIsIGFuZCBpZiBzbywgdHJhbnNmZXIgdGhlIGl0ZW1cclxuICAgICAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgICAgICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQuY2FsbCh0aGlzLCB0aGlzLm90aGVyVXNlcnNbdXNlcl0uY2FyLmxvY2F0aW9uLCB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlcklkKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaWYgYW5vdGhlciB1c2VyIGhhcyBhbiBpdGVtLCBhbmQgdGhlaXIgY2FyIGhhcyBhIGxvY2F0aW9uLFxyXG4gICAgICAvLyB0aGVuIGNvbnN0YW50bHkgc2V0IHRoZSBkZXN0aW5hdGlvbiB0byB0aGVpciBsb2NhdGlvblxyXG4gICAgICBpZiAodGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0gJiYgdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0ubG9jYXRpb24gJiYgdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0uY2FyLmxvY2F0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmNhci5sb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2hlY2sgaWYgdXNlciBjb2xsaWRlZCB3aXRoIGFuIGl0ZW0gb3IgdGhlIGJhc2VcclxuICB2YXIgY29sbGlzaW9uTWFya2VyID0gZ2V0Q29sbGlzaW9uTWFya2VyKCk7XHJcbiAgaWYgKGNvbGxpc2lvbk1hcmtlcikge1xyXG4gICAgaWYgKCFjb2xsZWN0ZWRJdGVtICYmIGNvbGxpc2lvbk1hcmtlciA9PSBpdGVtTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgICAvLyB1c2VyIGp1c3QgcGlja2VkIHVwIGFuIGl0ZW1cclxuICAgICAgdXNlckNvbGxpZGVkV2l0aEl0ZW0odGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0KTtcclxuICAgICAgYnJvYWRjYXN0SXRlbUNvbGxlY3RlZCh0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QuaWQpO1xyXG4gICAgfSBlbHNlIGlmIChjb2xsZWN0ZWRJdGVtICYmIGNvbGxpc2lvbk1hcmtlciA9PSBteVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgICAvLyB1c2VyIGhhcyBhbiBpdGVtIGFuZCBpcyBiYWNrIGF0IHRoZSBiYXNlXHJcbiAgICAgIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UoKTtcclxuICAgICAgYnJvYWRjYXN0SXRlbVJldHVybmVkKHBlZXIuaWQpO1xyXG4gICAgICByYW5kb21seVB1dEl0ZW1zKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBicm9hZGNhc3RNeUNhckxvY2F0aW9uKCk7XHJcblxyXG4gIC8vIGlmIHRoZSBnYW1lIGhhcyBzdGFydGVkIGFuZCB3ZSdyZSB0aGUgaG9zdCwgY2hlY2tcclxuICAvLyBmb3IgYW55IHBlZXJzIHdobyBoYXZlbid0IHNlbnQgYW4gdXBkYXRlIGluIHRvbyBsb25nXHJcbiAgaWYgKGhvc3RQZWVySWQgJiYgcGVlciAmJiBwZWVyLmlkICYmIGhvc3RQZWVySWQgPT0gcGVlci5pZCkge1xyXG4gICAgY2xlYW51cEFueURyb3BwZWRDb25uZWN0aW9ucygpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2hvdWxkS2VlcEFsaXZlKCkge1xyXG4gIHJldHVybiBxcy52YWx1ZShrZWVwQWxpdmVQYXJhbU5hbWUpID09ICd0cnVlJztcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cEFueURyb3BwZWRDb25uZWN0aW9ucygpIHtcclxuICBpZiAoc2hvdWxkS2VlcEFsaXZlKCkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB0aW1lTm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICBmb3IgKHZhciB1c2VyIGluIG90aGVyVXNlcnMpIHtcclxuICAgIC8vIGlmIGl0J3MgYmVlbiBsb25nZXIgdGhhbiB0aGUgdGltZW91dCBzaW5jZSB3ZSd2ZSBoZWFyZCBmcm9tXHJcbiAgICAvLyB0aGlzIHVzZXIsIHJlbW92ZSB0aGVtIGZyb20gdGhlIGdhbWVcclxuICAgIGlmIChvdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lICYmICh0aW1lTm93IC0gb3RoZXJVc2Vyc1t1c2VyXS5sYXN0VXBkYXRlVGltZSA+IEFDVElWRV9DT05ORUNUSU9OX1RJTUVPVVRfSU5fU0VDT05EUykpIHtcclxuICAgICAgY2xvc2VQZWVySnNDb25uZWN0aW9uKHVzZXIpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xvc2VQZWVySnNDb25uZWN0aW9uKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGlmIChvdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gJiYgb3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIG90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLmNsb3NlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXIoZHQpIHtcclxuICAkKFwiI2Nhci1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMucm90YXRpb25Dc3MpO1xyXG4gICQoXCIjYXJyb3ctaW1nXCIpLmF0dHIoXCJzdHlsZVwiLCB0aGlzLmFycm93Um90YXRpb25Dc3MpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RNeUNhckxvY2F0aW9uKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gb3RoZXJVc2Vycykge1xyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4gJiYgbWFwQ2VudGVyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGNhckxhdExuZzoge1xyXG4gICAgICAgICAgbGF0OiBtYXBDZW50ZXIubGF0KCksXHJcbiAgICAgICAgICBsbmc6IG1hcENlbnRlci5sbmcoKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcGVlcklkOiBwZWVyLmlkLFxyXG4gICAgICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEdhbWVTdGF0ZShvdGhlclVzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGdhbWUgc3RhdGUgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0ID0ge1xyXG4gICAgZXZlbnQ6IHtcclxuICAgICAgbmFtZTogJ3VwZGF0ZV9nYW1lX3N0YXRlJyxcclxuICAgICAgZ2FtZURhdGFPYmplY3Q6IHRoaXMuZ2FtZURhdGFcclxuICAgIH1cclxuICB9O1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh1cGRhdGVHYW1lU3RhdGVFdmVudE9iamVjdCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE5ld0l0ZW0obG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gJiYgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICB2YXIgc2ltcGxlSXRlbUxhdExuZyA9IHtcclxuICAgICAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgICBuYW1lOiAnbmV3X2l0ZW0nLFxyXG4gICAgICAgICAgaG9zdF91c2VyOiBwZWVyLmlkLFxyXG4gICAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgICAgbGF0OiBzaW1wbGVJdGVtTGF0TG5nLmxhdCxcclxuICAgICAgICAgICAgbG5nOiBzaW1wbGVJdGVtTGF0TG5nLmxuZ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGlkOiBpdGVtSWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0SXRlbVJldHVybmVkKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gcmV0dXJuZWQnKTtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fcmV0dXJuZWQnLFxyXG4gICAgICAgIHVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbTogcGVlci5pZCxcclxuICAgICAgICBub3dfbnVtX2l0ZW1zOiB0aGlzLmdhbWVEYXRhLnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQsXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0SXRlbUNvbGxlY3RlZChpdGVtSWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gaWQgJyArIGl0ZW1JZCArICcgY29sbGVjdGVkIGJ5IHVzZXIgJyArIHBlZXIuaWQpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuZ2FtZURhdGEucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHBlZXIuaWQ7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9jb2xsZWN0ZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtOiB0aGlzLmdhbWVEYXRhLnBlZXJJZE9mQ2FyV2l0aEl0ZW1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RUcmFuc2Zlck9mSXRlbShpdGVtSWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gdHJhbnNmZXJyZWQgJyArIGl0ZW1JZCArICcgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX3RyYW5zZmVycmVkJyxcclxuICAgICAgICBpZDogaXRlbUlkLFxyXG4gICAgICAgIGZyb21Vc2VyUGVlcklkOiBmcm9tVXNlclBlZXJJZCxcclxuICAgICAgICB0b1VzZXJQZWVySWQ6IHRvVXNlclBlZXJJZFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE5ld0xvY2F0aW9uKGxvY2F0aW9uKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBuZXcgbG9jYXRpb246ICcgKyBsb2NhdGlvbi5sYXQoKSArICcsJyArIGxvY2F0aW9uLmxuZygpKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnbmV3X2xvY2F0aW9uJyxcclxuICAgICAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICAgIGxuZzogbG9jYXRpb24ubG5nKCksXHJcbiAgICAgICAgb3JpZ2luYXRpbmdfcGVlcl9pZDogcGVlci5pZFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGNoZWNrcyB0byBzZWUgaWYgdGhleSBoYXZlIGNvbGxpZGVkIHdpdGggZWl0aGVyIGFuIGl0ZW0gb3IgdGhlIGJhc2VcclxuZnVuY3Rpb24gZ2V0Q29sbGlzaW9uTWFya2VyKCkge1xyXG4gIC8vIGNvbXB1dGUgdGhlIGRpc3RhbmNlIGJldHdlZW4gbXkgY2FyIGFuZCB0aGUgZGVzdGluYXRpb25cclxuICBpZiAoZGVzdGluYXRpb24pIHtcclxuICAgIHZhciBtYXhEaXN0YW5jZUFsbG93ZWQgPSBjYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZTtcclxuICAgIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKG1hcENlbnRlciwgZGVzdGluYXRpb24pO1xyXG4gICAgLy8gVGhlIGJhc2UgaXMgYmlnZ2VyLCBzbyBiZSBtb3JlIGxlbmllbnQgd2hlbiBjaGVja2luZyBmb3IgYSBiYXNlIGNvbGxpc2lvblxyXG4gICAgaWYgKGRlc3RpbmF0aW9uID09IG15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgbWF4RGlzdGFuY2VBbGxvd2VkID0gY2FyVG9CYXNlQ29sbGlzaW9uRGlzdGFuY2U7XHJcbiAgICB9XHJcbiAgICBpZiAoZGlzdGFuY2UgPCBtYXhEaXN0YW5jZUFsbG93ZWQpIHtcclxuICAgICAgaWYgKGRlc3RpbmF0aW9uID09IGl0ZW1NYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgICBjb25zb2xlLmxvZygndXNlciAnICsgcGVlci5pZCArICcgY29sbGlkZWQgd2l0aCBpdGVtJyk7XHJcbiAgICAgICAgcmV0dXJuIGl0ZW1NYXBPYmplY3QubWFya2VyO1xyXG4gICAgICB9IGVsc2UgaWYgKGRlc3RpbmF0aW9uID09IG15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgICBpZiAoY29sbGVjdGVkSXRlbSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgJyArIHBlZXIuaWQgKyAnIGhhcyBhbiBpdGVtIGFuZCBjb2xsaWRlZCB3aXRoIGJhc2UnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG15VGVhbUJhc2VNYXBPYmplY3QubWFya2VyO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRHYW1lVG9OZXdMb2NhdGlvbihsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGEuaW5pdGlhbExvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlKGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlKChwYXJzZUZsb2F0KGxhdCkgKyAwLjAwNikudG9TdHJpbmcoKSwgKHBhcnNlRmxvYXQobG5nKSArIDAuMDA4KS50b1N0cmluZygpKTtcclxuICBhc3NpZ25NeVRlYW1CYXNlKCk7XHJcbiAgbWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgbWFwLnNldENlbnRlcihtYXBDZW50ZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBbmdsZSh2eCwgdnkpIHtcclxuICByZXR1cm4gKE1hdGguYXRhbjIodnksIHZ4KSkgKiAoMTgwIC8gTWF0aC5QSSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXB1dGVCZWFyaW5nQW5nbGUobGF0MSwgbG9uMSwgbGF0MiwgbG9uMikge1xyXG4gIHZhciBSID0gNjM3MTsgLy8ga21cclxuICB2YXIgZExhdCA9IChsYXQyIC0gbGF0MSkudG9SYWQoKTtcclxuICB2YXIgZExvbiA9IChsb24yIC0gbG9uMSkudG9SYWQoKTtcclxuICB2YXIgbGF0MSA9IGxhdDEudG9SYWQoKTtcclxuICB2YXIgbGF0MiA9IGxhdDIudG9SYWQoKTtcclxuXHJcbiAgdmFyIGFuZ2xlSW5SYWRpYW5zID0gTWF0aC5hdGFuMihNYXRoLnNpbihkTG9uKSAqIE1hdGguY29zKGxhdDIpLFxyXG4gICAgTWF0aC5jb3MobGF0MSkgKiBNYXRoLnNpbihsYXQyKSAtIE1hdGguc2luKGxhdDEpICogTWF0aC5jb3MobGF0MikgKiBNYXRoLmNvcyhkTG9uKSk7XHJcbiAgcmV0dXJuIGFuZ2xlSW5SYWRpYW5zLnRvRGVnKCk7XHJcbn1cclxuXHJcbi8vIGtleSBldmVudHNcclxuZnVuY3Rpb24gb25LZXlEb3duKGV2dCkge1xyXG4gIGlmIChldnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgcmlnaHREb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICBsZWZ0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzOCkge1xyXG4gICAgdXBEb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDQwKSB7XHJcbiAgICBkb3duRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgY3RybERvd24gPSB0cnVlO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gb25LZXlVcChldnQpIHtcclxuICBpZiAoZXZ0LmtleUNvZGUgPT0gMzkpIHtcclxuICAgIHJpZ2h0RG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzcpIHtcclxuICAgIGxlZnREb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzOCkge1xyXG4gICAgdXBEb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSA0MCkge1xyXG4gICAgZG93bkRvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDE3KSB7XHJcbiAgICBjdHJsRG93biA9IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuLy8gZ2FtZSBsb29wIGhlbHBlcnNcclxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xyXG4gIHJldHVybiB3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdyA/IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmcmFtZSgpIHtcclxuICB0aGlzLm5vdyA9IHRpbWVzdGFtcC5jYWxsKHRoaXMpO1xyXG4gIHRoaXMuZHQgPSB0aGlzLmR0ICsgTWF0aC5taW4oMSwgKHRoaXMubm93IC0gdGhpcy5sYXN0KSAvIDEwMDApO1xyXG4gIHdoaWxlICh0aGlzLmR0ID4gdGhpcy5zdGVwKSB7XHJcbiAgICB0aGlzLmR0ID0gdGhpcy5kdCAtIHRoaXMuc3RlcDtcclxuICAgIHVwZGF0ZS5jYWxsKHRoaXMsIHRoaXMuc3RlcCk7XHJcbiAgfVxyXG4gIHJlbmRlci5jYWxsKHRoaXMsIHRoaXMuZHQpO1xyXG4gIHRoaXMubGFzdCA9IHRoaXMubm93O1xyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZS5jYWxsKHRoaXMsIGZyYW1lKTtcclxufVxyXG5cclxuLy8gZG9uJ3QgdGhpbmsgd2UnbGwgbmVlZCB0byBnbyB0byB0aGUgdXNlcidzIGxvY2F0aW9uLCBidXQgbWlnaHQgYmUgdXNlZnVsXHJcbmZ1bmN0aW9uIHRyeUZpbmRpbmdMb2NhdGlvbigpIHtcclxuICAvLyBUcnkgSFRNTDUgZ2VvbG9jYXRpb25cclxuICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XHJcbiAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgIHZhciBwb3MgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcclxuICAgICAgICBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlKTtcclxuICAgICAgbWFwLnNldENlbnRlcihwb3MpO1xyXG4gICAgICBtYXBDZW50ZXIgPSBwb3M7XHJcbiAgICB9LCBmdW5jdGlvbigpIHtcclxuICAgICAgaGFuZGxlTm9HZW9sb2NhdGlvbih0cnVlKTtcclxuICAgIH0pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGRvZXNuJ3Qgc3VwcG9ydCBHZW9sb2NhdGlvblxyXG4gICAgaGFuZGxlTm9HZW9sb2NhdGlvbihmYWxzZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVOb0dlb2xvY2F0aW9uKGVycm9yRmxhZykge1xyXG4gIGlmIChlcnJvckZsYWcpIHtcclxuICAgIHZhciBjb250ZW50ID0gJ0Vycm9yOiBUaGUgR2VvbG9jYXRpb24gc2VydmljZSBmYWlsZWQuJztcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIGNvbnRlbnQgPSAnRXJyb3I6IFlvdXIgYnJvd3NlciBkb2VzblxcJ3Qgc3VwcG9ydCBnZW9sb2NhdGlvbi4nO1xyXG4gIH1cclxufVxyXG5cclxuLy8gVGhpcyBjYW4gYmUgcmVtb3ZlZCwgc2luY2UgaXQgY2F1c2VzIGFuIGVycm9yLiAgaXQncyBqdXN0IGFsbG93aW5nXHJcbi8vIGZvciByaWdodC1jbGlja2luZyB0byBzaG93IHRoZSBicm93c2VyJ3MgY29udGV4dCBtZW51LlxyXG5mdW5jdGlvbiBzaG93Q29udGV4dE1lbnUoZSkge1xyXG5cclxuICAvLyBjcmVhdGUgYSBjb250ZXh0bWVudSBldmVudC5cclxuICB2YXIgbWVudV9ldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudHNcIik7XHJcbiAgbWVudV9ldmVudC5pbml0TW91c2VFdmVudChcImNvbnRleHRtZW51XCIsIHRydWUsIHRydWUsXHJcbiAgICBlLnZpZXcsIDEsIDAsIDAsIDAsIDAsIGZhbHNlLFxyXG4gICAgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMiwgbnVsbCk7XHJcblxyXG4gIC8vIGZpcmUgdGhlIG5ldyBldmVudC5cclxuICBlLm9yaWdpbmFsVGFyZ2V0LmRpc3BhdGNoRXZlbnQobWVudV9ldmVudCk7XHJcbn1cclxuXHJcblxyXG4vLyBoYWNrIHRvIGFsbG93IGZvciBicm93c2VyIGNvbnRleHQgbWVudSBvbiByaWdodC1jbGlja1xyXG5mdW5jdGlvbiBtb3VzZVVwKGUpIHtcclxuICBpZiAoZS5idXR0b24gPT0gMikgeyAvLyByaWdodC1jbGlja1xyXG4gICAgdGhpcy5zaG93Q29udGV4dE1lbnUoZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyAkKHdpbmRvdykudW5sb2FkKGZ1bmN0aW9uKCkge1xyXG4vLyAgIGRpc2Nvbm5lY3RGcm9tR2FtZSgpO1xyXG4vLyB9KTsiLCIvKipcclxuICogIG1hdGNobWFrZXIuanNcclxuICovXHJcblxyXG4vKipcclxuICogIGRlcHNcclxuICovXHJcbi8vdmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcclxuLy92YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gTWF0Y2htYWtlclRvd247XHJcblxyXG4vKipcclxuICogIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpIHtcclxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWF0Y2htYWtlclRvd24pKVxyXG4gICAgcmV0dXJuIG5ldyBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpO1xyXG5cclxuICAvLyBUaGUgcm9vdCBvZiB5b3VyIGdhbWUgZGF0YS5cclxuICB0aGlzLkdBTUVfTE9DQVRJT04gPSBmaXJlYmFzZUJhc2VVcmw7XHJcbiAgdGhpcy5nYW1lUmVmID0gbmV3IEZpcmViYXNlKHRoaXMuR0FNRV9MT0NBVElPTik7XHJcblxyXG4gIHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OID0gJ2F2YWlsYWJsZV9nYW1lcyc7XHJcbiAgdGhpcy5GVUxMX0dBTUVTX0xPQ0FUSU9OID0gJ2Z1bGxfZ2FtZXMnO1xyXG4gIHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OID0gJ2dhbWVzJztcclxuICB0aGlzLk1BWF9VU0VSU19QRVJfR0FNRSA9IDQ7XHJcbiAgdGhpcy5HQU1FX0NMRUFOVVBfVElNRU9VVCA9IDMwICogMTAwMDsgLy8gaW4gbWlsbGlzZWNvbmRzXHJcblxyXG4gIHRoaXMuam9pbmVkR2FtZSA9IG51bGw7XHJcbiAgdGhpcy5teVdvcmtlciA9IG51bGw7XHJcbiAgLy8gIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cclxufVxyXG4vL2luaGVyaXRzKE1hdGNobWFrZXJUb3duLCBFdmVudEVtaXR0ZXIpO1xyXG5cclxuLyoqXHJcbiAqICBjb25uZWN0IHRvIGEgZ2FtZVxyXG4gKi9cclxuTWF0Y2htYWtlclRvd24ucHJvdG90eXBlLmpvaW5PckNyZWF0ZUdhbWUgPSBmdW5jdGlvbih1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZUdhbWVzLmNhbGwodGhpcyk7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBqb2luIGdhbWUnKTtcclxuICBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyLmNhbGwodGhpcyk7XHJcbiAgdmFyIGF2YWlsYWJsZUdhbWVzRGF0YVJlZiA9IGdhbWVSZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04pO1xyXG4gIGF2YWlsYWJsZUdhbWVzRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIC8vIG9ubHkgam9pbiBhIGdhbWUgaWYgb25lIGlzbid0IGpvaW5lZCBhbHJlYWR5XHJcbiAgICBpZiAodGhpcy5qb2luZWRHYW1lID09IG51bGwpIHtcclxuICAgICAgdGhpcy5qb2luZWRHYW1lID0gLTE7XHJcbiAgICAgIGlmIChkYXRhLnZhbCgpID09PSBudWxsKSB7XHJcbiAgICAgICAgLy8gdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSBnYW1lcywgc28gY3JlYXRlIG9uZVxyXG4gICAgICAgIHZhciBnYW1lRGF0YSA9IGNyZWF0ZU5ld0dhbWUuY2FsbCh0aGlzLCB1c2VybmFtZSwgcGVlcklkKTtcclxuICAgICAgICBqb2luZWRHYW1lQ2FsbGJhY2suY2FsbCh0aGlzLCBnYW1lRGF0YSwgdHJ1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnZhbCgpO1xyXG4gICAgICAgIHZhciBnYW1lSWQ7XHJcblxyXG4gICAgICAgIC8vIHN0dXBpZCBqYXZhc2NyaXB0IHdvbid0IHRlbGwgbWUgaG93IG1hbnkgZ2FtZSBlbGVtZW50c1xyXG4gICAgICAgIC8vIGFyZSBpbiB0aGUganNvbk9iaiwgc28gY291bnQgZW0gdXBcclxuICAgICAgICB2YXIgbnVtQXZhaWxhYmxlR2FtZXMgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uT2JqKSB7XHJcbiAgICAgICAgICBudW1BdmFpbGFibGVHYW1lcysrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBjaGlsZCBnYW1lcyBhbmQgdHJ5XHJcbiAgICAgICAgLy8gdG8gam9pbiBlYWNoIG9uZVxyXG4gICAgICAgIHZhciBjb3VudGVyID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgY291bnRlcisrO1xyXG4gICAgICAgICAgaWYgKGpzb25PYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICBnYW1lSWQgPSBqc29uT2JqW2tleV07XHJcbiAgICAgICAgICAgIGdldEdhbWVMYXN0VXBkYXRlVGltZS5jYWxsKHRoaXMsIGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWUsIGNvdW50ZXIgPT0gbnVtQXZhaWxhYmxlR2FtZXMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqICByZW1vdmUgYSBwZWVyIGZyb20gdGhlIGdhbWVcclxuICovXHJcbmZ1bmN0aW9uIHJlbW92ZVBlZXJGcm9tR2FtZShnYW1lSWQsIHBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKCFkYXRhLnZhbCgpKSB7XHJcbiAgICAgIC8vIHNvbWV0aGluZydzIHdyb25nLCBwcm9iYWJseSB0aGUgRmlyZWJhc2UgZGF0YSB3YXMgZGVsZXRlZFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS52YWwoKS5ob3N0UGVlcklkID09IHRoaXMucGVlcklkKSB7XHJcbiAgICAgIGZpbmROZXdIb3N0UGVlcklkLmNhbGwodGhpcywgZ2FtZUlkLCBwZWVySWQsIHN3aXRjaFRvTmV3SG9zdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbiAgICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gICAgdmFyIG51bVVzZXJzSW5HYW1lID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKS5jbGVhbih1bmRlZmluZWQpLmxlbmd0aDtcclxuICAgIGRhdGEuY2hpbGQoJ3VzZXJzJykuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIC8vIGlmIHdlJ3ZlIGZvdW5kIHRoZSByZWYgdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiBwZWVyLCByZW1vdmUgaXRcclxuICAgICAgaWYgKGNoaWxkU25hcHNob3QudmFsKCkgJiYgY2hpbGRTbmFwc2hvdC52YWwoKS5wZWVySWQgPT0gdGhpcy5wZWVySWQpIHtcclxuICAgICAgICBjaGlsZFNuYXBzaG90LnJlZigpLnJlbW92ZSgpO1xyXG4gICAgICAgIC8vIGlmIHRoaXMgdXNlciB3YXMgdGhlIGxhc3Qgb25lIGluIHRoZSBnYW1lLCBub3cgdGhlcmUgYXJlIDAsIFxyXG4gICAgICAgIC8vIHNvIGRlbGV0ZSB0aGUgZ2FtZVxyXG4gICAgICAgIGlmIChudW1Vc2Vyc0luR2FtZSA9PSAxKSB7XHJcbiAgICAgICAgICBkZWxldGVHYW1lLmNhbGwodGhpcywgZ2FtZUlkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gaWYgaXQgd2FzIGZ1bGwsIG5vdyBpdCBoYXMgb25lIG9wZW4gc2xvdCwgc2V0IGl0IHRvIGF2YWlsYWJsZVxyXG4gICAgICAgICAgaWYgKG51bVVzZXJzSW5HYW1lID09IHRoaXMuTUFYX1VTRVJTX1BFUl9HQU1FKSB7XHJcbiAgICAgICAgICAgIG1vdmVHYW1lRnJvbUZ1bGxUb0F2YWlsYWJsZS5jYWxsKHRoaXMsIGdhbWVJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBkb25lR2V0dGluZ1VwZGF0ZVRpbWUobGFzdFVwZGF0ZVRpbWUsIGdhbWVJZCwgaXNUaGVMYXN0R2FtZSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgLy8gaWYgdGhlIGdhbWUgaXMgc3RpbGwgYWN0aXZlIGpvaW4gaXRcclxuICBpZiAobGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgIGlmICghdGhpcy5pc1RpbWVvdXRUb29Mb25nKGxhc3RVcGRhdGVUaW1lKSkge1xyXG4gICAgICB0aGlzLmpvaW5FeGlzdGluZ0dhbWUoZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZUdhbWVzKCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIGlmIHdlIGdvdCBoZXJlLCBhbmQgdGhpcyBpcyB0aGUgbGFzdCBnYW1lLCB0aGF0IG1lYW5zIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgZ2FtZXNcclxuICAvLyBzbyBjcmVhdGUgb25lXHJcbiAgaWYgKGlzVGhlTGFzdEdhbWUpIHtcclxuICAgIGNvbnNvbGUubG9nKCdubyBhdmFpbGFibGUgZ2FtZXMgZm91bmQsIG9ubHkgaW5hY3RpdmUgb25lcywgc28gY3JlYXRpbmcgYSBuZXcgb25lLi4uJyk7XHJcbiAgICB2YXIgZ2FtZURhdGEgPSB0aGlzLmNyZWF0ZU5ld0dhbWUodXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICBqb2luZWRHYW1lQ2FsbGJhY2soZ2FtZURhdGEsIHRydWUpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0R2FtZUxhc3RVcGRhdGVUaW1lKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWVDYWxsYmFjaywgaXNUaGVMYXN0R2FtZSkge1xyXG4gIGdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoZGF0YS52YWwoKSAmJiBkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdmb3VuZCB1cGRhdGUgdGltZTogJyArIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpXHJcbiAgICAgIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrKGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUsIGdhbWVJZCwgaXNUaGVMYXN0R2FtZSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlclBpbmcoKSB7XHJcbiAgdGhpcy5zZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlKCk7XHJcbiAgd2luZG93LnNldEludGVydmFsKHRoaXMuc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZSwgMTAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyKCkge1xyXG4gIGlmICh0eXBlb2YodGhpcy5Xb3JrZXIpICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICB0aGlzLm15V29ya2VyID0gbmV3IFdvcmtlcihcImFzeW5jbWVzc2FnZXIuanNcIik7XHJcbiAgICB0aGlzLm15V29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLnByb2Nlc3NNZXNzYWdlRXZlbnQsIGZhbHNlKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coXCJTb3JyeSwgeW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViIFdvcmtlcnMuLi5cIik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcygpIHtcclxuICAvLyBkbyBpdCBvbiBhIHdlYiB3b3JrZXIgdGhyZWFkXHJcbiAgaWYgKHRoaXMubXlXb3JrZXIpIHtcclxuICAgIHRoaXMubXlXb3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICBjbWQ6ICdjbGVhbnVwX2luYWN0aXZlX2dhbWVzJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZSgpIHtcclxuICBjb25zb2xlLmxvZygncGluZ2luZyBzZXJ2ZXInKTtcclxuICBnYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZCh0aGlzLmpvaW5lZEdhbWUpLmNoaWxkKCdsYXN0VXBkYXRlVGltZScpLnNldCgobmV3IERhdGUoKSkuZ2V0VGltZSgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cEdhbWVzKCkge1xyXG4gIGNvbnNvbGUubG9nKCdjbGVhbmluZyB1cCBpbmFjdGl2ZSBnYW1lcycpO1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhU25hcHNob3QpIHtcclxuICAgIGRhdGFTbmFwc2hvdC5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU25hcHNob3QpIHtcclxuICAgICAgdmFyIHNob3VsZERlbGV0ZUdhbWUgPSBmYWxzZTtcclxuICAgICAgdmFyIGdhbWVEYXRhID0gY2hpbGRTbmFwc2hvdC52YWwoKTtcclxuICAgICAgaWYgKCFnYW1lRGF0YSkge1xyXG4gICAgICAgIHNob3VsZERlbGV0ZUdhbWUgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChnYW1lRGF0YS51c2VycyA9PSBudWxsIHx8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ2dhbWUgaGFzIG5vIHVzZXJzJyk7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlR2FtZSA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMuaXNUaW1lb3V0VG9vTG9uZyhnYW1lRGF0YS5sYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcImdhbWUgaGFzbid0IGJlZW4gdXBkYXRlZCBzaW5jZSBcIiArIGdhbWVEYXRhLmxhc3RVcGRhdGVUaW1lKTtcclxuICAgICAgICBzaG91bGREZWxldGVHYW1lID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNob3VsZERlbGV0ZUdhbWUpIHtcclxuICAgICAgICB0aGlzLmRlbGV0ZUdhbWUoY2hpbGRTbmFwc2hvdC5uYW1lKCkpO1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGlzVGltZW91dFRvb0xvbmcobGFzdFVwZGF0ZVRpbWUpIHtcclxuICBpZiAoIWxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHZhciBjdXJyZW50VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgcmV0dXJuIChjdXJyZW50VGltZSAtIGxhc3RVcGRhdGVUaW1lID4gdGhpcy5HQU1FX0NMRUFOVVBfVElNRU9VVCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NNZXNzYWdlRXZlbnQoZXZlbnQpIHtcclxuICBzd2l0Y2ggKGV2ZW50LmRhdGEpIHtcclxuICAgIGNhc2UgJ2NsZWFudXBfaW5hY3RpdmVfZ2FtZXMnOlxyXG4gICAgICB0aGlzLmNsZWFudXBHYW1lcygpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIGJyZWFrO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGZpbmROZXdIb3N0UGVlcklkKGdhbWVJZCwgZXhpc3RpbmdIb3N0UGVlcklkLCBjYWxsYmFjaykge1xyXG4gIC8vIHJlc2V0IHRoZSBob3N0UGVlcklkIHNvIGl0IHByZXZlbnRzIHRoZSBsZWF2aW5nIGhvc3QncyBicm93c2VyXHJcbiAgLy8gaWYgaXQgdHJpZXMgdG8gc3dpdGNoIGFnYWluIGJlZm9yZSB0aGlzIGlzIGRvbmVcclxuICB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5yZW1vdmUoKTtcclxuXHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgdmFyIHVzZXJzID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKTtcclxuXHJcbiAgICAvLyBpZiBmb3Igd2hhdGV2ZXIgcmVhc29uIHRoaXMgaXMgY2FsbGVkIGFuZCBzb21ldGhpbmcncyBub3QgcmlnaHQsIGp1c3RcclxuICAgIC8vIHJldHVyblxyXG4gICAgaWYgKCF1c2Vycykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdXNlcnMgPSB1c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG4gICAgaWYgKHVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICh1c2Vyc1tpXSAmJiB1c2Vyc1tpXS5wZWVySWQgIT0gZXhpc3RpbmdIb3N0UGVlcklkKSB7XHJcbiAgICAgICAgLy8gd2UndmUgZm91bmQgYSBuZXcgdXNlciB0byBiZSB0aGUgaG9zdCwgcmV0dXJuIHRoZWlyIGlkXHJcbiAgICAgICAgY2FsbGJhY2soZ2FtZUlkLCB1c2Vyc1tpXS5wZWVySWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjYWxsYmFjayhnYW1lSWQsIG51bGwpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzd2l0Y2hUb05ld0hvc3QoZ2FtZUlkLCBuZXdIb3N0UGVlcklkKSB7XHJcbiAgaWYgKCFuZXdIb3N0UGVlcklkKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKS5jaGlsZCgnaG9zdFBlZXJJZCcpLnNldChuZXdIb3N0UGVlcklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGVsZXRlR2FtZShnYW1lSWQpIHtcclxuICB0aGlzLnJlbW92ZUdhbWVGcm9tQXZhaWxhYmxlR2FtZXMoZ2FtZUlkKTtcclxuICB0aGlzLnJlbW92ZUdhbWVGcm9tRnVsbEdhbWVzKGdhbWVJZCk7XHJcbiAgdGhpcy5yZW1vdmVHYW1lKGdhbWVJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUdhbWUoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLnJlbW92ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOZXdHYW1lKHVzZXJuYW1lLCBwZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IGdhbWUnKTtcclxuICB2YXIgZ2FtZUlkID0gdGhpcy5jcmVhdGVOZXdHYW1lSWQoKTtcclxuICB2YXIgZ2FtZURhdGEgPSB7XHJcbiAgICBpZDogZ2FtZUlkLFxyXG4gICAgaG9zdFBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcnM6IFt7XHJcbiAgICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgIH1dXHJcbiAgfVxyXG4gIHZhciBuZXdHYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBuZXdHYW1lRGF0YVJlZi5zZXQoZ2FtZURhdGEpO1xyXG4gIHZhciBuZXdBdmFpbGFibGVHYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBuZXdBdmFpbGFibGVHYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxuICB0aGlzLmpvaW5lZEdhbWUgPSBnYW1lSWQ7XHJcbiAgdGhpcy5pbml0aWFsaXplU2VydmVyUGluZygpO1xyXG4gIHJldHVybiBnYW1lRGF0YTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld0dhbWVJZCgpIHtcclxuICAvLyBUT0RPOiByZXBsYWNlIHRoaXMgd2l0aCBzb21ldGhpbmcgdGhhdCB3b24ndFxyXG4gIC8vIGFjY2lkZW50YWxseSBoYXZlIGNvbGxpc2lvbnNcclxuICByZXR1cm4gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGpvaW5FeGlzdGluZ0dhbWUoZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spIHtcclxuICAvLyBpZiBhIGdhbWUgaGFzIGFscmVhZHkgYmVlbiBqb2luZWQgb24gYW5vdGhlciB0aHJlYWQsIGRvbid0IGpvaW4gYW5vdGhlciBvbmVcclxuICBpZiAodGhpcy5qb2luZWRHYW1lICYmIHRoaXMuam9pbmVkR2FtZSA+PSAwKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuam9pbmVkR2FtZSA9IGdhbWVJZDtcclxuICB0aGlzLmFzeW5jR2V0R2FtZURhdGEoZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIHRoaXMuZG9uZUdldHRpbmdHYW1lRGF0YSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBhc3luY0dldEdhbWVEYXRhKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBkb25lR2V0dGluZ0dhbWVEYXRhQ2FsbGJhY2spIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBkb25lR2V0dGluZ0dhbWVEYXRhQ2FsbGJhY2soZGF0YSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZG9uZUdldHRpbmdHYW1lRGF0YShnYW1lRGF0YVNuYXBzaG90LCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spIHtcclxuICB2YXIgZ2FtZURhdGEgPSBnYW1lRGF0YVNuYXBzaG90LnZhbCgpO1xyXG4gIHZhciBuZXdVc2VyID0ge1xyXG4gICAgcGVlcklkOiBwZWVySWQsXHJcbiAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICB9O1xyXG4gIC8vIHdlaXJkbmVzczogaSB3YW50IHRvIGp1c3QgcHVzaCBuZXdVc2VyIG9udG8gZ2FtZURhdGEudXNlcnMsIGJ1dFxyXG4gIC8vIHRoYXQgbWVzc2VzIHVwIHRoZSBhcnJheSBJIGd1ZXNzXHJcbiAgdmFyIHVzZXJzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGEudXNlcnNbaV0pIHtcclxuICAgICAgdXNlcnNBcnJheS5wdXNoKGdhbWVEYXRhLnVzZXJzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbiAgdXNlcnNBcnJheS5wdXNoKG5ld1VzZXIpO1xyXG4gIGdhbWVEYXRhLnVzZXJzID0gdXNlcnNBcnJheTtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lRGF0YVNuYXBzaG90LnJlZigpO1xyXG4gIGdhbWVEYXRhUmVmLnNldChnYW1lRGF0YSk7XHJcbiAgY29uc29sZS5sb2coJ2pvaW5pbmcgZ2FtZSAnICsgZ2FtZURhdGEuaWQpO1xyXG4gIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4gIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIGdhbWUuIFNvIHRyaW0gb3V0IHRoZSBcclxuICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gIGlmICh1c2Vyc0FycmF5Lmxlbmd0aCA9PSB0aGlzLk1BWF9VU0VSU19QRVJfR0FNRSkge1xyXG4gICAgdGhpcy5zZXRHYW1lVG9GdWxsKGdhbWVEYXRhLmlkKTtcclxuICB9XHJcbiAgdmFyIHBlZXJJZHNBcnJheSA9IFtdO1xyXG4gIGZvciAodmFyIGogPSAwOyBqIDwgZ2FtZURhdGEudXNlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgIHBlZXJJZHNBcnJheS5wdXNoKGdhbWVEYXRhLnVzZXJzW2pdLnBlZXJJZCk7XHJcbiAgfVxyXG4gIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2socGVlcklkc0FycmF5KTtcclxuICB0aGlzLmluaXRpYWxpemVTZXJ2ZXJQaW5nKCk7XHJcbiAgam9pbmVkR2FtZUNhbGxiYWNrKGdhbWVEYXRhLCBmYWxzZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEdhbWVUb0Z1bGwoZ2FtZUlkKSB7XHJcbiAgdGhpcy5yZW1vdmVHYW1lRnJvbUF2YWlsYWJsZUdhbWVzKGdhbWVJZCk7XHJcbiAgdGhpcy5hZGRHYW1lVG9GdWxsR2FtZXNMaXN0KGdhbWVJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUdhbWVGcm9tQXZhaWxhYmxlR2FtZXMoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLnJlbW92ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRHYW1lVG9GdWxsR2FtZXNMaXN0KGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IGdhbWVSZWYuY2hpbGQodGhpcy5GVUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLnNldChnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlR2FtZUZyb21GdWxsVG9BdmFpbGFibGUoZ2FtZUlkKSB7XHJcbiAgdGhpcy5yZW1vdmVHYW1lRnJvbUZ1bGxHYW1lcyhnYW1lSWQpO1xyXG4gIHRoaXMuYWRkR2FtZVRvQXZhaWxhYmxlR2FtZXNMaXN0KGdhbWVJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUdhbWVGcm9tRnVsbEdhbWVzKGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IGdhbWVSZWYuY2hpbGQodGhpcy5GVUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLnJlbW92ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRHYW1lVG9BdmFpbGFibGVHYW1lc0xpc3QoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxufVxyXG5cclxuXHJcbi8vIC8vIHJldHVybnMgbnVsbCBpZiB0aGUgdXNlciB3YXNuJ3QgZm91bmQgaW4gdGhlIGdhbWVcclxuLy8gZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21HYW1lRGF0YShwZWVySWQsIGdhbWVEYXRhKSB7XHJcbi8vICAgLy8gaWYgc29tZXRoaW5nJ3Mgd3JvbmcsIGp1c3QgcmV0dXJuXHJcbi8vICAgaWYgKCFnYW1lRGF0YSB8fCAhZ2FtZURhdGEudXNlcnMpIHtcclxuLy8gICAgIHJldHVybiBudWxsO1xyXG4vLyAgIH1cclxuXHJcbi8vICAgLy8gVE9ETzogRmlyZWJhc2UgaGFzIGEgYmV0dGVyIHdheSBvZiBkb2luZyB0aGlzXHJcbi8vICAgdmFyIGZvdW5kUGVlciA9IGZhbHNlO1xyXG5cclxuLy8gICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuLy8gICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbi8vICAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuLy8gICBnYW1lRGF0YS51c2VycyA9IGdhbWVEYXRhLnVzZXJzLmNsZWFuKHVuZGVmaW5lZCk7XHJcblxyXG4vLyAgIHVzZXJzV2l0aG91dFBlZXIgPSBbXTtcclxuLy8gICBmb3IgKGkgPSAwOyBpIDwgZ2FtZURhdGEudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuLy8gICAgIGlmIChnYW1lRGF0YS51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbi8vICAgICAgIGZvdW5kUGVlciA9IHRydWU7XHJcbi8vICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICB1c2Vyc1dpdGhvdXRQZWVyLnB1c2goZ2FtZURhdGEudXNlcnNbaV0pO1xyXG4vLyAgICAgfVxyXG4vLyAgIH1cclxuXHJcbi8vICAgaWYgKGZvdW5kUGVlcikge1xyXG4vLyAgICAgZ2FtZURhdGEudXNlcnMgPSB1c2Vyc1dpdGhvdXRQZWVyO1xyXG4vLyAgICAgcmV0dXJuIGdhbWVEYXRhO1xyXG4vLyAgIH0gZWxzZSB7XHJcbi8vICAgICByZXR1cm4gbnVsbDtcclxuLy8gICB9Il19
