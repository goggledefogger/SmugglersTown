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
  this.frame = this.frame.bind(this);

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
  requestAnimationFrame(this.frame);
}

SmugglersTown.prototype.frame = function() {
  this.now = timestamp.call(this);
  this.dt = this.dt + Math.min(1, (this.now - this.last) / 1000);
  while (this.dt > this.step) {
    this.dt = this.dt - this.step;
    update.call(this, this.step);
  }
  render.call(this, this.dt);
  this.last = this.now;
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

  $(document).keydown(onKeyDown);
  $(document).keyup(onKeyUp);
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
    broadcastNewLocation.call(this, this.mapCenter);
    randomlyPutItems.call(this);
  });
  window.onbeforeunload = disconnectFromGame;
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
    if (this.speed > -0.01 && this.speed < 0.01) {
      this.speed = 0;
    } else {
      this.speed /= this.deceleration;
    }
  }

  if ((!this.leftDown && !this.rightDown) || (!this.ctrlDown && Math.abs(this.horizontalSpeed) > this.MAX_NORMAL_SPEED)) {
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
  this.rotation = getAngle.call(this, this.speed, this.horizontalSpeed);
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
  var collisionMarker = getCollisionMarker.call(this);
  if (collisionMarker) {
    if (!collectedItem && collisionMarker == this.itemMapObject.marker) {
      // user just picked up an item
      userCollidedWithItem.call(this, this.gameDataObject.itemObject);
      broadcastItemCollected.call(this, this.gameDataObject.itemObject.id);
    } else if (this.collectedItem && collisionMarker == this.myTeamBaseMapObject.marker) {
      // user has an item and is back at the base
      userReturnedItemToBase.call(this);
      broadcastItemReturned.call(this, this.peer.id);
      randomlyPutItems.call(this);
    }
  }

  broadcastMyCarLocation.call(this);

  // if the game has started and we're the host, check
  // for any peers who haven't sent an update in too long
  if (this.hostPeerId && this.peer && this.peer.id && this.hostPeerId == this.peer.id) {
    cleanupAnyDroppedConnections.call(this);
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
  for (var user in this.otherUsers) {
    if (this.otherUsers[user].peerJsConnection && this.otherUsers[user].peerJsConnection.open && this.mapCenter) {
      this.otherUsers[user].peerJsConnection.send({
        carLatLng: {
          lat: this.mapCenter.lat(),
          lng: this.mapCenter.lng()
        },
        peerId: this.peer.id,
        username: this.username
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
  if (this.destination) {
    var maxDistanceAllowed = this.carToItemCollisionDistance;
    var distance = google.maps.geometry.spherical.computeDistanceBetween(this.mapCenter, this.destination);
    // The base is bigger, so be more lenient when checking for a base collision
    if (this.destination == this.myTeamBaseMapObject.location) {
      maxDistanceAllowed = this.carToBaseCollisionDistance;
    }
    if (distance < maxDistanceAllowed) {
      if (this.destination == this.itemMapObject.location) {
        console.log('user ' + this.peer.id + ' collided with item');
        return this.itemMapObject.marker;
      } else if (this.destination == this.myTeamBaseMapObject.location) {
        if (this.collectedItem) {
          console.log('user ' + this.peer.id + ' has an item and collided with base');
        }
        return this.myTeamBaseMapObject.marker;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvaW5kZXguanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9tYXBnYW1lLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWF0Y2htYWtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3akRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFNtdWdnbGVyc1Rvd24gPSByZXF1aXJlKCcuL21hcGdhbWUuanMnKTtcclxuXHJcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGdhbWUgPSBuZXcgU211Z2dsZXJzVG93bignaHR0cHM6Ly9zbXVnZ2xlcnN0b3duLmZpcmViYXNlaW8uY29tLycpO1xyXG59KTsiLCIvKiBZT1VSIFNNVUdHTEVSIE1JU1NJT04sIElGIFlPVSBDSE9PU0UgVE8gQUNDRVBULCBJUyBUTyBKT0lOIFRFQU1cclxuICogVE9XTiBBTkQgVFJZIFRPIERFRkVBVCBURUFNIENSVVNILiAgQU5EIFlPVSBNVVNUIEFDQ0VQVC4uLlxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgbWFwZ2FtZS5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZGVwc1xyXG4gKi9cclxuLy92YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xyXG4vL3ZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBNYXRjaG1ha2VyVG93biA9IHJlcXVpcmUoJy4vbWF0Y2htYWtlci5qcycpO1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gU211Z2dsZXJzVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFNtdWdnbGVyc1Rvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcblxyXG4gIC8vIGJpbmQgcHVibGljIGNhbGxiYWNrIGZ1bmN0aW9uc1xyXG4gIHRoaXMuaW5pdGlhbGl6ZSA9IHRoaXMuaW5pdGlhbGl6ZS5iaW5kKHRoaXMpO1xyXG4gIHRoaXMuZnJhbWUgPSB0aGlzLmZyYW1lLmJpbmQodGhpcyk7XHJcblxyXG4gIHRoaXMua2VlcEFsaXZlUGFyYW1OYW1lID0gJ2tlZXBhbGl2ZSc7XHJcbiAgdGhpcy5xcyA9IG5ldyBRdWVyeVN0cmluZygpO1xyXG5cclxuICB0aGlzLm1hdGNobWFrZXJUb3duID0gbmV3IE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCk7XHJcblxyXG4gIHRoaXMubWFwID0gbnVsbDsgLy8gdGhlIG1hcCBjYW52YXMgZnJvbSB0aGUgR29vZ2xlIE1hcHMgdjMgamF2YXNjcmlwdCBBUElcclxuICB0aGlzLm1hcFpvb21MZXZlbCA9IDE4O1xyXG4gIHRoaXMubWFwRGF0YSA9IG51bGw7IC8vIHRoZSBsZXZlbCBkYXRhIGZvciB0aGlzIG1hcCAoYmFzZSBsb2NhdGlvbnMpXHJcblxyXG4gIHRoaXMuaXRlbU1hcE9iamVjdCA9IG51bGw7XHJcbiAgLy8gdGhlIGl0ZW1NYXBPYmplY3Qgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG5cclxuICAvLyBkZWZhdWx0IHRvIHRoZSBncmFuZCBjYW55b24sIGJ1dCB0aGlzIHdpbGwgYmUgbG9hZGVkIGZyb20gYSBtYXAgZmlsZVxyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZygzNi4xNTExMDMsIC0xMTMuMjA4NTY1KTtcclxuXHJcblxyXG5cclxuICAvLyB0ZWFtIGRhdGFcclxuICAvLyB0aGUgdGVhbSBvYmplY3RzIHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIHVzZXJzOiBbe1xyXG4gIC8vICAgICBwZWVySWQ6IDEyMzQ1Njc4OSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdyb3knXHJcbiAgLy8gICB9LCB7XHJcbiAgLy8gICAgIHBlZXJJZDogOTg3NjU0MzIxLFxyXG4gIC8vICAgICB1c2VybmFtZTogJ2hhbSdcclxuICAvLyAgIH1dLFxyXG4gIC8vICAgYmFzZU9iamVjdDoge1xyXG4gIC8vICAgICBsb2NhdGlvbjoge1xyXG4gIC8vICAgICAgIGxhdDogMzQsXHJcbiAgLy8gICAgICAgbG5nOiAtMTMzXHJcbiAgLy8gICAgIH1cclxuICAvLyAgIH0sXHJcbiAgLy8gICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgLy8gfVxyXG4gIHRoaXMudGVhbVRvd25PYmplY3QgPSB7XHJcbiAgICB1c2VyczogW10sXHJcbiAgICBiYXNlT2JqZWN0OiB7XHJcbiAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgbG5nOiAtMTEzLjIwODU2NVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIH07XHJcbiAgdGhpcy50ZWFtQ3J1c2hPYmplY3QgPSB7XHJcbiAgICB1c2VyczogW10sXHJcbiAgICBiYXNlT2JqZWN0OiB7XHJcbiAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgbG5nOiAtMTEzLjIwODU2NVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIH07XHJcblxyXG4gIC8vIGZvciB0aW1lLWJhc2VkIGdhbWUgbG9vcFxyXG4gIHRoaXMubm93O1xyXG4gIHRoaXMuZHQgPSAwO1xyXG4gIHRoaXMubGFzdCA9IHRpbWVzdGFtcC5jYWxsKHRoaXMpO1xyXG4gIHRoaXMuc3RlcCA9IDEgLyA2MDtcclxuXHJcbiAgLy8gdXNlciBkYXRhXHJcbiAgdGhpcy51c2VybmFtZSA9IG51bGw7XHJcblxyXG4gIC8vIGdhbWUgaG9zdGluZyBkYXRhXHJcbiAgdGhpcy5nYW1lSWQgPSBudWxsO1xyXG4gIHRoaXMuaG9zdFBlZXJJZCA9IG51bGw7XHJcblxyXG4gIC8vIGNhciBwcm9wZXJ0aWVzXHJcbiAgdGhpcy5yb3RhdGlvbiA9IDA7XHJcbiAgdGhpcy5kZWNlbGVyYXRpb24gPSAxLjE7XHJcbiAgdGhpcy5NQVhfTk9STUFMX1NQRUVEID0gMTg7XHJcbiAgdGhpcy5NQVhfQk9PU1RfU1BFRUQgPSA0MDtcclxuICB0aGlzLkJPT1NUX0ZBQ1RPUiA9IDEuMDc7XHJcbiAgdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFID0gMC41O1xyXG4gIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9OT1JNQUxfU1BFRUQ7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyA9ICcnO1xyXG4gIHRoaXMubGF0aXR1ZGVTcGVlZEZhY3RvciA9IDEwMDAwMDA7XHJcbiAgdGhpcy5sb25naXR1ZGVTcGVlZEZhY3RvciA9IDUwMDAwMDtcclxuXHJcbiAgLy8gY29sbGlzaW9uIGVuZ2luZSBpbmZvXHJcbiAgdGhpcy5jYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZSA9IDIwO1xyXG4gIHRoaXMuY2FyVG9CYXNlQ29sbGlzaW9uRGlzdGFuY2UgPSA0MztcclxuXHJcbiAgLy8gbWFwIGRhdGFcclxuICB0aGlzLm1hcERhdGFMb2FkZWQgPSBmYWxzZTtcclxuICB0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsYXRpdHVkZSBkZWdyZWVzXHJcbiAgdGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zID0gMC4wMDg7IC8vIGluIGxvbmdpdHVkZSBkZWdyZWVzXHJcbiAgdGhpcy5taW5JdGVtRGlzdGFuY2VGcm9tQmFzZSA9IDMwMDtcclxuXHJcbiAgLy8gdGhlc2UgbWFwIG9iamVjdHMgd2lsbCBiZSBvZiB0aGUgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICBsb2NhdGlvbjogPGdvb2dsZV9tYXBzX0xhdExuZ19vYmplY3Q+LFxyXG4gIC8vICAgbWFya2VyOiA8Z29vZ2xlX21hcHNfTWFya2VyX29iamVjdD5cclxuICAvLyB9XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgPSB7XHJcbiAgICBsb2NhdGlvbjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBtYXJrZXI6IG51bGxcclxuICB9XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ID0gbnVsbDtcclxuICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgLy8gZ2FtZXBsYXlcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdCA9IHtcclxuICAgIHRlYW1Ub3duT2JqZWN0OiB0aGlzLnRlYW1Ub3duT2JqZWN0LFxyXG4gICAgdGVhbUNydXNoT2JqZWN0OiB0aGlzLnRlYW1DcnVzaE9iamVjdCxcclxuICAgIHBlZXJJZE9mQ2FyV2l0aEl0ZW06IG51bGwsXHJcbiAgICBpbml0aWFsTG9jYXRpb246IHtcclxuICAgICAgbGF0OiB0aGlzLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiB0aGlzLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfVxyXG4gIH07XHJcbiAgLy8gdGhpcyB3aWxsIGJlIG9mIHRoZSBmb3JtXHJcbiAgLy8ge1xyXG4gIC8vICAgdGVhbVRvd25PYmplY3Q6IDx0ZWFtX29iamVjdD4sXHJcbiAgLy8gICB0ZWFtQ3J1c2hPYmplY3Q6IDx0ZWFtX29iamVjdD4sXHJcbiAgLy8gICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gIC8vICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgLy8gICAgIGxhdDogMzUsXHJcbiAgLy8gICAgIGxuZzogLTEzMlxyXG4gIC8vIH1cclxuICAvLyAgIGl0ZW1PYmplY3Q6IHtcclxuICAvLyAgICAgaWQ6IDU3NixcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9XHJcbiAgLy8gfVxyXG5cclxuXHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICAvLyBzZXQgdGhlIGluaXRpYWwgZGVzdGluYXRpb24gdG8gd2hhdGV2ZXIsIGl0IHdpbGwgYmUgcmVzZXQgXHJcbiAgLy8gd2hlbiBhbiBpdGVtIGlzIGZpcnN0IHBsYWNlZFxyXG4gIHRoaXMuZGVzdGluYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKDQ1LjQ4OTM5MSwgLTEyMi42NDc1ODYpO1xyXG4gIHRoaXMudGltZURlbGF5QmV0d2VlblRyYW5zZmVycyA9IDEwMDA7IC8vIGluIG1zXHJcbiAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSBudWxsO1xyXG5cclxuICAvLyBvYmplY3Qgb2YgdGhlIG90aGVyIHVzZXJzXHJcbiAgdGhpcy5vdGhlclVzZXJzID0ge307XHJcbiAgLy8gdGhlIG90aGVyVXNlcnMgZGF0YSB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICAxMjM0NTY3ODk6IHtcclxuICAvLyAgICAgcGVlcklkOiAxMjM0Njc4OSxcclxuICAvLyAgICAgdXNlcm5hbWU6IGhlbGxvcm95LFxyXG4gIC8vICAgICBjYXI6IHtcclxuICAvLyAgICAgICBsb2NhdGlvbjogPGxvY2F0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgICAgbWFya2VyOiA8bWFya2VyX29iamVjdD5cclxuICAvLyAgICAgfSxcclxuICAvLyAgICAgcGVlckpzQ29ubmVjdGlvbjogPHBlZXJKc0Nvbm5lY3Rpb25fb2JqZWN0PixcclxuICAvLyAgICAgbGFzdFVwZGF0ZVRpbWU6IDx0aW1lX29iamVjdD4sXHJcbiAgLy8gICAgIG51bUl0ZW1zOiAwLFxyXG4gIC8vICAgICBoYXNCZWVuSW5pdGlhbGl6ZWQ6IHRydWVcclxuICAvLyAgIH0sXHJcbiAgLy8gICA5ODc2NTQzMjE6IHtcclxuICAvLyAgICAgcGVlcklkOiA5ODc2NTQzMjEsXHJcbiAgLy8gICAgIHVzZXJuYW1lOiB0b3dudG93bjkwMDAsXHJcbiAgLy8gICAgIGNhcjoge1xyXG4gIC8vICAgICAgIGxvY2F0aW9uOiA8bG9jYXRpb25fb2JqZWN0PixcclxuICAvLyAgICAgICBtYXJrZXI6IDxtYXJrZXJfb2JqZWN0PlxyXG4gIC8vICAgICB9LFxyXG4gIC8vICAgICBwZWVySnNDb25uZWN0aW9uOiA8cGVlckpzQ29ubmVjdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICBsYXN0VXBkYXRlVGltZTogPHRpbWVfb2JqZWN0PixcclxuICAvLyAgICAgbnVtSXRlbXM6IDVcclxuICAvLyAgIH1cclxuICAvLyB9XHJcblxyXG4gIC8vIGltYWdlc1xyXG4gIHRoaXMuaXRlbUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvc21va2luZ190b2lsZXRfc21hbGwuZ2lmJ1xyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoVXNlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvY3J1c2hfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbVRvd25Vc2VyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtVG93bk90aGVyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy90ZWFtX3Rvd25fb3RoZXJfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbUNydXNoT3RoZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3RlYW1fY3J1c2hfb3RoZXJfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvZm9ydC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvb3Bwb25lbnRfZm9ydC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2ZvcnRfdHJhbnNwYXJlbnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvb3Bwb25lbnRfZm9ydF90cmFuc3BhcmVudC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBwZWVyIEpTIGNvbm5lY3Rpb24gKGZvciBtdWx0aXBsYXllciB3ZWJSVEMpXHJcbiAgdGhpcy5wZWVyID0gbmV3IFBlZXIoe1xyXG4gICAga2V5OiAnajNtMHF0ZGRlc2hwazN4cidcclxuICB9KTtcclxuICB0aGlzLnBlZXIub24oJ29wZW4nLCBmdW5jdGlvbihpZCkge1xyXG4gICAgY29uc29sZS5sb2coJ015IHBlZXIgSUQgaXM6ICcgKyBpZCk7XHJcbiAgICAkKCcjcGVlci1pZCcpLnRleHQoaWQpO1xyXG4gICAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd3YWl0aW5nIGZvciBhIHNtdWdnbGVyIHRvIGJhdHRsZS4uLicpO1xyXG4gIH0pO1xyXG4gIHRoaXMucGVlci5vbignY29ubmVjdGlvbicsIGNvbm5lY3RlZFRvUGVlci5iaW5kKHRoaXMpKTtcclxuICB0aGlzLkFDVElWRV9DT05ORUNUSU9OX1RJTUVPVVRfSU5fU0VDT05EUyA9IDMwICogMTAwMDtcclxuXHJcblxyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZERvbUxpc3RlbmVyKHdpbmRvdywgJ2xvYWQnLCB0aGlzLmluaXRpYWxpemUpO1xyXG59XHJcblxyXG4vKipcclxuICogIGluaXRpYWxpemUgdGhlIGdhbWVcclxuICovXHJcblNtdWdnbGVyc1Rvd24ucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHRoaXMudXNlcm5hbWUgPSBwcm9tcHQoJ0Nob29zZSB5b3VyIFNtdWdnbGVyIE5hbWU6JywgJ05pbmphIFJveScpO1xyXG4gIGNyZWF0ZU1hcE9uUGFnZS5jYWxsKHRoaXMpO1xyXG4gIGxvYWRNYXBEYXRhLmNhbGwodGhpcywgbWFwSXNSZWFkeSk7XHJcblxyXG4gIC8vIHRoZXNlIGFyZSBzZXQgdG8gdHJ1ZSB3aGVuIGtleXMgYXJlIGJlaW5nIHByZXNzZWRcclxuICB0aGlzLnJpZ2h0RG93biA9IGZhbHNlO1xyXG4gIHRoaXMubGVmdERvd24gPSBmYWxzZTtcclxuICB0aGlzLnVwRG93biA9IGZhbHNlO1xyXG4gIHRoaXMuZG93bkRvd24gPSBmYWxzZTtcclxuICB0aGlzLmN0cmxEb3duID0gZmFsc2U7XHJcblxyXG4gIHRoaXMuc3BlZWQgPSAwO1xyXG4gIHRoaXMucm90YXRpb24gPSAwO1xyXG4gIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gMDtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJyc7XHJcblxyXG4gIC8vdHJ5RmluZGluZ0xvY2F0aW9uKCk7XHJcblxyXG5cclxuICBiaW5kS2V5QW5kQnV0dG9uRXZlbnRzLmNhbGwodGhpcyk7XHJcblxyXG4gIGluaXRpYWxpemVCb29zdEJhci5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBzdGFydCB0aGUgZ2FtZSBsb29wXHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuZnJhbWUpO1xyXG59XHJcblxyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5mcmFtZSA9IGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMubm93ID0gdGltZXN0YW1wLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5kdCA9IHRoaXMuZHQgKyBNYXRoLm1pbigxLCAodGhpcy5ub3cgLSB0aGlzLmxhc3QpIC8gMTAwMCk7XHJcbiAgd2hpbGUgKHRoaXMuZHQgPiB0aGlzLnN0ZXApIHtcclxuICAgIHRoaXMuZHQgPSB0aGlzLmR0IC0gdGhpcy5zdGVwO1xyXG4gICAgdXBkYXRlLmNhbGwodGhpcywgdGhpcy5zdGVwKTtcclxuICB9XHJcbiAgcmVuZGVyLmNhbGwodGhpcywgdGhpcy5kdCk7XHJcbiAgdGhpcy5sYXN0ID0gdGhpcy5ub3c7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZyYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZUJvb3N0QmFyKCkge1xyXG4gICQoZnVuY3Rpb24oKSB7XHJcbiAgICAkKFwiI2Jvb3N0LWJhclwiKS5wcm9ncmVzc2Jhcih7XHJcbiAgICAgIHZhbHVlOiAxMDBcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYXBJc1JlYWR5KCkge1xyXG4gIHRoaXMubWF0Y2htYWtlclRvd24uam9pbk9yQ3JlYXRlR2FtZSh0aGlzLnVzZXJuYW1lLCB0aGlzLnBlZXIuaWQsIHRoaXMuY29ubmVjdFRvQWxsTm9uSG9zdFVzZXJzLCB0aGlzLmdhbWVKb2luZWQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhbWVKb2luZWQoZ2FtZURhdGEsIGlzTmV3R2FtZSkge1xyXG4gIGdhbWVJZCA9IGdhbWVEYXRhLmlkO1xyXG4gIGlmIChpc05ld0dhbWUpIHtcclxuICAgIC8vIHdlJ3JlIGhvc3RpbmcgdGhlIGdhbWUgb3Vyc2VsZlxyXG4gICAgaG9zdFBlZXJJZCA9IHBlZXIuaWQ7XHJcbiAgICAvLyBmaXJzdCB1c2VyIGlzIGFsd2F5cyBvbiB0ZWFtIHRvd25cclxuICAgIHRoaXMuZ2FtZURhdGEudGVhbVRvd25PYmplY3QudXNlcnMgPSBbe1xyXG4gICAgICBwZWVySWQ6IHBlZXIuaWQsXHJcbiAgICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gICAgfV07XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAneWVsbG93Jyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2NvbG9yJywgJ2JsYWNrJyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIHNvbWVvbmUgZWxzZSBpcyBhbHJlYWR5IHRoZSBob3N0XHJcbiAgICBob3N0UGVlcklkID0gZ2FtZURhdGEuaG9zdFBlZXJJZDtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSSgpO1xyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJKCk7XHJcbiAgdXBkYXRlQ2FySWNvbnMoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWVzSW5VSSgpIHtcclxuICB2YXIgdGVhbVRvd25KcXVlcnlFbGVtID0gJCgnI3RlYW0tdG93bi11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVG93bkpxdWVyeUVsZW0sIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpO1xyXG4gIHZhciB0ZWFtQ3J1c2hKcXVlcnlFbGVtID0gJCgnI3RlYW0tY3J1c2gtdXNlcm5hbWVzJyk7XHJcbiAgdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbUNydXNoSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0sIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICAvLyBjbGVhciB0aGUgY3VycmVudCBsaXN0IG9mIHVzZXJuYW1lc1xyXG4gIHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtLmVtcHR5KCk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VyT2JqZWN0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbmV3SnF1ZXJ5RWxlbSA9ICQoJC5wYXJzZUhUTUwoXHJcbiAgICAgICc8bGkgaWQ9XCJ1c2VybmFtZS0nICtcclxuICAgICAgdXNlck9iamVjdHNBcnJheVtpXS5wZWVySWQgK1xyXG4gICAgICAnXCI+JyArIHVzZXJPYmplY3RzQXJyYXlbaV0udXNlcm5hbWUgKyAnPC9saT4nXHJcbiAgICApKTtcclxuICAgICQodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0pLmFwcGVuZChuZXdKcXVlcnlFbGVtKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFjdGl2YXRlVGVhbUNydXNoSW5VSSgpIHtcclxuICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcclxuICB2YXIgdGVhbUNydXNoU2NvcmUgPSAwO1xyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKSB7XHJcbiAgICB0ZWFtQ3J1c2hTY29yZSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQ7XHJcbiAgfVxyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoU2NvcmUpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvQWxsTm9uSG9zdFVzZXJzKG5vbkhvc3RQZWVySWRzKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub25Ib3N0UGVlcklkcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG5vbkhvc3RQZWVySWRzW2ldICE9IHBlZXIuaWQpIHtcclxuICAgICAgY29ubmVjdFRvUGVlci5jYWxsKHRoaXMsIG5vbkhvc3RQZWVySWRzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJpbmRLZXlBbmRCdXR0b25FdmVudHMoKSB7XHJcbiAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpIHtcclxuICAgIHJlc2l6ZU1hcFRvRml0LmNhbGwodGhpcyk7XHJcbiAgfSk7XHJcblxyXG4gICQoZG9jdW1lbnQpLmtleWRvd24ob25LZXlEb3duKTtcclxuICAkKGRvY3VtZW50KS5rZXl1cChvbktleVVwKTtcclxuICAkKCcjY29ubmVjdC1idXR0b24nKS5jbGljayhmdW5jdGlvbihldnQpIHtcclxuICAgIHZhciBwZWVySWQgPSAkKCcjcGVlci1pZC10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBjb25zb2xlLmxvZygncGVlciBpZCBjb25uZWN0aW5nOiAnICsgcGVlcklkKTtcclxuICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBwZWVySWQpO1xyXG4gIH0pO1xyXG4gICQoJyNzZXQtY2VudGVyLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHNlYXJjaFRlcm0gPSAkKCcjbWFwLWNlbnRlci10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBpZiAoIXNlYXJjaFRlcm0pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgY2VudGVyIHRvOiAnICsgc2VhcmNoVGVybSk7XHJcbiAgICBzZWFyY2hBbmRDZW50ZXJNYXAuY2FsbCh0aGlzLCBzZWFyY2hUZXJtKTtcclxuICAgIGJyb2FkY2FzdE5ld0xvY2F0aW9uLmNhbGwodGhpcywgdGhpcy5tYXBDZW50ZXIpO1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG4gIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGRpc2Nvbm5lY3RGcm9tR2FtZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzY29ubmVjdEZyb21HYW1lKCkge1xyXG4gIGlmICh0aGlzLnBlZXIgJiYgdGhpcy5wZWVyLmlkICYmIHRoaXMuZ2FtZUlkKSB7XHJcbiAgICBtYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbUdhbWUodGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVNYXBPblBhZ2UoKSB7XHJcbiAgdmFyIG1hcE9wdGlvbnMgPSB7XHJcbiAgICB6b29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIGNlbnRlcjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBrZXlib2FyZFNob3J0Y3V0czogZmFsc2UsXHJcbiAgICBtYXBUeXBlSWQ6IGdvb2dsZS5tYXBzLk1hcFR5cGVJZC5TQVRFTExJVEUsXHJcbiAgICBkaXNhYmxlRGVmYXVsdFVJOiB0cnVlLFxyXG4gICAgbWluWm9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBtYXhab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIHNjcm9sbHdoZWVsOiBmYWxzZSxcclxuICAgIGRpc2FibGVEb3VibGVDbGlja1pvb206IHRydWUsXHJcbiAgICBkcmFnZ2FibGU6IGZhbHNlLFxyXG4gIH1cclxuXHJcbiAgdGhpcy5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtY2FudmFzJyksIG1hcE9wdGlvbnMpO1xyXG5cclxuICAvLyBub3QgbmVjZXNzYXJ5LCBqdXN0IHdhbnQgdG8gYWxsb3cgdGhlIHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCAnY2xpY2snLCBmdW5jdGlvbihlKSB7XHJcbiAgICBjb250ZXh0bWVudTogdHJ1ZVxyXG4gIH0pO1xyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcInJpZ2h0Y2xpY2tcIiwgdGhpcy5zaG93Q29udGV4dE1lbnUpO1xyXG5cclxuICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNpemVNYXBUb0ZpdCgpIHtcclxuICAkKCdib2R5JykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtIDIpO1xyXG4gIHZhciBtYWluSGVpZ2h0ID0gJCgnYm9keScpLmhlaWdodCgpO1xyXG4gIHZhciBjb250ZW50SGVpZ2h0ID1cclxuICAgICQoJyNoZWFkZXInKS5vdXRlckhlaWdodCgpICtcclxuICAgICQoJyNmb290ZXInKS5vdXRlckhlaWdodCgpO1xyXG4gIHZhciBoID0gbWFpbkhlaWdodCAtIGNvbnRlbnRIZWlnaHQ7XHJcbiAgJCgnI21hcC1ib2R5JykuaGVpZ2h0KGgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWFyY2hBbmRDZW50ZXJNYXAoc2VhcmNoVGVybSkge1xyXG4gIHZhciBwYXJ0cyA9IHNlYXJjaFRlcm0uc3BsaXQoJywnKTtcclxuICBpZiAoIXBhcnRzKSB7XHJcbiAgICAvLyBiYWQgc2VhcmNoIGlucHV0LCBtdXN0IGJlIGluIGxhdCxsbmcgZm9ybVxyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgbGF0U3RyaW5nID0gcGFydHNbMF07XHJcbiAgdmFyIGxuZ1N0cmluZyA9IHBhcnRzWzFdO1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0U3RyaW5nLCBsbmdTdHJpbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkTWFwRGF0YShtYXBJc1JlYWR5Q2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgY29uc29sZS5sb2coJ2xvYWRpbmcgbWFwIGRhdGEnKTtcclxuXHJcbiAgLy8gVE9ETzogXHJcbiAgLy8gdG8gcmVhZCBzdGF0aWMgZmlsZXMgaW5cclxuICAvLyB5b3UgbmVlZCB0byBwYXNzIFwiLXQgYnJmc1wiIHRvIGJyb3dzZXJpZnlcclxuICAvLyBidXQgaXQncyBjb29sIGNvcyB5b3UgY2FuIGlubGluZSBiYXNlNjQgZW5jb2RlZCBpbWFnZXMgb3IgdXRmOCBodG1sIHN0cmluZ3NcclxuICAvLyQuZ2V0SlNPTihcIm1hcHMvZ3JhbmRjYW55b24uanNvblwiLCBmdW5jdGlvbihqc29uKSB7XHJcbiAgJC5nZXRKU09OKFwibWFwcy9wb3J0bGFuZC5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAgIGNvbnNvbGUubG9nKCdtYXAgZGF0YSBsb2FkZWQnKTtcclxuICAgIHNlbGYubWFwRGF0YSA9IGpzb247XHJcbiAgICBzZWxmLm1hcERhdGFMb2FkZWQgPSB0cnVlO1xyXG4gICAgc2VsZi5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHNlbGYubWFwRGF0YS5tYXAuY2VudGVyTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubWFwLnNldENlbnRlcihzZWxmLm1hcENlbnRlcik7XHJcbiAgICBzZWxmLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgICAgbGF0OiBzZWxmLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiBzZWxmLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfTtcclxuXHJcbiAgICBjcmVhdGVUZWFtVG93bkJhc2UuY2FsbChzZWxmLCBzZWxmLm1hcERhdGEubWFwLnRlYW1Ub3duQmFzZUxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBjcmVhdGVUZWFtQ3J1c2hCYXNlLmNhbGwoc2VsZiwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBzZWxmLm15VGVhbUJhc2VNYXBPYmplY3QgPSBzZWxmLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwoc2VsZik7XHJcbiAgICBtYXBJc1JlYWR5Q2FsbGJhY2suY2FsbChzZWxmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0ID0gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZShsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdChsYXQsIGxuZykge1xyXG4gIC8vIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIHRlYW0gVG93biBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gVG93biBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24sXHJcbiAgICBpY29uOiB0aGlzLnRlYW1Ub3duQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgdmFyIHRlYW1Ub3duQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1Ub3duQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbVRvd25CYXNlT2JqZWN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBDcnVzaCBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgJiYgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgPSB7fTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gQ3J1c2ggQmFzZScsXHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgcG9zaXRpb246IHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbUNydXNoQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZU9iamVjdChsYXQsIGxuZykge1xyXG5cclxuICB2YXIgdGVhbUNydXNoQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1DcnVzaEJhc2VPYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRlYW1DcnVzaEJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJhbmRvbWx5UHV0SXRlbXMoKSB7XHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gZ2V0UmFuZG9tTG9jYXRpb25Gb3JJdGVtLmNhbGwodGhpcyk7XHJcbiAgdmFyIGl0ZW1JZCA9IGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMCwgMCk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ID0ge1xyXG4gICAgaWQ6IGl0ZW1JZCxcclxuICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogcmFuZG9tTG9jYXRpb24ubGF0KCksXHJcbiAgICAgIGxuZzogcmFuZG9tTG9jYXRpb24ubG5nKClcclxuICAgIH1cclxuICB9XHJcbiAgcHV0TmV3SXRlbU9uTWFwLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbiAgYnJvYWRjYXN0TmV3SXRlbS5jYWxsKHRoaXMsIHJhbmRvbUxvY2F0aW9uLCBpdGVtSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0oKSB7XHJcbiAgLy8gRmluZCBhIHJhbmRvbSBsb2NhdGlvbiB0aGF0IHdvcmtzLCBhbmQgaWYgaXQncyB0b28gY2xvc2VcclxuICAvLyB0byB0aGUgYmFzZSwgcGljayBhbm90aGVyIGxvY2F0aW9uXHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gbnVsbDtcclxuICB2YXIgY2VudGVyT2ZBcmVhTGF0ID0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLmxhdCgpO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMbmcgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubG5nKCk7XHJcbiAgd2hpbGUgKHRydWUpIHtcclxuICAgIHJhbmRvbUxhdCA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTGF0IC1cclxuICAgICAgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgY2VudGVyT2ZBcmVhTGF0ICsgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICByYW5kb21MbmcgPSBnZXRSYW5kb21JblJhbmdlKGNlbnRlck9mQXJlYUxuZyAtXHJcbiAgICAgICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMbmcgKyAodGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIHB1dCBpdGVtIGF0OiAnICsgcmFuZG9tTGF0ICsgJywnICsgcmFuZG9tTG5nKTtcclxuICAgIHJhbmRvbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhyYW5kb21MYXQsIHJhbmRvbUxuZyk7XHJcbiAgICBpZiAoZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4ocmFuZG9tTG9jYXRpb24sIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikgPiB0aGlzLm1pbkl0ZW1EaXN0YW5jZUZyb21CYXNlKSB7XHJcbiAgICAgIHJldHVybiByYW5kb21Mb2NhdGlvbjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdpdGVtIHRvbyBjbG9zZSB0byBiYXNlLCBjaG9vc2luZyBhbm90aGVyIGxvY2F0aW9uLi4uJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwdXROZXdJdGVtT25NYXAobG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIC8vIGV2ZW50dWFsbHkgdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50IHRvIGNsZWFyIHRoaXMsIGJ1dCB3aGlsZVxyXG4gIC8vIHRoZXJlJ3MgYSBidWcgb24gbXVsdGlwbGF5ZXIgam9pbmluZywgY2xlYXIgaXQgYWdhaW5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcblxyXG4gIC8vIHNldCB0aGUgYmFzZSBpY29uIGltYWdlcyB0byBiZSB0aGUgbGlnaHRlciBvbmVzXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG5cclxuICAvLyBpbiBjYXNlIHRoZXJlJ3MgYSBsaW5nZXJpbmcgaXRlbSwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMuaXRlbU1hcE9iamVjdCAmJiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIubWFwKSB7XHJcbiAgICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHZhciBpdGVtTWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgdGl0bGU6ICdJdGVtJyxcclxuICAgIGljb246IHRoaXMuaXRlbUljb24sXHJcbiAgICAvLyAvL1RPRE86IEZJWCBTVFVQSUQgR09PR0xFIE1BUFMgQlVHIHRoYXQgY2F1c2VzIHRoZSBnaWYgbWFya2VyXHJcbiAgICAvLyAvL3RvIG15c3RlcmlvdXNseSBub3Qgc2hvdyB1cCBzb21ldGltZXNcclxuICAgIC8vIG9wdGltaXplZDogZmFsc2UsXHJcbiAgICBwb3NpdGlvbjogbG9jYXRpb25cclxuICB9KTtcclxuXHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0ID0ge1xyXG4gICAgbWFya2VyOiBpdGVtTWFya2VyLFxyXG4gICAgbG9jYXRpb246IGxvY2F0aW9uXHJcbiAgfTtcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICB9O1xyXG5cclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIGxvY2F0aW9uLCAnYXJyb3cucG5nJyk7XHJcbiAgcmV0dXJuIGl0ZW1JZDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlQm9vc3RpbmcoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX05PUk1BTF9TUEVFRDtcclxuICBpZiAoJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgfHwgJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgPT0gMCkge1xyXG4gICAgdmFyIGJvb3N0QmFyVmFsdWUgPSAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKTtcclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPiAwKSB7XHJcbiAgICAgIGJvb3N0QmFyVmFsdWUgLT0gdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFO1xyXG4gICAgICAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiLCBib29zdEJhclZhbHVlKTtcclxuICAgICAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX0JPT1NUX1NQRUVEO1xyXG4gICAgICB0aGlzLnNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5zcGVlZCkgPiB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLnNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSB0aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAqPSB0aGlzLkJPT1NUX0ZBQ1RPUjtcclxuICAgICAgaWYgKE1hdGguYWJzKHRoaXMuaG9yaXpvbnRhbFNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IC10aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jdHJsRG93biAmJiBib29zdEJhclZhbHVlIDw9IDApIHtcclxuICAgICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI2Jvb3N0LWJhcicpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm1heFNwZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlQ2FyKCkge1xyXG4gIHRoaXMubWF4U3BlZWQgPSBoYW5kbGVCb29zdGluZy5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBpZiBVcCBvciBEb3duIGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIHNwZWVkLiBPdGhlcndpc2UsXHJcbiAgLy8gZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy51cERvd24gfHwgdGhpcy5kb3duRG93bikge1xyXG4gICAgaWYgKHRoaXMudXBEb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkICs9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmRvd25Eb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5zcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgLy8gaWYgTGVmdCBvciBSaWdodCBrZXkgaXMgcHJlc3NlZCwgY2hhbmdlIHRoZSBob3Jpem9udGFsIHNwZWVkLlxyXG4gIC8vIE90aGVyd2lzZSwgZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy5sZWZ0RG93biB8fCB0aGlzLnJpZ2h0RG93bikge1xyXG4gICAgaWYgKHRoaXMucmlnaHREb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8PSB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubGVmdERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLT0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy51cERvd24gJiYgIXRoaXMuZG93bkRvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMuTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmICh0aGlzLnNwZWVkID4gLTAuMDEgJiYgdGhpcy5zcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5zcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnNwZWVkIC89IHRoaXMuZGVjZWxlcmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy5sZWZ0RG93biAmJiAhdGhpcy5yaWdodERvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLmhvcml6b250YWxTcGVlZCkgPiB0aGlzLk1BWF9OT1JNQUxfU1BFRUQpKSB7XHJcbiAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPiAtMC4wMSAmJiB0aGlzLmhvcml6b250YWxTcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLz0gdGhpcy5kZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBvcHRpbWl6YXRpb24gLSBvbmx5IGlmIHRoZSBjYXIgaXMgbW92aW5nIHNob3VsZCB3ZSBzcGVuZFxyXG4gIC8vIHRpbWUgcmVzZXR0aW5nIHRoZSBtYXBcclxuICBpZiAodGhpcy5zcGVlZCAhPSAwIHx8IHRoaXMuaG9yaXpvbnRhbFNwZWVkICE9IDApIHtcclxuICAgIHZhciBuZXdMYXQgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sYXQoKSArICh0aGlzLnNwZWVkIC8gdGhpcy5sYXRpdHVkZVNwZWVkRmFjdG9yKTtcclxuICAgIHZhciBuZXdMbmcgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sbmcoKSArICh0aGlzLmhvcml6b250YWxTcGVlZCAvIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKG5ld0xhdCwgbmV3TG5nKTtcclxuICAgIHRoaXMubWFwLnNldENlbnRlcih0aGlzLm1hcENlbnRlcik7XHJcblxyXG4gIH1cclxuXHJcbiAgcm90YXRlQ2FyLmNhbGwodGhpcyk7XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICByb3RhdGVBcnJvdy5jYWxsKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvUGVlcihvdGhlclVzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd0cnlpbmcgdG8gY29ubmVjdCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICB2YXIgcGVlckpzQ29ubmVjdGlvbiA9IHRoaXMucGVlci5jb25uZWN0KG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignb3BlbicsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gb3BlbicpO1xyXG4gICAgY29ubmVjdGVkVG9QZWVyLmNhbGwodGhpcywgcGVlckpzQ29ubmVjdGlvbik7XHJcbiAgfSk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiUEVFUkpTIEVSUk9SOiBcIik7XHJcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgdGhyb3cgXCJQZWVySlMgY29ubmVjdGlvbiBlcnJvclwiO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0ZWRUb1BlZXIocGVlckpzQ29ubmVjdGlvbikge1xyXG4gIHZhciBvdGhlclVzZXJQZWVySWQgPSBwZWVySnNDb25uZWN0aW9uLnBlZXI7XHJcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBjb25uZWN0ZWQgdG8gdGhpcyB1ZXNyLFxyXG4gIC8vIGFkZCB0aGUgSFRNTCBmb3IgdGhlIG5ldyB1c2VyXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uLmNhbGwodGhpcywgcGVlckpzQ29ubmVjdGlvbiwgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGFzc2lnblVzZXJUb1RlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gICAgY3JlYXRlT3RoZXJVc2VyQ2FyLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVPdGhlclVzZXJDYXIob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlcklkID0gb3RoZXJVc2VyUGVlcklkO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLmNhciA9IHt9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25Vc2VyVG9UZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIGlmIHRoZSB1c2VyIGlzIGFscmVhZHkgb24gYSB0ZWFtLCBpZ25vcmUgdGhpc1xyXG4gIGlmIChpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpIHx8XHJcbiAgICBpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVzZXJPYmplY3QgPSB7XHJcbiAgICBwZWVySWQ6IG90aGVyVXNlclBlZXJJZCxcclxuICAgIHVzZXJuYW1lOiBudWxsXHJcbiAgfTtcclxuICAvLyBmb3Igbm93LCBqdXN0IGFsdGVybmF0ZSB3aG8gZ29lcyBvbiBlYWNoIHRlYW1cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggPiB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGgpIHtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSS5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5wdXNoKHVzZXJPYmplY3QpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNVc2VyT25UZWFtKHBlZXJJZCwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlck9iamVjdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHVzZXJPYmplY3RzQXJyYXlbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1JblVJKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjNjY3Jyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAncmVkJyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NicpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uKHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0pIHtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdID0ge307XHJcbiAgfVxyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24gPSBwZWVySnNDb25uZWN0aW9uO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24ub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnY2xvc2luZyBjb25uZWN0aW9uJyk7XHJcbiAgICBvdGhlclVzZXJEaXNjb25uZWN0ZWQuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH0pO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24ub24oJ2RhdGEnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBkYXRhUmVjZWl2ZWQuY2FsbCh0aGlzLCBkYXRhKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmFkZUFycm93VG9JbWFnZShpbWFnZUZpbGVOYW1lKSB7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cignc3JjJywgJ2ltYWdlcy8nICsgaW1hZ2VGaWxlTmFtZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckRpc2Nvbm5lY3RlZChvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBzaG91bGQgYmUgY2FsbGVkIGFmdGVyIHRoZSBwZWVySnMgY29ubmVjdGlvblxyXG4gIC8vIGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgcmVtb3ZlVXNlckZyb21UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICByZW1vdmVVc2VyRnJvbVVJLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gcmVtb3ZlIHRoaXMgdXNlciBmcm9tIHRoZSBnYW1lIGluIEZpcmViYXNlOlxyXG4gIG1hdGNobWFrZXJUb3duLnJlbW92ZVBlZXJGcm9tR2FtZShnYW1lSWQsIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIGlmICh0aGlzLmhvc3RQZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAvLyBpZiB0aGF0IHVzZXIgd2FzIHRoZSBob3N0LCBzZXQgdXMgYXMgdGhlIG5ldyBob3N0XHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSB0aGlzLnBlZXIuaWQ7XHJcbiAgICBzd2l0Y2hUb05ld0hvc3QuY2FsbCh0aGlzLCB0aGlzLmdhbWVJZCwgdGhpcy5wZWVyLmlkKTtcclxuICB9XHJcblxyXG4gIC8vIGlmIHRoZSB1c2VyIHdobyBkaXNjb25uZWN0ZWQgY3VycmVudGx5IGhhZCBhbiBpdGVtLFxyXG4gIC8vIHB1dCBvdXQgYSBuZXcgb25lXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gb3RoZXJVc2VyUGVlcklkICYmIHRoaXMuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICB9XHJcblxyXG4gIC8vIGRlbGV0ZSB0aGF0IHVzZXIncyBkYXRhXHJcbiAgZGVsZXRlIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdO1xyXG5cclxuICAvLyBpZiB0aGVyZSBhbnkgdXNlcnMgbGVmdCwgYnJvYWRjYXN0IHRoZW0gdGhlIG5ldyBnYW1lIHN0YXRlXHJcbiAgaWYgKE9iamVjdC5rZXlzKHRoaXMub3RoZXJVc2VycykubGVuZ3RoID4gMCkge1xyXG4gICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycy5jYWxsKHRoaXMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3dhaXRpbmcgZm9yIGEgc211Z2dsZXIgdG8gYmF0dGxlLi4uJyk7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21UZWFtKHVzZXJQZWVySWQpIHtcclxuICBmb3IgKHZhciBpID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHVzZXJQZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5zcGxpY2UoaSwgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGogPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnBlZXJJZCA9PSB1c2VyUGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLnNwbGljZShqLCAxKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tVUkocGVlcklkKSB7XHJcbiAgLy8gcmVtb3ZlIHRoZSBvdGhlciB1c2VyJ3MgY2FyIGZyb20gdGhlIG1hcFxyXG4gIHRoaXMub3RoZXJVc2Vyc1twZWVySWRdLmNhci5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG5cclxuICAvLyBpZiB0aGVpciB0ZWFtIGhhcyBubyBtb3JlIHVzZXJzLCBncmV5IG91dFxyXG4gIC8vIHRoZWlyIHNjb3JlIGJveFxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnb3BhY2l0eScsICcwLjMnKTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyQ2hhbmdlZExvY2F0aW9uKGxhdCwgbG5nKSB7XHJcbiAgc2V0R2FtZVRvTmV3TG9jYXRpb24uY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGJyb2FkY2FzdEdhbWVTdGF0ZS5jYWxsKHRoaXMsIHVzZXIpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGF0YVJlY2VpdmVkKGRhdGEpIHtcclxuICBpZiAoZGF0YS5wZWVySWQpIHtcclxuICAgIC8vIGlmIHdlIGFyZSB0aGUgaG9zdCwgYW5kIHRoZSB1c2VyIHdobyBzZW50IHRoaXMgZGF0YSBoYXNuJ3QgYmVlbiBnaXZlbiB0aGUgaW5pdGlhbCBnYW1lXHJcbiAgICAvLyBzdGF0ZSwgdGhlbiBicm9hZGNhc3QgaXQgdG8gdGhlbVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0gJiYgIXRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0uaGFzQmVlbkluaXRpYWxpemVkICYmIGhvc3RQZWVySWQgPT0gcGVlci5pZCkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgIC8vIG5vdCBzdXJlIGlmIHdlIHNob3VsZCBkbyB0aGlzIG9yIG5vdCwgYnV0IGF0IGxlYXN0IGl0IHJlc2V0cyB0aGUgZ2FtZVxyXG4gICAgICAvLyBzdGF0ZSB0byB3aGF0IHdlLCB0aGUgaG9zdCwgdGhpbmsgaXQgaXNcclxuICAgICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycygpO1xyXG4gICAgICAvLyBpZiBub3QgdGhhdCwgdGhlbiB3ZSBzaG91bGQganVzdCBicm9hZGNhc3QgdG8gdGhlIG5ldyBndXkgbGlrZSB0aGlzOlxyXG4gICAgICAvLyBicm9hZGNhc3RHYW1lU3RhdGUoZGF0YS5wZWVySWQpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5sYXN0VXBkYXRlVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5ldmVudCkge1xyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAndXBkYXRlX2dhbWVfc3RhdGUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogdXBkYXRlIGdhbWUgc3RhdGUnKTtcclxuICAgICAgLy8gd2Ugb25seSB3YW50IHRvIHJlY2VudGVyIHRoZSBtYXAgaW4gdGhlIGNhc2UgdGhhdCB0aGlzIGlzIGEgbmV3IHVzZXJcclxuICAgICAgLy8gam9pbmluZyBmb3IgdGhlIGZpcnN0IHRpbWUsIGFuZCB0aGUgd2F5IHRvIHRlbGwgdGhhdCBpcyB0byBzZWUgaWYgdGhlXHJcbiAgICAgIC8vIGluaXRpYWwgbG9jYXRpb24gaGFzIGNoYW5nZWQuICBPbmNlIHRoZSB1c2VyIGlzIGFscmVhZHkgam9pbmVkLCBpZiBhXHJcbiAgICAgIC8vIGxvY2F0aW9uIGNoYW5nZSBpcyBpbml0aWF0ZWQsIHRoYXQgd2lsbCB1c2UgdGhlICduZXdfbG9jYXRpb24nIGV2ZW50IFxyXG4gICAgICBpZiAocGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpICE9IHBhcnNlRmxvYXQoZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCkgfHxcclxuICAgICAgICBwYXJzZUZsb2F0KGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykgIT0gcGFyc2VGbG9hdChnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSkge1xyXG4gICAgICAgIG1hcC5zZXRDZW50ZXIobmV3IGdvb2dsZS5tYXBzLkxhdExuZyhcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCxcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpO1xyXG4gICAgICB9XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0ID0gZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdDtcclxuICAgICAgLy8gbmVlZCB0byBtYWtlIHRoaXMgY2FsbCBiZWNhdXNlIHdlIGNhbiBiZSBpbiBhIHNpdHVhdGlvbiB3aGVyZSB0aGUgaG9zdFxyXG4gICAgICAvLyBkb2Vzbid0IGtub3cgb3VyIHVzZXJuYW1lIHlldCwgc28gd2UgbmVlZCB0byBtYW51YWxseSBzZXQgaXQgaW4gb3VyXHJcbiAgICAgIC8vIG93biBVSSBmaXJzdC5cclxuICAgICAgdXBkYXRlVXNlcm5hbWUocGVlci5pZCwgdXNlcm5hbWUpO1xyXG4gICAgICB1cGRhdGVVSVdpdGhOZXdHYW1lU3RhdGUoKTtcclxuICAgICAgYXNzaWduTXlUZWFtQmFzZSgpO1xyXG4gICAgICB1cGRhdGVDYXJJY29ucygpO1xyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2xvY2F0aW9uJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IG5ldyBsb2NhdGlvbiAnICsgZGF0YS5ldmVudC5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxuZyk7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lm9yaWdpbmF0aW5nX3BlZXJfaWQgIT0gcGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbihkYXRhLmV2ZW50LmxhdCwgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV9jb2xsZWN0ZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSBjb2xsZWN0ZWQgYnkgJyArIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtICE9IHBlZXIuaWQpIHtcclxuICAgICAgICBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2l0ZW0nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGl0ZW0gYXQgJyArXHJcbiAgICAgICAgZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyArXHJcbiAgICAgICAgJyB3aXRoIGlkICcgKyBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHNvbWVvbmUgZWxzZSBjYXVzZWQgdGhlIG5ldyBpdGVtIHBsYWNlbWVudC5cclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGRpZCBpdCwgaXQgd2FzIGFscmVhZHkgcGxhY2VkXHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lmhvc3RfdXNlciAmJiBkYXRhLmV2ZW50Lmhvc3RfdXNlciAhPSBwZWVyLmlkKSB7XHJcbiAgICAgICAgdmFyIGl0ZW1Mb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQsIGRhdGEuZXZlbnQubG9jYXRpb24ubG5nKTtcclxuICAgICAgICBwdXROZXdJdGVtT25NYXAoaXRlbUxvY2F0aW9uLCBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fcmV0dXJuZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSByZXR1cm5lZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSArICcgd2hpY2ggZ2l2ZXMgdGhlbSAnICsgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSAhPSBwZWVyLmlkKSB7XHJcbiAgICAgICAgdGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgdGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICBvdGhlclVzZXJSZXR1cm5lZEl0ZW0oZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0sIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fdHJhbnNmZXJyZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSAnICsgZGF0YS5ldmVudC5pZCArICcgdHJhbnNmZXJyZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC5mcm9tVXNlclBlZXJJZCArICcgdG8gdXNlciAnICsgZGF0YS5ldmVudC50b1VzZXJQZWVySWQpO1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gZGF0YS5ldmVudC50b1VzZXJQZWVySWQ7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnRvVXNlclBlZXJJZCA9PSBwZWVyLmlkKSB7XHJcbiAgICAgICAgLy8gdGhlIGl0ZW0gd2FzIHRyYW5zZmVycmVkIHRvIHRoaXMgdXNlclxyXG4gICAgICAgIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICAgICAgICBpZDogZGF0YS5ldmVudC5pZCxcclxuICAgICAgICAgIGxvY2F0aW9uOiBudWxsXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aW1lT2ZMYXN0VHJhbnNmZXIgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzb21lb25lIHRyYW5zZmVycmVkIGF0ICcgKyB0aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gICAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtKGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNldCB0aGUgYXJyb3cgdG8gcG9pbnQgdG8gdGhlIG5ldyB1c2VyIHdobyBoYXMgdGhlIGl0ZW1cclxuICAgICAgICBkZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1tkYXRhLmV2ZW50LnRvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciBzZW50IGEgdXNlcm5hbWUgdGhhdCB3ZSBoYXZlbid0IHNlZW4geWV0LCBzZXQgaXRcclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS51c2VybmFtZSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS51c2VybmFtZSkge1xyXG4gICAgdXBkYXRlVXNlcm5hbWUoZGF0YS5wZWVySWQsIGRhdGEudXNlcm5hbWUpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEuY2FyTGF0TG5nICYmIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgIG1vdmVPdGhlckNhcih0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLCBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGEuY2FyTGF0TG5nLmxhdCwgZGF0YS5jYXJMYXRMbmcubG5nKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1CYXNlKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtKHBlZXIuaWQpKSB7XHJcbiAgICBteVRlYW1CYXNlTWFwT2JqZWN0ID0gdGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG4gIH0gZWxzZSB7XHJcbiAgICBteVRlYW1CYXNlTWFwT2JqZWN0ID0gdGVhbUNydXNoQmFzZU1hcE9iamVjdDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVzZXJuYW1lKHBlZXJJZCwgdXNlcm5hbWUpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBqID0gMDsgaiA8IGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGorKykge1xyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgfVxyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJV2l0aE5ld0dhbWVTdGF0ZSgpIHtcclxuICAvLyByZWNlbnRlciB0aGUgbWFwXHJcbiAgY29uc29sZS5sb2coJ25ldyBsb2NhdGlvbiByZWNlaXZlZDogJyArIGdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbik7XHJcbiAgbWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0LCBnYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKTtcclxuICB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSSgpO1xyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkoKTtcclxuICAvLyBpZiBzb21lb25lIGhhcyB0aGUgaXRlbVxyXG4gIGlmIChnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICBpdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgICAvLyBpZiBJIGhhdmUgdGhlIGl0ZW0sIG1ha2UgdGhlIGRlc3RpbmF0aW9uIG15IHRlYW0ncyBiYXNlXHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBwZWVyLmlkKSB7XHJcbiAgICAgIHNldERlc3RpbmF0aW9uKG15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gYW5vdGhlciB1c2VyIGhhcyB0aGUgaXRlbSwgYnV0IHRoZSBzZXREZXN0aW5hdGlvbiBjYWxsXHJcbiAgICAgIC8vIHdpbGwgYmUgdGFrZW4gY2FyZSBvZiB3aGVuIHRoZSB1c2VyIHNlbmRzIHRoZWlyIGxvY2F0aW9uIGRhdGFcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gaWYgbm9ib2R5IGhhcyB0aGUgaXRlbSwgcHV0IGl0IG9uIHRoZSBtYXAgaW4gdGhlIHJpZ2h0IHBsYWNlLFxyXG4gICAgLy8gYW5kIHNldCB0aGUgbmV3IGl0ZW0gbG9jYXRpb24gYXMgdGhlIGRlc3RpbmF0aW9uXHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCAmJiBnYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgIG1vdmVJdGVtT25NYXAoZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQsIGdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubG5nKTtcclxuICAgIH1cclxuICAgIHNldERlc3RpbmF0aW9uKGl0ZW1NYXBPYmplY3QubG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICB9XHJcbiAgdXBkYXRlU2NvcmVzSW5VSShnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkLCBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgYXNzaWduTXlUZWFtSW5VSSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSSgpIHtcclxuICBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QoXHJcbiAgICBnYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0KFxyXG4gICAgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubGF0LFxyXG4gICAgZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FySWNvbnMoKSB7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMsIHRlYW1Ub3duT3RoZXJDYXJJY29uKTtcclxuICB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucyhnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMsIHRlYW1DcnVzaE90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlTXlDYXJJY29uKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU15Q2FySWNvbigpIHtcclxuICB2YXIgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY3J1c2hfY2FyLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0ocGVlci5pZCkpIHtcclxuICAgIHVzZXJDYXJJbWdTcmMgPSAnaW1hZ2VzL2Nhci5wbmcnO1xyXG4gIH1cclxuICAkKCcjY2FyLWltZycpLmF0dHIoJ3NyYycsIHVzZXJDYXJJbWdTcmMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucyh0ZWFtVXNlcnMsIHRlYW1DYXJJY29uKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZWFtVXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgbWFya2VyXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdICYmIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIgJiYgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0ZWFtVXNlcnNbaV0ucGVlcklkICE9IHBlZXIuaWQpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgICBtYXA6IG1hcCxcclxuICAgICAgICB0aXRsZTogdGVhbVVzZXJzW2ldLnBlZXJJZCxcclxuICAgICAgICBpY29uOiB0ZWFtQ2FySWNvblxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTY29yZXNJblVJKHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCwgdGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCkge1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0ZWFtVG93bk51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlSXRlbU9uTWFwKGxhdCwgbG5nKSB7XHJcbiAgY29uc29sZS5sb2coJ21vdmluZyBpdGVtIHRvIG5ldyBsb2NhdGlvbjogJyArIGxhdCArICcsJyArIGxuZyk7XHJcbiAgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQgPSBsYXQ7XHJcbiAgZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcgPSBsbmc7XHJcbiAgaXRlbU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIGl0ZW1NYXBPYmplY3QubWFya2VyLnNldFBvc2l0aW9uKGl0ZW1NYXBPYmplY3QubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJSZXR1cm5lZEl0ZW0ob3RoZXJVc2VyUGVlcklkLCBub3dOdW1JdGVtc0ZvclVzZXIpIHtcclxuICBnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQodXNlcklzT25Ub3duVGVhbShvdGhlclVzZXJQZWVySWQpKVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UoJ2Fycm93LnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlT3RoZXJDYXIob3RoZXJVc2VyT2JqZWN0LCBuZXdMb2NhdGlvbikge1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiA9IG5ld0xvY2F0aW9uO1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIpIHtcclxuICAgIHVwZGF0ZUNhckljb25zKCk7XHJcbiAgfVxyXG4gIC8vIGlmIHRoZSBvdGhlciBjYXIgaGFzIGFuIGl0ZW0sIHVwZGF0ZSB0aGUgZGVzdGluYXRpb25cclxuICAvLyB0byBiZSBpdFxyXG4gIGlmIChnYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IG90aGVyVXNlck9iamVjdC5wZWVySWQpIHtcclxuICAgIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICAgIGlmICh1c2VySXNPbk15VGVhbShvdGhlclVzZXJPYmplY3QucGVlcklkKSkge1xyXG4gICAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbihuZXdMb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG4gIH1cclxuICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQob3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiwgb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCk7XHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIuc2V0UG9zaXRpb24ob3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uTXlUZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBteVRlYW0gPSBudWxsO1xyXG4gIHZhciBvdGhlclVzZXJUZWFtID0gbnVsbDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ3Rvd24nO1xyXG4gICAgfVxyXG4gICAgaWYgKGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgICAgb3RoZXJVc2VyVGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICAgIGlmIChnYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgICBvdGhlclVzZXJUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG15VGVhbSA9PSBvdGhlclVzZXJUZWFtO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQob3RoZXJDYXJMb2NhdGlvbiwgb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gaWYgd2UgZG9uJ3Qga25vdyB0aGUgb3RoZXIgY2FyJ3MgbG9jYXRpb24sIG9yIGlmIHRoaXMgaXNuJ3QgdGhlIHVzZXIgd2l0aFxyXG4gIC8vICB0aGUgaXRlbSwgdGhlbiBpZ25vcmUgaXQuIFdlJ2xsIG9ubHkgdHJhbnNmZXIgYW4gaXRlbSBmcm9tIHRoZSBwZXJzcGVjdGVkXHJcbiAgLy8gIG9mIHRoZSB1c2VyIHdpdGggdGhlIGl0ZW1cclxuICBpZiAoIW90aGVyQ2FyTG9jYXRpb24gfHwgIWNvbGxlY3RlZEl0ZW0pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKHRpbWVPZkxhc3RUcmFuc2Zlcikge1xyXG4gICAgdmFyIHRpbWVTaW5jZUxhc3RUcmFuc2ZlciA9ICgobmV3IERhdGUoKSkuZ2V0VGltZSgpKSAtIHRpbWVPZkxhc3RUcmFuc2ZlcjtcclxuICAgIC8vIGlmIG5vdCBlbm91Z2ggdGltZSBoYXMgcGFzc2VkIHNpbmNlIHRoZSBsYXN0IHRyYW5zZmVyLCByZXR1cm5cclxuICAgIGlmICh0aW1lU2luY2VMYXN0VHJhbnNmZXIgPCB0aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG9wdGltaXphdGlvbjogcmVzZXQgdGhpcyBzbyB3ZSBkb24ndCB3YXN0ZSB0aW1lIGNhbGN1bGF0aW5nIGluIHRoZSBmdXR1cmVcclxuICAgICAgdGltZU9mTGFzdFRyYW5zZmVyID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKG1hcENlbnRlciwgb3RoZXJDYXJMb2NhdGlvbik7XHJcbiAgLy8gaWYgdGhpcyB1c2VyICh0aGF0IGhhcyB0aGUgaXRlbSkgaXMgY2xvc2UgZW5vdWdoIHRvIGNhbGwgaXQgYVxyXG4gIC8vIGNvbGxpc2lvbiwgdHJhbnNmZXIgaXQgdG8gdGhlIG90aGVyIHVzZXJcclxuICBpZiAoZGlzdGFuY2UgPCAyMCkge1xyXG4gICAgdHJhbnNmZXJJdGVtKGNvbGxlY3RlZEl0ZW0uaWQsIHBlZXIuaWQsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW0oaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2l0ZW0gJyArIGl0ZW1PYmplY3RJZCArICcgdHJhbnNmZXJyZWQgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIHRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgYnJvYWRjYXN0VHJhbnNmZXJPZkl0ZW0oaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkLCB0aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gIGNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIGdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB0b1VzZXJQZWVySWQ7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbSh0b1VzZXJQZWVySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIHNldERlc3RpbmF0aW9uKHRoaXMub3RoZXJVc2Vyc1t0b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtKHVzZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdvdGhlciB1c2VyIGNvbGxlY3RlZCBpdGVtJyk7XHJcbiAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHVzZXJJZDtcclxuICBpdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbSh1c2VySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UoYXJyb3dJbWcpO1xyXG4gIHRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtVG93bkJhc2VJY29uKTtcclxuICB0ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRlYW1DcnVzaEJhc2VJY29uKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UoKSB7XHJcbiAgY29uc29sZS5sb2coJ3VzZXIgcmV0dXJuZWQgaXRlbSB0byBiYXNlJyk7XHJcbiAgZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgZmFkZUFycm93VG9JbWFnZSgnYXJyb3cucG5nJyk7XHJcbiAgaW5jcmVtZW50SXRlbUNvdW50KHVzZXJJc09uVG93blRlYW0ocGVlci5pZCkpO1xyXG4gIGNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uVG93blRlYW0ocGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IGdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5jcmVtZW50SXRlbUNvdW50KGlzVGVhbVRvd24pIHtcclxuICBpZiAoaXNUZWFtVG93bikge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkKys7XHJcbiAgICAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpLnRleHQodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKys7XHJcbiAgICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmxhc2hFbGVtZW50KGpxdWVyeUVsZW0pIHtcclxuICBqcXVlcnlFbGVtLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VyQ29sbGlkZWRXaXRoSXRlbShjb2xsaXNpb25JdGVtT2JqZWN0KSB7XHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gY29sbGlzaW9uSXRlbU9iamVjdDtcclxuICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICBjb2xsaXNpb25JdGVtT2JqZWN0LmxvY2F0aW9uID0gbnVsbDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBwZWVyLmlkO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlSWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZUljb24pO1xyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3dfYmx1ZS5wbmcnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0RGVzdGluYXRpb24obG9jYXRpb24sIGFycm93SW1hZ2VOYW1lKSB7XHJcbiAgdGhpcy5kZXN0aW5hdGlvbiA9IGxvY2F0aW9uO1xyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCBhcnJvd0ltYWdlTmFtZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvdGF0ZUNhcigpIHtcclxuICB0aGlzLnJvdGF0aW9uID0gZ2V0QW5nbGUuY2FsbCh0aGlzLCB0aGlzLnNwZWVkLCB0aGlzLmhvcml6b250YWxTcGVlZCk7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICctbXMtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsgLyogSUUgOSAqLyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7IC8qIENocm9tZSwgU2FmYXJpLCBPcGVyYSAqLyB0cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvdGF0ZUFycm93KCkge1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbiA9IGNvbXB1dGVCZWFyaW5nQW5nbGUuY2FsbCh0aGlzLCB0aGlzLm1hcENlbnRlci5sYXQoKSwgdGhpcy5tYXBDZW50ZXIubG5nKCksIHRoaXMuZGVzdGluYXRpb24ubGF0KCksIHRoaXMuZGVzdGluYXRpb24ubG5nKCkpO1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyA9ICctbXMtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyAvKiBJRSA5ICovIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyAvKiBDaHJvbWUsIFNhZmFyaSwgT3BlcmEgKi8gdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZShzdGVwKSB7XHJcbiAgbW92ZUNhci5jYWxsKHRoaXMpO1xyXG5cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdCAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0pIHtcclxuICAgIC8vIGNoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gb25lIGNhciB3aXRoIGFuIGl0ZW0gYW5kIG9uZSB3aXRob3V0XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAvLyBpZiB0aGlzIHVzZXIgaGFzIGFuIGl0ZW0sIGNoZWNrIHRvIHNlZSBpZiB0aGV5IGFyZSBjb2xsaWRpbmdcclxuICAgICAgLy8gd2l0aCBhbnkgb3RoZXIgdXNlciwgYW5kIGlmIHNvLCB0cmFuc2ZlciB0aGUgaXRlbVxyXG4gICAgICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgICAgIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZC5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5jYXIubG9jYXRpb24sIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySWQpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBpZiBhbm90aGVyIHVzZXIgaGFzIGFuIGl0ZW0sIGFuZCB0aGVpciBjYXIgaGFzIGEgbG9jYXRpb24sXHJcbiAgICAgIC8vIHRoZW4gY29uc3RhbnRseSBzZXQgdGhlIGRlc3RpbmF0aW9uIHRvIHRoZWlyIGxvY2F0aW9uXHJcbiAgICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXSAmJiB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5sb2NhdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5jYXIubG9jYXRpb24pIHtcclxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjaGVjayBpZiB1c2VyIGNvbGxpZGVkIHdpdGggYW4gaXRlbSBvciB0aGUgYmFzZVxyXG4gIHZhciBjb2xsaXNpb25NYXJrZXIgPSBnZXRDb2xsaXNpb25NYXJrZXIuY2FsbCh0aGlzKTtcclxuICBpZiAoY29sbGlzaW9uTWFya2VyKSB7XHJcbiAgICBpZiAoIWNvbGxlY3RlZEl0ZW0gJiYgY29sbGlzaW9uTWFya2VyID09IHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgICAgLy8gdXNlciBqdXN0IHBpY2tlZCB1cCBhbiBpdGVtXHJcbiAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0KTtcclxuICAgICAgYnJvYWRjYXN0SXRlbUNvbGxlY3RlZC5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5pZCk7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29sbGVjdGVkSXRlbSAmJiBjb2xsaXNpb25NYXJrZXIgPT0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgICAvLyB1c2VyIGhhcyBhbiBpdGVtIGFuZCBpcyBiYWNrIGF0IHRoZSBiYXNlXHJcbiAgICAgIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UuY2FsbCh0aGlzKTtcclxuICAgICAgYnJvYWRjYXN0SXRlbVJldHVybmVkLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKTtcclxuICAgICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYnJvYWRjYXN0TXlDYXJMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBpZiB0aGUgZ2FtZSBoYXMgc3RhcnRlZCBhbmQgd2UncmUgdGhlIGhvc3QsIGNoZWNrXHJcbiAgLy8gZm9yIGFueSBwZWVycyB3aG8gaGF2ZW4ndCBzZW50IGFuIHVwZGF0ZSBpbiB0b28gbG9uZ1xyXG4gIGlmICh0aGlzLmhvc3RQZWVySWQgJiYgdGhpcy5wZWVyICYmIHRoaXMucGVlci5pZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG91bGRLZWVwQWxpdmUoKSB7XHJcbiAgcmV0dXJuIHFzLnZhbHVlKGtlZXBBbGl2ZVBhcmFtTmFtZSkgPT0gJ3RydWUnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zKCkge1xyXG4gIGlmIChzaG91bGRLZWVwQWxpdmUoKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRpbWVOb3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gb3RoZXJVc2Vycykge1xyXG4gICAgLy8gaWYgaXQncyBiZWVuIGxvbmdlciB0aGFuIHRoZSB0aW1lb3V0IHNpbmNlIHdlJ3ZlIGhlYXJkIGZyb21cclxuICAgIC8vIHRoaXMgdXNlciwgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgZ2FtZVxyXG4gICAgaWYgKG90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgJiYgKHRpbWVOb3cgLSBvdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lID4gQUNUSVZFX0NPTk5FQ1RJT05fVElNRU9VVF9JTl9TRUNPTkRTKSkge1xyXG4gICAgICBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24odXNlcik7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgaWYgKG90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSAmJiBvdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgb3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uY2xvc2UoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihkdCkge1xyXG4gICQoXCIjY2FyLWltZ1wiKS5hdHRyKFwic3R5bGVcIiwgdGhpcy5yb3RhdGlvbkNzcyk7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24oKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuICYmIHRoaXMubWFwQ2VudGVyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGNhckxhdExuZzoge1xyXG4gICAgICAgICAgbGF0OiB0aGlzLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBlZXJJZDogdGhpcy5wZWVyLmlkLFxyXG4gICAgICAgIHVzZXJuYW1lOiB0aGlzLnVzZXJuYW1lXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgZ2FtZSBzdGF0ZSB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdIHx8ICF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdXBkYXRlR2FtZVN0YXRlRXZlbnRPYmplY3QgPSB7XHJcbiAgICBldmVudDoge1xyXG4gICAgICBuYW1lOiAndXBkYXRlX2dhbWVfc3RhdGUnLFxyXG4gICAgICBnYW1lRGF0YU9iamVjdDogdGhpcy5nYW1lRGF0YVxyXG4gICAgfVxyXG4gIH07XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3SXRlbShsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHZhciBzaW1wbGVJdGVtTGF0TG5nID0ge1xyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgICAgZXZlbnQ6IHtcclxuICAgICAgICAgIG5hbWU6ICduZXdfaXRlbScsXHJcbiAgICAgICAgICBob3N0X3VzZXI6IHBlZXIuaWQsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBsYXQ6IHNpbXBsZUl0ZW1MYXRMbmcubGF0LFxyXG4gICAgICAgICAgICBsbmc6IHNpbXBsZUl0ZW1MYXRMbmcubG5nXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgaWQ6IGl0ZW1JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtUmV0dXJuZWQoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSByZXR1cm5lZCcpO1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9yZXR1cm5lZCcsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtOiBwZWVyLmlkLFxyXG4gICAgICAgIG5vd19udW1faXRlbXM6IHRoaXMuZ2FtZURhdGEudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCxcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtQ29sbGVjdGVkKGl0ZW1JZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSBpZCAnICsgaXRlbUlkICsgJyBjb2xsZWN0ZWQgYnkgdXNlciAnICsgcGVlci5pZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5nYW1lRGF0YS5wZWVySWRPZkNhcldpdGhJdGVtID0gcGVlci5pZDtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX2NvbGxlY3RlZCcsXHJcbiAgICAgICAgaWQ6IGl0ZW1JZCxcclxuICAgICAgICB1c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW06IHRoaXMuZ2FtZURhdGEucGVlcklkT2ZDYXJXaXRoSXRlbVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdFRyYW5zZmVyT2ZJdGVtKGl0ZW1JZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSB0cmFuc2ZlcnJlZCAnICsgaXRlbUlkICsgJyBmcm9tICcgKyBmcm9tVXNlclBlZXJJZCArICcgdG8gJyArIHRvVXNlclBlZXJJZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fdHJhbnNmZXJyZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgZnJvbVVzZXJQZWVySWQ6IGZyb21Vc2VyUGVlcklkLFxyXG4gICAgICAgIHRvVXNlclBlZXJJZDogdG9Vc2VyUGVlcklkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3TG9jYXRpb24obG9jYXRpb24pIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIG5ldyBsb2NhdGlvbjogJyArIGxvY2F0aW9uLmxhdCgpICsgJywnICsgbG9jYXRpb24ubG5nKCkpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICduZXdfbG9jYXRpb24nLFxyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKSxcclxuICAgICAgICBvcmlnaW5hdGluZ19wZWVyX2lkOiBwZWVyLmlkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuLy8gY2hlY2tzIHRvIHNlZSBpZiB0aGV5IGhhdmUgY29sbGlkZWQgd2l0aCBlaXRoZXIgYW4gaXRlbSBvciB0aGUgYmFzZVxyXG5mdW5jdGlvbiBnZXRDb2xsaXNpb25NYXJrZXIoKSB7XHJcbiAgLy8gY29tcHV0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiBteSBjYXIgYW5kIHRoZSBkZXN0aW5hdGlvblxyXG4gIGlmICh0aGlzLmRlc3RpbmF0aW9uKSB7XHJcbiAgICB2YXIgbWF4RGlzdGFuY2VBbGxvd2VkID0gdGhpcy5jYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZTtcclxuICAgIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKHRoaXMubWFwQ2VudGVyLCB0aGlzLmRlc3RpbmF0aW9uKTtcclxuICAgIC8vIFRoZSBiYXNlIGlzIGJpZ2dlciwgc28gYmUgbW9yZSBsZW5pZW50IHdoZW4gY2hlY2tpbmcgZm9yIGEgYmFzZSBjb2xsaXNpb25cclxuICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtYXhEaXN0YW5jZUFsbG93ZWQgPSB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgaWYgKGRpc3RhbmNlIDwgbWF4RGlzdGFuY2VBbGxvd2VkKSB7XHJcbiAgICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyB0aGlzLnBlZXIuaWQgKyAnIGNvbGxpZGVkIHdpdGggaXRlbScpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyO1xyXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuZGVzdGluYXRpb24gPT0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29sbGVjdGVkSXRlbSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgJyArIHRoaXMucGVlci5pZCArICcgaGFzIGFuIGl0ZW0gYW5kIGNvbGxpZGVkIHdpdGggYmFzZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0R2FtZVRvTmV3TG9jYXRpb24obGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhLmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZShsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZSgocGFyc2VGbG9hdChsYXQpICsgMC4wMDYpLnRvU3RyaW5nKCksIChwYXJzZUZsb2F0KGxuZykgKyAwLjAwOCkudG9TdHJpbmcoKSk7XHJcbiAgYXNzaWduTXlUZWFtQmFzZSgpO1xyXG4gIG1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIG1hcC5zZXRDZW50ZXIobWFwQ2VudGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QW5nbGUodngsIHZ5KSB7XHJcbiAgcmV0dXJuIChNYXRoLmF0YW4yKHZ5LCB2eCkpICogKDE4MCAvIE1hdGguUEkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlQmVhcmluZ0FuZ2xlKGxhdDEsIGxvbjEsIGxhdDIsIGxvbjIpIHtcclxuICB2YXIgUiA9IDYzNzE7IC8vIGttXHJcbiAgdmFyIGRMYXQgPSAobGF0MiAtIGxhdDEpLnRvUmFkKCk7XHJcbiAgdmFyIGRMb24gPSAobG9uMiAtIGxvbjEpLnRvUmFkKCk7XHJcbiAgdmFyIGxhdDEgPSBsYXQxLnRvUmFkKCk7XHJcbiAgdmFyIGxhdDIgPSBsYXQyLnRvUmFkKCk7XHJcblxyXG4gIHZhciBhbmdsZUluUmFkaWFucyA9IE1hdGguYXRhbjIoTWF0aC5zaW4oZExvbikgKiBNYXRoLmNvcyhsYXQyKSxcclxuICAgIE1hdGguY29zKGxhdDEpICogTWF0aC5zaW4obGF0MikgLSBNYXRoLnNpbihsYXQxKSAqIE1hdGguY29zKGxhdDIpICogTWF0aC5jb3MoZExvbikpO1xyXG4gIHJldHVybiBhbmdsZUluUmFkaWFucy50b0RlZygpO1xyXG59XHJcblxyXG4vLyBrZXkgZXZlbnRzXHJcbmZ1bmN0aW9uIG9uS2V5RG93bihldnQpIHtcclxuICBpZiAoZXZ0LmtleUNvZGUgPT0gMzkpIHtcclxuICAgIHJpZ2h0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgbGVmdERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzgpIHtcclxuICAgIHVwRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSA0MCkge1xyXG4gICAgZG93bkRvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMTcpIHtcclxuICAgIGN0cmxEb3duID0gdHJ1ZTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9uS2V5VXAoZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICByaWdodERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICBsZWZ0RG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzgpIHtcclxuICAgIHVwRG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIGRvd25Eb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgY3RybERvd24gPSBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGdhbWUgbG9vcCBoZWxwZXJzXHJcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcclxuICByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxufVxyXG5cclxuLy8gZG9uJ3QgdGhpbmsgd2UnbGwgbmVlZCB0byBnbyB0byB0aGUgdXNlcidzIGxvY2F0aW9uLCBidXQgbWlnaHQgYmUgdXNlZnVsXHJcbmZ1bmN0aW9uIHRyeUZpbmRpbmdMb2NhdGlvbigpIHtcclxuICAvLyBUcnkgSFRNTDUgZ2VvbG9jYXRpb25cclxuICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XHJcbiAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgIHZhciBwb3MgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcclxuICAgICAgICBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlKTtcclxuICAgICAgbWFwLnNldENlbnRlcihwb3MpO1xyXG4gICAgICBtYXBDZW50ZXIgPSBwb3M7XHJcbiAgICB9LCBmdW5jdGlvbigpIHtcclxuICAgICAgaGFuZGxlTm9HZW9sb2NhdGlvbih0cnVlKTtcclxuICAgIH0pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGRvZXNuJ3Qgc3VwcG9ydCBHZW9sb2NhdGlvblxyXG4gICAgaGFuZGxlTm9HZW9sb2NhdGlvbihmYWxzZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVOb0dlb2xvY2F0aW9uKGVycm9yRmxhZykge1xyXG4gIGlmIChlcnJvckZsYWcpIHtcclxuICAgIHZhciBjb250ZW50ID0gJ0Vycm9yOiBUaGUgR2VvbG9jYXRpb24gc2VydmljZSBmYWlsZWQuJztcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIGNvbnRlbnQgPSAnRXJyb3I6IFlvdXIgYnJvd3NlciBkb2VzblxcJ3Qgc3VwcG9ydCBnZW9sb2NhdGlvbi4nO1xyXG4gIH1cclxufVxyXG5cclxuLy8gVGhpcyBjYW4gYmUgcmVtb3ZlZCwgc2luY2UgaXQgY2F1c2VzIGFuIGVycm9yLiAgaXQncyBqdXN0IGFsbG93aW5nXHJcbi8vIGZvciByaWdodC1jbGlja2luZyB0byBzaG93IHRoZSBicm93c2VyJ3MgY29udGV4dCBtZW51LlxyXG5mdW5jdGlvbiBzaG93Q29udGV4dE1lbnUoZSkge1xyXG5cclxuICAvLyBjcmVhdGUgYSBjb250ZXh0bWVudSBldmVudC5cclxuICB2YXIgbWVudV9ldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudHNcIik7XHJcbiAgbWVudV9ldmVudC5pbml0TW91c2VFdmVudChcImNvbnRleHRtZW51XCIsIHRydWUsIHRydWUsXHJcbiAgICBlLnZpZXcsIDEsIDAsIDAsIDAsIDAsIGZhbHNlLFxyXG4gICAgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMiwgbnVsbCk7XHJcblxyXG4gIC8vIGZpcmUgdGhlIG5ldyBldmVudC5cclxuICBlLm9yaWdpbmFsVGFyZ2V0LmRpc3BhdGNoRXZlbnQobWVudV9ldmVudCk7XHJcbn1cclxuXHJcblxyXG4vLyBoYWNrIHRvIGFsbG93IGZvciBicm93c2VyIGNvbnRleHQgbWVudSBvbiByaWdodC1jbGlja1xyXG5mdW5jdGlvbiBtb3VzZVVwKGUpIHtcclxuICBpZiAoZS5idXR0b24gPT0gMikgeyAvLyByaWdodC1jbGlja1xyXG4gICAgdGhpcy5zaG93Q29udGV4dE1lbnUoZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyAkKHdpbmRvdykudW5sb2FkKGZ1bmN0aW9uKCkge1xyXG4vLyAgIGRpc2Nvbm5lY3RGcm9tR2FtZSgpO1xyXG4vLyB9KTsiLCIvKipcclxuICogIG1hdGNobWFrZXIuanNcclxuICovXHJcblxyXG4vKipcclxuICogIGV4cG9ydCBjbGFzc1xyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBNYXRjaG1ha2VyVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCkge1xyXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXRjaG1ha2VyVG93bikpXHJcbiAgICByZXR1cm4gbmV3IE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCk7XHJcblxyXG4gIC8vIFRoZSByb290IG9mIHlvdXIgZ2FtZSBkYXRhLlxyXG4gIHRoaXMuR0FNRV9MT0NBVElPTiA9IGZpcmViYXNlQmFzZVVybDtcclxuICB0aGlzLmdhbWVSZWYgPSBuZXcgRmlyZWJhc2UodGhpcy5HQU1FX0xPQ0FUSU9OKTtcclxuXHJcbiAgdGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04gPSAnYXZhaWxhYmxlX2dhbWVzJztcclxuICB0aGlzLkZVTExfR0FNRVNfTE9DQVRJT04gPSAnZnVsbF9nYW1lcyc7XHJcbiAgdGhpcy5BTExfR0FNRVNfTE9DQVRJT04gPSAnZ2FtZXMnO1xyXG4gIHRoaXMuTUFYX1VTRVJTX1BFUl9HQU1FID0gNDtcclxuICB0aGlzLkdBTUVfQ0xFQU5VUF9USU1FT1VUID0gMzAgKiAxMDAwOyAvLyBpbiBtaWxsaXNlY29uZHNcclxuXHJcbiAgdGhpcy5qb2luZWRHYW1lID0gbnVsbDtcclxuICB0aGlzLm15V29ya2VyID0gbnVsbDtcclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiAgY29ubmVjdCB0byBhIGdhbWVcclxuICovXHJcbk1hdGNobWFrZXJUb3duLnByb3RvdHlwZS5qb2luT3JDcmVhdGVHYW1lID0gZnVuY3Rpb24odXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcy5jYWxsKHRoaXMpO1xyXG4gIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gam9pbiBnYW1lJyk7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlci5jYWxsKHRoaXMsIHdpbmRvdyk7XHJcbiAgdmFyIGF2YWlsYWJsZUdhbWVzRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTik7XHJcbiAgYXZhaWxhYmxlR2FtZXNEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgLy8gb25seSBqb2luIGEgZ2FtZSBpZiBvbmUgaXNuJ3Qgam9pbmVkIGFscmVhZHlcclxuICAgIGlmIChzZWxmLmpvaW5lZEdhbWUgPT0gbnVsbCkge1xyXG4gICAgICBzZWxmLmpvaW5lZEdhbWUgPSAtMTtcclxuICAgICAgaWYgKGRhdGEudmFsKCkgPT09IG51bGwpIHtcclxuICAgICAgICAvLyB0aGVyZSBhcmUgbm8gYXZhaWxhYmxlIGdhbWVzLCBzbyBjcmVhdGUgb25lXHJcbiAgICAgICAgdmFyIGdhbWVEYXRhID0gY3JlYXRlTmV3R2FtZS5jYWxsKHNlbGYsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgICAgIGpvaW5lZEdhbWVDYWxsYmFjayhnYW1lRGF0YSwgdHJ1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnZhbCgpO1xyXG4gICAgICAgIHZhciBnYW1lSWQ7XHJcblxyXG4gICAgICAgIC8vIHN0dXBpZCBqYXZhc2NyaXB0IHdvbid0IHRlbGwgbWUgaG93IG1hbnkgZ2FtZSBlbGVtZW50c1xyXG4gICAgICAgIC8vIGFyZSBpbiB0aGUganNvbk9iaiwgc28gY291bnQgZW0gdXBcclxuICAgICAgICB2YXIgbnVtQXZhaWxhYmxlR2FtZXMgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uT2JqKSB7XHJcbiAgICAgICAgICBudW1BdmFpbGFibGVHYW1lcysrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBjaGlsZCBnYW1lcyBhbmQgdHJ5XHJcbiAgICAgICAgLy8gdG8gam9pbiBlYWNoIG9uZVxyXG4gICAgICAgIHZhciBjb3VudGVyID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgY291bnRlcisrO1xyXG4gICAgICAgICAgaWYgKGpzb25PYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICBnYW1lSWQgPSBqc29uT2JqW2tleV07XHJcbiAgICAgICAgICAgIGdldEdhbWVMYXN0VXBkYXRlVGltZS5jYWxsKHNlbGYsIGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWUsIGNvdW50ZXIgPT0gbnVtQXZhaWxhYmxlR2FtZXMsIHNlbGYpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqICByZW1vdmUgYSBwZWVyIGZyb20gdGhlIGdhbWVcclxuICovXHJcbmZ1bmN0aW9uIHJlbW92ZVBlZXJGcm9tR2FtZShnYW1lSWQsIHBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKCFkYXRhLnZhbCgpKSB7XHJcbiAgICAgIC8vIHNvbWV0aGluZydzIHdyb25nLCBwcm9iYWJseSB0aGUgRmlyZWJhc2UgZGF0YSB3YXMgZGVsZXRlZFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS52YWwoKS5ob3N0UGVlcklkID09IHRoaXMucGVlcklkKSB7XHJcbiAgICAgIGZpbmROZXdIb3N0UGVlcklkLmNhbGwodGhpcywgZ2FtZUlkLCBwZWVySWQsIHN3aXRjaFRvTmV3SG9zdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbiAgICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gICAgdmFyIG51bVVzZXJzSW5HYW1lID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKS5jbGVhbih1bmRlZmluZWQpLmxlbmd0aDtcclxuICAgIGRhdGEuY2hpbGQoJ3VzZXJzJykuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIC8vIGlmIHdlJ3ZlIGZvdW5kIHRoZSByZWYgdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiBwZWVyLCByZW1vdmUgaXRcclxuICAgICAgaWYgKGNoaWxkU25hcHNob3QudmFsKCkgJiYgY2hpbGRTbmFwc2hvdC52YWwoKS5wZWVySWQgPT0gdGhpcy5wZWVySWQpIHtcclxuICAgICAgICBjaGlsZFNuYXBzaG90LnJlZigpLnJlbW92ZSgpO1xyXG4gICAgICAgIC8vIGlmIHRoaXMgdXNlciB3YXMgdGhlIGxhc3Qgb25lIGluIHRoZSBnYW1lLCBub3cgdGhlcmUgYXJlIDAsIFxyXG4gICAgICAgIC8vIHNvIGRlbGV0ZSB0aGUgZ2FtZVxyXG4gICAgICAgIGlmIChudW1Vc2Vyc0luR2FtZSA9PSAxKSB7XHJcbiAgICAgICAgICBkZWxldGVHYW1lLmNhbGwodGhpcywgZ2FtZUlkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gaWYgaXQgd2FzIGZ1bGwsIG5vdyBpdCBoYXMgb25lIG9wZW4gc2xvdCwgc2V0IGl0IHRvIGF2YWlsYWJsZVxyXG4gICAgICAgICAgaWYgKG51bVVzZXJzSW5HYW1lID09IHRoaXMuTUFYX1VTRVJTX1BFUl9HQU1FKSB7XHJcbiAgICAgICAgICAgIG1vdmVHYW1lRnJvbUZ1bGxUb0F2YWlsYWJsZS5jYWxsKHRoaXMsIGdhbWVJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBkb25lR2V0dGluZ1VwZGF0ZVRpbWUobGFzdFVwZGF0ZVRpbWUsIGdhbWVJZCwgaXNUaGVMYXN0R2FtZSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBzY29wZSkge1xyXG4gIC8vIGlmIHRoZSBnYW1lIGlzIHN0aWxsIGFjdGl2ZSBqb2luIGl0XHJcbiAgaWYgKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICBpZiAoIWlzVGltZW91dFRvb0xvbmcuY2FsbChzY29wZSwgbGFzdFVwZGF0ZVRpbWUpKSB7XHJcbiAgICAgIGpvaW5FeGlzdGluZ0dhbWUuY2FsbChzY29wZSwgZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcy5jYWxsKHNjb3BlKTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gaWYgd2UgZ290IGhlcmUsIGFuZCB0aGlzIGlzIHRoZSBsYXN0IGdhbWUsIHRoYXQgbWVhbnMgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSBnYW1lc1xyXG4gIC8vIHNvIGNyZWF0ZSBvbmVcclxuICBpZiAoaXNUaGVMYXN0R2FtZSkge1xyXG4gICAgY29uc29sZS5sb2coJ25vIGF2YWlsYWJsZSBnYW1lcyBmb3VuZCwgb25seSBpbmFjdGl2ZSBvbmVzLCBzbyBjcmVhdGluZyBhIG5ldyBvbmUuLi4nKTtcclxuICAgIHZhciBnYW1lRGF0YSA9IGNyZWF0ZU5ld0dhbWUuY2FsbChzY29wZSwgdXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICBqb2luZWRHYW1lQ2FsbGJhY2soZ2FtZURhdGEsIHRydWUpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0R2FtZUxhc3RVcGRhdGVUaW1lKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWVDYWxsYmFjaywgaXNUaGVMYXN0R2FtZSkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoZGF0YS52YWwoKSAmJiBkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdmb3VuZCB1cGRhdGUgdGltZTogJyArIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpXHJcbiAgICAgIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrKGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUsIGdhbWVJZCwgaXNUaGVMYXN0R2FtZSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBzZWxmKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlclBpbmcoKSB7XHJcbiAgc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZS5jYWxsKHRoaXMpO1xyXG4gIHdpbmRvdy5zZXRJbnRlcnZhbCh0aGlzLnNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUsIDEwMDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlcih3aW5kb3dPYmplY3QpIHtcclxuICBpZiAodHlwZW9mKHdpbmRvd09iamVjdC5Xb3JrZXIpICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICB0aGlzLm15V29ya2VyID0gbmV3IFdvcmtlcihcImFzeW5jbWVzc2FnZXIuanNcIik7XHJcbiAgICB0aGlzLm15V29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLnByb2Nlc3NNZXNzYWdlRXZlbnQsIGZhbHNlKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coXCJTb3JyeSwgeW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViIFdvcmtlcnMuLi5cIik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcygpIHtcclxuICAvLyBkbyBpdCBvbiBhIHdlYiB3b3JrZXIgdGhyZWFkXHJcbiAgaWYgKHRoaXMubXlXb3JrZXIpIHtcclxuICAgIHRoaXMubXlXb3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICBjbWQ6ICdjbGVhbnVwX2luYWN0aXZlX2dhbWVzJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZSgpIHtcclxuICBjb25zb2xlLmxvZygncGluZ2luZyBzZXJ2ZXInKTtcclxuICBnYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZCh0aGlzLmpvaW5lZEdhbWUpLmNoaWxkKCdsYXN0VXBkYXRlVGltZScpLnNldCgobmV3IERhdGUoKSkuZ2V0VGltZSgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cEdhbWVzKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgY29uc29sZS5sb2coJ2NsZWFuaW5nIHVwIGluYWN0aXZlIGdhbWVzJyk7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGFTbmFwc2hvdCkge1xyXG4gICAgZGF0YVNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTbmFwc2hvdCkge1xyXG4gICAgICB2YXIgc2hvdWxkRGVsZXRlR2FtZSA9IGZhbHNlO1xyXG4gICAgICB2YXIgZ2FtZURhdGEgPSBjaGlsZFNuYXBzaG90LnZhbCgpO1xyXG4gICAgICBpZiAoIWdhbWVEYXRhKSB7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlR2FtZSA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGdhbWVEYXRhLnVzZXJzID09IG51bGwgfHwgZ2FtZURhdGEudXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBoYXMgbm8gdXNlcnMnKTtcclxuICAgICAgICBzaG91bGREZWxldGVHYW1lID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNUaW1lb3V0VG9vTG9uZy5jYWxsKHNlbGYsIGdhbWVEYXRhLmxhc3RVcGRhdGVUaW1lKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZ2FtZSBoYXNuJ3QgYmVlbiB1cGRhdGVkIHNpbmNlIFwiICsgZ2FtZURhdGEubGFzdFVwZGF0ZVRpbWUpO1xyXG4gICAgICAgIHNob3VsZERlbGV0ZUdhbWUgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2hvdWxkRGVsZXRlR2FtZSkge1xyXG4gICAgICAgIGRlbGV0ZUdhbWUoc2VsZiwgY2hpbGRTbmFwc2hvdC5uYW1lKCkpO1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGlzVGltZW91dFRvb0xvbmcobGFzdFVwZGF0ZVRpbWUpIHtcclxuICBpZiAoIWxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHZhciBjdXJyZW50VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgcmV0dXJuIChjdXJyZW50VGltZSAtIGxhc3RVcGRhdGVUaW1lID4gdGhpcy5HQU1FX0NMRUFOVVBfVElNRU9VVCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NNZXNzYWdlRXZlbnQoZXZlbnQpIHtcclxuICBzd2l0Y2ggKGV2ZW50LmRhdGEpIHtcclxuICAgIGNhc2UgJ2NsZWFudXBfaW5hY3RpdmVfZ2FtZXMnOlxyXG4gICAgICBjbGVhbnVwR2FtZXMuc2VsZigpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIGJyZWFrO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGZpbmROZXdIb3N0UGVlcklkKGdhbWVJZCwgZXhpc3RpbmdIb3N0UGVlcklkLCBjYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gcmVzZXQgdGhlIGhvc3RQZWVySWQgc28gaXQgcHJldmVudHMgdGhlIGxlYXZpbmcgaG9zdCdzIGJyb3dzZXJcclxuICAvLyBpZiBpdCB0cmllcyB0byBzd2l0Y2ggYWdhaW4gYmVmb3JlIHRoaXMgaXMgZG9uZVxyXG4gIHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKS5jaGlsZCgnaG9zdFBlZXJJZCcpLnJlbW92ZSgpO1xyXG5cclxuICB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICB2YXIgdXNlcnMgPSBkYXRhLmNoaWxkKCd1c2VycycpLnZhbCgpO1xyXG5cclxuICAgIC8vIGlmIGZvciB3aGF0ZXZlciByZWFzb24gdGhpcyBpcyBjYWxsZWQgYW5kIHNvbWV0aGluZydzIG5vdCByaWdodCwganVzdFxyXG4gICAgLy8gcmV0dXJuXHJcbiAgICBpZiAoIXVzZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB1c2VycyA9IHVzZXJzLmNsZWFuKHVuZGVmaW5lZCk7XHJcbiAgICBpZiAodXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHVzZXJzW2ldICYmIHVzZXJzW2ldLnBlZXJJZCAhPSBleGlzdGluZ0hvc3RQZWVySWQpIHtcclxuICAgICAgICAvLyB3ZSd2ZSBmb3VuZCBhIG5ldyB1c2VyIHRvIGJlIHRoZSBob3N0LCByZXR1cm4gdGhlaXIgaWRcclxuICAgICAgICBjYWxsYmFjayhnYW1lSWQsIHVzZXJzW2ldLnBlZXJJZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNhbGxiYWNrKGdhbWVJZCwgbnVsbCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN3aXRjaFRvTmV3SG9zdChnYW1lSWQsIG5ld0hvc3RQZWVySWQpIHtcclxuICBpZiAoIW5ld0hvc3RQZWVySWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLmNoaWxkKCdob3N0UGVlcklkJykuc2V0KG5ld0hvc3RQZWVySWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkZWxldGVHYW1lKGdhbWVJZCkge1xyXG4gIHJlbW92ZUdhbWVGcm9tQXZhaWxhYmxlR2FtZXMuY2FsbCh0aGlzLCBnYW1lSWQpO1xyXG4gIHJlbW92ZUdhbWVGcm9tRnVsbEdhbWVzLmNhbGwodGhpcywgZ2FtZUlkKTtcclxuICByZW1vdmVHYW1lLmNhbGwodGhpcywgZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlR2FtZShnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld0dhbWUodXNlcm5hbWUsIHBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdjcmVhdGluZyBuZXcgZ2FtZScpO1xyXG4gIHZhciBnYW1lSWQgPSBjcmVhdGVOZXdHYW1lSWQuY2FsbCh0aGlzKTtcclxuICB2YXIgZ2FtZURhdGEgPSB7XHJcbiAgICBpZDogZ2FtZUlkLFxyXG4gICAgaG9zdFBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcnM6IFt7XHJcbiAgICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgIH1dXHJcbiAgfVxyXG4gIHZhciBuZXdHYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBuZXdHYW1lRGF0YVJlZi5zZXQoZ2FtZURhdGEpO1xyXG4gIHZhciBuZXdBdmFpbGFibGVHYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBuZXdBdmFpbGFibGVHYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxuICB0aGlzLmpvaW5lZEdhbWUgPSBnYW1lSWQ7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxuICByZXR1cm4gZ2FtZURhdGE7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOZXdHYW1lSWQoKSB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSB0aGlzIHdpdGggc29tZXRoaW5nIHRoYXQgd29uJ3RcclxuICAvLyBhY2NpZGVudGFsbHkgaGF2ZSBjb2xsaXNpb25zXHJcbiAgcmV0dXJuIGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBqb2luRXhpc3RpbmdHYW1lKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrLCBzY29wZSkge1xyXG4gIC8vIGlmIGEgZ2FtZSBoYXMgYWxyZWFkeSBiZWVuIGpvaW5lZCBvbiBhbm90aGVyIHRocmVhZCwgZG9uJ3Qgam9pbiBhbm90aGVyIG9uZVxyXG4gIGlmIChzY29wZS5qb2luZWRHYW1lICYmIHNjb3BlLmpvaW5lZEdhbWUgPj0gMCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBzY29wZS5qb2luZWRHYW1lID0gZ2FtZUlkO1xyXG4gIGFzeW5jR2V0R2FtZURhdGEuY2FsbChzY29wZSwgZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIHNjb3BlLmRvbmVHZXR0aW5nR2FtZURhdGEpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gYXN5bmNHZXRHYW1lRGF0YShnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgZG9uZUdldHRpbmdHYW1lRGF0YUNhbGxiYWNrKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZG9uZUdldHRpbmdHYW1lRGF0YUNhbGxiYWNrKGRhdGEsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjayk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nR2FtZURhdGEoZ2FtZURhdGFTbmFwc2hvdCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgdmFyIGdhbWVEYXRhID0gZ2FtZURhdGFTbmFwc2hvdC52YWwoKTtcclxuICB2YXIgbmV3VXNlciA9IHtcclxuICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgfTtcclxuICAvLyB3ZWlyZG5lc3M6IGkgd2FudCB0byBqdXN0IHB1c2ggbmV3VXNlciBvbnRvIGdhbWVEYXRhLnVzZXJzLCBidXRcclxuICAvLyB0aGF0IG1lc3NlcyB1cCB0aGUgYXJyYXkgSSBndWVzc1xyXG4gIHZhciB1c2Vyc0FycmF5ID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGdhbWVEYXRhLnVzZXJzW2ldKSB7XHJcbiAgICAgIHVzZXJzQXJyYXkucHVzaChnYW1lRGF0YS51c2Vyc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVzZXJzQXJyYXkucHVzaChuZXdVc2VyKTtcclxuICBnYW1lRGF0YS51c2VycyA9IHVzZXJzQXJyYXk7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gZ2FtZURhdGFTbmFwc2hvdC5yZWYoKTtcclxuICBnYW1lRGF0YVJlZi5zZXQoZ2FtZURhdGEpO1xyXG4gIGNvbnNvbGUubG9nKCdqb2luaW5nIGdhbWUgJyArIGdhbWVEYXRhLmlkKTtcclxuICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuICBpZiAodXNlcnNBcnJheS5sZW5ndGggPT0gdGhpcy5NQVhfVVNFUlNfUEVSX0dBTUUpIHtcclxuICAgIHNldEdhbWVUb0Z1bGwuY2FsbCh0aGlzLCBnYW1lRGF0YS5pZCk7XHJcbiAgfVxyXG4gIHZhciBwZWVySWRzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBqID0gMDsgaiA8IGdhbWVEYXRhLnVzZXJzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBwZWVySWRzQXJyYXkucHVzaChnYW1lRGF0YS51c2Vyc1tqXS5wZWVySWQpO1xyXG4gIH1cclxuICBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrKHBlZXJJZHNBcnJheSk7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxuICBqb2luZWRHYW1lQ2FsbGJhY2soZ2FtZURhdGEsIGZhbHNlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0R2FtZVRvRnVsbChnYW1lSWQpIHtcclxuICB0aGlzLnJlbW92ZUdhbWVGcm9tQXZhaWxhYmxlR2FtZXMoZ2FtZUlkKTtcclxuICB0aGlzLmFkZEdhbWVUb0Z1bGxHYW1lc0xpc3QoZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlR2FtZUZyb21BdmFpbGFibGVHYW1lcyhnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZEdhbWVUb0Z1bGxHYW1lc0xpc3QoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gZ2FtZVJlZi5jaGlsZCh0aGlzLkZVTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYuc2V0KGdhbWVJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVHYW1lRnJvbUZ1bGxUb0F2YWlsYWJsZShnYW1lSWQpIHtcclxuICB0aGlzLnJlbW92ZUdhbWVGcm9tRnVsbEdhbWVzKGdhbWVJZCk7XHJcbiAgdGhpcy5hZGRHYW1lVG9BdmFpbGFibGVHYW1lc0xpc3QoZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlR2FtZUZyb21GdWxsR2FtZXMoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gZ2FtZVJlZi5jaGlsZCh0aGlzLkZVTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZEdhbWVUb0F2YWlsYWJsZUdhbWVzTGlzdChnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSBnYW1lUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLnNldChnYW1lSWQpO1xyXG59XHJcblxyXG5cclxuLy8gLy8gcmV0dXJucyBudWxsIGlmIHRoZSB1c2VyIHdhc24ndCBmb3VuZCBpbiB0aGUgZ2FtZVxyXG4vLyBmdW5jdGlvbiByZW1vdmVVc2VyRnJvbUdhbWVEYXRhKHBlZXJJZCwgZ2FtZURhdGEpIHtcclxuLy8gICAvLyBpZiBzb21ldGhpbmcncyB3cm9uZywganVzdCByZXR1cm5cclxuLy8gICBpZiAoIWdhbWVEYXRhIHx8ICFnYW1lRGF0YS51c2Vycykge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfVxyXG5cclxuLy8gICAvLyBUT0RPOiBGaXJlYmFzZSBoYXMgYSBiZXR0ZXIgd2F5IG9mIGRvaW5nIHRoaXNcclxuLy8gICB2YXIgZm91bmRQZWVyID0gZmFsc2U7XHJcblxyXG4vLyAgIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4vLyAgIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIGdhbWUuIFNvIHRyaW0gb3V0IHRoZSBcclxuLy8gICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4vLyAgIGdhbWVEYXRhLnVzZXJzID0gZ2FtZURhdGEudXNlcnMuY2xlYW4odW5kZWZpbmVkKTtcclxuXHJcbi8vICAgdXNlcnNXaXRob3V0UGVlciA9IFtdO1xyXG4vLyAgIGZvciAoaSA9IDA7IGkgPCBnYW1lRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4vLyAgICAgaWYgKGdhbWVEYXRhLnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuLy8gICAgICAgZm91bmRQZWVyID0gdHJ1ZTtcclxuLy8gICAgIH0gZWxzZSB7XHJcbi8vICAgICAgIHVzZXJzV2l0aG91dFBlZXIucHVzaChnYW1lRGF0YS51c2Vyc1tpXSk7XHJcbi8vICAgICB9XHJcbi8vICAgfVxyXG5cclxuLy8gICBpZiAoZm91bmRQZWVyKSB7XHJcbi8vICAgICBnYW1lRGF0YS51c2VycyA9IHVzZXJzV2l0aG91dFBlZXI7XHJcbi8vICAgICByZXR1cm4gZ2FtZURhdGE7XHJcbi8vICAgfSBlbHNlIHtcclxuLy8gICAgIHJldHVybiBudWxsO1xyXG4vLyAgIH0iXX0=
