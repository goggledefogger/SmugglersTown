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
    teamTownObject: {
      users: [],
      baseObject: {
        location: {
          lat: 36.151103,
          lng: -113.208565
        }
      },
      numItemsReturned: 0
    },
    teamCrushObject: {
      users: [],
      baseObject: {
        location: {
          lat: 36.151103,
          lng: -113.208565
        }
      },
      numItemsReturned: 0
    },
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

  // the <team_object> structures above will be of this form:
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
  this.matchmakerTown.joinOrCreateSession(this.username, this.peer.id, connectToAllNonHostUsers.bind(this), gameJoined.bind(this))
}

function gameJoined(sessionData, isNewGame) {
  this.gameId = sessionData.id;
  if (isNewGame) {
    // we're hosting the game ourself
    this.hostPeerId = this.peer.id;

    // first user is always on team town
    this.gameDataObject.teamTownObject.users = [{
      peerId: this.peer.id,
      username: this.username
    }];
    $('#team-town-text').css('background-color', 'yellow');
    $('#team-town-text').css('color', 'black');
  } else {
    // someone else is already the host
    this.hostPeerId = sessionData.hostPeerId;
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
    matchmakerTown.removePeerFromSession(this.gameId, this.peer.id);
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
  matchmakerTown.removePeerFromSession(gameId, otherUserPeerId);

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

  // The root of your session data.
  this.SESSION_LOCATION = firebaseBaseUrl;
  this.sessionRef = new Firebase(this.SESSION_LOCATION);

  this.AVAILABLE_SESSIONS_LOCATION = 'available_sessions';
  this.FULL_SESSIONS_LOCATION = 'full_sessions';
  this.ALL_SESSIONS_LOCATION = 'sessions';
  this.MAX_USERS_PER_SESSION = 4;
  this.SESSION_CLEANUP_TIMEOUT = 30 * 1000; // in milliseconds

  this.joinedSession = null;
  this.myWorker = null;

}

/**
 *  connect to a session
 */
MatchmakerTown.prototype.joinOrCreateSession = function(username, peerId, connectToUsersCallback, joinedSessionCallback) {
  var self = this;

  callAsyncCleanupInactiveSessions.call(this);
  console.log('trying to join session');
  initializeServerHelperWorker.call(this, window);
  var availableSessionsDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION);
  availableSessionsDataRef.once('value', function(data) {
    // only join a session if one isn't joined already
    if (self.joinedSession == null) {
      self.joinedSession = -1;
      if (data.val() === null) {
        // there are no available sessions, so create one
        var sessionData = createNewSessionData.call(self, username, peerId);
        createNewSessionInFirebase.call(self, username, peerId, sessionData);
        joinedSessionCallback(sessionData, true);
      } else {
        var jsonObj = data.val();
        var sessionId;

        // stupid javascript won't tell me how many session elements
        // are in the jsonObj, so count em up
        var numAvailableSessions = 0;
        for (var key in jsonObj) {
          numAvailableSessions++;
        }

        // iterate through the child sessions and try
        // to join each one
        var counter = 0;
        for (var key in jsonObj) {
          counter++;
          if (jsonObj.hasOwnProperty(key)) {
            sessionId = jsonObj[key];
            getSessionLastUpdateTime.call(self, sessionId, username, peerId, connectToUsersCallback, joinedSessionCallback, doneGettingUpdateTime.bind(self), counter == numAvailableSessions, self);
          }
        }
      }
    }
  });
}


/**
 *  remove a peer from the session
 */
function removePeerFromSession(sessionId, peerId) {
  var self = this;

  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.once('value', function(data) {
    if (!data.val()) {
      // something's wrong, probably the Firebase data was deleted
      return;
    }
    if (data.val().hostPeerId == this.peerId) {
      findNewHostPeerId.call(this, sessionId, peerId, switchToNewHost);
    }

    // Firebase weirdness: the users array can still have undefined elements
    // which represents users that have left the session. So trim out the 
    // undefined elements to see the actual array of current users
    var numUsersInSession = data.child('users').val().clean(undefined).length;
    data.child('users').forEach(function(childSnapshot) {
      // if we've found the ref that represents the given peer, remove it
      if (childSnapshot.val() && childSnapshot.val().peerId == this.peerId) {
        childSnapshot.ref().remove();
        // if this user was the last one in the session, now there are 0, 
        // so delete the session
        if (numUsersInSession == 1) {
          deleteSession.call(this, sessionId);
        } else {
          // if it was full, now it has one open slot, set it to available
          if (numUsersInSession == this.MAX_USERS_PER_SESSION) {
            moveSessionFromFullToAvailable.call(this, sessionId);
          }
        }
      }
    });
  });
}

function createNewSessionData(username, peerId) {
  var sessionId = createNewSessionId.call(this);
  return {
    id: sessionId,
    hostPeerId: peerId,
    users: [{
      peerId: peerId,
      username: username
    }]
  };
}


function doneGettingUpdateTime(lastUpdateTime, sessionId, isTheLastSession, username, peerId, connectToUsersCallback, joinedSessionCallback) {
  // if the session is still active join it
  if (lastUpdateTime) {
    if (!isTimeoutTooLong.call(this, lastUpdateTime)) {
      joinExistingSession.call(this, sessionId, username, peerId, connectToUsersCallback, joinedSessionCallback);
      return;
    } else {
      callAsyncCleanupInactiveSessions.call(this);
    }
  }
  // if we got here, and this is the last session, that means there are no available sessions
  // so create one
  if (isTheLastSession) {
    console.log('no available sessions found, only inactive ones, so creating a new one...');
    var sessionData = createNewSessionData.call(this, username, peerId);
    createNewSessionInFirebase.call(this, username, peerId, sessionData);
    joinedSessionCallback(sessionData, true);
  }
}

function getSessionLastUpdateTime(sessionId, username, peerId, connectToUsersCallback, joinedSessionCallback, doneGettingUpdateTimeCallback, isTheLastSession) {
  var self = this;
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).once('value', function(data) {
    if (data.val() && data.val().lastUpdateTime) {
      console.log('found update time: ' + data.val().lastUpdateTime)
      doneGettingUpdateTimeCallback(data.val().lastUpdateTime, sessionId, isTheLastSession, username, peerId, connectToUsersCallback, joinedSessionCallback, self);
    }
  });
}

function initializeServerPing() {
  setServerStatusAsStillActive.call(this);
  window.setInterval(setServerStatusAsStillActive.bind(this), 10000);
}

function initializeServerHelperWorker(windowObject) {
  if (typeof(windowObject.Worker) !== "undefined") {
    this.myWorker = new Worker("asyncmessager.js");
    this.myWorker.addEventListener('message', processMessageEvent.bind(this), false);
  } else {
    console.log("Sorry, your browser does not support Web Workers...");
  }
}

function callAsyncCleanupInactiveSessions() {
  // do it on a web worker thread
  if (this.myWorker) {
    this.myWorker.postMessage({
      cmd: 'cleanup_inactive_sessions'
    });
  }
}


function setServerStatusAsStillActive() {
  console.log('pinging server');
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(this.joinedSession).child('lastUpdateTime').set((new Date()).getTime());
}

function cleanupSessions() {
  var self = this;

  console.log('cleaning up inactive sessions');
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).once('value', function(dataSnapshot) {
    dataSnapshot.forEach(function(childSnapshot) {
      var shouldDeleteSession = false;
      var sessionData = childSnapshot.val();
      if (!sessionData) {
        shouldDeleteSession = true;
      }
      if (sessionData.users == null || sessionData.users.length == 0) {
        console.log('session has no users');
        shouldDeleteSession = true;
      }
      if (isTimeoutTooLong.call(self, sessionData.lastUpdateTime)) {
        console.log("session hasn't been updated since " + sessionData.lastUpdateTime);
        shouldDeleteSession = true;
      }

      if (shouldDeleteSession) {
        deleteSession.call(self, childSnapshot.name());
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
  return (currentTime - lastUpdateTime > this.SESSION_CLEANUP_TIMEOUT);
}

function processMessageEvent(event) {
  switch (event.data) {
    case 'cleanup_inactive_sessions':
      cleanupSessions.call(this);
      break;
    default:
      break;
  }
}


function findNewHostPeerId(sessionId, existingHostPeerId, callback) {
  var self = this;

  // reset the hostPeerId so it prevents the leaving host's browser
  // if it tries to switch again before this is done
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).child('hostPeerId').remove();

  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).once('value', function(data) {
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
        callback(sessionId, users[i].peerId);
      }
    }
    callback(sessionId, null);
  });
}

function switchToNewHost(sessionId, newHostPeerId) {
  if (!newHostPeerId) {
    return;
  }
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).child('hostPeerId').set(newHostPeerId);
}

function deleteSession(sessionId) {
  removeSessionFromAvailableSessions.call(this, sessionId);
  removeSessionFromFullSessions.call(this, sessionId);
  removeSession.call(this, sessionId);
}

function removeSession(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.remove();
}

function createNewSessionInFirebase(username, peerId, sessionData) {
  console.log('creating new session');
  var newSessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionData.id);
  newSessionDataRef.set(sessionData);
  var newAvailableSessionDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION).child(sessionData.id);
  newAvailableSessionDataRef.set(sessionData.id);
  this.joinedSession = sessionData.id;
  initializeServerPing.call(this);
}

function createNewSessionId() {
  // TODO: replace this with something that won't
  // accidentally have collisions
  return getRandomInRange(1, 10000000);
}

function joinExistingSession(sessionId, username, peerId, connectToUsersCallback, joinedSessionCallback) {
  // if a session has already been joined on another thread, don't join another one
  if (this.joinedSession && this.joinedSession >= 0) {
    return;
  }
  this.joinedSession = sessionId;
  asyncGetSessionData.call(this, sessionId, username, peerId, connectToUsersCallback.bind(this), joinedSessionCallback.bind(this), doneGettingSessionData.bind(this));
};

function asyncGetSessionData(sessionId, username, peerId, connectToUsersCallback, joinedSessionCallback, doneGettingSessionDataCallback) {
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.once('value', function(data) {
    doneGettingSessionDataCallback(data, username, peerId, connectToUsersCallback, joinedSessionCallback);
  });
}

function doneGettingSessionData(sessionDataSnapshot, username, peerId, connectToUsersCallback, joinedSessionCallback) {
  var sessionData = sessionDataSnapshot.val();
  var newUser = {
    peerId: peerId,
    username: username
  };
  // weirdness: i want to just push newUser onto sessionData.users, but
  // that messes up the array I guess
  var usersArray = [];
  for (var i = 0; i < sessionData.users.length; i++) {
    if (sessionData.users[i]) {
      usersArray.push(sessionData.users[i]);
    }
  }
  usersArray.push(newUser);
  sessionData.users = usersArray;
  var sessionDataRef = sessionDataSnapshot.ref();
  sessionDataRef.set(sessionData);
  console.log('joining session ' + sessionData.id);
  // Firebase weirdness: the users array can still have undefined elements
  // which represents users that have left the session. So trim out the 
  // undefined elements to see the actual array of current users
  if (usersArray.length == this.MAX_USERS_PER_SESSION) {
    setSessionToFull.call(this, sessionData.id);
  }
  var peerIdsArray = [];
  for (var j = 0; j < sessionData.users.length; j++) {
    peerIdsArray.push(sessionData.users[j].peerId);
  }
  connectToUsersCallback(peerIdsArray);
  initializeServerPing.call(this);
  joinedSessionCallback(sessionData, false);
}

function setSessionToFull(sessionId) {
  this.removeSessionFromAvailableSessions(sessionId);
  this.addSessionToFullSessionsList(sessionId);
}

function removeSessionFromAvailableSessions(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.remove();
}

function addSessionToFullSessionsList(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.FULL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.set(sessionId);
}

function moveSessionFromFullToAvailable(sessionId) {
  removeSessionFromFullSessions.call(this, sessionId);
  addSessionToAvailableSessionsList.call(this, sessionId);
}

function removeSessionFromFullSessions(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.FULL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.remove();
}

function addSessionToAvailableSessionsList(sessionId) {
  var sessionDataRef = this.sessionRef.child(this.AVAILABLE_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.set(sessionId);
}


// // returns null if the user wasn't found in the session
// function removeUserFromSessionData(peerId, sessionData) {
//   // if something's wrong, just return
//   if (!sessionData || !sessionData.users) {
//     return null;
//   }

//   // TODO: Firebase has a better way of doing this
//   var foundPeer = false;

//   // Firebase weirdness: the users array can still have undefined elements
//   // which represents users that have left the session. So trim out the 
//   // undefined elements to see the actual array of current users
//   sessionData.users = sessionData.users.clean(undefined);

//   usersWithoutPeer = [];
//   for (i = 0; i < sessionData.users.length; i++) {
//     if (sessionData.users[i].peerId == peerId) {
//       foundPeer = true;
//     } else {
//       usersWithoutPeer.push(sessionData.users[i]);
//     }
//   }

//   if (foundPeer) {
//     sessionData.users = usersWithoutPeer;
//     return sessionData;
//   } else {
//     return null;
//   }
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvaW5kZXguanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9tYXBnYW1lLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWF0Y2htYWtlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BrREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIFNtdWdnbGVyc1Rvd24gPSByZXF1aXJlKCcuL21hcGdhbWUuanMnKTtcclxuXHJcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGdhbWUgPSBuZXcgU211Z2dsZXJzVG93bignaHR0cHM6Ly9zbXVnZ2xlcnN0b3duLmZpcmViYXNlaW8uY29tLycpO1xyXG59KTsiLCIvKiBZT1VSIFNNVUdHTEVSIE1JU1NJT04sIElGIFlPVSBDSE9PU0UgVE8gQUNDRVBULCBJUyBUTyBKT0lOIFRFQU1cclxuICogVE9XTiBBTkQgVFJZIFRPIERFRkVBVCBURUFNIENSVVNILiAgQU5EIFlPVSBNVVNUIEFDQ0VQVC4uLlxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgbWFwZ2FtZS5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZGVwc1xyXG4gKi9cclxuLy92YXIgaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xyXG4vL3ZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XHJcbnZhciBNYXRjaG1ha2VyVG93biA9IHJlcXVpcmUoJy4vbWF0Y2htYWtlci5qcycpO1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gU211Z2dsZXJzVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFNtdWdnbGVyc1Rvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcblxyXG4gIC8vIGJpbmQgcHVibGljIGNhbGxiYWNrIGZ1bmN0aW9uc1xyXG4gIHRoaXMuaW5pdGlhbGl6ZSA9IHRoaXMuaW5pdGlhbGl6ZS5iaW5kKHRoaXMpO1xyXG4gIHRoaXMuZnJhbWUgPSB0aGlzLmZyYW1lLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5vbktleURvd24gPSB0aGlzLm9uS2V5RG93bi5iaW5kKHRoaXMpO1xyXG4gIHRoaXMub25LZXlVcCA9IHRoaXMub25LZXlVcC5iaW5kKHRoaXMpO1xyXG5cclxuICB0aGlzLmtlZXBBbGl2ZVBhcmFtTmFtZSA9ICdrZWVwYWxpdmUnO1xyXG4gIHRoaXMucXMgPSBuZXcgUXVlcnlTdHJpbmcoKTtcclxuXHJcbiAgdGhpcy5tYXRjaG1ha2VyVG93biA9IG5ldyBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpO1xyXG5cclxuICB0aGlzLm1hcCA9IG51bGw7IC8vIHRoZSBtYXAgY2FudmFzIGZyb20gdGhlIEdvb2dsZSBNYXBzIHYzIGphdmFzY3JpcHQgQVBJXHJcbiAgdGhpcy5tYXBab29tTGV2ZWwgPSAxODtcclxuICB0aGlzLm1hcERhdGEgPSBudWxsOyAvLyB0aGUgbGV2ZWwgZGF0YSBmb3IgdGhpcyBtYXAgKGJhc2UgbG9jYXRpb25zKVxyXG5cclxuICB0aGlzLml0ZW1NYXBPYmplY3QgPSBudWxsO1xyXG4gIC8vIHRoZSBpdGVtTWFwT2JqZWN0IHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIGxvY2F0aW9uOiA8Z29vZ2xlX21hcHNfTGF0TG5nX29iamVjdD4sXHJcbiAgLy8gICBtYXJrZXI6IDxnb29nbGVfbWFwc19NYXJrZXJfb2JqZWN0PlxyXG4gIC8vIH1cclxuXHJcbiAgLy8gZGVmYXVsdCB0byB0aGUgZ3JhbmQgY2FueW9uLCBidXQgdGhpcyB3aWxsIGJlIGxvYWRlZCBmcm9tIGEgbWFwIGZpbGVcclxuICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoMzYuMTUxMTAzLCAtMTEzLjIwODU2NSk7XHJcblxyXG5cclxuXHJcbiAgLy8gZm9yIHRpbWUtYmFzZWQgZ2FtZSBsb29wXHJcbiAgdGhpcy5ub3c7XHJcbiAgdGhpcy5kdCA9IDA7XHJcbiAgdGhpcy5sYXN0ID0gdGltZXN0YW1wLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5zdGVwID0gMSAvIDYwO1xyXG5cclxuICAvLyB1c2VyIGRhdGFcclxuICB0aGlzLnVzZXJuYW1lID0gbnVsbDtcclxuXHJcbiAgLy8gZ2FtZSBob3N0aW5nIGRhdGFcclxuICB0aGlzLmdhbWVJZCA9IG51bGw7XHJcbiAgdGhpcy5ob3N0UGVlcklkID0gbnVsbDtcclxuXHJcbiAgLy8gY2FyIHByb3BlcnRpZXNcclxuICB0aGlzLnJvdGF0aW9uID0gMDtcclxuICB0aGlzLmRlY2VsZXJhdGlvbiA9IDEuMTtcclxuICB0aGlzLk1BWF9OT1JNQUxfU1BFRUQgPSAxODtcclxuICB0aGlzLk1BWF9CT09TVF9TUEVFRCA9IDQwO1xyXG4gIHRoaXMuQk9PU1RfRkFDVE9SID0gMS4wNztcclxuICB0aGlzLkJPT1NUX0NPTlNVTVBUSU9OX1JBVEUgPSAwLjU7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX05PUk1BTF9TUEVFRDtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJyc7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzID0gJyc7XHJcbiAgdGhpcy5sYXRpdHVkZVNwZWVkRmFjdG9yID0gMTAwMDAwMDtcclxuICB0aGlzLmxvbmdpdHVkZVNwZWVkRmFjdG9yID0gNTAwMDAwO1xyXG5cclxuICAvLyBjb2xsaXNpb24gZW5naW5lIGluZm9cclxuICB0aGlzLmNhclRvSXRlbUNvbGxpc2lvbkRpc3RhbmNlID0gMjA7XHJcbiAgdGhpcy5jYXJUb0Jhc2VDb2xsaXNpb25EaXN0YW5jZSA9IDQzO1xyXG5cclxuICAvLyBtYXAgZGF0YVxyXG4gIHRoaXMubWFwRGF0YUxvYWRlZCA9IGZhbHNlO1xyXG4gIHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zID0gMC4wMDg7IC8vIGluIGxhdGl0dWRlIGRlZ3JlZXNcclxuICB0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgPSAwLjAwODsgLy8gaW4gbG9uZ2l0dWRlIGRlZ3JlZXNcclxuICB0aGlzLm1pbkl0ZW1EaXN0YW5jZUZyb21CYXNlID0gMzAwO1xyXG5cclxuICAvLyB0aGVzZSBtYXAgb2JqZWN0cyB3aWxsIGJlIG9mIHRoZSBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIGxvY2F0aW9uOiA8Z29vZ2xlX21hcHNfTGF0TG5nX29iamVjdD4sXHJcbiAgLy8gICBtYXJrZXI6IDxnb29nbGVfbWFwc19NYXJrZXJfb2JqZWN0PlxyXG4gIC8vIH1cclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCA9IHtcclxuICAgIGxvY2F0aW9uOiB0aGlzLm1hcENlbnRlcixcclxuICAgIG1hcmtlcjogbnVsbFxyXG4gIH1cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgPSBudWxsO1xyXG4gIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdCA9IHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG5cclxuICAvLyBnYW1lcGxheVxyXG5cclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0ID0ge1xyXG4gICAgdGVhbVRvd25PYmplY3Q6IHtcclxuICAgICAgdXNlcnM6IFtdLFxyXG4gICAgICBiYXNlT2JqZWN0OiB7XHJcbiAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgIGxhdDogMzYuMTUxMTAzLFxyXG4gICAgICAgICAgbG5nOiAtMTEzLjIwODU2NVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gICAgfSxcclxuICAgIHRlYW1DcnVzaE9iamVjdDoge1xyXG4gICAgICB1c2VyczogW10sXHJcbiAgICAgIGJhc2VPYmplY3Q6IHtcclxuICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgICBsbmc6IC0xMTMuMjA4NTY1XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgICB9LFxyXG4gICAgcGVlcklkT2ZDYXJXaXRoSXRlbTogbnVsbCxcclxuICAgIGluaXRpYWxMb2NhdGlvbjoge1xyXG4gICAgICBsYXQ6IHRoaXMubWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICBsbmc6IHRoaXMubWFwQ2VudGVyLmxuZygpXHJcbiAgICB9XHJcbiAgfTtcclxuICAvLyB0aGlzIHdpbGwgYmUgb2YgdGhlIGZvcm1cclxuICAvLyB7XHJcbiAgLy8gICB0ZWFtVG93bk9iamVjdDogPHRlYW1fb2JqZWN0PixcclxuICAvLyAgIHRlYW1DcnVzaE9iamVjdDogPHRlYW1fb2JqZWN0PixcclxuICAvLyAgIHBlZXJJZE9mQ2FyV2l0aEl0ZW06IG51bGwsXHJcbiAgLy8gICBpbml0aWFsTG9jYXRpb246IHtcclxuICAvLyAgICAgbGF0OiAzNSxcclxuICAvLyAgICAgbG5nOiAtMTMyXHJcbiAgLy8gfVxyXG4gIC8vICAgaXRlbU9iamVjdDoge1xyXG4gIC8vICAgICBpZDogNTc2LFxyXG4gIC8vICAgICBsb2NhdGlvbjoge1xyXG4gIC8vICAgICAgIGxhdDogMzQsXHJcbiAgLy8gICAgICAgbG5nOiAtMTMzXHJcbiAgLy8gICAgIH1cclxuICAvLyAgIH1cclxuICAvLyB9XHJcblxyXG4gIC8vIHRoZSA8dGVhbV9vYmplY3Q+IHN0cnVjdHVyZXMgYWJvdmUgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgdXNlcnM6IFt7XHJcbiAgLy8gICAgIHBlZXJJZDogMTIzNDU2Nzg5LFxyXG4gIC8vICAgICB1c2VybmFtZTogJ3JveSdcclxuICAvLyAgIH0sIHtcclxuICAvLyAgICAgcGVlcklkOiA5ODc2NTQzMjEsXHJcbiAgLy8gICAgIHVzZXJuYW1lOiAnaGFtJ1xyXG4gIC8vICAgfV0sXHJcbiAgLy8gICBiYXNlT2JqZWN0OiB7XHJcbiAgLy8gICAgIGxvY2F0aW9uOiB7XHJcbiAgLy8gICAgICAgbGF0OiAzNCxcclxuICAvLyAgICAgICBsbmc6IC0xMzNcclxuICAvLyAgICAgfVxyXG4gIC8vICAgfSxcclxuICAvLyAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICAvLyB9XHJcblxyXG5cclxuXHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICAvLyBzZXQgdGhlIGluaXRpYWwgZGVzdGluYXRpb24gdG8gd2hhdGV2ZXIsIGl0IHdpbGwgYmUgcmVzZXQgXHJcbiAgLy8gd2hlbiBhbiBpdGVtIGlzIGZpcnN0IHBsYWNlZFxyXG4gIHRoaXMuZGVzdGluYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKDQ1LjQ4OTM5MSwgLTEyMi42NDc1ODYpO1xyXG4gIHRoaXMudGltZURlbGF5QmV0d2VlblRyYW5zZmVycyA9IDEwMDA7IC8vIGluIG1zXHJcbiAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSBudWxsO1xyXG5cclxuICAvLyBvYmplY3Qgb2YgdGhlIG90aGVyIHVzZXJzXHJcbiAgdGhpcy5vdGhlclVzZXJzID0ge307XHJcbiAgLy8gdGhlIG90aGVyVXNlcnMgZGF0YSB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICAxMjM0NTY3ODk6IHtcclxuICAvLyAgICAgcGVlcklkOiAxMjM0Njc4OSxcclxuICAvLyAgICAgdXNlcm5hbWU6IGhlbGxvcm95LFxyXG4gIC8vICAgICBjYXI6IHtcclxuICAvLyAgICAgICBsb2NhdGlvbjogPGxvY2F0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgICAgbWFya2VyOiA8bWFya2VyX29iamVjdD5cclxuICAvLyAgICAgfSxcclxuICAvLyAgICAgcGVlckpzQ29ubmVjdGlvbjogPHBlZXJKc0Nvbm5lY3Rpb25fb2JqZWN0PixcclxuICAvLyAgICAgbGFzdFVwZGF0ZVRpbWU6IDx0aW1lX29iamVjdD4sXHJcbiAgLy8gICAgIG51bUl0ZW1zOiAwLFxyXG4gIC8vICAgICBoYXNCZWVuSW5pdGlhbGl6ZWQ6IHRydWVcclxuICAvLyAgIH0sXHJcbiAgLy8gICA5ODc2NTQzMjE6IHtcclxuICAvLyAgICAgcGVlcklkOiA5ODc2NTQzMjEsXHJcbiAgLy8gICAgIHVzZXJuYW1lOiB0b3dudG93bjkwMDAsXHJcbiAgLy8gICAgIGNhcjoge1xyXG4gIC8vICAgICAgIGxvY2F0aW9uOiA8bG9jYXRpb25fb2JqZWN0PixcclxuICAvLyAgICAgICBtYXJrZXI6IDxtYXJrZXJfb2JqZWN0PlxyXG4gIC8vICAgICB9LFxyXG4gIC8vICAgICBwZWVySnNDb25uZWN0aW9uOiA8cGVlckpzQ29ubmVjdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICBsYXN0VXBkYXRlVGltZTogPHRpbWVfb2JqZWN0PixcclxuICAvLyAgICAgbnVtSXRlbXM6IDVcclxuICAvLyAgIH1cclxuICAvLyB9XHJcblxyXG4gIC8vIGltYWdlc1xyXG4gIHRoaXMuaXRlbUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvc21va2luZ190b2lsZXRfc21hbGwuZ2lmJ1xyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoVXNlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvY3J1c2hfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbVRvd25Vc2VyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtVG93bk90aGVyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy90ZWFtX3Rvd25fb3RoZXJfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbUNydXNoT3RoZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3RlYW1fY3J1c2hfb3RoZXJfY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvZm9ydC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZUljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvb3Bwb25lbnRfZm9ydC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2ZvcnRfdHJhbnNwYXJlbnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvb3Bwb25lbnRfZm9ydF90cmFuc3BhcmVudC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG5cclxuICAvLyBwZWVyIEpTIGNvbm5lY3Rpb24gKGZvciBtdWx0aXBsYXllciB3ZWJSVEMpXHJcbiAgdGhpcy5wZWVyID0gbmV3IFBlZXIoe1xyXG4gICAga2V5OiAnajNtMHF0ZGRlc2hwazN4cidcclxuICB9KTtcclxuICB0aGlzLnBlZXIub24oJ29wZW4nLCBmdW5jdGlvbihpZCkge1xyXG4gICAgY29uc29sZS5sb2coJ015IHBlZXIgSUQgaXM6ICcgKyBpZCk7XHJcbiAgICAkKCcjcGVlci1pZCcpLnRleHQoaWQpO1xyXG4gICAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd3YWl0aW5nIGZvciBhIHNtdWdnbGVyIHRvIGJhdHRsZS4uLicpO1xyXG4gIH0pO1xyXG4gIHRoaXMucGVlci5vbignY29ubmVjdGlvbicsIGNvbm5lY3RlZFRvUGVlci5iaW5kKHRoaXMpKTtcclxuICB0aGlzLkFDVElWRV9DT05ORUNUSU9OX1RJTUVPVVRfSU5fU0VDT05EUyA9IDMwICogMTAwMDtcclxuXHJcblxyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZERvbUxpc3RlbmVyKHdpbmRvdywgJ2xvYWQnLCB0aGlzLmluaXRpYWxpemUpO1xyXG59XHJcblxyXG4vKipcclxuICogIGluaXRpYWxpemUgdGhlIGdhbWVcclxuICovXHJcblNtdWdnbGVyc1Rvd24ucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHRoaXMudXNlcm5hbWUgPSBwcm9tcHQoJ0Nob29zZSB5b3VyIFNtdWdnbGVyIE5hbWU6JywgJ05pbmphIFJveScpO1xyXG4gIGNyZWF0ZU1hcE9uUGFnZS5jYWxsKHRoaXMpO1xyXG4gIGxvYWRNYXBEYXRhLmNhbGwodGhpcywgbWFwSXNSZWFkeSk7XHJcblxyXG4gIC8vIHRoZXNlIGFyZSBzZXQgdG8gdHJ1ZSB3aGVuIGtleXMgYXJlIGJlaW5nIHByZXNzZWRcclxuICB0aGlzLnJpZ2h0RG93biA9IGZhbHNlO1xyXG4gIHRoaXMubGVmdERvd24gPSBmYWxzZTtcclxuICB0aGlzLnVwRG93biA9IGZhbHNlO1xyXG4gIHRoaXMuZG93bkRvd24gPSBmYWxzZTtcclxuICB0aGlzLmN0cmxEb3duID0gZmFsc2U7XHJcblxyXG4gIHRoaXMuc3BlZWQgPSAwO1xyXG4gIHRoaXMucm90YXRpb24gPSAwO1xyXG4gIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gMDtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJyc7XHJcblxyXG4gIC8vdHJ5RmluZGluZ0xvY2F0aW9uKCk7XHJcblxyXG5cclxuICBiaW5kS2V5QW5kQnV0dG9uRXZlbnRzLmNhbGwodGhpcyk7XHJcblxyXG4gIGluaXRpYWxpemVCb29zdEJhci5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBzdGFydCB0aGUgZ2FtZSBsb29wXHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuZnJhbWUpO1xyXG59XHJcblxyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5mcmFtZSA9IGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMubm93ID0gdGltZXN0YW1wLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5kdCA9IHRoaXMuZHQgKyBNYXRoLm1pbigxLCAodGhpcy5ub3cgLSB0aGlzLmxhc3QpIC8gMTAwMCk7XHJcbiAgd2hpbGUgKHRoaXMuZHQgPiB0aGlzLnN0ZXApIHtcclxuICAgIHRoaXMuZHQgPSB0aGlzLmR0IC0gdGhpcy5zdGVwO1xyXG4gICAgdXBkYXRlLmNhbGwodGhpcywgdGhpcy5zdGVwKTtcclxuICB9XHJcbiAgcmVuZGVyLmNhbGwodGhpcywgdGhpcy5kdCk7XHJcbiAgdGhpcy5sYXN0ID0gdGhpcy5ub3c7XHJcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMuZnJhbWUpO1xyXG59XHJcblxyXG4vLyBrZXkgZXZlbnRzXHJcblNtdWdnbGVyc1Rvd24ucHJvdG90eXBlLm9uS2V5RG93biA9IGZ1bmN0aW9uKGV2dCkge1xyXG4gIGlmIChldnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgdGhpcy5yaWdodERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzcpIHtcclxuICAgIHRoaXMubGVmdERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzgpIHtcclxuICAgIHRoaXMudXBEb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDQwKSB7XHJcbiAgICB0aGlzLmRvd25Eb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDE3KSB7XHJcbiAgICB0aGlzLmN0cmxEb3duID0gdHJ1ZTtcclxuICB9XHJcbn1cclxuXHJcblNtdWdnbGVyc1Rvd24ucHJvdG90eXBlLm9uS2V5VXAgPSBmdW5jdGlvbihldnQpIHtcclxuICBpZiAoZXZ0LmtleUNvZGUgPT0gMzkpIHtcclxuICAgIHRoaXMucmlnaHREb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgdGhpcy5sZWZ0RG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzgpIHtcclxuICAgIHRoaXMudXBEb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSA0MCkge1xyXG4gICAgdGhpcy5kb3duRG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMTcpIHtcclxuICAgIHRoaXMuY3RybERvd24gPSBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplQm9vc3RCYXIoKSB7XHJcbiAgJChmdW5jdGlvbigpIHtcclxuICAgICQoXCIjYm9vc3QtYmFyXCIpLnByb2dyZXNzYmFyKHtcclxuICAgICAgdmFsdWU6IDEwMFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1hcElzUmVhZHkoKSB7XHJcbiAgdGhpcy5tYXRjaG1ha2VyVG93bi5qb2luT3JDcmVhdGVTZXNzaW9uKHRoaXMudXNlcm5hbWUsIHRoaXMucGVlci5pZCwgY29ubmVjdFRvQWxsTm9uSG9zdFVzZXJzLmJpbmQodGhpcyksIGdhbWVKb2luZWQuYmluZCh0aGlzKSlcclxufVxyXG5cclxuZnVuY3Rpb24gZ2FtZUpvaW5lZChzZXNzaW9uRGF0YSwgaXNOZXdHYW1lKSB7XHJcbiAgdGhpcy5nYW1lSWQgPSBzZXNzaW9uRGF0YS5pZDtcclxuICBpZiAoaXNOZXdHYW1lKSB7XHJcbiAgICAvLyB3ZSdyZSBob3N0aW5nIHRoZSBnYW1lIG91cnNlbGZcclxuICAgIHRoaXMuaG9zdFBlZXJJZCA9IHRoaXMucGVlci5pZDtcclxuXHJcbiAgICAvLyBmaXJzdCB1c2VyIGlzIGFsd2F5cyBvbiB0ZWFtIHRvd25cclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMgPSBbe1xyXG4gICAgICBwZWVySWQ6IHRoaXMucGVlci5pZCxcclxuICAgICAgdXNlcm5hbWU6IHRoaXMudXNlcm5hbWVcclxuICAgIH1dO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBzb21lb25lIGVsc2UgaXMgYWxyZWFkeSB0aGUgaG9zdFxyXG4gICAgdGhpcy5ob3N0UGVlcklkID0gc2Vzc2lvbkRhdGEuaG9zdFBlZXJJZDtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSS5jYWxsKHRoaXMpO1xyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbiAgdXBkYXRlQ2FySWNvbnMuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWVzSW5VSSgpIHtcclxuICB2YXIgdGVhbVRvd25KcXVlcnlFbGVtID0gJCgnI3RlYW0tdG93bi11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVG93bkpxdWVyeUVsZW0sIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpO1xyXG4gIHZhciB0ZWFtQ3J1c2hKcXVlcnlFbGVtID0gJCgnI3RlYW0tY3J1c2gtdXNlcm5hbWVzJyk7XHJcbiAgdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbUNydXNoSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0sIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICAvLyBjbGVhciB0aGUgY3VycmVudCBsaXN0IG9mIHVzZXJuYW1lc1xyXG4gIHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtLmVtcHR5KCk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VyT2JqZWN0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbmV3SnF1ZXJ5RWxlbSA9ICQoJC5wYXJzZUhUTUwoXHJcbiAgICAgICc8bGkgaWQ9XCJ1c2VybmFtZS0nICtcclxuICAgICAgdXNlck9iamVjdHNBcnJheVtpXS5wZWVySWQgK1xyXG4gICAgICAnXCI+JyArIHVzZXJPYmplY3RzQXJyYXlbaV0udXNlcm5hbWUgKyAnPC9saT4nXHJcbiAgICApKTtcclxuICAgICQodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0pLmFwcGVuZChuZXdKcXVlcnlFbGVtKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFjdGl2YXRlVGVhbUNydXNoSW5VSSgpIHtcclxuICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcclxuICB2YXIgdGVhbUNydXNoU2NvcmUgPSAwO1xyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKSB7XHJcbiAgICB0ZWFtQ3J1c2hTY29yZSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQ7XHJcbiAgfVxyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoU2NvcmUpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvQWxsTm9uSG9zdFVzZXJzKG5vbkhvc3RQZWVySWRzKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub25Ib3N0UGVlcklkcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG5vbkhvc3RQZWVySWRzW2ldICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICBjb25uZWN0VG9QZWVyLmNhbGwodGhpcywgbm9uSG9zdFBlZXJJZHNbaV0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYmluZEtleUFuZEJ1dHRvbkV2ZW50cygpIHtcclxuICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCkge1xyXG4gICAgcmVzaXplTWFwVG9GaXQuY2FsbCh0aGlzKTtcclxuICB9KTtcclxuXHJcbiAgJChkb2N1bWVudCkua2V5ZG93bih0aGlzLm9uS2V5RG93bik7XHJcbiAgJChkb2N1bWVudCkua2V5dXAodGhpcy5vbktleVVwKTtcclxuICAkKCcjY29ubmVjdC1idXR0b24nKS5jbGljayhmdW5jdGlvbihldnQpIHtcclxuICAgIHZhciBwZWVySWQgPSAkKCcjcGVlci1pZC10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBjb25zb2xlLmxvZygncGVlciBpZCBjb25uZWN0aW5nOiAnICsgcGVlcklkKTtcclxuICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBwZWVySWQpO1xyXG4gIH0pO1xyXG4gICQoJyNzZXQtY2VudGVyLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHNlYXJjaFRlcm0gPSAkKCcjbWFwLWNlbnRlci10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBpZiAoIXNlYXJjaFRlcm0pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgY2VudGVyIHRvOiAnICsgc2VhcmNoVGVybSk7XHJcbiAgICBzZWFyY2hBbmRDZW50ZXJNYXAuY2FsbCh0aGlzLCBzZWFyY2hUZXJtKTtcclxuICAgIGJyb2FkY2FzdE5ld0xvY2F0aW9uLmNhbGwodGhpcywgdGhpcy5tYXBDZW50ZXIpO1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG4gIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGRpc2Nvbm5lY3RGcm9tR2FtZTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzY29ubmVjdEZyb21HYW1lKCkge1xyXG4gIGlmICh0aGlzLnBlZXIgJiYgdGhpcy5wZWVyLmlkICYmIHRoaXMuZ2FtZUlkKSB7XHJcbiAgICBtYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbVNlc3Npb24odGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVNYXBPblBhZ2UoKSB7XHJcbiAgdmFyIG1hcE9wdGlvbnMgPSB7XHJcbiAgICB6b29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIGNlbnRlcjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBrZXlib2FyZFNob3J0Y3V0czogZmFsc2UsXHJcbiAgICBtYXBUeXBlSWQ6IGdvb2dsZS5tYXBzLk1hcFR5cGVJZC5TQVRFTExJVEUsXHJcbiAgICBkaXNhYmxlRGVmYXVsdFVJOiB0cnVlLFxyXG4gICAgbWluWm9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBtYXhab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIHNjcm9sbHdoZWVsOiBmYWxzZSxcclxuICAgIGRpc2FibGVEb3VibGVDbGlja1pvb206IHRydWUsXHJcbiAgICBkcmFnZ2FibGU6IGZhbHNlLFxyXG4gIH1cclxuXHJcbiAgdGhpcy5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtY2FudmFzJyksIG1hcE9wdGlvbnMpO1xyXG5cclxuICAvLyBub3QgbmVjZXNzYXJ5LCBqdXN0IHdhbnQgdG8gYWxsb3cgdGhlIHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCAnY2xpY2snLCBmdW5jdGlvbihlKSB7XHJcbiAgICBjb250ZXh0bWVudTogdHJ1ZVxyXG4gIH0pO1xyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcInJpZ2h0Y2xpY2tcIiwgdGhpcy5zaG93Q29udGV4dE1lbnUpO1xyXG5cclxuICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNpemVNYXBUb0ZpdCgpIHtcclxuICAkKCdib2R5JykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtIDIpO1xyXG4gIHZhciBtYWluSGVpZ2h0ID0gJCgnYm9keScpLmhlaWdodCgpO1xyXG4gIHZhciBjb250ZW50SGVpZ2h0ID1cclxuICAgICQoJyNoZWFkZXInKS5vdXRlckhlaWdodCgpICtcclxuICAgICQoJyNmb290ZXInKS5vdXRlckhlaWdodCgpO1xyXG4gIHZhciBoID0gbWFpbkhlaWdodCAtIGNvbnRlbnRIZWlnaHQ7XHJcbiAgJCgnI21hcC1ib2R5JykuaGVpZ2h0KGgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWFyY2hBbmRDZW50ZXJNYXAoc2VhcmNoVGVybSkge1xyXG4gIHZhciBwYXJ0cyA9IHNlYXJjaFRlcm0uc3BsaXQoJywnKTtcclxuICBpZiAoIXBhcnRzKSB7XHJcbiAgICAvLyBiYWQgc2VhcmNoIGlucHV0LCBtdXN0IGJlIGluIGxhdCxsbmcgZm9ybVxyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgbGF0U3RyaW5nID0gcGFydHNbMF07XHJcbiAgdmFyIGxuZ1N0cmluZyA9IHBhcnRzWzFdO1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0U3RyaW5nLCBsbmdTdHJpbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkTWFwRGF0YShtYXBJc1JlYWR5Q2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgY29uc29sZS5sb2coJ2xvYWRpbmcgbWFwIGRhdGEnKTtcclxuXHJcbiAgLy8gVE9ETzogXHJcbiAgLy8gdG8gcmVhZCBzdGF0aWMgZmlsZXMgaW5cclxuICAvLyB5b3UgbmVlZCB0byBwYXNzIFwiLXQgYnJmc1wiIHRvIGJyb3dzZXJpZnlcclxuICAvLyBidXQgaXQncyBjb29sIGNvcyB5b3UgY2FuIGlubGluZSBiYXNlNjQgZW5jb2RlZCBpbWFnZXMgb3IgdXRmOCBodG1sIHN0cmluZ3NcclxuICAvLyQuZ2V0SlNPTihcIm1hcHMvZ3JhbmRjYW55b24uanNvblwiLCBmdW5jdGlvbihqc29uKSB7XHJcbiAgJC5nZXRKU09OKFwibWFwcy9wb3J0bGFuZC5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAgIGNvbnNvbGUubG9nKCdtYXAgZGF0YSBsb2FkZWQnKTtcclxuICAgIHNlbGYubWFwRGF0YSA9IGpzb247XHJcbiAgICBzZWxmLm1hcERhdGFMb2FkZWQgPSB0cnVlO1xyXG4gICAgc2VsZi5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHNlbGYubWFwRGF0YS5tYXAuY2VudGVyTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubWFwLnNldENlbnRlcihzZWxmLm1hcENlbnRlcik7XHJcbiAgICBzZWxmLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgICAgbGF0OiBzZWxmLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiBzZWxmLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfTtcclxuXHJcbiAgICBjcmVhdGVUZWFtVG93bkJhc2UuY2FsbChzZWxmLCBzZWxmLm1hcERhdGEubWFwLnRlYW1Ub3duQmFzZUxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBjcmVhdGVUZWFtQ3J1c2hCYXNlLmNhbGwoc2VsZiwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBzZWxmLm15VGVhbUJhc2VNYXBPYmplY3QgPSBzZWxmLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwoc2VsZik7XHJcbiAgICBtYXBJc1JlYWR5Q2FsbGJhY2suY2FsbChzZWxmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0ID0gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZShsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdChsYXQsIGxuZykge1xyXG4gIC8vIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIHRlYW0gVG93biBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gVG93biBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24sXHJcbiAgICBpY29uOiB0aGlzLnRlYW1Ub3duQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgdmFyIHRlYW1Ub3duQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1Ub3duQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbVRvd25CYXNlT2JqZWN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBDcnVzaCBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgJiYgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgPSB7fTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gQ3J1c2ggQmFzZScsXHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgcG9zaXRpb246IHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbUNydXNoQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZU9iamVjdChsYXQsIGxuZykge1xyXG5cclxuICB2YXIgdGVhbUNydXNoQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1DcnVzaEJhc2VPYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRlYW1DcnVzaEJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJhbmRvbWx5UHV0SXRlbXMoKSB7XHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gZ2V0UmFuZG9tTG9jYXRpb25Gb3JJdGVtLmNhbGwodGhpcyk7XHJcbiAgdmFyIGl0ZW1JZCA9IGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMCwgMCk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ID0ge1xyXG4gICAgaWQ6IGl0ZW1JZCxcclxuICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogcmFuZG9tTG9jYXRpb24ubGF0KCksXHJcbiAgICAgIGxuZzogcmFuZG9tTG9jYXRpb24ubG5nKClcclxuICAgIH1cclxuICB9XHJcbiAgcHV0TmV3SXRlbU9uTWFwLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbiAgYnJvYWRjYXN0TmV3SXRlbS5jYWxsKHRoaXMsIHJhbmRvbUxvY2F0aW9uLCBpdGVtSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0oKSB7XHJcbiAgLy8gRmluZCBhIHJhbmRvbSBsb2NhdGlvbiB0aGF0IHdvcmtzLCBhbmQgaWYgaXQncyB0b28gY2xvc2VcclxuICAvLyB0byB0aGUgYmFzZSwgcGljayBhbm90aGVyIGxvY2F0aW9uXHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gbnVsbDtcclxuICB2YXIgY2VudGVyT2ZBcmVhTGF0ID0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLmxhdCgpO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMbmcgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubG5nKCk7XHJcbiAgd2hpbGUgKHRydWUpIHtcclxuICAgIHJhbmRvbUxhdCA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTGF0IC1cclxuICAgICAgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgY2VudGVyT2ZBcmVhTGF0ICsgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICByYW5kb21MbmcgPSBnZXRSYW5kb21JblJhbmdlKGNlbnRlck9mQXJlYUxuZyAtXHJcbiAgICAgICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMbmcgKyAodGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIHB1dCBpdGVtIGF0OiAnICsgcmFuZG9tTGF0ICsgJywnICsgcmFuZG9tTG5nKTtcclxuICAgIHJhbmRvbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhyYW5kb21MYXQsIHJhbmRvbUxuZyk7XHJcbiAgICBpZiAoZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4ocmFuZG9tTG9jYXRpb24sIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikgPiB0aGlzLm1pbkl0ZW1EaXN0YW5jZUZyb21CYXNlKSB7XHJcbiAgICAgIHJldHVybiByYW5kb21Mb2NhdGlvbjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdpdGVtIHRvbyBjbG9zZSB0byBiYXNlLCBjaG9vc2luZyBhbm90aGVyIGxvY2F0aW9uLi4uJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwdXROZXdJdGVtT25NYXAobG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIC8vIGV2ZW50dWFsbHkgdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50IHRvIGNsZWFyIHRoaXMsIGJ1dCB3aGlsZVxyXG4gIC8vIHRoZXJlJ3MgYSBidWcgb24gbXVsdGlwbGF5ZXIgam9pbmluZywgY2xlYXIgaXQgYWdhaW5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcblxyXG4gIC8vIHNldCB0aGUgYmFzZSBpY29uIGltYWdlcyB0byBiZSB0aGUgbGlnaHRlciBvbmVzXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG5cclxuICAvLyBpbiBjYXNlIHRoZXJlJ3MgYSBsaW5nZXJpbmcgaXRlbSwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMuaXRlbU1hcE9iamVjdCAmJiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIubWFwKSB7XHJcbiAgICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHZhciBpdGVtTWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgdGl0bGU6ICdJdGVtJyxcclxuICAgIGljb246IHRoaXMuaXRlbUljb24sXHJcbiAgICAvLyAvL1RPRE86IEZJWCBTVFVQSUQgR09PR0xFIE1BUFMgQlVHIHRoYXQgY2F1c2VzIHRoZSBnaWYgbWFya2VyXHJcbiAgICAvLyAvL3RvIG15c3RlcmlvdXNseSBub3Qgc2hvdyB1cCBzb21ldGltZXNcclxuICAgIC8vIG9wdGltaXplZDogZmFsc2UsXHJcbiAgICBwb3NpdGlvbjogbG9jYXRpb25cclxuICB9KTtcclxuXHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0ID0ge1xyXG4gICAgbWFya2VyOiBpdGVtTWFya2VyLFxyXG4gICAgbG9jYXRpb246IGxvY2F0aW9uXHJcbiAgfTtcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICB9O1xyXG5cclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIGxvY2F0aW9uLCAnYXJyb3cucG5nJyk7XHJcbiAgcmV0dXJuIGl0ZW1JZDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlQm9vc3RpbmcoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX05PUk1BTF9TUEVFRDtcclxuICBpZiAoJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgfHwgJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgPT0gMCkge1xyXG4gICAgdmFyIGJvb3N0QmFyVmFsdWUgPSAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKTtcclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPiAwKSB7XHJcbiAgICAgIGJvb3N0QmFyVmFsdWUgLT0gdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFO1xyXG4gICAgICAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiLCBib29zdEJhclZhbHVlKTtcclxuICAgICAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX0JPT1NUX1NQRUVEO1xyXG4gICAgICB0aGlzLnNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5zcGVlZCkgPiB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLnNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSB0aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAqPSB0aGlzLkJPT1NUX0ZBQ1RPUjtcclxuICAgICAgaWYgKE1hdGguYWJzKHRoaXMuaG9yaXpvbnRhbFNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IC10aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jdHJsRG93biAmJiBib29zdEJhclZhbHVlIDw9IDApIHtcclxuICAgICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI2Jvb3N0LWJhcicpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm1heFNwZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlQ2FyKCkge1xyXG4gIHRoaXMubWF4U3BlZWQgPSBoYW5kbGVCb29zdGluZy5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBpZiBVcCBvciBEb3duIGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIHNwZWVkLiBPdGhlcndpc2UsXHJcbiAgLy8gZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy51cERvd24gfHwgdGhpcy5kb3duRG93bikge1xyXG4gICAgaWYgKHRoaXMudXBEb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkICs9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmRvd25Eb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5zcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgLy8gaWYgTGVmdCBvciBSaWdodCBrZXkgaXMgcHJlc3NlZCwgY2hhbmdlIHRoZSBob3Jpem9udGFsIHNwZWVkLlxyXG4gIC8vIE90aGVyd2lzZSwgZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy5sZWZ0RG93biB8fCB0aGlzLnJpZ2h0RG93bikge1xyXG4gICAgaWYgKHRoaXMucmlnaHREb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8PSB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubGVmdERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLT0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy51cERvd24gJiYgIXRoaXMuZG93bkRvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMuTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmICh0aGlzLnNwZWVkID4gLTAuMDEgJiYgdGhpcy5zcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5zcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnNwZWVkIC89IHRoaXMuZGVjZWxlcmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy5sZWZ0RG93biAmJiAhdGhpcy5yaWdodERvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLmhvcml6b250YWxTcGVlZCkgPiB0aGlzLk1BWF9OT1JNQUxfU1BFRUQpKSB7XHJcbiAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPiAtMC4wMSAmJiB0aGlzLmhvcml6b250YWxTcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLz0gdGhpcy5kZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBvcHRpbWl6YXRpb24gLSBvbmx5IGlmIHRoZSBjYXIgaXMgbW92aW5nIHNob3VsZCB3ZSBzcGVuZFxyXG4gIC8vIHRpbWUgcmVzZXR0aW5nIHRoZSBtYXBcclxuICBpZiAodGhpcy5zcGVlZCAhPSAwIHx8IHRoaXMuaG9yaXpvbnRhbFNwZWVkICE9IDApIHtcclxuICAgIHZhciBuZXdMYXQgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sYXQoKSArICh0aGlzLnNwZWVkIC8gdGhpcy5sYXRpdHVkZVNwZWVkRmFjdG9yKTtcclxuICAgIHZhciBuZXdMbmcgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sbmcoKSArICh0aGlzLmhvcml6b250YWxTcGVlZCAvIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKG5ld0xhdCwgbmV3TG5nKTtcclxuICAgIHRoaXMubWFwLnNldENlbnRlcih0aGlzLm1hcENlbnRlcik7XHJcblxyXG4gIH1cclxuXHJcbiAgcm90YXRlQ2FyLmNhbGwodGhpcyk7XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICByb3RhdGVBcnJvdy5jYWxsKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvUGVlcihvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBjb25uZWN0IHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgdmFyIHBlZXJKc0Nvbm5lY3Rpb24gPSB0aGlzLnBlZXIuY29ubmVjdChvdGhlclVzZXJQZWVySWQpO1xyXG4gIHBlZXJKc0Nvbm5lY3Rpb24ub24oJ29wZW4nLCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIG9wZW4nKTtcclxuICAgIGNvbm5lY3RlZFRvUGVlci5jYWxsKHNlbGYsIHBlZXJKc0Nvbm5lY3Rpb24pO1xyXG4gIH0pO1xyXG4gIHBlZXJKc0Nvbm5lY3Rpb24ub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlBFRVJKUyBFUlJPUjogXCIpO1xyXG4gICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgIHRocm93IFwiUGVlckpTIGNvbm5lY3Rpb24gZXJyb3JcIjtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdGVkVG9QZWVyKHBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICB2YXIgb3RoZXJVc2VyUGVlcklkID0gcGVlckpzQ29ubmVjdGlvbi5wZWVyO1xyXG4gIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCdjb25uZWN0ZWQgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgd2UndmUgY29ubmVjdGVkIHRvIHRoaXMgdWVzcixcclxuICAvLyBhZGQgdGhlIEhUTUwgZm9yIHRoZSBuZXcgdXNlclxyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gfHwgIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIGluaXRpYWxpemVQZWVyQ29ubmVjdGlvbi5jYWxsKHRoaXMsIHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgICBhc3NpZ25Vc2VyVG9UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGNyZWF0ZU90aGVyVXNlckNhci5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlT3RoZXJVc2VyQ2FyKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJJZCA9IG90aGVyVXNlclBlZXJJZDtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5jYXIgPSB7fTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduVXNlclRvVGVhbShvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBpZiB0aGUgdXNlciBpcyBhbHJlYWR5IG9uIGEgdGVhbSwgaWdub3JlIHRoaXNcclxuICBpZiAoaXNVc2VyT25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzKSB8fFxyXG4gICAgaXNVc2VyT25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2VycykpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB1c2VyT2JqZWN0ID0ge1xyXG4gICAgcGVlcklkOiBvdGhlclVzZXJQZWVySWQsXHJcbiAgICB1c2VybmFtZTogbnVsbFxyXG4gIH07XHJcbiAgLy8gZm9yIG5vdywganVzdCBhbHRlcm5hdGUgd2hvIGdvZXMgb24gZWFjaCB0ZWFtXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoID4gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoKSB7XHJcbiAgICBhY3RpdmF0ZVRlYW1DcnVzaEluVUkuY2FsbCh0aGlzKTtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLnB1c2godXNlck9iamVjdCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVXNlck9uVGVhbShwZWVySWQsIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJPYmplY3RzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh1c2VyT2JqZWN0c0FycmF5W2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduTXlUZWFtSW5VSSgpIHtcclxuICBpZiAodXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpIHtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd5ZWxsb3cnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnY29sb3InLCAnYmxhY2snKTtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3JlZCcpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyM2NjYnKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVQZWVyQ29ubmVjdGlvbihwZWVySnNDb25uZWN0aW9uLCBvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSkge1xyXG4gICAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gPSB7fTtcclxuICB9XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbiA9IHBlZXJKc0Nvbm5lY3Rpb247XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5vbignY2xvc2UnLCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdjbG9zaW5nIGNvbm5lY3Rpb24nKTtcclxuICAgIG90aGVyVXNlckRpc2Nvbm5lY3RlZC5jYWxsKHNlbGYsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfSk7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5vbignZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGRhdGFSZWNlaXZlZC5jYWxsKHNlbGYsIGRhdGEpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmYWRlQXJyb3dUb0ltYWdlKGltYWdlRmlsZU5hbWUpIHtcclxuICAkKFwiI2Fycm93LWltZ1wiKS5hdHRyKCdzcmMnLCAnaW1hZ2VzLycgKyBpbWFnZUZpbGVOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyRGlzY29ubmVjdGVkKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIHNob3VsZCBiZSBjYWxsZWQgYWZ0ZXIgdGhlIHBlZXJKcyBjb25uZWN0aW9uXHJcbiAgLy8gaGFzIGFscmVhZHkgYmVlbiBjbG9zZWRcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICByZW1vdmVVc2VyRnJvbVRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIHJlbW92ZVVzZXJGcm9tVUkuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICAvLyByZW1vdmUgdGhpcyB1c2VyIGZyb20gdGhlIGdhbWUgaW4gRmlyZWJhc2U6XHJcbiAgbWF0Y2htYWtlclRvd24ucmVtb3ZlUGVlckZyb21TZXNzaW9uKGdhbWVJZCwgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgaWYgKHRoaXMuaG9zdFBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgIC8vIGlmIHRoYXQgdXNlciB3YXMgdGhlIGhvc3QsIHNldCB1cyBhcyB0aGUgbmV3IGhvc3RcclxuICAgIHRoaXMuaG9zdFBlZXJJZCA9IHRoaXMucGVlci5pZDtcclxuICAgIHN3aXRjaFRvTmV3SG9zdC5jYWxsKHRoaXMsIHRoaXMuZ2FtZUlkLCB0aGlzLnBlZXIuaWQpO1xyXG4gIH1cclxuXHJcbiAgLy8gaWYgdGhlIHVzZXIgd2hvIGRpc2Nvbm5lY3RlZCBjdXJyZW50bHkgaGFkIGFuIGl0ZW0sXHJcbiAgLy8gcHV0IG91dCBhIG5ldyBvbmVcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtICYmIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBvdGhlclVzZXJQZWVySWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVsZXRlIHRoYXQgdXNlcidzIGRhdGFcclxuICBkZWxldGUgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF07XHJcblxyXG4gIC8vIGlmIHRoZXJlIGFueSB1c2VycyBsZWZ0LCBicm9hZGNhc3QgdGhlbSB0aGUgbmV3IGdhbWUgc3RhdGVcclxuICBpZiAoT2JqZWN0LmtleXModGhpcy5vdGhlclVzZXJzKS5sZW5ndGggPiAwKSB7XHJcbiAgICBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzLmNhbGwodGhpcyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnd2FpdGluZyBmb3IgYSBzbXVnZ2xlciB0byBiYXR0bGUuLi4nKTtcclxuICB9XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVc2VyRnJvbVRlYW0odXNlclBlZXJJZCkge1xyXG4gIGZvciAodmFyIGkgPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdXNlclBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLnNwbGljZShpLCAxKTtcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaiA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0ucGVlcklkID09IHVzZXJQZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMuc3BsaWNlKGosIDEpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21VSShwZWVySWQpIHtcclxuICAvLyByZW1vdmUgdGhlIG90aGVyIHVzZXIncyBjYXIgZnJvbSB0aGUgbWFwXHJcbiAgdGhpcy5vdGhlclVzZXJzW3BlZXJJZF0uY2FyLm1hcmtlci5zZXRNYXAobnVsbCk7XHJcblxyXG4gIC8vIGlmIHRoZWlyIHRlYW0gaGFzIG5vIG1vcmUgdXNlcnMsIGdyZXkgb3V0XHJcbiAgLy8gdGhlaXIgc2NvcmUgYm94XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzAuMycpO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDaGFuZ2VkTG9jYXRpb24obGF0LCBsbmcpIHtcclxuICBzZXRHYW1lVG9OZXdMb2NhdGlvbi5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycygpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgYnJvYWRjYXN0R2FtZVN0YXRlLmNhbGwodGhpcywgdXNlcik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkYXRhUmVjZWl2ZWQoZGF0YSkge1xyXG4gIGlmIChkYXRhLnBlZXJJZCkge1xyXG4gICAgLy8gaWYgd2UgYXJlIHRoZSBob3N0LCBhbmQgdGhlIHVzZXIgd2hvIHNlbnQgdGhpcyBkYXRhIGhhc24ndCBiZWVuIGdpdmVuIHRoZSBpbml0aWFsIGdhbWVcclxuICAgIC8vIHN0YXRlLCB0aGVuIGJyb2FkY2FzdCBpdCB0byB0aGVtXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5oYXNCZWVuSW5pdGlhbGl6ZWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgIC8vIG5vdCBzdXJlIGlmIHdlIHNob3VsZCBkbyB0aGlzIG9yIG5vdCwgYnV0IGF0IGxlYXN0IGl0IHJlc2V0cyB0aGUgZ2FtZVxyXG4gICAgICAvLyBzdGF0ZSB0byB3aGF0IHdlLCB0aGUgaG9zdCwgdGhpbmsgaXQgaXNcclxuICAgICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycy5jYWxsKHRoaXMpO1xyXG4gICAgICAvLyBpZiBub3QgdGhhdCwgdGhlbiB3ZSBzaG91bGQganVzdCBicm9hZGNhc3QgdG8gdGhlIG5ldyBndXkgbGlrZSB0aGlzOlxyXG4gICAgICAvLyBicm9hZGNhc3RHYW1lU3RhdGUoZGF0YS5wZWVySWQpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5sYXN0VXBkYXRlVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5ldmVudCkge1xyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAndXBkYXRlX2dhbWVfc3RhdGUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogdXBkYXRlIGdhbWUgc3RhdGUnKTtcclxuICAgICAgLy8gd2Ugb25seSB3YW50IHRvIHJlY2VudGVyIHRoZSBtYXAgaW4gdGhlIGNhc2UgdGhhdCB0aGlzIGlzIGEgbmV3IHVzZXJcclxuICAgICAgLy8gam9pbmluZyBmb3IgdGhlIGZpcnN0IHRpbWUsIGFuZCB0aGUgd2F5IHRvIHRlbGwgdGhhdCBpcyB0byBzZWUgaWYgdGhlXHJcbiAgICAgIC8vIGluaXRpYWwgbG9jYXRpb24gaGFzIGNoYW5nZWQuICBPbmNlIHRoZSB1c2VyIGlzIGFscmVhZHkgam9pbmVkLCBpZiBhXHJcbiAgICAgIC8vIGxvY2F0aW9uIGNoYW5nZSBpcyBpbml0aWF0ZWQsIHRoYXQgd2lsbCB1c2UgdGhlICduZXdfbG9jYXRpb24nIGV2ZW50IFxyXG4gICAgICBpZiAocGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpICE9IHBhcnNlRmxvYXQodGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0KSB8fFxyXG4gICAgICAgIHBhcnNlRmxvYXQoZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSAhPSBwYXJzZUZsb2F0KHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpIHtcclxuICAgICAgICB0aGlzLm1hcC5zZXRDZW50ZXIobmV3IGdvb2dsZS5tYXBzLkxhdExuZyhcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCxcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QgPSBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0O1xyXG4gICAgICAvLyBuZWVkIHRvIG1ha2UgdGhpcyBjYWxsIGJlY2F1c2Ugd2UgY2FuIGJlIGluIGEgc2l0dWF0aW9uIHdoZXJlIHRoZSBob3N0XHJcbiAgICAgIC8vIGRvZXNuJ3Qga25vdyBvdXIgdXNlcm5hbWUgeWV0LCBzbyB3ZSBuZWVkIHRvIG1hbnVhbGx5IHNldCBpdCBpbiBvdXJcclxuICAgICAgLy8gb3duIFVJIGZpcnN0LlxyXG4gICAgICB1cGRhdGVVc2VybmFtZS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCwgdGhpcy51c2VybmFtZSk7XHJcbiAgICAgIHVwZGF0ZVVJV2l0aE5ld0dhbWVTdGF0ZS5jYWxsKHRoaXMpO1xyXG4gICAgICBhc3NpZ25NeVRlYW1CYXNlLmNhbGwodGhpcyk7XHJcbiAgICAgIHVwZGF0ZUNhckljb25zLmNhbGwodGhpcyk7XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICduZXdfbG9jYXRpb24nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGxvY2F0aW9uICcgKyBkYXRhLmV2ZW50LmxhdCArICcsJyArIGRhdGEuZXZlbnQubG5nKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQub3JpZ2luYXRpbmdfcGVlcl9pZCAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICBvdGhlclVzZXJDaGFuZ2VkTG9jYXRpb24uY2FsbCh0aGlzLCBkYXRhLmV2ZW50LmxhdCwgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV9jb2xsZWN0ZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSBjb2xsZWN0ZWQgYnkgJyArIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNvbGxlY3RlZEl0ZW0uY2FsbCh0aGlzLCBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ25ld19pdGVtJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IG5ldyBpdGVtIGF0ICcgK1xyXG4gICAgICAgIGRhdGEuZXZlbnQubG9jYXRpb24ubGF0ICsgJywnICsgZGF0YS5ldmVudC5sb2NhdGlvbi5sbmcgK1xyXG4gICAgICAgICcgd2l0aCBpZCAnICsgZGF0YS5ldmVudC5pZCk7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHNvbWVvbmUgZWxzZSBjYXVzZWQgdGhlIG5ldyBpdGVtIHBsYWNlbWVudC5cclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGRpZCBpdCwgaXQgd2FzIGFscmVhZHkgcGxhY2VkXHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lmhvc3RfdXNlciAmJiBkYXRhLmV2ZW50Lmhvc3RfdXNlciAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICB2YXIgaXRlbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhkYXRhLmV2ZW50LmxvY2F0aW9uLmxhdCwgZGF0YS5ldmVudC5sb2NhdGlvbi5sbmcpO1xyXG4gICAgICAgIHB1dE5ld0l0ZW1Pbk1hcC5jYWxsKHRoaXMsIGl0ZW1Mb2NhdGlvbiwgZGF0YS5ldmVudC5pZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX3JldHVybmVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gcmV0dXJuZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0gKyAnIHdoaWNoIGdpdmVzIHRoZW0gJyArIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgb3RoZXJVc2VyUmV0dXJuZWRJdGVtLmNhbGwodGhpcywgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0sIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fdHJhbnNmZXJyZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSAnICsgZGF0YS5ldmVudC5pZCArICcgdHJhbnNmZXJyZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC5mcm9tVXNlclBlZXJJZCArICcgdG8gdXNlciAnICsgZGF0YS5ldmVudC50b1VzZXJQZWVySWQpO1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBkYXRhLmV2ZW50LnRvVXNlclBlZXJJZDtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIC8vIHRoZSBpdGVtIHdhcyB0cmFuc2ZlcnJlZCB0byB0aGlzIHVzZXJcclxuICAgICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICAgICAgICBpZDogZGF0YS5ldmVudC5pZCxcclxuICAgICAgICAgIGxvY2F0aW9uOiBudWxsXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3NvbWVvbmUgdHJhbnNmZXJyZWQgYXQgJyArIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyKTtcclxuICAgICAgICB1c2VyQ29sbGlkZWRXaXRoSXRlbS5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBhcnJvdyB0byBwb2ludCB0byB0aGUgbmV3IHVzZXIgd2hvIGhhcyB0aGUgaXRlbVxyXG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSB0aGlzLm90aGVyVXNlcnNbZGF0YS5ldmVudC50b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gaWYgdGhlIHVzZXIgc2VudCBhIHVzZXJuYW1lIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIHlldCwgc2V0IGl0XHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEudXNlcm5hbWUgJiYgIXRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0udXNlcm5hbWUpIHtcclxuICAgIHVwZGF0ZVVzZXJuYW1lLmNhbGwodGhpcywgZGF0YS5wZWVySWQsIGRhdGEudXNlcm5hbWUpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEuY2FyTGF0TG5nICYmIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgIG1vdmVPdGhlckNhci5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0sIG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YS5jYXJMYXRMbmcubGF0LCBkYXRhLmNhckxhdExuZy5sbmcpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnbk15VGVhbUJhc2UoKSB7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKSB7XHJcbiAgICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0O1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWUocGVlcklkLCB1c2VybmFtZSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVUlXaXRoTmV3R2FtZVN0YXRlKCkge1xyXG4gIC8vIHJlY2VudGVyIHRoZSBtYXBcclxuICBjb25zb2xlLmxvZygnbmV3IGxvY2F0aW9uIHJlY2VpdmVkOiAnICsgdGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24pO1xyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyh0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQsIHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZyk7XHJcbiAgdXBkYXRlQmFzZUxvY2F0aW9uc0luVUkuY2FsbCh0aGlzKTtcclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbiAgLy8gaWYgc29tZW9uZSBoYXMgdGhlIGl0ZW1cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICAgIC8vIGlmIEkgaGF2ZSB0aGUgaXRlbSwgbWFrZSB0aGUgZGVzdGluYXRpb24gbXkgdGVhbSdzIGJhc2VcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3dfYmx1ZS5wbmcnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGFub3RoZXIgdXNlciBoYXMgdGhlIGl0ZW0sIGJ1dCB0aGUgc2V0RGVzdGluYXRpb24gY2FsbFxyXG4gICAgICAvLyB3aWxsIGJlIHRha2VuIGNhcmUgb2Ygd2hlbiB0aGUgdXNlciBzZW5kcyB0aGVpciBsb2NhdGlvbiBkYXRhXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGlmIG5vYm9keSBoYXMgdGhlIGl0ZW0sIHB1dCBpdCBvbiB0aGUgbWFwIGluIHRoZSByaWdodCBwbGFjZSxcclxuICAgIC8vIGFuZCBzZXQgdGhlIG5ldyBpdGVtIGxvY2F0aW9uIGFzIHRoZSBkZXN0aW5hdGlvblxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgbW92ZUl0ZW1Pbk1hcC5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG4gICAgfVxyXG4gICAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICB9XHJcbiAgdXBkYXRlU2NvcmVzSW5VSS5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgYXNzaWduTXlUZWFtSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSSgpIHtcclxuICBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sYXQsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNhckljb25zKCkge1xyXG4gIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2VycywgdGhpcy50ZWFtVG93bk90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2VycywgdGhpcy50ZWFtQ3J1c2hPdGhlckNhckljb24pO1xyXG4gIHVwZGF0ZU15Q2FySWNvbi5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVNeUNhckljb24oKSB7XHJcbiAgdmFyIHVzZXJDYXJJbWdTcmMgPSAnaW1hZ2VzL2NydXNoX2Nhci5wbmcnO1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY2FyLnBuZyc7XHJcbiAgfVxyXG4gICQoJyNjYXItaW1nJykuYXR0cignc3JjJywgdXNlckNhckltZ1NyYyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zKHRlYW1Vc2VycywgdGVhbUNhckljb24pIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRlYW1Vc2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBtYXJrZXJcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0gJiYgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhciAmJiB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlcikge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRlYW1Vc2Vyc1tpXS5wZWVySWQgIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgICAgbWFwOiB0aGlzLm1hcCxcclxuICAgICAgICB0aXRsZTogdGVhbVVzZXJzW2ldLnBlZXJJZCxcclxuICAgICAgICBpY29uOiB0ZWFtQ2FySWNvblxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTY29yZXNJblVJKHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCwgdGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCkge1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0ZWFtVG93bk51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlSXRlbU9uTWFwKGxhdCwgbG5nKSB7XHJcbiAgY29uc29sZS5sb2coJ21vdmluZyBpdGVtIHRvIG5ldyBsb2NhdGlvbjogJyArIGxhdCArICcsJyArIGxuZyk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxhdCA9IGxhdDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubG5nID0gbG5nO1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0UG9zaXRpb24odGhpcy5pdGVtTWFwT2JqZWN0LmxvY2F0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyUmV0dXJuZWRJdGVtKG90aGVyVXNlclBlZXJJZCwgbm93TnVtSXRlbXNGb3JVc2VyKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQuY2FsbCh0aGlzLCB1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKSlcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgJ2Fycm93LnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlT3RoZXJDYXIob3RoZXJVc2VyT2JqZWN0LCBuZXdMb2NhdGlvbikge1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiA9IG5ld0xvY2F0aW9uO1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIpIHtcclxuICAgIHVwZGF0ZUNhckljb25zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG4gIC8vIGlmIHRoZSBvdGhlciBjYXIgaGFzIGFuIGl0ZW0sIHVwZGF0ZSB0aGUgZGVzdGluYXRpb25cclxuICAvLyB0byBiZSBpdFxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCkge1xyXG4gICAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gICAgaWYgKHVzZXJJc09uTXlUZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCkpIHtcclxuICAgICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gICAgfVxyXG4gICAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCBuZXdMb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG4gIH1cclxuICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQuY2FsbCh0aGlzLCBvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uLCBvdGhlclVzZXJPYmplY3QucGVlcklkKTtcclxuICBvdGhlclVzZXJPYmplY3QuY2FyLm1hcmtlci5zZXRQb3NpdGlvbihvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlcklzT25NeVRlYW0ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdmFyIG15VGVhbSA9IG51bGw7XHJcbiAgdmFyIG90aGVyVXNlclRlYW0gPSBudWxsO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICBteVRlYW0gPSAndG93bic7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAgIG90aGVyVXNlclRlYW0gPSAndG93bic7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIG15VGVhbSA9ICdjcnVzaCc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgICBvdGhlclVzZXJUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG15VGVhbSA9PSBvdGhlclVzZXJUZWFtO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQob3RoZXJDYXJMb2NhdGlvbiwgb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gaWYgd2UgZG9uJ3Qga25vdyB0aGUgb3RoZXIgY2FyJ3MgbG9jYXRpb24sIG9yIGlmIHRoaXMgaXNuJ3QgdGhlIHVzZXIgd2l0aFxyXG4gIC8vICB0aGUgaXRlbSwgdGhlbiBpZ25vcmUgaXQuIFdlJ2xsIG9ubHkgdHJhbnNmZXIgYW4gaXRlbSBmcm9tIHRoZSBwZXJzcGVjdGVkXHJcbiAgLy8gIG9mIHRoZSB1c2VyIHdpdGggdGhlIGl0ZW1cclxuICBpZiAoIW90aGVyQ2FyTG9jYXRpb24gfHwgIXRoaXMuY29sbGVjdGVkSXRlbSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZiAodGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIpIHtcclxuICAgIHZhciB0aW1lU2luY2VMYXN0VHJhbnNmZXIgPSAoKG5ldyBEYXRlKCkpLmdldFRpbWUoKSkgLSB0aW1lT2ZMYXN0VHJhbnNmZXI7XHJcbiAgICAvLyBpZiBub3QgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCBzaW5jZSB0aGUgbGFzdCB0cmFuc2ZlciwgcmV0dXJuXHJcbiAgICBpZiAodGltZVNpbmNlTGFzdFRyYW5zZmVyIDwgdGhpcy50aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG9wdGltaXphdGlvbjogcmVzZXQgdGhpcyBzbyB3ZSBkb24ndCB3YXN0ZSB0aW1lIGNhbGN1bGF0aW5nIGluIHRoZSBmdXR1cmVcclxuICAgICAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGRpc3RhbmNlID0gZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4odGhpcy5tYXBDZW50ZXIsIG90aGVyQ2FyTG9jYXRpb24pO1xyXG4gIC8vIGlmIHRoaXMgdXNlciAodGhhdCBoYXMgdGhlIGl0ZW0pIGlzIGNsb3NlIGVub3VnaCB0byBjYWxsIGl0IGFcclxuICAvLyBjb2xsaXNpb24sIHRyYW5zZmVyIGl0IHRvIHRoZSBvdGhlciB1c2VyXHJcbiAgaWYgKGRpc3RhbmNlIDwgMjApIHtcclxuICAgIHRyYW5zZmVySXRlbS5jYWxsKHRoaXMsIHRoaXMuY29sbGVjdGVkSXRlbS5pZCwgdGhpcy5wZWVyLmlkLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNmZXJJdGVtKGl0ZW1PYmplY3RJZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdpdGVtICcgKyBpdGVtT2JqZWN0SWQgKyAnIHRyYW5zZmVycmVkIGZyb20gJyArIGZyb21Vc2VyUGVlcklkICsgJyB0byAnICsgdG9Vc2VyUGVlcklkKTtcclxuICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgYnJvYWRjYXN0VHJhbnNmZXJPZkl0ZW0uY2FsbCh0aGlzLCBpdGVtT2JqZWN0SWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQsIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyKTtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHRvVXNlclBlZXJJZDtcclxuICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uTXlUZWFtLmNhbGwodGhpcywgdG9Vc2VyUGVlcklkKSkge1xyXG4gICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gIH1cclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1t0b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtKHVzZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdvdGhlciB1c2VyIGNvbGxlY3RlZCBpdGVtJyk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdXNlcklkO1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICBpZiAodXNlcklzT25NeVRlYW0uY2FsbCh0aGlzLCB1c2VySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCBhcnJvd0ltZyk7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlSWNvbik7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VyUmV0dXJuZWRJdGVtVG9CYXNlKCkge1xyXG4gIGNvbnNvbGUubG9nKCd1c2VyIHJldHVybmVkIGl0ZW0gdG8gYmFzZScpO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsICdhcnJvdy5wbmcnKTtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQuY2FsbCh0aGlzLCB1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSk7XHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uVG93blRlYW0ocGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbmNyZW1lbnRJdGVtQ291bnQoaXNUZWFtVG93bikge1xyXG4gIGlmIChpc1RlYW1Ub3duKSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQrKztcclxuICAgICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQrKztcclxuICAgICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmbGFzaEVsZW1lbnQoanF1ZXJ5RWxlbSkge1xyXG4gIGpxdWVyeUVsZW0uZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJDb2xsaWRlZFdpdGhJdGVtKGNvbGxpc2lvbkl0ZW1PYmplY3QpIHtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBjb2xsaXNpb25JdGVtT2JqZWN0O1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIGNvbGxpc2lvbkl0ZW1PYmplY3QubG9jYXRpb24gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHBlZXIuaWQ7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlSWNvbik7XHJcbiAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXREZXN0aW5hdGlvbihsb2NhdGlvbiwgYXJyb3dJbWFnZU5hbWUpIHtcclxuICB0aGlzLmRlc3RpbmF0aW9uID0gbG9jYXRpb247XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsIGFycm93SW1hZ2VOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlQ2FyKCkge1xyXG4gIHRoaXMucm90YXRpb24gPSBnZXRBbmdsZS5jYWxsKHRoaXMsIHRoaXMuc3BlZWQsIHRoaXMuaG9yaXpvbnRhbFNwZWVkKTtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyAvKiBJRSA5ICovIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsgLyogQ2hyb21lLCBTYWZhcmksIE9wZXJhICovIHRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7JztcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlQXJyb3coKSB7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uID0gY29tcHV0ZUJlYXJpbmdBbmdsZS5jYWxsKHRoaXMsIHRoaXMubWFwQ2VudGVyLmxhdCgpLCB0aGlzLm1hcENlbnRlci5sbmcoKSwgdGhpcy5kZXN0aW5hdGlvbi5sYXQoKSwgdGhpcy5kZXN0aW5hdGlvbi5sbmcoKSk7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzID0gJy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7IC8qIElFIDkgKi8gLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7IC8qIENocm9tZSwgU2FmYXJpLCBPcGVyYSAqLyB0cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7JztcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKHN0ZXApIHtcclxuICBtb3ZlQ2FyLmNhbGwodGhpcyk7XHJcblxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0ICYmIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSkge1xyXG4gICAgLy8gY2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBvbmUgY2FyIHdpdGggYW4gaXRlbSBhbmQgb25lIHdpdGhvdXRcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIC8vIGlmIHRoaXMgdXNlciBoYXMgYW4gaXRlbSwgY2hlY2sgdG8gc2VlIGlmIHRoZXkgYXJlIGNvbGxpZGluZ1xyXG4gICAgICAvLyB3aXRoIGFueSBvdGhlciB1c2VyLCBhbmQgaWYgc28sIHRyYW5zZmVyIHRoZSBpdGVtXHJcbiAgICAgIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICAgICAgdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW3VzZXJdLmNhci5sb2NhdGlvbiwgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJJZCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIGFub3RoZXIgdXNlciBoYXMgYW4gaXRlbSwgYW5kIHRoZWlyIGNhciBoYXMgYSBsb2NhdGlvbixcclxuICAgICAgLy8gdGhlbiBjb25zdGFudGx5IHNldCB0aGUgZGVzdGluYXRpb24gdG8gdGhlaXIgbG9jYXRpb25cclxuICAgICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dICYmIHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmxvY2F0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmNhci5sb2NhdGlvbikge1xyXG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5jYXIubG9jYXRpb247XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGNoZWNrIGlmIHVzZXIgY29sbGlkZWQgd2l0aCBhbiBpdGVtIG9yIHRoZSBiYXNlXHJcbiAgdmFyIGNvbGxpc2lvbk1hcmtlciA9IGdldENvbGxpc2lvbk1hcmtlci5jYWxsKHRoaXMpO1xyXG4gIGlmIChjb2xsaXNpb25NYXJrZXIpIHtcclxuICAgIGlmICghY29sbGVjdGVkSXRlbSAmJiBjb2xsaXNpb25NYXJrZXIgPT0gdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgICAvLyB1c2VyIGp1c3QgcGlja2VkIHVwIGFuIGl0ZW1cclxuICAgICAgdXNlckNvbGxpZGVkV2l0aEl0ZW0uY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QpO1xyXG4gICAgICBicm9hZGNhc3RJdGVtQ29sbGVjdGVkLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmlkKTtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5jb2xsZWN0ZWRJdGVtICYmIGNvbGxpc2lvbk1hcmtlciA9PSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICAgIC8vIHVzZXIgaGFzIGFuIGl0ZW0gYW5kIGlzIGJhY2sgYXQgdGhlIGJhc2VcclxuICAgICAgdXNlclJldHVybmVkSXRlbVRvQmFzZS5jYWxsKHRoaXMpO1xyXG4gICAgICBicm9hZGNhc3RJdGVtUmV0dXJuZWQuY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpO1xyXG4gICAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBicm9hZGNhc3RNeUNhckxvY2F0aW9uLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIGlmIHRoZSBnYW1lIGhhcyBzdGFydGVkIGFuZCB3ZSdyZSB0aGUgaG9zdCwgY2hlY2tcclxuICAvLyBmb3IgYW55IHBlZXJzIHdobyBoYXZlbid0IHNlbnQgYW4gdXBkYXRlIGluIHRvbyBsb25nXHJcbiAgaWYgKHRoaXMuaG9zdFBlZXJJZCAmJiB0aGlzLnBlZXIgJiYgdGhpcy5wZWVyLmlkICYmIHRoaXMuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgIGNsZWFudXBBbnlEcm9wcGVkQ29ubmVjdGlvbnMuY2FsbCh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3VsZEtlZXBBbGl2ZSgpIHtcclxuICByZXR1cm4gdGhpcy5xcy52YWx1ZSh0aGlzLmtlZXBBbGl2ZVBhcmFtTmFtZSkgPT0gJ3RydWUnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zKCkge1xyXG4gIGlmIChzaG91bGRLZWVwQWxpdmUuY2FsbCh0aGlzKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRpbWVOb3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICAvLyBpZiBpdCdzIGJlZW4gbG9uZ2VyIHRoYW4gdGhlIHRpbWVvdXQgc2luY2Ugd2UndmUgaGVhcmQgZnJvbVxyXG4gICAgLy8gdGhpcyB1c2VyLCByZW1vdmUgdGhlbSBmcm9tIHRoZSBnYW1lXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lICYmICh0aW1lTm93IC0gdGhpcy5vdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lID4gdGhpcy5BQ1RJVkVfQ09OTkVDVElPTl9USU1FT1VUX0lOX1NFQ09ORFMpKSB7XHJcbiAgICAgIGNsb3NlUGVlckpzQ29ubmVjdGlvbi5jYWxsKHRoaXMsIHVzZXIpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xvc2VQZWVySnNDb25uZWN0aW9uKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGlmICh0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSAmJiB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLmNsb3NlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXIoZHQpIHtcclxuICAkKFwiI2Nhci1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMucm90YXRpb25Dc3MpO1xyXG4gICQoXCIjYXJyb3ctaW1nXCIpLmF0dHIoXCJzdHlsZVwiLCB0aGlzLmFycm93Um90YXRpb25Dc3MpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RNeUNhckxvY2F0aW9uKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gJiYgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3BlbiAmJiB0aGlzLm1hcENlbnRlcikge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgICBjYXJMYXRMbmc6IHtcclxuICAgICAgICAgIGxhdDogdGhpcy5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgICAgICBsbmc6IHRoaXMubWFwQ2VudGVyLmxuZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwZWVySWQ6IHRoaXMucGVlci5pZCxcclxuICAgICAgICB1c2VybmFtZTogdGhpcy51c2VybmFtZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEdhbWVTdGF0ZShvdGhlclVzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGdhbWUgc3RhdGUgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0ID0ge1xyXG4gICAgZXZlbnQ6IHtcclxuICAgICAgbmFtZTogJ3VwZGF0ZV9nYW1lX3N0YXRlJyxcclxuICAgICAgZ2FtZURhdGFPYmplY3Q6IHRoaXMuZ2FtZURhdGFPYmplY3RcclxuICAgIH1cclxuICB9O1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh1cGRhdGVHYW1lU3RhdGVFdmVudE9iamVjdCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE5ld0l0ZW0obG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gJiYgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICB2YXIgc2ltcGxlSXRlbUxhdExuZyA9IHtcclxuICAgICAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgICBuYW1lOiAnbmV3X2l0ZW0nLFxyXG4gICAgICAgICAgaG9zdF91c2VyOiBwZWVyLmlkLFxyXG4gICAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgICAgbGF0OiBzaW1wbGVJdGVtTGF0TG5nLmxhdCxcclxuICAgICAgICAgICAgbG5nOiBzaW1wbGVJdGVtTGF0TG5nLmxuZ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGlkOiBpdGVtSWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0SXRlbVJldHVybmVkKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gcmV0dXJuZWQnKTtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fcmV0dXJuZWQnLFxyXG4gICAgICAgIHVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbTogcGVlci5pZCxcclxuICAgICAgICBub3dfbnVtX2l0ZW1zOiB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQsXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0SXRlbUNvbGxlY3RlZChpdGVtSWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gaWQgJyArIGl0ZW1JZCArICcgY29sbGVjdGVkIGJ5IHVzZXIgJyArIHBlZXIuaWQpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHBlZXIuaWQ7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9jb2xsZWN0ZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtOiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RUcmFuc2Zlck9mSXRlbShpdGVtSWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gdHJhbnNmZXJyZWQgJyArIGl0ZW1JZCArICcgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX3RyYW5zZmVycmVkJyxcclxuICAgICAgICBpZDogaXRlbUlkLFxyXG4gICAgICAgIGZyb21Vc2VyUGVlcklkOiBmcm9tVXNlclBlZXJJZCxcclxuICAgICAgICB0b1VzZXJQZWVySWQ6IHRvVXNlclBlZXJJZFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE5ld0xvY2F0aW9uKGxvY2F0aW9uKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBuZXcgbG9jYXRpb246ICcgKyBsb2NhdGlvbi5sYXQoKSArICcsJyArIGxvY2F0aW9uLmxuZygpKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnbmV3X2xvY2F0aW9uJyxcclxuICAgICAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICAgIGxuZzogbG9jYXRpb24ubG5nKCksXHJcbiAgICAgICAgb3JpZ2luYXRpbmdfcGVlcl9pZDogcGVlci5pZFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGNoZWNrcyB0byBzZWUgaWYgdGhleSBoYXZlIGNvbGxpZGVkIHdpdGggZWl0aGVyIGFuIGl0ZW0gb3IgdGhlIGJhc2VcclxuZnVuY3Rpb24gZ2V0Q29sbGlzaW9uTWFya2VyKCkge1xyXG4gIC8vIGNvbXB1dGUgdGhlIGRpc3RhbmNlIGJldHdlZW4gbXkgY2FyIGFuZCB0aGUgZGVzdGluYXRpb25cclxuICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xyXG4gICAgdmFyIG1heERpc3RhbmNlQWxsb3dlZCA9IHRoaXMuY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2U7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2Vlbih0aGlzLm1hcENlbnRlciwgdGhpcy5kZXN0aW5hdGlvbik7XHJcbiAgICAvLyBUaGUgYmFzZSBpcyBiaWdnZXIsIHNvIGJlIG1vcmUgbGVuaWVudCB3aGVuIGNoZWNraW5nIGZvciBhIGJhc2UgY29sbGlzaW9uXHJcbiAgICBpZiAodGhpcy5kZXN0aW5hdGlvbiA9PSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgbWF4RGlzdGFuY2VBbGxvd2VkID0gdGhpcy5jYXJUb0Jhc2VDb2xsaXNpb25EaXN0YW5jZTtcclxuICAgIH1cclxuICAgIGlmIChkaXN0YW5jZSA8IG1heERpc3RhbmNlQWxsb3dlZCkge1xyXG4gICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbiA9PSB0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgICBjb25zb2xlLmxvZygndXNlciAnICsgdGhpcy5wZWVyLmlkICsgJyBjb2xsaWRlZCB3aXRoIGl0ZW0nKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfSBlbHNlIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbGxlY3RlZEl0ZW0pIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyB0aGlzLnBlZXIuaWQgKyAnIGhhcyBhbiBpdGVtIGFuZCBjb2xsaWRlZCB3aXRoIGJhc2UnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5tYXJrZXI7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEdhbWVUb05ld0xvY2F0aW9uKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuICBjcmVhdGVUZWFtVG93bkJhc2UuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZS5jYWxsKHRoaXMsIChwYXJzZUZsb2F0KGxhdCkgKyAwLjAwNikudG9TdHJpbmcoKSwgKHBhcnNlRmxvYXQobG5nKSArIDAuMDA4KS50b1N0cmluZygpKTtcclxuICBhc3NpZ25NeVRlYW1CYXNlLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLm1hcC5zZXRDZW50ZXIodGhpcy5tYXBDZW50ZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBbmdsZSh2eCwgdnkpIHtcclxuICByZXR1cm4gKE1hdGguYXRhbjIodnksIHZ4KSkgKiAoMTgwIC8gTWF0aC5QSSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXB1dGVCZWFyaW5nQW5nbGUobGF0MSwgbG9uMSwgbGF0MiwgbG9uMikge1xyXG4gIHZhciBSID0gNjM3MTsgLy8ga21cclxuICB2YXIgZExhdCA9IChsYXQyIC0gbGF0MSkudG9SYWQoKTtcclxuICB2YXIgZExvbiA9IChsb24yIC0gbG9uMSkudG9SYWQoKTtcclxuICB2YXIgbGF0MSA9IGxhdDEudG9SYWQoKTtcclxuICB2YXIgbGF0MiA9IGxhdDIudG9SYWQoKTtcclxuXHJcbiAgdmFyIGFuZ2xlSW5SYWRpYW5zID0gTWF0aC5hdGFuMihNYXRoLnNpbihkTG9uKSAqIE1hdGguY29zKGxhdDIpLFxyXG4gICAgTWF0aC5jb3MobGF0MSkgKiBNYXRoLnNpbihsYXQyKSAtIE1hdGguc2luKGxhdDEpICogTWF0aC5jb3MobGF0MikgKiBNYXRoLmNvcyhkTG9uKSk7XHJcbiAgcmV0dXJuIGFuZ2xlSW5SYWRpYW5zLnRvRGVnKCk7XHJcbn1cclxuXHJcblxyXG4vLyBnYW1lIGxvb3AgaGVscGVyc1xyXG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XHJcbiAgcmV0dXJuIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbn1cclxuXHJcbi8vIGRvbid0IHRoaW5rIHdlJ2xsIG5lZWQgdG8gZ28gdG8gdGhlIHVzZXIncyBsb2NhdGlvbiwgYnV0IG1pZ2h0IGJlIHVzZWZ1bFxyXG5mdW5jdGlvbiB0cnlGaW5kaW5nTG9jYXRpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyBUcnkgSFRNTDUgZ2VvbG9jYXRpb25cclxuICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XHJcbiAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgIHZhciBwb3MgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcclxuICAgICAgICBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlKTtcclxuICAgICAgc2VsZi5tYXAuc2V0Q2VudGVyKHBvcyk7XHJcbiAgICAgIHNlbGYubWFwQ2VudGVyID0gcG9zO1xyXG4gICAgfSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGhhbmRsZU5vR2VvbG9jYXRpb24uY2FsbChzZWxmLCB0cnVlKTtcclxuICAgIH0pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGRvZXNuJ3Qgc3VwcG9ydCBHZW9sb2NhdGlvblxyXG4gICAgaGFuZGxlTm9HZW9sb2NhdGlvbi5jYWxsKHNlbGYsIGZhbHNlKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU5vR2VvbG9jYXRpb24oZXJyb3JGbGFnKSB7XHJcbiAgaWYgKGVycm9yRmxhZykge1xyXG4gICAgdmFyIGNvbnRlbnQgPSAnRXJyb3I6IFRoZSBHZW9sb2NhdGlvbiBzZXJ2aWNlIGZhaWxlZC4nO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgY29udGVudCA9ICdFcnJvcjogWW91ciBicm93c2VyIGRvZXNuXFwndCBzdXBwb3J0IGdlb2xvY2F0aW9uLic7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBUaGlzIGNhbiBiZSByZW1vdmVkLCBzaW5jZSBpdCBjYXVzZXMgYW4gZXJyb3IuICBpdCdzIGp1c3QgYWxsb3dpbmdcclxuLy8gZm9yIHJpZ2h0LWNsaWNraW5nIHRvIHNob3cgdGhlIGJyb3dzZXIncyBjb250ZXh0IG1lbnUuXHJcbmZ1bmN0aW9uIHNob3dDb250ZXh0TWVudShlKSB7XHJcblxyXG4gIC8vIGNyZWF0ZSBhIGNvbnRleHRtZW51IGV2ZW50LlxyXG4gIHZhciBtZW51X2V2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcclxuICBtZW51X2V2ZW50LmluaXRNb3VzZUV2ZW50KFwiY29udGV4dG1lbnVcIiwgdHJ1ZSwgdHJ1ZSxcclxuICAgIGUudmlldywgMSwgMCwgMCwgMCwgMCwgZmFsc2UsXHJcbiAgICBmYWxzZSwgZmFsc2UsIGZhbHNlLCAyLCBudWxsKTtcclxuXHJcbiAgLy8gZmlyZSB0aGUgbmV3IGV2ZW50LlxyXG4gIGUub3JpZ2luYWxUYXJnZXQuZGlzcGF0Y2hFdmVudChtZW51X2V2ZW50KTtcclxufVxyXG5cclxuXHJcbi8vIGhhY2sgdG8gYWxsb3cgZm9yIGJyb3dzZXIgY29udGV4dCBtZW51IG9uIHJpZ2h0LWNsaWNrXHJcbmZ1bmN0aW9uIG1vdXNlVXAoZSkge1xyXG4gIGlmIChlLmJ1dHRvbiA9PSAyKSB7IC8vIHJpZ2h0LWNsaWNrXHJcbiAgICBzaG93Q29udGV4dE1lbnUuY2FsbCh0aGlzLCBlKTtcclxuICB9XHJcbn1cclxuXHJcbi8vICQod2luZG93KS51bmxvYWQoZnVuY3Rpb24oKSB7XHJcbi8vICAgZGlzY29ubmVjdEZyb21HYW1lKCk7XHJcbi8vIH0pOyIsIi8qKlxyXG4gKiAgbWF0Y2htYWtlci5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZXhwb3J0IGNsYXNzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGNobWFrZXJUb3duO1xyXG5cclxuLyoqXHJcbiAqICBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hdGNobWFrZXJUb3duKSlcclxuICAgIHJldHVybiBuZXcgTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKTtcclxuXHJcbiAgLy8gVGhlIHJvb3Qgb2YgeW91ciBzZXNzaW9uIGRhdGEuXHJcbiAgdGhpcy5TRVNTSU9OX0xPQ0FUSU9OID0gZmlyZWJhc2VCYXNlVXJsO1xyXG4gIHRoaXMuc2Vzc2lvblJlZiA9IG5ldyBGaXJlYmFzZSh0aGlzLlNFU1NJT05fTE9DQVRJT04pO1xyXG5cclxuICB0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTiA9ICdhdmFpbGFibGVfc2Vzc2lvbnMnO1xyXG4gIHRoaXMuRlVMTF9TRVNTSU9OU19MT0NBVElPTiA9ICdmdWxsX3Nlc3Npb25zJztcclxuICB0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTiA9ICdzZXNzaW9ucyc7XHJcbiAgdGhpcy5NQVhfVVNFUlNfUEVSX1NFU1NJT04gPSA0O1xyXG4gIHRoaXMuU0VTU0lPTl9DTEVBTlVQX1RJTUVPVVQgPSAzMCAqIDEwMDA7IC8vIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuICB0aGlzLmpvaW5lZFNlc3Npb24gPSBudWxsO1xyXG4gIHRoaXMubXlXb3JrZXIgPSBudWxsO1xyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqICBjb25uZWN0IHRvIGEgc2Vzc2lvblxyXG4gKi9cclxuTWF0Y2htYWtlclRvd24ucHJvdG90eXBlLmpvaW5PckNyZWF0ZVNlc3Npb24gPSBmdW5jdGlvbih1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zLmNhbGwodGhpcyk7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBqb2luIHNlc3Npb24nKTtcclxuICBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyLmNhbGwodGhpcywgd2luZG93KTtcclxuICB2YXIgYXZhaWxhYmxlU2Vzc2lvbnNEYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX1NFU1NJT05TX0xPQ0FUSU9OKTtcclxuICBhdmFpbGFibGVTZXNzaW9uc0RhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAvLyBvbmx5IGpvaW4gYSBzZXNzaW9uIGlmIG9uZSBpc24ndCBqb2luZWQgYWxyZWFkeVxyXG4gICAgaWYgKHNlbGYuam9pbmVkU2Vzc2lvbiA9PSBudWxsKSB7XHJcbiAgICAgIHNlbGYuam9pbmVkU2Vzc2lvbiA9IC0xO1xyXG4gICAgICBpZiAoZGF0YS52YWwoKSA9PT0gbnVsbCkge1xyXG4gICAgICAgIC8vIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgc2Vzc2lvbnMsIHNvIGNyZWF0ZSBvbmVcclxuICAgICAgICB2YXIgc2Vzc2lvbkRhdGEgPSBjcmVhdGVOZXdTZXNzaW9uRGF0YS5jYWxsKHNlbGYsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgICAgIGNyZWF0ZU5ld1Nlc3Npb25JbkZpcmViYXNlLmNhbGwoc2VsZiwgdXNlcm5hbWUsIHBlZXJJZCwgc2Vzc2lvbkRhdGEpO1xyXG4gICAgICAgIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgdHJ1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnZhbCgpO1xyXG4gICAgICAgIHZhciBzZXNzaW9uSWQ7XHJcblxyXG4gICAgICAgIC8vIHN0dXBpZCBqYXZhc2NyaXB0IHdvbid0IHRlbGwgbWUgaG93IG1hbnkgc2Vzc2lvbiBlbGVtZW50c1xyXG4gICAgICAgIC8vIGFyZSBpbiB0aGUganNvbk9iaiwgc28gY291bnQgZW0gdXBcclxuICAgICAgICB2YXIgbnVtQXZhaWxhYmxlU2Vzc2lvbnMgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uT2JqKSB7XHJcbiAgICAgICAgICBudW1BdmFpbGFibGVTZXNzaW9ucysrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBjaGlsZCBzZXNzaW9ucyBhbmQgdHJ5XHJcbiAgICAgICAgLy8gdG8gam9pbiBlYWNoIG9uZVxyXG4gICAgICAgIHZhciBjb3VudGVyID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgY291bnRlcisrO1xyXG4gICAgICAgICAgaWYgKGpzb25PYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICBzZXNzaW9uSWQgPSBqc29uT2JqW2tleV07XHJcbiAgICAgICAgICAgIGdldFNlc3Npb25MYXN0VXBkYXRlVGltZS5jYWxsKHNlbGYsIHNlc3Npb25JZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWUuYmluZChzZWxmKSwgY291bnRlciA9PSBudW1BdmFpbGFibGVTZXNzaW9ucywgc2VsZik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogIHJlbW92ZSBhIHBlZXIgZnJvbSB0aGUgc2Vzc2lvblxyXG4gKi9cclxuZnVuY3Rpb24gcmVtb3ZlUGVlckZyb21TZXNzaW9uKHNlc3Npb25JZCwgcGVlcklkKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoIWRhdGEudmFsKCkpIHtcclxuICAgICAgLy8gc29tZXRoaW5nJ3Mgd3JvbmcsIHByb2JhYmx5IHRoZSBGaXJlYmFzZSBkYXRhIHdhcyBkZWxldGVkXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmIChkYXRhLnZhbCgpLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVySWQpIHtcclxuICAgICAgZmluZE5ld0hvc3RQZWVySWQuY2FsbCh0aGlzLCBzZXNzaW9uSWQsIHBlZXJJZCwgc3dpdGNoVG9OZXdIb3N0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAgIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIHNlc3Npb24uIFNvIHRyaW0gb3V0IHRoZSBcclxuICAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbiAgICB2YXIgbnVtVXNlcnNJblNlc3Npb24gPSBkYXRhLmNoaWxkKCd1c2VycycpLnZhbCgpLmNsZWFuKHVuZGVmaW5lZCkubGVuZ3RoO1xyXG4gICAgZGF0YS5jaGlsZCgndXNlcnMnKS5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU25hcHNob3QpIHtcclxuICAgICAgLy8gaWYgd2UndmUgZm91bmQgdGhlIHJlZiB0aGF0IHJlcHJlc2VudHMgdGhlIGdpdmVuIHBlZXIsIHJlbW92ZSBpdFxyXG4gICAgICBpZiAoY2hpbGRTbmFwc2hvdC52YWwoKSAmJiBjaGlsZFNuYXBzaG90LnZhbCgpLnBlZXJJZCA9PSB0aGlzLnBlZXJJZCkge1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcbiAgICAgICAgLy8gaWYgdGhpcyB1c2VyIHdhcyB0aGUgbGFzdCBvbmUgaW4gdGhlIHNlc3Npb24sIG5vdyB0aGVyZSBhcmUgMCwgXHJcbiAgICAgICAgLy8gc28gZGVsZXRlIHRoZSBzZXNzaW9uXHJcbiAgICAgICAgaWYgKG51bVVzZXJzSW5TZXNzaW9uID09IDEpIHtcclxuICAgICAgICAgIGRlbGV0ZVNlc3Npb24uY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBpZiBpdCB3YXMgZnVsbCwgbm93IGl0IGhhcyBvbmUgb3BlbiBzbG90LCBzZXQgaXQgdG8gYXZhaWxhYmxlXHJcbiAgICAgICAgICBpZiAobnVtVXNlcnNJblNlc3Npb24gPT0gdGhpcy5NQVhfVVNFUlNfUEVSX1NFU1NJT04pIHtcclxuICAgICAgICAgICAgbW92ZVNlc3Npb25Gcm9tRnVsbFRvQXZhaWxhYmxlLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOZXdTZXNzaW9uRGF0YSh1c2VybmFtZSwgcGVlcklkKSB7XHJcbiAgdmFyIHNlc3Npb25JZCA9IGNyZWF0ZU5ld1Nlc3Npb25JZC5jYWxsKHRoaXMpO1xyXG4gIHJldHVybiB7XHJcbiAgICBpZDogc2Vzc2lvbklkLFxyXG4gICAgaG9zdFBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcnM6IFt7XHJcbiAgICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgIH1dXHJcbiAgfTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nVXBkYXRlVGltZShsYXN0VXBkYXRlVGltZSwgc2Vzc2lvbklkLCBpc1RoZUxhc3RTZXNzaW9uLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICAvLyBpZiB0aGUgc2Vzc2lvbiBpcyBzdGlsbCBhY3RpdmUgam9pbiBpdFxyXG4gIGlmIChsYXN0VXBkYXRlVGltZSkge1xyXG4gICAgaWYgKCFpc1RpbWVvdXRUb29Mb25nLmNhbGwodGhpcywgbGFzdFVwZGF0ZVRpbWUpKSB7XHJcbiAgICAgIGpvaW5FeGlzdGluZ1Nlc3Npb24uY2FsbCh0aGlzLCBzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZFNlc3Npb25DYWxsYmFjayk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zLmNhbGwodGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIGlmIHdlIGdvdCBoZXJlLCBhbmQgdGhpcyBpcyB0aGUgbGFzdCBzZXNzaW9uLCB0aGF0IG1lYW5zIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgc2Vzc2lvbnNcclxuICAvLyBzbyBjcmVhdGUgb25lXHJcbiAgaWYgKGlzVGhlTGFzdFNlc3Npb24pIHtcclxuICAgIGNvbnNvbGUubG9nKCdubyBhdmFpbGFibGUgc2Vzc2lvbnMgZm91bmQsIG9ubHkgaW5hY3RpdmUgb25lcywgc28gY3JlYXRpbmcgYSBuZXcgb25lLi4uJyk7XHJcbiAgICB2YXIgc2Vzc2lvbkRhdGEgPSBjcmVhdGVOZXdTZXNzaW9uRGF0YS5jYWxsKHRoaXMsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgY3JlYXRlTmV3U2Vzc2lvbkluRmlyZWJhc2UuY2FsbCh0aGlzLCB1c2VybmFtZSwgcGVlcklkLCBzZXNzaW9uRGF0YSk7XHJcbiAgICBqb2luZWRTZXNzaW9uQ2FsbGJhY2soc2Vzc2lvbkRhdGEsIHRydWUpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkxhc3RVcGRhdGVUaW1lKHNlc3Npb25JZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWVDYWxsYmFjaywgaXNUaGVMYXN0U2Vzc2lvbikge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoZGF0YS52YWwoKSAmJiBkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdmb3VuZCB1cGRhdGUgdGltZTogJyArIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpXHJcbiAgICAgIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrKGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUsIHNlc3Npb25JZCwgaXNUaGVMYXN0U2Vzc2lvbiwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLCBzZWxmKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlclBpbmcoKSB7XHJcbiAgc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZS5jYWxsKHRoaXMpO1xyXG4gIHdpbmRvdy5zZXRJbnRlcnZhbChzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlLmJpbmQodGhpcyksIDEwMDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlcih3aW5kb3dPYmplY3QpIHtcclxuICBpZiAodHlwZW9mKHdpbmRvd09iamVjdC5Xb3JrZXIpICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICB0aGlzLm15V29ya2VyID0gbmV3IFdvcmtlcihcImFzeW5jbWVzc2FnZXIuanNcIik7XHJcbiAgICB0aGlzLm15V29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBwcm9jZXNzTWVzc2FnZUV2ZW50LmJpbmQodGhpcyksIGZhbHNlKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coXCJTb3JyeSwgeW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViIFdvcmtlcnMuLi5cIik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVTZXNzaW9ucygpIHtcclxuICAvLyBkbyBpdCBvbiBhIHdlYiB3b3JrZXIgdGhyZWFkXHJcbiAgaWYgKHRoaXMubXlXb3JrZXIpIHtcclxuICAgIHRoaXMubXlXb3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICBjbWQ6ICdjbGVhbnVwX2luYWN0aXZlX3Nlc3Npb25zJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZSgpIHtcclxuICBjb25zb2xlLmxvZygncGluZ2luZyBzZXJ2ZXInKTtcclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHRoaXMuam9pbmVkU2Vzc2lvbikuY2hpbGQoJ2xhc3RVcGRhdGVUaW1lJykuc2V0KChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwU2Vzc2lvbnMoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICBjb25zb2xlLmxvZygnY2xlYW5pbmcgdXAgaW5hY3RpdmUgc2Vzc2lvbnMnKTtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YVNuYXBzaG90KSB7XHJcbiAgICBkYXRhU25hcHNob3QuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIHZhciBzaG91bGREZWxldGVTZXNzaW9uID0gZmFsc2U7XHJcbiAgICAgIHZhciBzZXNzaW9uRGF0YSA9IGNoaWxkU25hcHNob3QudmFsKCk7XHJcbiAgICAgIGlmICghc2Vzc2lvbkRhdGEpIHtcclxuICAgICAgICBzaG91bGREZWxldGVTZXNzaW9uID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoc2Vzc2lvbkRhdGEudXNlcnMgPT0gbnVsbCB8fCBzZXNzaW9uRGF0YS51c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzZXNzaW9uIGhhcyBubyB1c2VycycpO1xyXG4gICAgICAgIHNob3VsZERlbGV0ZVNlc3Npb24gPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChpc1RpbWVvdXRUb29Mb25nLmNhbGwoc2VsZiwgc2Vzc2lvbkRhdGEubGFzdFVwZGF0ZVRpbWUpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJzZXNzaW9uIGhhc24ndCBiZWVuIHVwZGF0ZWQgc2luY2UgXCIgKyBzZXNzaW9uRGF0YS5sYXN0VXBkYXRlVGltZSk7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlU2Vzc2lvbiA9IHRydWU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChzaG91bGREZWxldGVTZXNzaW9uKSB7XHJcbiAgICAgICAgZGVsZXRlU2Vzc2lvbi5jYWxsKHNlbGYsIGNoaWxkU25hcHNob3QubmFtZSgpKTtcclxuICAgICAgICBjaGlsZFNuYXBzaG90LnJlZigpLnJlbW92ZSgpO1xyXG5cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBpc1RpbWVvdXRUb29Mb25nKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgaWYgKCFsYXN0VXBkYXRlVGltZSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICB2YXIgY3VycmVudFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIHJldHVybiAoY3VycmVudFRpbWUgLSBsYXN0VXBkYXRlVGltZSA+IHRoaXMuU0VTU0lPTl9DTEVBTlVQX1RJTUVPVVQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzTWVzc2FnZUV2ZW50KGV2ZW50KSB7XHJcbiAgc3dpdGNoIChldmVudC5kYXRhKSB7XHJcbiAgICBjYXNlICdjbGVhbnVwX2luYWN0aXZlX3Nlc3Npb25zJzpcclxuICAgICAgY2xlYW51cFNlc3Npb25zLmNhbGwodGhpcyk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZmluZE5ld0hvc3RQZWVySWQoc2Vzc2lvbklkLCBleGlzdGluZ0hvc3RQZWVySWQsIGNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyByZXNldCB0aGUgaG9zdFBlZXJJZCBzbyBpdCBwcmV2ZW50cyB0aGUgbGVhdmluZyBob3N0J3MgYnJvd3NlclxyXG4gIC8vIGlmIGl0IHRyaWVzIHRvIHN3aXRjaCBhZ2FpbiBiZWZvcmUgdGhpcyBpcyBkb25lXHJcbiAgdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpLmNoaWxkKCdob3N0UGVlcklkJykucmVtb3ZlKCk7XHJcblxyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIHZhciB1c2VycyA9IGRhdGEuY2hpbGQoJ3VzZXJzJykudmFsKCk7XHJcblxyXG4gICAgLy8gaWYgZm9yIHdoYXRldmVyIHJlYXNvbiB0aGlzIGlzIGNhbGxlZCBhbmQgc29tZXRoaW5nJ3Mgbm90IHJpZ2h0LCBqdXN0XHJcbiAgICAvLyByZXR1cm5cclxuICAgIGlmICghdXNlcnMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHVzZXJzID0gdXNlcnMuY2xlYW4odW5kZWZpbmVkKTtcclxuICAgIGlmICh1c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAodXNlcnNbaV0gJiYgdXNlcnNbaV0ucGVlcklkICE9IGV4aXN0aW5nSG9zdFBlZXJJZCkge1xyXG4gICAgICAgIC8vIHdlJ3ZlIGZvdW5kIGEgbmV3IHVzZXIgdG8gYmUgdGhlIGhvc3QsIHJldHVybiB0aGVpciBpZFxyXG4gICAgICAgIGNhbGxiYWNrKHNlc3Npb25JZCwgdXNlcnNbaV0ucGVlcklkKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2FsbGJhY2soc2Vzc2lvbklkLCBudWxsKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc3dpdGNoVG9OZXdIb3N0KHNlc3Npb25JZCwgbmV3SG9zdFBlZXJJZCkge1xyXG4gIGlmICghbmV3SG9zdFBlZXJJZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5zZXQobmV3SG9zdFBlZXJJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlbGV0ZVNlc3Npb24oc2Vzc2lvbklkKSB7XHJcbiAgcmVtb3ZlU2Vzc2lvbkZyb21BdmFpbGFibGVTZXNzaW9ucy5jYWxsKHRoaXMsIHNlc3Npb25JZCk7XHJcbiAgcmVtb3ZlU2Vzc2lvbkZyb21GdWxsU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIHJlbW92ZVNlc3Npb24uY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVTZXNzaW9uKHNlc3Npb25JZCkge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3U2Vzc2lvbkluRmlyZWJhc2UodXNlcm5hbWUsIHBlZXJJZCwgc2Vzc2lvbkRhdGEpIHtcclxuICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IHNlc3Npb24nKTtcclxuICB2YXIgbmV3U2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25EYXRhLmlkKTtcclxuICBuZXdTZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbkRhdGEpO1xyXG4gIHZhciBuZXdBdmFpbGFibGVTZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbkRhdGEuaWQpO1xyXG4gIG5ld0F2YWlsYWJsZVNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uRGF0YS5pZCk7XHJcbiAgdGhpcy5qb2luZWRTZXNzaW9uID0gc2Vzc2lvbkRhdGEuaWQ7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3U2Vzc2lvbklkKCkge1xyXG4gIC8vIFRPRE86IHJlcGxhY2UgdGhpcyB3aXRoIHNvbWV0aGluZyB0aGF0IHdvbid0XHJcbiAgLy8gYWNjaWRlbnRhbGx5IGhhdmUgY29sbGlzaW9uc1xyXG4gIHJldHVybiBnZXRSYW5kb21JblJhbmdlKDEsIDEwMDAwMDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gam9pbkV4aXN0aW5nU2Vzc2lvbihzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZFNlc3Npb25DYWxsYmFjaykge1xyXG4gIC8vIGlmIGEgc2Vzc2lvbiBoYXMgYWxyZWFkeSBiZWVuIGpvaW5lZCBvbiBhbm90aGVyIHRocmVhZCwgZG9uJ3Qgam9pbiBhbm90aGVyIG9uZVxyXG4gIGlmICh0aGlzLmpvaW5lZFNlc3Npb24gJiYgdGhpcy5qb2luZWRTZXNzaW9uID49IDApIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5qb2luZWRTZXNzaW9uID0gc2Vzc2lvbklkO1xyXG4gIGFzeW5jR2V0U2Vzc2lvbkRhdGEuY2FsbCh0aGlzLCBzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2suYmluZCh0aGlzKSwgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLmJpbmQodGhpcyksIGRvbmVHZXR0aW5nU2Vzc2lvbkRhdGEuYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBhc3luY0dldFNlc3Npb25EYXRhKHNlc3Npb25JZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLCBkb25lR2V0dGluZ1Nlc3Npb25EYXRhQ2FsbGJhY2spIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBkb25lR2V0dGluZ1Nlc3Npb25EYXRhQ2FsbGJhY2soZGF0YSwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZG9uZUdldHRpbmdTZXNzaW9uRGF0YShzZXNzaW9uRGF0YVNuYXBzaG90LCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICB2YXIgc2Vzc2lvbkRhdGEgPSBzZXNzaW9uRGF0YVNuYXBzaG90LnZhbCgpO1xyXG4gIHZhciBuZXdVc2VyID0ge1xyXG4gICAgcGVlcklkOiBwZWVySWQsXHJcbiAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICB9O1xyXG4gIC8vIHdlaXJkbmVzczogaSB3YW50IHRvIGp1c3QgcHVzaCBuZXdVc2VyIG9udG8gc2Vzc2lvbkRhdGEudXNlcnMsIGJ1dFxyXG4gIC8vIHRoYXQgbWVzc2VzIHVwIHRoZSBhcnJheSBJIGd1ZXNzXHJcbiAgdmFyIHVzZXJzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoc2Vzc2lvbkRhdGEudXNlcnNbaV0pIHtcclxuICAgICAgdXNlcnNBcnJheS5wdXNoKHNlc3Npb25EYXRhLnVzZXJzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbiAgdXNlcnNBcnJheS5wdXNoKG5ld1VzZXIpO1xyXG4gIHNlc3Npb25EYXRhLnVzZXJzID0gdXNlcnNBcnJheTtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSBzZXNzaW9uRGF0YVNuYXBzaG90LnJlZigpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uRGF0YSk7XHJcbiAgY29uc29sZS5sb2coJ2pvaW5pbmcgc2Vzc2lvbiAnICsgc2Vzc2lvbkRhdGEuaWQpO1xyXG4gIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4gIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIHNlc3Npb24uIFNvIHRyaW0gb3V0IHRoZSBcclxuICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gIGlmICh1c2Vyc0FycmF5Lmxlbmd0aCA9PSB0aGlzLk1BWF9VU0VSU19QRVJfU0VTU0lPTikge1xyXG4gICAgc2V0U2Vzc2lvblRvRnVsbC5jYWxsKHRoaXMsIHNlc3Npb25EYXRhLmlkKTtcclxuICB9XHJcbiAgdmFyIHBlZXJJZHNBcnJheSA9IFtdO1xyXG4gIGZvciAodmFyIGogPSAwOyBqIDwgc2Vzc2lvbkRhdGEudXNlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgIHBlZXJJZHNBcnJheS5wdXNoKHNlc3Npb25EYXRhLnVzZXJzW2pdLnBlZXJJZCk7XHJcbiAgfVxyXG4gIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2socGVlcklkc0FycmF5KTtcclxuICBpbml0aWFsaXplU2VydmVyUGluZy5jYWxsKHRoaXMpO1xyXG4gIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgZmFsc2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRTZXNzaW9uVG9GdWxsKHNlc3Npb25JZCkge1xyXG4gIHRoaXMucmVtb3ZlU2Vzc2lvbkZyb21BdmFpbGFibGVTZXNzaW9ucyhzZXNzaW9uSWQpO1xyXG4gIHRoaXMuYWRkU2Vzc2lvblRvRnVsbFNlc3Npb25zTGlzdChzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVTZXNzaW9uRnJvbUF2YWlsYWJsZVNlc3Npb25zKHNlc3Npb25JZCkge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkU2Vzc2lvblRvRnVsbFNlc3Npb25zTGlzdChzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5GVUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlU2Vzc2lvbkZyb21GdWxsVG9BdmFpbGFibGUoc2Vzc2lvbklkKSB7XHJcbiAgcmVtb3ZlU2Vzc2lvbkZyb21GdWxsU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIGFkZFNlc3Npb25Ub0F2YWlsYWJsZVNlc3Npb25zTGlzdC5jYWxsKHRoaXMsIHNlc3Npb25JZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVNlc3Npb25Gcm9tRnVsbFNlc3Npb25zKHNlc3Npb25JZCkge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkZVTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZFNlc3Npb25Ub0F2YWlsYWJsZVNlc3Npb25zTGlzdChzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYuc2V0KHNlc3Npb25JZCk7XHJcbn1cclxuXHJcblxyXG4vLyAvLyByZXR1cm5zIG51bGwgaWYgdGhlIHVzZXIgd2Fzbid0IGZvdW5kIGluIHRoZSBzZXNzaW9uXHJcbi8vIGZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tU2Vzc2lvbkRhdGEocGVlcklkLCBzZXNzaW9uRGF0YSkge1xyXG4vLyAgIC8vIGlmIHNvbWV0aGluZydzIHdyb25nLCBqdXN0IHJldHVyblxyXG4vLyAgIGlmICghc2Vzc2lvbkRhdGEgfHwgIXNlc3Npb25EYXRhLnVzZXJzKSB7XHJcbi8vICAgICByZXR1cm4gbnVsbDtcclxuLy8gICB9XHJcblxyXG4vLyAgIC8vIFRPRE86IEZpcmViYXNlIGhhcyBhIGJldHRlciB3YXkgb2YgZG9pbmcgdGhpc1xyXG4vLyAgIHZhciBmb3VuZFBlZXIgPSBmYWxzZTtcclxuXHJcbi8vICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbi8vICAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgc2Vzc2lvbi4gU28gdHJpbSBvdXQgdGhlIFxyXG4vLyAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbi8vICAgc2Vzc2lvbkRhdGEudXNlcnMgPSBzZXNzaW9uRGF0YS51c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG5cclxuLy8gICB1c2Vyc1dpdGhvdXRQZWVyID0gW107XHJcbi8vICAgZm9yIChpID0gMDsgaSA8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbi8vICAgICBpZiAoc2Vzc2lvbkRhdGEudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4vLyAgICAgICBmb3VuZFBlZXIgPSB0cnVlO1xyXG4vLyAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgdXNlcnNXaXRob3V0UGVlci5wdXNoKHNlc3Npb25EYXRhLnVzZXJzW2ldKTtcclxuLy8gICAgIH1cclxuLy8gICB9XHJcblxyXG4vLyAgIGlmIChmb3VuZFBlZXIpIHtcclxuLy8gICAgIHNlc3Npb25EYXRhLnVzZXJzID0gdXNlcnNXaXRob3V0UGVlcjtcclxuLy8gICAgIHJldHVybiBzZXNzaW9uRGF0YTtcclxuLy8gICB9IGVsc2Uge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfSJdfQ==
