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
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);

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
  requestAnimationFrame(this.frame);
}

// key events
SmugglersTown.prototype.onKeyDown = function(evt) {
  if (evt.keyCode == 39) {
    this.rightDown = true;
  } else if (evt.keyCode == 37) {
    this.leftDown = true;
  } else if (evt.keyCode == 38) {
    this.upDown = true;
  } else if (evt.keyCode == 40) {
    this.downDown = true;
  } else if (evt.keyCode == 17) {
    this.ctrlDown = true;
  }
}

SmugglersTown.prototype.onKeyUp = function(evt) {
  if (evt.keyCode == 39) {
    this.rightDown = false;
  } else if (evt.keyCode == 37) {
    this.leftDown = false;
  } else if (evt.keyCode == 38) {
    this.upDown = false;
  } else if (evt.keyCode == 40) {
    this.downDown = false;
  } else if (evt.keyCode == 17) {
    this.ctrlDown = false;
  }
}


function initializeBoostBar() {
  $(function() {
    $("#boost-bar").progressbar({
      value: 100
    });
  });
}

function mapIsReady() {
  this.matchmakerTown.joinOrCreateGame(this.username, this.peer.id, connectToAllNonHostUsers.bind(this), gameJoined.bind(this))
}

function gameJoined(gameData, isNewGame) {
  this.gameId = gameData.id;
  if (isNewGame) {
    // we're hosting the game ourself
    this.hostPeerId = this.peer.id;

    // first user is always on team town
    gameData.teamTownObject.users = [{
      peerId: this.peer.id,
      username: this.username
    }];
    $('#team-town-text').css('background-color', 'yellow');
    $('#team-town-text').css('color', 'black');
  } else {
    // someone else is already the host
    this.hostPeerId = gameData.hostPeerId;
    activateTeamCrushInUI.call(this);
  }
  updateUsernamesInUI.call(this);
  updateCarIcons.call(this);
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
    if (nonHostPeerIds[i] != this.peer.id) {
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
  var self = this;
  console.log('trying to connect to ' + otherUserPeerId);
  $('#peer-connection-status').text('trying to connect to ' + otherUserPeerId);
  var peerJsConnection = this.peer.connect(otherUserPeerId);
  peerJsConnection.on('open', function() {
    console.log('connection open');
    connectedToPeer.call(self, peerJsConnection);
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
  var self = this;
  if (!this.otherUsers[otherUserPeerId]) {
    this.otherUsers[otherUserPeerId] = {};
  }
  this.otherUsers[otherUserPeerId].peerJsConnection = peerJsConnection;
  this.otherUsers[otherUserPeerId].peerJsConnection.on('close', function() {
    console.log('closing connection');
    otherUserDisconnected.call(self, otherUserPeerId);
  });
  this.otherUsers[otherUserPeerId].peerJsConnection.on('data', function(data) {
    dataReceived.call(self, data);
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
    if (this.otherUsers[data.peerId] && !this.otherUsers[data.peerId].hasBeenInitialized && this.hostPeerId == this.peer.id) {
      this.otherUsers[data.peerId].hasBeenInitialized = true;
      // not sure if we should do this or not, but at least it resets the game
      // state to what we, the host, think it is
      broadcastGameStateToAllPeers.call(this);
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
      if (parseFloat(data.event.gameDataObject.initialLocation.lat) != parseFloat(this.gameDataObject.initialLocation.lat) ||
        parseFloat(data.event.gameDataObject.initialLocation.lng) != parseFloat(this.gameDataObject.initialLocation.lng)) {
        this.map.setCenter(new google.maps.LatLng(
          data.event.gameDataObject.initialLocation.lat,
          data.event.gameDataObject.initialLocation.lng));
      }
      this.gameDataObject = data.event.gameDataObject;
      // need to make this call because we can be in a situation where the host
      // doesn't know our username yet, so we need to manually set it in our
      // own UI first.
      updateUsername.call(this, this.peer.id, this.username);
      updateUIWithNewGameState.call(this);
      assignMyTeamBase.call(this);
      updateCarIcons.call(this);
    }
    if (data.event.name == 'new_location') {
      console.log('received event: new location ' + data.event.lat + ',' + data.event.lng);
      if (data.event.originating_peer_id != this.peer.id) {
        otherUserChangedLocation.call(this, data.event.lat, data.event.lng);
        return;
      }
    }
    if (data.event.name == 'item_collected') {
      console.log('received event: item collected by ' + data.event.user_id_of_car_with_item);
      if (data.event.user_id_of_car_with_item != this.peer.id) {
        otherUserCollectedItem.call(this, data.event.user_id_of_car_with_item);
      }
    }
    if (data.event.name == 'new_item') {
      console.log('received event: new item at ' +
        data.event.location.lat + ',' + data.event.location.lng +
        ' with id ' + data.event.id);
      this.gameDataObject.peerIdOfCarWithItem = null;
      // Only update if someone else caused the new item placement.
      // if this user did it, it was already placed
      if (data.event.host_user && data.event.host_user != this.peer.id) {
        var itemLocation = new google.maps.LatLng(data.event.location.lat, data.event.location.lng);
        putNewItemOnMap.call(this, itemLocation, data.event.id);
      }

    }
    if (data.event.name == 'item_returned') {
      console.log('received event: item returned by user ' + data.event.user_id_of_car_that_returned_item + ' which gives them ' + data.event.now_num_items);
      this.gameDataObject.peerIdOfCarWithItem = null;
      if (data.event.user_id_of_car_that_returned_item != this.peer.id) {
        this.teamTownBaseMapObject.marker.setIcon(this.teamTownBaseTransparentIcon);
        this.teamCrushBaseMapObject.marker.setIcon(this.teamCrushBaseTransparentIcon);
        otherUserReturnedItem.call(this, data.event.user_id_of_car_that_returned_item, data.event.now_num_items);
      }
    }
    if (data.event.name == 'item_transferred') {
      console.log('received event: item ' + data.event.id + ' transferred by user ' + data.event.fromUserPeerId + ' to user ' + data.event.toUserPeerId);
      this.gameDataObject.peerIdOfCarWithItem = data.event.toUserPeerId;
      if (data.event.toUserPeerId == this.peer.id) {
        // the item was transferred to this user
        this.gameDataObject.itemObject = {
          id: data.event.id,
          location: null
        };
        this.timeOfLastTransfer = (new Date()).getTime();
        console.log('someone transferred at ' + this.timeOfLastTransfer);
        userCollidedWithItem.call(this, this.gameDataObject.itemObject);
      } else {
        // set the arrow to point to the new user who has the item
        this.destination = this.otherUsers[data.event.toUserPeerId].car.location;
      }
    }
  }

  // if the user sent a username that we haven't seen yet, set it
  if (data.peerId && data.username && !this.otherUsers[data.peerId].username) {
    updateUsername.call(this, data.peerId, data.username);
  }

  if (data.peerId && data.carLatLng && this.otherUsers[data.peerId]) {
    moveOtherCar.call(this, this.otherUsers[data.peerId], new google.maps.LatLng(data.carLatLng.lat, data.carLatLng.lng));
  }
}

function assignMyTeamBase() {
  if (userIsOnTownTeam.call(this, this.peer.id)) {
    this.myTeamBaseMapObject = this.teamTownBaseMapObject;
  } else {
    this.myTeamBaseMapObject = this.teamCrushBaseMapObject;
  }
}

function updateUsername(peerId, username) {
  for (var i = 0; i < this.gameDataObject.teamTownObject.users.length; i++) {
    if (this.gameDataObject.teamTownObject.users[i].peerId == peerId) {
      this.gameDataObject.teamTownObject.users[i].username = username;
    }
  }
  for (var j = 0; j < this.gameDataObject.teamCrushObject.users.length; j++) {
    if (this.gameDataObject.teamCrushObject.users[j].peerId == peerId) {
      this.gameDataObject.teamCrushObject.users[j].username = username;
    }
  }
  updateUsernamesInUI.call(this);
}

function updateUIWithNewGameState() {
  // recenter the map
  console.log('new location received: ' + this.gameDataObject.initialLocation);
  this.mapCenter = new google.maps.LatLng(this.gameDataObject.initialLocation.lat, this.gameDataObject.initialLocation.lng);
  updateBaseLocationsInUI.call(this);
  updateUsernamesInUI.call(this);
  // if someone has the item
  if (this.gameDataObject.peerIdOfCarWithItem) {
    this.itemMapObject.marker.setMap(null);
    // if I have the item, make the destination my team's base
    if (this.gameDataObject.peerIdOfCarWithItem == this.peer.id) {
      setDestination.call(this, this.myTeamBaseMapObject.location, 'arrow_blue.png');
    } else {
      // another user has the item, but the setDestination call
      // will be taken care of when the user sends their location data
    }
  } else {
    // if nobody has the item, put it on the map in the right place,
    // and set the new item location as the destination
    if (this.gameDataObject.itemObject && this.gameDataObject.itemObject.location) {
      moveItemOnMap.call(this, this.gameDataObject.itemObject.location.lat, this.gameDataObject.itemObject.location.lng);
    }
    setDestination.call(this, this.itemMapObject.location, 'arrow.png');
  }
  updateScoresInUI.call(this, this.gameDataObject.teamTownObject.numItemsReturned, this.gameDataObject.teamCrushObject.numItemsReturned);
  assignMyTeamInUI.call(this);
}

function updateBaseLocationsInUI() {
  createTeamTownBaseMapObject.call(this,
    this.gameDataObject.teamTownObject.baseObject.location.lat,
    this.gameDataObject.teamTownObject.baseObject.location.lng);
  createTeamCrushBaseMapObject.call(this,
    this.gameDataObject.teamCrushObject.baseObject.location.lat,
    this.gameDataObject.teamCrushObject.baseObject.location.lng);
}

function updateCarIcons() {
  updateTeamUsersCarIcons.call(this, this.gameDataObject.teamTownObject.users, this.teamTownOtherCarIcon);
  updateTeamUsersCarIcons.call(this, this.gameDataObject.teamCrushObject.users, this.teamCrushOtherCarIcon);
  updateMyCarIcon.call(this);
}

function updateMyCarIcon() {
  var userCarImgSrc = 'images/crush_car.png';
  if (userIsOnTownTeam.call(this, this.peer.id)) {
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

    if (teamUsers[i].peerId != this.peer.id) {
      this.otherUsers[teamUsers[i].peerId].car.marker = new google.maps.Marker({
        map: this.map,
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
  this.gameDataObject.itemObject.location.lat = lat;
  this.gameDataObject.itemObject.location.lng = lng;
  this.itemMapObject.location = new google.maps.LatLng(lat, lng);
  this.itemMapObject.marker.setPosition(this.itemMapObject.location);
}

function otherUserReturnedItem(otherUserPeerId, nowNumItemsForUser) {
  this.gameDataObject.peerIdOfCarWithItem = null;
  incrementItemCount.call(this, userIsOnTownTeam.call(this, otherUserPeerId))
  fadeArrowToImage.call(this, 'arrow.png');
}

function moveOtherCar(otherUserObject, newLocation) {
  if (!otherUserObject.car) {
    return;
  }

  otherUserObject.car.location = newLocation;
  if (!otherUserObject.car.marker) {
    updateCarIcons.call(this);
  }
  // if the other car has an item, update the destination
  // to be it
  if (this.gameDataObject.peerIdOfCarWithItem == otherUserObject.peerId) {
    var arrowImg = 'arrow_red.png';
    if (userIsOnMyTeam.call(this, otherUserObject.peerId)) {
      arrowImg = 'arrow_green_blue.png';
    }
    setDestination.call(this, newLocation, arrowImg);
  }
  transferItemIfCarsHaveCollided.call(this, otherUserObject.car.location, otherUserObject.peerId);
  otherUserObject.car.marker.setPosition(otherUserObject.car.location);
}

function userIsOnMyTeam(otherUserPeerId) {
  var myTeam = null;
  var otherUserTeam = null;
  for (var i = 0; i < this.gameDataObject.teamTownObject.users.length; i++) {
    if (this.gameDataObject.teamTownObject.users[i].peerId == this.peer.id) {
      myTeam = 'town';
    }
    if (this.gameDataObject.teamTownObject.users[i].peerId == otherUserPeerId) {
      otherUserTeam = 'town';
    }
  }
  for (var i = 0; i < this.gameDataObject.teamCrushObject.users.length; i++) {
    if (this.gameDataObject.teamCrushObject.users[i].peerId == this.peer.id) {
      myTeam = 'crush';
    }
    if (this.gameDataObject.teamCrushObject.users[i].peerId == otherUserPeerId) {
      otherUserTeam = 'crush';
    }
  }
  return myTeam == otherUserTeam;
}

function transferItemIfCarsHaveCollided(otherCarLocation, otherUserPeerId) {
  // if we don't know the other car's location, or if this isn't the user with
  //  the item, then ignore it. We'll only transfer an item from the perspected
  //  of the user with the item
  if (!otherCarLocation || !this.collectedItem) {
    return;
  }
  if (this.timeOfLastTransfer) {
    var timeSinceLastTransfer = ((new Date()).getTime()) - timeOfLastTransfer;
    // if not enough time has passed since the last transfer, return
    if (timeSinceLastTransfer < this.timeDelayBetweenTransfers) {
      return;
    } else {
      // optimization: reset this so we don't waste time calculating in the future
      this.timeOfLastTransfer = null;
    }
  }

  var distance = google.maps.geometry.spherical.computeDistanceBetween(this.mapCenter, otherCarLocation);
  // if this user (that has the item) is close enough to call it a
  // collision, transfer it to the other user
  if (distance < 20) {
    transferItem.call(this, this.collectedItem.id, this.peer.id, otherUserPeerId);
  }
}

function transferItem(itemObjectId, fromUserPeerId, toUserPeerId) {
  console.log('item ' + itemObjectId + ' transferred from ' + fromUserPeerId + ' to ' + toUserPeerId);
  this.timeOfLastTransfer = (new Date()).getTime();
  broadcastTransferOfItem.call(this, itemObjectId, fromUserPeerId, toUserPeerId, this.timeOfLastTransfer);
  this.collectedItem = null;
  this.gameDataObject.peerIdOfCarWithItem = toUserPeerId;
  var arrowImg = 'arrow_red.png';
  if (userIsOnMyTeam.call(this, toUserPeerId)) {
    arrowImg = 'arrow_green_blue.png';
  }
  setDestination.call(this, this.otherUsers[toUserPeerId].car.location, arrowImg);
}

function otherUserCollectedItem(userId) {
  console.log('other user collected item');
  this.gameDataObject.peerIdOfCarWithItem = userId;
  this.itemMapObject.marker.setMap(null);
  var arrowImg = 'arrow_red.png';
  if (userIsOnMyTeam.call(this, userId)) {
    arrowImg = 'arrow_green_blue.png';
  }
  fadeArrowToImage.call(this, arrowImg);
  this.teamTownBaseMapObject.marker.setIcon(this.teamTownBaseIcon);
  this.teamCrushBaseMapObject.marker.setIcon(this.teamCrushBaseIcon);

}

function userReturnedItemToBase() {
  console.log('user returned item to base');
  this.gameDataObject.peerIdOfCarWithItem = null;
  fadeArrowToImage.call(this, 'arrow.png');
  incrementItemCount.call(this, userIsOnTownTeam.call(this, this.peer.id));
  this.collectedItem = null;
  this.teamTownBaseMapObject.marker.setIcon(this.teamTownBaseTransparentIcon);
  this.teamCrushBaseMapObject.marker.setIcon(this.teamCrushBaseTransparentIcon);
}

function userIsOnTownTeam(peerId) {
  for (var i = this.gameDataObject.teamTownObject.users.length - 1; i >= 0; i--) {
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
  return this.qs.value(this.keepAliveParamName) == 'true';
}

function cleanupAnyDroppedConnections() {
  if (shouldKeepAlive.call(this)) {
    return;
  }

  var timeNow = (new Date()).getTime();
  for (var user in this.otherUsers) {
    // if it's been longer than the timeout since we've heard from
    // this user, remove them from the game
    if (this.otherUsers[user].lastUpdateTime && (timeNow - this.otherUsers[user].lastUpdateTime > this.ACTIVE_CONNECTION_TIMEOUT_IN_SECONDS)) {
      closePeerJsConnection.call(this, user);
    }
  }
}

function closePeerJsConnection(otherUserPeerId) {
  if (this.otherUsers[otherUserPeerId] && this.otherUsers[otherUserPeerId].peerJsConnection) {
    this.otherUsers[otherUserPeerId].peerJsConnection.close();
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
      gameDataObject: this.gameDataObject
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
        now_num_items: this.gameDataObject.teamTownObject.numItemsReturned,
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
    this.gameDataObject.peerIdOfCarWithItem = peer.id;
    this.otherUsers[user].peerJsConnection.send({
      event: {
        name: 'item_collected',
        id: itemId,
        user_id_of_car_with_item: this.gameDataObject.peerIdOfCarWithItem
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
  this.gameDataObject.initialLocation = {
    lat: lat,
    lng: lng
  };
  createTeamTownBase.call(this, lat, lng);
  createTeamCrushBase.call(this, (parseFloat(lat) + 0.006).toString(), (parseFloat(lng) + 0.008).toString());
  assignMyTeamBase.call(this);
  this.mapCenter = new google.maps.LatLng(lat, lng);
  this.map.setCenter(this.mapCenter);
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


// game loop helpers
function timestamp() {
  return window.performance && window.performance.now ? window.performance.now() : new Date().getTime();
}

// don't think we'll need to go to the user's location, but might be useful
function tryFindingLocation() {
  var self = this;

  // Try HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = new google.maps.LatLng(position.coords.latitude,
        position.coords.longitude);
      self.map.setCenter(pos);
      self.mapCenter = pos;
    }, function() {
      handleNoGeolocation.call(self, true);
    });
  } else {
    // Browser doesn't support Geolocation
    handleNoGeolocation.call(self, false);
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
    showContextMenu.call(this, e);
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
            getGameLastUpdateTime.call(self, gameId, username, peerId, connectToUsersCallback, joinedGameCallback, doneGettingUpdateTime.bind(self), counter == numAvailableGames, self);
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
    if (!isTimeoutTooLong.call(this, lastUpdateTime)) {
      joinExistingGame.call(this, gameId, username, peerId, connectToUsersCallback, joinedGameCallback);
      return;
    } else {
      callAsyncCleanupInactiveGames.call(this);
    }
  }
  // if we got here, and this is the last game, that means there are no available games
  // so create one
  if (isTheLastGame) {
    console.log('no available games found, only inactive ones, so creating a new one...');
    var gameData = createNewGame.call(this, username, peerId);
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
  this.gameRef.child(this.ALL_GAMES_LOCATION).child(this.joinedGame).child('lastUpdateTime').set((new Date()).getTime());
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

function joinExistingGame(gameId, username, peerId, connectToUsersCallback, joinedGameCallback) {
  // if a game has already been joined on another thread, don't join another one
  if (this.joinedGame && this.joinedGame >= 0) {
    return;
  }
  this.joinedGame = gameId;
  asyncGetGameData.call(this, gameId, username, peerId, connectToUsersCallback.bind(this), joinedGameCallback.bind(this), doneGettingGameData.bind(this));
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
  var gameDataRef = this.gameRef.child(this.FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.set(gameId);
}

function moveGameFromFullToAvailable(gameId) {
  removeGameFromFullGames.call(this, gameId);
  addGameToAvailableGamesList.call(this, gameId);
}

function removeGameFromFullGames(gameId) {
  var gameDataRef = this.gameRef.child(this.FULL_GAMES_LOCATION).child(gameId);
  gameDataRef.remove();
}

function addGameToAvailableGamesList(gameId) {
  var gameDataRef = this.gameRef.child(this.AVAILABLE_GAMES_LOCATION).child(gameId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvaW5kZXguanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9tYXBnYW1lLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWF0Y2htYWtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0a0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFNtdWdnbGVyc1Rvd24gPSByZXF1aXJlKCcuL21hcGdhbWUuanMnKTtcclxuXHJcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGdhbWUgPSBuZXcgU211Z2dsZXJzVG93bignaHR0cHM6Ly9zbXVnZ2xlcnN0b3duLmZpcmViYXNlaW8uY29tLycpO1xyXG59KTsiLCIvKiBZT1VSIFNNVUdHTEVSIE1JU1NJT04sIElGIFlPVSBDSE9PU0UgVE8gQUNDRVBULCBJUyBUTyBKT0lOIFRFQU1cclxuICogVE9XTiBBTkQgVFJZIFRPIERFRkVBVCBURUFNIENSVVNILiAgQU5EIFlPVSBNVVNUIEFDQ0VQVC4uLlxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgbWFwZ2FtZS5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZGVwc1xyXG4gKi9cclxuLy92YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xyXG4vL3ZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBNYXRjaG1ha2VyVG93biA9IHJlcXVpcmUoJy4vbWF0Y2htYWtlci5qcycpO1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gU211Z2dsZXJzVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFNtdWdnbGVyc1Rvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcblxyXG4gIC8vIGJpbmQgcHVibGljIGNhbGxiYWNrIGZ1bmN0aW9uc1xyXG4gIHRoaXMuaW5pdGlhbGl6ZSA9IHRoaXMuaW5pdGlhbGl6ZS5iaW5kKHRoaXMpO1xyXG4gIHRoaXMuZnJhbWUgPSB0aGlzLmZyYW1lLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5vbktleURvd24gPSB0aGlzLm9uS2V5RG93bi5iaW5kKHRoaXMpO1xyXG4gIHRoaXMub25LZXlVcCA9IHRoaXMub25LZXlVcC5iaW5kKHRoaXMpO1xyXG5cclxuICB0aGlzLmtlZXBBbGl2ZVBhcmFtTmFtZSA9ICdrZWVwYWxpdmUnO1xyXG4gIHRoaXMucXMgPSBuZXcgUXVlcnlTdHJpbmcoKTtcclxuXHJcbiAgdGhpcy5tYXRjaG1ha2VyVG93biA9IG5ldyBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpO1xyXG5cclxuICB0aGlzLm1hcCA9IG51bGw7IC8vIHRoZSBtYXAgY2FudmFzIGZyb20gdGhlIEdvb2dsZSBNYXBzIHYzIGphdmFzY3JpcHQgQVBJXHJcbiAgdGhpcy5tYXBab29tTGV2ZWwgPSAxODtcclxuICB0aGlzLm1hcERhdGEgPSBudWxsOyAvLyB0aGUgbGV2ZWwgZGF0YSBmb3IgdGhpcyBtYXAgKGJhc2UgbG9jYXRpb25zKVxyXG5cclxuICB0aGlzLml0ZW1NYXBPYmplY3QgPSBudWxsO1xyXG4gIC8vIHRoZSBpdGVtTWFwT2JqZWN0IHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIGxvY2F0aW9uOiA8Z29vZ2xlX21hcHNfTGF0TG5nX29iamVjdD4sXHJcbiAgLy8gICBtYXJrZXI6IDxnb29nbGVfbWFwc19NYXJrZXJfb2JqZWN0PlxyXG4gIC8vIH1cclxuXHJcbiAgLy8gZGVmYXVsdCB0byB0aGUgZ3JhbmQgY2FueW9uLCBidXQgdGhpcyB3aWxsIGJlIGxvYWRlZCBmcm9tIGEgbWFwIGZpbGVcclxuICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoMzYuMTUxMTAzLCAtMTEzLjIwODU2NSk7XHJcblxyXG5cclxuXHJcbiAgLy8gdGVhbSBkYXRhXHJcbiAgLy8gdGhlIHRlYW0gb2JqZWN0cyB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICB1c2VyczogW3tcclxuICAvLyAgICAgcGVlcklkOiAxMjM0NTY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiAncm95J1xyXG4gIC8vICAgfSwge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdoYW0nXHJcbiAgLy8gICB9XSxcclxuICAvLyAgIGJhc2VPYmplY3Q6IHtcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9LFxyXG4gIC8vICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIC8vIH1cclxuICB0aGlzLnRlYW1Ub3duT2JqZWN0ID0ge1xyXG4gICAgdXNlcnM6IFtdLFxyXG4gICAgYmFzZU9iamVjdDoge1xyXG4gICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgIGxhdDogMzYuMTUxMTAzLFxyXG4gICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICB9O1xyXG4gIHRoaXMudGVhbUNydXNoT2JqZWN0ID0ge1xyXG4gICAgdXNlcnM6IFtdLFxyXG4gICAgYmFzZU9iamVjdDoge1xyXG4gICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgIGxhdDogMzYuMTUxMTAzLFxyXG4gICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICB9O1xyXG5cclxuICAvLyBmb3IgdGltZS1iYXNlZCBnYW1lIGxvb3BcclxuICB0aGlzLm5vdztcclxuICB0aGlzLmR0ID0gMDtcclxuICB0aGlzLmxhc3QgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLnN0ZXAgPSAxIC8gNjA7XHJcblxyXG4gIC8vIHVzZXIgZGF0YVxyXG4gIHRoaXMudXNlcm5hbWUgPSBudWxsO1xyXG5cclxuICAvLyBnYW1lIGhvc3RpbmcgZGF0YVxyXG4gIHRoaXMuZ2FtZUlkID0gbnVsbDtcclxuICB0aGlzLmhvc3RQZWVySWQgPSBudWxsO1xyXG5cclxuICAvLyBjYXIgcHJvcGVydGllc1xyXG4gIHRoaXMucm90YXRpb24gPSAwO1xyXG4gIHRoaXMuZGVjZWxlcmF0aW9uID0gMS4xO1xyXG4gIHRoaXMuTUFYX05PUk1BTF9TUEVFRCA9IDE4O1xyXG4gIHRoaXMuTUFYX0JPT1NUX1NQRUVEID0gNDA7XHJcbiAgdGhpcy5CT09TVF9GQUNUT1IgPSAxLjA3O1xyXG4gIHRoaXMuQk9PU1RfQ09OU1VNUFRJT05fUkFURSA9IDAuNTtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IgPSAxMDAwMDAwO1xyXG4gIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IgPSA1MDAwMDA7XHJcblxyXG4gIC8vIGNvbGxpc2lvbiBlbmdpbmUgaW5mb1xyXG4gIHRoaXMuY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2UgPSAyMDtcclxuICB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlID0gNDM7XHJcblxyXG4gIC8vIG1hcCBkYXRhXHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgdGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgPSAwLjAwODsgLy8gaW4gbGF0aXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsb25naXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UgPSAzMDA7XHJcblxyXG4gIC8vIHRoZXNlIG1hcCBvYmplY3RzIHdpbGwgYmUgb2YgdGhlIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge1xyXG4gICAgbG9jYXRpb246IHRoaXMubWFwQ2VudGVyLFxyXG4gICAgbWFya2VyOiBudWxsXHJcbiAgfVxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IG51bGw7XHJcbiAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcblxyXG4gIC8vIGdhbWVwbGF5XHJcblxyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QgPSB7XHJcbiAgICB0ZWFtVG93bk9iamVjdDogdGhpcy50ZWFtVG93bk9iamVjdCxcclxuICAgIHRlYW1DcnVzaE9iamVjdDogdGhpcy50ZWFtQ3J1c2hPYmplY3QsXHJcbiAgICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogdGhpcy5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgIH1cclxuICB9O1xyXG4gIC8vIHRoaXMgd2lsbCBiZSBvZiB0aGUgZm9ybVxyXG4gIC8vIHtcclxuICAvLyAgIHRlYW1Ub3duT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgdGVhbUNydXNoT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgcGVlcklkT2ZDYXJXaXRoSXRlbTogbnVsbCxcclxuICAvLyAgIGluaXRpYWxMb2NhdGlvbjoge1xyXG4gIC8vICAgICBsYXQ6IDM1LFxyXG4gIC8vICAgICBsbmc6IC0xMzJcclxuICAvLyB9XHJcbiAgLy8gICBpdGVtT2JqZWN0OiB7XHJcbiAgLy8gICAgIGlkOiA1NzYsXHJcbiAgLy8gICAgIGxvY2F0aW9uOiB7XHJcbiAgLy8gICAgICAgbGF0OiAzNCxcclxuICAvLyAgICAgICBsbmc6IC0xMzNcclxuICAvLyAgICAgfVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcblxyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgLy8gc2V0IHRoZSBpbml0aWFsIGRlc3RpbmF0aW9uIHRvIHdoYXRldmVyLCBpdCB3aWxsIGJlIHJlc2V0IFxyXG4gIC8vIHdoZW4gYW4gaXRlbSBpcyBmaXJzdCBwbGFjZWRcclxuICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyg0NS40ODkzOTEsIC0xMjIuNjQ3NTg2KTtcclxuICB0aGlzLnRpbWVEZWxheUJldHdlZW5UcmFuc2ZlcnMgPSAxMDAwOyAvLyBpbiBtc1xyXG4gIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gbnVsbDtcclxuXHJcbiAgLy8gb2JqZWN0IG9mIHRoZSBvdGhlciB1c2Vyc1xyXG4gIHRoaXMub3RoZXJVc2VycyA9IHt9O1xyXG4gIC8vIHRoZSBvdGhlclVzZXJzIGRhdGEgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgMTIzNDU2Nzg5OiB7XHJcbiAgLy8gICAgIHBlZXJJZDogMTIzNDY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiBoZWxsb3JveSxcclxuICAvLyAgICAgY2FyOiB7XHJcbiAgLy8gICAgICAgbG9jYXRpb246IDxsb2NhdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICAgIG1hcmtlcjogPG1hcmtlcl9vYmplY3Q+XHJcbiAgLy8gICAgIH0sXHJcbiAgLy8gICAgIHBlZXJKc0Nvbm5lY3Rpb246IDxwZWVySnNDb25uZWN0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgIGxhc3RVcGRhdGVUaW1lOiA8dGltZV9vYmplY3Q+LFxyXG4gIC8vICAgICBudW1JdGVtczogMCxcclxuICAvLyAgICAgaGFzQmVlbkluaXRpYWxpemVkOiB0cnVlXHJcbiAgLy8gICB9LFxyXG4gIC8vICAgOTg3NjU0MzIxOiB7XHJcbiAgLy8gICAgIHBlZXJJZDogOTg3NjU0MzIxLFxyXG4gIC8vICAgICB1c2VybmFtZTogdG93bnRvd245MDAwLFxyXG4gIC8vICAgICBjYXI6IHtcclxuICAvLyAgICAgICBsb2NhdGlvbjogPGxvY2F0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgICAgbWFya2VyOiA8bWFya2VyX29iamVjdD5cclxuICAvLyAgICAgfSxcclxuICAvLyAgICAgcGVlckpzQ29ubmVjdGlvbjogPHBlZXJKc0Nvbm5lY3Rpb25fb2JqZWN0PixcclxuICAvLyAgICAgbGFzdFVwZGF0ZVRpbWU6IDx0aW1lX29iamVjdD4sXHJcbiAgLy8gICAgIG51bUl0ZW1zOiA1XHJcbiAgLy8gICB9XHJcbiAgLy8gfVxyXG5cclxuICAvLyBpbWFnZXNcclxuICB0aGlzLml0ZW1JY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3Ntb2tpbmdfdG9pbGV0X3NtYWxsLmdpZidcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaFVzZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2NydXNoX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1Ub3duVXNlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbVRvd25PdGhlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvdGVhbV90b3duX290aGVyX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1DcnVzaE90aGVyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy90ZWFtX2NydXNoX290aGVyX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2ZvcnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL29wcG9uZW50X2ZvcnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9mb3J0X3RyYW5zcGFyZW50LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL29wcG9uZW50X2ZvcnRfdHJhbnNwYXJlbnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuXHJcbiAgLy8gcGVlciBKUyBjb25uZWN0aW9uIChmb3IgbXVsdGlwbGF5ZXIgd2ViUlRDKVxyXG4gIHRoaXMucGVlciA9IG5ldyBQZWVyKHtcclxuICAgIGtleTogJ2ozbTBxdGRkZXNocGszeHInXHJcbiAgfSk7XHJcbiAgdGhpcy5wZWVyLm9uKCdvcGVuJywgZnVuY3Rpb24oaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKCdNeSBwZWVyIElEIGlzOiAnICsgaWQpO1xyXG4gICAgJCgnI3BlZXItaWQnKS50ZXh0KGlkKTtcclxuICAgICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnd2FpdGluZyBmb3IgYSBzbXVnZ2xlciB0byBiYXR0bGUuLi4nKTtcclxuICB9KTtcclxuICB0aGlzLnBlZXIub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0ZWRUb1BlZXIuYmluZCh0aGlzKSk7XHJcbiAgdGhpcy5BQ1RJVkVfQ09OTkVDVElPTl9USU1FT1VUX0lOX1NFQ09ORFMgPSAzMCAqIDEwMDA7XHJcblxyXG5cclxuICBnb29nbGUubWFwcy5ldmVudC5hZGREb21MaXN0ZW5lcih3aW5kb3csICdsb2FkJywgdGhpcy5pbml0aWFsaXplKTtcclxufVxyXG5cclxuLyoqXHJcbiAqICBpbml0aWFsaXplIHRoZSBnYW1lXHJcbiAqL1xyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB0aGlzLnVzZXJuYW1lID0gcHJvbXB0KCdDaG9vc2UgeW91ciBTbXVnZ2xlciBOYW1lOicsICdOaW5qYSBSb3knKTtcclxuICBjcmVhdGVNYXBPblBhZ2UuY2FsbCh0aGlzKTtcclxuICBsb2FkTWFwRGF0YS5jYWxsKHRoaXMsIG1hcElzUmVhZHkpO1xyXG5cclxuICAvLyB0aGVzZSBhcmUgc2V0IHRvIHRydWUgd2hlbiBrZXlzIGFyZSBiZWluZyBwcmVzc2VkXHJcbiAgdGhpcy5yaWdodERvd24gPSBmYWxzZTtcclxuICB0aGlzLmxlZnREb3duID0gZmFsc2U7XHJcbiAgdGhpcy51cERvd24gPSBmYWxzZTtcclxuICB0aGlzLmRvd25Eb3duID0gZmFsc2U7XHJcbiAgdGhpcy5jdHJsRG93biA9IGZhbHNlO1xyXG5cclxuICB0aGlzLnNwZWVkID0gMDtcclxuICB0aGlzLnJvdGF0aW9uID0gMDtcclxuICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG5cclxuICAvL3RyeUZpbmRpbmdMb2NhdGlvbigpO1xyXG5cclxuXHJcbiAgYmluZEtleUFuZEJ1dHRvbkV2ZW50cy5jYWxsKHRoaXMpO1xyXG5cclxuICBpbml0aWFsaXplQm9vc3RCYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gc3RhcnQgdGhlIGdhbWUgbG9vcFxyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmZyYW1lKTtcclxufVxyXG5cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUuZnJhbWUgPSBmdW5jdGlvbigpIHtcclxuICB0aGlzLm5vdyA9IHRpbWVzdGFtcC5jYWxsKHRoaXMpO1xyXG4gIHRoaXMuZHQgPSB0aGlzLmR0ICsgTWF0aC5taW4oMSwgKHRoaXMubm93IC0gdGhpcy5sYXN0KSAvIDEwMDApO1xyXG4gIHdoaWxlICh0aGlzLmR0ID4gdGhpcy5zdGVwKSB7XHJcbiAgICB0aGlzLmR0ID0gdGhpcy5kdCAtIHRoaXMuc3RlcDtcclxuICAgIHVwZGF0ZS5jYWxsKHRoaXMsIHRoaXMuc3RlcCk7XHJcbiAgfVxyXG4gIHJlbmRlci5jYWxsKHRoaXMsIHRoaXMuZHQpO1xyXG4gIHRoaXMubGFzdCA9IHRoaXMubm93O1xyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmZyYW1lKTtcclxufVxyXG5cclxuLy8ga2V5IGV2ZW50c1xyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5vbktleURvd24gPSBmdW5jdGlvbihldnQpIHtcclxuICBpZiAoZXZ0LmtleUNvZGUgPT0gMzkpIHtcclxuICAgIHRoaXMucmlnaHREb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICB0aGlzLmxlZnREb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM4KSB7XHJcbiAgICB0aGlzLnVwRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSA0MCkge1xyXG4gICAgdGhpcy5kb3duRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgdGhpcy5jdHJsRG93biA9IHRydWU7XHJcbiAgfVxyXG59XHJcblxyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5vbktleVVwID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICB0aGlzLnJpZ2h0RG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzcpIHtcclxuICAgIHRoaXMubGVmdERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM4KSB7XHJcbiAgICB0aGlzLnVwRG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIHRoaXMuZG93bkRvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDE3KSB7XHJcbiAgICB0aGlzLmN0cmxEb3duID0gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZUJvb3N0QmFyKCkge1xyXG4gICQoZnVuY3Rpb24oKSB7XHJcbiAgICAkKFwiI2Jvb3N0LWJhclwiKS5wcm9ncmVzc2Jhcih7XHJcbiAgICAgIHZhbHVlOiAxMDBcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYXBJc1JlYWR5KCkge1xyXG4gIHRoaXMubWF0Y2htYWtlclRvd24uam9pbk9yQ3JlYXRlR2FtZSh0aGlzLnVzZXJuYW1lLCB0aGlzLnBlZXIuaWQsIGNvbm5lY3RUb0FsbE5vbkhvc3RVc2Vycy5iaW5kKHRoaXMpLCBnYW1lSm9pbmVkLmJpbmQodGhpcykpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdhbWVKb2luZWQoZ2FtZURhdGEsIGlzTmV3R2FtZSkge1xyXG4gIHRoaXMuZ2FtZUlkID0gZ2FtZURhdGEuaWQ7XHJcbiAgaWYgKGlzTmV3R2FtZSkge1xyXG4gICAgLy8gd2UncmUgaG9zdGluZyB0aGUgZ2FtZSBvdXJzZWxmXHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSB0aGlzLnBlZXIuaWQ7XHJcblxyXG4gICAgLy8gZmlyc3QgdXNlciBpcyBhbHdheXMgb24gdGVhbSB0b3duXHJcbiAgICBnYW1lRGF0YS50ZWFtVG93bk9iamVjdC51c2VycyA9IFt7XHJcbiAgICAgIHBlZXJJZDogdGhpcy5wZWVyLmlkLFxyXG4gICAgICB1c2VybmFtZTogdGhpcy51c2VybmFtZVxyXG4gICAgfV07XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAneWVsbG93Jyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2NvbG9yJywgJ2JsYWNrJyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIHNvbWVvbmUgZWxzZSBpcyBhbHJlYWR5IHRoZSBob3N0XHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSBnYW1lRGF0YS5ob3N0UGVlcklkO1xyXG4gICAgYWN0aXZhdGVUZWFtQ3J1c2hJblVJLmNhbGwodGhpcyk7XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxuICB1cGRhdGVDYXJJY29ucy5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVc2VybmFtZXNJblVJKCkge1xyXG4gIHZhciB0ZWFtVG93bkpxdWVyeUVsZW0gPSAkKCcjdGVhbS10b3duLXVzZXJuYW1lcycpO1xyXG4gIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1Ub3duSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycyk7XHJcbiAgdmFyIHRlYW1DcnVzaEpxdWVyeUVsZW0gPSAkKCcjdGVhbS1jcnVzaC11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtQ3J1c2hKcXVlcnlFbGVtLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycyk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbSwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIC8vIGNsZWFyIHRoZSBjdXJyZW50IGxpc3Qgb2YgdXNlcm5hbWVzXHJcbiAgdGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0uZW1wdHkoKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJPYmplY3RzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBuZXdKcXVlcnlFbGVtID0gJCgkLnBhcnNlSFRNTChcclxuICAgICAgJzxsaSBpZD1cInVzZXJuYW1lLScgK1xyXG4gICAgICB1c2VyT2JqZWN0c0FycmF5W2ldLnBlZXJJZCArXHJcbiAgICAgICdcIj4nICsgdXNlck9iamVjdHNBcnJheVtpXS51c2VybmFtZSArICc8L2xpPidcclxuICAgICkpO1xyXG4gICAgJCh0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbSkuYXBwZW5kKG5ld0pxdWVyeUVsZW0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYWN0aXZhdGVUZWFtQ3J1c2hJblVJKCkge1xyXG4gICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ29wYWNpdHknLCAnMScpO1xyXG4gIHZhciB0ZWFtQ3J1c2hTY29yZSA9IDA7XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpIHtcclxuICAgIHRlYW1DcnVzaFNjb3JlID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZDtcclxuICB9XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0ZWFtQ3J1c2hTY29yZSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjb25uZWN0VG9BbGxOb25Ib3N0VXNlcnMobm9uSG9zdFBlZXJJZHMpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vbkhvc3RQZWVySWRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAobm9uSG9zdFBlZXJJZHNbaV0gIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBub25Ib3N0UGVlcklkc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBiaW5kS2V5QW5kQnV0dG9uRXZlbnRzKCkge1xyXG4gICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKSB7XHJcbiAgICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG5cclxuICAkKGRvY3VtZW50KS5rZXlkb3duKHRoaXMub25LZXlEb3duKTtcclxuICAkKGRvY3VtZW50KS5rZXl1cCh0aGlzLm9uS2V5VXApO1xyXG4gICQoJyNjb25uZWN0LWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHBlZXJJZCA9ICQoJyNwZWVyLWlkLXRleHRib3gnKS52YWwoKTtcclxuICAgIGNvbnNvbGUubG9nKCdwZWVyIGlkIGNvbm5lY3Rpbmc6ICcgKyBwZWVySWQpO1xyXG4gICAgY29ubmVjdFRvUGVlci5jYWxsKHRoaXMsIHBlZXJJZCk7XHJcbiAgfSk7XHJcbiAgJCgnI3NldC1jZW50ZXItYnV0dG9uJykuY2xpY2soZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICB2YXIgc2VhcmNoVGVybSA9ICQoJyNtYXAtY2VudGVyLXRleHRib3gnKS52YWwoKTtcclxuICAgIGlmICghc2VhcmNoVGVybSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBjZW50ZXIgdG86ICcgKyBzZWFyY2hUZXJtKTtcclxuICAgIHNlYXJjaEFuZENlbnRlck1hcC5jYWxsKHRoaXMsIHNlYXJjaFRlcm0pO1xyXG4gICAgYnJvYWRjYXN0TmV3TG9jYXRpb24uY2FsbCh0aGlzLCB0aGlzLm1hcENlbnRlcik7XHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgfSk7XHJcbiAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZGlzY29ubmVjdEZyb21HYW1lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNjb25uZWN0RnJvbUdhbWUoKSB7XHJcbiAgaWYgKHRoaXMucGVlciAmJiB0aGlzLnBlZXIuaWQgJiYgdGhpcy5nYW1lSWQpIHtcclxuICAgIG1hdGNobWFrZXJUb3duLnJlbW92ZVBlZXJGcm9tR2FtZSh0aGlzLmdhbWVJZCwgdGhpcy5wZWVyLmlkKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU1hcE9uUGFnZSgpIHtcclxuICB2YXIgbWFwT3B0aW9ucyA9IHtcclxuICAgIHpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgY2VudGVyOiB0aGlzLm1hcENlbnRlcixcclxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiBmYWxzZSxcclxuICAgIG1hcFR5cGVJZDogZ29vZ2xlLm1hcHMuTWFwVHlwZUlkLlNBVEVMTElURSxcclxuICAgIGRpc2FibGVEZWZhdWx0VUk6IHRydWUsXHJcbiAgICBtaW5ab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIG1heFpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgc2Nyb2xsd2hlZWw6IGZhbHNlLFxyXG4gICAgZGlzYWJsZURvdWJsZUNsaWNrWm9vbTogdHJ1ZSxcclxuICAgIGRyYWdnYWJsZTogZmFsc2UsXHJcbiAgfVxyXG5cclxuICB0aGlzLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcC1jYW52YXMnKSwgbWFwT3B0aW9ucyk7XHJcblxyXG4gIC8vIG5vdCBuZWNlc3NhcnksIGp1c3Qgd2FudCB0byBhbGxvdyB0aGUgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsICdjbGljaycsIGZ1bmN0aW9uKGUpIHtcclxuICAgIGNvbnRleHRtZW51OiB0cnVlXHJcbiAgfSk7XHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsIFwicmlnaHRjbGlja1wiLCB0aGlzLnNob3dDb250ZXh0TWVudSk7XHJcblxyXG4gIHJlc2l6ZU1hcFRvRml0LmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2l6ZU1hcFRvRml0KCkge1xyXG4gICQoJ2JvZHknKS5oZWlnaHQoJCh3aW5kb3cpLmhlaWdodCgpIC0gMik7XHJcbiAgdmFyIG1haW5IZWlnaHQgPSAkKCdib2R5JykuaGVpZ2h0KCk7XHJcbiAgdmFyIGNvbnRlbnRIZWlnaHQgPVxyXG4gICAgJCgnI2hlYWRlcicpLm91dGVySGVpZ2h0KCkgK1xyXG4gICAgJCgnI2Zvb3RlcicpLm91dGVySGVpZ2h0KCk7XHJcbiAgdmFyIGggPSBtYWluSGVpZ2h0IC0gY29udGVudEhlaWdodDtcclxuICAkKCcjbWFwLWJvZHknKS5oZWlnaHQoaCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlYXJjaEFuZENlbnRlck1hcChzZWFyY2hUZXJtKSB7XHJcbiAgdmFyIHBhcnRzID0gc2VhcmNoVGVybS5zcGxpdCgnLCcpO1xyXG4gIGlmICghcGFydHMpIHtcclxuICAgIC8vIGJhZCBzZWFyY2ggaW5wdXQsIG11c3QgYmUgaW4gbGF0LGxuZyBmb3JtXHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciBsYXRTdHJpbmcgPSBwYXJ0c1swXTtcclxuICB2YXIgbG5nU3RyaW5nID0gcGFydHNbMV07XHJcbiAgc2V0R2FtZVRvTmV3TG9jYXRpb24uY2FsbCh0aGlzLCBsYXRTdHJpbmcsIGxuZ1N0cmluZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNYXBEYXRhKG1hcElzUmVhZHlDYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLm1hcERhdGFMb2FkZWQgPSBmYWxzZTtcclxuICBjb25zb2xlLmxvZygnbG9hZGluZyBtYXAgZGF0YScpO1xyXG5cclxuICAvLyBUT0RPOiBcclxuICAvLyB0byByZWFkIHN0YXRpYyBmaWxlcyBpblxyXG4gIC8vIHlvdSBuZWVkIHRvIHBhc3MgXCItdCBicmZzXCIgdG8gYnJvd3NlcmlmeVxyXG4gIC8vIGJ1dCBpdCdzIGNvb2wgY29zIHlvdSBjYW4gaW5saW5lIGJhc2U2NCBlbmNvZGVkIGltYWdlcyBvciB1dGY4IGh0bWwgc3RyaW5nc1xyXG4gIC8vJC5nZXRKU09OKFwibWFwcy9ncmFuZGNhbnlvbi5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAkLmdldEpTT04oXCJtYXBzL3BvcnRsYW5kLmpzb25cIiwgZnVuY3Rpb24oanNvbikge1xyXG4gICAgY29uc29sZS5sb2coJ21hcCBkYXRhIGxvYWRlZCcpO1xyXG4gICAgc2VsZi5tYXBEYXRhID0ganNvbjtcclxuICAgIHNlbGYubWFwRGF0YUxvYWRlZCA9IHRydWU7XHJcbiAgICBzZWxmLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLmNlbnRlckxhdExuZy5sbmcpO1xyXG4gICAgc2VsZi5tYXAuc2V0Q2VudGVyKHNlbGYubWFwQ2VudGVyKTtcclxuICAgIHNlbGYuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uID0ge1xyXG4gICAgICBsYXQ6IHNlbGYubWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICBsbmc6IHNlbGYubWFwQ2VudGVyLmxuZygpXHJcbiAgICB9O1xyXG5cclxuICAgIGNyZWF0ZVRlYW1Ub3duQmFzZS5jYWxsKHNlbGYsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtVG93bkJhc2VMYXRMbmcubG5nKTtcclxuICAgIGNyZWF0ZVRlYW1DcnVzaEJhc2UuY2FsbChzZWxmLCBzZWxmLm1hcERhdGEubWFwLnRlYW1DcnVzaEJhc2VMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLnRlYW1DcnVzaEJhc2VMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubXlUZWFtQmFzZU1hcE9iamVjdCA9IHNlbGYudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG5cclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbChzZWxmKTtcclxuICAgIG1hcElzUmVhZHlDYWxsYmFjay5jYWxsKHNlbGYpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2UobGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtVG93bkJhc2VPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdCA9IGNyZWF0ZVRlYW1DcnVzaEJhc2VPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBUb3duIGJhc2Ugb24gdGhlIG1hcCwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ICYmIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge307XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIHRpdGxlOiAnVGVhbSBUb3duIEJhc2UnLFxyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHBvc2l0aW9uOiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbVRvd25CYXNlSWNvblxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2VPYmplY3QobGF0LCBsbmcpIHtcclxuICB2YXIgdGVhbVRvd25CYXNlT2JqZWN0ID0ge307XHJcbiAgdGVhbVRvd25CYXNlT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcblxyXG4gIHJldHVybiB0ZWFtVG93bkJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QobGF0LCBsbmcpIHtcclxuICAvLyBpZiB0aGVyZSdzIGFscmVhZHkgYSB0ZWFtIENydXNoIGJhc2Ugb24gdGhlIG1hcCwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIHRpdGxlOiAnVGVhbSBDcnVzaCBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmxvY2F0aW9uLFxyXG4gICAgaWNvbjogdGhpcy50ZWFtQ3J1c2hCYXNlSWNvblxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcblxyXG4gIHZhciB0ZWFtQ3J1c2hCYXNlT2JqZWN0ID0ge307XHJcbiAgdGVhbUNydXNoQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbUNydXNoQmFzZU9iamVjdDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmFuZG9tbHlQdXRJdGVtcygpIHtcclxuICB2YXIgcmFuZG9tTG9jYXRpb24gPSBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0uY2FsbCh0aGlzKTtcclxuICB2YXIgaXRlbUlkID0gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwLCAwKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICBpZDogaXRlbUlkLFxyXG4gICAgbG9jYXRpb246IHtcclxuICAgICAgbGF0OiByYW5kb21Mb2NhdGlvbi5sYXQoKSxcclxuICAgICAgbG5nOiByYW5kb21Mb2NhdGlvbi5sbmcoKVxyXG4gICAgfVxyXG4gIH1cclxuICBwdXROZXdJdGVtT25NYXAuY2FsbCh0aGlzLCByYW5kb21Mb2NhdGlvbiwgaXRlbUlkKTtcclxuICBicm9hZGNhc3ROZXdJdGVtLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUxvY2F0aW9uRm9ySXRlbSgpIHtcclxuICAvLyBGaW5kIGEgcmFuZG9tIGxvY2F0aW9uIHRoYXQgd29ya3MsIGFuZCBpZiBpdCdzIHRvbyBjbG9zZVxyXG4gIC8vIHRvIHRoZSBiYXNlLCBwaWNrIGFub3RoZXIgbG9jYXRpb25cclxuICB2YXIgcmFuZG9tTG9jYXRpb24gPSBudWxsO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMYXQgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubGF0KCk7XHJcbiAgdmFyIGNlbnRlck9mQXJlYUxuZyA9IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbi5sbmcoKTtcclxuICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgcmFuZG9tTGF0ID0gZ2V0UmFuZG9tSW5SYW5nZShjZW50ZXJPZkFyZWFMYXQgLVxyXG4gICAgICAodGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMYXQgKyAodGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCA3KTtcclxuICAgIHJhbmRvbUxuZyA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTG5nIC1cclxuICAgICAgKHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIGNlbnRlck9mQXJlYUxuZyArICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCA3KTtcclxuICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gcHV0IGl0ZW0gYXQ6ICcgKyByYW5kb21MYXQgKyAnLCcgKyByYW5kb21MbmcpO1xyXG4gICAgcmFuZG9tTG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHJhbmRvbUxhdCwgcmFuZG9tTG5nKTtcclxuICAgIGlmIChnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2VlbihyYW5kb21Mb2NhdGlvbiwgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSA+IHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UpIHtcclxuICAgICAgcmV0dXJuIHJhbmRvbUxvY2F0aW9uO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ2l0ZW0gdG9vIGNsb3NlIHRvIGJhc2UsIGNob29zaW5nIGFub3RoZXIgbG9jYXRpb24uLi4nKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHB1dE5ld0l0ZW1Pbk1hcChsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgLy8gZXZlbnR1YWxseSB0aGlzIHNob3VsZCBiZSByZWR1bmRhbnQgdG8gY2xlYXIgdGhpcywgYnV0IHdoaWxlXHJcbiAgLy8gdGhlcmUncyBhIGJ1ZyBvbiBtdWx0aXBsYXllciBqb2luaW5nLCBjbGVhciBpdCBhZ2FpblxyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuXHJcbiAgLy8gc2V0IHRoZSBiYXNlIGljb24gaW1hZ2VzIHRvIGJlIHRoZSBsaWdodGVyIG9uZXNcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcblxyXG4gIC8vIGluIGNhc2UgdGhlcmUncyBhIGxpbmdlcmluZyBpdGVtLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy5pdGVtTWFwT2JqZWN0ICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIgJiYgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5tYXApIHtcclxuICAgIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGl0ZW1NYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICB0aXRsZTogJ0l0ZW0nLFxyXG4gICAgaWNvbjogdGhpcy5pdGVtSWNvbixcclxuICAgIC8vIC8vVE9ETzogRklYIFNUVVBJRCBHT09HTEUgTUFQUyBCVUcgdGhhdCBjYXVzZXMgdGhlIGdpZiBtYXJrZXJcclxuICAgIC8vIC8vdG8gbXlzdGVyaW91c2x5IG5vdCBzaG93IHVwIHNvbWV0aW1lc1xyXG4gICAgLy8gb3B0aW1pemVkOiBmYWxzZSxcclxuICAgIHBvc2l0aW9uOiBsb2NhdGlvblxyXG4gIH0pO1xyXG5cclxuICB0aGlzLml0ZW1NYXBPYmplY3QgPSB7XHJcbiAgICBtYXJrZXI6IGl0ZW1NYXJrZXIsXHJcbiAgICBsb2NhdGlvbjogbG9jYXRpb25cclxuICB9O1xyXG5cclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gIH07XHJcblxyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgbG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICByZXR1cm4gaXRlbUlkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVCb29zdGluZygpIHtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIGlmICgkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKSB8fCAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKSA9PSAwKSB7XHJcbiAgICB2YXIgYm9vc3RCYXJWYWx1ZSA9ICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpO1xyXG4gICAgaWYgKHRoaXMuY3RybERvd24gJiYgYm9vc3RCYXJWYWx1ZSA+IDApIHtcclxuICAgICAgYm9vc3RCYXJWYWx1ZSAtPSB0aGlzLkJPT1NUX0NPTlNVTVBUSU9OX1JBVEU7XHJcbiAgICAgICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIsIGJvb3N0QmFyVmFsdWUpO1xyXG4gICAgICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfQk9PU1RfU1BFRUQ7XHJcbiAgICAgIHRoaXMuc3BlZWQgKj0gdGhpcy5CT09TVF9GQUNUT1I7XHJcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5zcGVlZCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSAtdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5zcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5ob3Jpem9udGFsU3BlZWQpID4gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPD0gMCkge1xyXG4gICAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjYm9vc3QtYmFyJykpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMubWF4U3BlZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVDYXIoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IGhhbmRsZUJvb3N0aW5nLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIGlmIFVwIG9yIERvd24ga2V5IGlzIHByZXNzZWQsIGNoYW5nZSB0aGUgc3BlZWQuIE90aGVyd2lzZSxcclxuICAvLyBkZWNlbGVyYXRlIGF0IGEgc3RhbmRhcmQgcmF0ZVxyXG4gIGlmICh0aGlzLnVwRG93biB8fCB0aGlzLmRvd25Eb3duKSB7XHJcbiAgICBpZiAodGhpcy51cERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuc3BlZWQgPD0gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuc3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZG93bkRvd24pIHtcclxuICAgICAgaWYgKHRoaXMuc3BlZWQgPj0gLXRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkIC09IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICAvLyBpZiBMZWZ0IG9yIFJpZ2h0IGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIGhvcml6b250YWwgc3BlZWQuXHJcbiAgLy8gT3RoZXJ3aXNlLCBkZWNlbGVyYXRlIGF0IGEgc3RhbmRhcmQgcmF0ZVxyXG4gIGlmICh0aGlzLmxlZnREb3duIHx8IHRoaXMucmlnaHREb3duKSB7XHJcbiAgICBpZiAodGhpcy5yaWdodERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCArPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5sZWZ0RG93bikge1xyXG4gICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPj0gLXRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoKCF0aGlzLnVwRG93biAmJiAhdGhpcy5kb3duRG93bikgfHwgKCF0aGlzLmN0cmxEb3duICYmIE1hdGguYWJzKHRoaXMuc3BlZWQpID4gdGhpcy5NQVhfTk9STUFMX1NQRUVEKSkge1xyXG4gICAgaWYgKHRoaXMuc3BlZWQgPiAtMC4wMSAmJiB0aGlzLnNwZWVkIDwgMC4wMSkge1xyXG4gICAgICB0aGlzLnNwZWVkID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc3BlZWQgLz0gdGhpcy5kZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoKCF0aGlzLmxlZnREb3duICYmICF0aGlzLnJpZ2h0RG93bikgfHwgKCF0aGlzLmN0cmxEb3duICYmIE1hdGguYWJzKHRoaXMuaG9yaXpvbnRhbFNwZWVkKSA+IHRoaXMuTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA+IC0wLjAxICYmIHRoaXMuaG9yaXpvbnRhbFNwZWVkIDwgMC4wMSkge1xyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAvPSB0aGlzLmRlY2VsZXJhdGlvbjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIG9wdGltaXphdGlvbiAtIG9ubHkgaWYgdGhlIGNhciBpcyBtb3Zpbmcgc2hvdWxkIHdlIHNwZW5kXHJcbiAgLy8gdGltZSByZXNldHRpbmcgdGhlIG1hcFxyXG4gIGlmICh0aGlzLnNwZWVkICE9IDAgfHwgdGhpcy5ob3Jpem9udGFsU3BlZWQgIT0gMCkge1xyXG4gICAgdmFyIG5ld0xhdCA9IHRoaXMubWFwLmdldENlbnRlcigpLmxhdCgpICsgKHRoaXMuc3BlZWQgLyB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdmFyIG5ld0xuZyA9IHRoaXMubWFwLmdldENlbnRlcigpLmxuZygpICsgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIC8gdGhpcy5sb25naXR1ZGVTcGVlZEZhY3Rvcik7XHJcbiAgICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobmV3TGF0LCBuZXdMbmcpO1xyXG4gICAgdGhpcy5tYXAuc2V0Q2VudGVyKHRoaXMubWFwQ2VudGVyKTtcclxuXHJcbiAgfVxyXG5cclxuICByb3RhdGVDYXIuY2FsbCh0aGlzKTtcclxuICBpZiAodGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgIHJvdGF0ZUFycm93LmNhbGwodGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0VG9QZWVyKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd0cnlpbmcgdG8gY29ubmVjdCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICB2YXIgcGVlckpzQ29ubmVjdGlvbiA9IHRoaXMucGVlci5jb25uZWN0KG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignb3BlbicsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gb3BlbicpO1xyXG4gICAgY29ubmVjdGVkVG9QZWVyLmNhbGwoc2VsZiwgcGVlckpzQ29ubmVjdGlvbik7XHJcbiAgfSk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiUEVFUkpTIEVSUk9SOiBcIik7XHJcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgdGhyb3cgXCJQZWVySlMgY29ubmVjdGlvbiBlcnJvclwiO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0ZWRUb1BlZXIocGVlckpzQ29ubmVjdGlvbikge1xyXG4gIHZhciBvdGhlclVzZXJQZWVySWQgPSBwZWVySnNDb25uZWN0aW9uLnBlZXI7XHJcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBjb25uZWN0ZWQgdG8gdGhpcyB1ZXNyLFxyXG4gIC8vIGFkZCB0aGUgSFRNTCBmb3IgdGhlIG5ldyB1c2VyXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uLmNhbGwodGhpcywgcGVlckpzQ29ubmVjdGlvbiwgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGFzc2lnblVzZXJUb1RlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gICAgY3JlYXRlT3RoZXJVc2VyQ2FyLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVPdGhlclVzZXJDYXIob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlcklkID0gb3RoZXJVc2VyUGVlcklkO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLmNhciA9IHt9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25Vc2VyVG9UZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIGlmIHRoZSB1c2VyIGlzIGFscmVhZHkgb24gYSB0ZWFtLCBpZ25vcmUgdGhpc1xyXG4gIGlmIChpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpIHx8XHJcbiAgICBpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVzZXJPYmplY3QgPSB7XHJcbiAgICBwZWVySWQ6IG90aGVyVXNlclBlZXJJZCxcclxuICAgIHVzZXJuYW1lOiBudWxsXHJcbiAgfTtcclxuICAvLyBmb3Igbm93LCBqdXN0IGFsdGVybmF0ZSB3aG8gZ29lcyBvbiBlYWNoIHRlYW1cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggPiB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGgpIHtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSS5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5wdXNoKHVzZXJPYmplY3QpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNVc2VyT25UZWFtKHBlZXJJZCwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlck9iamVjdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHVzZXJPYmplY3RzQXJyYXlbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1JblVJKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjNjY3Jyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAncmVkJyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NicpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uKHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdKSB7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSA9IHt9O1xyXG4gIH1cclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uID0gcGVlckpzQ29ubmVjdGlvbjtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLm9uKCdjbG9zZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nsb3NpbmcgY29ubmVjdGlvbicpO1xyXG4gICAgb3RoZXJVc2VyRGlzY29ubmVjdGVkLmNhbGwoc2VsZiwgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9KTtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZGF0YVJlY2VpdmVkLmNhbGwoc2VsZiwgZGF0YSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZhZGVBcnJvd1RvSW1hZ2UoaW1hZ2VGaWxlTmFtZSkge1xyXG4gICQoXCIjYXJyb3ctaW1nXCIpLmF0dHIoJ3NyYycsICdpbWFnZXMvJyArIGltYWdlRmlsZU5hbWUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJEaXNjb25uZWN0ZWQob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gc2hvdWxkIGJlIGNhbGxlZCBhZnRlciB0aGUgcGVlckpzIGNvbm5lY3Rpb25cclxuICAvLyBoYXMgYWxyZWFkeSBiZWVuIGNsb3NlZFxyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHJlbW92ZVVzZXJGcm9tVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcmVtb3ZlVXNlckZyb21VSS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIC8vIHJlbW92ZSB0aGlzIHVzZXIgZnJvbSB0aGUgZ2FtZSBpbiBGaXJlYmFzZTpcclxuICBtYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbUdhbWUoZ2FtZUlkLCBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICBpZiAodGhpcy5ob3N0UGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgLy8gaWYgdGhhdCB1c2VyIHdhcyB0aGUgaG9zdCwgc2V0IHVzIGFzIHRoZSBuZXcgaG9zdFxyXG4gICAgdGhpcy5ob3N0UGVlcklkID0gdGhpcy5wZWVyLmlkO1xyXG4gICAgc3dpdGNoVG9OZXdIb3N0LmNhbGwodGhpcywgdGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciB3aG8gZGlzY29ubmVjdGVkIGN1cnJlbnRseSBoYWQgYW4gaXRlbSxcclxuICAvLyBwdXQgb3V0IGEgbmV3IG9uZVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IG90aGVyVXNlclBlZXJJZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG5cclxuICAvLyBkZWxldGUgdGhhdCB1c2VyJ3MgZGF0YVxyXG4gIGRlbGV0ZSB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXTtcclxuXHJcbiAgLy8gaWYgdGhlcmUgYW55IHVzZXJzIGxlZnQsIGJyb2FkY2FzdCB0aGVtIHRoZSBuZXcgZ2FtZSBzdGF0ZVxyXG4gIGlmIChPYmplY3Qua2V5cyh0aGlzLm90aGVyVXNlcnMpLmxlbmd0aCA+IDApIHtcclxuICAgIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMuY2FsbCh0aGlzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd3YWl0aW5nIGZvciBhIHNtdWdnbGVyIHRvIGJhdHRsZS4uLicpO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tVGVhbSh1c2VyUGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSB1c2VyUGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMuc3BsaWNlKGksIDEpO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBqID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gdXNlclBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5zcGxpY2UoaiwgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVc2VyRnJvbVVJKHBlZXJJZCkge1xyXG4gIC8vIHJlbW92ZSB0aGUgb3RoZXIgdXNlcidzIGNhciBmcm9tIHRoZSBtYXBcclxuICB0aGlzLm90aGVyVXNlcnNbcGVlcklkXS5jYXIubWFya2VyLnNldE1hcChudWxsKTtcclxuXHJcbiAgLy8gaWYgdGhlaXIgdGVhbSBoYXMgbm8gbW9yZSB1c2VycywgZ3JleSBvdXRcclxuICAvLyB0aGVpciBzY29yZSBib3hcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ29wYWNpdHknLCAnMC4zJyk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbihsYXQsIGxuZykge1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBicm9hZGNhc3RHYW1lU3RhdGUuY2FsbCh0aGlzLCB1c2VyKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRhdGFSZWNlaXZlZChkYXRhKSB7XHJcbiAgaWYgKGRhdGEucGVlcklkKSB7XHJcbiAgICAvLyBpZiB3ZSBhcmUgdGhlIGhvc3QsIGFuZCB0aGUgdXNlciB3aG8gc2VudCB0aGlzIGRhdGEgaGFzbid0IGJlZW4gZ2l2ZW4gdGhlIGluaXRpYWwgZ2FtZVxyXG4gICAgLy8gc3RhdGUsIHRoZW4gYnJvYWRjYXN0IGl0IHRvIHRoZW1cclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdICYmICF0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0uaGFzQmVlbkluaXRpYWxpemVkID0gdHJ1ZTtcclxuICAgICAgLy8gbm90IHN1cmUgaWYgd2Ugc2hvdWxkIGRvIHRoaXMgb3Igbm90LCBidXQgYXQgbGVhc3QgaXQgcmVzZXRzIHRoZSBnYW1lXHJcbiAgICAgIC8vIHN0YXRlIHRvIHdoYXQgd2UsIHRoZSBob3N0LCB0aGluayBpdCBpc1xyXG4gICAgICBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzLmNhbGwodGhpcyk7XHJcbiAgICAgIC8vIGlmIG5vdCB0aGF0LCB0aGVuIHdlIHNob3VsZCBqdXN0IGJyb2FkY2FzdCB0byB0aGUgbmV3IGd1eSBsaWtlIHRoaXM6XHJcbiAgICAgIC8vIGJyb2FkY2FzdEdhbWVTdGF0ZShkYXRhLnBlZXJJZCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmxhc3RVcGRhdGVUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChkYXRhLmV2ZW50KSB7XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICd1cGRhdGVfZ2FtZV9zdGF0ZScpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiB1cGRhdGUgZ2FtZSBzdGF0ZScpO1xyXG4gICAgICAvLyB3ZSBvbmx5IHdhbnQgdG8gcmVjZW50ZXIgdGhlIG1hcCBpbiB0aGUgY2FzZSB0aGF0IHRoaXMgaXMgYSBuZXcgdXNlclxyXG4gICAgICAvLyBqb2luaW5nIGZvciB0aGUgZmlyc3QgdGltZSwgYW5kIHRoZSB3YXkgdG8gdGVsbCB0aGF0IGlzIHRvIHNlZSBpZiB0aGVcclxuICAgICAgLy8gaW5pdGlhbCBsb2NhdGlvbiBoYXMgY2hhbmdlZC4gIE9uY2UgdGhlIHVzZXIgaXMgYWxyZWFkeSBqb2luZWQsIGlmIGFcclxuICAgICAgLy8gbG9jYXRpb24gY2hhbmdlIGlzIGluaXRpYXRlZCwgdGhhdCB3aWxsIHVzZSB0aGUgJ25ld19sb2NhdGlvbicgZXZlbnQgXHJcbiAgICAgIGlmIChwYXJzZUZsb2F0KGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCkgIT0gcGFyc2VGbG9hdCh0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpIHx8XHJcbiAgICAgICAgcGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpICE9IHBhcnNlRmxvYXQodGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSkge1xyXG4gICAgICAgIHRoaXMubWFwLnNldENlbnRlcihuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxyXG4gICAgICAgICAgZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0LFxyXG4gICAgICAgICAgZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdCA9IGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3Q7XHJcbiAgICAgIC8vIG5lZWQgdG8gbWFrZSB0aGlzIGNhbGwgYmVjYXVzZSB3ZSBjYW4gYmUgaW4gYSBzaXR1YXRpb24gd2hlcmUgdGhlIGhvc3RcclxuICAgICAgLy8gZG9lc24ndCBrbm93IG91ciB1c2VybmFtZSB5ZXQsIHNvIHdlIG5lZWQgdG8gbWFudWFsbHkgc2V0IGl0IGluIG91clxyXG4gICAgICAvLyBvd24gVUkgZmlyc3QuXHJcbiAgICAgIHVwZGF0ZVVzZXJuYW1lLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkLCB0aGlzLnVzZXJuYW1lKTtcclxuICAgICAgdXBkYXRlVUlXaXRoTmV3R2FtZVN0YXRlLmNhbGwodGhpcyk7XHJcbiAgICAgIGFzc2lnbk15VGVhbUJhc2UuY2FsbCh0aGlzKTtcclxuICAgICAgdXBkYXRlQ2FySWNvbnMuY2FsbCh0aGlzKTtcclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ25ld19sb2NhdGlvbicpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBuZXcgbG9jYXRpb24gJyArIGRhdGEuZXZlbnQubGF0ICsgJywnICsgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC5vcmlnaW5hdGluZ19wZWVyX2lkICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbi5jYWxsKHRoaXMsIGRhdGEuZXZlbnQubGF0LCBkYXRhLmV2ZW50LmxuZyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX2NvbGxlY3RlZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtIGNvbGxlY3RlZCBieSAnICsgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0pO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0gIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgb3RoZXJVc2VyQ29sbGVjdGVkSXRlbS5jYWxsKHRoaXMsIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2l0ZW0nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGl0ZW0gYXQgJyArXHJcbiAgICAgICAgZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyArXHJcbiAgICAgICAgJyB3aXRoIGlkICcgKyBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICAgICAgLy8gT25seSB1cGRhdGUgaWYgc29tZW9uZSBlbHNlIGNhdXNlZCB0aGUgbmV3IGl0ZW0gcGxhY2VtZW50LlxyXG4gICAgICAvLyBpZiB0aGlzIHVzZXIgZGlkIGl0LCBpdCB3YXMgYWxyZWFkeSBwbGFjZWRcclxuICAgICAgaWYgKGRhdGEuZXZlbnQuaG9zdF91c2VyICYmIGRhdGEuZXZlbnQuaG9zdF91c2VyICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIHZhciBpdGVtTG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGEuZXZlbnQubG9jYXRpb24ubGF0LCBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyk7XHJcbiAgICAgICAgcHV0TmV3SXRlbU9uTWFwLmNhbGwodGhpcywgaXRlbUxvY2F0aW9uLCBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fcmV0dXJuZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSByZXR1cm5lZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSArICcgd2hpY2ggZ2l2ZXMgdGhlbSAnICsgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICBvdGhlclVzZXJSZXR1cm5lZEl0ZW0uY2FsbCh0aGlzLCBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSwgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV90cmFuc2ZlcnJlZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtICcgKyBkYXRhLmV2ZW50LmlkICsgJyB0cmFuc2ZlcnJlZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LmZyb21Vc2VyUGVlcklkICsgJyB0byB1c2VyICcgKyBkYXRhLmV2ZW50LnRvVXNlclBlZXJJZCk7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC50b1VzZXJQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgLy8gdGhlIGl0ZW0gd2FzIHRyYW5zZmVycmVkIHRvIHRoaXMgdXNlclxyXG4gICAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCA9IHtcclxuICAgICAgICAgIGlkOiBkYXRhLmV2ZW50LmlkLFxyXG4gICAgICAgICAgbG9jYXRpb246IG51bGxcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnc29tZW9uZSB0cmFuc2ZlcnJlZCBhdCAnICsgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gICAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBzZXQgdGhlIGFycm93IHRvIHBvaW50IHRvIHRoZSBuZXcgdXNlciB3aG8gaGFzIHRoZSBpdGVtXHJcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1tkYXRhLmV2ZW50LnRvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciBzZW50IGEgdXNlcm5hbWUgdGhhdCB3ZSBoYXZlbid0IHNlZW4geWV0LCBzZXQgaXRcclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS51c2VybmFtZSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS51c2VybmFtZSkge1xyXG4gICAgdXBkYXRlVXNlcm5hbWUuY2FsbCh0aGlzLCBkYXRhLnBlZXJJZCwgZGF0YS51c2VybmFtZSk7XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS5jYXJMYXRMbmcgJiYgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSkge1xyXG4gICAgbW92ZU90aGVyQ2FyLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSwgbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhkYXRhLmNhckxhdExuZy5sYXQsIGRhdGEuY2FyTGF0TG5nLmxuZykpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduTXlUZWFtQmFzZSgpIHtcclxuICBpZiAodXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpIHtcclxuICAgIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdCA9IHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3Q7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVc2VybmFtZShwZWVySWQsIHVzZXJuYW1lKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0udXNlcm5hbWUgPSB1c2VybmFtZTtcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGorKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0udXNlcm5hbWUgPSB1c2VybmFtZTtcclxuICAgIH1cclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVSVdpdGhOZXdHYW1lU3RhdGUoKSB7XHJcbiAgLy8gcmVjZW50ZXIgdGhlIG1hcFxyXG4gIGNvbnNvbGUubG9nKCduZXcgbG9jYXRpb24gcmVjZWl2ZWQ6ICcgKyB0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbik7XHJcbiAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCwgdGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKTtcclxuICB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSS5jYWxsKHRoaXMpO1xyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxuICAvLyBpZiBzb21lb25lIGhhcyB0aGUgaXRlbVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0pIHtcclxuICAgIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gICAgLy8gaWYgSSBoYXZlIHRoZSBpdGVtLCBtYWtlIHRoZSBkZXN0aW5hdGlvbiBteSB0ZWFtJ3MgYmFzZVxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gYW5vdGhlciB1c2VyIGhhcyB0aGUgaXRlbSwgYnV0IHRoZSBzZXREZXN0aW5hdGlvbiBjYWxsXHJcbiAgICAgIC8vIHdpbGwgYmUgdGFrZW4gY2FyZSBvZiB3aGVuIHRoZSB1c2VyIHNlbmRzIHRoZWlyIGxvY2F0aW9uIGRhdGFcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gaWYgbm9ib2R5IGhhcyB0aGUgaXRlbSwgcHV0IGl0IG9uIHRoZSBtYXAgaW4gdGhlIHJpZ2h0IHBsYWNlLFxyXG4gICAgLy8gYW5kIHNldCB0aGUgbmV3IGl0ZW0gbG9jYXRpb24gYXMgdGhlIGRlc3RpbmF0aW9uXHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ICYmIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtb3ZlSXRlbU9uTWFwLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxhdCwgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93LnBuZycpO1xyXG4gIH1cclxuICB1cGRhdGVTY29yZXNJblVJLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICBhc3NpZ25NeVRlYW1JblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUJhc2VMb2NhdGlvbnNJblVJKCkge1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubGF0LFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FySWNvbnMoKSB7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLCB0aGlzLnRlYW1Ub3duT3RoZXJDYXJJY29uKTtcclxuICB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucy5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLCB0aGlzLnRlYW1DcnVzaE90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlTXlDYXJJY29uLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU15Q2FySWNvbigpIHtcclxuICB2YXIgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY3J1c2hfY2FyLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKSB7XHJcbiAgICB1c2VyQ2FySW1nU3JjID0gJ2ltYWdlcy9jYXIucG5nJztcclxuICB9XHJcbiAgJCgnI2Nhci1pbWcnKS5hdHRyKCdzcmMnLCB1c2VyQ2FySW1nU3JjKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnModGVhbVVzZXJzLCB0ZWFtQ2FySWNvbikge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGVhbVVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIG1hcmtlclxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXSAmJiB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyICYmIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyLnNldE1hcChudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGVhbVVzZXJzW2ldLnBlZXJJZCAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgICAgIHRpdGxlOiB0ZWFtVXNlcnNbaV0ucGVlcklkLFxyXG4gICAgICAgIGljb246IHRlYW1DYXJJY29uXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVNjb3Jlc0luVUkodGVhbVRvd25OdW1JdGVtc1JldHVybmVkLCB0ZWFtQ3J1c2hOdW1JdGVtc1JldHVybmVkKSB7XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKS50ZXh0KHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKSk7XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0ZWFtQ3J1c2hOdW1JdGVtc1JldHVybmVkKTtcclxuICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVJdGVtT25NYXAobGF0LCBsbmcpIHtcclxuICBjb25zb2xlLmxvZygnbW92aW5nIGl0ZW0gdG8gbmV3IGxvY2F0aW9uOiAnICsgbGF0ICsgJywnICsgbG5nKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubGF0ID0gbGF0O1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcgPSBsbmc7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRQb3NpdGlvbih0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJSZXR1cm5lZEl0ZW0ob3RoZXJVc2VyUGVlcklkLCBub3dOdW1JdGVtc0ZvclVzZXIpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gIGluY3JlbWVudEl0ZW1Db3VudC5jYWxsKHRoaXMsIHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpKVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCAnYXJyb3cucG5nJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVPdGhlckNhcihvdGhlclVzZXJPYmplY3QsIG5ld0xvY2F0aW9uKSB7XHJcbiAgaWYgKCFvdGhlclVzZXJPYmplY3QuY2FyKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uID0gbmV3TG9jYXRpb247XHJcbiAgaWYgKCFvdGhlclVzZXJPYmplY3QuY2FyLm1hcmtlcikge1xyXG4gICAgdXBkYXRlQ2FySWNvbnMuY2FsbCh0aGlzKTtcclxuICB9XHJcbiAgLy8gaWYgdGhlIG90aGVyIGNhciBoYXMgYW4gaXRlbSwgdXBkYXRlIHRoZSBkZXN0aW5hdGlvblxyXG4gIC8vIHRvIGJlIGl0XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBvdGhlclVzZXJPYmplY3QucGVlcklkKSB7XHJcbiAgICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgICBpZiAodXNlcklzT25NeVRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJPYmplY3QucGVlcklkKSkge1xyXG4gICAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIG5ld0xvY2F0aW9uLCBhcnJvd0ltZyk7XHJcbiAgfVxyXG4gIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZC5jYWxsKHRoaXMsIG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24sIG90aGVyVXNlck9iamVjdC5wZWVySWQpO1xyXG4gIG90aGVyVXNlck9iamVjdC5jYXIubWFya2VyLnNldFBvc2l0aW9uKG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VySXNPbk15VGVhbShvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgbXlUZWFtID0gbnVsbDtcclxuICB2YXIgb3RoZXJVc2VyVGVhbSA9IG51bGw7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIG15VGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgICAgb3RoZXJVc2VyVGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAgIG90aGVyVXNlclRlYW0gPSAnY3J1c2gnO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbXlUZWFtID09IG90aGVyVXNlclRlYW07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZChvdGhlckNhckxvY2F0aW9uLCBvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBpZiB3ZSBkb24ndCBrbm93IHRoZSBvdGhlciBjYXIncyBsb2NhdGlvbiwgb3IgaWYgdGhpcyBpc24ndCB0aGUgdXNlciB3aXRoXHJcbiAgLy8gIHRoZSBpdGVtLCB0aGVuIGlnbm9yZSBpdC4gV2UnbGwgb25seSB0cmFuc2ZlciBhbiBpdGVtIGZyb20gdGhlIHBlcnNwZWN0ZWRcclxuICAvLyAgb2YgdGhlIHVzZXIgd2l0aCB0aGUgaXRlbVxyXG4gIGlmICghb3RoZXJDYXJMb2NhdGlvbiB8fCAhdGhpcy5jb2xsZWN0ZWRJdGVtKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmICh0aGlzLnRpbWVPZkxhc3RUcmFuc2Zlcikge1xyXG4gICAgdmFyIHRpbWVTaW5jZUxhc3RUcmFuc2ZlciA9ICgobmV3IERhdGUoKSkuZ2V0VGltZSgpKSAtIHRpbWVPZkxhc3RUcmFuc2ZlcjtcclxuICAgIC8vIGlmIG5vdCBlbm91Z2ggdGltZSBoYXMgcGFzc2VkIHNpbmNlIHRoZSBsYXN0IHRyYW5zZmVyLCByZXR1cm5cclxuICAgIGlmICh0aW1lU2luY2VMYXN0VHJhbnNmZXIgPCB0aGlzLnRpbWVEZWxheUJldHdlZW5UcmFuc2ZlcnMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gb3B0aW1pemF0aW9uOiByZXNldCB0aGlzIHNvIHdlIGRvbid0IHdhc3RlIHRpbWUgY2FsY3VsYXRpbmcgaW4gdGhlIGZ1dHVyZVxyXG4gICAgICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgZGlzdGFuY2UgPSBnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2Vlbih0aGlzLm1hcENlbnRlciwgb3RoZXJDYXJMb2NhdGlvbik7XHJcbiAgLy8gaWYgdGhpcyB1c2VyICh0aGF0IGhhcyB0aGUgaXRlbSkgaXMgY2xvc2UgZW5vdWdoIHRvIGNhbGwgaXQgYVxyXG4gIC8vIGNvbGxpc2lvbiwgdHJhbnNmZXIgaXQgdG8gdGhlIG90aGVyIHVzZXJcclxuICBpZiAoZGlzdGFuY2UgPCAyMCkge1xyXG4gICAgdHJhbnNmZXJJdGVtLmNhbGwodGhpcywgdGhpcy5jb2xsZWN0ZWRJdGVtLmlkLCB0aGlzLnBlZXIuaWQsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW0oaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2l0ZW0gJyArIGl0ZW1PYmplY3RJZCArICcgdHJhbnNmZXJyZWQgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICBicm9hZGNhc3RUcmFuc2Zlck9mSXRlbS5jYWxsKHRoaXMsIGl0ZW1PYmplY3RJZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCwgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdG9Vc2VyUGVlcklkO1xyXG4gIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICBpZiAodXNlcklzT25NeVRlYW0uY2FsbCh0aGlzLCB0b1VzZXJQZWVySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW3RvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uLCBhcnJvd0ltZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckNvbGxlY3RlZEl0ZW0odXNlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ290aGVyIHVzZXIgY29sbGVjdGVkIGl0ZW0nKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB1c2VySWQ7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbS5jYWxsKHRoaXMsIHVzZXJJZCkpIHtcclxuICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICB9XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsIGFycm93SW1nKTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZUljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VJY29uKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UoKSB7XHJcbiAgY29uc29sZS5sb2coJ3VzZXIgcmV0dXJuZWQgaXRlbSB0byBiYXNlJyk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgJ2Fycm93LnBuZycpO1xyXG4gIGluY3JlbWVudEl0ZW1Db3VudC5jYWxsKHRoaXMsIHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKTtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlcklzT25Ub3duVGVhbShwZWVySWQpIHtcclxuICBmb3IgKHZhciBpID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluY3JlbWVudEl0ZW1Db3VudChpc1RlYW1Ub3duKSB7XHJcbiAgaWYgKGlzVGVhbVRvd24pIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCsrO1xyXG4gICAgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKS50ZXh0KHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCsrO1xyXG4gICAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZsYXNoRWxlbWVudChqcXVlcnlFbGVtKSB7XHJcbiAganF1ZXJ5RWxlbS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlckNvbGxpZGVkV2l0aEl0ZW0oY29sbGlzaW9uSXRlbU9iamVjdCkge1xyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IGNvbGxpc2lvbkl0ZW1PYmplY3Q7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgY29sbGlzaW9uSXRlbU9iamVjdC5sb2NhdGlvbiA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gcGVlci5pZDtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZUljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VJY29uKTtcclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93X2JsdWUucG5nJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldERlc3RpbmF0aW9uKGxvY2F0aW9uLCBhcnJvd0ltYWdlTmFtZSkge1xyXG4gIHRoaXMuZGVzdGluYXRpb24gPSBsb2NhdGlvbjtcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgYXJyb3dJbWFnZU5hbWUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGVDYXIoKSB7XHJcbiAgdGhpcy5yb3RhdGlvbiA9IGdldEFuZ2xlLmNhbGwodGhpcywgdGhpcy5zcGVlZCwgdGhpcy5ob3Jpem9udGFsU3BlZWQpO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnLW1zLXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7IC8qIElFIDkgKi8gLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyAvKiBDaHJvbWUsIFNhZmFyaSwgT3BlcmEgKi8gdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsnO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGVBcnJvdygpIHtcclxuICB0aGlzLmFycm93Um90YXRpb24gPSBjb21wdXRlQmVhcmluZ0FuZ2xlLmNhbGwodGhpcywgdGhpcy5tYXBDZW50ZXIubGF0KCksIHRoaXMubWFwQ2VudGVyLmxuZygpLCB0aGlzLmRlc3RpbmF0aW9uLmxhdCgpLCB0aGlzLmRlc3RpbmF0aW9uLmxuZygpKTtcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnLW1zLXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsgLyogSUUgOSAqLyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsgLyogQ2hyb21lLCBTYWZhcmksIE9wZXJhICovIHRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsnO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoc3RlcCkge1xyXG4gIG1vdmVDYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QgJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIG9uZSBjYXIgd2l0aCBhbiBpdGVtIGFuZCBvbmUgd2l0aG91dFxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGhhcyBhbiBpdGVtLCBjaGVjayB0byBzZWUgaWYgdGhleSBhcmUgY29sbGlkaW5nXHJcbiAgICAgIC8vIHdpdGggYW55IG90aGVyIHVzZXIsIGFuZCBpZiBzbywgdHJhbnNmZXIgdGhlIGl0ZW1cclxuICAgICAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgICAgICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQuY2FsbCh0aGlzLCB0aGlzLm90aGVyVXNlcnNbdXNlcl0uY2FyLmxvY2F0aW9uLCB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlcklkKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaWYgYW5vdGhlciB1c2VyIGhhcyBhbiBpdGVtLCBhbmQgdGhlaXIgY2FyIGhhcyBhIGxvY2F0aW9uLFxyXG4gICAgICAvLyB0aGVuIGNvbnN0YW50bHkgc2V0IHRoZSBkZXN0aW5hdGlvbiB0byB0aGVpciBsb2NhdGlvblxyXG4gICAgICBpZiAodGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0gJiYgdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0ubG9jYXRpb24gJiYgdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0uY2FyLmxvY2F0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmNhci5sb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2hlY2sgaWYgdXNlciBjb2xsaWRlZCB3aXRoIGFuIGl0ZW0gb3IgdGhlIGJhc2VcclxuICB2YXIgY29sbGlzaW9uTWFya2VyID0gZ2V0Q29sbGlzaW9uTWFya2VyLmNhbGwodGhpcyk7XHJcbiAgaWYgKGNvbGxpc2lvbk1hcmtlcikge1xyXG4gICAgaWYgKCFjb2xsZWN0ZWRJdGVtICYmIGNvbGxpc2lvbk1hcmtlciA9PSB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICAgIC8vIHVzZXIganVzdCBwaWNrZWQgdXAgYW4gaXRlbVxyXG4gICAgICB1c2VyQ29sbGlkZWRXaXRoSXRlbS5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCk7XHJcbiAgICAgIGJyb2FkY2FzdEl0ZW1Db2xsZWN0ZWQuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QuaWQpO1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbGxlY3RlZEl0ZW0gJiYgY29sbGlzaW9uTWFya2VyID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgICAgLy8gdXNlciBoYXMgYW4gaXRlbSBhbmQgaXMgYmFjayBhdCB0aGUgYmFzZVxyXG4gICAgICB1c2VyUmV0dXJuZWRJdGVtVG9CYXNlLmNhbGwodGhpcyk7XHJcbiAgICAgIGJyb2FkY2FzdEl0ZW1SZXR1cm5lZC5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCk7XHJcbiAgICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24uY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gaWYgdGhlIGdhbWUgaGFzIHN0YXJ0ZWQgYW5kIHdlJ3JlIHRoZSBob3N0LCBjaGVja1xyXG4gIC8vIGZvciBhbnkgcGVlcnMgd2hvIGhhdmVuJ3Qgc2VudCBhbiB1cGRhdGUgaW4gdG9vIGxvbmdcclxuICBpZiAodGhpcy5ob3N0UGVlcklkICYmIHRoaXMucGVlciAmJiB0aGlzLnBlZXIuaWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgY2xlYW51cEFueURyb3BwZWRDb25uZWN0aW9ucy5jYWxsKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2hvdWxkS2VlcEFsaXZlKCkge1xyXG4gIHJldHVybiB0aGlzLnFzLnZhbHVlKHRoaXMua2VlcEFsaXZlUGFyYW1OYW1lKSA9PSAndHJ1ZSc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBBbnlEcm9wcGVkQ29ubmVjdGlvbnMoKSB7XHJcbiAgaWYgKHNob3VsZEtlZXBBbGl2ZS5jYWxsKHRoaXMpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdGltZU5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIC8vIGlmIGl0J3MgYmVlbiBsb25nZXIgdGhhbiB0aGUgdGltZW91dCBzaW5jZSB3ZSd2ZSBoZWFyZCBmcm9tXHJcbiAgICAvLyB0aGlzIHVzZXIsIHJlbW92ZSB0aGVtIGZyb20gdGhlIGdhbWVcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgJiYgKHRpbWVOb3cgLSB0aGlzLm90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgPiB0aGlzLkFDVElWRV9DT05ORUNUSU9OX1RJTUVPVVRfSU5fU0VDT05EUykpIHtcclxuICAgICAgY2xvc2VQZWVySnNDb25uZWN0aW9uLmNhbGwodGhpcywgdXNlcik7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgaWYgKHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdICYmIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uY2xvc2UoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihkdCkge1xyXG4gICQoXCIjY2FyLWltZ1wiKS5hdHRyKFwic3R5bGVcIiwgdGhpcy5yb3RhdGlvbkNzcyk7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24oKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuICYmIHRoaXMubWFwQ2VudGVyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGNhckxhdExuZzoge1xyXG4gICAgICAgICAgbGF0OiB0aGlzLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBlZXJJZDogdGhpcy5wZWVyLmlkLFxyXG4gICAgICAgIHVzZXJuYW1lOiB0aGlzLnVzZXJuYW1lXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgZ2FtZSBzdGF0ZSB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdIHx8ICF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdXBkYXRlR2FtZVN0YXRlRXZlbnRPYmplY3QgPSB7XHJcbiAgICBldmVudDoge1xyXG4gICAgICBuYW1lOiAndXBkYXRlX2dhbWVfc3RhdGUnLFxyXG4gICAgICBnYW1lRGF0YU9iamVjdDogdGhpcy5nYW1lRGF0YU9iamVjdFxyXG4gICAgfVxyXG4gIH07XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3SXRlbShsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHZhciBzaW1wbGVJdGVtTGF0TG5nID0ge1xyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgICAgZXZlbnQ6IHtcclxuICAgICAgICAgIG5hbWU6ICduZXdfaXRlbScsXHJcbiAgICAgICAgICBob3N0X3VzZXI6IHBlZXIuaWQsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBsYXQ6IHNpbXBsZUl0ZW1MYXRMbmcubGF0LFxyXG4gICAgICAgICAgICBsbmc6IHNpbXBsZUl0ZW1MYXRMbmcubG5nXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgaWQ6IGl0ZW1JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtUmV0dXJuZWQoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSByZXR1cm5lZCcpO1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9yZXR1cm5lZCcsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtOiBwZWVyLmlkLFxyXG4gICAgICAgIG5vd19udW1faXRlbXM6IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCxcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtQ29sbGVjdGVkKGl0ZW1JZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSBpZCAnICsgaXRlbUlkICsgJyBjb2xsZWN0ZWQgYnkgdXNlciAnICsgcGVlci5pZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gcGVlci5pZDtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX2NvbGxlY3RlZCcsXHJcbiAgICAgICAgaWQ6IGl0ZW1JZCxcclxuICAgICAgICB1c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW06IHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdFRyYW5zZmVyT2ZJdGVtKGl0ZW1JZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSB0cmFuc2ZlcnJlZCAnICsgaXRlbUlkICsgJyBmcm9tICcgKyBmcm9tVXNlclBlZXJJZCArICcgdG8gJyArIHRvVXNlclBlZXJJZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fdHJhbnNmZXJyZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgZnJvbVVzZXJQZWVySWQ6IGZyb21Vc2VyUGVlcklkLFxyXG4gICAgICAgIHRvVXNlclBlZXJJZDogdG9Vc2VyUGVlcklkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3TG9jYXRpb24obG9jYXRpb24pIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIG5ldyBsb2NhdGlvbjogJyArIGxvY2F0aW9uLmxhdCgpICsgJywnICsgbG9jYXRpb24ubG5nKCkpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICduZXdfbG9jYXRpb24nLFxyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKSxcclxuICAgICAgICBvcmlnaW5hdGluZ19wZWVyX2lkOiBwZWVyLmlkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuLy8gY2hlY2tzIHRvIHNlZSBpZiB0aGV5IGhhdmUgY29sbGlkZWQgd2l0aCBlaXRoZXIgYW4gaXRlbSBvciB0aGUgYmFzZVxyXG5mdW5jdGlvbiBnZXRDb2xsaXNpb25NYXJrZXIoKSB7XHJcbiAgLy8gY29tcHV0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiBteSBjYXIgYW5kIHRoZSBkZXN0aW5hdGlvblxyXG4gIGlmICh0aGlzLmRlc3RpbmF0aW9uKSB7XHJcbiAgICB2YXIgbWF4RGlzdGFuY2VBbGxvd2VkID0gdGhpcy5jYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZTtcclxuICAgIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKHRoaXMubWFwQ2VudGVyLCB0aGlzLmRlc3RpbmF0aW9uKTtcclxuICAgIC8vIFRoZSBiYXNlIGlzIGJpZ2dlciwgc28gYmUgbW9yZSBsZW5pZW50IHdoZW4gY2hlY2tpbmcgZm9yIGEgYmFzZSBjb2xsaXNpb25cclxuICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtYXhEaXN0YW5jZUFsbG93ZWQgPSB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgaWYgKGRpc3RhbmNlIDwgbWF4RGlzdGFuY2VBbGxvd2VkKSB7XHJcbiAgICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyB0aGlzLnBlZXIuaWQgKyAnIGNvbGxpZGVkIHdpdGggaXRlbScpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyO1xyXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuZGVzdGluYXRpb24gPT0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29sbGVjdGVkSXRlbSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgJyArIHRoaXMucGVlci5pZCArICcgaGFzIGFuIGl0ZW0gYW5kIGNvbGxpZGVkIHdpdGggYmFzZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0R2FtZVRvTmV3TG9jYXRpb24obGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZS5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlLmNhbGwodGhpcywgKHBhcnNlRmxvYXQobGF0KSArIDAuMDA2KS50b1N0cmluZygpLCAocGFyc2VGbG9hdChsbmcpICsgMC4wMDgpLnRvU3RyaW5nKCkpO1xyXG4gIGFzc2lnbk15VGVhbUJhc2UuY2FsbCh0aGlzKTtcclxuICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMubWFwLnNldENlbnRlcih0aGlzLm1hcENlbnRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFuZ2xlKHZ4LCB2eSkge1xyXG4gIHJldHVybiAoTWF0aC5hdGFuMih2eSwgdngpKSAqICgxODAgLyBNYXRoLlBJKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29tcHV0ZUJlYXJpbmdBbmdsZShsYXQxLCBsb24xLCBsYXQyLCBsb24yKSB7XHJcbiAgdmFyIFIgPSA2MzcxOyAvLyBrbVxyXG4gIHZhciBkTGF0ID0gKGxhdDIgLSBsYXQxKS50b1JhZCgpO1xyXG4gIHZhciBkTG9uID0gKGxvbjIgLSBsb24xKS50b1JhZCgpO1xyXG4gIHZhciBsYXQxID0gbGF0MS50b1JhZCgpO1xyXG4gIHZhciBsYXQyID0gbGF0Mi50b1JhZCgpO1xyXG5cclxuICB2YXIgYW5nbGVJblJhZGlhbnMgPSBNYXRoLmF0YW4yKE1hdGguc2luKGRMb24pICogTWF0aC5jb3MobGF0MiksXHJcbiAgICBNYXRoLmNvcyhsYXQxKSAqIE1hdGguc2luKGxhdDIpIC0gTWF0aC5zaW4obGF0MSkgKiBNYXRoLmNvcyhsYXQyKSAqIE1hdGguY29zKGRMb24pKTtcclxuICByZXR1cm4gYW5nbGVJblJhZGlhbnMudG9EZWcoKTtcclxufVxyXG5cclxuXHJcbi8vIGdhbWUgbG9vcCBoZWxwZXJzXHJcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcclxuICByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxufVxyXG5cclxuLy8gZG9uJ3QgdGhpbmsgd2UnbGwgbmVlZCB0byBnbyB0byB0aGUgdXNlcidzIGxvY2F0aW9uLCBidXQgbWlnaHQgYmUgdXNlZnVsXHJcbmZ1bmN0aW9uIHRyeUZpbmRpbmdMb2NhdGlvbigpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIFRyeSBIVE1MNSBnZW9sb2NhdGlvblxyXG4gIGlmIChuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcclxuICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuICAgICAgdmFyIHBvcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcocG9zaXRpb24uY29vcmRzLmxhdGl0dWRlLFxyXG4gICAgICAgIHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGUpO1xyXG4gICAgICBzZWxmLm1hcC5zZXRDZW50ZXIocG9zKTtcclxuICAgICAgc2VsZi5tYXBDZW50ZXIgPSBwb3M7XHJcbiAgICB9LCBmdW5jdGlvbigpIHtcclxuICAgICAgaGFuZGxlTm9HZW9sb2NhdGlvbi5jYWxsKHNlbGYsIHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IEdlb2xvY2F0aW9uXHJcbiAgICBoYW5kbGVOb0dlb2xvY2F0aW9uLmNhbGwoc2VsZiwgZmFsc2UpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTm9HZW9sb2NhdGlvbihlcnJvckZsYWcpIHtcclxuICBpZiAoZXJyb3JGbGFnKSB7XHJcbiAgICB2YXIgY29udGVudCA9ICdFcnJvcjogVGhlIEdlb2xvY2F0aW9uIHNlcnZpY2UgZmFpbGVkLic7XHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBjb250ZW50ID0gJ0Vycm9yOiBZb3VyIGJyb3dzZXIgZG9lc25cXCd0IHN1cHBvcnQgZ2VvbG9jYXRpb24uJztcclxuICB9XHJcbn1cclxuXHJcbi8vIFRoaXMgY2FuIGJlIHJlbW92ZWQsIHNpbmNlIGl0IGNhdXNlcyBhbiBlcnJvci4gIGl0J3MganVzdCBhbGxvd2luZ1xyXG4vLyBmb3IgcmlnaHQtY2xpY2tpbmcgdG8gc2hvdyB0aGUgYnJvd3NlcidzIGNvbnRleHQgbWVudS5cclxuZnVuY3Rpb24gc2hvd0NvbnRleHRNZW51KGUpIHtcclxuXHJcbiAgLy8gY3JlYXRlIGEgY29udGV4dG1lbnUgZXZlbnQuXHJcbiAgdmFyIG1lbnVfZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO1xyXG4gIG1lbnVfZXZlbnQuaW5pdE1vdXNlRXZlbnQoXCJjb250ZXh0bWVudVwiLCB0cnVlLCB0cnVlLFxyXG4gICAgZS52aWV3LCAxLCAwLCAwLCAwLCAwLCBmYWxzZSxcclxuICAgIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDIsIG51bGwpO1xyXG5cclxuICAvLyBmaXJlIHRoZSBuZXcgZXZlbnQuXHJcbiAgZS5vcmlnaW5hbFRhcmdldC5kaXNwYXRjaEV2ZW50KG1lbnVfZXZlbnQpO1xyXG59XHJcblxyXG5cclxuLy8gaGFjayB0byBhbGxvdyBmb3IgYnJvd3NlciBjb250ZXh0IG1lbnUgb24gcmlnaHQtY2xpY2tcclxuZnVuY3Rpb24gbW91c2VVcChlKSB7XHJcbiAgaWYgKGUuYnV0dG9uID09IDIpIHsgLy8gcmlnaHQtY2xpY2tcclxuICAgIHNob3dDb250ZXh0TWVudS5jYWxsKHRoaXMsIGUpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gJCh3aW5kb3cpLnVubG9hZChmdW5jdGlvbigpIHtcclxuLy8gICBkaXNjb25uZWN0RnJvbUdhbWUoKTtcclxuLy8gfSk7IiwiLyoqXHJcbiAqICBtYXRjaG1ha2VyLmpzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gTWF0Y2htYWtlclRvd247XHJcblxyXG4vKipcclxuICogIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpIHtcclxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWF0Y2htYWtlclRvd24pKVxyXG4gICAgcmV0dXJuIG5ldyBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpO1xyXG5cclxuICAvLyBUaGUgcm9vdCBvZiB5b3VyIGdhbWUgZGF0YS5cclxuICB0aGlzLkdBTUVfTE9DQVRJT04gPSBmaXJlYmFzZUJhc2VVcmw7XHJcbiAgdGhpcy5nYW1lUmVmID0gbmV3IEZpcmViYXNlKHRoaXMuR0FNRV9MT0NBVElPTik7XHJcblxyXG4gIHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OID0gJ2F2YWlsYWJsZV9nYW1lcyc7XHJcbiAgdGhpcy5GVUxMX0dBTUVTX0xPQ0FUSU9OID0gJ2Z1bGxfZ2FtZXMnO1xyXG4gIHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OID0gJ2dhbWVzJztcclxuICB0aGlzLk1BWF9VU0VSU19QRVJfR0FNRSA9IDQ7XHJcbiAgdGhpcy5HQU1FX0NMRUFOVVBfVElNRU9VVCA9IDMwICogMTAwMDsgLy8gaW4gbWlsbGlzZWNvbmRzXHJcblxyXG4gIHRoaXMuam9pbmVkR2FtZSA9IG51bGw7XHJcbiAgdGhpcy5teVdvcmtlciA9IG51bGw7XHJcblxyXG59XHJcblxyXG4vKipcclxuICogIGNvbm5lY3QgdG8gYSBnYW1lXHJcbiAqL1xyXG5NYXRjaG1ha2VyVG93bi5wcm90b3R5cGUuam9pbk9yQ3JlYXRlR2FtZSA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgY2FsbEFzeW5jQ2xlYW51cEluYWN0aXZlR2FtZXMuY2FsbCh0aGlzKTtcclxuICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGpvaW4gZ2FtZScpO1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJIZWxwZXJXb3JrZXIuY2FsbCh0aGlzLCB3aW5kb3cpO1xyXG4gIHZhciBhdmFpbGFibGVHYW1lc0RhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfR0FNRVNfTE9DQVRJT04pO1xyXG4gIGF2YWlsYWJsZUdhbWVzRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIC8vIG9ubHkgam9pbiBhIGdhbWUgaWYgb25lIGlzbid0IGpvaW5lZCBhbHJlYWR5XHJcbiAgICBpZiAoc2VsZi5qb2luZWRHYW1lID09IG51bGwpIHtcclxuICAgICAgc2VsZi5qb2luZWRHYW1lID0gLTE7XHJcbiAgICAgIGlmIChkYXRhLnZhbCgpID09PSBudWxsKSB7XHJcbiAgICAgICAgLy8gdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSBnYW1lcywgc28gY3JlYXRlIG9uZVxyXG4gICAgICAgIHZhciBnYW1lRGF0YSA9IGNyZWF0ZU5ld0dhbWUuY2FsbChzZWxmLCB1c2VybmFtZSwgcGVlcklkKTtcclxuICAgICAgICBqb2luZWRHYW1lQ2FsbGJhY2soZ2FtZURhdGEsIHRydWUpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBqc29uT2JqID0gZGF0YS52YWwoKTtcclxuICAgICAgICB2YXIgZ2FtZUlkO1xyXG5cclxuICAgICAgICAvLyBzdHVwaWQgamF2YXNjcmlwdCB3b24ndCB0ZWxsIG1lIGhvdyBtYW55IGdhbWUgZWxlbWVudHNcclxuICAgICAgICAvLyBhcmUgaW4gdGhlIGpzb25PYmosIHNvIGNvdW50IGVtIHVwXHJcbiAgICAgICAgdmFyIG51bUF2YWlsYWJsZUdhbWVzID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgbnVtQXZhaWxhYmxlR2FtZXMrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgY2hpbGQgZ2FtZXMgYW5kIHRyeVxyXG4gICAgICAgIC8vIHRvIGpvaW4gZWFjaCBvbmVcclxuICAgICAgICB2YXIgY291bnRlciA9IDA7XHJcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb25PYmopIHtcclxuICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICAgIGlmIChqc29uT2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgZ2FtZUlkID0ganNvbk9ialtrZXldO1xyXG4gICAgICAgICAgICBnZXRHYW1lTGFzdFVwZGF0ZVRpbWUuY2FsbChzZWxmLCBnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgZG9uZUdldHRpbmdVcGRhdGVUaW1lLmJpbmQoc2VsZiksIGNvdW50ZXIgPT0gbnVtQXZhaWxhYmxlR2FtZXMsIHNlbGYpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqICByZW1vdmUgYSBwZWVyIGZyb20gdGhlIGdhbWVcclxuICovXHJcbmZ1bmN0aW9uIHJlbW92ZVBlZXJGcm9tR2FtZShnYW1lSWQsIHBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKCFkYXRhLnZhbCgpKSB7XHJcbiAgICAgIC8vIHNvbWV0aGluZydzIHdyb25nLCBwcm9iYWJseSB0aGUgRmlyZWJhc2UgZGF0YSB3YXMgZGVsZXRlZFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS52YWwoKS5ob3N0UGVlcklkID09IHRoaXMucGVlcklkKSB7XHJcbiAgICAgIGZpbmROZXdIb3N0UGVlcklkLmNhbGwodGhpcywgZ2FtZUlkLCBwZWVySWQsIHN3aXRjaFRvTmV3SG9zdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbiAgICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gICAgdmFyIG51bVVzZXJzSW5HYW1lID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKS5jbGVhbih1bmRlZmluZWQpLmxlbmd0aDtcclxuICAgIGRhdGEuY2hpbGQoJ3VzZXJzJykuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIC8vIGlmIHdlJ3ZlIGZvdW5kIHRoZSByZWYgdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiBwZWVyLCByZW1vdmUgaXRcclxuICAgICAgaWYgKGNoaWxkU25hcHNob3QudmFsKCkgJiYgY2hpbGRTbmFwc2hvdC52YWwoKS5wZWVySWQgPT0gdGhpcy5wZWVySWQpIHtcclxuICAgICAgICBjaGlsZFNuYXBzaG90LnJlZigpLnJlbW92ZSgpO1xyXG4gICAgICAgIC8vIGlmIHRoaXMgdXNlciB3YXMgdGhlIGxhc3Qgb25lIGluIHRoZSBnYW1lLCBub3cgdGhlcmUgYXJlIDAsIFxyXG4gICAgICAgIC8vIHNvIGRlbGV0ZSB0aGUgZ2FtZVxyXG4gICAgICAgIGlmIChudW1Vc2Vyc0luR2FtZSA9PSAxKSB7XHJcbiAgICAgICAgICBkZWxldGVHYW1lLmNhbGwodGhpcywgZ2FtZUlkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gaWYgaXQgd2FzIGZ1bGwsIG5vdyBpdCBoYXMgb25lIG9wZW4gc2xvdCwgc2V0IGl0IHRvIGF2YWlsYWJsZVxyXG4gICAgICAgICAgaWYgKG51bVVzZXJzSW5HYW1lID09IHRoaXMuTUFYX1VTRVJTX1BFUl9HQU1FKSB7XHJcbiAgICAgICAgICAgIG1vdmVHYW1lRnJvbUZ1bGxUb0F2YWlsYWJsZS5jYWxsKHRoaXMsIGdhbWVJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBkb25lR2V0dGluZ1VwZGF0ZVRpbWUobGFzdFVwZGF0ZVRpbWUsIGdhbWVJZCwgaXNUaGVMYXN0R2FtZSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgLy8gaWYgdGhlIGdhbWUgaXMgc3RpbGwgYWN0aXZlIGpvaW4gaXRcclxuICBpZiAobGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgIGlmICghaXNUaW1lb3V0VG9vTG9uZy5jYWxsKHRoaXMsIGxhc3RVcGRhdGVUaW1lKSkge1xyXG4gICAgICBqb2luRXhpc3RpbmdHYW1lLmNhbGwodGhpcywgZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVHYW1lcy5jYWxsKHRoaXMpO1xyXG4gICAgfVxyXG4gIH1cclxuICAvLyBpZiB3ZSBnb3QgaGVyZSwgYW5kIHRoaXMgaXMgdGhlIGxhc3QgZ2FtZSwgdGhhdCBtZWFucyB0aGVyZSBhcmUgbm8gYXZhaWxhYmxlIGdhbWVzXHJcbiAgLy8gc28gY3JlYXRlIG9uZVxyXG4gIGlmIChpc1RoZUxhc3RHYW1lKSB7XHJcbiAgICBjb25zb2xlLmxvZygnbm8gYXZhaWxhYmxlIGdhbWVzIGZvdW5kLCBvbmx5IGluYWN0aXZlIG9uZXMsIHNvIGNyZWF0aW5nIGEgbmV3IG9uZS4uLicpO1xyXG4gICAgdmFyIGdhbWVEYXRhID0gY3JlYXRlTmV3R2FtZS5jYWxsKHRoaXMsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgam9pbmVkR2FtZUNhbGxiYWNrKGdhbWVEYXRhLCB0cnVlKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEdhbWVMYXN0VXBkYXRlVGltZShnYW1lSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgZG9uZUdldHRpbmdVcGRhdGVUaW1lQ2FsbGJhY2ssIGlzVGhlTGFzdEdhbWUpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKGRhdGEudmFsKCkgJiYgZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSkge1xyXG4gICAgICBjb25zb2xlLmxvZygnZm91bmQgdXBkYXRlIHRpbWU6ICcgKyBkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lKVxyXG4gICAgICBkb25lR2V0dGluZ1VwZGF0ZVRpbWVDYWxsYmFjayhkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lLCBnYW1lSWQsIGlzVGhlTGFzdEdhbWUsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaywgc2VsZik7XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVTZXJ2ZXJQaW5nKCkge1xyXG4gIHNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUuY2FsbCh0aGlzKTtcclxuICB3aW5kb3cuc2V0SW50ZXJ2YWwodGhpcy5zZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlLCAxMDAwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVTZXJ2ZXJIZWxwZXJXb3JrZXIod2luZG93T2JqZWN0KSB7XHJcbiAgaWYgKHR5cGVvZih3aW5kb3dPYmplY3QuV29ya2VyKSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgdGhpcy5teVdvcmtlciA9IG5ldyBXb3JrZXIoXCJhc3luY21lc3NhZ2VyLmpzXCIpO1xyXG4gICAgdGhpcy5teVdvcmtlci5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5wcm9jZXNzTWVzc2FnZUV2ZW50LCBmYWxzZSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNvbnNvbGUubG9nKFwiU29ycnksIHlvdXIgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IFdlYiBXb3JrZXJzLi4uXCIpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2FsbEFzeW5jQ2xlYW51cEluYWN0aXZlR2FtZXMoKSB7XHJcbiAgLy8gZG8gaXQgb24gYSB3ZWIgd29ya2VyIHRocmVhZFxyXG4gIGlmICh0aGlzLm15V29ya2VyKSB7XHJcbiAgICB0aGlzLm15V29ya2VyLnBvc3RNZXNzYWdlKHtcclxuICAgICAgY21kOiAnY2xlYW51cF9pbmFjdGl2ZV9nYW1lcydcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUoKSB7XHJcbiAgY29uc29sZS5sb2coJ3Bpbmdpbmcgc2VydmVyJyk7XHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZCh0aGlzLmpvaW5lZEdhbWUpLmNoaWxkKCdsYXN0VXBkYXRlVGltZScpLnNldCgobmV3IERhdGUoKSkuZ2V0VGltZSgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cEdhbWVzKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgY29uc29sZS5sb2coJ2NsZWFuaW5nIHVwIGluYWN0aXZlIGdhbWVzJyk7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGFTbmFwc2hvdCkge1xyXG4gICAgZGF0YVNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTbmFwc2hvdCkge1xyXG4gICAgICB2YXIgc2hvdWxkRGVsZXRlR2FtZSA9IGZhbHNlO1xyXG4gICAgICB2YXIgZ2FtZURhdGEgPSBjaGlsZFNuYXBzaG90LnZhbCgpO1xyXG4gICAgICBpZiAoIWdhbWVEYXRhKSB7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlR2FtZSA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGdhbWVEYXRhLnVzZXJzID09IG51bGwgfHwgZ2FtZURhdGEudXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnZ2FtZSBoYXMgbm8gdXNlcnMnKTtcclxuICAgICAgICBzaG91bGREZWxldGVHYW1lID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNUaW1lb3V0VG9vTG9uZy5jYWxsKHNlbGYsIGdhbWVEYXRhLmxhc3RVcGRhdGVUaW1lKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZ2FtZSBoYXNuJ3QgYmVlbiB1cGRhdGVkIHNpbmNlIFwiICsgZ2FtZURhdGEubGFzdFVwZGF0ZVRpbWUpO1xyXG4gICAgICAgIHNob3VsZERlbGV0ZUdhbWUgPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2hvdWxkRGVsZXRlR2FtZSkge1xyXG4gICAgICAgIGRlbGV0ZUdhbWUoc2VsZiwgY2hpbGRTbmFwc2hvdC5uYW1lKCkpO1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGlzVGltZW91dFRvb0xvbmcobGFzdFVwZGF0ZVRpbWUpIHtcclxuICBpZiAoIWxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHZhciBjdXJyZW50VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgcmV0dXJuIChjdXJyZW50VGltZSAtIGxhc3RVcGRhdGVUaW1lID4gdGhpcy5HQU1FX0NMRUFOVVBfVElNRU9VVCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NNZXNzYWdlRXZlbnQoZXZlbnQpIHtcclxuICBzd2l0Y2ggKGV2ZW50LmRhdGEpIHtcclxuICAgIGNhc2UgJ2NsZWFudXBfaW5hY3RpdmVfZ2FtZXMnOlxyXG4gICAgICBjbGVhbnVwR2FtZXMuc2VsZigpO1xyXG4gICAgICBicmVhaztcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIGJyZWFrO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGZpbmROZXdIb3N0UGVlcklkKGdhbWVJZCwgZXhpc3RpbmdIb3N0UGVlcklkLCBjYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gcmVzZXQgdGhlIGhvc3RQZWVySWQgc28gaXQgcHJldmVudHMgdGhlIGxlYXZpbmcgaG9zdCdzIGJyb3dzZXJcclxuICAvLyBpZiBpdCB0cmllcyB0byBzd2l0Y2ggYWdhaW4gYmVmb3JlIHRoaXMgaXMgZG9uZVxyXG4gIHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKS5jaGlsZCgnaG9zdFBlZXJJZCcpLnJlbW92ZSgpO1xyXG5cclxuICB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICB2YXIgdXNlcnMgPSBkYXRhLmNoaWxkKCd1c2VycycpLnZhbCgpO1xyXG5cclxuICAgIC8vIGlmIGZvciB3aGF0ZXZlciByZWFzb24gdGhpcyBpcyBjYWxsZWQgYW5kIHNvbWV0aGluZydzIG5vdCByaWdodCwganVzdFxyXG4gICAgLy8gcmV0dXJuXHJcbiAgICBpZiAoIXVzZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB1c2VycyA9IHVzZXJzLmNsZWFuKHVuZGVmaW5lZCk7XHJcbiAgICBpZiAodXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHVzZXJzW2ldICYmIHVzZXJzW2ldLnBlZXJJZCAhPSBleGlzdGluZ0hvc3RQZWVySWQpIHtcclxuICAgICAgICAvLyB3ZSd2ZSBmb3VuZCBhIG5ldyB1c2VyIHRvIGJlIHRoZSBob3N0LCByZXR1cm4gdGhlaXIgaWRcclxuICAgICAgICBjYWxsYmFjayhnYW1lSWQsIHVzZXJzW2ldLnBlZXJJZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNhbGxiYWNrKGdhbWVJZCwgbnVsbCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHN3aXRjaFRvTmV3SG9zdChnYW1lSWQsIG5ld0hvc3RQZWVySWQpIHtcclxuICBpZiAoIW5ld0hvc3RQZWVySWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQUxMX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpLmNoaWxkKCdob3N0UGVlcklkJykuc2V0KG5ld0hvc3RQZWVySWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkZWxldGVHYW1lKGdhbWVJZCkge1xyXG4gIHJlbW92ZUdhbWVGcm9tQXZhaWxhYmxlR2FtZXMuY2FsbCh0aGlzLCBnYW1lSWQpO1xyXG4gIHJlbW92ZUdhbWVGcm9tRnVsbEdhbWVzLmNhbGwodGhpcywgZ2FtZUlkKTtcclxuICByZW1vdmVHYW1lLmNhbGwodGhpcywgZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlR2FtZShnYW1lSWQpIHtcclxuICB2YXIgZ2FtZURhdGFSZWYgPSB0aGlzLmdhbWVSZWYuY2hpbGQodGhpcy5BTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld0dhbWUodXNlcm5hbWUsIHBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdjcmVhdGluZyBuZXcgZ2FtZScpO1xyXG4gIHZhciBnYW1lSWQgPSBjcmVhdGVOZXdHYW1lSWQuY2FsbCh0aGlzKTtcclxuICB2YXIgZ2FtZURhdGEgPSB7XHJcbiAgICBpZDogZ2FtZUlkLFxyXG4gICAgaG9zdFBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcnM6IFt7XHJcbiAgICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgIH1dXHJcbiAgfVxyXG4gIHZhciBuZXdHYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBuZXdHYW1lRGF0YVJlZi5zZXQoZ2FtZURhdGEpO1xyXG4gIHZhciBuZXdBdmFpbGFibGVHYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBuZXdBdmFpbGFibGVHYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxuICB0aGlzLmpvaW5lZEdhbWUgPSBnYW1lSWQ7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxuICByZXR1cm4gZ2FtZURhdGE7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOZXdHYW1lSWQoKSB7XHJcbiAgLy8gVE9ETzogcmVwbGFjZSB0aGlzIHdpdGggc29tZXRoaW5nIHRoYXQgd29uJ3RcclxuICAvLyBhY2NpZGVudGFsbHkgaGF2ZSBjb2xsaXNpb25zXHJcbiAgcmV0dXJuIGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBqb2luRXhpc3RpbmdHYW1lKGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkR2FtZUNhbGxiYWNrKSB7XHJcbiAgLy8gaWYgYSBnYW1lIGhhcyBhbHJlYWR5IGJlZW4gam9pbmVkIG9uIGFub3RoZXIgdGhyZWFkLCBkb24ndCBqb2luIGFub3RoZXIgb25lXHJcbiAgaWYgKHRoaXMuam9pbmVkR2FtZSAmJiB0aGlzLmpvaW5lZEdhbWUgPj0gMCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLmpvaW5lZEdhbWUgPSBnYW1lSWQ7XHJcbiAgYXN5bmNHZXRHYW1lRGF0YS5jYWxsKHRoaXMsIGdhbWVJZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjay5iaW5kKHRoaXMpLCBqb2luZWRHYW1lQ2FsbGJhY2suYmluZCh0aGlzKSwgZG9uZUdldHRpbmdHYW1lRGF0YS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGFzeW5jR2V0R2FtZURhdGEoZ2FtZUlkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2ssIGRvbmVHZXR0aW5nR2FtZURhdGFDYWxsYmFjaykge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGRvbmVHZXR0aW5nR2FtZURhdGFDYWxsYmFjayhkYXRhLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRHYW1lQ2FsbGJhY2spO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkb25lR2V0dGluZ0dhbWVEYXRhKGdhbWVEYXRhU25hcHNob3QsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZEdhbWVDYWxsYmFjaykge1xyXG4gIHZhciBnYW1lRGF0YSA9IGdhbWVEYXRhU25hcHNob3QudmFsKCk7XHJcbiAgdmFyIG5ld1VzZXIgPSB7XHJcbiAgICBwZWVySWQ6IHBlZXJJZCxcclxuICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gIH07XHJcbiAgLy8gd2VpcmRuZXNzOiBpIHdhbnQgdG8ganVzdCBwdXNoIG5ld1VzZXIgb250byBnYW1lRGF0YS51c2VycywgYnV0XHJcbiAgLy8gdGhhdCBtZXNzZXMgdXAgdGhlIGFycmF5IEkgZ3Vlc3NcclxuICB2YXIgdXNlcnNBcnJheSA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZ2FtZURhdGEudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChnYW1lRGF0YS51c2Vyc1tpXSkge1xyXG4gICAgICB1c2Vyc0FycmF5LnB1c2goZ2FtZURhdGEudXNlcnNbaV0pO1xyXG4gICAgfVxyXG4gIH1cclxuICB1c2Vyc0FycmF5LnB1c2gobmV3VXNlcik7XHJcbiAgZ2FtZURhdGEudXNlcnMgPSB1c2Vyc0FycmF5O1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IGdhbWVEYXRhU25hcHNob3QucmVmKCk7XHJcbiAgZ2FtZURhdGFSZWYuc2V0KGdhbWVEYXRhKTtcclxuICBjb25zb2xlLmxvZygnam9pbmluZyBnYW1lICcgKyBnYW1lRGF0YS5pZCk7XHJcbiAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbiAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgZ2FtZS4gU28gdHJpbSBvdXQgdGhlIFxyXG4gIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbiAgaWYgKHVzZXJzQXJyYXkubGVuZ3RoID09IHRoaXMuTUFYX1VTRVJTX1BFUl9HQU1FKSB7XHJcbiAgICBzZXRHYW1lVG9GdWxsLmNhbGwodGhpcywgZ2FtZURhdGEuaWQpO1xyXG4gIH1cclxuICB2YXIgcGVlcklkc0FycmF5ID0gW107XHJcbiAgZm9yICh2YXIgaiA9IDA7IGogPCBnYW1lRGF0YS51c2Vycy5sZW5ndGg7IGorKykge1xyXG4gICAgcGVlcklkc0FycmF5LnB1c2goZ2FtZURhdGEudXNlcnNbal0ucGVlcklkKTtcclxuICB9XHJcbiAgY29ubmVjdFRvVXNlcnNDYWxsYmFjayhwZWVySWRzQXJyYXkpO1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJQaW5nLmNhbGwodGhpcyk7XHJcbiAgam9pbmVkR2FtZUNhbGxiYWNrKGdhbWVEYXRhLCBmYWxzZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEdhbWVUb0Z1bGwoZ2FtZUlkKSB7XHJcbiAgdGhpcy5yZW1vdmVHYW1lRnJvbUF2YWlsYWJsZUdhbWVzKGdhbWVJZCk7XHJcbiAgdGhpcy5hZGRHYW1lVG9GdWxsR2FtZXNMaXN0KGdhbWVJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZUdhbWVGcm9tQXZhaWxhYmxlR2FtZXMoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX0dBTUVTX0xPQ0FUSU9OKS5jaGlsZChnYW1lSWQpO1xyXG4gIGdhbWVEYXRhUmVmLnJlbW92ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRHYW1lVG9GdWxsR2FtZXNMaXN0KGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkZVTExfR0FNRVNfTE9DQVRJT04pLmNoaWxkKGdhbWVJZCk7XHJcbiAgZ2FtZURhdGFSZWYuc2V0KGdhbWVJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVHYW1lRnJvbUZ1bGxUb0F2YWlsYWJsZShnYW1lSWQpIHtcclxuICByZW1vdmVHYW1lRnJvbUZ1bGxHYW1lcy5jYWxsKHRoaXMsIGdhbWVJZCk7XHJcbiAgYWRkR2FtZVRvQXZhaWxhYmxlR2FtZXNMaXN0LmNhbGwodGhpcywgZ2FtZUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlR2FtZUZyb21GdWxsR2FtZXMoZ2FtZUlkKSB7XHJcbiAgdmFyIGdhbWVEYXRhUmVmID0gdGhpcy5nYW1lUmVmLmNoaWxkKHRoaXMuRlVMTF9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkR2FtZVRvQXZhaWxhYmxlR2FtZXNMaXN0KGdhbWVJZCkge1xyXG4gIHZhciBnYW1lRGF0YVJlZiA9IHRoaXMuZ2FtZVJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9HQU1FU19MT0NBVElPTikuY2hpbGQoZ2FtZUlkKTtcclxuICBnYW1lRGF0YVJlZi5zZXQoZ2FtZUlkKTtcclxufVxyXG5cclxuXHJcbi8vIC8vIHJldHVybnMgbnVsbCBpZiB0aGUgdXNlciB3YXNuJ3QgZm91bmQgaW4gdGhlIGdhbWVcclxuLy8gZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21HYW1lRGF0YShwZWVySWQsIGdhbWVEYXRhKSB7XHJcbi8vICAgLy8gaWYgc29tZXRoaW5nJ3Mgd3JvbmcsIGp1c3QgcmV0dXJuXHJcbi8vICAgaWYgKCFnYW1lRGF0YSB8fCAhZ2FtZURhdGEudXNlcnMpIHtcclxuLy8gICAgIHJldHVybiBudWxsO1xyXG4vLyAgIH1cclxuXHJcbi8vICAgLy8gVE9ETzogRmlyZWJhc2UgaGFzIGEgYmV0dGVyIHdheSBvZiBkb2luZyB0aGlzXHJcbi8vICAgdmFyIGZvdW5kUGVlciA9IGZhbHNlO1xyXG5cclxuLy8gICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuLy8gICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBnYW1lLiBTbyB0cmltIG91dCB0aGUgXHJcbi8vICAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuLy8gICBnYW1lRGF0YS51c2VycyA9IGdhbWVEYXRhLnVzZXJzLmNsZWFuKHVuZGVmaW5lZCk7XHJcblxyXG4vLyAgIHVzZXJzV2l0aG91dFBlZXIgPSBbXTtcclxuLy8gICBmb3IgKGkgPSAwOyBpIDwgZ2FtZURhdGEudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuLy8gICAgIGlmIChnYW1lRGF0YS51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbi8vICAgICAgIGZvdW5kUGVlciA9IHRydWU7XHJcbi8vICAgICB9IGVsc2Uge1xyXG4vLyAgICAgICB1c2Vyc1dpdGhvdXRQZWVyLnB1c2goZ2FtZURhdGEudXNlcnNbaV0pO1xyXG4vLyAgICAgfVxyXG4vLyAgIH1cclxuXHJcbi8vICAgaWYgKGZvdW5kUGVlcikge1xyXG4vLyAgICAgZ2FtZURhdGEudXNlcnMgPSB1c2Vyc1dpdGhvdXRQZWVyO1xyXG4vLyAgICAgcmV0dXJuIGdhbWVEYXRhO1xyXG4vLyAgIH0gZWxzZSB7XHJcbi8vICAgICByZXR1cm4gbnVsbDtcclxuLy8gICB9Il19
