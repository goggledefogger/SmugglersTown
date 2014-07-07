(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
  this.matchmakerTown.joinOrCreateSession(this.username, this.peer.id, gameJoined.bind(this))
}

/*
 * Called when the matchmaker has found a game for us
 *
 */

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
    // P2P connect to all other users
    var userIds = sessionData.users.map(function(userObj) {
      return userObj.peerId;
    });
    connectToAllOtherUsers.call(this, userIds);
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


function connectToAllOtherUsers(allPeerIds) {
  for (var i = 0; i < allPeerIds.length; i++) {
    if (allPeerIds[i] != this.peer.id) {
      connectToPeer.call(this, allPeerIds[i]);
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
  window.onbeforeunload = disconnectFromGame.bind(this);
}

function disconnectFromGame() {
  if (this.peer && this.peer.id && this.gameId) {
    this.matchmakerTown.removePeerFromSession(this.gameId, this.peer.id);
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
  this.matchmakerTown.removePeerFromSession(this.gameId, otherUserPeerId);

  if (this.hostPeerId == otherUserPeerId) {
    // if that user was the host, set us as the new host
    this.hostPeerId = this.peer.id;
    this.matchmakerTown.switchToNewHost(this.gameId, this.peer.id);
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
    var timeSinceLastTransfer = ((new Date()).getTime()) - this.timeOfLastTransfer;
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
  this.gameDataObject.peerIdOfCarWithItem = this.peer.id;
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
    if (!this.collectedItem && collisionMarker == this.itemMapObject.marker) {
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
          host_user: this.peer.id,
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
        user_id_of_car_that_returned_item: this.peer.id,
        now_num_items: this.gameDataObject.teamTownObject.numItemsReturned,
      }
    });
  }
}

function broadcastItemCollected(itemId) {
  console.log('broadcasting item id ' + itemId + ' collected by user ' + this.peer.id);
  for (var user in this.otherUsers) {
    if (!this.otherUsers[user].peerJsConnection || !this.otherUsers[user].peerJsConnection.open) {
      return;
    }
    this.gameDataObject.peerIdOfCarWithItem = this.peer.id;
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
        originating_peer_id: this.peer.id
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
},{"./matchmaker.js":2}],2:[function(require,module,exports){
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
 *  joinOrCreateSession(username, peerId, joinedSessionCallback)
 *
 *  username: Display name of user
 *  peerId: Unique user ID
 *  joinedSessionCallback(sessionData, isNewGame):
 *     Will be called at the end when
 *     we either joined or created a game
 *
 *  sessionData: of this form
 *  {
 *    "hostPeerId": "87b3fvv9ezgaxlxr",
 *    "id": 9116827,
 *    "lastUpdateTime": 1404707577851,
 *    "users": [{
 *      "peerId": "87b3fvv9ezgaxlxr",
 *      "username": "Ninja Roy"
 *    }, {
 *      "peerId": "r6isnaab5aikvs4i",
 *       "username": "Town Crusher"
 *   }]
 *  }
 */
MatchmakerTown.prototype.joinOrCreateSession = function(username, peerId, joinedSessionCallback) {
  var self = this;

  // if there are any inactive sessions clean them up
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
            getSessionLastUpdateTime.call(
              self,
              sessionId,
              username,
              peerId,
              joinedSessionCallback,
              doneGettingUpdateTime.bind(self),
              counter == numAvailableSessions);
          }
        }
      }
    }
  });
}


/**
 * removePeerFromSession(sessionId, peerId):
 * remove a peer from the session
 *
 */
MatchmakerTown.prototype.removePeerFromSession = function(sessionId, peerId) {
  var self = this;

  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.once('value', function(data) {
    if (!data.val()) {
      // something's wrong, probably the Firebase data was deleted
      return;
    }
    if (data.val().hostPeerId == peerId) {
      findNewHostPeerId.call(self, sessionId, peerId, switchToNewHost);
    }

    // Firebase weirdness: the users array can still have undefined elements
    // which represents users that have left the session. So trim out the 
    // undefined elements to see the actual array of current users
    var numUsersInSession = data.child('users').val().clean(undefined).length;
    data.child('users').forEach(function(childSnapshot) {
      // if we've found the ref that represents the given peer, remove it
      if (childSnapshot.val() && childSnapshot.val().peerId == peerId) {
        childSnapshot.ref().remove();
        // if this user was the last one in the session, now there are 0, 
        // so delete the session
        if (numUsersInSession == 1) {
          deleteSession.call(self, sessionId);
        } else {
          // if it was full, now it has one open slot, set it to available
          if (numUsersInSession == self.MAX_USERS_PER_SESSION) {
            moveSessionFromFullToAvailable.call(self, sessionId);
          }
        }
      }
    });
  });
}

/*
 * switchToNewHost(sessionId, newHostPeerId):
 * if for whatever reason there is a new host, store that in Firebase
 *
 */
MatchmakerTown.prototype.switchToNewHost = function(sessionId, newHostPeerId) {
  if (!newHostPeerId) {
    return;
  }
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).child('hostPeerId').set(newHostPeerId);
}


/*
 * private functions
 */

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

function doneGettingUpdateTime(lastUpdateTime, sessionId, isTheLastSession, username, peerId, joinedSessionCallback) {
  // if the session is still active join it
  if (lastUpdateTime) {
    if (!isTimeoutTooLong.call(this, lastUpdateTime)) {
      joinExistingSession.call(this, sessionId, username, peerId, joinedSessionCallback);
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

function getSessionLastUpdateTime(sessionId, username, peerId, joinedSessionCallback, doneGettingUpdateTimeCallback, isTheLastSession) {
  var self = this;
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).once('value', function(data) {
    if (data.val() && data.val().lastUpdateTime) {
      console.log('found update time: ' + data.val().lastUpdateTime)
      doneGettingUpdateTimeCallback(data.val().lastUpdateTime, sessionId, isTheLastSession, username, peerId, joinedSessionCallback, self);
    }
  });
}

function initializeServerPing() {
  setServerStatusAsStillActive.call(this);
  window.setInterval(setServerStatusAsStillActive.bind(this), 10000);
}

function initializeServerHelperWorker(windowObject) {
  if (typeof(windowObject.Worker) !== "undefined") {
    //TODO: make this a module
    this.myWorker = new Worker("asyncmessager.js");
    this.myWorker.addEventListener('message', processMessageEvent.bind(this), false);
  } else {
    console.log("Sorry, your browser does not support Web Workers...");
    // fine, we'll do it synchronously
    cleanupSessions.call(this);
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

function joinExistingSession(sessionId, username, peerId, joinedSessionCallback) {
  // if a session has already been joined on another thread, don't join another one
  if (this.joinedSession && this.joinedSession >= 0) {
    return;
  }
  this.joinedSession = sessionId;
  asyncGetSessionData.call(this, sessionId, username, peerId, joinedSessionCallback.bind(this), doneGettingSessionData.bind(this));
};

function asyncGetSessionData(sessionId, username, peerId, joinedSessionCallback, doneGettingSessionDataCallback) {
  var sessionDataRef = this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId);
  sessionDataRef.once('value', function(data) {
    doneGettingSessionDataCallback(data, username, peerId, joinedSessionCallback);
  });
}

function doneGettingSessionData(sessionDataSnapshot, username, peerId, joinedSessionCallback) {
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
  initializeServerPing.call(this);
  joinedSessionCallback(sessionData, false);
}

function setSessionToFull(sessionId) {
  removeSessionFromAvailableSessions.call(this, sessionId);
  addSessionToFullSessionsList.call(this, sessionId);
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
},{}],3:[function(require,module,exports){
var SmugglersTown = require('./mapgame.js');

$(document).ready(function() {
    var game = new SmugglersTown('https://smugglerstown.firebaseio.com/');
});
},{"./mapgame.js":1}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWFwZ2FtZS5qcyIsIkY6L1VzZXJzL0Rhbm55L1dlYnNpdGVzL1NtdWdnbGVyJ3MgVG93bi9tYXBnYW1lL21hdGNobWFrZXIuanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9zdGFydC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2tEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIFlPVVIgU01VR0dMRVIgTUlTU0lPTiwgSUYgWU9VIENIT09TRSBUTyBBQ0NFUFQsIElTIFRPIEpPSU4gVEVBTVxyXG4gKiBUT1dOIEFORCBUUlkgVE8gREVGRUFUIFRFQU0gQ1JVU0guICBBTkQgWU9VIE1VU1QgQUNDRVBULi4uXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBtYXBnYW1lLmpzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBkZXBzXHJcbiAqL1xyXG4vL3ZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XHJcbi8vdmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcclxudmFyIE1hdGNobWFrZXJUb3duID0gcmVxdWlyZSgnLi9tYXRjaG1ha2VyLmpzJyk7XHJcblxyXG4vKipcclxuICogIGV4cG9ydCBjbGFzc1xyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBTbXVnZ2xlcnNUb3duO1xyXG5cclxuLyoqXHJcbiAqICBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gU211Z2dsZXJzVG93bihmaXJlYmFzZUJhc2VVcmwpIHtcclxuXHJcbiAgLy8gYmluZCBwdWJsaWMgY2FsbGJhY2sgZnVuY3Rpb25zXHJcbiAgdGhpcy5pbml0aWFsaXplID0gdGhpcy5pbml0aWFsaXplLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5mcmFtZSA9IHRoaXMuZnJhbWUuYmluZCh0aGlzKTtcclxuICB0aGlzLm9uS2V5RG93biA9IHRoaXMub25LZXlEb3duLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5vbktleVVwID0gdGhpcy5vbktleVVwLmJpbmQodGhpcyk7XHJcblxyXG4gIHRoaXMua2VlcEFsaXZlUGFyYW1OYW1lID0gJ2tlZXBhbGl2ZSc7XHJcbiAgdGhpcy5xcyA9IG5ldyBRdWVyeVN0cmluZygpO1xyXG5cclxuICB0aGlzLm1hdGNobWFrZXJUb3duID0gbmV3IE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCk7XHJcblxyXG4gIHRoaXMubWFwID0gbnVsbDsgLy8gdGhlIG1hcCBjYW52YXMgZnJvbSB0aGUgR29vZ2xlIE1hcHMgdjMgamF2YXNjcmlwdCBBUElcclxuICB0aGlzLm1hcFpvb21MZXZlbCA9IDE4O1xyXG4gIHRoaXMubWFwRGF0YSA9IG51bGw7IC8vIHRoZSBsZXZlbCBkYXRhIGZvciB0aGlzIG1hcCAoYmFzZSBsb2NhdGlvbnMpXHJcblxyXG4gIHRoaXMuaXRlbU1hcE9iamVjdCA9IG51bGw7XHJcbiAgLy8gdGhlIGl0ZW1NYXBPYmplY3Qgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG5cclxuICAvLyBkZWZhdWx0IHRvIHRoZSBncmFuZCBjYW55b24sIGJ1dCB0aGlzIHdpbGwgYmUgbG9hZGVkIGZyb20gYSBtYXAgZmlsZVxyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZygzNi4xNTExMDMsIC0xMTMuMjA4NTY1KTtcclxuXHJcblxyXG5cclxuICAvLyBmb3IgdGltZS1iYXNlZCBnYW1lIGxvb3BcclxuICB0aGlzLm5vdztcclxuICB0aGlzLmR0ID0gMDtcclxuICB0aGlzLmxhc3QgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLnN0ZXAgPSAxIC8gNjA7XHJcblxyXG4gIC8vIHVzZXIgZGF0YVxyXG4gIHRoaXMudXNlcm5hbWUgPSBudWxsO1xyXG5cclxuICAvLyBnYW1lIGhvc3RpbmcgZGF0YVxyXG4gIHRoaXMuZ2FtZUlkID0gbnVsbDtcclxuICB0aGlzLmhvc3RQZWVySWQgPSBudWxsO1xyXG5cclxuICAvLyBjYXIgcHJvcGVydGllc1xyXG4gIHRoaXMucm90YXRpb24gPSAwO1xyXG4gIHRoaXMuZGVjZWxlcmF0aW9uID0gMS4xO1xyXG4gIHRoaXMuTUFYX05PUk1BTF9TUEVFRCA9IDE4O1xyXG4gIHRoaXMuTUFYX0JPT1NUX1NQRUVEID0gNDA7XHJcbiAgdGhpcy5CT09TVF9GQUNUT1IgPSAxLjA3O1xyXG4gIHRoaXMuQk9PU1RfQ09OU1VNUFRJT05fUkFURSA9IDAuNTtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IgPSAxMDAwMDAwO1xyXG4gIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IgPSA1MDAwMDA7XHJcblxyXG4gIC8vIGNvbGxpc2lvbiBlbmdpbmUgaW5mb1xyXG4gIHRoaXMuY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2UgPSAyMDtcclxuICB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlID0gNDM7XHJcblxyXG4gIC8vIG1hcCBkYXRhXHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgdGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgPSAwLjAwODsgLy8gaW4gbGF0aXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsb25naXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UgPSAzMDA7XHJcblxyXG4gIC8vIHRoZXNlIG1hcCBvYmplY3RzIHdpbGwgYmUgb2YgdGhlIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge1xyXG4gICAgbG9jYXRpb246IHRoaXMubWFwQ2VudGVyLFxyXG4gICAgbWFya2VyOiBudWxsXHJcbiAgfVxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IG51bGw7XHJcbiAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcblxyXG4gIC8vIGdhbWVwbGF5XHJcblxyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QgPSB7XHJcbiAgICB0ZWFtVG93bk9iamVjdDoge1xyXG4gICAgICB1c2VyczogW10sXHJcbiAgICAgIGJhc2VPYmplY3Q6IHtcclxuICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgICBsbmc6IC0xMTMuMjA4NTY1XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgICB9LFxyXG4gICAgdGVhbUNydXNoT2JqZWN0OiB7XHJcbiAgICAgIHVzZXJzOiBbXSxcclxuICAgICAgYmFzZU9iamVjdDoge1xyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBsYXQ6IDM2LjE1MTEwMyxcclxuICAgICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICAgIH0sXHJcbiAgICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogdGhpcy5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgIH1cclxuICB9O1xyXG4gIC8vIHRoaXMgd2lsbCBiZSBvZiB0aGUgZm9ybVxyXG4gIC8vIHtcclxuICAvLyAgIHRlYW1Ub3duT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgdGVhbUNydXNoT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgcGVlcklkT2ZDYXJXaXRoSXRlbTogbnVsbCxcclxuICAvLyAgIGluaXRpYWxMb2NhdGlvbjoge1xyXG4gIC8vICAgICBsYXQ6IDM1LFxyXG4gIC8vICAgICBsbmc6IC0xMzJcclxuICAvLyB9XHJcbiAgLy8gICBpdGVtT2JqZWN0OiB7XHJcbiAgLy8gICAgIGlkOiA1NzYsXHJcbiAgLy8gICAgIGxvY2F0aW9uOiB7XHJcbiAgLy8gICAgICAgbGF0OiAzNCxcclxuICAvLyAgICAgICBsbmc6IC0xMzNcclxuICAvLyAgICAgfVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcbiAgLy8gdGhlIDx0ZWFtX29iamVjdD4gc3RydWN0dXJlcyBhYm92ZSB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICB1c2VyczogW3tcclxuICAvLyAgICAgcGVlcklkOiAxMjM0NTY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiAncm95J1xyXG4gIC8vICAgfSwge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdoYW0nXHJcbiAgLy8gICB9XSxcclxuICAvLyAgIGJhc2VPYmplY3Q6IHtcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9LFxyXG4gIC8vICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIC8vIH1cclxuXHJcblxyXG5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIC8vIHNldCB0aGUgaW5pdGlhbCBkZXN0aW5hdGlvbiB0byB3aGF0ZXZlciwgaXQgd2lsbCBiZSByZXNldCBcclxuICAvLyB3aGVuIGFuIGl0ZW0gaXMgZmlyc3QgcGxhY2VkXHJcbiAgdGhpcy5kZXN0aW5hdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoNDUuNDg5MzkxLCAtMTIyLjY0NzU4Nik7XHJcbiAgdGhpcy50aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzID0gMTAwMDsgLy8gaW4gbXNcclxuICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IG51bGw7XHJcblxyXG4gIC8vIG9iamVjdCBvZiB0aGUgb3RoZXIgdXNlcnNcclxuICB0aGlzLm90aGVyVXNlcnMgPSB7fTtcclxuICAvLyB0aGUgb3RoZXJVc2VycyBkYXRhIHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIDEyMzQ1Njc4OToge1xyXG4gIC8vICAgICBwZWVySWQ6IDEyMzQ2Nzg5LFxyXG4gIC8vICAgICB1c2VybmFtZTogaGVsbG9yb3ksXHJcbiAgLy8gICAgIGNhcjoge1xyXG4gIC8vICAgICAgIGxvY2F0aW9uOiA8bG9jYXRpb25fb2JqZWN0PixcclxuICAvLyAgICAgICBtYXJrZXI6IDxtYXJrZXJfb2JqZWN0PlxyXG4gIC8vICAgICB9LFxyXG4gIC8vICAgICBwZWVySnNDb25uZWN0aW9uOiA8cGVlckpzQ29ubmVjdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICBsYXN0VXBkYXRlVGltZTogPHRpbWVfb2JqZWN0PixcclxuICAvLyAgICAgbnVtSXRlbXM6IDAsXHJcbiAgLy8gICAgIGhhc0JlZW5Jbml0aWFsaXplZDogdHJ1ZVxyXG4gIC8vICAgfSxcclxuICAvLyAgIDk4NzY1NDMyMToge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6IHRvd250b3duOTAwMCxcclxuICAvLyAgICAgY2FyOiB7XHJcbiAgLy8gICAgICAgbG9jYXRpb246IDxsb2NhdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICAgIG1hcmtlcjogPG1hcmtlcl9vYmplY3Q+XHJcbiAgLy8gICAgIH0sXHJcbiAgLy8gICAgIHBlZXJKc0Nvbm5lY3Rpb246IDxwZWVySnNDb25uZWN0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgIGxhc3RVcGRhdGVUaW1lOiA8dGltZV9vYmplY3Q+LFxyXG4gIC8vICAgICBudW1JdGVtczogNVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcbiAgLy8gaW1hZ2VzXHJcbiAgdGhpcy5pdGVtSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9zbW9raW5nX3RvaWxldF9zbWFsbC5naWYnXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hVc2VyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9jcnVzaF9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtVG93blVzZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1Ub3duT3RoZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3RlYW1fdG93bl9vdGhlcl9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtQ3J1c2hPdGhlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvdGVhbV9jcnVzaF9vdGhlcl9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9mb3J0LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9vcHBvbmVudF9mb3J0LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvZm9ydF90cmFuc3BhcmVudC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9vcHBvbmVudF9mb3J0X3RyYW5zcGFyZW50LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vIHBlZXIgSlMgY29ubmVjdGlvbiAoZm9yIG11bHRpcGxheWVyIHdlYlJUQylcclxuICB0aGlzLnBlZXIgPSBuZXcgUGVlcih7XHJcbiAgICBrZXk6ICdqM20wcXRkZGVzaHBrM3hyJ1xyXG4gIH0pO1xyXG4gIHRoaXMucGVlci5vbignb3BlbicsIGZ1bmN0aW9uKGlkKSB7XHJcbiAgICBjb25zb2xlLmxvZygnTXkgcGVlciBJRCBpczogJyArIGlkKTtcclxuICAgICQoJyNwZWVyLWlkJykudGV4dChpZCk7XHJcbiAgICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3dhaXRpbmcgZm9yIGEgc211Z2dsZXIgdG8gYmF0dGxlLi4uJyk7XHJcbiAgfSk7XHJcbiAgdGhpcy5wZWVyLm9uKCdjb25uZWN0aW9uJywgY29ubmVjdGVkVG9QZWVyLmJpbmQodGhpcykpO1xyXG4gIHRoaXMuQUNUSVZFX0NPTk5FQ1RJT05fVElNRU9VVF9JTl9TRUNPTkRTID0gMzAgKiAxMDAwO1xyXG5cclxuXHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkRG9tTGlzdGVuZXIod2luZG93LCAnbG9hZCcsIHRoaXMuaW5pdGlhbGl6ZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiAgaW5pdGlhbGl6ZSB0aGUgZ2FtZVxyXG4gKi9cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdGhpcy51c2VybmFtZSA9IHByb21wdCgnQ2hvb3NlIHlvdXIgU211Z2dsZXIgTmFtZTonLCAnTmluamEgUm95Jyk7XHJcbiAgY3JlYXRlTWFwT25QYWdlLmNhbGwodGhpcyk7XHJcbiAgbG9hZE1hcERhdGEuY2FsbCh0aGlzLCBtYXBJc1JlYWR5KTtcclxuXHJcbiAgLy8gdGhlc2UgYXJlIHNldCB0byB0cnVlIHdoZW4ga2V5cyBhcmUgYmVpbmcgcHJlc3NlZFxyXG4gIHRoaXMucmlnaHREb3duID0gZmFsc2U7XHJcbiAgdGhpcy5sZWZ0RG93biA9IGZhbHNlO1xyXG4gIHRoaXMudXBEb3duID0gZmFsc2U7XHJcbiAgdGhpcy5kb3duRG93biA9IGZhbHNlO1xyXG4gIHRoaXMuY3RybERvd24gPSBmYWxzZTtcclxuXHJcbiAgdGhpcy5zcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbiA9IDA7XHJcbiAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuXHJcbiAgLy90cnlGaW5kaW5nTG9jYXRpb24oKTtcclxuXHJcblxyXG4gIGJpbmRLZXlBbmRCdXR0b25FdmVudHMuY2FsbCh0aGlzKTtcclxuXHJcbiAgaW5pdGlhbGl6ZUJvb3N0QmFyLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIHN0YXJ0IHRoZSBnYW1lIGxvb3BcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5mcmFtZSk7XHJcbn1cclxuXHJcblNtdWdnbGVyc1Rvd24ucHJvdG90eXBlLmZyYW1lID0gZnVuY3Rpb24oKSB7XHJcbiAgdGhpcy5ub3cgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLmR0ID0gdGhpcy5kdCArIE1hdGgubWluKDEsICh0aGlzLm5vdyAtIHRoaXMubGFzdCkgLyAxMDAwKTtcclxuICB3aGlsZSAodGhpcy5kdCA+IHRoaXMuc3RlcCkge1xyXG4gICAgdGhpcy5kdCA9IHRoaXMuZHQgLSB0aGlzLnN0ZXA7XHJcbiAgICB1cGRhdGUuY2FsbCh0aGlzLCB0aGlzLnN0ZXApO1xyXG4gIH1cclxuICByZW5kZXIuY2FsbCh0aGlzLCB0aGlzLmR0KTtcclxuICB0aGlzLmxhc3QgPSB0aGlzLm5vdztcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5mcmFtZSk7XHJcbn1cclxuXHJcbi8vIGtleSBldmVudHNcclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUub25LZXlEb3duID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICB0aGlzLnJpZ2h0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgdGhpcy5sZWZ0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzOCkge1xyXG4gICAgdGhpcy51cERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIHRoaXMuZG93bkRvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMTcpIHtcclxuICAgIHRoaXMuY3RybERvd24gPSB0cnVlO1xyXG4gIH1cclxufVxyXG5cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUub25LZXlVcCA9IGZ1bmN0aW9uKGV2dCkge1xyXG4gIGlmIChldnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgdGhpcy5yaWdodERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICB0aGlzLmxlZnREb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzOCkge1xyXG4gICAgdGhpcy51cERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDQwKSB7XHJcbiAgICB0aGlzLmRvd25Eb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgdGhpcy5jdHJsRG93biA9IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVCb29zdEJhcigpIHtcclxuICAkKGZ1bmN0aW9uKCkge1xyXG4gICAgJChcIiNib29zdC1iYXJcIikucHJvZ3Jlc3NiYXIoe1xyXG4gICAgICB2YWx1ZTogMTAwXHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWFwSXNSZWFkeSgpIHtcclxuICB0aGlzLm1hdGNobWFrZXJUb3duLmpvaW5PckNyZWF0ZVNlc3Npb24odGhpcy51c2VybmFtZSwgdGhpcy5wZWVyLmlkLCBnYW1lSm9pbmVkLmJpbmQodGhpcykpXHJcbn1cclxuXHJcbi8qXHJcbiAqIENhbGxlZCB3aGVuIHRoZSBtYXRjaG1ha2VyIGhhcyBmb3VuZCBhIGdhbWUgZm9yIHVzXHJcbiAqXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gZ2FtZUpvaW5lZChzZXNzaW9uRGF0YSwgaXNOZXdHYW1lKSB7XHJcbiAgdGhpcy5nYW1lSWQgPSBzZXNzaW9uRGF0YS5pZDtcclxuXHJcbiAgaWYgKGlzTmV3R2FtZSkge1xyXG4gICAgLy8gd2UncmUgaG9zdGluZyB0aGUgZ2FtZSBvdXJzZWxmXHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSB0aGlzLnBlZXIuaWQ7XHJcblxyXG4gICAgLy8gZmlyc3QgdXNlciBpcyBhbHdheXMgb24gdGVhbSB0b3duXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzID0gW3tcclxuICAgICAgcGVlcklkOiB0aGlzLnBlZXIuaWQsXHJcbiAgICAgIHVzZXJuYW1lOiB0aGlzLnVzZXJuYW1lXHJcbiAgICB9XTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd5ZWxsb3cnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnY29sb3InLCAnYmxhY2snKTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gc29tZW9uZSBlbHNlIGlzIGFscmVhZHkgdGhlIGhvc3RcclxuICAgIHRoaXMuaG9zdFBlZXJJZCA9IHNlc3Npb25EYXRhLmhvc3RQZWVySWQ7XHJcbiAgICBhY3RpdmF0ZVRlYW1DcnVzaEluVUkuY2FsbCh0aGlzKTtcclxuICAgIC8vIFAyUCBjb25uZWN0IHRvIGFsbCBvdGhlciB1c2Vyc1xyXG4gICAgdmFyIHVzZXJJZHMgPSBzZXNzaW9uRGF0YS51c2Vycy5tYXAoZnVuY3Rpb24odXNlck9iaikge1xyXG4gICAgICByZXR1cm4gdXNlck9iai5wZWVySWQ7XHJcbiAgICB9KTtcclxuICAgIGNvbm5lY3RUb0FsbE90aGVyVXNlcnMuY2FsbCh0aGlzLCB1c2VySWRzKTtcclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG4gIHVwZGF0ZUNhckljb25zLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVzZXJuYW1lc0luVUkoKSB7XHJcbiAgdmFyIHRlYW1Ub3duSnF1ZXJ5RWxlbSA9ICQoJyN0ZWFtLXRvd24tdXNlcm5hbWVzJyk7XHJcbiAgdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbVRvd25KcXVlcnlFbGVtLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzKTtcclxuICB2YXIgdGVhbUNydXNoSnF1ZXJ5RWxlbSA9ICQoJyN0ZWFtLWNydXNoLXVzZXJuYW1lcycpO1xyXG4gIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1DcnVzaEpxdWVyeUVsZW0sIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtLCB1c2VyT2JqZWN0c0FycmF5KSB7XHJcbiAgLy8gY2xlYXIgdGhlIGN1cnJlbnQgbGlzdCBvZiB1c2VybmFtZXNcclxuICB0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbS5lbXB0eSgpO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlck9iamVjdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIG5ld0pxdWVyeUVsZW0gPSAkKCQucGFyc2VIVE1MKFxyXG4gICAgICAnPGxpIGlkPVwidXNlcm5hbWUtJyArXHJcbiAgICAgIHVzZXJPYmplY3RzQXJyYXlbaV0ucGVlcklkICtcclxuICAgICAgJ1wiPicgKyB1c2VyT2JqZWN0c0FycmF5W2ldLnVzZXJuYW1lICsgJzwvbGk+J1xyXG4gICAgKSk7XHJcbiAgICAkKHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtKS5hcHBlbmQobmV3SnF1ZXJ5RWxlbSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhY3RpdmF0ZVRlYW1DcnVzaEluVUkoKSB7XHJcbiAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnb3BhY2l0eScsICcxJyk7XHJcbiAgdmFyIHRlYW1DcnVzaFNjb3JlID0gMDtcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCkge1xyXG4gICAgdGVhbUNydXNoU2NvcmUgPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkO1xyXG4gIH1cclxuICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRlYW1DcnVzaFNjb3JlKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3RUb0FsbE90aGVyVXNlcnMoYWxsUGVlcklkcykge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYWxsUGVlcklkcy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKGFsbFBlZXJJZHNbaV0gIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBhbGxQZWVySWRzW2ldKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJpbmRLZXlBbmRCdXR0b25FdmVudHMoKSB7XHJcbiAgJCh3aW5kb3cpLnJlc2l6ZShmdW5jdGlvbigpIHtcclxuICAgIHJlc2l6ZU1hcFRvRml0LmNhbGwodGhpcyk7XHJcbiAgfSk7XHJcblxyXG4gICQoZG9jdW1lbnQpLmtleWRvd24odGhpcy5vbktleURvd24pO1xyXG4gICQoZG9jdW1lbnQpLmtleXVwKHRoaXMub25LZXlVcCk7XHJcbiAgJCgnI2Nvbm5lY3QtYnV0dG9uJykuY2xpY2soZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICB2YXIgcGVlcklkID0gJCgnI3BlZXItaWQtdGV4dGJveCcpLnZhbCgpO1xyXG4gICAgY29uc29sZS5sb2coJ3BlZXIgaWQgY29ubmVjdGluZzogJyArIHBlZXJJZCk7XHJcbiAgICBjb25uZWN0VG9QZWVyLmNhbGwodGhpcywgcGVlcklkKTtcclxuICB9KTtcclxuICAkKCcjc2V0LWNlbnRlci1idXR0b24nKS5jbGljayhmdW5jdGlvbihldnQpIHtcclxuICAgIHZhciBzZWFyY2hUZXJtID0gJCgnI21hcC1jZW50ZXItdGV4dGJveCcpLnZhbCgpO1xyXG4gICAgaWYgKCFzZWFyY2hUZXJtKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdzZXR0aW5nIGNlbnRlciB0bzogJyArIHNlYXJjaFRlcm0pO1xyXG4gICAgc2VhcmNoQW5kQ2VudGVyTWFwLmNhbGwodGhpcywgc2VhcmNoVGVybSk7XHJcbiAgICBicm9hZGNhc3ROZXdMb2NhdGlvbi5jYWxsKHRoaXMsIHRoaXMubWFwQ2VudGVyKTtcclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICB9KTtcclxuICB3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBkaXNjb25uZWN0RnJvbUdhbWUuYmluZCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzY29ubmVjdEZyb21HYW1lKCkge1xyXG4gIGlmICh0aGlzLnBlZXIgJiYgdGhpcy5wZWVyLmlkICYmIHRoaXMuZ2FtZUlkKSB7XHJcbiAgICB0aGlzLm1hdGNobWFrZXJUb3duLnJlbW92ZVBlZXJGcm9tU2Vzc2lvbih0aGlzLmdhbWVJZCwgdGhpcy5wZWVyLmlkKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU1hcE9uUGFnZSgpIHtcclxuICB2YXIgbWFwT3B0aW9ucyA9IHtcclxuICAgIHpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgY2VudGVyOiB0aGlzLm1hcENlbnRlcixcclxuICAgIGtleWJvYXJkU2hvcnRjdXRzOiBmYWxzZSxcclxuICAgIG1hcFR5cGVJZDogZ29vZ2xlLm1hcHMuTWFwVHlwZUlkLlNBVEVMTElURSxcclxuICAgIGRpc2FibGVEZWZhdWx0VUk6IHRydWUsXHJcbiAgICBtaW5ab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIG1heFpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgc2Nyb2xsd2hlZWw6IGZhbHNlLFxyXG4gICAgZGlzYWJsZURvdWJsZUNsaWNrWm9vbTogdHJ1ZSxcclxuICAgIGRyYWdnYWJsZTogZmFsc2UsXHJcbiAgfVxyXG5cclxuICB0aGlzLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcC1jYW52YXMnKSwgbWFwT3B0aW9ucyk7XHJcblxyXG4gIC8vIG5vdCBuZWNlc3NhcnksIGp1c3Qgd2FudCB0byBhbGxvdyB0aGUgcmlnaHQtY2xpY2sgY29udGV4dCBtZW51XHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsICdjbGljaycsIGZ1bmN0aW9uKGUpIHtcclxuICAgIGNvbnRleHRtZW51OiB0cnVlXHJcbiAgfSk7XHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkTGlzdGVuZXIodGhpcy5tYXAsIFwicmlnaHRjbGlja1wiLCB0aGlzLnNob3dDb250ZXh0TWVudSk7XHJcblxyXG4gIHJlc2l6ZU1hcFRvRml0LmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc2l6ZU1hcFRvRml0KCkge1xyXG4gICQoJ2JvZHknKS5oZWlnaHQoJCh3aW5kb3cpLmhlaWdodCgpIC0gMik7XHJcbiAgdmFyIG1haW5IZWlnaHQgPSAkKCdib2R5JykuaGVpZ2h0KCk7XHJcbiAgdmFyIGNvbnRlbnRIZWlnaHQgPVxyXG4gICAgJCgnI2hlYWRlcicpLm91dGVySGVpZ2h0KCkgK1xyXG4gICAgJCgnI2Zvb3RlcicpLm91dGVySGVpZ2h0KCk7XHJcbiAgdmFyIGggPSBtYWluSGVpZ2h0IC0gY29udGVudEhlaWdodDtcclxuICAkKCcjbWFwLWJvZHknKS5oZWlnaHQoaCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNlYXJjaEFuZENlbnRlck1hcChzZWFyY2hUZXJtKSB7XHJcbiAgdmFyIHBhcnRzID0gc2VhcmNoVGVybS5zcGxpdCgnLCcpO1xyXG4gIGlmICghcGFydHMpIHtcclxuICAgIC8vIGJhZCBzZWFyY2ggaW5wdXQsIG11c3QgYmUgaW4gbGF0LGxuZyBmb3JtXHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHZhciBsYXRTdHJpbmcgPSBwYXJ0c1swXTtcclxuICB2YXIgbG5nU3RyaW5nID0gcGFydHNbMV07XHJcbiAgc2V0R2FtZVRvTmV3TG9jYXRpb24uY2FsbCh0aGlzLCBsYXRTdHJpbmcsIGxuZ1N0cmluZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvYWRNYXBEYXRhKG1hcElzUmVhZHlDYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLm1hcERhdGFMb2FkZWQgPSBmYWxzZTtcclxuICBjb25zb2xlLmxvZygnbG9hZGluZyBtYXAgZGF0YScpO1xyXG5cclxuICAvLyBUT0RPOiBcclxuICAvLyB0byByZWFkIHN0YXRpYyBmaWxlcyBpblxyXG4gIC8vIHlvdSBuZWVkIHRvIHBhc3MgXCItdCBicmZzXCIgdG8gYnJvd3NlcmlmeVxyXG4gIC8vIGJ1dCBpdCdzIGNvb2wgY29zIHlvdSBjYW4gaW5saW5lIGJhc2U2NCBlbmNvZGVkIGltYWdlcyBvciB1dGY4IGh0bWwgc3RyaW5nc1xyXG4gIC8vJC5nZXRKU09OKFwibWFwcy9ncmFuZGNhbnlvbi5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAkLmdldEpTT04oXCJtYXBzL3BvcnRsYW5kLmpzb25cIiwgZnVuY3Rpb24oanNvbikge1xyXG4gICAgY29uc29sZS5sb2coJ21hcCBkYXRhIGxvYWRlZCcpO1xyXG4gICAgc2VsZi5tYXBEYXRhID0ganNvbjtcclxuICAgIHNlbGYubWFwRGF0YUxvYWRlZCA9IHRydWU7XHJcbiAgICBzZWxmLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLmNlbnRlckxhdExuZy5sbmcpO1xyXG4gICAgc2VsZi5tYXAuc2V0Q2VudGVyKHNlbGYubWFwQ2VudGVyKTtcclxuICAgIHNlbGYuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uID0ge1xyXG4gICAgICBsYXQ6IHNlbGYubWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICBsbmc6IHNlbGYubWFwQ2VudGVyLmxuZygpXHJcbiAgICB9O1xyXG5cclxuICAgIGNyZWF0ZVRlYW1Ub3duQmFzZS5jYWxsKHNlbGYsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtVG93bkJhc2VMYXRMbmcubG5nKTtcclxuICAgIGNyZWF0ZVRlYW1DcnVzaEJhc2UuY2FsbChzZWxmLCBzZWxmLm1hcERhdGEubWFwLnRlYW1DcnVzaEJhc2VMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLnRlYW1DcnVzaEJhc2VMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubXlUZWFtQmFzZU1hcE9iamVjdCA9IHNlbGYudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG5cclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbChzZWxmKTtcclxuICAgIG1hcElzUmVhZHlDYWxsYmFjay5jYWxsKHNlbGYpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2UobGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtVG93bkJhc2VPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdCA9IGNyZWF0ZVRlYW1DcnVzaEJhc2VPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBUb3duIGJhc2Ugb24gdGhlIG1hcCwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ICYmIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge307XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIHRpdGxlOiAnVGVhbSBUb3duIEJhc2UnLFxyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHBvc2l0aW9uOiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbVRvd25CYXNlSWNvblxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2VPYmplY3QobGF0LCBsbmcpIHtcclxuICB2YXIgdGVhbVRvd25CYXNlT2JqZWN0ID0ge307XHJcbiAgdGVhbVRvd25CYXNlT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcblxyXG4gIHJldHVybiB0ZWFtVG93bkJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QobGF0LCBsbmcpIHtcclxuICAvLyBpZiB0aGVyZSdzIGFscmVhZHkgYSB0ZWFtIENydXNoIGJhc2Ugb24gdGhlIG1hcCwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIHRpdGxlOiAnVGVhbSBDcnVzaCBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmxvY2F0aW9uLFxyXG4gICAgaWNvbjogdGhpcy50ZWFtQ3J1c2hCYXNlSWNvblxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcblxyXG4gIHZhciB0ZWFtQ3J1c2hCYXNlT2JqZWN0ID0ge307XHJcbiAgdGVhbUNydXNoQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbUNydXNoQmFzZU9iamVjdDtcclxufVxyXG5cclxuZnVuY3Rpb24gcmFuZG9tbHlQdXRJdGVtcygpIHtcclxuICB2YXIgcmFuZG9tTG9jYXRpb24gPSBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0uY2FsbCh0aGlzKTtcclxuICB2YXIgaXRlbUlkID0gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwLCAwKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICBpZDogaXRlbUlkLFxyXG4gICAgbG9jYXRpb246IHtcclxuICAgICAgbGF0OiByYW5kb21Mb2NhdGlvbi5sYXQoKSxcclxuICAgICAgbG5nOiByYW5kb21Mb2NhdGlvbi5sbmcoKVxyXG4gICAgfVxyXG4gIH1cclxuICBwdXROZXdJdGVtT25NYXAuY2FsbCh0aGlzLCByYW5kb21Mb2NhdGlvbiwgaXRlbUlkKTtcclxuICBicm9hZGNhc3ROZXdJdGVtLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUxvY2F0aW9uRm9ySXRlbSgpIHtcclxuICAvLyBGaW5kIGEgcmFuZG9tIGxvY2F0aW9uIHRoYXQgd29ya3MsIGFuZCBpZiBpdCdzIHRvbyBjbG9zZVxyXG4gIC8vIHRvIHRoZSBiYXNlLCBwaWNrIGFub3RoZXIgbG9jYXRpb25cclxuICB2YXIgcmFuZG9tTG9jYXRpb24gPSBudWxsO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMYXQgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubGF0KCk7XHJcbiAgdmFyIGNlbnRlck9mQXJlYUxuZyA9IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbi5sbmcoKTtcclxuICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgcmFuZG9tTGF0ID0gZ2V0UmFuZG9tSW5SYW5nZShjZW50ZXJPZkFyZWFMYXQgLVxyXG4gICAgICAodGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMYXQgKyAodGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCA3KTtcclxuICAgIHJhbmRvbUxuZyA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTG5nIC1cclxuICAgICAgKHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIGNlbnRlck9mQXJlYUxuZyArICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCA3KTtcclxuICAgIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gcHV0IGl0ZW0gYXQ6ICcgKyByYW5kb21MYXQgKyAnLCcgKyByYW5kb21MbmcpO1xyXG4gICAgcmFuZG9tTG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHJhbmRvbUxhdCwgcmFuZG9tTG5nKTtcclxuICAgIGlmIChnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2VlbihyYW5kb21Mb2NhdGlvbiwgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSA+IHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UpIHtcclxuICAgICAgcmV0dXJuIHJhbmRvbUxvY2F0aW9uO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ2l0ZW0gdG9vIGNsb3NlIHRvIGJhc2UsIGNob29zaW5nIGFub3RoZXIgbG9jYXRpb24uLi4nKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHB1dE5ld0l0ZW1Pbk1hcChsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgLy8gZXZlbnR1YWxseSB0aGlzIHNob3VsZCBiZSByZWR1bmRhbnQgdG8gY2xlYXIgdGhpcywgYnV0IHdoaWxlXHJcbiAgLy8gdGhlcmUncyBhIGJ1ZyBvbiBtdWx0aXBsYXllciBqb2luaW5nLCBjbGVhciBpdCBhZ2FpblxyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuXHJcbiAgLy8gc2V0IHRoZSBiYXNlIGljb24gaW1hZ2VzIHRvIGJlIHRoZSBsaWdodGVyIG9uZXNcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcblxyXG4gIC8vIGluIGNhc2UgdGhlcmUncyBhIGxpbmdlcmluZyBpdGVtLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy5pdGVtTWFwT2JqZWN0ICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIgJiYgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5tYXApIHtcclxuICAgIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdmFyIGl0ZW1NYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICB0aXRsZTogJ0l0ZW0nLFxyXG4gICAgaWNvbjogdGhpcy5pdGVtSWNvbixcclxuICAgIC8vIC8vVE9ETzogRklYIFNUVVBJRCBHT09HTEUgTUFQUyBCVUcgdGhhdCBjYXVzZXMgdGhlIGdpZiBtYXJrZXJcclxuICAgIC8vIC8vdG8gbXlzdGVyaW91c2x5IG5vdCBzaG93IHVwIHNvbWV0aW1lc1xyXG4gICAgLy8gb3B0aW1pemVkOiBmYWxzZSxcclxuICAgIHBvc2l0aW9uOiBsb2NhdGlvblxyXG4gIH0pO1xyXG5cclxuICB0aGlzLml0ZW1NYXBPYmplY3QgPSB7XHJcbiAgICBtYXJrZXI6IGl0ZW1NYXJrZXIsXHJcbiAgICBsb2NhdGlvbjogbG9jYXRpb25cclxuICB9O1xyXG5cclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gIH07XHJcblxyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgbG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICByZXR1cm4gaXRlbUlkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVCb29zdGluZygpIHtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIGlmICgkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKSB8fCAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKSA9PSAwKSB7XHJcbiAgICB2YXIgYm9vc3RCYXJWYWx1ZSA9ICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpO1xyXG4gICAgaWYgKHRoaXMuY3RybERvd24gJiYgYm9vc3RCYXJWYWx1ZSA+IDApIHtcclxuICAgICAgYm9vc3RCYXJWYWx1ZSAtPSB0aGlzLkJPT1NUX0NPTlNVTVBUSU9OX1JBVEU7XHJcbiAgICAgICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIsIGJvb3N0QmFyVmFsdWUpO1xyXG4gICAgICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfQk9PU1RfU1BFRUQ7XHJcbiAgICAgIHRoaXMuc3BlZWQgKj0gdGhpcy5CT09TVF9GQUNUT1I7XHJcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5zcGVlZCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSAtdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5zcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5ob3Jpem9udGFsU3BlZWQpID4gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8IDApIHtcclxuICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPD0gMCkge1xyXG4gICAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjYm9vc3QtYmFyJykpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRoaXMubWF4U3BlZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVDYXIoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IGhhbmRsZUJvb3N0aW5nLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIGlmIFVwIG9yIERvd24ga2V5IGlzIHByZXNzZWQsIGNoYW5nZSB0aGUgc3BlZWQuIE90aGVyd2lzZSxcclxuICAvLyBkZWNlbGVyYXRlIGF0IGEgc3RhbmRhcmQgcmF0ZVxyXG4gIGlmICh0aGlzLnVwRG93biB8fCB0aGlzLmRvd25Eb3duKSB7XHJcbiAgICBpZiAodGhpcy51cERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuc3BlZWQgPD0gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuc3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZG93bkRvd24pIHtcclxuICAgICAgaWYgKHRoaXMuc3BlZWQgPj0gLXRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkIC09IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfVxyXG5cclxuICAvLyBpZiBMZWZ0IG9yIFJpZ2h0IGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIGhvcml6b250YWwgc3BlZWQuXHJcbiAgLy8gT3RoZXJ3aXNlLCBkZWNlbGVyYXRlIGF0IGEgc3RhbmRhcmQgcmF0ZVxyXG4gIGlmICh0aGlzLmxlZnREb3duIHx8IHRoaXMucmlnaHREb3duKSB7XHJcbiAgICBpZiAodGhpcy5yaWdodERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCArPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5sZWZ0RG93bikge1xyXG4gICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPj0gLXRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoKCF0aGlzLnVwRG93biAmJiAhdGhpcy5kb3duRG93bikgfHwgKCF0aGlzLmN0cmxEb3duICYmIE1hdGguYWJzKHRoaXMuc3BlZWQpID4gdGhpcy5NQVhfTk9STUFMX1NQRUVEKSkge1xyXG4gICAgaWYgKHRoaXMuc3BlZWQgPiAtMC4wMSAmJiB0aGlzLnNwZWVkIDwgMC4wMSkge1xyXG4gICAgICB0aGlzLnNwZWVkID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuc3BlZWQgLz0gdGhpcy5kZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoKCF0aGlzLmxlZnREb3duICYmICF0aGlzLnJpZ2h0RG93bikgfHwgKCF0aGlzLmN0cmxEb3duICYmIE1hdGguYWJzKHRoaXMuaG9yaXpvbnRhbFNwZWVkKSA+IHRoaXMuTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA+IC0wLjAxICYmIHRoaXMuaG9yaXpvbnRhbFNwZWVkIDwgMC4wMSkge1xyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAvPSB0aGlzLmRlY2VsZXJhdGlvbjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIG9wdGltaXphdGlvbiAtIG9ubHkgaWYgdGhlIGNhciBpcyBtb3Zpbmcgc2hvdWxkIHdlIHNwZW5kXHJcbiAgLy8gdGltZSByZXNldHRpbmcgdGhlIG1hcFxyXG4gIGlmICh0aGlzLnNwZWVkICE9IDAgfHwgdGhpcy5ob3Jpem9udGFsU3BlZWQgIT0gMCkge1xyXG4gICAgdmFyIG5ld0xhdCA9IHRoaXMubWFwLmdldENlbnRlcigpLmxhdCgpICsgKHRoaXMuc3BlZWQgLyB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdmFyIG5ld0xuZyA9IHRoaXMubWFwLmdldENlbnRlcigpLmxuZygpICsgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIC8gdGhpcy5sb25naXR1ZGVTcGVlZEZhY3Rvcik7XHJcbiAgICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobmV3TGF0LCBuZXdMbmcpO1xyXG4gICAgdGhpcy5tYXAuc2V0Q2VudGVyKHRoaXMubWFwQ2VudGVyKTtcclxuXHJcbiAgfVxyXG5cclxuICByb3RhdGVDYXIuY2FsbCh0aGlzKTtcclxuICBpZiAodGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgIHJvdGF0ZUFycm93LmNhbGwodGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0VG9QZWVyKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd0cnlpbmcgdG8gY29ubmVjdCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICB2YXIgcGVlckpzQ29ubmVjdGlvbiA9IHRoaXMucGVlci5jb25uZWN0KG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignb3BlbicsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gb3BlbicpO1xyXG4gICAgY29ubmVjdGVkVG9QZWVyLmNhbGwoc2VsZiwgcGVlckpzQ29ubmVjdGlvbik7XHJcbiAgfSk7XHJcbiAgcGVlckpzQ29ubmVjdGlvbi5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiUEVFUkpTIEVSUk9SOiBcIik7XHJcbiAgICBjb25zb2xlLmxvZyhlcnIpO1xyXG4gICAgdGhyb3cgXCJQZWVySlMgY29ubmVjdGlvbiBlcnJvclwiO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb25uZWN0ZWRUb1BlZXIocGVlckpzQ29ubmVjdGlvbikge1xyXG4gIHZhciBvdGhlclVzZXJQZWVySWQgPSBwZWVySnNDb25uZWN0aW9uLnBlZXI7XHJcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ2Nvbm5lY3RlZCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgdGltZSB3ZSd2ZSBjb25uZWN0ZWQgdG8gdGhpcyB1ZXNyLFxyXG4gIC8vIGFkZCB0aGUgSFRNTCBmb3IgdGhlIG5ldyB1c2VyXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uLmNhbGwodGhpcywgcGVlckpzQ29ubmVjdGlvbiwgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGFzc2lnblVzZXJUb1RlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gICAgY3JlYXRlT3RoZXJVc2VyQ2FyLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVPdGhlclVzZXJDYXIob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlcklkID0gb3RoZXJVc2VyUGVlcklkO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLmNhciA9IHt9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25Vc2VyVG9UZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIGlmIHRoZSB1c2VyIGlzIGFscmVhZHkgb24gYSB0ZWFtLCBpZ25vcmUgdGhpc1xyXG4gIGlmIChpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpIHx8XHJcbiAgICBpc1VzZXJPblRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVzZXJPYmplY3QgPSB7XHJcbiAgICBwZWVySWQ6IG90aGVyVXNlclBlZXJJZCxcclxuICAgIHVzZXJuYW1lOiBudWxsXHJcbiAgfTtcclxuICAvLyBmb3Igbm93LCBqdXN0IGFsdGVybmF0ZSB3aG8gZ29lcyBvbiBlYWNoIHRlYW1cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggPiB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGgpIHtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSS5jYWxsKHRoaXMpO1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5wdXNoKHVzZXJPYmplY3QpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaXNVc2VyT25UZWFtKHBlZXJJZCwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlck9iamVjdHNBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHVzZXJPYmplY3RzQXJyYXlbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1JblVJKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjNjY3Jyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAncmVkJyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NicpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVBlZXJDb25uZWN0aW9uKHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdKSB7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSA9IHt9O1xyXG4gIH1cclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uID0gcGVlckpzQ29ubmVjdGlvbjtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLm9uKCdjbG9zZScsIGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ2Nsb3NpbmcgY29ubmVjdGlvbicpO1xyXG4gICAgb3RoZXJVc2VyRGlzY29ubmVjdGVkLmNhbGwoc2VsZiwgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9KTtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLm9uKCdkYXRhJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZGF0YVJlY2VpdmVkLmNhbGwoc2VsZiwgZGF0YSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZhZGVBcnJvd1RvSW1hZ2UoaW1hZ2VGaWxlTmFtZSkge1xyXG4gICQoXCIjYXJyb3ctaW1nXCIpLmF0dHIoJ3NyYycsICdpbWFnZXMvJyArIGltYWdlRmlsZU5hbWUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJEaXNjb25uZWN0ZWQob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gc2hvdWxkIGJlIGNhbGxlZCBhZnRlciB0aGUgcGVlckpzIGNvbm5lY3Rpb25cclxuICAvLyBoYXMgYWxyZWFkeSBiZWVuIGNsb3NlZFxyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHJlbW92ZVVzZXJGcm9tVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgcmVtb3ZlVXNlckZyb21VSS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIC8vIHJlbW92ZSB0aGlzIHVzZXIgZnJvbSB0aGUgZ2FtZSBpbiBGaXJlYmFzZTpcclxuICB0aGlzLm1hdGNobWFrZXJUb3duLnJlbW92ZVBlZXJGcm9tU2Vzc2lvbih0aGlzLmdhbWVJZCwgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgaWYgKHRoaXMuaG9zdFBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgIC8vIGlmIHRoYXQgdXNlciB3YXMgdGhlIGhvc3QsIHNldCB1cyBhcyB0aGUgbmV3IGhvc3RcclxuICAgIHRoaXMuaG9zdFBlZXJJZCA9IHRoaXMucGVlci5pZDtcclxuICAgIHRoaXMubWF0Y2htYWtlclRvd24uc3dpdGNoVG9OZXdIb3N0KHRoaXMuZ2FtZUlkLCB0aGlzLnBlZXIuaWQpO1xyXG4gIH1cclxuXHJcbiAgLy8gaWYgdGhlIHVzZXIgd2hvIGRpc2Nvbm5lY3RlZCBjdXJyZW50bHkgaGFkIGFuIGl0ZW0sXHJcbiAgLy8gcHV0IG91dCBhIG5ldyBvbmVcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtICYmIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBvdGhlclVzZXJQZWVySWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgLy8gZGVsZXRlIHRoYXQgdXNlcidzIGRhdGFcclxuICBkZWxldGUgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF07XHJcblxyXG4gIC8vIGlmIHRoZXJlIGFueSB1c2VycyBsZWZ0LCBicm9hZGNhc3QgdGhlbSB0aGUgbmV3IGdhbWUgc3RhdGVcclxuICBpZiAoT2JqZWN0LmtleXModGhpcy5vdGhlclVzZXJzKS5sZW5ndGggPiAwKSB7XHJcbiAgICBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzLmNhbGwodGhpcyk7XHJcbiAgfSBlbHNlIHtcclxuICAgICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnd2FpdGluZyBmb3IgYSBzbXVnZ2xlciB0byBiYXR0bGUuLi4nKTtcclxuICB9XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVc2VyRnJvbVRlYW0odXNlclBlZXJJZCkge1xyXG4gIGZvciAodmFyIGkgPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdXNlclBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLnNwbGljZShpLCAxKTtcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaiA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0ucGVlcklkID09IHVzZXJQZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMuc3BsaWNlKGosIDEpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21VSShwZWVySWQpIHtcclxuICAvLyByZW1vdmUgdGhlIG90aGVyIHVzZXIncyBjYXIgZnJvbSB0aGUgbWFwXHJcbiAgdGhpcy5vdGhlclVzZXJzW3BlZXJJZF0uY2FyLm1hcmtlci5zZXRNYXAobnVsbCk7XHJcblxyXG4gIC8vIGlmIHRoZWlyIHRlYW0gaGFzIG5vIG1vcmUgdXNlcnMsIGdyZXkgb3V0XHJcbiAgLy8gdGhlaXIgc2NvcmUgYm94XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzAuMycpO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDaGFuZ2VkTG9jYXRpb24obGF0LCBsbmcpIHtcclxuICBzZXRHYW1lVG9OZXdMb2NhdGlvbi5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycygpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgYnJvYWRjYXN0R2FtZVN0YXRlLmNhbGwodGhpcywgdXNlcik7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkYXRhUmVjZWl2ZWQoZGF0YSkge1xyXG4gIGlmIChkYXRhLnBlZXJJZCkge1xyXG4gICAgLy8gaWYgd2UgYXJlIHRoZSBob3N0LCBhbmQgdGhlIHVzZXIgd2hvIHNlbnQgdGhpcyBkYXRhIGhhc24ndCBiZWVuIGdpdmVuIHRoZSBpbml0aWFsIGdhbWVcclxuICAgIC8vIHN0YXRlLCB0aGVuIGJyb2FkY2FzdCBpdCB0byB0aGVtXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5oYXNCZWVuSW5pdGlhbGl6ZWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCA9IHRydWU7XHJcbiAgICAgIC8vIG5vdCBzdXJlIGlmIHdlIHNob3VsZCBkbyB0aGlzIG9yIG5vdCwgYnV0IGF0IGxlYXN0IGl0IHJlc2V0cyB0aGUgZ2FtZVxyXG4gICAgICAvLyBzdGF0ZSB0byB3aGF0IHdlLCB0aGUgaG9zdCwgdGhpbmsgaXQgaXNcclxuICAgICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycy5jYWxsKHRoaXMpO1xyXG4gICAgICAvLyBpZiBub3QgdGhhdCwgdGhlbiB3ZSBzaG91bGQganVzdCBicm9hZGNhc3QgdG8gdGhlIG5ldyBndXkgbGlrZSB0aGlzOlxyXG4gICAgICAvLyBicm9hZGNhc3RHYW1lU3RhdGUoZGF0YS5wZWVySWQpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5sYXN0VXBkYXRlVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5ldmVudCkge1xyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAndXBkYXRlX2dhbWVfc3RhdGUnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogdXBkYXRlIGdhbWUgc3RhdGUnKTtcclxuICAgICAgLy8gd2Ugb25seSB3YW50IHRvIHJlY2VudGVyIHRoZSBtYXAgaW4gdGhlIGNhc2UgdGhhdCB0aGlzIGlzIGEgbmV3IHVzZXJcclxuICAgICAgLy8gam9pbmluZyBmb3IgdGhlIGZpcnN0IHRpbWUsIGFuZCB0aGUgd2F5IHRvIHRlbGwgdGhhdCBpcyB0byBzZWUgaWYgdGhlXHJcbiAgICAgIC8vIGluaXRpYWwgbG9jYXRpb24gaGFzIGNoYW5nZWQuICBPbmNlIHRoZSB1c2VyIGlzIGFscmVhZHkgam9pbmVkLCBpZiBhXHJcbiAgICAgIC8vIGxvY2F0aW9uIGNoYW5nZSBpcyBpbml0aWF0ZWQsIHRoYXQgd2lsbCB1c2UgdGhlICduZXdfbG9jYXRpb24nIGV2ZW50IFxyXG4gICAgICBpZiAocGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpICE9IHBhcnNlRmxvYXQodGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0KSB8fFxyXG4gICAgICAgIHBhcnNlRmxvYXQoZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSAhPSBwYXJzZUZsb2F0KHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpIHtcclxuICAgICAgICB0aGlzLm1hcC5zZXRDZW50ZXIobmV3IGdvb2dsZS5tYXBzLkxhdExuZyhcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCxcclxuICAgICAgICAgIGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykpO1xyXG4gICAgICB9XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QgPSBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0O1xyXG4gICAgICAvLyBuZWVkIHRvIG1ha2UgdGhpcyBjYWxsIGJlY2F1c2Ugd2UgY2FuIGJlIGluIGEgc2l0dWF0aW9uIHdoZXJlIHRoZSBob3N0XHJcbiAgICAgIC8vIGRvZXNuJ3Qga25vdyBvdXIgdXNlcm5hbWUgeWV0LCBzbyB3ZSBuZWVkIHRvIG1hbnVhbGx5IHNldCBpdCBpbiBvdXJcclxuICAgICAgLy8gb3duIFVJIGZpcnN0LlxyXG4gICAgICB1cGRhdGVVc2VybmFtZS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCwgdGhpcy51c2VybmFtZSk7XHJcbiAgICAgIHVwZGF0ZVVJV2l0aE5ld0dhbWVTdGF0ZS5jYWxsKHRoaXMpO1xyXG4gICAgICBhc3NpZ25NeVRlYW1CYXNlLmNhbGwodGhpcyk7XHJcbiAgICAgIHVwZGF0ZUNhckljb25zLmNhbGwodGhpcyk7XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICduZXdfbG9jYXRpb24nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGxvY2F0aW9uICcgKyBkYXRhLmV2ZW50LmxhdCArICcsJyArIGRhdGEuZXZlbnQubG5nKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQub3JpZ2luYXRpbmdfcGVlcl9pZCAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICBvdGhlclVzZXJDaGFuZ2VkTG9jYXRpb24uY2FsbCh0aGlzLCBkYXRhLmV2ZW50LmxhdCwgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV9jb2xsZWN0ZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSBjb2xsZWN0ZWQgYnkgJyArIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNvbGxlY3RlZEl0ZW0uY2FsbCh0aGlzLCBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ25ld19pdGVtJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IG5ldyBpdGVtIGF0ICcgK1xyXG4gICAgICAgIGRhdGEuZXZlbnQubG9jYXRpb24ubGF0ICsgJywnICsgZGF0YS5ldmVudC5sb2NhdGlvbi5sbmcgK1xyXG4gICAgICAgICcgd2l0aCBpZCAnICsgZGF0YS5ldmVudC5pZCk7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHNvbWVvbmUgZWxzZSBjYXVzZWQgdGhlIG5ldyBpdGVtIHBsYWNlbWVudC5cclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGRpZCBpdCwgaXQgd2FzIGFscmVhZHkgcGxhY2VkXHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lmhvc3RfdXNlciAmJiBkYXRhLmV2ZW50Lmhvc3RfdXNlciAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICB2YXIgaXRlbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhkYXRhLmV2ZW50LmxvY2F0aW9uLmxhdCwgZGF0YS5ldmVudC5sb2NhdGlvbi5sbmcpO1xyXG4gICAgICAgIHB1dE5ld0l0ZW1Pbk1hcC5jYWxsKHRoaXMsIGl0ZW1Mb2NhdGlvbiwgZGF0YS5ldmVudC5pZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX3JldHVybmVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gcmV0dXJuZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0gKyAnIHdoaWNoIGdpdmVzIHRoZW0gJyArIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgICAgICAgb3RoZXJVc2VyUmV0dXJuZWRJdGVtLmNhbGwodGhpcywgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0sIGRhdGEuZXZlbnQubm93X251bV9pdGVtcyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fdHJhbnNmZXJyZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSAnICsgZGF0YS5ldmVudC5pZCArICcgdHJhbnNmZXJyZWQgYnkgdXNlciAnICsgZGF0YS5ldmVudC5mcm9tVXNlclBlZXJJZCArICcgdG8gdXNlciAnICsgZGF0YS5ldmVudC50b1VzZXJQZWVySWQpO1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBkYXRhLmV2ZW50LnRvVXNlclBlZXJJZDtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIC8vIHRoZSBpdGVtIHdhcyB0cmFuc2ZlcnJlZCB0byB0aGlzIHVzZXJcclxuICAgICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgPSB7XHJcbiAgICAgICAgICBpZDogZGF0YS5ldmVudC5pZCxcclxuICAgICAgICAgIGxvY2F0aW9uOiBudWxsXHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3NvbWVvbmUgdHJhbnNmZXJyZWQgYXQgJyArIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyKTtcclxuICAgICAgICB1c2VyQ29sbGlkZWRXaXRoSXRlbS5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gc2V0IHRoZSBhcnJvdyB0byBwb2ludCB0byB0aGUgbmV3IHVzZXIgd2hvIGhhcyB0aGUgaXRlbVxyXG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSB0aGlzLm90aGVyVXNlcnNbZGF0YS5ldmVudC50b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gaWYgdGhlIHVzZXIgc2VudCBhIHVzZXJuYW1lIHRoYXQgd2UgaGF2ZW4ndCBzZWVuIHlldCwgc2V0IGl0XHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEudXNlcm5hbWUgJiYgIXRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0udXNlcm5hbWUpIHtcclxuICAgIHVwZGF0ZVVzZXJuYW1lLmNhbGwodGhpcywgZGF0YS5wZWVySWQsIGRhdGEudXNlcm5hbWUpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGRhdGEucGVlcklkICYmIGRhdGEuY2FyTGF0TG5nICYmIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0pIHtcclxuICAgIG1vdmVPdGhlckNhci5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0sIG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YS5jYXJMYXRMbmcubGF0LCBkYXRhLmNhckxhdExuZy5sbmcpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnbk15VGVhbUJhc2UoKSB7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKSB7XHJcbiAgICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0O1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWUocGVlcklkLCB1c2VybmFtZSkge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBqKyspIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnVzZXJuYW1lID0gdXNlcm5hbWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVUlXaXRoTmV3R2FtZVN0YXRlKCkge1xyXG4gIC8vIHJlY2VudGVyIHRoZSBtYXBcclxuICBjb25zb2xlLmxvZygnbmV3IGxvY2F0aW9uIHJlY2VpdmVkOiAnICsgdGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24pO1xyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyh0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQsIHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZyk7XHJcbiAgdXBkYXRlQmFzZUxvY2F0aW9uc0luVUkuY2FsbCh0aGlzKTtcclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbiAgLy8gaWYgc29tZW9uZSBoYXMgdGhlIGl0ZW1cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICAgIC8vIGlmIEkgaGF2ZSB0aGUgaXRlbSwgbWFrZSB0aGUgZGVzdGluYXRpb24gbXkgdGVhbSdzIGJhc2VcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3dfYmx1ZS5wbmcnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGFub3RoZXIgdXNlciBoYXMgdGhlIGl0ZW0sIGJ1dCB0aGUgc2V0RGVzdGluYXRpb24gY2FsbFxyXG4gICAgICAvLyB3aWxsIGJlIHRha2VuIGNhcmUgb2Ygd2hlbiB0aGUgdXNlciBzZW5kcyB0aGVpciBsb2NhdGlvbiBkYXRhXHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIGlmIG5vYm9keSBoYXMgdGhlIGl0ZW0sIHB1dCBpdCBvbiB0aGUgbWFwIGluIHRoZSByaWdodCBwbGFjZSxcclxuICAgIC8vIGFuZCBzZXQgdGhlIG5ldyBpdGVtIGxvY2F0aW9uIGFzIHRoZSBkZXN0aW5hdGlvblxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgbW92ZUl0ZW1Pbk1hcC5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG4gICAgfVxyXG4gICAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24sICdhcnJvdy5wbmcnKTtcclxuICB9XHJcbiAgdXBkYXRlU2NvcmVzSW5VSS5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgYXNzaWduTXlUZWFtSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSSgpIHtcclxuICBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sYXQsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUNhckljb25zKCkge1xyXG4gIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2VycywgdGhpcy50ZWFtVG93bk90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2VycywgdGhpcy50ZWFtQ3J1c2hPdGhlckNhckljb24pO1xyXG4gIHVwZGF0ZU15Q2FySWNvbi5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVNeUNhckljb24oKSB7XHJcbiAgdmFyIHVzZXJDYXJJbWdTcmMgPSAnaW1hZ2VzL2NydXNoX2Nhci5wbmcnO1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY2FyLnBuZyc7XHJcbiAgfVxyXG4gICQoJyNjYXItaW1nJykuYXR0cignc3JjJywgdXNlckNhckltZ1NyYyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zKHRlYW1Vc2VycywgdGVhbUNhckljb24pIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRlYW1Vc2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgLy8gcmVtb3ZlIGFueSBleGlzdGluZyBtYXJrZXJcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0gJiYgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhciAmJiB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlcikge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRlYW1Vc2Vyc1tpXS5wZWVySWQgIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgICAgbWFwOiB0aGlzLm1hcCxcclxuICAgICAgICB0aXRsZTogdGVhbVVzZXJzW2ldLnBlZXJJZCxcclxuICAgICAgICBpY29uOiB0ZWFtQ2FySWNvblxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTY29yZXNJblVJKHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCwgdGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCkge1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0ZWFtVG93bk51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlSXRlbU9uTWFwKGxhdCwgbG5nKSB7XHJcbiAgY29uc29sZS5sb2coJ21vdmluZyBpdGVtIHRvIG5ldyBsb2NhdGlvbjogJyArIGxhdCArICcsJyArIGxuZyk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxhdCA9IGxhdDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubG5nID0gbG5nO1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0UG9zaXRpb24odGhpcy5pdGVtTWFwT2JqZWN0LmxvY2F0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyUmV0dXJuZWRJdGVtKG90aGVyVXNlclBlZXJJZCwgbm93TnVtSXRlbXNGb3JVc2VyKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQuY2FsbCh0aGlzLCB1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKSlcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgJ2Fycm93LnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlT3RoZXJDYXIob3RoZXJVc2VyT2JqZWN0LCBuZXdMb2NhdGlvbikge1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiA9IG5ld0xvY2F0aW9uO1xyXG4gIGlmICghb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIpIHtcclxuICAgIHVwZGF0ZUNhckljb25zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG4gIC8vIGlmIHRoZSBvdGhlciBjYXIgaGFzIGFuIGl0ZW0sIHVwZGF0ZSB0aGUgZGVzdGluYXRpb25cclxuICAvLyB0byBiZSBpdFxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCkge1xyXG4gICAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gICAgaWYgKHVzZXJJc09uTXlUZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCkpIHtcclxuICAgICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gICAgfVxyXG4gICAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCBuZXdMb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG4gIH1cclxuICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQuY2FsbCh0aGlzLCBvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uLCBvdGhlclVzZXJPYmplY3QucGVlcklkKTtcclxuICBvdGhlclVzZXJPYmplY3QuY2FyLm1hcmtlci5zZXRQb3NpdGlvbihvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlcklzT25NeVRlYW0ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdmFyIG15VGVhbSA9IG51bGw7XHJcbiAgdmFyIG90aGVyVXNlclRlYW0gPSBudWxsO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICBteVRlYW0gPSAndG93bic7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAgIG90aGVyVXNlclRlYW0gPSAndG93bic7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIG15VGVhbSA9ICdjcnVzaCc7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgICBvdGhlclVzZXJUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG15VGVhbSA9PSBvdGhlclVzZXJUZWFtO1xyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQob3RoZXJDYXJMb2NhdGlvbiwgb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gaWYgd2UgZG9uJ3Qga25vdyB0aGUgb3RoZXIgY2FyJ3MgbG9jYXRpb24sIG9yIGlmIHRoaXMgaXNuJ3QgdGhlIHVzZXIgd2l0aFxyXG4gIC8vICB0aGUgaXRlbSwgdGhlbiBpZ25vcmUgaXQuIFdlJ2xsIG9ubHkgdHJhbnNmZXIgYW4gaXRlbSBmcm9tIHRoZSBwZXJzcGVjdGVkXHJcbiAgLy8gIG9mIHRoZSB1c2VyIHdpdGggdGhlIGl0ZW1cclxuICBpZiAoIW90aGVyQ2FyTG9jYXRpb24gfHwgIXRoaXMuY29sbGVjdGVkSXRlbSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBpZiAodGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIpIHtcclxuICAgIHZhciB0aW1lU2luY2VMYXN0VHJhbnNmZXIgPSAoKG5ldyBEYXRlKCkpLmdldFRpbWUoKSkgLSB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlcjtcclxuICAgIC8vIGlmIG5vdCBlbm91Z2ggdGltZSBoYXMgcGFzc2VkIHNpbmNlIHRoZSBsYXN0IHRyYW5zZmVyLCByZXR1cm5cclxuICAgIGlmICh0aW1lU2luY2VMYXN0VHJhbnNmZXIgPCB0aGlzLnRpbWVEZWxheUJldHdlZW5UcmFuc2ZlcnMpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gb3B0aW1pemF0aW9uOiByZXNldCB0aGlzIHNvIHdlIGRvbid0IHdhc3RlIHRpbWUgY2FsY3VsYXRpbmcgaW4gdGhlIGZ1dHVyZVxyXG4gICAgICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgZGlzdGFuY2UgPSBnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2Vlbih0aGlzLm1hcENlbnRlciwgb3RoZXJDYXJMb2NhdGlvbik7XHJcbiAgLy8gaWYgdGhpcyB1c2VyICh0aGF0IGhhcyB0aGUgaXRlbSkgaXMgY2xvc2UgZW5vdWdoIHRvIGNhbGwgaXQgYVxyXG4gIC8vIGNvbGxpc2lvbiwgdHJhbnNmZXIgaXQgdG8gdGhlIG90aGVyIHVzZXJcclxuICBpZiAoZGlzdGFuY2UgPCAyMCkge1xyXG4gICAgdHJhbnNmZXJJdGVtLmNhbGwodGhpcywgdGhpcy5jb2xsZWN0ZWRJdGVtLmlkLCB0aGlzLnBlZXIuaWQsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zlckl0ZW0oaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2l0ZW0gJyArIGl0ZW1PYmplY3RJZCArICcgdHJhbnNmZXJyZWQgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICBicm9hZGNhc3RUcmFuc2Zlck9mSXRlbS5jYWxsKHRoaXMsIGl0ZW1PYmplY3RJZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCwgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdG9Vc2VyUGVlcklkO1xyXG4gIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICBpZiAodXNlcklzT25NeVRlYW0uY2FsbCh0aGlzLCB0b1VzZXJQZWVySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW3RvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uLCBhcnJvd0ltZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckNvbGxlY3RlZEl0ZW0odXNlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ290aGVyIHVzZXIgY29sbGVjdGVkIGl0ZW0nKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB1c2VySWQ7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbS5jYWxsKHRoaXMsIHVzZXJJZCkpIHtcclxuICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICB9XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsIGFycm93SW1nKTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZUljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VJY29uKTtcclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UoKSB7XHJcbiAgY29uc29sZS5sb2coJ3VzZXIgcmV0dXJuZWQgaXRlbSB0byBiYXNlJyk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgJ2Fycm93LnBuZycpO1xyXG4gIGluY3JlbWVudEl0ZW1Db3VudC5jYWxsKHRoaXMsIHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKTtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlcklzT25Ub3duVGVhbShwZWVySWQpIHtcclxuICBmb3IgKHZhciBpID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluY3JlbWVudEl0ZW1Db3VudChpc1RlYW1Ub3duKSB7XHJcbiAgaWYgKGlzVGVhbVRvd24pIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCsrO1xyXG4gICAgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKS50ZXh0KHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpKTtcclxuICB9IGVsc2Uge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCsrO1xyXG4gICAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZsYXNoRWxlbWVudChqcXVlcnlFbGVtKSB7XHJcbiAganF1ZXJ5RWxlbS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXNlckNvbGxpZGVkV2l0aEl0ZW0oY29sbGlzaW9uSXRlbU9iamVjdCkge1xyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IGNvbGxpc2lvbkl0ZW1PYmplY3Q7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgY29sbGlzaW9uSXRlbU9iamVjdC5sb2NhdGlvbiA9IG51bGw7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdGhpcy5wZWVyLmlkO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlSWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZUljb24pO1xyXG4gIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3dfYmx1ZS5wbmcnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0RGVzdGluYXRpb24obG9jYXRpb24sIGFycm93SW1hZ2VOYW1lKSB7XHJcbiAgdGhpcy5kZXN0aW5hdGlvbiA9IGxvY2F0aW9uO1xyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCBhcnJvd0ltYWdlTmFtZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvdGF0ZUNhcigpIHtcclxuICB0aGlzLnJvdGF0aW9uID0gZ2V0QW5nbGUuY2FsbCh0aGlzLCB0aGlzLnNwZWVkLCB0aGlzLmhvcml6b250YWxTcGVlZCk7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICctbXMtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsgLyogSUUgOSAqLyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7IC8qIENocm9tZSwgU2FmYXJpLCBPcGVyYSAqLyB0cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJvdGF0ZUFycm93KCkge1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbiA9IGNvbXB1dGVCZWFyaW5nQW5nbGUuY2FsbCh0aGlzLCB0aGlzLm1hcENlbnRlci5sYXQoKSwgdGhpcy5tYXBDZW50ZXIubG5nKCksIHRoaXMuZGVzdGluYXRpb24ubGF0KCksIHRoaXMuZGVzdGluYXRpb24ubG5nKCkpO1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyA9ICctbXMtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyAvKiBJRSA5ICovIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyAvKiBDaHJvbWUsIFNhZmFyaSwgT3BlcmEgKi8gdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMuYXJyb3dSb3RhdGlvbiArICdkZWcpOyc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZShzdGVwKSB7XHJcbiAgbW92ZUNhci5jYWxsKHRoaXMpO1xyXG5cclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdCAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0pIHtcclxuICAgIC8vIGNoZWNrIGZvciBjb2xsaXNpb25zIGJldHdlZW4gb25lIGNhciB3aXRoIGFuIGl0ZW0gYW5kIG9uZSB3aXRob3V0XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAvLyBpZiB0aGlzIHVzZXIgaGFzIGFuIGl0ZW0sIGNoZWNrIHRvIHNlZSBpZiB0aGV5IGFyZSBjb2xsaWRpbmdcclxuICAgICAgLy8gd2l0aCBhbnkgb3RoZXIgdXNlciwgYW5kIGlmIHNvLCB0cmFuc2ZlciB0aGUgaXRlbVxyXG4gICAgICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgICAgIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZC5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5jYXIubG9jYXRpb24sIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySWQpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBpZiBhbm90aGVyIHVzZXIgaGFzIGFuIGl0ZW0sIGFuZCB0aGVpciBjYXIgaGFzIGEgbG9jYXRpb24sXHJcbiAgICAgIC8vIHRoZW4gY29uc3RhbnRseSBzZXQgdGhlIGRlc3RpbmF0aW9uIHRvIHRoZWlyIGxvY2F0aW9uXHJcbiAgICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXSAmJiB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5sb2NhdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5jYXIubG9jYXRpb24pIHtcclxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjaGVjayBpZiB1c2VyIGNvbGxpZGVkIHdpdGggYW4gaXRlbSBvciB0aGUgYmFzZVxyXG4gIHZhciBjb2xsaXNpb25NYXJrZXIgPSBnZXRDb2xsaXNpb25NYXJrZXIuY2FsbCh0aGlzKTtcclxuICBpZiAoY29sbGlzaW9uTWFya2VyKSB7XHJcbiAgICBpZiAoIXRoaXMuY29sbGVjdGVkSXRlbSAmJiBjb2xsaXNpb25NYXJrZXIgPT0gdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgICAvLyB1c2VyIGp1c3QgcGlja2VkIHVwIGFuIGl0ZW1cclxuICAgICAgdXNlckNvbGxpZGVkV2l0aEl0ZW0uY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QpO1xyXG4gICAgICBicm9hZGNhc3RJdGVtQ29sbGVjdGVkLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmlkKTtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5jb2xsZWN0ZWRJdGVtICYmIGNvbGxpc2lvbk1hcmtlciA9PSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICAgIC8vIHVzZXIgaGFzIGFuIGl0ZW0gYW5kIGlzIGJhY2sgYXQgdGhlIGJhc2VcclxuICAgICAgdXNlclJldHVybmVkSXRlbVRvQmFzZS5jYWxsKHRoaXMpO1xyXG4gICAgICBicm9hZGNhc3RJdGVtUmV0dXJuZWQuY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpO1xyXG4gICAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBicm9hZGNhc3RNeUNhckxvY2F0aW9uLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIGlmIHRoZSBnYW1lIGhhcyBzdGFydGVkIGFuZCB3ZSdyZSB0aGUgaG9zdCwgY2hlY2tcclxuICAvLyBmb3IgYW55IHBlZXJzIHdobyBoYXZlbid0IHNlbnQgYW4gdXBkYXRlIGluIHRvbyBsb25nXHJcbiAgaWYgKHRoaXMuaG9zdFBlZXJJZCAmJiB0aGlzLnBlZXIgJiYgdGhpcy5wZWVyLmlkICYmIHRoaXMuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgIGNsZWFudXBBbnlEcm9wcGVkQ29ubmVjdGlvbnMuY2FsbCh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNob3VsZEtlZXBBbGl2ZSgpIHtcclxuICByZXR1cm4gdGhpcy5xcy52YWx1ZSh0aGlzLmtlZXBBbGl2ZVBhcmFtTmFtZSkgPT0gJ3RydWUnO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zKCkge1xyXG4gIGlmIChzaG91bGRLZWVwQWxpdmUuY2FsbCh0aGlzKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHRpbWVOb3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICAvLyBpZiBpdCdzIGJlZW4gbG9uZ2VyIHRoYW4gdGhlIHRpbWVvdXQgc2luY2Ugd2UndmUgaGVhcmQgZnJvbVxyXG4gICAgLy8gdGhpcyB1c2VyLCByZW1vdmUgdGhlbSBmcm9tIHRoZSBnYW1lXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lICYmICh0aW1lTm93IC0gdGhpcy5vdGhlclVzZXJzW3VzZXJdLmxhc3RVcGRhdGVUaW1lID4gdGhpcy5BQ1RJVkVfQ09OTkVDVElPTl9USU1FT1VUX0lOX1NFQ09ORFMpKSB7XHJcbiAgICAgIGNsb3NlUGVlckpzQ29ubmVjdGlvbi5jYWxsKHRoaXMsIHVzZXIpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xvc2VQZWVySnNDb25uZWN0aW9uKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGlmICh0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSAmJiB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLmNsb3NlKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW5kZXIoZHQpIHtcclxuICAkKFwiI2Nhci1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMucm90YXRpb25Dc3MpO1xyXG4gICQoXCIjYXJyb3ctaW1nXCIpLmF0dHIoXCJzdHlsZVwiLCB0aGlzLmFycm93Um90YXRpb25Dc3MpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RNeUNhckxvY2F0aW9uKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gJiYgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3BlbiAmJiB0aGlzLm1hcENlbnRlcikge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgICBjYXJMYXRMbmc6IHtcclxuICAgICAgICAgIGxhdDogdGhpcy5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgICAgICBsbmc6IHRoaXMubWFwQ2VudGVyLmxuZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwZWVySWQ6IHRoaXMucGVlci5pZCxcclxuICAgICAgICB1c2VybmFtZTogdGhpcy51c2VybmFtZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEdhbWVTdGF0ZShvdGhlclVzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGdhbWUgc3RhdGUgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSB8fCAhdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0ID0ge1xyXG4gICAgZXZlbnQ6IHtcclxuICAgICAgbmFtZTogJ3VwZGF0ZV9nYW1lX3N0YXRlJyxcclxuICAgICAgZ2FtZURhdGFPYmplY3Q6IHRoaXMuZ2FtZURhdGFPYmplY3RcclxuICAgIH1cclxuICB9O1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh1cGRhdGVHYW1lU3RhdGVFdmVudE9iamVjdCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE5ld0l0ZW0obG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gJiYgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICB2YXIgc2ltcGxlSXRlbUxhdExuZyA9IHtcclxuICAgICAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgICBuYW1lOiAnbmV3X2l0ZW0nLFxyXG4gICAgICAgICAgaG9zdF91c2VyOiB0aGlzLnBlZXIuaWQsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBsYXQ6IHNpbXBsZUl0ZW1MYXRMbmcubGF0LFxyXG4gICAgICAgICAgICBsbmc6IHNpbXBsZUl0ZW1MYXRMbmcubG5nXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgaWQ6IGl0ZW1JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtUmV0dXJuZWQoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSByZXR1cm5lZCcpO1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9yZXR1cm5lZCcsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtOiB0aGlzLnBlZXIuaWQsXHJcbiAgICAgICAgbm93X251bV9pdGVtczogdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkLFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEl0ZW1Db2xsZWN0ZWQoaXRlbUlkKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBpdGVtIGlkICcgKyBpdGVtSWQgKyAnIGNvbGxlY3RlZCBieSB1c2VyICcgKyB0aGlzLnBlZXIuaWQpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHRoaXMucGVlci5pZDtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX2NvbGxlY3RlZCcsXHJcbiAgICAgICAgaWQ6IGl0ZW1JZCxcclxuICAgICAgICB1c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW06IHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdFRyYW5zZmVyT2ZJdGVtKGl0ZW1JZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSB0cmFuc2ZlcnJlZCAnICsgaXRlbUlkICsgJyBmcm9tICcgKyBmcm9tVXNlclBlZXJJZCArICcgdG8gJyArIHRvVXNlclBlZXJJZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fdHJhbnNmZXJyZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgZnJvbVVzZXJQZWVySWQ6IGZyb21Vc2VyUGVlcklkLFxyXG4gICAgICAgIHRvVXNlclBlZXJJZDogdG9Vc2VyUGVlcklkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3TG9jYXRpb24obG9jYXRpb24pIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIG5ldyBsb2NhdGlvbjogJyArIGxvY2F0aW9uLmxhdCgpICsgJywnICsgbG9jYXRpb24ubG5nKCkpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICduZXdfbG9jYXRpb24nLFxyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKSxcclxuICAgICAgICBvcmlnaW5hdGluZ19wZWVyX2lkOiB0aGlzLnBlZXIuaWRcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBjaGVja3MgdG8gc2VlIGlmIHRoZXkgaGF2ZSBjb2xsaWRlZCB3aXRoIGVpdGhlciBhbiBpdGVtIG9yIHRoZSBiYXNlXHJcbmZ1bmN0aW9uIGdldENvbGxpc2lvbk1hcmtlcigpIHtcclxuICAvLyBjb21wdXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIG15IGNhciBhbmQgdGhlIGRlc3RpbmF0aW9uXHJcbiAgaWYgKHRoaXMuZGVzdGluYXRpb24pIHtcclxuICAgIHZhciBtYXhEaXN0YW5jZUFsbG93ZWQgPSB0aGlzLmNhclRvSXRlbUNvbGxpc2lvbkRpc3RhbmNlO1xyXG4gICAgdmFyIGRpc3RhbmNlID0gZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4odGhpcy5tYXBDZW50ZXIsIHRoaXMuZGVzdGluYXRpb24pO1xyXG4gICAgLy8gVGhlIGJhc2UgaXMgYmlnZ2VyLCBzbyBiZSBtb3JlIGxlbmllbnQgd2hlbiBjaGVja2luZyBmb3IgYSBiYXNlIGNvbGxpc2lvblxyXG4gICAgaWYgKHRoaXMuZGVzdGluYXRpb24gPT0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgIG1heERpc3RhbmNlQWxsb3dlZCA9IHRoaXMuY2FyVG9CYXNlQ29sbGlzaW9uRGlzdGFuY2U7XHJcbiAgICB9XHJcbiAgICBpZiAoZGlzdGFuY2UgPCBtYXhEaXN0YW5jZUFsbG93ZWQpIHtcclxuICAgICAgaWYgKHRoaXMuZGVzdGluYXRpb24gPT0gdGhpcy5pdGVtTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgJyArIHRoaXMucGVlci5pZCArICcgY29sbGlkZWQgd2l0aCBpdGVtJyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXI7XHJcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5kZXN0aW5hdGlvbiA9PSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgICBpZiAodGhpcy5jb2xsZWN0ZWRJdGVtKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygndXNlciAnICsgdGhpcy5wZWVyLmlkICsgJyBoYXMgYW4gaXRlbSBhbmQgY29sbGlkZWQgd2l0aCBiYXNlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubWFya2VyO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRHYW1lVG9OZXdMb2NhdGlvbihsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlLmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2UuY2FsbCh0aGlzLCAocGFyc2VGbG9hdChsYXQpICsgMC4wMDYpLnRvU3RyaW5nKCksIChwYXJzZUZsb2F0KGxuZykgKyAwLjAwOCkudG9TdHJpbmcoKSk7XHJcbiAgYXNzaWduTXlUZWFtQmFzZS5jYWxsKHRoaXMpO1xyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy5tYXAuc2V0Q2VudGVyKHRoaXMubWFwQ2VudGVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0QW5nbGUodngsIHZ5KSB7XHJcbiAgcmV0dXJuIChNYXRoLmF0YW4yKHZ5LCB2eCkpICogKDE4MCAvIE1hdGguUEkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjb21wdXRlQmVhcmluZ0FuZ2xlKGxhdDEsIGxvbjEsIGxhdDIsIGxvbjIpIHtcclxuICB2YXIgUiA9IDYzNzE7IC8vIGttXHJcbiAgdmFyIGRMYXQgPSAobGF0MiAtIGxhdDEpLnRvUmFkKCk7XHJcbiAgdmFyIGRMb24gPSAobG9uMiAtIGxvbjEpLnRvUmFkKCk7XHJcbiAgdmFyIGxhdDEgPSBsYXQxLnRvUmFkKCk7XHJcbiAgdmFyIGxhdDIgPSBsYXQyLnRvUmFkKCk7XHJcblxyXG4gIHZhciBhbmdsZUluUmFkaWFucyA9IE1hdGguYXRhbjIoTWF0aC5zaW4oZExvbikgKiBNYXRoLmNvcyhsYXQyKSxcclxuICAgIE1hdGguY29zKGxhdDEpICogTWF0aC5zaW4obGF0MikgLSBNYXRoLnNpbihsYXQxKSAqIE1hdGguY29zKGxhdDIpICogTWF0aC5jb3MoZExvbikpO1xyXG4gIHJldHVybiBhbmdsZUluUmFkaWFucy50b0RlZygpO1xyXG59XHJcblxyXG5cclxuLy8gZ2FtZSBsb29wIGhlbHBlcnNcclxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xyXG4gIHJldHVybiB3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm5vdyA/IHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG59XHJcblxyXG4vLyBkb24ndCB0aGluayB3ZSdsbCBuZWVkIHRvIGdvIHRvIHRoZSB1c2VyJ3MgbG9jYXRpb24sIGJ1dCBtaWdodCBiZSB1c2VmdWxcclxuZnVuY3Rpb24gdHJ5RmluZGluZ0xvY2F0aW9uKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gVHJ5IEhUTUw1IGdlb2xvY2F0aW9uXHJcbiAgaWYgKG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xyXG4gICAgbmF2aWdhdG9yLmdlb2xvY2F0aW9uLmdldEN1cnJlbnRQb3NpdGlvbihmdW5jdGlvbihwb3NpdGlvbikge1xyXG4gICAgICB2YXIgcG9zID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhwb3NpdGlvbi5jb29yZHMubGF0aXR1ZGUsXHJcbiAgICAgICAgcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZSk7XHJcbiAgICAgIHNlbGYubWFwLnNldENlbnRlcihwb3MpO1xyXG4gICAgICBzZWxmLm1hcENlbnRlciA9IHBvcztcclxuICAgIH0sIGZ1bmN0aW9uKCkge1xyXG4gICAgICBoYW5kbGVOb0dlb2xvY2F0aW9uLmNhbGwoc2VsZiwgdHJ1ZSk7XHJcbiAgICB9KTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gQnJvd3NlciBkb2Vzbid0IHN1cHBvcnQgR2VvbG9jYXRpb25cclxuICAgIGhhbmRsZU5vR2VvbG9jYXRpb24uY2FsbChzZWxmLCBmYWxzZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVOb0dlb2xvY2F0aW9uKGVycm9yRmxhZykge1xyXG4gIGlmIChlcnJvckZsYWcpIHtcclxuICAgIHZhciBjb250ZW50ID0gJ0Vycm9yOiBUaGUgR2VvbG9jYXRpb24gc2VydmljZSBmYWlsZWQuJztcclxuICB9IGVsc2Uge1xyXG4gICAgdmFyIGNvbnRlbnQgPSAnRXJyb3I6IFlvdXIgYnJvd3NlciBkb2VzblxcJ3Qgc3VwcG9ydCBnZW9sb2NhdGlvbi4nO1xyXG4gIH1cclxufVxyXG5cclxuLy8gVGhpcyBjYW4gYmUgcmVtb3ZlZCwgc2luY2UgaXQgY2F1c2VzIGFuIGVycm9yLiAgaXQncyBqdXN0IGFsbG93aW5nXHJcbi8vIGZvciByaWdodC1jbGlja2luZyB0byBzaG93IHRoZSBicm93c2VyJ3MgY29udGV4dCBtZW51LlxyXG5mdW5jdGlvbiBzaG93Q29udGV4dE1lbnUoZSkge1xyXG5cclxuICAvLyBjcmVhdGUgYSBjb250ZXh0bWVudSBldmVudC5cclxuICB2YXIgbWVudV9ldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KFwiTW91c2VFdmVudHNcIik7XHJcbiAgbWVudV9ldmVudC5pbml0TW91c2VFdmVudChcImNvbnRleHRtZW51XCIsIHRydWUsIHRydWUsXHJcbiAgICBlLnZpZXcsIDEsIDAsIDAsIDAsIDAsIGZhbHNlLFxyXG4gICAgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMiwgbnVsbCk7XHJcblxyXG4gIC8vIGZpcmUgdGhlIG5ldyBldmVudC5cclxuICBlLm9yaWdpbmFsVGFyZ2V0LmRpc3BhdGNoRXZlbnQobWVudV9ldmVudCk7XHJcbn1cclxuXHJcblxyXG4vLyBoYWNrIHRvIGFsbG93IGZvciBicm93c2VyIGNvbnRleHQgbWVudSBvbiByaWdodC1jbGlja1xyXG5mdW5jdGlvbiBtb3VzZVVwKGUpIHtcclxuICBpZiAoZS5idXR0b24gPT0gMikgeyAvLyByaWdodC1jbGlja1xyXG4gICAgc2hvd0NvbnRleHRNZW51LmNhbGwodGhpcywgZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyAkKHdpbmRvdykudW5sb2FkKGZ1bmN0aW9uKCkge1xyXG4vLyAgIGRpc2Nvbm5lY3RGcm9tR2FtZSgpO1xyXG4vLyB9KTsiLCIvKipcclxuICogIG1hdGNobWFrZXIuanNcclxuICovXHJcblxyXG4vKipcclxuICogIGV4cG9ydCBjbGFzc1xyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBNYXRjaG1ha2VyVG93bjtcclxuXHJcbi8qKlxyXG4gKiAgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCkge1xyXG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBNYXRjaG1ha2VyVG93bikpXHJcbiAgICByZXR1cm4gbmV3IE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCk7XHJcblxyXG4gIC8vIFRoZSByb290IG9mIHlvdXIgc2Vzc2lvbiBkYXRhLlxyXG4gIHRoaXMuU0VTU0lPTl9MT0NBVElPTiA9IGZpcmViYXNlQmFzZVVybDtcclxuICB0aGlzLnNlc3Npb25SZWYgPSBuZXcgRmlyZWJhc2UodGhpcy5TRVNTSU9OX0xPQ0FUSU9OKTtcclxuXHJcbiAgdGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04gPSAnYXZhaWxhYmxlX3Nlc3Npb25zJztcclxuICB0aGlzLkZVTExfU0VTU0lPTlNfTE9DQVRJT04gPSAnZnVsbF9zZXNzaW9ucyc7XHJcbiAgdGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04gPSAnc2Vzc2lvbnMnO1xyXG4gIHRoaXMuTUFYX1VTRVJTX1BFUl9TRVNTSU9OID0gNDtcclxuICB0aGlzLlNFU1NJT05fQ0xFQU5VUF9USU1FT1VUID0gMzAgKiAxMDAwOyAvLyBpbiBtaWxsaXNlY29uZHNcclxuXHJcbiAgdGhpcy5qb2luZWRTZXNzaW9uID0gbnVsbDtcclxuICB0aGlzLm15V29ya2VyID0gbnVsbDtcclxuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiAgam9pbk9yQ3JlYXRlU2Vzc2lvbih1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spXHJcbiAqXHJcbiAqICB1c2VybmFtZTogRGlzcGxheSBuYW1lIG9mIHVzZXJcclxuICogIHBlZXJJZDogVW5pcXVlIHVzZXIgSURcclxuICogIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgaXNOZXdHYW1lKTpcclxuICogICAgIFdpbGwgYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2hlblxyXG4gKiAgICAgd2UgZWl0aGVyIGpvaW5lZCBvciBjcmVhdGVkIGEgZ2FtZVxyXG4gKlxyXG4gKiAgc2Vzc2lvbkRhdGE6IG9mIHRoaXMgZm9ybVxyXG4gKiAge1xyXG4gKiAgICBcImhvc3RQZWVySWRcIjogXCI4N2IzZnZ2OWV6Z2F4bHhyXCIsXHJcbiAqICAgIFwiaWRcIjogOTExNjgyNyxcclxuICogICAgXCJsYXN0VXBkYXRlVGltZVwiOiAxNDA0NzA3NTc3ODUxLFxyXG4gKiAgICBcInVzZXJzXCI6IFt7XHJcbiAqICAgICAgXCJwZWVySWRcIjogXCI4N2IzZnZ2OWV6Z2F4bHhyXCIsXHJcbiAqICAgICAgXCJ1c2VybmFtZVwiOiBcIk5pbmphIFJveVwiXHJcbiAqICAgIH0sIHtcclxuICogICAgICBcInBlZXJJZFwiOiBcInI2aXNuYWFiNWFpa3ZzNGlcIixcclxuICogICAgICAgXCJ1c2VybmFtZVwiOiBcIlRvd24gQ3J1c2hlclwiXHJcbiAqICAgfV1cclxuICogIH1cclxuICovXHJcbk1hdGNobWFrZXJUb3duLnByb3RvdHlwZS5qb2luT3JDcmVhdGVTZXNzaW9uID0gZnVuY3Rpb24odXNlcm5hbWUsIHBlZXJJZCwgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyBpZiB0aGVyZSBhcmUgYW55IGluYWN0aXZlIHNlc3Npb25zIGNsZWFuIHRoZW0gdXBcclxuICBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVTZXNzaW9ucy5jYWxsKHRoaXMpO1xyXG4gIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gam9pbiBzZXNzaW9uJyk7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlci5jYWxsKHRoaXMsIHdpbmRvdyk7XHJcbiAgdmFyIGF2YWlsYWJsZVNlc3Npb25zRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTik7XHJcbiAgYXZhaWxhYmxlU2Vzc2lvbnNEYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgLy8gb25seSBqb2luIGEgc2Vzc2lvbiBpZiBvbmUgaXNuJ3Qgam9pbmVkIGFscmVhZHlcclxuICAgIGlmIChzZWxmLmpvaW5lZFNlc3Npb24gPT0gbnVsbCkge1xyXG4gICAgICBzZWxmLmpvaW5lZFNlc3Npb24gPSAtMTtcclxuICAgICAgaWYgKGRhdGEudmFsKCkgPT09IG51bGwpIHtcclxuICAgICAgICAvLyB0aGVyZSBhcmUgbm8gYXZhaWxhYmxlIHNlc3Npb25zLCBzbyBjcmVhdGUgb25lXHJcbiAgICAgICAgdmFyIHNlc3Npb25EYXRhID0gY3JlYXRlTmV3U2Vzc2lvbkRhdGEuY2FsbChzZWxmLCB1c2VybmFtZSwgcGVlcklkKTtcclxuICAgICAgICBjcmVhdGVOZXdTZXNzaW9uSW5GaXJlYmFzZS5jYWxsKHNlbGYsIHVzZXJuYW1lLCBwZWVySWQsIHNlc3Npb25EYXRhKTtcclxuICAgICAgICBqb2luZWRTZXNzaW9uQ2FsbGJhY2soc2Vzc2lvbkRhdGEsIHRydWUpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHZhciBqc29uT2JqID0gZGF0YS52YWwoKTtcclxuICAgICAgICB2YXIgc2Vzc2lvbklkO1xyXG5cclxuICAgICAgICAvLyBzdHVwaWQgamF2YXNjcmlwdCB3b24ndCB0ZWxsIG1lIGhvdyBtYW55IHNlc3Npb24gZWxlbWVudHNcclxuICAgICAgICAvLyBhcmUgaW4gdGhlIGpzb25PYmosIHNvIGNvdW50IGVtIHVwXHJcbiAgICAgICAgdmFyIG51bUF2YWlsYWJsZVNlc3Npb25zID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgbnVtQXZhaWxhYmxlU2Vzc2lvbnMrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgY2hpbGQgc2Vzc2lvbnMgYW5kIHRyeVxyXG4gICAgICAgIC8vIHRvIGpvaW4gZWFjaCBvbmVcclxuICAgICAgICB2YXIgY291bnRlciA9IDA7XHJcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb25PYmopIHtcclxuICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICAgIGlmIChqc29uT2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgc2Vzc2lvbklkID0ganNvbk9ialtrZXldO1xyXG4gICAgICAgICAgICBnZXRTZXNzaW9uTGFzdFVwZGF0ZVRpbWUuY2FsbChcclxuICAgICAgICAgICAgICBzZWxmLFxyXG4gICAgICAgICAgICAgIHNlc3Npb25JZCxcclxuICAgICAgICAgICAgICB1c2VybmFtZSxcclxuICAgICAgICAgICAgICBwZWVySWQsXHJcbiAgICAgICAgICAgICAgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLFxyXG4gICAgICAgICAgICAgIGRvbmVHZXR0aW5nVXBkYXRlVGltZS5iaW5kKHNlbGYpLFxyXG4gICAgICAgICAgICAgIGNvdW50ZXIgPT0gbnVtQXZhaWxhYmxlU2Vzc2lvbnMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIHJlbW92ZVBlZXJGcm9tU2Vzc2lvbihzZXNzaW9uSWQsIHBlZXJJZCk6XHJcbiAqIHJlbW92ZSBhIHBlZXIgZnJvbSB0aGUgc2Vzc2lvblxyXG4gKlxyXG4gKi9cclxuTWF0Y2htYWtlclRvd24ucHJvdG90eXBlLnJlbW92ZVBlZXJGcm9tU2Vzc2lvbiA9IGZ1bmN0aW9uKHNlc3Npb25JZCwgcGVlcklkKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoIWRhdGEudmFsKCkpIHtcclxuICAgICAgLy8gc29tZXRoaW5nJ3Mgd3JvbmcsIHByb2JhYmx5IHRoZSBGaXJlYmFzZSBkYXRhIHdhcyBkZWxldGVkXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmIChkYXRhLnZhbCgpLmhvc3RQZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIGZpbmROZXdIb3N0UGVlcklkLmNhbGwoc2VsZiwgc2Vzc2lvbklkLCBwZWVySWQsIHN3aXRjaFRvTmV3SG9zdCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbiAgICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBzZXNzaW9uLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4gICAgdmFyIG51bVVzZXJzSW5TZXNzaW9uID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKS5jbGVhbih1bmRlZmluZWQpLmxlbmd0aDtcclxuICAgIGRhdGEuY2hpbGQoJ3VzZXJzJykuZm9yRWFjaChmdW5jdGlvbihjaGlsZFNuYXBzaG90KSB7XHJcbiAgICAgIC8vIGlmIHdlJ3ZlIGZvdW5kIHRoZSByZWYgdGhhdCByZXByZXNlbnRzIHRoZSBnaXZlbiBwZWVyLCByZW1vdmUgaXRcclxuICAgICAgaWYgKGNoaWxkU25hcHNob3QudmFsKCkgJiYgY2hpbGRTbmFwc2hvdC52YWwoKS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgICAgY2hpbGRTbmFwc2hvdC5yZWYoKS5yZW1vdmUoKTtcclxuICAgICAgICAvLyBpZiB0aGlzIHVzZXIgd2FzIHRoZSBsYXN0IG9uZSBpbiB0aGUgc2Vzc2lvbiwgbm93IHRoZXJlIGFyZSAwLCBcclxuICAgICAgICAvLyBzbyBkZWxldGUgdGhlIHNlc3Npb25cclxuICAgICAgICBpZiAobnVtVXNlcnNJblNlc3Npb24gPT0gMSkge1xyXG4gICAgICAgICAgZGVsZXRlU2Vzc2lvbi5jYWxsKHNlbGYsIHNlc3Npb25JZCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGlmIGl0IHdhcyBmdWxsLCBub3cgaXQgaGFzIG9uZSBvcGVuIHNsb3QsIHNldCBpdCB0byBhdmFpbGFibGVcclxuICAgICAgICAgIGlmIChudW1Vc2Vyc0luU2Vzc2lvbiA9PSBzZWxmLk1BWF9VU0VSU19QRVJfU0VTU0lPTikge1xyXG4gICAgICAgICAgICBtb3ZlU2Vzc2lvbkZyb21GdWxsVG9BdmFpbGFibGUuY2FsbChzZWxmLCBzZXNzaW9uSWQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qXHJcbiAqIHN3aXRjaFRvTmV3SG9zdChzZXNzaW9uSWQsIG5ld0hvc3RQZWVySWQpOlxyXG4gKiBpZiBmb3Igd2hhdGV2ZXIgcmVhc29uIHRoZXJlIGlzIGEgbmV3IGhvc3QsIHN0b3JlIHRoYXQgaW4gRmlyZWJhc2VcclxuICpcclxuICovXHJcbk1hdGNobWFrZXJUb3duLnByb3RvdHlwZS5zd2l0Y2hUb05ld0hvc3QgPSBmdW5jdGlvbihzZXNzaW9uSWQsIG5ld0hvc3RQZWVySWQpIHtcclxuICBpZiAoIW5ld0hvc3RQZWVySWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpLmNoaWxkKCdob3N0UGVlcklkJykuc2V0KG5ld0hvc3RQZWVySWQpO1xyXG59XHJcblxyXG5cclxuLypcclxuICogcHJpdmF0ZSBmdW5jdGlvbnNcclxuICovXHJcblxyXG5mdW5jdGlvbiBjcmVhdGVOZXdTZXNzaW9uRGF0YSh1c2VybmFtZSwgcGVlcklkKSB7XHJcbiAgdmFyIHNlc3Npb25JZCA9IGNyZWF0ZU5ld1Nlc3Npb25JZC5jYWxsKHRoaXMpO1xyXG4gIHJldHVybiB7XHJcbiAgICBpZDogc2Vzc2lvbklkLFxyXG4gICAgaG9zdFBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcnM6IFt7XHJcbiAgICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgICB1c2VybmFtZTogdXNlcm5hbWVcclxuICAgIH1dXHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gZG9uZUdldHRpbmdVcGRhdGVUaW1lKGxhc3RVcGRhdGVUaW1lLCBzZXNzaW9uSWQsIGlzVGhlTGFzdFNlc3Npb24sIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjaykge1xyXG4gIC8vIGlmIHRoZSBzZXNzaW9uIGlzIHN0aWxsIGFjdGl2ZSBqb2luIGl0XHJcbiAgaWYgKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICBpZiAoIWlzVGltZW91dFRvb0xvbmcuY2FsbCh0aGlzLCBsYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgam9pbkV4aXN0aW5nU2Vzc2lvbi5jYWxsKHRoaXMsIHNlc3Npb25JZCwgdXNlcm5hbWUsIHBlZXJJZCwgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2FsbEFzeW5jQ2xlYW51cEluYWN0aXZlU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gaWYgd2UgZ290IGhlcmUsIGFuZCB0aGlzIGlzIHRoZSBsYXN0IHNlc3Npb24sIHRoYXQgbWVhbnMgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSBzZXNzaW9uc1xyXG4gIC8vIHNvIGNyZWF0ZSBvbmVcclxuICBpZiAoaXNUaGVMYXN0U2Vzc2lvbikge1xyXG4gICAgY29uc29sZS5sb2coJ25vIGF2YWlsYWJsZSBzZXNzaW9ucyBmb3VuZCwgb25seSBpbmFjdGl2ZSBvbmVzLCBzbyBjcmVhdGluZyBhIG5ldyBvbmUuLi4nKTtcclxuICAgIHZhciBzZXNzaW9uRGF0YSA9IGNyZWF0ZU5ld1Nlc3Npb25EYXRhLmNhbGwodGhpcywgdXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICBjcmVhdGVOZXdTZXNzaW9uSW5GaXJlYmFzZS5jYWxsKHRoaXMsIHVzZXJuYW1lLCBwZWVySWQsIHNlc3Npb25EYXRhKTtcclxuICAgIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgdHJ1ZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTZXNzaW9uTGFzdFVwZGF0ZVRpbWUoc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrLCBpc1RoZUxhc3RTZXNzaW9uKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGlmIChkYXRhLnZhbCgpICYmIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgICAgY29uc29sZS5sb2coJ2ZvdW5kIHVwZGF0ZSB0aW1lOiAnICsgZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSlcclxuICAgICAgZG9uZUdldHRpbmdVcGRhdGVUaW1lQ2FsbGJhY2soZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSwgc2Vzc2lvbklkLCBpc1RoZUxhc3RTZXNzaW9uLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssIHNlbGYpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVyUGluZygpIHtcclxuICBzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlLmNhbGwodGhpcyk7XHJcbiAgd2luZG93LnNldEludGVydmFsKHNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUuYmluZCh0aGlzKSwgMTAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyKHdpbmRvd09iamVjdCkge1xyXG4gIGlmICh0eXBlb2Yod2luZG93T2JqZWN0LldvcmtlcikgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIC8vVE9ETzogbWFrZSB0aGlzIGEgbW9kdWxlXHJcbiAgICB0aGlzLm15V29ya2VyID0gbmV3IFdvcmtlcihcImFzeW5jbWVzc2FnZXIuanNcIik7XHJcbiAgICB0aGlzLm15V29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBwcm9jZXNzTWVzc2FnZUV2ZW50LmJpbmQodGhpcyksIGZhbHNlKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coXCJTb3JyeSwgeW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViIFdvcmtlcnMuLi5cIik7XHJcbiAgICAvLyBmaW5lLCB3ZSdsbCBkbyBpdCBzeW5jaHJvbm91c2x5XHJcbiAgICBjbGVhbnVwU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zKCkge1xyXG4gIC8vIGRvIGl0IG9uIGEgd2ViIHdvcmtlciB0aHJlYWRcclxuICBpZiAodGhpcy5teVdvcmtlcikge1xyXG4gICAgdGhpcy5teVdvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICAgIGNtZDogJ2NsZWFudXBfaW5hY3RpdmVfc2Vzc2lvbnMnXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUoKSB7XHJcbiAgY29uc29sZS5sb2coJ3Bpbmdpbmcgc2VydmVyJyk7XHJcbiAgdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZCh0aGlzLmpvaW5lZFNlc3Npb24pLmNoaWxkKCdsYXN0VXBkYXRlVGltZScpLnNldCgobmV3IERhdGUoKSkuZ2V0VGltZSgpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cFNlc3Npb25zKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgY29uc29sZS5sb2coJ2NsZWFuaW5nIHVwIGluYWN0aXZlIHNlc3Npb25zJyk7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGFTbmFwc2hvdCkge1xyXG4gICAgZGF0YVNuYXBzaG90LmZvckVhY2goZnVuY3Rpb24oY2hpbGRTbmFwc2hvdCkge1xyXG4gICAgICB2YXIgc2hvdWxkRGVsZXRlU2Vzc2lvbiA9IGZhbHNlO1xyXG4gICAgICB2YXIgc2Vzc2lvbkRhdGEgPSBjaGlsZFNuYXBzaG90LnZhbCgpO1xyXG4gICAgICBpZiAoIXNlc3Npb25EYXRhKSB7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlU2Vzc2lvbiA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHNlc3Npb25EYXRhLnVzZXJzID09IG51bGwgfHwgc2Vzc2lvbkRhdGEudXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnc2Vzc2lvbiBoYXMgbm8gdXNlcnMnKTtcclxuICAgICAgICBzaG91bGREZWxldGVTZXNzaW9uID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoaXNUaW1lb3V0VG9vTG9uZy5jYWxsKHNlbGYsIHNlc3Npb25EYXRhLmxhc3RVcGRhdGVUaW1lKSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwic2Vzc2lvbiBoYXNuJ3QgYmVlbiB1cGRhdGVkIHNpbmNlIFwiICsgc2Vzc2lvbkRhdGEubGFzdFVwZGF0ZVRpbWUpO1xyXG4gICAgICAgIHNob3VsZERlbGV0ZVNlc3Npb24gPSB0cnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2hvdWxkRGVsZXRlU2Vzc2lvbikge1xyXG4gICAgICAgIGRlbGV0ZVNlc3Npb24uY2FsbChzZWxmLCBjaGlsZFNuYXBzaG90Lm5hbWUoKSk7XHJcbiAgICAgICAgY2hpbGRTbmFwc2hvdC5yZWYoKS5yZW1vdmUoKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVGltZW91dFRvb0xvbmcobGFzdFVwZGF0ZVRpbWUpIHtcclxuICBpZiAoIWxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHZhciBjdXJyZW50VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgcmV0dXJuIChjdXJyZW50VGltZSAtIGxhc3RVcGRhdGVUaW1lID4gdGhpcy5TRVNTSU9OX0NMRUFOVVBfVElNRU9VVCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NNZXNzYWdlRXZlbnQoZXZlbnQpIHtcclxuICBzd2l0Y2ggKGV2ZW50LmRhdGEpIHtcclxuICAgIGNhc2UgJ2NsZWFudXBfaW5hY3RpdmVfc2Vzc2lvbnMnOlxyXG4gICAgICBjbGVhbnVwU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICBicmVhaztcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmROZXdIb3N0UGVlcklkKHNlc3Npb25JZCwgZXhpc3RpbmdIb3N0UGVlcklkLCBjYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgLy8gcmVzZXQgdGhlIGhvc3RQZWVySWQgc28gaXQgcHJldmVudHMgdGhlIGxlYXZpbmcgaG9zdCdzIGJyb3dzZXJcclxuICAvLyBpZiBpdCB0cmllcyB0byBzd2l0Y2ggYWdhaW4gYmVmb3JlIHRoaXMgaXMgZG9uZVxyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKS5jaGlsZCgnaG9zdFBlZXJJZCcpLnJlbW92ZSgpO1xyXG5cclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICB2YXIgdXNlcnMgPSBkYXRhLmNoaWxkKCd1c2VycycpLnZhbCgpO1xyXG5cclxuICAgIC8vIGlmIGZvciB3aGF0ZXZlciByZWFzb24gdGhpcyBpcyBjYWxsZWQgYW5kIHNvbWV0aGluZydzIG5vdCByaWdodCwganVzdFxyXG4gICAgLy8gcmV0dXJuXHJcbiAgICBpZiAoIXVzZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB1c2VycyA9IHVzZXJzLmNsZWFuKHVuZGVmaW5lZCk7XHJcbiAgICBpZiAodXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgaWYgKHVzZXJzW2ldICYmIHVzZXJzW2ldLnBlZXJJZCAhPSBleGlzdGluZ0hvc3RQZWVySWQpIHtcclxuICAgICAgICAvLyB3ZSd2ZSBmb3VuZCBhIG5ldyB1c2VyIHRvIGJlIHRoZSBob3N0LCByZXR1cm4gdGhlaXIgaWRcclxuICAgICAgICBjYWxsYmFjayhzZXNzaW9uSWQsIHVzZXJzW2ldLnBlZXJJZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNhbGxiYWNrKHNlc3Npb25JZCwgbnVsbCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRlbGV0ZVNlc3Npb24oc2Vzc2lvbklkKSB7XHJcbiAgcmVtb3ZlU2Vzc2lvbkZyb21BdmFpbGFibGVTZXNzaW9ucy5jYWxsKHRoaXMsIHNlc3Npb25JZCk7XHJcbiAgcmVtb3ZlU2Vzc2lvbkZyb21GdWxsU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIHJlbW92ZVNlc3Npb24uY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVTZXNzaW9uKHNlc3Npb25JZCkge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3U2Vzc2lvbkluRmlyZWJhc2UodXNlcm5hbWUsIHBlZXJJZCwgc2Vzc2lvbkRhdGEpIHtcclxuICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IHNlc3Npb24nKTtcclxuICB2YXIgbmV3U2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25EYXRhLmlkKTtcclxuICBuZXdTZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbkRhdGEpO1xyXG4gIHZhciBuZXdBdmFpbGFibGVTZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbkRhdGEuaWQpO1xyXG4gIG5ld0F2YWlsYWJsZVNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uRGF0YS5pZCk7XHJcbiAgdGhpcy5qb2luZWRTZXNzaW9uID0gc2Vzc2lvbkRhdGEuaWQ7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3U2Vzc2lvbklkKCkge1xyXG4gIC8vIFRPRE86IHJlcGxhY2UgdGhpcyB3aXRoIHNvbWV0aGluZyB0aGF0IHdvbid0XHJcbiAgLy8gYWNjaWRlbnRhbGx5IGhhdmUgY29sbGlzaW9uc1xyXG4gIHJldHVybiBnZXRSYW5kb21JblJhbmdlKDEsIDEwMDAwMDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gam9pbkV4aXN0aW5nU2Vzc2lvbihzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjaykge1xyXG4gIC8vIGlmIGEgc2Vzc2lvbiBoYXMgYWxyZWFkeSBiZWVuIGpvaW5lZCBvbiBhbm90aGVyIHRocmVhZCwgZG9uJ3Qgam9pbiBhbm90aGVyIG9uZVxyXG4gIGlmICh0aGlzLmpvaW5lZFNlc3Npb24gJiYgdGhpcy5qb2luZWRTZXNzaW9uID49IDApIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdGhpcy5qb2luZWRTZXNzaW9uID0gc2Vzc2lvbklkO1xyXG4gIGFzeW5jR2V0U2Vzc2lvbkRhdGEuY2FsbCh0aGlzLCBzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjay5iaW5kKHRoaXMpLCBkb25lR2V0dGluZ1Nlc3Npb25EYXRhLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gYXN5bmNHZXRTZXNzaW9uRGF0YShzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjaywgZG9uZUdldHRpbmdTZXNzaW9uRGF0YUNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZG9uZUdldHRpbmdTZXNzaW9uRGF0YUNhbGxiYWNrKGRhdGEsIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjayk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nU2Vzc2lvbkRhdGEoc2Vzc2lvbkRhdGFTbmFwc2hvdCwgdXNlcm5hbWUsIHBlZXJJZCwgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhID0gc2Vzc2lvbkRhdGFTbmFwc2hvdC52YWwoKTtcclxuICB2YXIgbmV3VXNlciA9IHtcclxuICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgfTtcclxuICAvLyB3ZWlyZG5lc3M6IGkgd2FudCB0byBqdXN0IHB1c2ggbmV3VXNlciBvbnRvIHNlc3Npb25EYXRhLnVzZXJzLCBidXRcclxuICAvLyB0aGF0IG1lc3NlcyB1cCB0aGUgYXJyYXkgSSBndWVzc1xyXG4gIHZhciB1c2Vyc0FycmF5ID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZXNzaW9uRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHNlc3Npb25EYXRhLnVzZXJzW2ldKSB7XHJcbiAgICAgIHVzZXJzQXJyYXkucHVzaChzZXNzaW9uRGF0YS51c2Vyc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVzZXJzQXJyYXkucHVzaChuZXdVc2VyKTtcclxuICBzZXNzaW9uRGF0YS51c2VycyA9IHVzZXJzQXJyYXk7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gc2Vzc2lvbkRhdGFTbmFwc2hvdC5yZWYoKTtcclxuICBzZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbkRhdGEpO1xyXG4gIGNvbnNvbGUubG9nKCdqb2luaW5nIHNlc3Npb24gJyArIHNlc3Npb25EYXRhLmlkKTtcclxuICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBzZXNzaW9uLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuICBpZiAodXNlcnNBcnJheS5sZW5ndGggPT0gdGhpcy5NQVhfVVNFUlNfUEVSX1NFU1NJT04pIHtcclxuICAgIHNldFNlc3Npb25Ub0Z1bGwuY2FsbCh0aGlzLCBzZXNzaW9uRGF0YS5pZCk7XHJcbiAgfVxyXG4gIHZhciBwZWVySWRzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBqID0gMDsgaiA8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBwZWVySWRzQXJyYXkucHVzaChzZXNzaW9uRGF0YS51c2Vyc1tqXS5wZWVySWQpO1xyXG4gIH1cclxuICBpbml0aWFsaXplU2VydmVyUGluZy5jYWxsKHRoaXMpO1xyXG4gIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgZmFsc2UpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRTZXNzaW9uVG9GdWxsKHNlc3Npb25JZCkge1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tQXZhaWxhYmxlU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIGFkZFNlc3Npb25Ub0Z1bGxTZXNzaW9uc0xpc3QuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVTZXNzaW9uRnJvbUF2YWlsYWJsZVNlc3Npb25zKHNlc3Npb25JZCkge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5yZW1vdmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkU2Vzc2lvblRvRnVsbFNlc3Npb25zTGlzdChzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5GVUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlU2Vzc2lvbkZyb21GdWxsVG9BdmFpbGFibGUoc2Vzc2lvbklkKSB7XHJcbiAgcmVtb3ZlU2Vzc2lvbkZyb21GdWxsU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIGFkZFNlc3Npb25Ub0F2YWlsYWJsZVNlc3Npb25zTGlzdC5jYWxsKHRoaXMsIHNlc3Npb25JZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVNlc3Npb25Gcm9tRnVsbFNlc3Npb25zKHNlc3Npb25JZCkge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkZVTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZFNlc3Npb25Ub0F2YWlsYWJsZVNlc3Npb25zTGlzdChzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYuc2V0KHNlc3Npb25JZCk7XHJcbn1cclxuXHJcblxyXG4vLyAvLyByZXR1cm5zIG51bGwgaWYgdGhlIHVzZXIgd2Fzbid0IGZvdW5kIGluIHRoZSBzZXNzaW9uXHJcbi8vIGZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tU2Vzc2lvbkRhdGEocGVlcklkLCBzZXNzaW9uRGF0YSkge1xyXG4vLyAgIC8vIGlmIHNvbWV0aGluZydzIHdyb25nLCBqdXN0IHJldHVyblxyXG4vLyAgIGlmICghc2Vzc2lvbkRhdGEgfHwgIXNlc3Npb25EYXRhLnVzZXJzKSB7XHJcbi8vICAgICByZXR1cm4gbnVsbDtcclxuLy8gICB9XHJcblxyXG4vLyAgIC8vIFRPRE86IEZpcmViYXNlIGhhcyBhIGJldHRlciB3YXkgb2YgZG9pbmcgdGhpc1xyXG4vLyAgIHZhciBmb3VuZFBlZXIgPSBmYWxzZTtcclxuXHJcbi8vICAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbi8vICAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgc2Vzc2lvbi4gU28gdHJpbSBvdXQgdGhlIFxyXG4vLyAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbi8vICAgc2Vzc2lvbkRhdGEudXNlcnMgPSBzZXNzaW9uRGF0YS51c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG5cclxuLy8gICB1c2Vyc1dpdGhvdXRQZWVyID0gW107XHJcbi8vICAgZm9yIChpID0gMDsgaSA8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbi8vICAgICBpZiAoc2Vzc2lvbkRhdGEudXNlcnNbaV0ucGVlcklkID09IHBlZXJJZCkge1xyXG4vLyAgICAgICBmb3VuZFBlZXIgPSB0cnVlO1xyXG4vLyAgICAgfSBlbHNlIHtcclxuLy8gICAgICAgdXNlcnNXaXRob3V0UGVlci5wdXNoKHNlc3Npb25EYXRhLnVzZXJzW2ldKTtcclxuLy8gICAgIH1cclxuLy8gICB9XHJcblxyXG4vLyAgIGlmIChmb3VuZFBlZXIpIHtcclxuLy8gICAgIHNlc3Npb25EYXRhLnVzZXJzID0gdXNlcnNXaXRob3V0UGVlcjtcclxuLy8gICAgIHJldHVybiBzZXNzaW9uRGF0YTtcclxuLy8gICB9IGVsc2Uge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfSIsInZhciBTbXVnZ2xlcnNUb3duID0gcmVxdWlyZSgnLi9tYXBnYW1lLmpzJyk7XHJcblxyXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcclxuICAgIHZhciBnYW1lID0gbmV3IFNtdWdnbGVyc1Rvd24oJ2h0dHBzOi8vc211Z2dsZXJzdG93bi5maXJlYmFzZWlvLmNvbS8nKTtcclxufSk7Il19
