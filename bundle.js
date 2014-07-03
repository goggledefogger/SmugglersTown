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

  // bind public callback functions
  this.initialize = this.initialize.bind(this);

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
  this.peer.on('connection', connectedToPeer.bind(this));
  this.ACTIVE_CONNECTION_TIMEOUT_IN_SECONDS = 30 * 1000;


  google.maps.event.addDomListener(window, 'load', this.initialize);
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
  requestAnimationFrame(frame);
}


function initializeBoostBar() {
  $(function() {
    $("#boost-bar").progressbar({
      value: 100
    });
  });
}

function mapIsReady() {
  this.matchmakerTown.joinOrCreateGame(this.username, this.peer.id, this.connectToAllNonHostUsers, this.gameJoined)
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
    createTeamCrushBase.call(self, self.mapData.map.teamCrushBaseLatLng.lat, self.mapData.map.teamCrushBaseLatLng.lng);
    self.myTeamBaseMapObject = self.teamTownBaseMapObject;

    randomlyPutItems.call(self);
    mapIsReadyCallback.call(self);
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

}

/**
 *  connect to a game
 */
MatchmakerTown.prototype.joinOrCreateGame = function(username, peerId, connectToUsersCallback, joinedGameCallback) {
  var self = this;

  callAsyncCleanupInactiveGames.call(this);
  console.log('trying to join game');
  initializeServerHelperWorker.call(this, window);
  var availableGamesDataRef = this.gameRef.child(this.AVAILABLE_GAMES_LOCATION);
  availableGamesDataRef.once('value', function(data) {
    // only join a game if one isn't joined already
    if (self.joinedGame == null) {
      self.joinedGame = -1;
      if (data.val() === null) {
        // there are no available games, so create one
        var gameData = createNewGame.call(self, username, peerId);
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
            getGameLastUpdateTime.call(self, gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTime, counter == numAvailableGames, self);
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



function doneGettingUpdateTime(lastUpdateTime, gameId, isTheLastGame, username, peerId, connectToUsersCallback, joinedGameCallback, scope) {
  // if the game is still active join it
  if (lastUpdateTime) {
    if (!isTimeoutTooLong.call(scope, lastUpdateTime)) {
      joinExistingGame.call(scope, gameId, username, peerId, connectToUsersCallback, joinedGameCallback);
      return;
    } else {
      callAsyncCleanupInactiveGames.call(scope);
    }
  }
  // if we got here, and this is the last game, that means there are no available games
  // so create one
  if (isTheLastGame) {
    console.log('no available games found, only inactive ones, so creating a new one...');
    var gameData = createNewGame.call(scope, username, peerId);
    joinedGameCallback(gameData, true);
  }
}

function getGameLastUpdateTime(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTimeCallback, isTheLastGame) {
  var self = this;
  this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId).once('value', function(data) {
    if (data.val() && data.val().lastUpdateTime) {
      console.log('found update time: ' + data.val().lastUpdateTime)
      doneGettingUpdateTimeCallback(data.val().lastUpdateTime, gameId, isTheLastGame, username, peerId, connectToUsersCallback, joinedGameCallback, self);
    }
  });
}

function initializeServerPing() {
  setServerStatusAsStillActive.call(this);
  window.setInterval(this.setServerStatusAsStillActive, 10000);
}

function initializeServerHelperWorker(windowObject) {
  if (typeof(windowObject.Worker) !== "undefined") {
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
  var self = this;

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
      if (isTimeoutTooLong.call(self, gameData.lastUpdateTime)) {
        console.log("game hasn't been updated since " + gameData.lastUpdateTime);
        shouldDeleteGame = true;
      }

      if (shouldDeleteGame) {
        deleteGame(self, childSnapshot.name());
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
      cleanupGames.self();
      break;
    default:
      break;
  }
}


function findNewHostPeerId(gameId, existingHostPeerId, callback) {
  var self = this;

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
  removeGameFromAvailableGames.call(this, gameId);
  removeGameFromFullGames.call(this, gameId);
  removeGame.call(this, gameId);
}

function removeGame(gameId) {
  var gameDataRef = this.gameRef.child(this.ALL_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function createNewGame(username, peerId) {
  console.log('creating new game');
  var gameId = createNewGameId.call(this);
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
  initializeServerPing.call(this);
  return gameData;
}


function createNewGameId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback, scope) {
  // if a game has already been joined on another thread, don't join another one
  if (scope.joinedGame && scope.joinedGame >= 0) {
    return;
  }
  scope.joinedGame = gameId;
  asyncGetGameData.call(scope, gameId, username, peerId, connectToUsersCallback, joinedGameCallback, scope.doneGettingGameData);
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
    setGameToFull.call(this, gameData.id);
  }
  var peerIdsArray = [];
  for (var j = 0; j < gameData.users.length; j++) {
    peerIdsArray.push(gameData.users[j].peerId);
  }
  connectToUsersCallback(peerIdsArray);
  initializeServerPing.call(this);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvaW5kZXguanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9tYXBnYW1lLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWF0Y2htYWtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3akRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFNtdWdnbGVyc1Rvd24gPSByZXF1aXJlKCcuL21hcGdhbWUuanMnKTtcclxuXHJcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGdhbWUgPSBuZXcgU211Z2dsZXJzVG93bignaHR0cHM6Ly9zbXVnZ2xlcnN0b3duLmZpcmViYXNlaW8uY29tLycpO1xyXG59KTsiLCIvKiBZT1VSIFNNVUdHTEVSIE1JU1NJT04sIElGIFlPVSBDSE9PU0UgVE8gQUNDRVBULCBJUyBUTyBKT0lOIFRFQU1cclxuICogVE9XTiBBTkQgVFJZIFRPIERFRkVBVCBURUFNIENSVVNILiAgQU5EIFlPVSBNVVNUIEFDQ0VQVC4uLlxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgbWFwZ2FtZS5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZGVwc1xyXG4gKi9cclxuLy92YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xyXG4vL3ZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBNYXRjaG1ha2VyVG93biA9IHJlcXVpcmUoJy4vbWF0Y2htYWtlci5qcycpO1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gU211Z2dsZXJzVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFNtdWdnbGVyc1Rvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcblxyXG4gIC8vIGJpbmQgcHVibGljIGNhbGxiYWNrIGZ1bmN0aW9uc1xyXG4gIHRoaXMuaW5pdGlhbGl6ZSA9IHRoaXMuaW5pdGlhbGl6ZS5iaW5kKHRoaXMpO1xyXG5cclxuICB0aGlzLmtlZXBBbGl2ZVBhcmFtTmFtZSA9ICdrZWVwYWxpdmUnO1xyXG4gIHRoaXMucXMgPSBuZXcgUXVlcnlTdHJpbmcoKTtcclxuXHJcbiAgdGhpcy5tYXRjaG1ha2VyVG93biA9IG5ldyBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpO1xyXG5cclxuICB0aGlzLm1hcCA9IG51bGw7IC8vIHRoZSBtYXAgY2FudmFzIGZyb20gdGhlIEdvb2dsZSBNYXBzIHYzIGphdmFzY3JpcHQgQVBJXHJcbiAgdGhpcy5tYXBab29tTGV2ZWwgPSAxODtcclxuICB0aGlzLm1hcERhdGEgPSBudWxsOyAvLyB0aGUgbGV2ZWwgZGF0YSBmb3IgdGhpcyBtYXAgKGJhc2UgbG9jYXRpb25zKVxyXG5cclxuICB0aGlzLml0ZW1NYXBPYmplY3QgPSBudWxsO1xyXG4gIC8vIHRoZSBpdGVtTWFwT2JqZWN0IHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIGxvY2F0aW9uOiA8Z29vZ2xlX21hcHNfTGF0TG5nX29iamVjdD4sXHJcbiAgLy8gICBtYXJrZXI6IDxnb29nbGVfbWFwc19NYXJrZXJfb2JqZWN0PlxyXG4gIC8vIH1cclxuXHJcbiAgLy8gZGVmYXVsdCB0byB0aGUgZ3JhbmQgY2FueW9uLCBidXQgdGhpcyB3aWxsIGJlIGxvYWRlZCBmcm9tIGEgbWFwIGZpbGVcclxuICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoMzYuMTUxMTAzLCAtMTEzLjIwODU2NSk7XHJcblxyXG5cclxuXHJcbiAgLy8gdGVhbSBkYXRhXHJcbiAgLy8gdGhlIHRlYW0gb2JqZWN0cyB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICB1c2VyczogW3tcclxuICAvLyAgICAgcGVlcklkOiAxMjM0NTY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiAncm95J1xyXG4gIC8vICAgfSwge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdoYW0nXHJcbiAgLy8gICB9XSxcclxuICAvLyAgIGJhc2VPYmplY3Q6IHtcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9LFxyXG4gIC8vICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIC8vIH1cclxuICB0aGlzLnRlYW1Ub3duT2JqZWN0ID0ge1xyXG4gICAgdXNlcnM6IFtdLFxyXG4gICAgYmFzZU9iamVjdDoge1xyXG4gICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgIGxhdDogMzYuMTUxMTAzLFxyXG4gICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICB9O1xyXG4gIHRoaXMudGVhbUNydXNoT2JqZWN0ID0ge1xyXG4gICAgdXNlcnM6IFtdLFxyXG4gICAgYmFzZU9iamVjdDoge1xyXG4gICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgIGxhdDogMzYuMTUxMTAzLFxyXG4gICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICB9O1xyXG5cclxuICAvLyBmb3IgdGltZS1iYXNlZCBnYW1lIGxvb3BcclxuICB0aGlzLm5vdztcclxuICB0aGlzLmR0ID0gMDtcclxuICB0aGlzLmxhc3QgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLnN0ZXAgPSAxIC8gNjA7XHJcblxyXG4gIC8vIHVzZXIgZGF0YVxyXG4gIHRoaXMudXNlcm5hbWUgPSBudWxsO1xyXG5cclxuICAvLyBnYW1lIGhvc3RpbmcgZGF0YVxyXG4gIHRoaXMuZ2FtZUlkID0gbnVsbDtcclxuICB0aGlzLmhvc3RQZWVySWQgPSBudWxsO1xyXG5cclxuICAvLyBjYXIgcHJvcGVydGllc1xyXG4gIHRoaXMucm90YXRpb24gPSAwO1xyXG4gIHRoaXMuZGVjZWxlcmF0aW9uID0gMS4xO1xyXG4gIHRoaXMuTUFYX05PUk1BTF9TUEVFRCA9IDE4O1xyXG4gIHRoaXMuTUFYX0JPT1NUX1NQRUVEID0gNDA7XHJcbiAgdGhpcy5CT09TVF9GQUNUT1IgPSAxLjA3O1xyXG4gIHRoaXMuQk9PU1RfQ09OU1VNUFRJT05fUkFURSA9IDAuNTtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IgPSAxMDAwMDAwO1xyXG4gIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IgPSA1MDAwMDA7XHJcblxyXG4gIC8vIGNvbGxpc2lvbiBlbmdpbmUgaW5mb1xyXG4gIHRoaXMuY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2UgPSAyMDtcclxuICB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlID0gNDM7XHJcblxyXG4gIC8vIG1hcCBkYXRhXHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgdGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgPSAwLjAwODsgLy8gaW4gbGF0aXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsb25naXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UgPSAzMDA7XHJcblxyXG4gIC8vIHRoZXNlIG1hcCBvYmplY3RzIHdpbGwgYmUgb2YgdGhlIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge1xyXG4gICAgbG9jYXRpb246IHRoaXMubWFwQ2VudGVyLFxyXG4gICAgbWFya2VyOiBudWxsXHJcbiAgfVxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IG51bGw7XHJcbiAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcblxyXG4gIC8vIGdhbWVwbGF5XHJcblxyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QgPSB7XHJcbiAgICB0ZWFtVG93bk9iamVjdDogdGhpcy50ZWFtVG93bk9iamVjdCxcclxuICAgIHRlYW1DcnVzaE9iamVjdDogdGhpcy50ZWFtQ3J1c2hPYmplY3QsXHJcbiAgICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogdGhpcy5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgIH1cclxuICB9O1xyXG4gIC8vIHRoaXMgd2lsbCBiZSBvZiB0aGUgZm9ybVxyXG4gIC8vIHtcclxuICAvLyAgIHRlYW1Ub3duT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgdGVhbUNydXNoT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgcGVlcklkT2ZDYXJXaXRoSXRlbTogbnVsbCxcclxuICAvLyAgIGluaXRpYWxMb2NhdGlvbjoge1xyXG4gIC8vICAgICBsYXQ6IDM1LFxyXG4gIC8vICAgICBsbmc6IC0xMzJcclxuICAvLyB9XHJcbiAgLy8gICBpdGVtT2JqZWN0OiB7XHJcbiAgLy8gICAgIGlkOiA1NzYsXHJcbiAgLy8gICAgIGxvY2F0aW9uOiB7XHJcbiAgLy8gICAgICAgbGF0OiAzNCxcclxuICAvLyAgICAgICBsbmc6IC0xMzNcclxuICAvLyAgICAgfVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcblxyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgLy8gc2V0IHRoZSBpbml0aWFsIGRlc3RpbmF0aW9uIHRvIHdoYXRldmVyLCBpdCB3aWxsIGJlIHJlc2V0IFxyXG4gIC8vIHdoZW4gYW4gaXRlbSBpcyBmaXJzdCBwbGFjZWRcclxuICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyg0NS40ODkzOTEsIC0xMjIuNjQ3NTg2KTtcclxuICB0aGlzLnRpbWVEZWxheUJldHdlZW5UcmFuc2ZlcnMgPSAxMDAwOyAvLyBpbiBtc1xyXG4gIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gbnVsbDtcclxuXHJcbiAgLy8gb2JqZWN0IG9mIHRoZSBvdGhlciB1c2Vyc1xyXG4gIHRoaXMub3RoZXJVc2VycyA9IHt9O1xyXG4gIC8vIHRoZSBvdGhlclVzZXJzIGRhdGEgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgMTIzNDU2Nzg5OiB7XHJcbiAgLy8gICAgIHBlZXJJZDogMTIzNDY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiBoZWxsb3JveSxcclxuICAvLyAgICAgY2FyOiB7XHJcbiAgLy8gICAgICAgbG9jYXRpb246IDxsb2NhdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICAgIG1hcmtlcjogPG1hcmtlcl9vYmplY3Q+XHJcbiAgLy8gICAgIH0sXHJcbiAgLy8gICAgIHBlZXJKc0Nvbm5lY3Rpb246IDxwZWVySnNDb25uZWN0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgIGxhc3RVcGRhdGVUaW1lOiA8dGltZV9vYmplY3Q+LFxyXG4gIC8vICAgICBudW1JdGVtczogMCxcclxuICAvLyAgICAgaGFzQmVlbkluaXRpYWxpemVkOiB0cnVlXHJcbiAgLy8gICB9LFxyXG4gIC8vICAgOTg3NjU0MzIxOiB7XHJcbiAgLy8gICAgIHBlZXJJZDogOTg3NjU0MzIxLFxyXG4gIC8vICAgICB1c2VybmFtZTogdG93bnRvd245MDAwLFxyXG4gIC8vICAgICBjYXI6IHtcclxuICAvLyAgICAgICBsb2NhdGlvbjogPGxvY2F0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgICAgbWFya2VyOiA8bWFya2VyX29iamVjdD5cclxuICAvLyAgICAgfSxcclxuICAvLyAgICAgcGVlckpzQ29ubmVjdGlvbjogPHBlZXJKc0Nvbm5lY3Rpb25fb2JqZWN0PixcclxuICAvLyAgICAgbGFzdFVwZGF0ZVRpbWU6IDx0aW1lX29iamVjdD4sXHJcbiAgLy8gICAgIG51bUl0ZW1zOiA1XHJcbiAgLy8gICB9XHJcbiAgLy8gfVxyXG5cclxuICAvLyBpbWFnZXNcclxuICB0aGlzLml0ZW1JY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3Ntb2tpbmdfdG9pbGV0X3NtYWxsLmdpZidcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaFVzZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2NydXNoX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1Ub3duVXNlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbVRvd25PdGhlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvdGVhbV90b3duX290aGVyX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1DcnVzaE90aGVyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy90ZWFtX2NydXNoX290aGVyX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2ZvcnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL29wcG9uZW50X2ZvcnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9mb3J0X3RyYW5zcGFyZW50LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL29wcG9uZW50X2ZvcnRfdHJhbnNwYXJlbnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuXHJcbiAgLy8gcGVlciBKUyBjb25uZWN0aW9uIChmb3IgbXVsdGlwbGF5ZXIgd2ViUlRDKVxyXG4gIHRoaXMucGVlciA9IG5ldyBQZWVyKHtcclxuICAgIGtleTogJ2ozbTBxdGRkZXNocGszeHInXHJcbiAgfSk7XHJcbiAgdGhpcy5wZWVyLm9uKCdvcGVuJywgZnVuY3Rpb24oaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKCdNeSBwZWVyIElEIGlzOiAnICsgaWQpO1xyXG4gICAgJCgnI3BlZXItaWQnKS50ZXh0KGlkKTtcclxuICAgICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnd2FpdGluZyBmb3IgYSBzbXVnZ2xlciB0byBiYXR0bGUuLi4nKTtcclxuICB9KTtcclxuICB0aGlzLnBlZXIub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0ZWRUb1BlZXIuYmluZCh0aGlzKSk7XHJcbiAgdGhpcy5BQ1RJVkVfQ09OTkVDVElPTl9USU1FT1VUX0lOX1NFQ09ORFMgPSAzMCAqIDEwMDA7XHJcblxyXG5cclxuICBnb29nbGUubWFwcy5ldmVudC5hZGREb21MaXN0ZW5lcih3aW5kb3csICdsb2FkJywgdGhpcy5pbml0aWFsaXplKTtcclxufVxyXG5cclxuLyoqXHJcbiAqICBpbml0aWFsaXplIHRoZSBnYW1lXHJcbiAqL1xyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB0aGlzLnVzZXJuYW1lID0gcHJvbXB0KCdDaG9vc2UgeW91ciBTbXVnZ2xlciBOYW1lOicsICdOaW5qYSBSb3knKTtcclxuICBjcmVhdGVNYXBPblBhZ2UuY2FsbCh0aGlzKTtcclxuICBsb2FkTWFwRGF0YS5jYWxsKHRoaXMsIG1hcElzUmVhZHkpO1xyXG5cclxuICAvLyB0aGVzZSBhcmUgc2V0IHRvIHRydWUgd2hlbiBrZXlzIGFyZSBiZWluZyBwcmVzc2VkXHJcbiAgdGhpcy5yaWdodERvd24gPSBmYWxzZTtcclxuICB0aGlzLmxlZnREb3duID0gZmFsc2U7XHJcbiAgdGhpcy51cERvd24gPSBmYWxzZTtcclxuICB0aGlzLmRvd25Eb3duID0gZmFsc2U7XHJcbiAgdGhpcy5jdHJsRG93biA9IGZhbHNlO1xyXG5cclxuICB0aGlzLnNwZWVkID0gMDtcclxuICB0aGlzLnJvdGF0aW9uID0gMDtcclxuICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG5cclxuICAvL3RyeUZpbmRpbmdMb2NhdGlvbigpO1xyXG5cclxuXHJcbiAgYmluZEtleUFuZEJ1dHRvbkV2ZW50cy5jYWxsKHRoaXMpO1xyXG5cclxuICBpbml0aWFsaXplQm9vc3RCYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gc3RhcnQgdGhlIGdhbWUgbG9vcFxyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmcmFtZSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplQm9vc3RCYXIoKSB7XHJcbiAgJChmdW5jdGlvbigpIHtcclxuICAgICQoXCIjYm9vc3QtYmFyXCIpLnByb2dyZXNzYmFyKHtcclxuICAgICAgdmFsdWU6IDEwMFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1hcElzUmVhZHkoKSB7XHJcbiAgdGhpcy5tYXRjaG1ha2VyVG93bi5qb2luT3JDcmVhdGVHYW1lKHRoaXMudXNlcm5hbWUsIHRoaXMucGVlci5pZCwgdGhpcy5jb25uZWN0VG9BbGxOb25Ib3N0VXNlcnMsIHRoaXMuZ2FtZUpvaW5lZClcclxufVxyXG5cclxuZnVuY3Rpb24gZ2FtZUpvaW5lZChnYW1lRGF0YSwgaXNOZXdHYW1lKSB7XHJcbiAgZ2FtZUlkID0gZ2FtZURhdGEuaWQ7XHJcbiAgaWYgKGlzTmV3R2FtZSkge1xyXG4gICAgLy8gd2UncmUgaG9zdGluZyB0aGUgZ2FtZSBvdXJzZWxmXHJcbiAgICBob3N0UGVlcklkID0gcGVlci5pZDtcclxuICAgIC8vIGZpcnN0IHVzZXIgaXMgYWx3YXlzIG9uIHRlYW0gdG93blxyXG4gICAgdGhpcy5nYW1lRGF0YS50ZWFtVG93bk9iamVjdC51c2VycyA9IFt7XHJcbiAgICAgIHBlZXJJZDogcGVlci5pZCxcclxuICAgICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgICB9XTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd5ZWxsb3cnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnY29sb3InLCAnYmxhY2snKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gc29tZW9uZSBlbHNlIGlzIGFscmVhZHkgdGhlIGhvc3RcclxuICAgIGhvc3RQZWVySWQgPSBnYW1lRGF0YS5ob3N0UGVlcklkO1xyXG4gICAgYWN0aXZhdGVUZWFtQ3J1c2hJblVJKCk7XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkoKTtcclxuICB1cGRhdGVDYXJJY29ucygpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVc2VybmFtZXNJblVJKCkge1xyXG4gIHZhciB0ZWFtVG93bkpxdWVyeUVsZW0gPSAkKCcjdGVhbS10b3duLXVzZXJuYW1lcycpO1xyXG4gIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1Ub3duSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycyk7XHJcbiAgdmFyIHRlYW1DcnVzaEpxdWVyeUVsZW0gPSAkKCcjdGVhbS1jcnVzaC11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtQ3J1c2hKcXVlcnlFbGVtLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycyk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbSwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIC8vIGNsZWFyIHRoZSBjdXJyZW50IGxpc3Qgb2YgdXNlcm5hbWVzXHJcbiAgdGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0uZW1wdHkoKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJPYmplY3RzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBuZXdKcXVlcnlFbGVtID0gJCgkLnBhcnNlSFRNTChcclxuICAgICAgJzxsaSBpZD1cInVzZXJuYW1lLScgK1xyXG4gICAgICB1c2VyT2JqZWN0c0FycmF5W2ldLnBlZXJJZCArXHJcbiAgICAgICdcIj4nICsgdXNlck9iamVjdHNBcnJheVtpXS51c2VybmFtZSArICc8L2xpPidcclxuICAgICkpO1xyXG4gICAgJCh0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbSkuYXBwZW5kKG5ld0pxdWVyeUVsZW0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYWN0aXZhdGVUZWFtQ3J1c2hJblVJKCkge1xyXG4gICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ29wYWNpdHknLCAnMScpO1xyXG4gIHZhciB0ZWFtQ3J1c2hTY29yZSA9IDA7XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpIHtcclxuICAgIHRlYW1DcnVzaFNjb3JlID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZDtcclxuICB9XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0ZWFtQ3J1c2hTY29yZSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjb25uZWN0VG9BbGxOb25Ib3N0VXNlcnMobm9uSG9zdFBlZXJJZHMpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vbkhvc3RQZWVySWRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAobm9uSG9zdFBlZXJJZHNbaV0gIT0gcGVlci5pZCkge1xyXG4gICAgICBjb25uZWN0VG9QZWVyLmNhbGwodGhpcywgbm9uSG9zdFBlZXJJZHNbaV0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYmluZEtleUFuZEJ1dHRvbkV2ZW50cygpIHtcclxuICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCkge1xyXG4gICAgcmVzaXplTWFwVG9GaXQuY2FsbCh0aGlzKTtcclxuICB9KTtcclxuXHJcbiAgJChkb2N1bWVudCkua2V5ZG93bih0aGlzLm9uS2V5RG93bik7XHJcbiAgJChkb2N1bWVudCkua2V5dXAodGhpcy5vbktleVVwKTtcclxuICAkKCcjY29ubmVjdC1idXR0b24nKS5jbGljayhmdW5jdGlvbihldnQpIHtcclxuICAgIHZhciBwZWVySWQgPSAkKCcjcGVlci1pZC10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBjb25zb2xlLmxvZygncGVlciBpZCBjb25uZWN0aW5nOiAnICsgcGVlcklkKTtcclxuICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBwZWVySWQpO1xyXG4gIH0pO1xyXG4gICQoJyNzZXQtY2VudGVyLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHNlYXJjaFRlcm0gPSAkKCcjbWFwLWNlbnRlci10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBpZiAoIXNlYXJjaFRlcm0pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgY2VudGVyIHRvOiAnICsgc2VhcmNoVGVybSk7XHJcbiAgICBzZWFyY2hBbmRDZW50ZXJNYXAuY2FsbCh0aGlzLCBzZWFyY2hUZXJtKTtcclxuICAgIGJyb2FkY2FzdE5ld0xvY2F0aW9uLmNhbGwodGhpcywgbWFwQ2VudGVyKTtcclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICB9KTtcclxuICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSB0aGlzLmRpc2Nvbm5lY3RGcm9tR2FtZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzY29ubmVjdEZyb21HYW1lKCkge1xyXG4gIGlmICh0aGlzLnBlZXIgJiYgdGhpcy5wZWVyLmlkICYmIHRoaXMuZ2FtZUlkKSB7XHJcbiAgICBtYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbUdhbWUodGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVNYXBPblBhZ2UoKSB7XHJcbiAgdmFyIG1hcE9wdGlvbnMgPSB7XHJcbiAgICB6b29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIGNlbnRlcjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBrZXlib2FyZFNob3J0Y3V0czogZmFsc2UsXHJcbiAgICBtYXBUeXBlSWQ6IGdvb2dsZS5tYXBzLk1hcFR5cGVJZC5TQVRFTExJVEUsXHJcbiAgICBkaXNhYmxlRGVmYXVsdFVJOiB0cnVlLFxyXG4gICAgbWluWm9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBtYXhab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIHNjcm9sbHdoZWVsOiBmYWxzZSxcclxuICAgIGRpc2FibGVEb3VibGVDbGlja1pvb206IHRydWUsXHJcbiAgICBkcmFnZ2FibGU6IGZhbHNlLFxyXG4gIH1cclxuXHJcbiAgdGhpcy5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtY2FudmFzJyksIG1hcE9wdGlvbnMpO1xyXG5cclxuICAvLyBub3QgbmVjZXNzYXJ5LCBqdXN0IHdhbnQgdG8gYWxsb3cgdGhlIHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCAnY2xpY2snLCBmdW5jdGlvbihlKSB7XHJcbiAgICBjb250ZXh0bWVudTogdHJ1ZVxyXG4gIH0pO1xyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcInJpZ2h0Y2xpY2tcIiwgdGhpcy5zaG93Q29udGV4dE1lbnUpO1xyXG5cclxuICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNpemVNYXBUb0ZpdCgpIHtcclxuICAkKCdib2R5JykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtIDIpO1xyXG4gIHZhciBtYWluSGVpZ2h0ID0gJCgnYm9keScpLmhlaWdodCgpO1xyXG4gIHZhciBjb250ZW50SGVpZ2h0ID1cclxuICAgICQoJyNoZWFkZXInKS5vdXRlckhlaWdodCgpICtcclxuICAgICQoJyNmb290ZXInKS5vdXRlckhlaWdodCgpO1xyXG4gIHZhciBoID0gbWFpbkhlaWdodCAtIGNvbnRlbnRIZWlnaHQ7XHJcbiAgJCgnI21hcC1ib2R5JykuaGVpZ2h0KGgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWFyY2hBbmRDZW50ZXJNYXAoc2VhcmNoVGVybSkge1xyXG4gIHZhciBwYXJ0cyA9IHNlYXJjaFRlcm0uc3BsaXQoJywnKTtcclxuICBpZiAoIXBhcnRzKSB7XHJcbiAgICAvLyBiYWQgc2VhcmNoIGlucHV0LCBtdXN0IGJlIGluIGxhdCxsbmcgZm9ybVxyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgbGF0U3RyaW5nID0gcGFydHNbMF07XHJcbiAgdmFyIGxuZ1N0cmluZyA9IHBhcnRzWzFdO1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0U3RyaW5nLCBsbmdTdHJpbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkTWFwRGF0YShtYXBJc1JlYWR5Q2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgY29uc29sZS5sb2coJ2xvYWRpbmcgbWFwIGRhdGEnKTtcclxuXHJcbiAgLy8gVE9ETzogXHJcbiAgLy8gdG8gcmVhZCBzdGF0aWMgZmlsZXMgaW5cclxuICAvLyB5b3UgbmVlZCB0byBwYXNzIFwiLXQgYnJmc1wiIHRvIGJyb3dzZXJpZnlcclxuICAvLyBidXQgaXQncyBjb29sIGNvcyB5b3UgY2FuIGlubGluZSBiYXNlNjQgZW5jb2RlZCBpbWFnZXMgb3IgdXRmOCBodG1sIHN0cmluZ3NcclxuICAvLyQuZ2V0SlNPTihcIm1hcHMvZ3JhbmRjYW55b24uanNvblwiLCBmdW5jdGlvbihqc29uKSB7XHJcbiAgJC5nZXRKU09OKFwibWFwcy9wb3J0bGFuZC5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAgIGNvbnNvbGUubG9nKCdtYXAgZGF0YSBsb2FkZWQnKTtcclxuICAgIHNlbGYubWFwRGF0YSA9IGpzb247XHJcbiAgICBzZWxmLm1hcERhdGFMb2FkZWQgPSB0cnVlO1xyXG4gICAgc2VsZi5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHNlbGYubWFwRGF0YS5tYXAuY2VudGVyTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubWFwLnNldENlbnRlcihzZWxmLm1hcENlbnRlcik7XHJcbiAgICBzZWxmLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgICAgbGF0OiBzZWxmLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiBzZWxmLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfTtcclxuXHJcbiAgICBjcmVhdGVUZWFtVG93bkJhc2UuY2FsbChzZWxmLCBzZWxmLm1hcERhdGEubWFwLnRlYW1Ub3duQmFzZUxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBjcmVhdGVUZWFtQ3J1c2hCYXNlLmNhbGwoc2VsZiwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBzZWxmLm15VGVhbUJhc2VNYXBPYmplY3QgPSBzZWxmLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwoc2VsZik7XHJcbiAgICBtYXBJc1JlYWR5Q2FsbGJhY2suY2FsbChzZWxmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0ID0gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZShsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdChsYXQsIGxuZykge1xyXG4gIC8vIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIHRlYW0gVG93biBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gVG93biBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24sXHJcbiAgICBpY29uOiB0aGlzLnRlYW1Ub3duQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgdmFyIHRlYW1Ub3duQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1Ub3duQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbVRvd25CYXNlT2JqZWN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBDcnVzaCBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgJiYgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgPSB7fTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gQ3J1c2ggQmFzZScsXHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgcG9zaXRpb246IHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbUNydXNoQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZU9iamVjdChsYXQsIGxuZykge1xyXG5cclxuICB2YXIgdGVhbUNydXNoQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1DcnVzaEJhc2VPYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRlYW1DcnVzaEJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJhbmRvbWx5UHV0SXRlbXMoKSB7XHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gZ2V0UmFuZG9tTG9jYXRpb25Gb3JJdGVtLmNhbGwodGhpcyk7XHJcbiAgdmFyIGl0ZW1JZCA9IGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMCwgMCk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ID0ge1xyXG4gICAgaWQ6IGl0ZW1JZCxcclxuICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogcmFuZG9tTG9jYXRpb24ubGF0KCksXHJcbiAgICAgIGxuZzogcmFuZG9tTG9jYXRpb24ubG5nKClcclxuICAgIH1cclxuICB9XHJcbiAgcHV0TmV3SXRlbU9uTWFwLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbiAgYnJvYWRjYXN0TmV3SXRlbS5jYWxsKHRoaXMsIHJhbmRvbUxvY2F0aW9uLCBpdGVtSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0oKSB7XHJcbiAgLy8gRmluZCBhIHJhbmRvbSBsb2NhdGlvbiB0aGF0IHdvcmtzLCBhbmQgaWYgaXQncyB0b28gY2xvc2VcclxuICAvLyB0byB0aGUgYmFzZSwgcGljayBhbm90aGVyIGxvY2F0aW9uXHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gbnVsbDtcclxuICB2YXIgY2VudGVyT2ZBcmVhTGF0ID0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLmxhdCgpO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMbmcgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubG5nKCk7XHJcbiAgd2hpbGUgKHRydWUpIHtcclxuICAgIHJhbmRvbUxhdCA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTGF0IC1cclxuICAgICAgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgY2VudGVyT2ZBcmVhTGF0ICsgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICByYW5kb21MbmcgPSBnZXRSYW5kb21JblJhbmdlKGNlbnRlck9mQXJlYUxuZyAtXHJcbiAgICAgICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMbmcgKyAodGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIHB1dCBpdGVtIGF0OiAnICsgcmFuZG9tTGF0ICsgJywnICsgcmFuZG9tTG5nKTtcclxuICAgIHJhbmRvbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhyYW5kb21MYXQsIHJhbmRvbUxuZyk7XHJcbiAgICBpZiAoZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4ocmFuZG9tTG9jYXRpb24sIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikgPiB0aGlzLm1pbkl0ZW1EaXN0YW5jZUZyb21CYXNlKSB7XHJcbiAgICAgIHJldHVybiByYW5kb21Mb2NhdGlvbjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdpdGVtIHRvbyBjbG9zZSB0byBiYXNlLCBjaG9vc2luZyBhbm90aGVyIGxvY2F0aW9uLi4uJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwdXROZXdJdGVtT25NYXAobG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIC8vIGV2ZW50dWFsbHkgdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50IHRvIGNsZWFyIHRoaXMsIGJ1dCB3aGlsZVxyXG4gIC8vIHRoZXJlJ3MgYSBidWcgb24gbXVsdGlwbGF5ZXIgam9pbmluZywgY2xlYXIgaXQgYWdhaW5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcblxyXG4gIC8vIHNldCB0aGUgYmFzZSBpY29uIGltYWdlcyB0byBiZSB0aGUgbGlnaHRlciBvbmVzXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG5cclxuICAvLyBpbiBjYXNlIHRoZXJlJ3MgYSBsaW5nZXJpbmcgaXRlbSwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMuaXRlbU1hcE9iamVjdCAmJiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIubWFwKSB7XHJcbiAgICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHZhciBpdGVtTWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgdGl0bGU6ICdJdGVtJyxcclxuICAgIGljb246IHRoaXMuaXRlbUljb24sXHJcbiAgICAvLyAvL1RPRE86IEZJWCBTVFVQSUQgR09PR0xFIE1BUFMgQlVHIHRoYXQgY2F1c2VzIHRoZSBnaWYgbWFya2VyXHJcbiAgICAvLyAvL3RvIG15c3RlcmlvdXNseSBub3Qgc2hvdyB1cCBzb21ldGltZXNcclxuICAgIC8vIG9wdGltaXplZDogZmFsc2UsXHJcbiAgICBwb3NpdGlvbjogbG9jYXRpb25cclxuICB9KTtcclxuXHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0ID0ge1xyXG4gICAgbWFya2VyOiBpdGVtTWFya2VyLFxyXG4gICAgbG9jYXRpb246IGxvY2F0aW9uXHJcbiAgfTtcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICB9O1xyXG5cclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIGxvY2F0aW9uLCAnYXJyb3cucG5nJyk7XHJcbiAgcmV0dXJuIGl0ZW1JZDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlQm9vc3RpbmcoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX05PUk1BTF9TUEVFRDtcclxuICBpZiAoJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgfHwgJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgPT0gMCkge1xyXG4gICAgdmFyIGJvb3N0QmFyVmFsdWUgPSAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKTtcclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPiAwKSB7XHJcbiAgICAgIGJvb3N0QmFyVmFsdWUgLT0gdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFO1xyXG4gICAgICAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiLCBib29zdEJhclZhbHVlKTtcclxuICAgICAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX0JPT1NUX1NQRUVEO1xyXG4gICAgICB0aGlzLnNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5zcGVlZCkgPiB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLnNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSB0aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAqPSB0aGlzLkJPT1NUX0ZBQ1RPUjtcclxuICAgICAgaWYgKE1hdGguYWJzKHRoaXMuaG9yaXpvbnRhbFNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IC10aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jdHJsRG93biAmJiBib29zdEJhclZhbHVlIDw9IDApIHtcclxuICAgICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI2Jvb3N0LWJhcicpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm1heFNwZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlQ2FyKCkge1xyXG4gIHRoaXMubWF4U3BlZWQgPSBoYW5kbGVCb29zdGluZy5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBpZiBVcCBvciBEb3duIGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIHNwZWVkLiBPdGhlcndpc2UsXHJcbiAgLy8gZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy51cERvd24gfHwgdGhpcy5kb3duRG93bikge1xyXG4gICAgaWYgKHRoaXMudXBEb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkICs9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmRvd25Eb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5zcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgLy8gaWYgTGVmdCBvciBSaWdodCBrZXkgaXMgcHJlc3NlZCwgY2hhbmdlIHRoZSBob3Jpem9udGFsIHNwZWVkLlxyXG4gIC8vIE90aGVyd2lzZSwgZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy5sZWZ0RG93biB8fCB0aGlzLnJpZ2h0RG93bikge1xyXG4gICAgaWYgKHRoaXMucmlnaHREb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8PSB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubGVmdERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLT0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy51cERvd24gJiYgIXRoaXMuZG93bkRvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMuTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmIChzcGVlZCA+IC0wLjAxICYmIHNwZWVkIDwgMC4wMSkge1xyXG4gICAgICBzcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzcGVlZCAvPSBkZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoKCFsZWZ0RG93biAmJiAhcmlnaHREb3duKSB8fCAoIWN0cmxEb3duICYmIE1hdGguYWJzKGhvcml6b250YWxTcGVlZCkgPiBNQVhfTk9STUFMX1NQRUVEKSkge1xyXG4gICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkID4gLTAuMDEgJiYgdGhpcy5ob3Jpem9udGFsU3BlZWQgPCAwLjAxKSB7XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkIC89IHRoaXMuZGVjZWxlcmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gb3B0aW1pemF0aW9uIC0gb25seSBpZiB0aGUgY2FyIGlzIG1vdmluZyBzaG91bGQgd2Ugc3BlbmRcclxuICAvLyB0aW1lIHJlc2V0dGluZyB0aGUgbWFwXHJcbiAgaWYgKHRoaXMuc3BlZWQgIT0gMCB8fCB0aGlzLmhvcml6b250YWxTcGVlZCAhPSAwKSB7XHJcbiAgICB2YXIgbmV3TGF0ID0gdGhpcy5tYXAuZ2V0Q2VudGVyKCkubGF0KCkgKyAodGhpcy5zcGVlZCAvIHRoaXMubGF0aXR1ZGVTcGVlZEZhY3Rvcik7XHJcbiAgICB2YXIgbmV3TG5nID0gdGhpcy5tYXAuZ2V0Q2VudGVyKCkubG5nKCkgKyAodGhpcy5ob3Jpem9udGFsU3BlZWQgLyB0aGlzLmxvbmdpdHVkZVNwZWVkRmFjdG9yKTtcclxuICAgIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhuZXdMYXQsIG5ld0xuZyk7XHJcbiAgICB0aGlzLm1hcC5zZXRDZW50ZXIodGhpcy5tYXBDZW50ZXIpO1xyXG5cclxuICB9XHJcblxyXG4gIHJvdGF0ZUNhci5jYWxsKHRoaXMpO1xyXG4gIGlmICh0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgcm90YXRlQXJyb3cuY2FsbCh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3RUb1BlZXIob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBjb25uZWN0IHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgdmFyIHBlZXJKc0Nvbm5lY3Rpb24gPSB0aGlzLnBlZXIuY29ubmVjdChvdGhlclVzZXJQZWVySWQpO1xyXG4gIHBlZXJKc0Nvbm5lY3Rpb24ub24oJ29wZW4nLCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIG9wZW4nKTtcclxuICAgIGNvbm5lY3RlZFRvUGVlci5jYWxsKHRoaXMsIHBlZXJKc0Nvbm5lY3Rpb24pO1xyXG4gIH0pO1xyXG4gIHBlZXJKc0Nvbm5lY3Rpb24ub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlBFRVJKUyBFUlJPUjogXCIpO1xyXG4gICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgIHRocm93IFwiUGVlckpTIGNvbm5lY3Rpb24gZXJyb3JcIjtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdGVkVG9QZWVyKHBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICB2YXIgb3RoZXJVc2VyUGVlcklkID0gcGVlckpzQ29ubmVjdGlvbi5wZWVyO1xyXG4gIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCdjb25uZWN0ZWQgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgd2UndmUgY29ubmVjdGVkIHRvIHRoaXMgdWVzcixcclxuICAvLyBhZGQgdGhlIEhUTUwgZm9yIHRoZSBuZXcgdXNlclxyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gfHwgIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIGluaXRpYWxpemVQZWVyQ29ubmVjdGlvbi5jYWxsKHRoaXMsIHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgICBhc3NpZ25Vc2VyVG9UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGNyZWF0ZU90aGVyVXNlckNhci5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlT3RoZXJVc2VyQ2FyKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJJZCA9IG90aGVyVXNlclBlZXJJZDtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5jYXIgPSB7fTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduVXNlclRvVGVhbShvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBpZiB0aGUgdXNlciBpcyBhbHJlYWR5IG9uIGEgdGVhbSwgaWdub3JlIHRoaXNcclxuICBpZiAoaXNVc2VyT25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzKSB8fFxyXG4gICAgaXNVc2VyT25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2VycykpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB1c2VyT2JqZWN0ID0ge1xyXG4gICAgcGVlcklkOiBvdGhlclVzZXJQZWVySWQsXHJcbiAgICB1c2VybmFtZTogbnVsbFxyXG4gIH07XHJcbiAgLy8gZm9yIG5vdywganVzdCBhbHRlcm5hdGUgd2hvIGdvZXMgb24gZWFjaCB0ZWFtXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoID4gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoKSB7XHJcbiAgICBhY3RpdmF0ZVRlYW1DcnVzaEluVUkuY2FsbCh0aGlzKTtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLnB1c2godXNlck9iamVjdCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVXNlck9uVGVhbShwZWVySWQsIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJPYmplY3RzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh1c2VyT2JqZWN0c0FycmF5W2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduTXlUZWFtSW5VSSgpIHtcclxuICBpZiAodXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpIHtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd5ZWxsb3cnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnY29sb3InLCAnYmxhY2snKTtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3JlZCcpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyM2NjYnKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVQZWVyQ29ubmVjdGlvbihwZWVySnNDb25uZWN0aW9uLCBvdGhlclVzZXJQZWVySWQpIHtcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdKSB7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSA9IHt9O1xyXG4gIH1cclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uID0gcGVlckpzQ29ubmVjdGlvbjtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLm9uKCdjbG9zZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nsb3NpbmcgY29ubmVjdGlvbicpO1xyXG4gICAgb3RoZXJVc2VyRGlzY29ubmVjdGVkLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9KTtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZGF0YVJlY2VpdmVkLmNhbGwodGhpcywgZGF0YSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZhZGVBcnJvd1RvSW1hZ2UoaW1hZ2VGaWxlTmFtZSkge1xyXG4gICQoXCIjYXJyb3ctaW1nXCIpLmF0dHIoJ3NyYycsICdpbWFnZXMvJyArIGltYWdlRmlsZU5hbWUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJEaXNjb25uZWN0ZWQob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gc2hvdWxkIGJlIGNhbGxlZCBhZnRlciB0aGUgcGVlckpzIGNvbm5lY3Rpb25cclxuICAvLyBoYXMgYWxyZWFkeSBiZWVuIGNsb3NlZFxyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHJlbW92ZVVzZXJGcm9tVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcmVtb3ZlVXNlckZyb21VSS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIC8vIHJlbW92ZSB0aGlzIHVzZXIgZnJvbSB0aGUgZ2FtZSBpbiBGaXJlYmFzZTpcclxuICBtYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbUdhbWUoZ2FtZUlkLCBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICBpZiAodGhpcy5ob3N0UGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgLy8gaWYgdGhhdCB1c2VyIHdhcyB0aGUgaG9zdCwgc2V0IHVzIGFzIHRoZSBuZXcgaG9zdFxyXG4gICAgdGhpcy5ob3N0UGVlcklkID0gdGhpcy5wZWVyLmlkO1xyXG4gICAgc3dpdGNoVG9OZXdIb3N0LmNhbGwodGhpcywgdGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciB3aG8gZGlzY29ubmVjdGVkIGN1cnJlbnRseSBoYWQgYW4gaXRlbSxcclxuICAvLyBwdXQgb3V0IGEgbmV3IG9uZVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IG90aGVyVXNlclBlZXJJZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG5cclxuICAvLyBkZWxldGUgdGhhdCB1c2VyJ3MgZGF0YVxyXG4gIGRlbGV0ZSB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXTtcclxuXHJcbiAgLy8gaWYgdGhlcmUgYW55IHVzZXJzIGxlZnQsIGJyb2FkY2FzdCB0aGVtIHRoZSBuZXcgZ2FtZSBzdGF0ZVxyXG4gIGlmIChPYmplY3Qua2V5cyh0aGlzLm90aGVyVXNlcnMpLmxlbmd0aCA+IDApIHtcclxuICAgIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMuY2FsbCh0aGlzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd3YWl0aW5nIGZvciBhIHNtdWdnbGVyIHRvIGJhdHRsZS4uLicpO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tVGVhbSh1c2VyUGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSB1c2VyUGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMuc3BsaWNlKGksIDEpO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBqID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gdXNlclBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5zcGxpY2UoaiwgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVc2VyRnJvbVVJKHBlZXJJZCkge1xyXG4gIC8vIHJlbW92ZSB0aGUgb3RoZXIgdXNlcidzIGNhciBmcm9tIHRoZSBtYXBcclxuICB0aGlzLm90aGVyVXNlcnNbcGVlcklkXS5jYXIubWFya2VyLnNldE1hcChudWxsKTtcclxuXHJcbiAgLy8gaWYgdGhlaXIgdGVhbSBoYXMgbm8gbW9yZSB1c2VycywgZ3JleSBvdXRcclxuICAvLyB0aGVpciBzY29yZSBib3hcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ29wYWNpdHknLCAnMC4zJyk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbihsYXQsIGxuZykge1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBicm9hZGNhc3RHYW1lU3RhdGUuY2FsbCh0aGlzLCB1c2VyKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRhdGFSZWNlaXZlZChkYXRhKSB7XHJcbiAgaWYgKGRhdGEucGVlcklkKSB7XHJcbiAgICAvLyBpZiB3ZSBhcmUgdGhlIGhvc3QsIGFuZCB0aGUgdXNlciB3aG8gc2VudCB0aGlzIGRhdGEgaGFzbid0IGJlZW4gZ2l2ZW4gdGhlIGluaXRpYWwgZ2FtZVxyXG4gICAgLy8gc3RhdGUsIHRoZW4gYnJvYWRjYXN0IGl0IHRvIHRoZW1cclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdICYmICF0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCAmJiBob3N0UGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5oYXNCZWVuSW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAvLyBub3Qgc3VyZSBpZiB3ZSBzaG91bGQgZG8gdGhpcyBvciBub3QsIGJ1dCBhdCBsZWFzdCBpdCByZXNldHMgdGhlIGdhbWVcclxuICAgICAgLy8gc3RhdGUgdG8gd2hhdCB3ZSwgdGhlIGhvc3QsIHRoaW5rIGl0IGlzXHJcbiAgICAgIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMoKTtcclxuICAgICAgLy8gaWYgbm90IHRoYXQsIHRoZW4gd2Ugc2hvdWxkIGp1c3QgYnJvYWRjYXN0IHRvIHRoZSBuZXcgZ3V5IGxpa2UgdGhpczpcclxuICAgICAgLy8gYnJvYWRjYXN0R2FtZVN0YXRlKGRhdGEucGVlcklkKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0ubGFzdFVwZGF0ZVRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGRhdGEuZXZlbnQpIHtcclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ3VwZGF0ZV9nYW1lX3N0YXRlJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IHVwZGF0ZSBnYW1lIHN0YXRlJyk7XHJcbiAgICAgIC8vIHdlIG9ubHkgd2FudCB0byByZWNlbnRlciB0aGUgbWFwIGluIHRoZSBjYXNlIHRoYXQgdGhpcyBpcyBhIG5ldyB1c2VyXHJcbiAgICAgIC8vIGpvaW5pbmcgZm9yIHRoZSBmaXJzdCB0aW1lLCBhbmQgdGhlIHdheSB0byB0ZWxsIHRoYXQgaXMgdG8gc2VlIGlmIHRoZVxyXG4gICAgICAvLyBpbml0aWFsIGxvY2F0aW9uIGhhcyBjaGFuZ2VkLiAgT25jZSB0aGUgdXNlciBpcyBhbHJlYWR5IGpvaW5lZCwgaWYgYVxyXG4gICAgICAvLyBsb2NhdGlvbiBjaGFuZ2UgaXMgaW5pdGlhdGVkLCB0aGF0IHdpbGwgdXNlIHRoZSAnbmV3X2xvY2F0aW9uJyBldmVudCBcclxuICAgICAgaWYgKHBhcnNlRmxvYXQoZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0KSAhPSBwYXJzZUZsb2F0KGdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpIHx8XHJcbiAgICAgICAgcGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpICE9IHBhcnNlRmxvYXQoZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpIHtcclxuICAgICAgICBtYXAuc2V0Q2VudGVyKG5ldyBnb29nbGUubWFwcy5MYXRMbmcoXHJcbiAgICAgICAgICBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQsXHJcbiAgICAgICAgICBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpKTtcclxuICAgICAgfVxyXG4gICAgICBnYW1lRGF0YU9iamVjdCA9IGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3Q7XHJcbiAgICAgIC8vIG5lZWQgdG8gbWFrZSB0aGlzIGNhbGwgYmVjYXVzZSB3ZSBjYW4gYmUgaW4gYSBzaXR1YXRpb24gd2hlcmUgdGhlIGhvc3RcclxuICAgICAgLy8gZG9lc24ndCBrbm93IG91ciB1c2VybmFtZSB5ZXQsIHNvIHdlIG5lZWQgdG8gbWFudWFsbHkgc2V0IGl0IGluIG91clxyXG4gICAgICAvLyBvd24gVUkgZmlyc3QuXHJcbiAgICAgIHVwZGF0ZVVzZXJuYW1lKHBlZXIuaWQsIHVzZXJuYW1lKTtcclxuICAgICAgdXBkYXRlVUlXaXRoTmV3R2FtZVN0YXRlKCk7XHJcbiAgICAgIGFzc2lnbk15VGVhbUJhc2UoKTtcclxuICAgICAgdXBkYXRlQ2FySWNvbnMoKTtcclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ25ld19sb2NhdGlvbicpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBuZXcgbG9jYXRpb24gJyArIGRhdGEuZXZlbnQubGF0ICsgJywnICsgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC5vcmlnaW5hdGluZ19wZWVyX2lkICE9IHBlZXIuaWQpIHtcclxuICAgICAgICBvdGhlclVzZXJDaGFuZ2VkTG9jYXRpb24oZGF0YS5ldmVudC5sYXQsIGRhdGEuZXZlbnQubG5nKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fY29sbGVjdGVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gY29sbGVjdGVkIGJ5ICcgKyBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSk7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSAhPSBwZWVyLmlkKSB7XHJcbiAgICAgICAgb3RoZXJVc2VyQ29sbGVjdGVkSXRlbShkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ25ld19pdGVtJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IG5ldyBpdGVtIGF0ICcgK1xyXG4gICAgICAgIGRhdGEuZXZlbnQubG9jYXRpb24ubGF0ICsgJywnICsgZGF0YS5ldmVudC5sb2NhdGlvbi5sbmcgK1xyXG4gICAgICAgICcgd2l0aCBpZCAnICsgZGF0YS5ldmVudC5pZCk7XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gICAgICAvLyBPbmx5IHVwZGF0ZSBpZiBzb21lb25lIGVsc2UgY2F1c2VkIHRoZSBuZXcgaXRlbSBwbGFjZW1lbnQuXHJcbiAgICAgIC8vIGlmIHRoaXMgdXNlciBkaWQgaXQsIGl0IHdhcyBhbHJlYWR5IHBsYWNlZFxyXG4gICAgICBpZiAoZGF0YS5ldmVudC5ob3N0X3VzZXIgJiYgZGF0YS5ldmVudC5ob3N0X3VzZXIgIT0gcGVlci5pZCkge1xyXG4gICAgICAgIHZhciBpdGVtTG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGEuZXZlbnQubG9jYXRpb24ubGF0LCBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyk7XHJcbiAgICAgICAgcHV0TmV3SXRlbU9uTWFwKGl0ZW1Mb2NhdGlvbiwgZGF0YS5ldmVudC5pZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX3JldHVybmVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gcmV0dXJuZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0gKyAnIHdoaWNoIGdpdmVzIHRoZW0gJyArIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0gIT0gcGVlci5pZCkge1xyXG4gICAgICAgIHRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gICAgICAgIHRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgb3RoZXJVc2VyUmV0dXJuZWRJdGVtKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtLCBkYXRhLmV2ZW50Lm5vd19udW1faXRlbXMpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX3RyYW5zZmVycmVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gJyArIGRhdGEuZXZlbnQuaWQgKyAnIHRyYW5zZmVycmVkIGJ5IHVzZXIgJyArIGRhdGEuZXZlbnQuZnJvbVVzZXJQZWVySWQgKyAnIHRvIHVzZXIgJyArIGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkKTtcclxuICAgICAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC50b1VzZXJQZWVySWQgPT0gcGVlci5pZCkge1xyXG4gICAgICAgIC8vIHRoZSBpdGVtIHdhcyB0cmFuc2ZlcnJlZCB0byB0aGlzIHVzZXJcclxuICAgICAgICBnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ID0ge1xyXG4gICAgICAgICAgaWQ6IGRhdGEuZXZlbnQuaWQsXHJcbiAgICAgICAgICBsb2NhdGlvbjogbnVsbFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGltZU9mTGFzdFRyYW5zZmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnc29tZW9uZSB0cmFuc2ZlcnJlZCBhdCAnICsgdGltZU9mTGFzdFRyYW5zZmVyKTtcclxuICAgICAgICB1c2VyQ29sbGlkZWRXaXRoSXRlbShnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBzZXQgdGhlIGFycm93IHRvIHBvaW50IHRvIHRoZSBuZXcgdXNlciB3aG8gaGFzIHRoZSBpdGVtXHJcbiAgICAgICAgZGVzdGluYXRpb24gPSB0aGlzLm90aGVyVXNlcnNbZGF0YS5ldmVudC50b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gaWYgdGhlIHVzZXIgc2VudCBhIHVzZXJuYW1lIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIHlldCwgc2V0IGl0XHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEudXNlcm5hbWUgJiYgIXRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0udXNlcm5hbWUpIHtcclxuICAgIHVwZGF0ZVVzZXJuYW1lKGRhdGEucGVlcklkLCBkYXRhLnVzZXJuYW1lKTtcclxuICB9XHJcblxyXG4gIGlmIChkYXRhLnBlZXJJZCAmJiBkYXRhLmNhckxhdExuZyAmJiB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdKSB7XHJcbiAgICBtb3ZlT3RoZXJDYXIodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSwgbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhkYXRhLmNhckxhdExuZy5sYXQsIGRhdGEuY2FyTGF0TG5nLmxuZykpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduTXlUZWFtQmFzZSgpIHtcclxuICBpZiAodXNlcklzT25Ub3duVGVhbShwZWVyLmlkKSkge1xyXG4gICAgbXlUZWFtQmFzZU1hcE9iamVjdCA9IHRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuICB9IGVsc2Uge1xyXG4gICAgbXlUZWFtQmFzZU1hcE9iamVjdCA9IHRlYW1DcnVzaEJhc2VNYXBPYmplY3Q7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVc2VybmFtZShwZWVySWQsIHVzZXJuYW1lKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0udXNlcm5hbWUgPSB1c2VybmFtZTtcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaiA9IDA7IGogPCBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0udXNlcm5hbWUgPSB1c2VybmFtZTtcclxuICAgIH1cclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVSVdpdGhOZXdHYW1lU3RhdGUoKSB7XHJcbiAgLy8gcmVjZW50ZXIgdGhlIG1hcFxyXG4gIGNvbnNvbGUubG9nKCduZXcgbG9jYXRpb24gcmVjZWl2ZWQ6ICcgKyBnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24pO1xyXG4gIG1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCwgZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZyk7XHJcbiAgdXBkYXRlQmFzZUxvY2F0aW9uc0luVUkoKTtcclxuICB1cGRhdGVVc2VybmFtZXNJblVJKCk7XHJcbiAgLy8gaWYgc29tZW9uZSBoYXMgdGhlIGl0ZW1cclxuICBpZiAoZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSkge1xyXG4gICAgaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gICAgLy8gaWYgSSBoYXZlIHRoZSBpdGVtLCBtYWtlIHRoZSBkZXN0aW5hdGlvbiBteSB0ZWFtJ3MgYmFzZVxyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gcGVlci5pZCkge1xyXG4gICAgICBzZXREZXN0aW5hdGlvbihteVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3dfYmx1ZS5wbmcnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGFub3RoZXIgdXNlciBoYXMgdGhlIGl0ZW0sIGJ1dCB0aGUgc2V0RGVzdGluYXRpb24gY2FsbFxyXG4gICAgICAvLyB3aWxsIGJlIHRha2VuIGNhcmUgb2Ygd2hlbiB0aGUgdXNlciBzZW5kcyB0aGVpciBsb2NhdGlvbiBkYXRhXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGlmIG5vYm9keSBoYXMgdGhlIGl0ZW0sIHB1dCBpdCBvbiB0aGUgbWFwIGluIHRoZSByaWdodCBwbGFjZSxcclxuICAgIC8vIGFuZCBzZXQgdGhlIG5ldyBpdGVtIGxvY2F0aW9uIGFzIHRoZSBkZXN0aW5hdGlvblxyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgJiYgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtb3ZlSXRlbU9uTWFwKGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubGF0LCBnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbihpdGVtTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3cucG5nJyk7XHJcbiAgfVxyXG4gIHVwZGF0ZVNjb3Jlc0luVUkoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCwgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGFzc2lnbk15VGVhbUluVUkoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQmFzZUxvY2F0aW9uc0luVUkoKSB7XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0KFxyXG4gICAgZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sYXQsXHJcbiAgICBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdChcclxuICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNhckljb25zKCkge1xyXG4gIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zKGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLCB0ZWFtVG93bk90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMoZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLCB0ZWFtQ3J1c2hPdGhlckNhckljb24pO1xyXG4gIHVwZGF0ZU15Q2FySWNvbigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVNeUNhckljb24oKSB7XHJcbiAgdmFyIHVzZXJDYXJJbWdTcmMgPSAnaW1hZ2VzL2NydXNoX2Nhci5wbmcnO1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtKHBlZXIuaWQpKSB7XHJcbiAgICB1c2VyQ2FySW1nU3JjID0gJ2ltYWdlcy9jYXIucG5nJztcclxuICB9XHJcbiAgJCgnI2Nhci1pbWcnKS5hdHRyKCdzcmMnLCB1c2VyQ2FySW1nU3JjKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnModGVhbVVzZXJzLCB0ZWFtQ2FySWNvbikge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGVhbVVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIG1hcmtlclxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXSAmJiB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyICYmIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyLnNldE1hcChudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGVhbVVzZXJzW2ldLnBlZXJJZCAhPSBwZWVyLmlkKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgICAgbWFwOiBtYXAsXHJcbiAgICAgICAgdGl0bGU6IHRlYW1Vc2Vyc1tpXS5wZWVySWQsXHJcbiAgICAgICAgaWNvbjogdGVhbUNhckljb25cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU2NvcmVzSW5VSSh0ZWFtVG93bk51bUl0ZW1zUmV0dXJuZWQsIHRlYW1DcnVzaE51bUl0ZW1zUmV0dXJuZWQpIHtcclxuICAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpLnRleHQodGVhbVRvd25OdW1JdGVtc1JldHVybmVkKTtcclxuICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpKTtcclxuICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRlYW1DcnVzaE51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZUl0ZW1Pbk1hcChsYXQsIGxuZykge1xyXG4gIGNvbnNvbGUubG9nKCdtb3ZpbmcgaXRlbSB0byBuZXcgbG9jYXRpb246ICcgKyBsYXQgKyAnLCcgKyBsbmcpO1xyXG4gIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubGF0ID0gbGF0O1xyXG4gIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubG5nID0gbG5nO1xyXG4gIGl0ZW1NYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICBpdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRQb3NpdGlvbihpdGVtTWFwT2JqZWN0LmxvY2F0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyUmV0dXJuZWRJdGVtKG90aGVyVXNlclBlZXJJZCwgbm93TnVtSXRlbXNGb3JVc2VyKSB7XHJcbiAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgaW5jcmVtZW50SXRlbUNvdW50KHVzZXJJc09uVG93blRlYW0ob3RoZXJVc2VyUGVlcklkKSlcclxuICBmYWRlQXJyb3dUb0ltYWdlKCdhcnJvdy5wbmcnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZU90aGVyQ2FyKG90aGVyVXNlck9iamVjdCwgbmV3TG9jYXRpb24pIHtcclxuICBpZiAoIW90aGVyVXNlck9iamVjdC5jYXIpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24gPSBuZXdMb2NhdGlvbjtcclxuICBpZiAoIW90aGVyVXNlck9iamVjdC5jYXIubWFya2VyKSB7XHJcbiAgICB1cGRhdGVDYXJJY29ucygpO1xyXG4gIH1cclxuICAvLyBpZiB0aGUgb3RoZXIgY2FyIGhhcyBhbiBpdGVtLCB1cGRhdGUgdGhlIGRlc3RpbmF0aW9uXHJcbiAgLy8gdG8gYmUgaXRcclxuICBpZiAoZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBvdGhlclVzZXJPYmplY3QucGVlcklkKSB7XHJcbiAgICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgICBpZiAodXNlcklzT25NeVRlYW0ob3RoZXJVc2VyT2JqZWN0LnBlZXJJZCkpIHtcclxuICAgICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gICAgfVxyXG4gICAgc2V0RGVzdGluYXRpb24obmV3TG9jYXRpb24sIGFycm93SW1nKTtcclxuICB9XHJcbiAgdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkKG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24sIG90aGVyVXNlck9iamVjdC5wZWVySWQpO1xyXG4gIG90aGVyVXNlck9iamVjdC5jYXIubWFya2VyLnNldFBvc2l0aW9uKG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VySXNPbk15VGVhbShvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgbXlUZWFtID0gbnVsbDtcclxuICB2YXIgb3RoZXJVc2VyVGVhbSA9IG51bGw7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVyLmlkKSB7XHJcbiAgICAgIG15VGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAgIG90aGVyVXNlclRlYW0gPSAndG93bic7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVyLmlkKSB7XHJcbiAgICAgIG15VGVhbSA9ICdjcnVzaCc7XHJcbiAgICB9XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgICAgb3RoZXJVc2VyVGVhbSA9ICdjcnVzaCc7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBteVRlYW0gPT0gb3RoZXJVc2VyVGVhbTtcclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkKG90aGVyQ2FyTG9jYXRpb24sIG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIGlmIHdlIGRvbid0IGtub3cgdGhlIG90aGVyIGNhcidzIGxvY2F0aW9uLCBvciBpZiB0aGlzIGlzbid0IHRoZSB1c2VyIHdpdGhcclxuICAvLyAgdGhlIGl0ZW0sIHRoZW4gaWdub3JlIGl0LiBXZSdsbCBvbmx5IHRyYW5zZmVyIGFuIGl0ZW0gZnJvbSB0aGUgcGVyc3BlY3RlZFxyXG4gIC8vICBvZiB0aGUgdXNlciB3aXRoIHRoZSBpdGVtXHJcbiAgaWYgKCFvdGhlckNhckxvY2F0aW9uIHx8ICFjb2xsZWN0ZWRJdGVtKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmICh0aW1lT2ZMYXN0VHJhbnNmZXIpIHtcclxuICAgIHZhciB0aW1lU2luY2VMYXN0VHJhbnNmZXIgPSAoKG5ldyBEYXRlKCkpLmdldFRpbWUoKSkgLSB0aW1lT2ZMYXN0VHJhbnNmZXI7XHJcbiAgICAvLyBpZiBub3QgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCBzaW5jZSB0aGUgbGFzdCB0cmFuc2ZlciwgcmV0dXJuXHJcbiAgICBpZiAodGltZVNpbmNlTGFzdFRyYW5zZmVyIDwgdGltZURlbGF5QmV0d2VlblRyYW5zZmVycykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBvcHRpbWl6YXRpb246IHJlc2V0IHRoaXMgc28gd2UgZG9uJ3Qgd2FzdGUgdGltZSBjYWxjdWxhdGluZyBpbiB0aGUgZnV0dXJlXHJcbiAgICAgIHRpbWVPZkxhc3RUcmFuc2ZlciA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgZGlzdGFuY2UgPSBnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2VlbihtYXBDZW50ZXIsIG90aGVyQ2FyTG9jYXRpb24pO1xyXG4gIC8vIGlmIHRoaXMgdXNlciAodGhhdCBoYXMgdGhlIGl0ZW0pIGlzIGNsb3NlIGVub3VnaCB0byBjYWxsIGl0IGFcclxuICAvLyBjb2xsaXNpb24sIHRyYW5zZmVyIGl0IHRvIHRoZSBvdGhlciB1c2VyXHJcbiAgaWYgKGRpc3RhbmNlIDwgMjApIHtcclxuICAgIHRyYW5zZmVySXRlbShjb2xsZWN0ZWRJdGVtLmlkLCBwZWVyLmlkLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNmZXJJdGVtKGl0ZW1PYmplY3RJZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdpdGVtICcgKyBpdGVtT2JqZWN0SWQgKyAnIHRyYW5zZmVycmVkIGZyb20gJyArIGZyb21Vc2VyUGVlcklkICsgJyB0byAnICsgdG9Vc2VyUGVlcklkKTtcclxuICB0aW1lT2ZMYXN0VHJhbnNmZXIgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIGJyb2FkY2FzdFRyYW5zZmVyT2ZJdGVtKGl0ZW1PYmplY3RJZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCwgdGltZU9mTGFzdFRyYW5zZmVyKTtcclxuICBjb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdG9Vc2VyUGVlcklkO1xyXG4gIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICBpZiAodXNlcklzT25NeVRlYW0odG9Vc2VyUGVlcklkKSkge1xyXG4gICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gIH1cclxuICBzZXREZXN0aW5hdGlvbih0aGlzLm90aGVyVXNlcnNbdG9Vc2VyUGVlcklkXS5jYXIubG9jYXRpb24sIGFycm93SW1nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyQ29sbGVjdGVkSXRlbSh1c2VySWQpIHtcclxuICBjb25zb2xlLmxvZygnb3RoZXIgdXNlciBjb2xsZWN0ZWQgaXRlbScpO1xyXG4gIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB1c2VySWQ7XHJcbiAgaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICBpZiAodXNlcklzT25NeVRlYW0odXNlcklkKSkge1xyXG4gICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gIH1cclxuICBmYWRlQXJyb3dUb0ltYWdlKGFycm93SW1nKTtcclxuICB0ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbVRvd25CYXNlSWNvbik7XHJcbiAgdGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtQ3J1c2hCYXNlSWNvbik7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VyUmV0dXJuZWRJdGVtVG9CYXNlKCkge1xyXG4gIGNvbnNvbGUubG9nKCd1c2VyIHJldHVybmVkIGl0ZW0gdG8gYmFzZScpO1xyXG4gIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gIGZhZGVBcnJvd1RvSW1hZ2UoJ2Fycm93LnBuZycpO1xyXG4gIGluY3JlbWVudEl0ZW1Db3VudCh1c2VySXNPblRvd25UZWFtKHBlZXIuaWQpKTtcclxuICBjb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICB0ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICB0ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VySXNPblRvd25UZWFtKHBlZXJJZCkge1xyXG4gIGZvciAodmFyIGkgPSBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluY3JlbWVudEl0ZW1Db3VudChpc1RlYW1Ub3duKSB7XHJcbiAgaWYgKGlzVGVhbVRvd24pIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCsrO1xyXG4gICAgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKS50ZXh0KHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCsrO1xyXG4gICAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZsYXNoRWxlbWVudChqcXVlcnlFbGVtKSB7XHJcbiAganF1ZXJ5RWxlbS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlckNvbGxpZGVkV2l0aEl0ZW0oY29sbGlzaW9uSXRlbU9iamVjdCkge1xyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IGNvbGxpc2lvbkl0ZW1PYmplY3Q7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgY29sbGlzaW9uSXRlbU9iamVjdC5sb2NhdGlvbiA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gcGVlci5pZDtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZUljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VJY29uKTtcclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93X2JsdWUucG5nJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldERlc3RpbmF0aW9uKGxvY2F0aW9uLCBhcnJvd0ltYWdlTmFtZSkge1xyXG4gIHRoaXMuZGVzdGluYXRpb24gPSBsb2NhdGlvbjtcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgYXJyb3dJbWFnZU5hbWUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGVDYXIoKSB7XHJcbiAgdGhpcy5yb3RhdGlvbiA9IGdldEFuZ2xlLmNhbGwodGhpcywgc3BlZWQsIGhvcml6b250YWxTcGVlZCk7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICctbXMtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsgLyogSUUgOSAqLyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7IC8qIENocm9tZSwgU2FmYXJpLCBPcGVyYSAqLyB0cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvdGF0ZUFycm93KCkge1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbiA9IGNvbXB1dGVCZWFyaW5nQW5nbGUuY2FsbCh0aGlzLCB0aGlzLm1hcENlbnRlci5sYXQoKSwgdGhpcy5tYXBDZW50ZXIubG5nKCksIHRoaXMuZGVzdGluYXRpb24ubGF0KCksIHRoaXMuZGVzdGluYXRpb24ubG5nKCkpO1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyA9ICctbXMtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyAvKiBJRSA5ICovIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyAvKiBDaHJvbWUsIFNhZmFyaSwgT3BlcmEgKi8gdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZShzdGVwKSB7XHJcbiAgbW92ZUNhci5jYWxsKHRoaXMpO1xyXG5cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdCAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0pIHtcclxuICAgIC8vIGNoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gb25lIGNhciB3aXRoIGFuIGl0ZW0gYW5kIG9uZSB3aXRob3V0XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAvLyBpZiB0aGlzIHVzZXIgaGFzIGFuIGl0ZW0sIGNoZWNrIHRvIHNlZSBpZiB0aGV5IGFyZSBjb2xsaWRpbmdcclxuICAgICAgLy8gd2l0aCBhbnkgb3RoZXIgdXNlciwgYW5kIGlmIHNvLCB0cmFuc2ZlciB0aGUgaXRlbVxyXG4gICAgICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgICAgIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZC5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5jYXIubG9jYXRpb24sIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySWQpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBpZiBhbm90aGVyIHVzZXIgaGFzIGFuIGl0ZW0sIGFuZCB0aGVpciBjYXIgaGFzIGEgbG9jYXRpb24sXHJcbiAgICAgIC8vIHRoZW4gY29uc3RhbnRseSBzZXQgdGhlIGRlc3RpbmF0aW9uIHRvIHRoZWlyIGxvY2F0aW9uXHJcbiAgICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXSAmJiB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5sb2NhdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5jYXIubG9jYXRpb24pIHtcclxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjaGVjayBpZiB1c2VyIGNvbGxpZGVkIHdpdGggYW4gaXRlbSBvciB0aGUgYmFzZVxyXG4gIHZhciBjb2xsaXNpb25NYXJrZXIgPSBnZXRDb2xsaXNpb25NYXJrZXIoKTtcclxuICBpZiAoY29sbGlzaW9uTWFya2VyKSB7XHJcbiAgICBpZiAoIWNvbGxlY3RlZEl0ZW0gJiYgY29sbGlzaW9uTWFya2VyID09IGl0ZW1NYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICAgIC8vIHVzZXIganVzdCBwaWNrZWQgdXAgYW4gaXRlbVxyXG4gICAgICB1c2VyQ29sbGlkZWRXaXRoSXRlbSh0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QpO1xyXG4gICAgICBicm9hZGNhc3RJdGVtQ29sbGVjdGVkKHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5pZCk7XHJcbiAgICB9IGVsc2UgaWYgKGNvbGxlY3RlZEl0ZW0gJiYgY29sbGlzaW9uTWFya2VyID09IG15VGVhbUJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICAgIC8vIHVzZXIgaGFzIGFuIGl0ZW0gYW5kIGlzIGJhY2sgYXQgdGhlIGJhc2VcclxuICAgICAgdXNlclJldHVybmVkSXRlbVRvQmFzZSgpO1xyXG4gICAgICBicm9hZGNhc3RJdGVtUmV0dXJuZWQocGVlci5pZCk7XHJcbiAgICAgIHJhbmRvbWx5UHV0SXRlbXMoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24oKTtcclxuXHJcbiAgLy8gaWYgdGhlIGdhbWUgaGFzIHN0YXJ0ZWQgYW5kIHdlJ3JlIHRoZSBob3N0LCBjaGVja1xyXG4gIC8vIGZvciBhbnkgcGVlcnMgd2hvIGhhdmVuJ3Qgc2VudCBhbiB1cGRhdGUgaW4gdG9vIGxvbmdcclxuICBpZiAoaG9zdFBlZXJJZCAmJiBwZWVyICYmIHBlZXIuaWQgJiYgaG9zdFBlZXJJZCA9PSBwZWVyLmlkKSB7XHJcbiAgICBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG91bGRLZWVwQWxpdmUoKSB7XHJcbiAgcmV0dXJuIHFzLnZhbHVlKGtlZXBBbGl2ZVBhcmFtTmFtZSkgPT0gJ3RydWUnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zKCkge1xyXG4gIGlmIChzaG91bGRLZWVwQWxpdmUoKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRpbWVOb3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gb3RoZXJVc2Vycykge1xyXG4gICAgLy8gaWYgaXQncyBiZWVuIGxvbmdlciB0aGFuIHRoZSB0aW1lb3V0IHNpbmNlIHdlJ3ZlIGhlYXJkIGZyb21cclxuICAgIC8vIHRoaXMgdXNlciwgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgZ2FtZVxyXG4gICAgaWYgKG90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgJiYgKHRpbWVOb3cgLSBvdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lID4gQUNUSVZFX0NPTk5FQ1RJT05fVElNRU9VVF9JTl9TRUNPTkRTKSkge1xyXG4gICAgICBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24odXNlcik7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgaWYgKG90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSAmJiBvdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgb3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uY2xvc2UoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihkdCkge1xyXG4gICQoXCIjY2FyLWltZ1wiKS5hdHRyKFwic3R5bGVcIiwgdGhpcy5yb3RhdGlvbkNzcyk7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24oKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiBvdGhlclVzZXJzKSB7XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gJiYgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3BlbiAmJiBtYXBDZW50ZXIpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgICAgY2FyTGF0TG5nOiB7XHJcbiAgICAgICAgICBsYXQ6IG1hcENlbnRlci5sYXQoKSxcclxuICAgICAgICAgIGxuZzogbWFwQ2VudGVyLmxuZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwZWVySWQ6IHBlZXIuaWQsXHJcbiAgICAgICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgZ2FtZSBzdGF0ZSB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdIHx8ICF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdXBkYXRlR2FtZVN0YXRlRXZlbnRPYmplY3QgPSB7XHJcbiAgICBldmVudDoge1xyXG4gICAgICBuYW1lOiAndXBkYXRlX2dhbWVfc3RhdGUnLFxyXG4gICAgICBnYW1lRGF0YU9iamVjdDogdGhpcy5nYW1lRGF0YVxyXG4gICAgfVxyXG4gIH07XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3SXRlbShsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHZhciBzaW1wbGVJdGVtTGF0TG5nID0ge1xyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgICAgZXZlbnQ6IHtcclxuICAgICAgICAgIG5hbWU6ICduZXdfaXRlbScsXHJcbiAgICAgICAgICBob3N0X3VzZXI6IHBlZXIuaWQsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBsYXQ6IHNpbXBsZUl0ZW1MYXRMbmcubGF0LFxyXG4gICAgICAgICAgICBsbmc6IHNpbXBsZUl0ZW1MYXRMbmcubG5nXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgaWQ6IGl0ZW1JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtUmV0dXJuZWQoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSByZXR1cm5lZCcpO1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9yZXR1cm5lZCcsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtOiBwZWVyLmlkLFxyXG4gICAgICAgIG5vd19udW1faXRlbXM6IHRoaXMuZ2FtZURhdGEudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCxcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtQ29sbGVjdGVkKGl0ZW1JZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSBpZCAnICsgaXRlbUlkICsgJyBjb2xsZWN0ZWQgYnkgdXNlciAnICsgcGVlci5pZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5nYW1lRGF0YS5wZWVySWRPZkNhcldpdGhJdGVtID0gcGVlci5pZDtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX2NvbGxlY3RlZCcsXHJcbiAgICAgICAgaWQ6IGl0ZW1JZCxcclxuICAgICAgICB1c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW06IHRoaXMuZ2FtZURhdGEucGVlcklkT2ZDYXJXaXRoSXRlbVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdFRyYW5zZmVyT2ZJdGVtKGl0ZW1JZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSB0cmFuc2ZlcnJlZCAnICsgaXRlbUlkICsgJyBmcm9tICcgKyBmcm9tVXNlclBlZXJJZCArICcgdG8gJyArIHRvVXNlclBlZXJJZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fdHJhbnNmZXJyZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgZnJvbVVzZXJQZWVySWQ6IGZyb21Vc2VyUGVlcklkLFxyXG4gICAgICAgIHRvVXNlclBlZXJJZDogdG9Vc2VyUGVlcklkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3TG9jYXRpb24obG9jYXRpb24pIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIG5ldyBsb2NhdGlvbjogJyArIGxvY2F0aW9uLmxhdCgpICsgJywnICsgbG9jYXRpb24ubG5nKCkpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICduZXdfbG9jYXRpb24nLFxyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKSxcclxuICAgICAgICBvcmlnaW5hdGluZ19wZWVyX2lkOiBwZWVyLmlkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuLy8gY2hlY2tzIHRvIHNlZSBpZiB0aGV5IGhhdmUgY29sbGlkZWQgd2l0aCBlaXRoZXIgYW4gaXRlbSBvciB0aGUgYmFzZVxyXG5mdW5jdGlvbiBnZXRDb2xsaXNpb25NYXJrZXIoKSB7XHJcbiAgLy8gY29tcHV0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiBteSBjYXIgYW5kIHRoZSBkZXN0aW5hdGlvblxyXG4gIGlmIChkZXN0aW5hdGlvbikge1xyXG4gICAgdmFyIG1heERpc3RhbmNlQWxsb3dlZCA9IGNhclRvSXRlbUNvbGxpc2lvbkRpc3RhbmNlO1xyXG4gICAgdmFyIGRpc3RhbmNlID0gZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4obWFwQ2VudGVyLCBkZXN0aW5hdGlvbik7XHJcbiAgICAvLyBUaGUgYmFzZSBpcyBiaWdnZXIsIHNvIGJlIG1vcmUgbGVuaWVudCB3aGVuIGNoZWNraW5nIGZvciBhIGJhc2UgY29sbGlzaW9uXHJcbiAgICBpZiAoZGVzdGluYXRpb24gPT0gbXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtYXhEaXN0YW5jZUFsbG93ZWQgPSBjYXJUb0Jhc2VDb2xsaXNpb25EaXN0YW5jZTtcclxuICAgIH1cclxuICAgIGlmIChkaXN0YW5jZSA8IG1heERpc3RhbmNlQWxsb3dlZCkge1xyXG4gICAgICBpZiAoZGVzdGluYXRpb24gPT0gaXRlbU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyBwZWVyLmlkICsgJyBjb2xsaWRlZCB3aXRoIGl0ZW0nKTtcclxuICAgICAgICByZXR1cm4gaXRlbU1hcE9iamVjdC5tYXJrZXI7XHJcbiAgICAgIH0gZWxzZSBpZiAoZGVzdGluYXRpb24gPT0gbXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGlmIChjb2xsZWN0ZWRJdGVtKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygndXNlciAnICsgcGVlci5pZCArICcgaGFzIGFuIGl0ZW0gYW5kIGNvbGxpZGVkIHdpdGggYmFzZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbXlUZWFtQmFzZU1hcE9iamVjdC5tYXJrZXI7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEdhbWVUb05ld0xvY2F0aW9uKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YS5pbml0aWFsTG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuICBjcmVhdGVUZWFtVG93bkJhc2UobGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2UoKHBhcnNlRmxvYXQobGF0KSArIDAuMDA2KS50b1N0cmluZygpLCAocGFyc2VGbG9hdChsbmcpICsgMC4wMDgpLnRvU3RyaW5nKCkpO1xyXG4gIGFzc2lnbk15VGVhbUJhc2UoKTtcclxuICBtYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICBtYXAuc2V0Q2VudGVyKG1hcENlbnRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFuZ2xlKHZ4LCB2eSkge1xyXG4gIHJldHVybiAoTWF0aC5hdGFuMih2eSwgdngpKSAqICgxODAgLyBNYXRoLlBJKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29tcHV0ZUJlYXJpbmdBbmdsZShsYXQxLCBsb24xLCBsYXQyLCBsb24yKSB7XHJcbiAgdmFyIFIgPSA2MzcxOyAvLyBrbVxyXG4gIHZhciBkTGF0ID0gKGxhdDIgLSBsYXQxKS50b1JhZCgpO1xyXG4gIHZhciBkTG9uID0gKGxvbjIgLSBsb24xKS50b1JhZCgpO1xyXG4gIHZhciBsYXQxID0gbGF0MS50b1JhZCgpO1xyXG4gIHZhciBsYXQyID0gbGF0Mi50b1JhZCgpO1xyXG5cclxuICB2YXIgYW5nbGVJblJhZGlhbnMgPSBNYXRoLmF0YW4yKE1hdGguc2luKGRMb24pICogTWF0aC5jb3MobGF0MiksXHJcbiAgICBNYXRoLmNvcyhsYXQxKSAqIE1hdGguc2luKGxhdDIpIC0gTWF0aC5zaW4obGF0MSkgKiBNYXRoLmNvcyhsYXQyKSAqIE1hdGguY29zKGRMb24pKTtcclxuICByZXR1cm4gYW5nbGVJblJhZGlhbnMudG9EZWcoKTtcclxufVxyXG5cclxuLy8ga2V5IGV2ZW50c1xyXG5mdW5jdGlvbiBvbktleURvd24oZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICByaWdodERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzcpIHtcclxuICAgIGxlZnREb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM4KSB7XHJcbiAgICB1cERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIGRvd25Eb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDE3KSB7XHJcbiAgICBjdHJsRG93biA9IHRydWU7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBvbktleVVwKGV2dCkge1xyXG4gIGlmIChldnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgcmlnaHREb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgbGVmdERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM4KSB7XHJcbiAgICB1cERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDQwKSB7XHJcbiAgICBkb3duRG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMTcpIHtcclxuICAgIGN0cmxEb3duID0gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBnYW1lIGxvb3AgaGVscGVyc1xyXG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XHJcbiAgcmV0dXJuIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZyYW1lKCkge1xyXG4gIHRoaXMubm93ID0gdGltZXN0YW1wLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5kdCA9IHRoaXMuZHQgKyBNYXRoLm1pbigxLCAodGhpcy5ub3cgLSB0aGlzLmxhc3QpIC8gMTAwMCk7XHJcbiAgd2hpbGUgKHRoaXMuZHQgPiB0aGlzLnN0ZXApIHtcclxuICAgIHRoaXMuZHQgPSB0aGlzLmR0IC0gdGhpcy5zdGVwO1xyXG4gICAgdXBkYXRlLmNhbGwodGhpcywgdGhpcy5zdGVwKTtcclxuICB9XHJcbiAgcmVuZGVyLmNhbGwodGhpcywgdGhpcy5kdCk7XHJcbiAgdGhpcy5sYXN0ID0gdGhpcy5ub3c7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lLmNhbGwodGhpcywgZnJhbWUpO1xyXG59XHJcblxyXG4vLyBkb24ndCB0aGluayB3ZSdsbCBuZWVkIHRvIGdvIHRvIHRoZSB1c2VyJ3MgbG9jYXRpb24sIGJ1dCBtaWdodCBiZSB1c2VmdWxcclxuZnVuY3Rpb24gdHJ5RmluZGluZ0xvY2F0aW9uKCkge1xyXG4gIC8vIFRyeSBIVE1MNSBnZW9sb2NhdGlvblxyXG4gIGlmIChuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcclxuICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuICAgICAgdmFyIHBvcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcocG9zaXRpb24uY29vcmRzLmxhdGl0dWRlLFxyXG4gICAgICAgIHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGUpO1xyXG4gICAgICBtYXAuc2V0Q2VudGVyKHBvcyk7XHJcbiAgICAgIG1hcENlbnRlciA9IHBvcztcclxuICAgIH0sIGZ1bmN0aW9uKCkge1xyXG4gICAgICBoYW5kbGVOb0dlb2xvY2F0aW9uKHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IEdlb2xvY2F0aW9uXHJcbiAgICBoYW5kbGVOb0dlb2xvY2F0aW9uKGZhbHNlKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU5vR2VvbG9jYXRpb24oZXJyb3JGbGFnKSB7XHJcbiAgaWYgKGVycm9yRmxhZykge1xyXG4gICAgdmFyIGNvbnRlbnQgPSAnRXJyb3I6IFRoZSBHZW9sb2NhdGlvbiBzZXJ2aWNlIGZhaWxlZC4nO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgY29udGVudCA9ICdFcnJvcjogWW91ciBicm93c2VyIGRvZXNuXFwndCBzdXBwb3J0IGdlb2xvY2F0aW9uLic7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBUaGlzIGNhbiBiZSByZW1vdmVkLCBzaW5jZSBpdCBjYXVzZXMgYW4gZXJyb3IuICBpdCdzIGp1c3QgYWxsb3dpbmdcclxuLy8gZm9yIHJpZ2h0LWNsaWNraW5nIHRvIHNob3cgdGhlIGJyb3dzZXIncyBjb250ZXh0IG1lbnUuXHJcbmZ1bmN0aW9uIHNob3dDb250ZXh0TWVudShlKSB7XHJcblxyXG4gIC8vIGNyZWF0ZSBhIGNvbnRleHRtZW51IGV2ZW50LlxyXG4gIHZhciBtZW51X2V2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcclxuICBtZW51X2V2ZW50LmluaXRNb3VzZUV2ZW50KFwiY29udGV4dG1lbnVcIiwgdHJ1ZSwgdHJ1ZSxcclxuICAgIGUudmlldywgMSwgMCwgMCwgMCwgMCwgZmFsc2UsXHJcbiAgICBmYWxzZSwgZmFsc2UsIGZhbHNlLCAyLCBudWxsKTtcclxuXHJcbiAgLy8gZmlyZSB0aGUgbmV3IGV2ZW50LlxyXG4gIGUub3JpZ2luYWxUYXJnZXQuZGlzcGF0Y2hFdmVudChtZW51X2V2ZW50KTtcclxufVxyXG5cclxuXHJcbi8vIGhhY2sgdG8gYWxsb3cgZm9yIGJyb3dzZXIgY29udGV4dCBtZW51IG9uIHJpZ2h0LWNsaWNrXHJcbmZ1bmN0aW9uIG1vdXNlVXAoZSkge1xyXG4gIGlmIChlLmJ1dHRvbiA9PSAyKSB7IC8vIHJpZ2h0LWNsaWNrXHJcbiAgICB0aGlzLnNob3dDb250ZXh0TWVudShlKTtcclxuICB9XHJcbn1cclxuXHJcbi8vICQod2luZG93KS51bmxvYWQoZnVuY3Rpb24oKSB7XHJcbi8vICAgZGlzY29ubmVjdEZyb21HYW1lKCk7XHJcbi8vIH0pOyIsIi8qKlxyXG4gKiAgbWF0Y2htYWtlci5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZXhwb3J0IGNsYXNzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGNobWFrZXJUb3duO1xyXG5cclxuLyoqXHJcbiAqICBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hdGNobWFrZXJUb3duKSlcclxuICAgIHJldHVybiBuZXcgTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKTtcclxuXHJcbiAgLy8gVGhlIHJvb3Qgb2YgeW91ciBnYW1lIGRhdGEuXHJcbiAgdGhpcy5HQU1FX0xPQ0FUSU9OID0gZmlyZWJhc2VCYXNlVXJsO1xyXG4gIHRoaXMuZ2FtZVJlZiA9IG5ldyBGaXJlYmFzZSh0aGlzLkdBTUVfTE9DQVRJT04pO1xyXG5cclxuICB0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTiA9ICdhdmFpbGFibGVfZ2FtZXMnO1xyXG4gIHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTiA9ICdmdWxsX2dhbWVzJztcclxuICB0aGlzLkFMTF9HQU1FU19MT0NBVElPTiA9ICdnYW1lcyc7XHJcbiAgdGhpcy5NQVhfVVNFUlNfUEVSX0dBTUUgPSA0O1xyXG4gIHRoaXMuR0FNRV9DTEVBTlVQX1RJTUVPVVQgPSAzMCAqIDEwMDA7IC8vIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuICB0aGlzLmpvaW5lZEdhbWUgPSBudWxsO1xyXG4gIHRoaXMubXlXb3JrZXIgPSBudWxsO1xyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqICBjb25uZWN0IHRvIGEgZ2FtZVxyXG4gKi9cclxuTWF0Y2htYWtlclRvd24ucHJvdG90eXBlLmpvaW5PckNyZWF0ZUdhbWUgPSBmdW5jdGlvbih1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZUdhbWVzLmNhbGwodGhpcyk7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBqb2luIGdhbWUnKTtcclxuICBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyLmNhbGwodGhpcywgd2luZG93KTtcclxuICB2YXIgYXZhaWxhYmxlR2FtZXNEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OKTtcclxuICBhdmFpbGFibGVHYW1lc0RhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAvLyBvbmx5IGpvaW4gYSBnYW1lIGlmIG9uZSBpc24ndCBqb2luZWQgYWxyZWFkeVxyXG4gICAgaWYgKHNlbGYuam9pbmVkR2FtZSA9PSBudWxsKSB7XHJcbiAgICAgIHNlbGYuam9pbmVkR2FtZSA9IC0xO1xyXG4gICAgICBpZiAoZGF0YS52YWwoKSA9PT0gbnVsbCkge1xyXG4gICAgICAgIC8vIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgZ2FtZXMsIHNvIGNyZWF0ZSBvbmVcclxuICAgICAgICB2YXIgZ2FtZURhdGEgPSBjcmVhdGVOZXdHYW1lLmNhbGwoc2VsZiwgdXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICAgICAgam9pbmVkR2FtZUNhbGxiYWNrKGdhbWVEYXRhLCB0cnVlKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEudmFsKCk7XHJcbiAgICAgICAgdmFyIGdhbWVJZDtcclxuXHJcbiAgICAgICAgLy8gc3R1cGlkIGphdmFzY3JpcHQgd29uJ3QgdGVsbCBtZSBob3cgbWFueSBnYW1lIGVsZW1lbnRzXHJcbiAgICAgICAgLy8gYXJlIGluIHRoZSBqc29uT2JqLCBzbyBjb3VudCBlbSB1cFxyXG4gICAgICAgIHZhciBudW1BdmFpbGFibGVHYW1lcyA9IDA7XHJcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb25PYmopIHtcclxuICAgICAgICAgIG51bUF2YWlsYWJsZUdhbWVzKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGNoaWxkIGdhbWVzIGFuZCB0cnlcclxuICAgICAgICAvLyB0byBqb2luIGVhY2ggb25lXHJcbiAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uT2JqKSB7XHJcbiAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICBpZiAoanNvbk9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgIGdhbWVJZCA9IGpzb25PYmpba2V5XTtcclxuICAgICAgICAgICAgZ2V0R2FtZUxhc3RVcGRhdGVUaW1lLmNhbGwoc2VsZiwgZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIGRvbmVHZXR0aW5nVXBkYXRlVGltZSwgY291bnRlciA9PSBudW1BdmFpbGFibGVHYW1lcywgc2VsZik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogIHJlbW92ZSBhIHBlZXIgZnJvbSB0aGUgZ2FtZVxyXG4gKi9cclxuZnVuY3Rpb24gcmVtb3ZlUGVlckZyb21HYW1lKGdhbWVJZCwgcGVlcklkKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoIWRhdGEudmFsKCkpIHtcclxuICAgICAgLy8gc29tZXRoaW5nJ3Mgd3JvbmcsIHByb2JhYmx5IHRoZSBGaXJlYmFzZSBkYXRhIHdhcyBkZWxldGVkXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmIChkYXRhLnZhbCgpLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVySWQpIHtcclxuICAgICAgZmluZE5ld0hvc3RQZWVySWQuY2FsbCh0aGlzLCBnYW1lSWQsIHBlZXJJZCwgc3dpdGNoVG9OZXdIb3N0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAgIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIGdhbWUuIFNvIHRyaW0gb3V0IHRoZSBcclxuICAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbiAgICB2YXIgbnVtVXNlcnNJbkdhbWUgPSBkYXRhLmNoaWxkKCd1c2VycycpLnZhbCgpLmNsZWFuKHVuZGVmaW5lZCkubGVuZ3RoO1xyXG4gICAgZGF0YS5jaGlsZCgndXNlcnMnKS5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU25hcHNob3QpIHtcclxuICAgICAgLy8gaWYgd2UndmUgZm91bmQgdGhlIHJlZiB0aGF0IHJlcHJlc2VudHMgdGhlIGdpdmVuIHBlZXIsIHJlbW92ZSBpdFxyXG4gICAgICBpZiAoY2hpbGRTbmFwc2hvdC52YWwoKSAmJiBjaGlsZFNuYXBzaG90LnZhbCgpLnBlZXJJZCA9PSB0aGlzLnBlZXJJZCkge1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcbiAgICAgICAgLy8gaWYgdGhpcyB1c2VyIHdhcyB0aGUgbGFzdCBvbmUgaW4gdGhlIGdhbWUsIG5vdyB0aGVyZSBhcmUgMCwgXHJcbiAgICAgICAgLy8gc28gZGVsZXRlIHRoZSBnYW1lXHJcbiAgICAgICAgaWYgKG51bVVzZXJzSW5HYW1lID09IDEpIHtcclxuICAgICAgICAgIGRlbGV0ZUdhbWUuY2FsbCh0aGlzLCBnYW1lSWQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBpZiBpdCB3YXMgZnVsbCwgbm93IGl0IGhhcyBvbmUgb3BlbiBzbG90LCBzZXQgaXQgdG8gYXZhaWxhYmxlXHJcbiAgICAgICAgICBpZiAobnVtVXNlcnNJbkdhbWUgPT0gdGhpcy5NQVhfVVNFUlNfUEVSX0dBTUUpIHtcclxuICAgICAgICAgICAgbW92ZUdhbWVGcm9tRnVsbFRvQXZhaWxhYmxlLmNhbGwodGhpcywgZ2FtZUlkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nVXBkYXRlVGltZShsYXN0VXBkYXRlVGltZSwgZ2FtZUlkLCBpc1RoZUxhc3RHYW1lLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIHNjb3BlKSB7XHJcbiAgLy8gaWYgdGhlIGdhbWUgaXMgc3RpbGwgYWN0aXZlIGpvaW4gaXRcclxuICBpZiAobGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgIGlmICghaXNUaW1lb3V0VG9vTG9uZy5jYWxsKHNjb3BlLCBsYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgam9pbkV4aXN0aW5nR2FtZS5jYWxsKHNjb3BlLCBnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjayk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZUdhbWVzLmNhbGwoc2NvcGUpO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBpZiB3ZSBnb3QgaGVyZSwgYW5kIHRoaXMgaXMgdGhlIGxhc3QgZ2FtZSwgdGhhdCBtZWFucyB0aGVyZSBhcmUgbm8gYXZhaWxhYmxlIGdhbWVzXHJcbiAgLy8gc28gY3JlYXRlIG9uZVxyXG4gIGlmIChpc1RoZUxhc3RHYW1lKSB7XHJcbiAgICBjb25zb2xlLmxvZygnbm8gYXZhaWxhYmxlIGdhbWVzIGZvdW5kLCBvbmx5IGluYWN0aXZlIG9uZXMsIHNvIGNyZWF0aW5nIGEgbmV3IG9uZS4uLicpO1xyXG4gICAgdmFyIGdhbWVEYXRhID0gY3JlYXRlTmV3R2FtZS5jYWxsKHNjb3BlLCB1c2VybmFtZSwgcGVlcklkKTtcclxuICAgIGpvaW5lZEdhbWVDYWxsYmFjayhnYW1lRGF0YSwgdHJ1ZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRHYW1lTGFzdFVwZGF0ZVRpbWUoZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrLCBpc1RoZUxhc3RHYW1lKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGlmIChkYXRhLnZhbCgpICYmIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgICAgY29uc29sZS5sb2coJ2ZvdW5kIHVwZGF0ZSB0aW1lOiAnICsgZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSlcclxuICAgICAgZG9uZUdldHRpbmdVcGRhdGVUaW1lQ2FsbGJhY2soZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSwgZ2FtZUlkLCBpc1RoZUxhc3RHYW1lLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIHNlbGYpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVyUGluZygpIHtcclxuICBzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlLmNhbGwodGhpcyk7XHJcbiAgd2luZG93LnNldEludGVydmFsKHRoaXMuc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZSwgMTAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyKHdpbmRvd09iamVjdCkge1xyXG4gIGlmICh0eXBlb2Yod2luZG93T2JqZWN0LldvcmtlcikgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIHRoaXMubXlXb3JrZXIgPSBuZXcgV29ya2VyKFwiYXN5bmNtZXNzYWdlci5qc1wiKTtcclxuICAgIHRoaXMubXlXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMucHJvY2Vzc01lc3NhZ2VFdmVudCwgZmFsc2UpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlNvcnJ5LCB5b3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBXZWIgV29ya2Vycy4uLlwiKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZUdhbWVzKCkge1xyXG4gIC8vIGRvIGl0IG9uIGEgd2ViIHdvcmtlciB0aHJlYWRcclxuICBpZiAodGhpcy5teVdvcmtlcikge1xyXG4gICAgdGhpcy5teVdvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICAgIGNtZDogJ2NsZWFudXBfaW5hY3RpdmVfZ2FtZXMnXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlKCkge1xyXG4gIGNvbnNvbGUubG9nKCdwaW5naW5nIHNlcnZlcicpO1xyXG4gIGdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKHRoaXMuam9pbmVkR2FtZSkuY2hpbGQoJ2xhc3RVcGRhdGVUaW1lJykuc2V0KChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwR2FtZXMoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICBjb25zb2xlLmxvZygnY2xlYW5pbmcgdXAgaW5hY3RpdmUgZ2FtZXMnKTtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YVNuYXBzaG90KSB7XHJcbiAgICBkYXRhU25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIHZhciBzaG91bGREZWxldGVHYW1lID0gZmFsc2U7XHJcbiAgICAgIHZhciBnYW1lRGF0YSA9IGNoaWxkU25hcHNob3QudmFsKCk7XHJcbiAgICAgIGlmICghZ2FtZURhdGEpIHtcclxuICAgICAgICBzaG91bGREZWxldGVHYW1lID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZ2FtZURhdGEudXNlcnMgPT0gbnVsbCB8fCBnYW1lRGF0YS51c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGhhcyBubyB1c2VycycpO1xyXG4gICAgICAgIHNob3VsZERlbGV0ZUdhbWUgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc1RpbWVvdXRUb29Mb25nLmNhbGwoc2VsZiwgZ2FtZURhdGEubGFzdFVwZGF0ZVRpbWUpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJnYW1lIGhhc24ndCBiZWVuIHVwZGF0ZWQgc2luY2UgXCIgKyBnYW1lRGF0YS5sYXN0VXBkYXRlVGltZSk7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlR2FtZSA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzaG91bGREZWxldGVHYW1lKSB7XHJcbiAgICAgICAgZGVsZXRlR2FtZShzZWxmLCBjaGlsZFNuYXBzaG90Lm5hbWUoKSk7XHJcbiAgICAgICAgY2hpbGRTbmFwc2hvdC5yZWYoKS5yZW1vdmUoKTtcclxuXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gaXNUaW1lb3V0VG9vTG9uZyhsYXN0VXBkYXRlVGltZSkge1xyXG4gIGlmICghbGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgdmFyIGN1cnJlbnRUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICByZXR1cm4gKGN1cnJlbnRUaW1lIC0gbGFzdFVwZGF0ZVRpbWUgPiB0aGlzLkdBTUVfQ0xFQU5VUF9USU1FT1VUKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcHJvY2Vzc01lc3NhZ2VFdmVudChldmVudCkge1xyXG4gIHN3aXRjaCAoZXZlbnQuZGF0YSkge1xyXG4gICAgY2FzZSAnY2xlYW51cF9pbmFjdGl2ZV9nYW1lcyc6XHJcbiAgICAgIGNsZWFudXBHYW1lcy5zZWxmKCk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZmluZE5ld0hvc3RQZWVySWQoZ2FtZUlkLCBleGlzdGluZ0hvc3RQZWVySWQsIGNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyByZXNldCB0aGUgaG9zdFBlZXJJZCBzbyBpdCBwcmV2ZW50cyB0aGUgbGVhdmluZyBob3N0J3MgYnJvd3NlclxyXG4gIC8vIGlmIGl0IHRyaWVzIHRvIHN3aXRjaCBhZ2FpbiBiZWZvcmUgdGhpcyBpcyBkb25lXHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLmNoaWxkKCdob3N0UGVlcklkJykucmVtb3ZlKCk7XHJcblxyXG4gIHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIHZhciB1c2VycyA9IGRhdGEuY2hpbGQoJ3VzZXJzJykudmFsKCk7XHJcblxyXG4gICAgLy8gaWYgZm9yIHdoYXRldmVyIHJlYXNvbiB0aGlzIGlzIGNhbGxlZCBhbmQgc29tZXRoaW5nJ3Mgbm90IHJpZ2h0LCBqdXN0XHJcbiAgICAvLyByZXR1cm5cclxuICAgIGlmICghdXNlcnMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHVzZXJzID0gdXNlcnMuY2xlYW4odW5kZWZpbmVkKTtcclxuICAgIGlmICh1c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAodXNlcnNbaV0gJiYgdXNlcnNbaV0ucGVlcklkICE9IGV4aXN0aW5nSG9zdFBlZXJJZCkge1xyXG4gICAgICAgIC8vIHdlJ3ZlIGZvdW5kIGEgbmV3IHVzZXIgdG8gYmUgdGhlIGhvc3QsIHJldHVybiB0aGVpciBpZFxyXG4gICAgICAgIGNhbGxiYWNrKGdhbWVJZCwgdXNlcnNbaV0ucGVlcklkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2FsbGJhY2soZ2FtZUlkLCBudWxsKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3dpdGNoVG9OZXdIb3N0KGdhbWVJZCwgbmV3SG9zdFBlZXJJZCkge1xyXG4gIGlmICghbmV3SG9zdFBlZXJJZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5zZXQobmV3SG9zdFBlZXJJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlbGV0ZUdhbWUoZ2FtZUlkKSB7XHJcbiAgcmVtb3ZlR2FtZUZyb21BdmFpbGFibGVHYW1lcy5jYWxsKHRoaXMsIGdhbWVJZCk7XHJcbiAgcmVtb3ZlR2FtZUZyb21GdWxsR2FtZXMuY2FsbCh0aGlzLCBnYW1lSWQpO1xyXG4gIHJlbW92ZUdhbWUuY2FsbCh0aGlzLCBnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHYW1lKGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3R2FtZSh1c2VybmFtZSwgcGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2NyZWF0aW5nIG5ldyBnYW1lJyk7XHJcbiAgdmFyIGdhbWVJZCA9IGNyZWF0ZU5ld0dhbWVJZC5jYWxsKHRoaXMpO1xyXG4gIHZhciBnYW1lRGF0YSA9IHtcclxuICAgIGlkOiBnYW1lSWQsXHJcbiAgICBob3N0UGVlcklkOiBwZWVySWQsXHJcbiAgICB1c2VyczogW3tcclxuICAgICAgcGVlcklkOiBwZWVySWQsXHJcbiAgICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gICAgfV1cclxuICB9XHJcbiAgdmFyIG5ld0dhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIG5ld0dhbWVEYXRhUmVmLnNldChnYW1lRGF0YSk7XHJcbiAgdmFyIG5ld0F2YWlsYWJsZUdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIG5ld0F2YWlsYWJsZUdhbWVEYXRhUmVmLnNldChnYW1lSWQpO1xyXG4gIHRoaXMuam9pbmVkR2FtZSA9IGdhbWVJZDtcclxuICBpbml0aWFsaXplU2VydmVyUGluZy5jYWxsKHRoaXMpO1xyXG4gIHJldHVybiBnYW1lRGF0YTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld0dhbWVJZCgpIHtcclxuICAvLyBUT0RPOiByZXBsYWNlIHRoaXMgd2l0aCBzb21ldGhpbmcgdGhhdCB3b24ndFxyXG4gIC8vIGFjY2lkZW50YWxseSBoYXZlIGNvbGxpc2lvbnNcclxuICByZXR1cm4gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGpvaW5FeGlzdGluZ0dhbWUoZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIHNjb3BlKSB7XHJcbiAgLy8gaWYgYSBnYW1lIGhhcyBhbHJlYWR5IGJlZW4gam9pbmVkIG9uIGFub3RoZXIgdGhyZWFkLCBkb24ndCBqb2luIGFub3RoZXIgb25lXHJcbiAgaWYgKHNjb3BlLmpvaW5lZEdhbWUgJiYgc2NvcGUuam9pbmVkR2FtZSA+PSAwKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHNjb3BlLmpvaW5lZEdhbWUgPSBnYW1lSWQ7XHJcbiAgYXN5bmNHZXRHYW1lRGF0YS5jYWxsKHNjb3BlLCBnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgc2NvcGUuZG9uZUdldHRpbmdHYW1lRGF0YSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBhc3luY0dldEdhbWVEYXRhKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBkb25lR2V0dGluZ0dhbWVEYXRhQ2FsbGJhY2spIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBkb25lR2V0dGluZ0dhbWVEYXRhQ2FsbGJhY2soZGF0YSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZG9uZUdldHRpbmdHYW1lRGF0YShnYW1lRGF0YVNuYXBzaG90LCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spIHtcclxuICB2YXIgZ2FtZURhdGEgPSBnYW1lRGF0YVNuYXBzaG90LnZhbCgpO1xyXG4gIHZhciBuZXdVc2VyID0ge1xyXG4gICAgcGVlcklkOiBwZWVySWQsXHJcbiAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICB9O1xyXG4gIC8vIHdlaXJkbmVzczogaSB3YW50IHRvIGp1c3QgcHVzaCBuZXdVc2VyIG9udG8gZ2FtZURhdGEudXNlcnMsIGJ1dFxyXG4gIC8vIHRoYXQgbWVzc2VzIHVwIHRoZSBhcnJheSBJIGd1ZXNzXHJcbiAgdmFyIHVzZXJzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGEudXNlcnNbaV0pIHtcclxuICAgICAgdXNlcnNBcnJheS5wdXNoKGdhbWVEYXRhLnVzZXJzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbiAgdXNlcnNBcnJheS5wdXNoKG5ld1VzZXIpO1xyXG4gIGdhbWVEYXRhLnVzZXJzID0gdXNlcnNBcnJheTtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lRGF0YVNuYXBzaG90LnJlZigpO1xyXG4gIGdhbWVEYXRhUmVmLnNldChnYW1lRGF0YSk7XHJcbiAgY29uc29sZS5sb2coJ2pvaW5pbmcgZ2FtZSAnICsgZ2FtZURhdGEuaWQpO1xyXG4gIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4gIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIGdhbWUuIFNvIHRyaW0gb3V0IHRoZSBcclxuICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gIGlmICh1c2Vyc0FycmF5Lmxlbmd0aCA9PSB0aGlzLk1BWF9VU0VSU19QRVJfR0FNRSkge1xyXG4gICAgc2V0R2FtZVRvRnVsbC5jYWxsKHRoaXMsIGdhbWVEYXRhLmlkKTtcclxuICB9XHJcbiAgdmFyIHBlZXJJZHNBcnJheSA9IFtdO1xyXG4gIGZvciAodmFyIGogPSAwOyBqIDwgZ2FtZURhdGEudXNlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgIHBlZXJJZHNBcnJheS5wdXNoKGdhbWVEYXRhLnVzZXJzW2pdLnBlZXJJZCk7XHJcbiAgfVxyXG4gIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2socGVlcklkc0FycmF5KTtcclxuICBpbml0aWFsaXplU2VydmVyUGluZy5jYWxsKHRoaXMpO1xyXG4gIGpvaW5lZEdhbWVDYWxsYmFjayhnYW1lRGF0YSwgZmFsc2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRHYW1lVG9GdWxsKGdhbWVJZCkge1xyXG4gIHRoaXMucmVtb3ZlR2FtZUZyb21BdmFpbGFibGVHYW1lcyhnYW1lSWQpO1xyXG4gIHRoaXMuYWRkR2FtZVRvRnVsbEdhbWVzTGlzdChnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHYW1lRnJvbUF2YWlsYWJsZUdhbWVzKGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkR2FtZVRvRnVsbEdhbWVzTGlzdChnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lUmVmLmNoaWxkKHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZUdhbWVGcm9tRnVsbFRvQXZhaWxhYmxlKGdhbWVJZCkge1xyXG4gIHRoaXMucmVtb3ZlR2FtZUZyb21GdWxsR2FtZXMoZ2FtZUlkKTtcclxuICB0aGlzLmFkZEdhbWVUb0F2YWlsYWJsZUdhbWVzTGlzdChnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHYW1lRnJvbUZ1bGxHYW1lcyhnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lUmVmLmNoaWxkKHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkR2FtZVRvQXZhaWxhYmxlR2FtZXNMaXN0KGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IGdhbWVSZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYuc2V0KGdhbWVJZCk7XHJcbn1cclxuXHJcblxyXG4vLyAvLyByZXR1cm5zIG51bGwgaWYgdGhlIHVzZXIgd2Fzbid0IGZvdW5kIGluIHRoZSBnYW1lXHJcbi8vIGZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tR2FtZURhdGEocGVlcklkLCBnYW1lRGF0YSkge1xyXG4vLyAgIC8vIGlmIHNvbWV0aGluZydzIHdyb25nLCBqdXN0IHJldHVyblxyXG4vLyAgIGlmICghZ2FtZURhdGEgfHwgIWdhbWVEYXRhLnVzZXJzKSB7XHJcbi8vICAgICByZXR1cm4gbnVsbDtcclxuLy8gICB9XHJcblxyXG4vLyAgIC8vIFRPRE86IEZpcmViYXNlIGhhcyBhIGJldHRlciB3YXkgb2YgZG9pbmcgdGhpc1xyXG4vLyAgIHZhciBmb3VuZFBlZXIgPSBmYWxzZTtcclxuXHJcbi8vICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbi8vICAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgZ2FtZS4gU28gdHJpbSBvdXQgdGhlIFxyXG4vLyAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbi8vICAgZ2FtZURhdGEudXNlcnMgPSBnYW1lRGF0YS51c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG5cclxuLy8gICB1c2Vyc1dpdGhvdXRQZWVyID0gW107XHJcbi8vICAgZm9yIChpID0gMDsgaSA8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbi8vICAgICBpZiAoZ2FtZURhdGEudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4vLyAgICAgICBmb3VuZFBlZXIgPSB0cnVlO1xyXG4vLyAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgdXNlcnNXaXRob3V0UGVlci5wdXNoKGdhbWVEYXRhLnVzZXJzW2ldKTtcclxuLy8gICAgIH1cclxuLy8gICB9XHJcblxyXG4vLyAgIGlmIChmb3VuZFBlZXIpIHtcclxuLy8gICAgIGdhbWVEYXRhLnVzZXJzID0gdXNlcnNXaXRob3V0UGVlcjtcclxuLy8gICAgIHJldHVybiBnYW1lRGF0YTtcclxuLy8gICB9IGVsc2Uge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfSJdfQ==
