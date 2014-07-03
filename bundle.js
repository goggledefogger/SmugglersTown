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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvaW5kZXguanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9tYXBnYW1lLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWF0Y2htYWtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWpEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBTbXVnZ2xlcnNUb3duID0gcmVxdWlyZSgnLi9tYXBnYW1lLmpzJyk7XHJcblxyXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcclxuICAgIHZhciBnYW1lID0gbmV3IFNtdWdnbGVyc1Rvd24oJ2h0dHBzOi8vc211Z2dsZXJzdG93bi5maXJlYmFzZWlvLmNvbS8nKTtcclxufSk7IiwiLyogWU9VUiBTTVVHR0xFUiBNSVNTSU9OLCBJRiBZT1UgQ0hPT1NFIFRPIEFDQ0VQVCwgSVMgVE8gSk9JTiBURUFNXHJcbiAqIFRPV04gQU5EIFRSWSBUTyBERUZFQVQgVEVBTSBDUlVTSC4gIEFORCBZT1UgTVVTVCBBQ0NFUFQuLi5cclxuICovXHJcblxyXG4vKipcclxuICogIG1hcGdhbWUuanNcclxuICovXHJcblxyXG4vKipcclxuICogIGRlcHNcclxuICovXHJcbi8vdmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcclxuLy92YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xyXG52YXIgTWF0Y2htYWtlclRvd24gPSByZXF1aXJlKCcuL21hdGNobWFrZXIuanMnKTtcclxuXHJcbi8qKlxyXG4gKiAgZXhwb3J0IGNsYXNzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IFNtdWdnbGVyc1Rvd247XHJcblxyXG4vKipcclxuICogIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBTbXVnZ2xlcnNUb3duKGZpcmViYXNlQmFzZVVybCkge1xyXG5cclxuICB0aGlzLmluaXRpYWxpemUgPSB0aGlzLmluaXRpYWxpemUuYmluZCh0aGlzKTtcclxuXHJcbiAgdGhpcy5rZWVwQWxpdmVQYXJhbU5hbWUgPSAna2VlcGFsaXZlJztcclxuICB0aGlzLnFzID0gbmV3IFF1ZXJ5U3RyaW5nKCk7XHJcblxyXG4gIHRoaXMubWF0Y2htYWtlclRvd24gPSBuZXcgTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKTtcclxuXHJcbiAgdGhpcy5tYXAgPSBudWxsOyAvLyB0aGUgbWFwIGNhbnZhcyBmcm9tIHRoZSBHb29nbGUgTWFwcyB2MyBqYXZhc2NyaXB0IEFQSVxyXG4gIHRoaXMubWFwWm9vbUxldmVsID0gMTg7XHJcbiAgdGhpcy5tYXBEYXRhID0gbnVsbDsgLy8gdGhlIGxldmVsIGRhdGEgZm9yIHRoaXMgbWFwIChiYXNlIGxvY2F0aW9ucylcclxuXHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0ID0gbnVsbDtcclxuICAvLyB0aGUgaXRlbU1hcE9iamVjdCB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICBsb2NhdGlvbjogPGdvb2dsZV9tYXBzX0xhdExuZ19vYmplY3Q+LFxyXG4gIC8vICAgbWFya2VyOiA8Z29vZ2xlX21hcHNfTWFya2VyX29iamVjdD5cclxuICAvLyB9XHJcblxyXG4gIC8vIGRlZmF1bHQgdG8gdGhlIGdyYW5kIGNhbnlvbiwgYnV0IHRoaXMgd2lsbCBiZSBsb2FkZWQgZnJvbSBhIG1hcCBmaWxlXHJcbiAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKDM2LjE1MTEwMywgLTExMy4yMDg1NjUpO1xyXG5cclxuXHJcblxyXG4gIC8vIHRlYW0gZGF0YVxyXG4gIC8vIHRoZSB0ZWFtIG9iamVjdHMgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgdXNlcnM6IFt7XHJcbiAgLy8gICAgIHBlZXJJZDogMTIzNDU2Nzg5LFxyXG4gIC8vICAgICB1c2VybmFtZTogJ3JveSdcclxuICAvLyAgIH0sIHtcclxuICAvLyAgICAgcGVlcklkOiA5ODc2NTQzMjEsXHJcbiAgLy8gICAgIHVzZXJuYW1lOiAnaGFtJ1xyXG4gIC8vICAgfV0sXHJcbiAgLy8gICBiYXNlT2JqZWN0OiB7XHJcbiAgLy8gICAgIGxvY2F0aW9uOiB7XHJcbiAgLy8gICAgICAgbGF0OiAzNCxcclxuICAvLyAgICAgICBsbmc6IC0xMzNcclxuICAvLyAgICAgfVxyXG4gIC8vICAgfSxcclxuICAvLyAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICAvLyB9XHJcbiAgdGhpcy50ZWFtVG93bk9iamVjdCA9IHtcclxuICAgIHVzZXJzOiBbXSxcclxuICAgIGJhc2VPYmplY3Q6IHtcclxuICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICBsYXQ6IDM2LjE1MTEwMyxcclxuICAgICAgICBsbmc6IC0xMTMuMjA4NTY1XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgfTtcclxuICB0aGlzLnRlYW1DcnVzaE9iamVjdCA9IHtcclxuICAgIHVzZXJzOiBbXSxcclxuICAgIGJhc2VPYmplY3Q6IHtcclxuICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICBsYXQ6IDM2LjE1MTEwMyxcclxuICAgICAgICBsbmc6IC0xMTMuMjA4NTY1XHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgfTtcclxuXHJcbiAgLy8gZm9yIHRpbWUtYmFzZWQgZ2FtZSBsb29wXHJcbiAgdGhpcy5ub3c7XHJcbiAgdGhpcy5kdCA9IDA7XHJcbiAgdGhpcy5sYXN0ID0gdGltZXN0YW1wLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5zdGVwID0gMSAvIDYwO1xyXG5cclxuICAvLyB1c2VyIGRhdGFcclxuICB0aGlzLnVzZXJuYW1lID0gbnVsbDtcclxuXHJcbiAgLy8gZ2FtZSBob3N0aW5nIGRhdGFcclxuICB0aGlzLmdhbWVJZCA9IG51bGw7XHJcbiAgdGhpcy5ob3N0UGVlcklkID0gbnVsbDtcclxuXHJcbiAgLy8gY2FyIHByb3BlcnRpZXNcclxuICB0aGlzLnJvdGF0aW9uID0gMDtcclxuICB0aGlzLmRlY2VsZXJhdGlvbiA9IDEuMTtcclxuICB0aGlzLk1BWF9OT1JNQUxfU1BFRUQgPSAxODtcclxuICB0aGlzLk1BWF9CT09TVF9TUEVFRCA9IDQwO1xyXG4gIHRoaXMuQk9PU1RfRkFDVE9SID0gMS4wNztcclxuICB0aGlzLkJPT1NUX0NPTlNVTVBUSU9OX1JBVEUgPSAwLjU7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX05PUk1BTF9TUEVFRDtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJyc7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzID0gJyc7XHJcbiAgdGhpcy5sYXRpdHVkZVNwZWVkRmFjdG9yID0gMTAwMDAwMDtcclxuICB0aGlzLmxvbmdpdHVkZVNwZWVkRmFjdG9yID0gNTAwMDAwO1xyXG5cclxuICAvLyBjb2xsaXNpb24gZW5naW5lIGluZm9cclxuICB0aGlzLmNhclRvSXRlbUNvbGxpc2lvbkRpc3RhbmNlID0gMjA7XHJcbiAgdGhpcy5jYXJUb0Jhc2VDb2xsaXNpb25EaXN0YW5jZSA9IDQzO1xyXG5cclxuICAvLyBtYXAgZGF0YVxyXG4gIHRoaXMubWFwRGF0YUxvYWRlZCA9IGZhbHNlO1xyXG4gIHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zID0gMC4wMDg7IC8vIGluIGxhdGl0dWRlIGRlZ3JlZXNcclxuICB0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgPSAwLjAwODsgLy8gaW4gbG9uZ2l0dWRlIGRlZ3JlZXNcclxuICB0aGlzLm1pbkl0ZW1EaXN0YW5jZUZyb21CYXNlID0gMzAwO1xyXG5cclxuICAvLyB0aGVzZSBtYXAgb2JqZWN0cyB3aWxsIGJlIG9mIHRoZSBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIGxvY2F0aW9uOiA8Z29vZ2xlX21hcHNfTGF0TG5nX29iamVjdD4sXHJcbiAgLy8gICBtYXJrZXI6IDxnb29nbGVfbWFwc19NYXJrZXJfb2JqZWN0PlxyXG4gIC8vIH1cclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCA9IHtcclxuICAgIGxvY2F0aW9uOiB0aGlzLm1hcENlbnRlcixcclxuICAgIG1hcmtlcjogbnVsbFxyXG4gIH1cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgPSBudWxsO1xyXG4gIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdCA9IHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG5cclxuICAvLyBnYW1lcGxheVxyXG5cclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0ID0ge1xyXG4gICAgdGVhbVRvd25PYmplY3Q6IHRoaXMudGVhbVRvd25PYmplY3QsXHJcbiAgICB0ZWFtQ3J1c2hPYmplY3Q6IHRoaXMudGVhbUNydXNoT2JqZWN0LFxyXG4gICAgcGVlcklkT2ZDYXJXaXRoSXRlbTogbnVsbCxcclxuICAgIGluaXRpYWxMb2NhdGlvbjoge1xyXG4gICAgICBsYXQ6IHRoaXMubWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICBsbmc6IHRoaXMubWFwQ2VudGVyLmxuZygpXHJcbiAgICB9XHJcbiAgfTtcclxuICAvLyB0aGlzIHdpbGwgYmUgb2YgdGhlIGZvcm1cclxuICAvLyB7XHJcbiAgLy8gICB0ZWFtVG93bk9iamVjdDogPHRlYW1fb2JqZWN0PixcclxuICAvLyAgIHRlYW1DcnVzaE9iamVjdDogPHRlYW1fb2JqZWN0PixcclxuICAvLyAgIHBlZXJJZE9mQ2FyV2l0aEl0ZW06IG51bGwsXHJcbiAgLy8gICBpbml0aWFsTG9jYXRpb246IHtcclxuICAvLyAgICAgbGF0OiAzNSxcclxuICAvLyAgICAgbG5nOiAtMTMyXHJcbiAgLy8gfVxyXG4gIC8vICAgaXRlbU9iamVjdDoge1xyXG4gIC8vICAgICBpZDogNTc2LFxyXG4gIC8vICAgICBsb2NhdGlvbjoge1xyXG4gIC8vICAgICAgIGxhdDogMzQsXHJcbiAgLy8gICAgICAgbG5nOiAtMTMzXHJcbiAgLy8gICAgIH1cclxuICAvLyAgIH1cclxuICAvLyB9XHJcblxyXG5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIC8vIHNldCB0aGUgaW5pdGlhbCBkZXN0aW5hdGlvbiB0byB3aGF0ZXZlciwgaXQgd2lsbCBiZSByZXNldCBcclxuICAvLyB3aGVuIGFuIGl0ZW0gaXMgZmlyc3QgcGxhY2VkXHJcbiAgdGhpcy5kZXN0aW5hdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoNDUuNDg5MzkxLCAtMTIyLjY0NzU4Nik7XHJcbiAgdGhpcy50aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzID0gMTAwMDsgLy8gaW4gbXNcclxuICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IG51bGw7XHJcblxyXG4gIC8vIG9iamVjdCBvZiB0aGUgb3RoZXIgdXNlcnNcclxuICB0aGlzLm90aGVyVXNlcnMgPSB7fTtcclxuICAvLyB0aGUgb3RoZXJVc2VycyBkYXRhIHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIDEyMzQ1Njc4OToge1xyXG4gIC8vICAgICBwZWVySWQ6IDEyMzQ2Nzg5LFxyXG4gIC8vICAgICB1c2VybmFtZTogaGVsbG9yb3ksXHJcbiAgLy8gICAgIGNhcjoge1xyXG4gIC8vICAgICAgIGxvY2F0aW9uOiA8bG9jYXRpb25fb2JqZWN0PixcclxuICAvLyAgICAgICBtYXJrZXI6IDxtYXJrZXJfb2JqZWN0PlxyXG4gIC8vICAgICB9LFxyXG4gIC8vICAgICBwZWVySnNDb25uZWN0aW9uOiA8cGVlckpzQ29ubmVjdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICBsYXN0VXBkYXRlVGltZTogPHRpbWVfb2JqZWN0PixcclxuICAvLyAgICAgbnVtSXRlbXM6IDAsXHJcbiAgLy8gICAgIGhhc0JlZW5Jbml0aWFsaXplZDogdHJ1ZVxyXG4gIC8vICAgfSxcclxuICAvLyAgIDk4NzY1NDMyMToge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6IHRvd250b3duOTAwMCxcclxuICAvLyAgICAgY2FyOiB7XHJcbiAgLy8gICAgICAgbG9jYXRpb246IDxsb2NhdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICAgIG1hcmtlcjogPG1hcmtlcl9vYmplY3Q+XHJcbiAgLy8gICAgIH0sXHJcbiAgLy8gICAgIHBlZXJKc0Nvbm5lY3Rpb246IDxwZWVySnNDb25uZWN0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgIGxhc3RVcGRhdGVUaW1lOiA8dGltZV9vYmplY3Q+LFxyXG4gIC8vICAgICBudW1JdGVtczogNVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcbiAgLy8gaW1hZ2VzXHJcbiAgdGhpcy5pdGVtSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9zbW9raW5nX3RvaWxldF9zbWFsbC5naWYnXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hVc2VyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9jcnVzaF9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtVG93blVzZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1Ub3duT3RoZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3RlYW1fdG93bl9vdGhlcl9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtQ3J1c2hPdGhlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvdGVhbV9jcnVzaF9vdGhlcl9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9mb3J0LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9vcHBvbmVudF9mb3J0LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvZm9ydF90cmFuc3BhcmVudC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9vcHBvbmVudF9mb3J0X3RyYW5zcGFyZW50LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vIHBlZXIgSlMgY29ubmVjdGlvbiAoZm9yIG11bHRpcGxheWVyIHdlYlJUQylcclxuICB0aGlzLnBlZXIgPSBuZXcgUGVlcih7XHJcbiAgICBrZXk6ICdqM20wcXRkZGVzaHBrM3hyJ1xyXG4gIH0pO1xyXG4gIHRoaXMucGVlci5vbignb3BlbicsIGZ1bmN0aW9uKGlkKSB7XHJcbiAgICBjb25zb2xlLmxvZygnTXkgcGVlciBJRCBpczogJyArIGlkKTtcclxuICAgICQoJyNwZWVyLWlkJykudGV4dChpZCk7XHJcbiAgICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3dhaXRpbmcgZm9yIGEgc211Z2dsZXIgdG8gYmF0dGxlLi4uJyk7XHJcbiAgfSk7XHJcbiAgdGhpcy5wZWVyLm9uKCdjb25uZWN0aW9uJywgY29ubmVjdGVkVG9QZWVyLmJpbmQodGhpcykpO1xyXG4gIHRoaXMuQUNUSVZFX0NPTk5FQ1RJT05fVElNRU9VVF9JTl9TRUNPTkRTID0gMzAgKiAxMDAwO1xyXG5cclxuXHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkRG9tTGlzdGVuZXIod2luZG93LCAnbG9hZCcsIHRoaXMuaW5pdGlhbGl6ZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiAgaW5pdGlhbGl6ZSB0aGUgZ2FtZVxyXG4gKi9cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdGhpcy51c2VybmFtZSA9IHByb21wdCgnQ2hvb3NlIHlvdXIgU211Z2dsZXIgTmFtZTonLCAnTmluamEgUm95Jyk7XHJcbiAgY3JlYXRlTWFwT25QYWdlLmNhbGwodGhpcyk7XHJcbiAgbG9hZE1hcERhdGEuY2FsbCh0aGlzLCBtYXBJc1JlYWR5KTtcclxuXHJcbiAgLy8gdGhlc2UgYXJlIHNldCB0byB0cnVlIHdoZW4ga2V5cyBhcmUgYmVpbmcgcHJlc3NlZFxyXG4gIHRoaXMucmlnaHREb3duID0gZmFsc2U7XHJcbiAgdGhpcy5sZWZ0RG93biA9IGZhbHNlO1xyXG4gIHRoaXMudXBEb3duID0gZmFsc2U7XHJcbiAgdGhpcy5kb3duRG93biA9IGZhbHNlO1xyXG4gIHRoaXMuY3RybERvd24gPSBmYWxzZTtcclxuXHJcbiAgdGhpcy5zcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbiA9IDA7XHJcbiAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuXHJcbiAgLy90cnlGaW5kaW5nTG9jYXRpb24oKTtcclxuXHJcblxyXG4gIGJpbmRLZXlBbmRCdXR0b25FdmVudHMuY2FsbCh0aGlzKTtcclxuXHJcbiAgaW5pdGlhbGl6ZUJvb3N0QmFyLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIHN0YXJ0IHRoZSBnYW1lIGxvb3BcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUuY2FsbCh0aGlzLCBmcmFtZSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplQm9vc3RCYXIoKSB7XHJcbiAgJChmdW5jdGlvbigpIHtcclxuICAgICQoXCIjYm9vc3QtYmFyXCIpLnByb2dyZXNzYmFyKHtcclxuICAgICAgdmFsdWU6IDEwMFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1hcElzUmVhZHkoKSB7XHJcbiAgbWF0Y2htYWtlclRvd24uam9pbk9yQ3JlYXRlR2FtZSh1c2VybmFtZSwgcGVlci5pZCwgY29ubmVjdFRvQWxsTm9uSG9zdFVzZXJzLCBnYW1lSm9pbmVkKVxyXG59XHJcblxyXG5mdW5jdGlvbiBnYW1lSm9pbmVkKGdhbWVEYXRhLCBpc05ld0dhbWUpIHtcclxuICBnYW1lSWQgPSBnYW1lRGF0YS5pZDtcclxuICBpZiAoaXNOZXdHYW1lKSB7XHJcbiAgICAvLyB3ZSdyZSBob3N0aW5nIHRoZSBnYW1lIG91cnNlbGZcclxuICAgIGhvc3RQZWVySWQgPSBwZWVyLmlkO1xyXG4gICAgLy8gZmlyc3QgdXNlciBpcyBhbHdheXMgb24gdGVhbSB0b3duXHJcbiAgICB0aGlzLmdhbWVEYXRhLnRlYW1Ub3duT2JqZWN0LnVzZXJzID0gW3tcclxuICAgICAgcGVlcklkOiBwZWVyLmlkLFxyXG4gICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgIH1dO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBzb21lb25lIGVsc2UgaXMgYWxyZWFkeSB0aGUgaG9zdFxyXG4gICAgaG9zdFBlZXJJZCA9IGdhbWVEYXRhLmhvc3RQZWVySWQ7XHJcbiAgICBhY3RpdmF0ZVRlYW1DcnVzaEluVUkoKTtcclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSSgpO1xyXG4gIHVwZGF0ZUNhckljb25zKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVzZXJuYW1lc0luVUkoKSB7XHJcbiAgdmFyIHRlYW1Ub3duSnF1ZXJ5RWxlbSA9ICQoJyN0ZWFtLXRvd24tdXNlcm5hbWVzJyk7XHJcbiAgdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbVRvd25KcXVlcnlFbGVtLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzKTtcclxuICB2YXIgdGVhbUNydXNoSnF1ZXJ5RWxlbSA9ICQoJyN0ZWFtLWNydXNoLXVzZXJuYW1lcycpO1xyXG4gIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1DcnVzaEpxdWVyeUVsZW0sIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtLCB1c2VyT2JqZWN0c0FycmF5KSB7XHJcbiAgLy8gY2xlYXIgdGhlIGN1cnJlbnQgbGlzdCBvZiB1c2VybmFtZXNcclxuICB0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbS5lbXB0eSgpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlck9iamVjdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG5ld0pxdWVyeUVsZW0gPSAkKCQucGFyc2VIVE1MKFxyXG4gICAgICAnPGxpIGlkPVwidXNlcm5hbWUtJyArXHJcbiAgICAgIHVzZXJPYmplY3RzQXJyYXlbaV0ucGVlcklkICtcclxuICAgICAgJ1wiPicgKyB1c2VyT2JqZWN0c0FycmF5W2ldLnVzZXJuYW1lICsgJzwvbGk+J1xyXG4gICAgKSk7XHJcbiAgICAkKHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtKS5hcHBlbmQobmV3SnF1ZXJ5RWxlbSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhY3RpdmF0ZVRlYW1DcnVzaEluVUkoKSB7XHJcbiAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnb3BhY2l0eScsICcxJyk7XHJcbiAgdmFyIHRlYW1DcnVzaFNjb3JlID0gMDtcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCkge1xyXG4gICAgdGVhbUNydXNoU2NvcmUgPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkO1xyXG4gIH1cclxuICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRlYW1DcnVzaFNjb3JlKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3RUb0FsbE5vbkhvc3RVc2Vycyhub25Ib3N0UGVlcklkcykge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9uSG9zdFBlZXJJZHMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChub25Ib3N0UGVlcklkc1tpXSAhPSBwZWVyLmlkKSB7XHJcbiAgICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBub25Ib3N0UGVlcklkc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBiaW5kS2V5QW5kQnV0dG9uRXZlbnRzKCkge1xyXG4gICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKSB7XHJcbiAgICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG5cclxuICAkKGRvY3VtZW50KS5rZXlkb3duKHRoaXMub25LZXlEb3duKTtcclxuICAkKGRvY3VtZW50KS5rZXl1cCh0aGlzLm9uS2V5VXApO1xyXG4gICQoJyNjb25uZWN0LWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHBlZXJJZCA9ICQoJyNwZWVyLWlkLXRleHRib3gnKS52YWwoKTtcclxuICAgIGNvbnNvbGUubG9nKCdwZWVyIGlkIGNvbm5lY3Rpbmc6ICcgKyBwZWVySWQpO1xyXG4gICAgY29ubmVjdFRvUGVlci5jYWxsKHRoaXMsIHBlZXJJZCk7XHJcbiAgfSk7XHJcbiAgJCgnI3NldC1jZW50ZXItYnV0dG9uJykuY2xpY2soZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICB2YXIgc2VhcmNoVGVybSA9ICQoJyNtYXAtY2VudGVyLXRleHRib3gnKS52YWwoKTtcclxuICAgIGlmICghc2VhcmNoVGVybSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBjZW50ZXIgdG86ICcgKyBzZWFyY2hUZXJtKTtcclxuICAgIHNlYXJjaEFuZENlbnRlck1hcC5jYWxsKHRoaXMsIHNlYXJjaFRlcm0pO1xyXG4gICAgYnJvYWRjYXN0TmV3TG9jYXRpb24uY2FsbCh0aGlzLCBtYXBDZW50ZXIpO1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG4gIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IHRoaXMuZGlzY29ubmVjdEZyb21HYW1lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNjb25uZWN0RnJvbUdhbWUoKSB7XHJcbiAgaWYgKHRoaXMucGVlciAmJiB0aGlzLnBlZXIuaWQgJiYgdGhpcy5nYW1lSWQpIHtcclxuICAgIG1hdGNobWFrZXJUb3duLnJlbW92ZVBlZXJGcm9tR2FtZSh0aGlzLmdhbWVJZCwgdGhpcy5wZWVyLmlkKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU1hcE9uUGFnZSgpIHtcclxuICB2YXIgbWFwT3B0aW9ucyA9IHtcclxuICAgIHpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgY2VudGVyOiB0aGlzLm1hcENlbnRlcixcclxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiBmYWxzZSxcclxuICAgIG1hcFR5cGVJZDogZ29vZ2xlLm1hcHMuTWFwVHlwZUlkLlNBVEVMTElURSxcclxuICAgIGRpc2FibGVEZWZhdWx0VUk6IHRydWUsXHJcbiAgICBtaW5ab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIG1heFpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgc2Nyb2xsd2hlZWw6IGZhbHNlLFxyXG4gICAgZGlzYWJsZURvdWJsZUNsaWNrWm9vbTogdHJ1ZSxcclxuICAgIGRyYWdnYWJsZTogZmFsc2UsXHJcbiAgfVxyXG5cclxuICB0aGlzLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcC1jYW52YXMnKSwgbWFwT3B0aW9ucyk7XHJcblxyXG4gIC8vIG5vdCBuZWNlc3NhcnksIGp1c3Qgd2FudCB0byBhbGxvdyB0aGUgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsICdjbGljaycsIGZ1bmN0aW9uKGUpIHtcclxuICAgIGNvbnRleHRtZW51OiB0cnVlXHJcbiAgfSk7XHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsIFwicmlnaHRjbGlja1wiLCB0aGlzLnNob3dDb250ZXh0TWVudSk7XHJcblxyXG4gIHJlc2l6ZU1hcFRvRml0LmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2l6ZU1hcFRvRml0KCkge1xyXG4gICQoJ2JvZHknKS5oZWlnaHQoJCh3aW5kb3cpLmhlaWdodCgpIC0gMik7XHJcbiAgdmFyIG1haW5IZWlnaHQgPSAkKCdib2R5JykuaGVpZ2h0KCk7XHJcbiAgdmFyIGNvbnRlbnRIZWlnaHQgPVxyXG4gICAgJCgnI2hlYWRlcicpLm91dGVySGVpZ2h0KCkgK1xyXG4gICAgJCgnI2Zvb3RlcicpLm91dGVySGVpZ2h0KCk7XHJcbiAgdmFyIGggPSBtYWluSGVpZ2h0IC0gY29udGVudEhlaWdodDtcclxuICAkKCcjbWFwLWJvZHknKS5oZWlnaHQoaCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlYXJjaEFuZENlbnRlck1hcChzZWFyY2hUZXJtKSB7XHJcbiAgdmFyIHBhcnRzID0gc2VhcmNoVGVybS5zcGxpdCgnLCcpO1xyXG4gIGlmICghcGFydHMpIHtcclxuICAgIC8vIGJhZCBzZWFyY2ggaW5wdXQsIG11c3QgYmUgaW4gbGF0LGxuZyBmb3JtXHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciBsYXRTdHJpbmcgPSBwYXJ0c1swXTtcclxuICB2YXIgbG5nU3RyaW5nID0gcGFydHNbMV07XHJcbiAgc2V0R2FtZVRvTmV3TG9jYXRpb24uY2FsbCh0aGlzLCBsYXRTdHJpbmcsIGxuZ1N0cmluZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNYXBEYXRhKG1hcElzUmVhZHlDYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLm1hcERhdGFMb2FkZWQgPSBmYWxzZTtcclxuICBjb25zb2xlLmxvZygnbG9hZGluZyBtYXAgZGF0YScpO1xyXG5cclxuICAvLyBUT0RPOiBcclxuICAvLyB0byByZWFkIHN0YXRpYyBmaWxlcyBpblxyXG4gIC8vIHlvdSBuZWVkIHRvIHBhc3MgXCItdCBicmZzXCIgdG8gYnJvd3NlcmlmeVxyXG4gIC8vIGJ1dCBpdCdzIGNvb2wgY29zIHlvdSBjYW4gaW5saW5lIGJhc2U2NCBlbmNvZGVkIGltYWdlcyBvciB1dGY4IGh0bWwgc3RyaW5nc1xyXG4gIC8vJC5nZXRKU09OKFwibWFwcy9ncmFuZGNhbnlvbi5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAkLmdldEpTT04oXCJtYXBzL3BvcnRsYW5kLmpzb25cIiwgZnVuY3Rpb24oanNvbikge1xyXG4gICAgY29uc29sZS5sb2coJ21hcCBkYXRhIGxvYWRlZCcpO1xyXG4gICAgc2VsZi5tYXBEYXRhID0ganNvbjtcclxuICAgIHNlbGYubWFwRGF0YUxvYWRlZCA9IHRydWU7XHJcbiAgICBzZWxmLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLmNlbnRlckxhdExuZy5sbmcpO1xyXG4gICAgc2VsZi5tYXAuc2V0Q2VudGVyKHNlbGYubWFwQ2VudGVyKTtcclxuICAgIHNlbGYuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uID0ge1xyXG4gICAgICBsYXQ6IHNlbGYubWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICBsbmc6IHNlbGYubWFwQ2VudGVyLmxuZygpXHJcbiAgICB9O1xyXG5cclxuICAgIGNyZWF0ZVRlYW1Ub3duQmFzZS5jYWxsKHNlbGYsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtVG93bkJhc2VMYXRMbmcubG5nKTtcclxuICAgIGNyZWF0ZVRlYW1DcnVzaEJhc2UuY2FsbCh0aGlzLCBzZWxmLm1hcERhdGEubWFwLnRlYW1DcnVzaEJhc2VMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLnRlYW1DcnVzaEJhc2VMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubXlUZWFtQmFzZU1hcE9iamVjdCA9IHNlbGYudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG5cclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICAgIG1hcElzUmVhZHlDYWxsYmFjaygpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2UobGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtVG93bkJhc2VPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdCA9IGNyZWF0ZVRlYW1DcnVzaEJhc2VPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBUb3duIGJhc2Ugb24gdGhlIG1hcCwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ICYmIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge307XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIHRpdGxlOiAnVGVhbSBUb3duIEJhc2UnLFxyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHBvc2l0aW9uOiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbVRvd25CYXNlSWNvblxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2VPYmplY3QobGF0LCBsbmcpIHtcclxuICB2YXIgdGVhbVRvd25CYXNlT2JqZWN0ID0ge307XHJcbiAgdGVhbVRvd25CYXNlT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcblxyXG4gIHJldHVybiB0ZWFtVG93bkJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QobGF0LCBsbmcpIHtcclxuICAvLyBpZiB0aGVyZSdzIGFscmVhZHkgYSB0ZWFtIENydXNoIGJhc2Ugb24gdGhlIG1hcCwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIHRpdGxlOiAnVGVhbSBDcnVzaCBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmxvY2F0aW9uLFxyXG4gICAgaWNvbjogdGhpcy50ZWFtQ3J1c2hCYXNlSWNvblxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcblxyXG4gIHZhciB0ZWFtQ3J1c2hCYXNlT2JqZWN0ID0ge307XHJcbiAgdGVhbUNydXNoQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbUNydXNoQmFzZU9iamVjdDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmFuZG9tbHlQdXRJdGVtcygpIHtcclxuICB2YXIgcmFuZG9tTG9jYXRpb24gPSBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0uY2FsbCh0aGlzKTtcclxuICB2YXIgaXRlbUlkID0gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwLCAwKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICBpZDogaXRlbUlkLFxyXG4gICAgbG9jYXRpb246IHtcclxuICAgICAgbGF0OiByYW5kb21Mb2NhdGlvbi5sYXQoKSxcclxuICAgICAgbG5nOiByYW5kb21Mb2NhdGlvbi5sbmcoKVxyXG4gICAgfVxyXG4gIH1cclxuICBwdXROZXdJdGVtT25NYXAuY2FsbCh0aGlzLCByYW5kb21Mb2NhdGlvbiwgaXRlbUlkKTtcclxuICBicm9hZGNhc3ROZXdJdGVtLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUxvY2F0aW9uRm9ySXRlbSgpIHtcclxuICAvLyBGaW5kIGEgcmFuZG9tIGxvY2F0aW9uIHRoYXQgd29ya3MsIGFuZCBpZiBpdCdzIHRvbyBjbG9zZVxyXG4gIC8vIHRvIHRoZSBiYXNlLCBwaWNrIGFub3RoZXIgbG9jYXRpb25cclxuICB2YXIgcmFuZG9tTG9jYXRpb24gPSBudWxsO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMYXQgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubGF0KCk7XHJcbiAgdmFyIGNlbnRlck9mQXJlYUxuZyA9IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbi5sbmcoKTtcclxuICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgcmFuZG9tTGF0ID0gZ2V0UmFuZG9tSW5SYW5nZShjZW50ZXJPZkFyZWFMYXQgLVxyXG4gICAgICAodGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMYXQgKyAodGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCA3KTtcclxuICAgIHJhbmRvbUxuZyA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTG5nIC1cclxuICAgICAgKHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIGNlbnRlck9mQXJlYUxuZyArICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCA3KTtcclxuICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gcHV0IGl0ZW0gYXQ6ICcgKyByYW5kb21MYXQgKyAnLCcgKyByYW5kb21MbmcpO1xyXG4gICAgcmFuZG9tTG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHJhbmRvbUxhdCwgcmFuZG9tTG5nKTtcclxuICAgIGlmIChnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2VlbihyYW5kb21Mb2NhdGlvbiwgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSA+IHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UpIHtcclxuICAgICAgcmV0dXJuIHJhbmRvbUxvY2F0aW9uO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ2l0ZW0gdG9vIGNsb3NlIHRvIGJhc2UsIGNob29zaW5nIGFub3RoZXIgbG9jYXRpb24uLi4nKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHB1dE5ld0l0ZW1Pbk1hcChsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgLy8gZXZlbnR1YWxseSB0aGlzIHNob3VsZCBiZSByZWR1bmRhbnQgdG8gY2xlYXIgdGhpcywgYnV0IHdoaWxlXHJcbiAgLy8gdGhlcmUncyBhIGJ1ZyBvbiBtdWx0aXBsYXllciBqb2luaW5nLCBjbGVhciBpdCBhZ2FpblxyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuXHJcbiAgLy8gc2V0IHRoZSBiYXNlIGljb24gaW1hZ2VzIHRvIGJlIHRoZSBsaWdodGVyIG9uZXNcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcblxyXG4gIC8vIGluIGNhc2UgdGhlcmUncyBhIGxpbmdlcmluZyBpdGVtLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy5pdGVtTWFwT2JqZWN0ICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIgJiYgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5tYXApIHtcclxuICAgIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGl0ZW1NYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICB0aXRsZTogJ0l0ZW0nLFxyXG4gICAgaWNvbjogdGhpcy5pdGVtSWNvbixcclxuICAgIC8vIC8vVE9ETzogRklYIFNUVVBJRCBHT09HTEUgTUFQUyBCVUcgdGhhdCBjYXVzZXMgdGhlIGdpZiBtYXJrZXJcclxuICAgIC8vIC8vdG8gbXlzdGVyaW91c2x5IG5vdCBzaG93IHVwIHNvbWV0aW1lc1xyXG4gICAgLy8gb3B0aW1pemVkOiBmYWxzZSxcclxuICAgIHBvc2l0aW9uOiBsb2NhdGlvblxyXG4gIH0pO1xyXG5cclxuICB0aGlzLml0ZW1NYXBPYmplY3QgPSB7XHJcbiAgICBtYXJrZXI6IGl0ZW1NYXJrZXIsXHJcbiAgICBsb2NhdGlvbjogbG9jYXRpb25cclxuICB9O1xyXG5cclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gIH07XHJcblxyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgbG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICByZXR1cm4gaXRlbUlkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVCb29zdGluZygpIHtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIGlmICgkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKSB8fCAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKSA9PSAwKSB7XHJcbiAgICB2YXIgYm9vc3RCYXJWYWx1ZSA9ICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpO1xyXG4gICAgaWYgKHRoaXMuY3RybERvd24gJiYgYm9vc3RCYXJWYWx1ZSA+IDApIHtcclxuICAgICAgYm9vc3RCYXJWYWx1ZSAtPSB0aGlzLkJPT1NUX0NPTlNVTVBUSU9OX1JBVEU7XHJcbiAgICAgICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIsIGJvb3N0QmFyVmFsdWUpO1xyXG4gICAgICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfQk9PU1RfU1BFRUQ7XHJcbiAgICAgIHRoaXMuc3BlZWQgKj0gdGhpcy5CT09TVF9GQUNUT1I7XHJcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5zcGVlZCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSAtdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5zcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5ob3Jpem9udGFsU3BlZWQpID4gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPD0gMCkge1xyXG4gICAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjYm9vc3QtYmFyJykpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMubWF4U3BlZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVDYXIoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IGhhbmRsZUJvb3N0aW5nLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIGlmIFVwIG9yIERvd24ga2V5IGlzIHByZXNzZWQsIGNoYW5nZSB0aGUgc3BlZWQuIE90aGVyd2lzZSxcclxuICAvLyBkZWNlbGVyYXRlIGF0IGEgc3RhbmRhcmQgcmF0ZVxyXG4gIGlmICh0aGlzLnVwRG93biB8fCB0aGlzLmRvd25Eb3duKSB7XHJcbiAgICBpZiAodGhpcy51cERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuc3BlZWQgPD0gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuc3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZG93bkRvd24pIHtcclxuICAgICAgaWYgKHRoaXMuc3BlZWQgPj0gLXRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkIC09IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICAvLyBpZiBMZWZ0IG9yIFJpZ2h0IGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIGhvcml6b250YWwgc3BlZWQuXHJcbiAgLy8gT3RoZXJ3aXNlLCBkZWNlbGVyYXRlIGF0IGEgc3RhbmRhcmQgcmF0ZVxyXG4gIGlmICh0aGlzLmxlZnREb3duIHx8IHRoaXMucmlnaHREb3duKSB7XHJcbiAgICBpZiAodGhpcy5yaWdodERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCArPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5sZWZ0RG93bikge1xyXG4gICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPj0gLXRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoKCF0aGlzLnVwRG93biAmJiAhdGhpcy5kb3duRG93bikgfHwgKCF0aGlzLmN0cmxEb3duICYmIE1hdGguYWJzKHRoaXMuc3BlZWQpID4gdGhpcy5NQVhfTk9STUFMX1NQRUVEKSkge1xyXG4gICAgaWYgKHNwZWVkID4gLTAuMDEgJiYgc3BlZWQgPCAwLjAxKSB7XHJcbiAgICAgIHNwZWVkID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNwZWVkIC89IGRlY2VsZXJhdGlvbjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICgoIWxlZnREb3duICYmICFyaWdodERvd24pIHx8ICghY3RybERvd24gJiYgTWF0aC5hYnMoaG9yaXpvbnRhbFNwZWVkKSA+IE1BWF9OT1JNQUxfU1BFRUQpKSB7XHJcbiAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPiAtMC4wMSAmJiB0aGlzLmhvcml6b250YWxTcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLz0gdGhpcy5kZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBvcHRpbWl6YXRpb24gLSBvbmx5IGlmIHRoZSBjYXIgaXMgbW92aW5nIHNob3VsZCB3ZSBzcGVuZFxyXG4gIC8vIHRpbWUgcmVzZXR0aW5nIHRoZSBtYXBcclxuICBpZiAodGhpcy5zcGVlZCAhPSAwIHx8IHRoaXMuaG9yaXpvbnRhbFNwZWVkICE9IDApIHtcclxuICAgIHZhciBuZXdMYXQgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sYXQoKSArICh0aGlzLnNwZWVkIC8gdGhpcy5sYXRpdHVkZVNwZWVkRmFjdG9yKTtcclxuICAgIHZhciBuZXdMbmcgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sbmcoKSArICh0aGlzLmhvcml6b250YWxTcGVlZCAvIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKG5ld0xhdCwgbmV3TG5nKTtcclxuICAgIHRoaXMubWFwLnNldENlbnRlcih0aGlzLm1hcENlbnRlcik7XHJcblxyXG4gIH1cclxuXHJcbiAgcm90YXRlQ2FyLmNhbGwodGhpcyk7XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICByb3RhdGVBcnJvdy5jYWxsKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvUGVlcihvdGhlclVzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd0cnlpbmcgdG8gY29ubmVjdCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICB2YXIgcGVlckpzQ29ubmVjdGlvbiA9IHRoaXMucGVlci5jb25uZWN0KG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignb3BlbicsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gb3BlbicpO1xyXG4gICAgY29ubmVjdGVkVG9QZWVyLmNhbGwodGhpcywgcGVlckpzQ29ubmVjdGlvbik7XHJcbiAgfSk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiUEVFUkpTIEVSUk9SOiBcIik7XHJcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgdGhyb3cgXCJQZWVySlMgY29ubmVjdGlvbiBlcnJvclwiO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0ZWRUb1BlZXIocGVlckpzQ29ubmVjdGlvbikge1xyXG4gIHZhciBvdGhlclVzZXJQZWVySWQgPSBwZWVySnNDb25uZWN0aW9uLnBlZXI7XHJcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBjb25uZWN0ZWQgdG8gdGhpcyB1ZXNyLFxyXG4gIC8vIGFkZCB0aGUgSFRNTCBmb3IgdGhlIG5ldyB1c2VyXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uLmNhbGwodGhpcywgcGVlckpzQ29ubmVjdGlvbiwgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGFzc2lnblVzZXJUb1RlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gICAgY3JlYXRlT3RoZXJVc2VyQ2FyLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVPdGhlclVzZXJDYXIob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlcklkID0gb3RoZXJVc2VyUGVlcklkO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLmNhciA9IHt9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25Vc2VyVG9UZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIGlmIHRoZSB1c2VyIGlzIGFscmVhZHkgb24gYSB0ZWFtLCBpZ25vcmUgdGhpc1xyXG4gIGlmIChpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpIHx8XHJcbiAgICBpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVzZXJPYmplY3QgPSB7XHJcbiAgICBwZWVySWQ6IG90aGVyVXNlclBlZXJJZCxcclxuICAgIHVzZXJuYW1lOiBudWxsXHJcbiAgfTtcclxuICAvLyBmb3Igbm93LCBqdXN0IGFsdGVybmF0ZSB3aG8gZ29lcyBvbiBlYWNoIHRlYW1cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggPiB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGgpIHtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSS5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5wdXNoKHVzZXJPYmplY3QpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNVc2VyT25UZWFtKHBlZXJJZCwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlck9iamVjdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHVzZXJPYmplY3RzQXJyYXlbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1JblVJKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjNjY3Jyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAncmVkJyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NicpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uKHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0pIHtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdID0ge307XHJcbiAgfVxyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24gPSBwZWVySnNDb25uZWN0aW9uO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24ub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnY2xvc2luZyBjb25uZWN0aW9uJyk7XHJcbiAgICBvdGhlclVzZXJEaXNjb25uZWN0ZWQuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH0pO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24ub24oJ2RhdGEnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBkYXRhUmVjZWl2ZWQuY2FsbCh0aGlzLCBkYXRhKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmFkZUFycm93VG9JbWFnZShpbWFnZUZpbGVOYW1lKSB7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cignc3JjJywgJ2ltYWdlcy8nICsgaW1hZ2VGaWxlTmFtZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckRpc2Nvbm5lY3RlZChvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBzaG91bGQgYmUgY2FsbGVkIGFmdGVyIHRoZSBwZWVySnMgY29ubmVjdGlvblxyXG4gIC8vIGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgcmVtb3ZlVXNlckZyb21UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICByZW1vdmVVc2VyRnJvbVVJLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gcmVtb3ZlIHRoaXMgdXNlciBmcm9tIHRoZSBnYW1lIGluIEZpcmViYXNlOlxyXG4gIG1hdGNobWFrZXJUb3duLnJlbW92ZVBlZXJGcm9tR2FtZShnYW1lSWQsIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIGlmICh0aGlzLmhvc3RQZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAvLyBpZiB0aGF0IHVzZXIgd2FzIHRoZSBob3N0LCBzZXQgdXMgYXMgdGhlIG5ldyBob3N0XHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSB0aGlzLnBlZXIuaWQ7XHJcbiAgICBzd2l0Y2hUb05ld0hvc3QuY2FsbCh0aGlzLCB0aGlzLmdhbWVJZCwgdGhpcy5wZWVyLmlkKTtcclxuICB9XHJcblxyXG4gIC8vIGlmIHRoZSB1c2VyIHdobyBkaXNjb25uZWN0ZWQgY3VycmVudGx5IGhhZCBhbiBpdGVtLFxyXG4gIC8vIHB1dCBvdXQgYSBuZXcgb25lXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gb3RoZXJVc2VyUGVlcklkICYmIHRoaXMuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICB9XHJcblxyXG4gIC8vIGRlbGV0ZSB0aGF0IHVzZXIncyBkYXRhXHJcbiAgZGVsZXRlIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdO1xyXG5cclxuICAvLyBpZiB0aGVyZSBhbnkgdXNlcnMgbGVmdCwgYnJvYWRjYXN0IHRoZW0gdGhlIG5ldyBnYW1lIHN0YXRlXHJcbiAgaWYgKE9iamVjdC5rZXlzKHRoaXMub3RoZXJVc2VycykubGVuZ3RoID4gMCkge1xyXG4gICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycy5jYWxsKHRoaXMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3dhaXRpbmcgZm9yIGEgc211Z2dsZXIgdG8gYmF0dGxlLi4uJyk7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21UZWFtKHVzZXJQZWVySWQpIHtcclxuICBmb3IgKHZhciBpID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHVzZXJQZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5zcGxpY2UoaSwgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGogPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnBlZXJJZCA9PSB1c2VyUGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLnNwbGljZShqLCAxKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tVUkocGVlcklkKSB7XHJcbiAgLy8gcmVtb3ZlIHRoZSBvdGhlciB1c2VyJ3MgY2FyIGZyb20gdGhlIG1hcFxyXG4gIHRoaXMub3RoZXJVc2Vyc1twZWVySWRdLmNhci5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG5cclxuICAvLyBpZiB0aGVpciB0ZWFtIGhhcyBubyBtb3JlIHVzZXJzLCBncmV5IG91dFxyXG4gIC8vIHRoZWlyIHNjb3JlIGJveFxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnb3BhY2l0eScsICcwLjMnKTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyQ2hhbmdlZExvY2F0aW9uKGxhdCwgbG5nKSB7XHJcbiAgc2V0R2FtZVRvTmV3TG9jYXRpb24uY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGJyb2FkY2FzdEdhbWVTdGF0ZS5jYWxsKHRoaXMsIHVzZXIpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGF0YVJlY2VpdmVkKGRhdGEpIHtcclxuICBpZiAoZGF0YS5wZWVySWQpIHtcclxuICAgIC8vIGlmIHdlIGFyZSB0aGUgaG9zdCwgYW5kIHRoZSB1c2VyIHdobyBzZW50IHRoaXMgZGF0YSBoYXNuJ3QgYmVlbiBnaXZlbiB0aGUgaW5pdGlhbCBnYW1lXHJcbiAgICAvLyBzdGF0ZSwgdGhlbiBicm9hZGNhc3QgaXQgdG8gdGhlbVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0gJiYgIXRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0uaGFzQmVlbkluaXRpYWxpemVkICYmIGhvc3RQZWVySWQgPT0gcGVlci5pZCkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgIC8vIG5vdCBzdXJlIGlmIHdlIHNob3VsZCBkbyB0aGlzIG9yIG5vdCwgYnV0IGF0IGxlYXN0IGl0IHJlc2V0cyB0aGUgZ2FtZVxyXG4gICAgICAvLyBzdGF0ZSB0byB3aGF0IHdlLCB0aGUgaG9zdCwgdGhpbmsgaXQgaXNcclxuICAgICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycygpO1xyXG4gICAgICAvLyBpZiBub3QgdGhhdCwgdGhlbiB3ZSBzaG91bGQganVzdCBicm9hZGNhc3QgdG8gdGhlIG5ldyBndXkgbGlrZSB0aGlzOlxyXG4gICAgICAvLyBicm9hZGNhc3RHYW1lU3RhdGUoZGF0YS5wZWVySWQpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5sYXN0VXBkYXRlVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5ldmVudCkge1xyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAndXBkYXRlX2dhbWVfc3RhdGUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogdXBkYXRlIGdhbWUgc3RhdGUnKTtcclxuICAgICAgLy8gd2Ugb25seSB3YW50IHRvIHJlY2VudGVyIHRoZSBtYXAgaW4gdGhlIGNhc2UgdGhhdCB0aGlzIGlzIGEgbmV3IHVzZXJcclxuICAgICAgLy8gam9pbmluZyBmb3IgdGhlIGZpcnN0IHRpbWUsIGFuZCB0aGUgd2F5IHRvIHRlbGwgdGhhdCBpcyB0byBzZWUgaWYgdGhlXHJcbiAgICAgIC8vIGluaXRpYWwgbG9jYXRpb24gaGFzIGNoYW5nZWQuICBPbmNlIHRoZSB1c2VyIGlzIGFscmVhZHkgam9pbmVkLCBpZiBhXHJcbiAgICAgIC8vIGxvY2F0aW9uIGNoYW5nZSBpcyBpbml0aWF0ZWQsIHRoYXQgd2lsbCB1c2UgdGhlICduZXdfbG9jYXRpb24nIGV2ZW50IFxyXG4gICAgICBpZiAocGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpICE9IHBhcnNlRmxvYXQoZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCkgfHxcclxuICAgICAgICBwYXJzZUZsb2F0KGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykgIT0gcGFyc2VGbG9hdChnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSkge1xyXG4gICAgICAgIG1hcC5zZXRDZW50ZXIobmV3IGdvb2dsZS5tYXBzLkxhdExuZyhcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCxcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpO1xyXG4gICAgICB9XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0ID0gZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdDtcclxuICAgICAgLy8gbmVlZCB0byBtYWtlIHRoaXMgY2FsbCBiZWNhdXNlIHdlIGNhbiBiZSBpbiBhIHNpdHVhdGlvbiB3aGVyZSB0aGUgaG9zdFxyXG4gICAgICAvLyBkb2Vzbid0IGtub3cgb3VyIHVzZXJuYW1lIHlldCwgc28gd2UgbmVlZCB0byBtYW51YWxseSBzZXQgaXQgaW4gb3VyXHJcbiAgICAgIC8vIG93biBVSSBmaXJzdC5cclxuICAgICAgdXBkYXRlVXNlcm5hbWUocGVlci5pZCwgdXNlcm5hbWUpO1xyXG4gICAgICB1cGRhdGVVSVdpdGhOZXdHYW1lU3RhdGUoKTtcclxuICAgICAgYXNzaWduTXlUZWFtQmFzZSgpO1xyXG4gICAgICB1cGRhdGVDYXJJY29ucygpO1xyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2xvY2F0aW9uJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IG5ldyBsb2NhdGlvbiAnICsgZGF0YS5ldmVudC5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxuZyk7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lm9yaWdpbmF0aW5nX3BlZXJfaWQgIT0gcGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbihkYXRhLmV2ZW50LmxhdCwgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV9jb2xsZWN0ZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSBjb2xsZWN0ZWQgYnkgJyArIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtICE9IHBlZXIuaWQpIHtcclxuICAgICAgICBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2l0ZW0nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGl0ZW0gYXQgJyArXHJcbiAgICAgICAgZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyArXHJcbiAgICAgICAgJyB3aXRoIGlkICcgKyBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHNvbWVvbmUgZWxzZSBjYXVzZWQgdGhlIG5ldyBpdGVtIHBsYWNlbWVudC5cclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGRpZCBpdCwgaXQgd2FzIGFscmVhZHkgcGxhY2VkXHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lmhvc3RfdXNlciAmJiBkYXRhLmV2ZW50Lmhvc3RfdXNlciAhPSBwZWVyLmlkKSB7XHJcbiAgICAgICAgdmFyIGl0ZW1Mb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQsIGRhdGEuZXZlbnQubG9jYXRpb24ubG5nKTtcclxuICAgICAgICBwdXROZXdJdGVtT25NYXAoaXRlbUxvY2F0aW9uLCBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fcmV0dXJuZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSByZXR1cm5lZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSArICcgd2hpY2ggZ2l2ZXMgdGhlbSAnICsgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSAhPSBwZWVyLmlkKSB7XHJcbiAgICAgICAgdGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgdGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICBvdGhlclVzZXJSZXR1cm5lZEl0ZW0oZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0sIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fdHJhbnNmZXJyZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSAnICsgZGF0YS5ldmVudC5pZCArICcgdHJhbnNmZXJyZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC5mcm9tVXNlclBlZXJJZCArICcgdG8gdXNlciAnICsgZGF0YS5ldmVudC50b1VzZXJQZWVySWQpO1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gZGF0YS5ldmVudC50b1VzZXJQZWVySWQ7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnRvVXNlclBlZXJJZCA9PSBwZWVyLmlkKSB7XHJcbiAgICAgICAgLy8gdGhlIGl0ZW0gd2FzIHRyYW5zZmVycmVkIHRvIHRoaXMgdXNlclxyXG4gICAgICAgIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICAgICAgICBpZDogZGF0YS5ldmVudC5pZCxcclxuICAgICAgICAgIGxvY2F0aW9uOiBudWxsXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aW1lT2ZMYXN0VHJhbnNmZXIgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzb21lb25lIHRyYW5zZmVycmVkIGF0ICcgKyB0aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gICAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtKGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNldCB0aGUgYXJyb3cgdG8gcG9pbnQgdG8gdGhlIG5ldyB1c2VyIHdobyBoYXMgdGhlIGl0ZW1cclxuICAgICAgICBkZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1tkYXRhLmV2ZW50LnRvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciBzZW50IGEgdXNlcm5hbWUgdGhhdCB3ZSBoYXZlbid0IHNlZW4geWV0LCBzZXQgaXRcclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS51c2VybmFtZSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS51c2VybmFtZSkge1xyXG4gICAgdXBkYXRlVXNlcm5hbWUoZGF0YS5wZWVySWQsIGRhdGEudXNlcm5hbWUpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEuY2FyTGF0TG5nICYmIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgIG1vdmVPdGhlckNhcih0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLCBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGEuY2FyTGF0TG5nLmxhdCwgZGF0YS5jYXJMYXRMbmcubG5nKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1CYXNlKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtKHBlZXIuaWQpKSB7XHJcbiAgICBteVRlYW1CYXNlTWFwT2JqZWN0ID0gdGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG4gIH0gZWxzZSB7XHJcbiAgICBteVRlYW1CYXNlTWFwT2JqZWN0ID0gdGVhbUNydXNoQmFzZU1hcE9iamVjdDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVzZXJuYW1lKHBlZXJJZCwgdXNlcm5hbWUpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBqID0gMDsgaiA8IGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGorKykge1xyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgfVxyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJV2l0aE5ld0dhbWVTdGF0ZSgpIHtcclxuICAvLyByZWNlbnRlciB0aGUgbWFwXHJcbiAgY29uc29sZS5sb2coJ25ldyBsb2NhdGlvbiByZWNlaXZlZDogJyArIGdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbik7XHJcbiAgbWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0LCBnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKTtcclxuICB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSSgpO1xyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkoKTtcclxuICAvLyBpZiBzb21lb25lIGhhcyB0aGUgaXRlbVxyXG4gIGlmIChnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICBpdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgICAvLyBpZiBJIGhhdmUgdGhlIGl0ZW0sIG1ha2UgdGhlIGRlc3RpbmF0aW9uIG15IHRlYW0ncyBiYXNlXHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBwZWVyLmlkKSB7XHJcbiAgICAgIHNldERlc3RpbmF0aW9uKG15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gYW5vdGhlciB1c2VyIGhhcyB0aGUgaXRlbSwgYnV0IHRoZSBzZXREZXN0aW5hdGlvbiBjYWxsXHJcbiAgICAgIC8vIHdpbGwgYmUgdGFrZW4gY2FyZSBvZiB3aGVuIHRoZSB1c2VyIHNlbmRzIHRoZWlyIGxvY2F0aW9uIGRhdGFcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gaWYgbm9ib2R5IGhhcyB0aGUgaXRlbSwgcHV0IGl0IG9uIHRoZSBtYXAgaW4gdGhlIHJpZ2h0IHBsYWNlLFxyXG4gICAgLy8gYW5kIHNldCB0aGUgbmV3IGl0ZW0gbG9jYXRpb24gYXMgdGhlIGRlc3RpbmF0aW9uXHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCAmJiBnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgIG1vdmVJdGVtT25NYXAoZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQsIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubG5nKTtcclxuICAgIH1cclxuICAgIHNldERlc3RpbmF0aW9uKGl0ZW1NYXBPYmplY3QubG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICB9XHJcbiAgdXBkYXRlU2NvcmVzSW5VSShnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkLCBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgYXNzaWduTXlUZWFtSW5VSSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSSgpIHtcclxuICBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QoXHJcbiAgICBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0KFxyXG4gICAgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubGF0LFxyXG4gICAgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FySWNvbnMoKSB7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMsIHRlYW1Ub3duT3RoZXJDYXJJY29uKTtcclxuICB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucyhnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMsIHRlYW1DcnVzaE90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlTXlDYXJJY29uKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU15Q2FySWNvbigpIHtcclxuICB2YXIgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY3J1c2hfY2FyLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0ocGVlci5pZCkpIHtcclxuICAgIHVzZXJDYXJJbWdTcmMgPSAnaW1hZ2VzL2Nhci5wbmcnO1xyXG4gIH1cclxuICAkKCcjY2FyLWltZycpLmF0dHIoJ3NyYycsIHVzZXJDYXJJbWdTcmMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucyh0ZWFtVXNlcnMsIHRlYW1DYXJJY29uKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZWFtVXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgbWFya2VyXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdICYmIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIgJiYgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0ZWFtVXNlcnNbaV0ucGVlcklkICE9IHBlZXIuaWQpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgICBtYXA6IG1hcCxcclxuICAgICAgICB0aXRsZTogdGVhbVVzZXJzW2ldLnBlZXJJZCxcclxuICAgICAgICBpY29uOiB0ZWFtQ2FySWNvblxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTY29yZXNJblVJKHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCwgdGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCkge1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0ZWFtVG93bk51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlSXRlbU9uTWFwKGxhdCwgbG5nKSB7XHJcbiAgY29uc29sZS5sb2coJ21vdmluZyBpdGVtIHRvIG5ldyBsb2NhdGlvbjogJyArIGxhdCArICcsJyArIGxuZyk7XHJcbiAgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQgPSBsYXQ7XHJcbiAgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcgPSBsbmc7XHJcbiAgaXRlbU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIGl0ZW1NYXBPYmplY3QubWFya2VyLnNldFBvc2l0aW9uKGl0ZW1NYXBPYmplY3QubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJSZXR1cm5lZEl0ZW0ob3RoZXJVc2VyUGVlcklkLCBub3dOdW1JdGVtc0ZvclVzZXIpIHtcclxuICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQodXNlcklzT25Ub3duVGVhbShvdGhlclVzZXJQZWVySWQpKVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UoJ2Fycm93LnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlT3RoZXJDYXIob3RoZXJVc2VyT2JqZWN0LCBuZXdMb2NhdGlvbikge1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiA9IG5ld0xvY2F0aW9uO1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIpIHtcclxuICAgIHVwZGF0ZUNhckljb25zKCk7XHJcbiAgfVxyXG4gIC8vIGlmIHRoZSBvdGhlciBjYXIgaGFzIGFuIGl0ZW0sIHVwZGF0ZSB0aGUgZGVzdGluYXRpb25cclxuICAvLyB0byBiZSBpdFxyXG4gIGlmIChnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IG90aGVyVXNlck9iamVjdC5wZWVySWQpIHtcclxuICAgIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICAgIGlmICh1c2VySXNPbk15VGVhbShvdGhlclVzZXJPYmplY3QucGVlcklkKSkge1xyXG4gICAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbihuZXdMb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG4gIH1cclxuICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQob3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiwgb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCk7XHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIuc2V0UG9zaXRpb24ob3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uTXlUZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBteVRlYW0gPSBudWxsO1xyXG4gIHZhciBvdGhlclVzZXJUZWFtID0gbnVsbDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ3Rvd24nO1xyXG4gICAgfVxyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgICAgb3RoZXJVc2VyVGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgICBvdGhlclVzZXJUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG15VGVhbSA9PSBvdGhlclVzZXJUZWFtO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQob3RoZXJDYXJMb2NhdGlvbiwgb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gaWYgd2UgZG9uJ3Qga25vdyB0aGUgb3RoZXIgY2FyJ3MgbG9jYXRpb24sIG9yIGlmIHRoaXMgaXNuJ3QgdGhlIHVzZXIgd2l0aFxyXG4gIC8vICB0aGUgaXRlbSwgdGhlbiBpZ25vcmUgaXQuIFdlJ2xsIG9ubHkgdHJhbnNmZXIgYW4gaXRlbSBmcm9tIHRoZSBwZXJzcGVjdGVkXHJcbiAgLy8gIG9mIHRoZSB1c2VyIHdpdGggdGhlIGl0ZW1cclxuICBpZiAoIW90aGVyQ2FyTG9jYXRpb24gfHwgIWNvbGxlY3RlZEl0ZW0pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKHRpbWVPZkxhc3RUcmFuc2Zlcikge1xyXG4gICAgdmFyIHRpbWVTaW5jZUxhc3RUcmFuc2ZlciA9ICgobmV3IERhdGUoKSkuZ2V0VGltZSgpKSAtIHRpbWVPZkxhc3RUcmFuc2ZlcjtcclxuICAgIC8vIGlmIG5vdCBlbm91Z2ggdGltZSBoYXMgcGFzc2VkIHNpbmNlIHRoZSBsYXN0IHRyYW5zZmVyLCByZXR1cm5cclxuICAgIGlmICh0aW1lU2luY2VMYXN0VHJhbnNmZXIgPCB0aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG9wdGltaXphdGlvbjogcmVzZXQgdGhpcyBzbyB3ZSBkb24ndCB3YXN0ZSB0aW1lIGNhbGN1bGF0aW5nIGluIHRoZSBmdXR1cmVcclxuICAgICAgdGltZU9mTGFzdFRyYW5zZmVyID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKG1hcENlbnRlciwgb3RoZXJDYXJMb2NhdGlvbik7XHJcbiAgLy8gaWYgdGhpcyB1c2VyICh0aGF0IGhhcyB0aGUgaXRlbSkgaXMgY2xvc2UgZW5vdWdoIHRvIGNhbGwgaXQgYVxyXG4gIC8vIGNvbGxpc2lvbiwgdHJhbnNmZXIgaXQgdG8gdGhlIG90aGVyIHVzZXJcclxuICBpZiAoZGlzdGFuY2UgPCAyMCkge1xyXG4gICAgdHJhbnNmZXJJdGVtKGNvbGxlY3RlZEl0ZW0uaWQsIHBlZXIuaWQsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW0oaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2l0ZW0gJyArIGl0ZW1PYmplY3RJZCArICcgdHJhbnNmZXJyZWQgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIHRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgYnJvYWRjYXN0VHJhbnNmZXJPZkl0ZW0oaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkLCB0aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gIGNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB0b1VzZXJQZWVySWQ7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbSh0b1VzZXJQZWVySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIHNldERlc3RpbmF0aW9uKHRoaXMub3RoZXJVc2Vyc1t0b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtKHVzZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdvdGhlciB1c2VyIGNvbGxlY3RlZCBpdGVtJyk7XHJcbiAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHVzZXJJZDtcclxuICBpdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbSh1c2VySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UoYXJyb3dJbWcpO1xyXG4gIHRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtVG93bkJhc2VJY29uKTtcclxuICB0ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1DcnVzaEJhc2VJY29uKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UoKSB7XHJcbiAgY29uc29sZS5sb2coJ3VzZXIgcmV0dXJuZWQgaXRlbSB0byBiYXNlJyk7XHJcbiAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgZmFkZUFycm93VG9JbWFnZSgnYXJyb3cucG5nJyk7XHJcbiAgaW5jcmVtZW50SXRlbUNvdW50KHVzZXJJc09uVG93blRlYW0ocGVlci5pZCkpO1xyXG4gIGNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uVG93blRlYW0ocGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5jcmVtZW50SXRlbUNvdW50KGlzVGVhbVRvd24pIHtcclxuICBpZiAoaXNUZWFtVG93bikge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkKys7XHJcbiAgICAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpLnRleHQodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKys7XHJcbiAgICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmxhc2hFbGVtZW50KGpxdWVyeUVsZW0pIHtcclxuICBqcXVlcnlFbGVtLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VyQ29sbGlkZWRXaXRoSXRlbShjb2xsaXNpb25JdGVtT2JqZWN0KSB7XHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gY29sbGlzaW9uSXRlbU9iamVjdDtcclxuICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICBjb2xsaXNpb25JdGVtT2JqZWN0LmxvY2F0aW9uID0gbnVsbDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBwZWVyLmlkO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlSWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZUljb24pO1xyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3dfYmx1ZS5wbmcnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0RGVzdGluYXRpb24obG9jYXRpb24sIGFycm93SW1hZ2VOYW1lKSB7XHJcbiAgdGhpcy5kZXN0aW5hdGlvbiA9IGxvY2F0aW9uO1xyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCBhcnJvd0ltYWdlTmFtZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvdGF0ZUNhcigpIHtcclxuICB0aGlzLnJvdGF0aW9uID0gZ2V0QW5nbGUuY2FsbCh0aGlzLCBzcGVlZCwgaG9yaXpvbnRhbFNwZWVkKTtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyAvKiBJRSA5ICovIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsgLyogQ2hyb21lLCBTYWZhcmksIE9wZXJhICovIHRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7JztcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlQXJyb3coKSB7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uID0gY29tcHV0ZUJlYXJpbmdBbmdsZS5jYWxsKHRoaXMsIHRoaXMubWFwQ2VudGVyLmxhdCgpLCB0aGlzLm1hcENlbnRlci5sbmcoKSwgdGhpcy5kZXN0aW5hdGlvbi5sYXQoKSwgdGhpcy5kZXN0aW5hdGlvbi5sbmcoKSk7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzID0gJy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7IC8qIElFIDkgKi8gLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7IC8qIENocm9tZSwgU2FmYXJpLCBPcGVyYSAqLyB0cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7JztcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKHN0ZXApIHtcclxuICBtb3ZlQ2FyLmNhbGwodGhpcyk7XHJcblxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0ICYmIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSkge1xyXG4gICAgLy8gY2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBvbmUgY2FyIHdpdGggYW4gaXRlbSBhbmQgb25lIHdpdGhvdXRcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIC8vIGlmIHRoaXMgdXNlciBoYXMgYW4gaXRlbSwgY2hlY2sgdG8gc2VlIGlmIHRoZXkgYXJlIGNvbGxpZGluZ1xyXG4gICAgICAvLyB3aXRoIGFueSBvdGhlciB1c2VyLCBhbmQgaWYgc28sIHRyYW5zZmVyIHRoZSBpdGVtXHJcbiAgICAgIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICAgICAgdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW3VzZXJdLmNhci5sb2NhdGlvbiwgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJJZCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIGFub3RoZXIgdXNlciBoYXMgYW4gaXRlbSwgYW5kIHRoZWlyIGNhciBoYXMgYSBsb2NhdGlvbixcclxuICAgICAgLy8gdGhlbiBjb25zdGFudGx5IHNldCB0aGUgZGVzdGluYXRpb24gdG8gdGhlaXIgbG9jYXRpb25cclxuICAgICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dICYmIHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmxvY2F0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmNhci5sb2NhdGlvbikge1xyXG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5jYXIubG9jYXRpb247XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGNoZWNrIGlmIHVzZXIgY29sbGlkZWQgd2l0aCBhbiBpdGVtIG9yIHRoZSBiYXNlXHJcbiAgdmFyIGNvbGxpc2lvbk1hcmtlciA9IGdldENvbGxpc2lvbk1hcmtlcigpO1xyXG4gIGlmIChjb2xsaXNpb25NYXJrZXIpIHtcclxuICAgIGlmICghY29sbGVjdGVkSXRlbSAmJiBjb2xsaXNpb25NYXJrZXIgPT0gaXRlbU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgICAgLy8gdXNlciBqdXN0IHBpY2tlZCB1cCBhbiBpdGVtXHJcbiAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtKHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCk7XHJcbiAgICAgIGJyb2FkY2FzdEl0ZW1Db2xsZWN0ZWQodGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmlkKTtcclxuICAgIH0gZWxzZSBpZiAoY29sbGVjdGVkSXRlbSAmJiBjb2xsaXNpb25NYXJrZXIgPT0gbXlUZWFtQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgICAgLy8gdXNlciBoYXMgYW4gaXRlbSBhbmQgaXMgYmFjayBhdCB0aGUgYmFzZVxyXG4gICAgICB1c2VyUmV0dXJuZWRJdGVtVG9CYXNlKCk7XHJcbiAgICAgIGJyb2FkY2FzdEl0ZW1SZXR1cm5lZChwZWVyLmlkKTtcclxuICAgICAgcmFuZG9tbHlQdXRJdGVtcygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYnJvYWRjYXN0TXlDYXJMb2NhdGlvbigpO1xyXG5cclxuICAvLyBpZiB0aGUgZ2FtZSBoYXMgc3RhcnRlZCBhbmQgd2UncmUgdGhlIGhvc3QsIGNoZWNrXHJcbiAgLy8gZm9yIGFueSBwZWVycyB3aG8gaGF2ZW4ndCBzZW50IGFuIHVwZGF0ZSBpbiB0b28gbG9uZ1xyXG4gIGlmIChob3N0UGVlcklkICYmIHBlZXIgJiYgcGVlci5pZCAmJiBob3N0UGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgIGNsZWFudXBBbnlEcm9wcGVkQ29ubmVjdGlvbnMoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3VsZEtlZXBBbGl2ZSgpIHtcclxuICByZXR1cm4gcXMudmFsdWUoa2VlcEFsaXZlUGFyYW1OYW1lKSA9PSAndHJ1ZSc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBBbnlEcm9wcGVkQ29ubmVjdGlvbnMoKSB7XHJcbiAgaWYgKHNob3VsZEtlZXBBbGl2ZSgpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdGltZU5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiBvdGhlclVzZXJzKSB7XHJcbiAgICAvLyBpZiBpdCdzIGJlZW4gbG9uZ2VyIHRoYW4gdGhlIHRpbWVvdXQgc2luY2Ugd2UndmUgaGVhcmQgZnJvbVxyXG4gICAgLy8gdGhpcyB1c2VyLCByZW1vdmUgdGhlbSBmcm9tIHRoZSBnYW1lXHJcbiAgICBpZiAob3RoZXJVc2Vyc1t1c2VyXS5sYXN0VXBkYXRlVGltZSAmJiAodGltZU5vdyAtIG90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgPiBBQ1RJVkVfQ09OTkVDVElPTl9USU1FT1VUX0lOX1NFQ09ORFMpKSB7XHJcbiAgICAgIGNsb3NlUGVlckpzQ29ubmVjdGlvbih1c2VyKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsb3NlUGVlckpzQ29ubmVjdGlvbihvdGhlclVzZXJQZWVySWQpIHtcclxuICBpZiAob3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdICYmIG90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICBvdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5jbG9zZSgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyKGR0KSB7XHJcbiAgJChcIiNjYXItaW1nXCIpLmF0dHIoXCJzdHlsZVwiLCB0aGlzLnJvdGF0aW9uQ3NzKTtcclxuICAkKFwiI2Fycm93LWltZ1wiKS5hdHRyKFwic3R5bGVcIiwgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TXlDYXJMb2NhdGlvbigpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIG90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuICYmIG1hcENlbnRlcikge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgICBjYXJMYXRMbmc6IHtcclxuICAgICAgICAgIGxhdDogbWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICAgICAgbG5nOiBtYXBDZW50ZXIubG5nKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBlZXJJZDogcGVlci5pZCxcclxuICAgICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RHYW1lU3RhdGUob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBnYW1lIHN0YXRlIHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gfHwgIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB1cGRhdGVHYW1lU3RhdGVFdmVudE9iamVjdCA9IHtcclxuICAgIGV2ZW50OiB7XHJcbiAgICAgIG5hbWU6ICd1cGRhdGVfZ2FtZV9zdGF0ZScsXHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0OiB0aGlzLmdhbWVEYXRhXHJcbiAgICB9XHJcbiAgfTtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLnNlbmQodXBkYXRlR2FtZVN0YXRlRXZlbnRPYmplY3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3ROZXdJdGVtKGxvY2F0aW9uLCBpdGVtSWQpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgdmFyIHNpbXBsZUl0ZW1MYXRMbmcgPSB7XHJcbiAgICAgICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgICAgICBsbmc6IGxvY2F0aW9uLmxuZygpXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgICBldmVudDoge1xyXG4gICAgICAgICAgbmFtZTogJ25ld19pdGVtJyxcclxuICAgICAgICAgIGhvc3RfdXNlcjogcGVlci5pZCxcclxuICAgICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICAgIGxhdDogc2ltcGxlSXRlbUxhdExuZy5sYXQsXHJcbiAgICAgICAgICAgIGxuZzogc2ltcGxlSXRlbUxhdExuZy5sbmdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBpZDogaXRlbUlkXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEl0ZW1SZXR1cm5lZCgpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBpdGVtIHJldHVybmVkJyk7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX3JldHVybmVkJyxcclxuICAgICAgICB1c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW06IHBlZXIuaWQsXHJcbiAgICAgICAgbm93X251bV9pdGVtczogdGhpcy5nYW1lRGF0YS50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkLFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEl0ZW1Db2xsZWN0ZWQoaXRlbUlkKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBpdGVtIGlkICcgKyBpdGVtSWQgKyAnIGNvbGxlY3RlZCBieSB1c2VyICcgKyBwZWVyLmlkKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmdhbWVEYXRhLnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBwZWVyLmlkO1xyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fY29sbGVjdGVkJyxcclxuICAgICAgICBpZDogaXRlbUlkLFxyXG4gICAgICAgIHVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbTogdGhpcy5nYW1lRGF0YS5wZWVySWRPZkNhcldpdGhJdGVtXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0VHJhbnNmZXJPZkl0ZW0oaXRlbUlkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBpdGVtIHRyYW5zZmVycmVkICcgKyBpdGVtSWQgKyAnIGZyb20gJyArIGZyb21Vc2VyUGVlcklkICsgJyB0byAnICsgdG9Vc2VyUGVlcklkKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV90cmFuc2ZlcnJlZCcsXHJcbiAgICAgICAgaWQ6IGl0ZW1JZCxcclxuICAgICAgICBmcm9tVXNlclBlZXJJZDogZnJvbVVzZXJQZWVySWQsXHJcbiAgICAgICAgdG9Vc2VyUGVlcklkOiB0b1VzZXJQZWVySWRcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3ROZXdMb2NhdGlvbihsb2NhdGlvbikge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgbmV3IGxvY2F0aW9uOiAnICsgbG9jYXRpb24ubGF0KCkgKyAnLCcgKyBsb2NhdGlvbi5sbmcoKSk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ25ld19sb2NhdGlvbicsXHJcbiAgICAgICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgICAgICBsbmc6IGxvY2F0aW9uLmxuZygpLFxyXG4gICAgICAgIG9yaWdpbmF0aW5nX3BlZXJfaWQ6IHBlZXIuaWRcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBjaGVja3MgdG8gc2VlIGlmIHRoZXkgaGF2ZSBjb2xsaWRlZCB3aXRoIGVpdGhlciBhbiBpdGVtIG9yIHRoZSBiYXNlXHJcbmZ1bmN0aW9uIGdldENvbGxpc2lvbk1hcmtlcigpIHtcclxuICAvLyBjb21wdXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIG15IGNhciBhbmQgdGhlIGRlc3RpbmF0aW9uXHJcbiAgaWYgKGRlc3RpbmF0aW9uKSB7XHJcbiAgICB2YXIgbWF4RGlzdGFuY2VBbGxvd2VkID0gY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2U7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2VlbihtYXBDZW50ZXIsIGRlc3RpbmF0aW9uKTtcclxuICAgIC8vIFRoZSBiYXNlIGlzIGJpZ2dlciwgc28gYmUgbW9yZSBsZW5pZW50IHdoZW4gY2hlY2tpbmcgZm9yIGEgYmFzZSBjb2xsaXNpb25cclxuICAgIGlmIChkZXN0aW5hdGlvbiA9PSBteVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgIG1heERpc3RhbmNlQWxsb3dlZCA9IGNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgaWYgKGRpc3RhbmNlIDwgbWF4RGlzdGFuY2VBbGxvd2VkKSB7XHJcbiAgICAgIGlmIChkZXN0aW5hdGlvbiA9PSBpdGVtTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgJyArIHBlZXIuaWQgKyAnIGNvbGxpZGVkIHdpdGggaXRlbScpO1xyXG4gICAgICAgIHJldHVybiBpdGVtTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfSBlbHNlIGlmIChkZXN0aW5hdGlvbiA9PSBteVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYgKGNvbGxlY3RlZEl0ZW0pIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyBwZWVyLmlkICsgJyBoYXMgYW4gaXRlbSBhbmQgY29sbGlkZWQgd2l0aCBiYXNlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBteVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0R2FtZVRvTmV3TG9jYXRpb24obGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhLmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZShsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZSgocGFyc2VGbG9hdChsYXQpICsgMC4wMDYpLnRvU3RyaW5nKCksIChwYXJzZUZsb2F0KGxuZykgKyAwLjAwOCkudG9TdHJpbmcoKSk7XHJcbiAgYXNzaWduTXlUZWFtQmFzZSgpO1xyXG4gIG1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIG1hcC5zZXRDZW50ZXIobWFwQ2VudGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QW5nbGUodngsIHZ5KSB7XHJcbiAgcmV0dXJuIChNYXRoLmF0YW4yKHZ5LCB2eCkpICogKDE4MCAvIE1hdGguUEkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlQmVhcmluZ0FuZ2xlKGxhdDEsIGxvbjEsIGxhdDIsIGxvbjIpIHtcclxuICB2YXIgUiA9IDYzNzE7IC8vIGttXHJcbiAgdmFyIGRMYXQgPSAobGF0MiAtIGxhdDEpLnRvUmFkKCk7XHJcbiAgdmFyIGRMb24gPSAobG9uMiAtIGxvbjEpLnRvUmFkKCk7XHJcbiAgdmFyIGxhdDEgPSBsYXQxLnRvUmFkKCk7XHJcbiAgdmFyIGxhdDIgPSBsYXQyLnRvUmFkKCk7XHJcblxyXG4gIHZhciBhbmdsZUluUmFkaWFucyA9IE1hdGguYXRhbjIoTWF0aC5zaW4oZExvbikgKiBNYXRoLmNvcyhsYXQyKSxcclxuICAgIE1hdGguY29zKGxhdDEpICogTWF0aC5zaW4obGF0MikgLSBNYXRoLnNpbihsYXQxKSAqIE1hdGguY29zKGxhdDIpICogTWF0aC5jb3MoZExvbikpO1xyXG4gIHJldHVybiBhbmdsZUluUmFkaWFucy50b0RlZygpO1xyXG59XHJcblxyXG4vLyBrZXkgZXZlbnRzXHJcbmZ1bmN0aW9uIG9uS2V5RG93bihldnQpIHtcclxuICBpZiAoZXZ0LmtleUNvZGUgPT0gMzkpIHtcclxuICAgIHJpZ2h0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgbGVmdERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzgpIHtcclxuICAgIHVwRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSA0MCkge1xyXG4gICAgZG93bkRvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMTcpIHtcclxuICAgIGN0cmxEb3duID0gdHJ1ZTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uS2V5VXAoZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICByaWdodERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICBsZWZ0RG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzgpIHtcclxuICAgIHVwRG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIGRvd25Eb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgY3RybERvd24gPSBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGdhbWUgbG9vcCBoZWxwZXJzXHJcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcclxuICByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZnJhbWUoKSB7XHJcbiAgdGhpcy5ub3cgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLmR0ID0gdGhpcy5kdCArIE1hdGgubWluKDEsICh0aGlzLm5vdyAtIHRoaXMubGFzdCkgLyAxMDAwKTtcclxuICB3aGlsZSAodGhpcy5kdCA+IHRoaXMuc3RlcCkge1xyXG4gICAgdGhpcy5kdCA9IHRoaXMuZHQgLSB0aGlzLnN0ZXA7XHJcbiAgICB1cGRhdGUuY2FsbCh0aGlzLCB0aGlzLnN0ZXApO1xyXG4gIH1cclxuICByZW5kZXIuY2FsbCh0aGlzLCB0aGlzLmR0KTtcclxuICB0aGlzLmxhc3QgPSB0aGlzLm5vdztcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUuY2FsbCh0aGlzLCBmcmFtZSk7XHJcbn1cclxuXHJcbi8vIGRvbid0IHRoaW5rIHdlJ2xsIG5lZWQgdG8gZ28gdG8gdGhlIHVzZXIncyBsb2NhdGlvbiwgYnV0IG1pZ2h0IGJlIHVzZWZ1bFxyXG5mdW5jdGlvbiB0cnlGaW5kaW5nTG9jYXRpb24oKSB7XHJcbiAgLy8gVHJ5IEhUTUw1IGdlb2xvY2F0aW9uXHJcbiAgaWYgKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xyXG4gICAgbmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbihmdW5jdGlvbihwb3NpdGlvbikge1xyXG4gICAgICB2YXIgcG9zID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGUsXHJcbiAgICAgICAgcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZSk7XHJcbiAgICAgIG1hcC5zZXRDZW50ZXIocG9zKTtcclxuICAgICAgbWFwQ2VudGVyID0gcG9zO1xyXG4gICAgfSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGhhbmRsZU5vR2VvbG9jYXRpb24odHJ1ZSk7XHJcbiAgICB9KTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgR2VvbG9jYXRpb25cclxuICAgIGhhbmRsZU5vR2VvbG9jYXRpb24oZmFsc2UpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTm9HZW9sb2NhdGlvbihlcnJvckZsYWcpIHtcclxuICBpZiAoZXJyb3JGbGFnKSB7XHJcbiAgICB2YXIgY29udGVudCA9ICdFcnJvcjogVGhlIEdlb2xvY2F0aW9uIHNlcnZpY2UgZmFpbGVkLic7XHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBjb250ZW50ID0gJ0Vycm9yOiBZb3VyIGJyb3dzZXIgZG9lc25cXCd0IHN1cHBvcnQgZ2VvbG9jYXRpb24uJztcclxuICB9XHJcbn1cclxuXHJcbi8vIFRoaXMgY2FuIGJlIHJlbW92ZWQsIHNpbmNlIGl0IGNhdXNlcyBhbiBlcnJvci4gIGl0J3MganVzdCBhbGxvd2luZ1xyXG4vLyBmb3IgcmlnaHQtY2xpY2tpbmcgdG8gc2hvdyB0aGUgYnJvd3NlcidzIGNvbnRleHQgbWVudS5cclxuZnVuY3Rpb24gc2hvd0NvbnRleHRNZW51KGUpIHtcclxuXHJcbiAgLy8gY3JlYXRlIGEgY29udGV4dG1lbnUgZXZlbnQuXHJcbiAgdmFyIG1lbnVfZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO1xyXG4gIG1lbnVfZXZlbnQuaW5pdE1vdXNlRXZlbnQoXCJjb250ZXh0bWVudVwiLCB0cnVlLCB0cnVlLFxyXG4gICAgZS52aWV3LCAxLCAwLCAwLCAwLCAwLCBmYWxzZSxcclxuICAgIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDIsIG51bGwpO1xyXG5cclxuICAvLyBmaXJlIHRoZSBuZXcgZXZlbnQuXHJcbiAgZS5vcmlnaW5hbFRhcmdldC5kaXNwYXRjaEV2ZW50KG1lbnVfZXZlbnQpO1xyXG59XHJcblxyXG5cclxuLy8gaGFjayB0byBhbGxvdyBmb3IgYnJvd3NlciBjb250ZXh0IG1lbnUgb24gcmlnaHQtY2xpY2tcclxuZnVuY3Rpb24gbW91c2VVcChlKSB7XHJcbiAgaWYgKGUuYnV0dG9uID09IDIpIHsgLy8gcmlnaHQtY2xpY2tcclxuICAgIHRoaXMuc2hvd0NvbnRleHRNZW51KGUpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gJCh3aW5kb3cpLnVubG9hZChmdW5jdGlvbigpIHtcclxuLy8gICBkaXNjb25uZWN0RnJvbUdhbWUoKTtcclxuLy8gfSk7IiwiLyoqXHJcbiAqICBtYXRjaG1ha2VyLmpzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBkZXBzXHJcbiAqL1xyXG4vL3ZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XHJcbi8vdmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcclxuXHJcbi8qKlxyXG4gKiAgZXhwb3J0IGNsYXNzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGNobWFrZXJUb3duO1xyXG5cclxuLyoqXHJcbiAqICBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hdGNobWFrZXJUb3duKSlcclxuICAgIHJldHVybiBuZXcgTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKTtcclxuXHJcbiAgLy8gVGhlIHJvb3Qgb2YgeW91ciBnYW1lIGRhdGEuXHJcbiAgdGhpcy5HQU1FX0xPQ0FUSU9OID0gZmlyZWJhc2VCYXNlVXJsO1xyXG4gIHRoaXMuZ2FtZVJlZiA9IG5ldyBGaXJlYmFzZSh0aGlzLkdBTUVfTE9DQVRJT04pO1xyXG5cclxuICB0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTiA9ICdhdmFpbGFibGVfZ2FtZXMnO1xyXG4gIHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTiA9ICdmdWxsX2dhbWVzJztcclxuICB0aGlzLkFMTF9HQU1FU19MT0NBVElPTiA9ICdnYW1lcyc7XHJcbiAgdGhpcy5NQVhfVVNFUlNfUEVSX0dBTUUgPSA0O1xyXG4gIHRoaXMuR0FNRV9DTEVBTlVQX1RJTUVPVVQgPSAzMCAqIDEwMDA7IC8vIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuICB0aGlzLmpvaW5lZEdhbWUgPSBudWxsO1xyXG4gIHRoaXMubXlXb3JrZXIgPSBudWxsO1xyXG4gIC8vICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcclxuXHJcbn1cclxuLy9pbmhlcml0cyhNYXRjaG1ha2VyVG93biwgRXZlbnRFbWl0dGVyKTtcclxuXHJcbi8qKlxyXG4gKiAgY29ubmVjdCB0byBhIGdhbWVcclxuICovXHJcbk1hdGNobWFrZXJUb3duLnByb3RvdHlwZS5qb2luT3JDcmVhdGVHYW1lID0gZnVuY3Rpb24odXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcy5jYWxsKHRoaXMpO1xyXG4gIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gam9pbiBnYW1lJyk7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlci5jYWxsKHRoaXMpO1xyXG4gIHZhciBhdmFpbGFibGVHYW1lc0RhdGFSZWYgPSBnYW1lUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OKTtcclxuICBhdmFpbGFibGVHYW1lc0RhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAvLyBvbmx5IGpvaW4gYSBnYW1lIGlmIG9uZSBpc24ndCBqb2luZWQgYWxyZWFkeVxyXG4gICAgaWYgKHRoaXMuam9pbmVkR2FtZSA9PSBudWxsKSB7XHJcbiAgICAgIHRoaXMuam9pbmVkR2FtZSA9IC0xO1xyXG4gICAgICBpZiAoZGF0YS52YWwoKSA9PT0gbnVsbCkge1xyXG4gICAgICAgIC8vIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgZ2FtZXMsIHNvIGNyZWF0ZSBvbmVcclxuICAgICAgICB2YXIgZ2FtZURhdGEgPSBjcmVhdGVOZXdHYW1lLmNhbGwodGhpcywgdXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICAgICAgam9pbmVkR2FtZUNhbGxiYWNrLmNhbGwodGhpcywgZ2FtZURhdGEsIHRydWUpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBqc29uT2JqID0gZGF0YS52YWwoKTtcclxuICAgICAgICB2YXIgZ2FtZUlkO1xyXG5cclxuICAgICAgICAvLyBzdHVwaWQgamF2YXNjcmlwdCB3b24ndCB0ZWxsIG1lIGhvdyBtYW55IGdhbWUgZWxlbWVudHNcclxuICAgICAgICAvLyBhcmUgaW4gdGhlIGpzb25PYmosIHNvIGNvdW50IGVtIHVwXHJcbiAgICAgICAgdmFyIG51bUF2YWlsYWJsZUdhbWVzID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgbnVtQXZhaWxhYmxlR2FtZXMrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgY2hpbGQgZ2FtZXMgYW5kIHRyeVxyXG4gICAgICAgIC8vIHRvIGpvaW4gZWFjaCBvbmVcclxuICAgICAgICB2YXIgY291bnRlciA9IDA7XHJcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb25PYmopIHtcclxuICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICAgIGlmIChqc29uT2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgZ2FtZUlkID0ganNvbk9ialtrZXldO1xyXG4gICAgICAgICAgICBnZXRHYW1lTGFzdFVwZGF0ZVRpbWUuY2FsbCh0aGlzLCBnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgZG9uZUdldHRpbmdVcGRhdGVUaW1lLCBjb3VudGVyID09IG51bUF2YWlsYWJsZUdhbWVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiAgcmVtb3ZlIGEgcGVlciBmcm9tIHRoZSBnYW1lXHJcbiAqL1xyXG5mdW5jdGlvbiByZW1vdmVQZWVyRnJvbUdhbWUoZ2FtZUlkLCBwZWVySWQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGlmICghZGF0YS52YWwoKSkge1xyXG4gICAgICAvLyBzb21ldGhpbmcncyB3cm9uZywgcHJvYmFibHkgdGhlIEZpcmViYXNlIGRhdGEgd2FzIGRlbGV0ZWRcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEudmFsKCkuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXJJZCkge1xyXG4gICAgICBmaW5kTmV3SG9zdFBlZXJJZC5jYWxsKHRoaXMsIGdhbWVJZCwgcGVlcklkLCBzd2l0Y2hUb05ld0hvc3QpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4gICAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgZ2FtZS4gU28gdHJpbSBvdXQgdGhlIFxyXG4gICAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuICAgIHZhciBudW1Vc2Vyc0luR2FtZSA9IGRhdGEuY2hpbGQoJ3VzZXJzJykudmFsKCkuY2xlYW4odW5kZWZpbmVkKS5sZW5ndGg7XHJcbiAgICBkYXRhLmNoaWxkKCd1c2VycycpLmZvckVhY2goZnVuY3Rpb24oY2hpbGRTbmFwc2hvdCkge1xyXG4gICAgICAvLyBpZiB3ZSd2ZSBmb3VuZCB0aGUgcmVmIHRoYXQgcmVwcmVzZW50cyB0aGUgZ2l2ZW4gcGVlciwgcmVtb3ZlIGl0XHJcbiAgICAgIGlmIChjaGlsZFNuYXBzaG90LnZhbCgpICYmIGNoaWxkU25hcHNob3QudmFsKCkucGVlcklkID09IHRoaXMucGVlcklkKSB7XHJcbiAgICAgICAgY2hpbGRTbmFwc2hvdC5yZWYoKS5yZW1vdmUoKTtcclxuICAgICAgICAvLyBpZiB0aGlzIHVzZXIgd2FzIHRoZSBsYXN0IG9uZSBpbiB0aGUgZ2FtZSwgbm93IHRoZXJlIGFyZSAwLCBcclxuICAgICAgICAvLyBzbyBkZWxldGUgdGhlIGdhbWVcclxuICAgICAgICBpZiAobnVtVXNlcnNJbkdhbWUgPT0gMSkge1xyXG4gICAgICAgICAgZGVsZXRlR2FtZS5jYWxsKHRoaXMsIGdhbWVJZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGlmIGl0IHdhcyBmdWxsLCBub3cgaXQgaGFzIG9uZSBvcGVuIHNsb3QsIHNldCBpdCB0byBhdmFpbGFibGVcclxuICAgICAgICAgIGlmIChudW1Vc2Vyc0luR2FtZSA9PSB0aGlzLk1BWF9VU0VSU19QRVJfR0FNRSkge1xyXG4gICAgICAgICAgICBtb3ZlR2FtZUZyb21GdWxsVG9BdmFpbGFibGUuY2FsbCh0aGlzLCBnYW1lSWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gZG9uZUdldHRpbmdVcGRhdGVUaW1lKGxhc3RVcGRhdGVUaW1lLCBnYW1lSWQsIGlzVGhlTGFzdEdhbWUsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaykge1xyXG4gIC8vIGlmIHRoZSBnYW1lIGlzIHN0aWxsIGFjdGl2ZSBqb2luIGl0XHJcbiAgaWYgKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICBpZiAoIXRoaXMuaXNUaW1lb3V0VG9vTG9uZyhsYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgdGhpcy5qb2luRXhpc3RpbmdHYW1lKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5jYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcygpO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBpZiB3ZSBnb3QgaGVyZSwgYW5kIHRoaXMgaXMgdGhlIGxhc3QgZ2FtZSwgdGhhdCBtZWFucyB0aGVyZSBhcmUgbm8gYXZhaWxhYmxlIGdhbWVzXHJcbiAgLy8gc28gY3JlYXRlIG9uZVxyXG4gIGlmIChpc1RoZUxhc3RHYW1lKSB7XHJcbiAgICBjb25zb2xlLmxvZygnbm8gYXZhaWxhYmxlIGdhbWVzIGZvdW5kLCBvbmx5IGluYWN0aXZlIG9uZXMsIHNvIGNyZWF0aW5nIGEgbmV3IG9uZS4uLicpO1xyXG4gICAgdmFyIGdhbWVEYXRhID0gdGhpcy5jcmVhdGVOZXdHYW1lKHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgam9pbmVkR2FtZUNhbGxiYWNrKGdhbWVEYXRhLCB0cnVlKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEdhbWVMYXN0VXBkYXRlVGltZShnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgZG9uZUdldHRpbmdVcGRhdGVUaW1lQ2FsbGJhY2ssIGlzVGhlTGFzdEdhbWUpIHtcclxuICBnYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKGRhdGEudmFsKCkgJiYgZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSkge1xyXG4gICAgICBjb25zb2xlLmxvZygnZm91bmQgdXBkYXRlIHRpbWU6ICcgKyBkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lKVxyXG4gICAgICBkb25lR2V0dGluZ1VwZGF0ZVRpbWVDYWxsYmFjayhkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lLCBnYW1lSWQsIGlzVGhlTGFzdEdhbWUsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjayk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVTZXJ2ZXJQaW5nKCkge1xyXG4gIHRoaXMuc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZSgpO1xyXG4gIHdpbmRvdy5zZXRJbnRlcnZhbCh0aGlzLnNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUsIDEwMDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlcigpIHtcclxuICBpZiAodHlwZW9mKHRoaXMuV29ya2VyKSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgdGhpcy5teVdvcmtlciA9IG5ldyBXb3JrZXIoXCJhc3luY21lc3NhZ2VyLmpzXCIpO1xyXG4gICAgdGhpcy5teVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5wcm9jZXNzTWVzc2FnZUV2ZW50LCBmYWxzZSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNvbnNvbGUubG9nKFwiU29ycnksIHlvdXIgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IFdlYiBXb3JrZXJzLi4uXCIpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsbEFzeW5jQ2xlYW51cEluYWN0aXZlR2FtZXMoKSB7XHJcbiAgLy8gZG8gaXQgb24gYSB3ZWIgd29ya2VyIHRocmVhZFxyXG4gIGlmICh0aGlzLm15V29ya2VyKSB7XHJcbiAgICB0aGlzLm15V29ya2VyLnBvc3RNZXNzYWdlKHtcclxuICAgICAgY21kOiAnY2xlYW51cF9pbmFjdGl2ZV9nYW1lcydcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUoKSB7XHJcbiAgY29uc29sZS5sb2coJ3Bpbmdpbmcgc2VydmVyJyk7XHJcbiAgZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQodGhpcy5qb2luZWRHYW1lKS5jaGlsZCgnbGFzdFVwZGF0ZVRpbWUnKS5zZXQoKG5ldyBEYXRlKCkpLmdldFRpbWUoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBHYW1lcygpIHtcclxuICBjb25zb2xlLmxvZygnY2xlYW5pbmcgdXAgaW5hY3RpdmUgZ2FtZXMnKTtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YVNuYXBzaG90KSB7XHJcbiAgICBkYXRhU25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIHZhciBzaG91bGREZWxldGVHYW1lID0gZmFsc2U7XHJcbiAgICAgIHZhciBnYW1lRGF0YSA9IGNoaWxkU25hcHNob3QudmFsKCk7XHJcbiAgICAgIGlmICghZ2FtZURhdGEpIHtcclxuICAgICAgICBzaG91bGREZWxldGVHYW1lID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoZ2FtZURhdGEudXNlcnMgPT0gbnVsbCB8fCBnYW1lRGF0YS51c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdnYW1lIGhhcyBubyB1c2VycycpO1xyXG4gICAgICAgIHNob3VsZERlbGV0ZUdhbWUgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLmlzVGltZW91dFRvb0xvbmcoZ2FtZURhdGEubGFzdFVwZGF0ZVRpbWUpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJnYW1lIGhhc24ndCBiZWVuIHVwZGF0ZWQgc2luY2UgXCIgKyBnYW1lRGF0YS5sYXN0VXBkYXRlVGltZSk7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlR2FtZSA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzaG91bGREZWxldGVHYW1lKSB7XHJcbiAgICAgICAgdGhpcy5kZWxldGVHYW1lKGNoaWxkU25hcHNob3QubmFtZSgpKTtcclxuICAgICAgICBjaGlsZFNuYXBzaG90LnJlZigpLnJlbW92ZSgpO1xyXG5cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpc1RpbWVvdXRUb29Mb25nKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgaWYgKCFsYXN0VXBkYXRlVGltZSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICB2YXIgY3VycmVudFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIHJldHVybiAoY3VycmVudFRpbWUgLSBsYXN0VXBkYXRlVGltZSA+IHRoaXMuR0FNRV9DTEVBTlVQX1RJTUVPVVQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzTWVzc2FnZUV2ZW50KGV2ZW50KSB7XHJcbiAgc3dpdGNoIChldmVudC5kYXRhKSB7XHJcbiAgICBjYXNlICdjbGVhbnVwX2luYWN0aXZlX2dhbWVzJzpcclxuICAgICAgdGhpcy5jbGVhbnVwR2FtZXMoKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICBicmVhaztcclxuICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBmaW5kTmV3SG9zdFBlZXJJZChnYW1lSWQsIGV4aXN0aW5nSG9zdFBlZXJJZCwgY2FsbGJhY2spIHtcclxuICAvLyByZXNldCB0aGUgaG9zdFBlZXJJZCBzbyBpdCBwcmV2ZW50cyB0aGUgbGVhdmluZyBob3N0J3MgYnJvd3NlclxyXG4gIC8vIGlmIGl0IHRyaWVzIHRvIHN3aXRjaCBhZ2FpbiBiZWZvcmUgdGhpcyBpcyBkb25lXHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLmNoaWxkKCdob3N0UGVlcklkJykucmVtb3ZlKCk7XHJcblxyXG4gIHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIHZhciB1c2VycyA9IGRhdGEuY2hpbGQoJ3VzZXJzJykudmFsKCk7XHJcblxyXG4gICAgLy8gaWYgZm9yIHdoYXRldmVyIHJlYXNvbiB0aGlzIGlzIGNhbGxlZCBhbmQgc29tZXRoaW5nJ3Mgbm90IHJpZ2h0LCBqdXN0XHJcbiAgICAvLyByZXR1cm5cclxuICAgIGlmICghdXNlcnMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHVzZXJzID0gdXNlcnMuY2xlYW4odW5kZWZpbmVkKTtcclxuICAgIGlmICh1c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAodXNlcnNbaV0gJiYgdXNlcnNbaV0ucGVlcklkICE9IGV4aXN0aW5nSG9zdFBlZXJJZCkge1xyXG4gICAgICAgIC8vIHdlJ3ZlIGZvdW5kIGEgbmV3IHVzZXIgdG8gYmUgdGhlIGhvc3QsIHJldHVybiB0aGVpciBpZFxyXG4gICAgICAgIGNhbGxiYWNrKGdhbWVJZCwgdXNlcnNbaV0ucGVlcklkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2FsbGJhY2soZ2FtZUlkLCBudWxsKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3dpdGNoVG9OZXdIb3N0KGdhbWVJZCwgbmV3SG9zdFBlZXJJZCkge1xyXG4gIGlmICghbmV3SG9zdFBlZXJJZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5zZXQobmV3SG9zdFBlZXJJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlbGV0ZUdhbWUoZ2FtZUlkKSB7XHJcbiAgdGhpcy5yZW1vdmVHYW1lRnJvbUF2YWlsYWJsZUdhbWVzKGdhbWVJZCk7XHJcbiAgdGhpcy5yZW1vdmVHYW1lRnJvbUZ1bGxHYW1lcyhnYW1lSWQpO1xyXG4gIHRoaXMucmVtb3ZlR2FtZShnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHYW1lKGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3R2FtZSh1c2VybmFtZSwgcGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2NyZWF0aW5nIG5ldyBnYW1lJyk7XHJcbiAgdmFyIGdhbWVJZCA9IHRoaXMuY3JlYXRlTmV3R2FtZUlkKCk7XHJcbiAgdmFyIGdhbWVEYXRhID0ge1xyXG4gICAgaWQ6IGdhbWVJZCxcclxuICAgIGhvc3RQZWVySWQ6IHBlZXJJZCxcclxuICAgIHVzZXJzOiBbe1xyXG4gICAgICBwZWVySWQ6IHBlZXJJZCxcclxuICAgICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgICB9XVxyXG4gIH1cclxuICB2YXIgbmV3R2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgbmV3R2FtZURhdGFSZWYuc2V0KGdhbWVEYXRhKTtcclxuICB2YXIgbmV3QXZhaWxhYmxlR2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgbmV3QXZhaWxhYmxlR2FtZURhdGFSZWYuc2V0KGdhbWVJZCk7XHJcbiAgdGhpcy5qb2luZWRHYW1lID0gZ2FtZUlkO1xyXG4gIHRoaXMuaW5pdGlhbGl6ZVNlcnZlclBpbmcoKTtcclxuICByZXR1cm4gZ2FtZURhdGE7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOZXdHYW1lSWQoKSB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSB0aGlzIHdpdGggc29tZXRoaW5nIHRoYXQgd29uJ3RcclxuICAvLyBhY2NpZGVudGFsbHkgaGF2ZSBjb2xsaXNpb25zXHJcbiAgcmV0dXJuIGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBqb2luRXhpc3RpbmdHYW1lKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgLy8gaWYgYSBnYW1lIGhhcyBhbHJlYWR5IGJlZW4gam9pbmVkIG9uIGFub3RoZXIgdGhyZWFkLCBkb24ndCBqb2luIGFub3RoZXIgb25lXHJcbiAgaWYgKHRoaXMuam9pbmVkR2FtZSAmJiB0aGlzLmpvaW5lZEdhbWUgPj0gMCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLmpvaW5lZEdhbWUgPSBnYW1lSWQ7XHJcbiAgdGhpcy5hc3luY0dldEdhbWVEYXRhKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCB0aGlzLmRvbmVHZXR0aW5nR2FtZURhdGEpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gYXN5bmNHZXRHYW1lRGF0YShnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgZG9uZUdldHRpbmdHYW1lRGF0YUNhbGxiYWNrKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZG9uZUdldHRpbmdHYW1lRGF0YUNhbGxiYWNrKGRhdGEsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjayk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nR2FtZURhdGEoZ2FtZURhdGFTbmFwc2hvdCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgdmFyIGdhbWVEYXRhID0gZ2FtZURhdGFTbmFwc2hvdC52YWwoKTtcclxuICB2YXIgbmV3VXNlciA9IHtcclxuICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgfTtcclxuICAvLyB3ZWlyZG5lc3M6IGkgd2FudCB0byBqdXN0IHB1c2ggbmV3VXNlciBvbnRvIGdhbWVEYXRhLnVzZXJzLCBidXRcclxuICAvLyB0aGF0IG1lc3NlcyB1cCB0aGUgYXJyYXkgSSBndWVzc1xyXG4gIHZhciB1c2Vyc0FycmF5ID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGdhbWVEYXRhLnVzZXJzW2ldKSB7XHJcbiAgICAgIHVzZXJzQXJyYXkucHVzaChnYW1lRGF0YS51c2Vyc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVzZXJzQXJyYXkucHVzaChuZXdVc2VyKTtcclxuICBnYW1lRGF0YS51c2VycyA9IHVzZXJzQXJyYXk7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gZ2FtZURhdGFTbmFwc2hvdC5yZWYoKTtcclxuICBnYW1lRGF0YVJlZi5zZXQoZ2FtZURhdGEpO1xyXG4gIGNvbnNvbGUubG9nKCdqb2luaW5nIGdhbWUgJyArIGdhbWVEYXRhLmlkKTtcclxuICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuICBpZiAodXNlcnNBcnJheS5sZW5ndGggPT0gdGhpcy5NQVhfVVNFUlNfUEVSX0dBTUUpIHtcclxuICAgIHRoaXMuc2V0R2FtZVRvRnVsbChnYW1lRGF0YS5pZCk7XHJcbiAgfVxyXG4gIHZhciBwZWVySWRzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBqID0gMDsgaiA8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBwZWVySWRzQXJyYXkucHVzaChnYW1lRGF0YS51c2Vyc1tqXS5wZWVySWQpO1xyXG4gIH1cclxuICBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrKHBlZXJJZHNBcnJheSk7XHJcbiAgdGhpcy5pbml0aWFsaXplU2VydmVyUGluZygpO1xyXG4gIGpvaW5lZEdhbWVDYWxsYmFjayhnYW1lRGF0YSwgZmFsc2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRHYW1lVG9GdWxsKGdhbWVJZCkge1xyXG4gIHRoaXMucmVtb3ZlR2FtZUZyb21BdmFpbGFibGVHYW1lcyhnYW1lSWQpO1xyXG4gIHRoaXMuYWRkR2FtZVRvRnVsbEdhbWVzTGlzdChnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHYW1lRnJvbUF2YWlsYWJsZUdhbWVzKGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkR2FtZVRvRnVsbEdhbWVzTGlzdChnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lUmVmLmNoaWxkKHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZUdhbWVGcm9tRnVsbFRvQXZhaWxhYmxlKGdhbWVJZCkge1xyXG4gIHRoaXMucmVtb3ZlR2FtZUZyb21GdWxsR2FtZXMoZ2FtZUlkKTtcclxuICB0aGlzLmFkZEdhbWVUb0F2YWlsYWJsZUdhbWVzTGlzdChnYW1lSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVHYW1lRnJvbUZ1bGxHYW1lcyhnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lUmVmLmNoaWxkKHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkR2FtZVRvQXZhaWxhYmxlR2FtZXNMaXN0KGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IGdhbWVSZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYuc2V0KGdhbWVJZCk7XHJcbn1cclxuXHJcblxyXG4vLyAvLyByZXR1cm5zIG51bGwgaWYgdGhlIHVzZXIgd2Fzbid0IGZvdW5kIGluIHRoZSBnYW1lXHJcbi8vIGZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tR2FtZURhdGEocGVlcklkLCBnYW1lRGF0YSkge1xyXG4vLyAgIC8vIGlmIHNvbWV0aGluZydzIHdyb25nLCBqdXN0IHJldHVyblxyXG4vLyAgIGlmICghZ2FtZURhdGEgfHwgIWdhbWVEYXRhLnVzZXJzKSB7XHJcbi8vICAgICByZXR1cm4gbnVsbDtcclxuLy8gICB9XHJcblxyXG4vLyAgIC8vIFRPRE86IEZpcmViYXNlIGhhcyBhIGJldHRlciB3YXkgb2YgZG9pbmcgdGhpc1xyXG4vLyAgIHZhciBmb3VuZFBlZXIgPSBmYWxzZTtcclxuXHJcbi8vICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbi8vICAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgZ2FtZS4gU28gdHJpbSBvdXQgdGhlIFxyXG4vLyAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbi8vICAgZ2FtZURhdGEudXNlcnMgPSBnYW1lRGF0YS51c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG5cclxuLy8gICB1c2Vyc1dpdGhvdXRQZWVyID0gW107XHJcbi8vICAgZm9yIChpID0gMDsgaSA8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbi8vICAgICBpZiAoZ2FtZURhdGEudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4vLyAgICAgICBmb3VuZFBlZXIgPSB0cnVlO1xyXG4vLyAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgdXNlcnNXaXRob3V0UGVlci5wdXNoKGdhbWVEYXRhLnVzZXJzW2ldKTtcclxuLy8gICAgIH1cclxuLy8gICB9XHJcblxyXG4vLyAgIGlmIChmb3VuZFBlZXIpIHtcclxuLy8gICAgIGdhbWVEYXRhLnVzZXJzID0gdXNlcnNXaXRob3V0UGVlcjtcclxuLy8gICAgIHJldHVybiBnYW1lRGF0YTtcclxuLy8gICB9IGVsc2Uge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfSJdfQ==
