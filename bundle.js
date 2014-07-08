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
 *  createSession(username, peerId, sessionCreatedCallback)
 *
 *  username: Display name of user
 *  peerId: Unique user ID
 *  sessionCreatedCallback(sessionData):
 *     Will be called at the end when we created a session
 *
 *  sessionData: of this form
 *  {
 *    "hostPeerId": "87b3fvv9ezgaxlxr",
 *    "id": 9116827,
 *    "lastUpdateTime": 1404707577851,
 *    "users": [{
 *      "peerId": "87b3fvv9ezgaxlxr",
 *      "username": "Ninja Roy"
 *    }]
 *  }
 */
MatchmakerTown.prototype.createSession = function(username, peerId, sessionCreatedCallback) {
  // if there are any inactive sessions clean them up
  callAsyncCleanupInactiveSessions.call(this);
  console.log('trying to create session');
  var sessionData = createNewSessionData.call(this, username, peerId);
  createNewSessionInFirebase.call(this, username, peerId, sessionData);
  initializeServerPing.call(this);
  sessionCreatedCallback(sessionData);
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
    if (!this.myWorker) {
      //TODO: make this a module
      this.myWorker = new Worker("js/asyncmessager.js");
      this.myWorker.addEventListener('message', processMessageEvent.bind(this), false);
    }
  } else {
    console.log("Sorry, your browser does not support Web Workers...");
    // fine, we'll do it synchronously
    cleanupSessions.call(this);
  }
}

function callAsyncCleanupInactiveSessions() {
  initializeServerHelperWorker.call(this, window);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWFwZ2FtZS5qcyIsIkY6L1VzZXJzL0Rhbm55L1dlYnNpdGVzL1NtdWdnbGVyJ3MgVG93bi9tYXBnYW1lL21hdGNobWFrZXIuanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9zdGFydC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL2tEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogWU9VUiBTTVVHR0xFUiBNSVNTSU9OLCBJRiBZT1UgQ0hPT1NFIFRPIEFDQ0VQVCwgSVMgVE8gSk9JTiBURUFNXHJcbiAqIFRPV04gQU5EIFRSWSBUTyBERUZFQVQgVEVBTSBDUlVTSC4gIEFORCBZT1UgTVVTVCBBQ0NFUFQuLi5cclxuICovXHJcblxyXG4vKipcclxuICogIG1hcGdhbWUuanNcclxuICovXHJcblxyXG4vKipcclxuICogIGRlcHNcclxuICovXHJcbi8vdmFyIGluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcclxuLy92YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xyXG52YXIgTWF0Y2htYWtlclRvd24gPSByZXF1aXJlKCcuL21hdGNobWFrZXIuanMnKTtcclxuXHJcbi8qKlxyXG4gKiAgZXhwb3J0IGNsYXNzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IFNtdWdnbGVyc1Rvd247XHJcblxyXG4vKipcclxuICogIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBTbXVnZ2xlcnNUb3duKGZpcmViYXNlQmFzZVVybCkge1xyXG5cclxuICAvLyBiaW5kIHB1YmxpYyBjYWxsYmFjayBmdW5jdGlvbnNcclxuICB0aGlzLmluaXRpYWxpemUgPSB0aGlzLmluaXRpYWxpemUuYmluZCh0aGlzKTtcclxuICB0aGlzLmZyYW1lID0gdGhpcy5mcmFtZS5iaW5kKHRoaXMpO1xyXG4gIHRoaXMub25LZXlEb3duID0gdGhpcy5vbktleURvd24uYmluZCh0aGlzKTtcclxuICB0aGlzLm9uS2V5VXAgPSB0aGlzLm9uS2V5VXAuYmluZCh0aGlzKTtcclxuXHJcbiAgdGhpcy5rZWVwQWxpdmVQYXJhbU5hbWUgPSAna2VlcGFsaXZlJztcclxuICB0aGlzLnFzID0gbmV3IFF1ZXJ5U3RyaW5nKCk7XHJcblxyXG4gIHRoaXMubWF0Y2htYWtlclRvd24gPSBuZXcgTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKTtcclxuXHJcbiAgdGhpcy5tYXAgPSBudWxsOyAvLyB0aGUgbWFwIGNhbnZhcyBmcm9tIHRoZSBHb29nbGUgTWFwcyB2MyBqYXZhc2NyaXB0IEFQSVxyXG4gIHRoaXMubWFwWm9vbUxldmVsID0gMTg7XHJcbiAgdGhpcy5tYXBEYXRhID0gbnVsbDsgLy8gdGhlIGxldmVsIGRhdGEgZm9yIHRoaXMgbWFwIChiYXNlIGxvY2F0aW9ucylcclxuXHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0ID0gbnVsbDtcclxuICAvLyB0aGUgaXRlbU1hcE9iamVjdCB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICBsb2NhdGlvbjogPGdvb2dsZV9tYXBzX0xhdExuZ19vYmplY3Q+LFxyXG4gIC8vICAgbWFya2VyOiA8Z29vZ2xlX21hcHNfTWFya2VyX29iamVjdD5cclxuICAvLyB9XHJcblxyXG4gIC8vIGRlZmF1bHQgdG8gdGhlIGdyYW5kIGNhbnlvbiwgYnV0IHRoaXMgd2lsbCBiZSBsb2FkZWQgZnJvbSBhIG1hcCBmaWxlXHJcbiAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKDM2LjE1MTEwMywgLTExMy4yMDg1NjUpO1xyXG5cclxuXHJcblxyXG4gIC8vIGZvciB0aW1lLWJhc2VkIGdhbWUgbG9vcFxyXG4gIHRoaXMubm93O1xyXG4gIHRoaXMuZHQgPSAwO1xyXG4gIHRoaXMubGFzdCA9IHRpbWVzdGFtcC5jYWxsKHRoaXMpO1xyXG4gIHRoaXMuc3RlcCA9IDEgLyA2MDtcclxuXHJcbiAgLy8gdXNlciBkYXRhXHJcbiAgdGhpcy51c2VybmFtZSA9IG51bGw7XHJcblxyXG4gIC8vIGdhbWUgaG9zdGluZyBkYXRhXHJcbiAgdGhpcy5nYW1lSWQgPSBudWxsO1xyXG4gIHRoaXMuaG9zdFBlZXJJZCA9IG51bGw7XHJcblxyXG4gIC8vIGNhciBwcm9wZXJ0aWVzXHJcbiAgdGhpcy5yb3RhdGlvbiA9IDA7XHJcbiAgdGhpcy5kZWNlbGVyYXRpb24gPSAxLjE7XHJcbiAgdGhpcy5NQVhfTk9STUFMX1NQRUVEID0gMTg7XHJcbiAgdGhpcy5NQVhfQk9PU1RfU1BFRUQgPSA0MDtcclxuICB0aGlzLkJPT1NUX0ZBQ1RPUiA9IDEuMDc7XHJcbiAgdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFID0gMC41O1xyXG4gIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9OT1JNQUxfU1BFRUQ7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG4gIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyA9ICcnO1xyXG4gIHRoaXMubGF0aXR1ZGVTcGVlZEZhY3RvciA9IDEwMDAwMDA7XHJcbiAgdGhpcy5sb25naXR1ZGVTcGVlZEZhY3RvciA9IDUwMDAwMDtcclxuXHJcbiAgLy8gY29sbGlzaW9uIGVuZ2luZSBpbmZvXHJcbiAgdGhpcy5jYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZSA9IDIwO1xyXG4gIHRoaXMuY2FyVG9CYXNlQ29sbGlzaW9uRGlzdGFuY2UgPSA0MztcclxuXHJcbiAgLy8gbWFwIGRhdGFcclxuICB0aGlzLm1hcERhdGFMb2FkZWQgPSBmYWxzZTtcclxuICB0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsYXRpdHVkZSBkZWdyZWVzXHJcbiAgdGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zID0gMC4wMDg7IC8vIGluIGxvbmdpdHVkZSBkZWdyZWVzXHJcbiAgdGhpcy5taW5JdGVtRGlzdGFuY2VGcm9tQmFzZSA9IDMwMDtcclxuXHJcbiAgLy8gdGhlc2UgbWFwIG9iamVjdHMgd2lsbCBiZSBvZiB0aGUgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICBsb2NhdGlvbjogPGdvb2dsZV9tYXBzX0xhdExuZ19vYmplY3Q+LFxyXG4gIC8vICAgbWFya2VyOiA8Z29vZ2xlX21hcHNfTWFya2VyX29iamVjdD5cclxuICAvLyB9XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgPSB7XHJcbiAgICBsb2NhdGlvbjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBtYXJrZXI6IG51bGxcclxuICB9XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ID0gbnVsbDtcclxuICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgLy8gZ2FtZXBsYXlcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdCA9IHtcclxuICAgIHRlYW1Ub3duT2JqZWN0OiB7XHJcbiAgICAgIHVzZXJzOiBbXSxcclxuICAgICAgYmFzZU9iamVjdDoge1xyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBsYXQ6IDM2LjE1MTEwMyxcclxuICAgICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICAgIH0sXHJcbiAgICB0ZWFtQ3J1c2hPYmplY3Q6IHtcclxuICAgICAgdXNlcnM6IFtdLFxyXG4gICAgICBiYXNlT2JqZWN0OiB7XHJcbiAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgIGxhdDogMzYuMTUxMTAzLFxyXG4gICAgICAgICAgbG5nOiAtMTEzLjIwODU2NVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gICAgfSxcclxuICAgIHBlZXJJZE9mQ2FyV2l0aEl0ZW06IG51bGwsXHJcbiAgICBpbml0aWFsTG9jYXRpb246IHtcclxuICAgICAgbGF0OiB0aGlzLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiB0aGlzLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfVxyXG4gIH07XHJcbiAgLy8gdGhpcyB3aWxsIGJlIG9mIHRoZSBmb3JtXHJcbiAgLy8ge1xyXG4gIC8vICAgdGVhbVRvd25PYmplY3Q6IDx0ZWFtX29iamVjdD4sXHJcbiAgLy8gICB0ZWFtQ3J1c2hPYmplY3Q6IDx0ZWFtX29iamVjdD4sXHJcbiAgLy8gICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gIC8vICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgLy8gICAgIGxhdDogMzUsXHJcbiAgLy8gICAgIGxuZzogLTEzMlxyXG4gIC8vIH1cclxuICAvLyAgIGl0ZW1PYmplY3Q6IHtcclxuICAvLyAgICAgaWQ6IDU3NixcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9XHJcbiAgLy8gfVxyXG5cclxuICAvLyB0aGUgPHRlYW1fb2JqZWN0PiBzdHJ1Y3R1cmVzIGFib3ZlIHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIHVzZXJzOiBbe1xyXG4gIC8vICAgICBwZWVySWQ6IDEyMzQ1Njc4OSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdyb3knXHJcbiAgLy8gICB9LCB7XHJcbiAgLy8gICAgIHBlZXJJZDogOTg3NjU0MzIxLFxyXG4gIC8vICAgICB1c2VybmFtZTogJ2hhbSdcclxuICAvLyAgIH1dLFxyXG4gIC8vICAgYmFzZU9iamVjdDoge1xyXG4gIC8vICAgICBsb2NhdGlvbjoge1xyXG4gIC8vICAgICAgIGxhdDogMzQsXHJcbiAgLy8gICAgICAgbG5nOiAtMTMzXHJcbiAgLy8gICAgIH1cclxuICAvLyAgIH0sXHJcbiAgLy8gICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgLy8gfVxyXG5cclxuXHJcblxyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgLy8gc2V0IHRoZSBpbml0aWFsIGRlc3RpbmF0aW9uIHRvIHdoYXRldmVyLCBpdCB3aWxsIGJlIHJlc2V0IFxyXG4gIC8vIHdoZW4gYW4gaXRlbSBpcyBmaXJzdCBwbGFjZWRcclxuICB0aGlzLmRlc3RpbmF0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyg0NS40ODkzOTEsIC0xMjIuNjQ3NTg2KTtcclxuICB0aGlzLnRpbWVEZWxheUJldHdlZW5UcmFuc2ZlcnMgPSAxMDAwOyAvLyBpbiBtc1xyXG4gIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gbnVsbDtcclxuXHJcbiAgLy8gb2JqZWN0IG9mIHRoZSBvdGhlciB1c2Vyc1xyXG4gIHRoaXMub3RoZXJVc2VycyA9IHt9O1xyXG4gIC8vIHRoZSBvdGhlclVzZXJzIGRhdGEgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgMTIzNDU2Nzg5OiB7XHJcbiAgLy8gICAgIHBlZXJJZDogMTIzNDY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiBoZWxsb3JveSxcclxuICAvLyAgICAgY2FyOiB7XHJcbiAgLy8gICAgICAgbG9jYXRpb246IDxsb2NhdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICAgIG1hcmtlcjogPG1hcmtlcl9vYmplY3Q+XHJcbiAgLy8gICAgIH0sXHJcbiAgLy8gICAgIHBlZXJKc0Nvbm5lY3Rpb246IDxwZWVySnNDb25uZWN0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgIGxhc3RVcGRhdGVUaW1lOiA8dGltZV9vYmplY3Q+LFxyXG4gIC8vICAgICBudW1JdGVtczogMCxcclxuICAvLyAgICAgaGFzQmVlbkluaXRpYWxpemVkOiB0cnVlXHJcbiAgLy8gICB9LFxyXG4gIC8vICAgOTg3NjU0MzIxOiB7XHJcbiAgLy8gICAgIHBlZXJJZDogOTg3NjU0MzIxLFxyXG4gIC8vICAgICB1c2VybmFtZTogdG93bnRvd245MDAwLFxyXG4gIC8vICAgICBjYXI6IHtcclxuICAvLyAgICAgICBsb2NhdGlvbjogPGxvY2F0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgICAgbWFya2VyOiA8bWFya2VyX29iamVjdD5cclxuICAvLyAgICAgfSxcclxuICAvLyAgICAgcGVlckpzQ29ubmVjdGlvbjogPHBlZXJKc0Nvbm5lY3Rpb25fb2JqZWN0PixcclxuICAvLyAgICAgbGFzdFVwZGF0ZVRpbWU6IDx0aW1lX29iamVjdD4sXHJcbiAgLy8gICAgIG51bUl0ZW1zOiA1XHJcbiAgLy8gICB9XHJcbiAgLy8gfVxyXG5cclxuICAvLyBpbWFnZXNcclxuICB0aGlzLml0ZW1JY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3Ntb2tpbmdfdG9pbGV0X3NtYWxsLmdpZidcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaFVzZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2NydXNoX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1Ub3duVXNlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvY2FyLnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDE2LCAzMilcclxuICB9O1xyXG4gIHRoaXMudGVhbVRvd25PdGhlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvdGVhbV90b3duX290aGVyX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1DcnVzaE90aGVyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy90ZWFtX2NydXNoX290aGVyX2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2ZvcnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL29wcG9uZW50X2ZvcnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9mb3J0X3RyYW5zcGFyZW50LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL29wcG9uZW50X2ZvcnRfdHJhbnNwYXJlbnQucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoNzUsIDEyMClcclxuICB9O1xyXG5cclxuXHJcbiAgLy8gcGVlciBKUyBjb25uZWN0aW9uIChmb3IgbXVsdGlwbGF5ZXIgd2ViUlRDKVxyXG4gIHRoaXMucGVlciA9IG5ldyBQZWVyKHtcclxuICAgIGtleTogJ2ozbTBxdGRkZXNocGszeHInXHJcbiAgfSk7XHJcbiAgdGhpcy5wZWVyLm9uKCdvcGVuJywgZnVuY3Rpb24oaWQpIHtcclxuICAgIGNvbnNvbGUubG9nKCdNeSBwZWVyIElEIGlzOiAnICsgaWQpO1xyXG4gICAgJCgnI3BlZXItaWQnKS50ZXh0KGlkKTtcclxuICAgICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnd2FpdGluZyBmb3IgYSBzbXVnZ2xlciB0byBiYXR0bGUuLi4nKTtcclxuICB9KTtcclxuICB0aGlzLnBlZXIub24oJ2Nvbm5lY3Rpb24nLCBjb25uZWN0ZWRUb1BlZXIuYmluZCh0aGlzKSk7XHJcbiAgdGhpcy5BQ1RJVkVfQ09OTkVDVElPTl9USU1FT1VUX0lOX1NFQ09ORFMgPSAzMCAqIDEwMDA7XHJcblxyXG5cclxuICBnb29nbGUubWFwcy5ldmVudC5hZGREb21MaXN0ZW5lcih3aW5kb3csICdsb2FkJywgdGhpcy5pbml0aWFsaXplKTtcclxufVxyXG5cclxuLyoqXHJcbiAqICBpbml0aWFsaXplIHRoZSBnYW1lXHJcbiAqL1xyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICB0aGlzLnVzZXJuYW1lID0gcHJvbXB0KCdDaG9vc2UgeW91ciBTbXVnZ2xlciBOYW1lOicsICdOaW5qYSBSb3knKTtcclxuICBjcmVhdGVNYXBPblBhZ2UuY2FsbCh0aGlzKTtcclxuICBsb2FkTWFwRGF0YS5jYWxsKHRoaXMsIG1hcElzUmVhZHkpO1xyXG5cclxuICAvLyB0aGVzZSBhcmUgc2V0IHRvIHRydWUgd2hlbiBrZXlzIGFyZSBiZWluZyBwcmVzc2VkXHJcbiAgdGhpcy5yaWdodERvd24gPSBmYWxzZTtcclxuICB0aGlzLmxlZnREb3duID0gZmFsc2U7XHJcbiAgdGhpcy51cERvd24gPSBmYWxzZTtcclxuICB0aGlzLmRvd25Eb3duID0gZmFsc2U7XHJcbiAgdGhpcy5jdHJsRG93biA9IGZhbHNlO1xyXG5cclxuICB0aGlzLnNwZWVkID0gMDtcclxuICB0aGlzLnJvdGF0aW9uID0gMDtcclxuICB0aGlzLmhvcml6b250YWxTcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbkNzcyA9ICcnO1xyXG5cclxuICAvL3RyeUZpbmRpbmdMb2NhdGlvbigpO1xyXG5cclxuXHJcbiAgYmluZEtleUFuZEJ1dHRvbkV2ZW50cy5jYWxsKHRoaXMpO1xyXG5cclxuICBpbml0aWFsaXplQm9vc3RCYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gc3RhcnQgdGhlIGdhbWUgbG9vcFxyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmZyYW1lKTtcclxufVxyXG5cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUuZnJhbWUgPSBmdW5jdGlvbigpIHtcclxuICB0aGlzLm5vdyA9IHRpbWVzdGFtcC5jYWxsKHRoaXMpO1xyXG4gIHRoaXMuZHQgPSB0aGlzLmR0ICsgTWF0aC5taW4oMSwgKHRoaXMubm93IC0gdGhpcy5sYXN0KSAvIDEwMDApO1xyXG4gIHdoaWxlICh0aGlzLmR0ID4gdGhpcy5zdGVwKSB7XHJcbiAgICB0aGlzLmR0ID0gdGhpcy5kdCAtIHRoaXMuc3RlcDtcclxuICAgIHVwZGF0ZS5jYWxsKHRoaXMsIHRoaXMuc3RlcCk7XHJcbiAgfVxyXG4gIHJlbmRlci5jYWxsKHRoaXMsIHRoaXMuZHQpO1xyXG4gIHRoaXMubGFzdCA9IHRoaXMubm93O1xyXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLmZyYW1lKTtcclxufVxyXG5cclxuLy8ga2V5IGV2ZW50c1xyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5vbktleURvd24gPSBmdW5jdGlvbihldnQpIHtcclxuICBpZiAoZXZ0LmtleUNvZGUgPT0gMzkpIHtcclxuICAgIHRoaXMucmlnaHREb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICB0aGlzLmxlZnREb3duID0gdHJ1ZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM4KSB7XHJcbiAgICB0aGlzLnVwRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSA0MCkge1xyXG4gICAgdGhpcy5kb3duRG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgdGhpcy5jdHJsRG93biA9IHRydWU7XHJcbiAgfVxyXG59XHJcblxyXG5TbXVnZ2xlcnNUb3duLnByb3RvdHlwZS5vbktleVVwID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICB0aGlzLnJpZ2h0RG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMzcpIHtcclxuICAgIHRoaXMubGVmdERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM4KSB7XHJcbiAgICB0aGlzLnVwRG93biA9IGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIHRoaXMuZG93bkRvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDE3KSB7XHJcbiAgICB0aGlzLmN0cmxEb3duID0gZmFsc2U7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZUJvb3N0QmFyKCkge1xyXG4gICQoZnVuY3Rpb24oKSB7XHJcbiAgICAkKFwiI2Jvb3N0LWJhclwiKS5wcm9ncmVzc2Jhcih7XHJcbiAgICAgIHZhbHVlOiAxMDBcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtYXBJc1JlYWR5KCkge1xyXG4gIHRoaXMubWF0Y2htYWtlclRvd24uam9pbk9yQ3JlYXRlU2Vzc2lvbih0aGlzLnVzZXJuYW1lLCB0aGlzLnBlZXIuaWQsIGdhbWVKb2luZWQuYmluZCh0aGlzKSlcclxufVxyXG5cclxuLypcclxuICogQ2FsbGVkIHdoZW4gdGhlIG1hdGNobWFrZXIgaGFzIGZvdW5kIGEgZ2FtZSBmb3IgdXNcclxuICpcclxuICovXHJcblxyXG5mdW5jdGlvbiBnYW1lSm9pbmVkKHNlc3Npb25EYXRhLCBpc05ld0dhbWUpIHtcclxuICB0aGlzLmdhbWVJZCA9IHNlc3Npb25EYXRhLmlkO1xyXG5cclxuICBpZiAoaXNOZXdHYW1lKSB7XHJcbiAgICAvLyB3ZSdyZSBob3N0aW5nIHRoZSBnYW1lIG91cnNlbGZcclxuICAgIHRoaXMuaG9zdFBlZXJJZCA9IHRoaXMucGVlci5pZDtcclxuXHJcbiAgICAvLyBmaXJzdCB1c2VyIGlzIGFsd2F5cyBvbiB0ZWFtIHRvd25cclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMgPSBbe1xyXG4gICAgICBwZWVySWQ6IHRoaXMucGVlci5pZCxcclxuICAgICAgdXNlcm5hbWU6IHRoaXMudXNlcm5hbWVcclxuICAgIH1dO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3llbGxvdycpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdjb2xvcicsICdibGFjaycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBzb21lb25lIGVsc2UgaXMgYWxyZWFkeSB0aGUgaG9zdFxyXG4gICAgdGhpcy5ob3N0UGVlcklkID0gc2Vzc2lvbkRhdGEuaG9zdFBlZXJJZDtcclxuICAgIGFjdGl2YXRlVGVhbUNydXNoSW5VSS5jYWxsKHRoaXMpO1xyXG4gICAgLy8gUDJQIGNvbm5lY3QgdG8gYWxsIG90aGVyIHVzZXJzXHJcbiAgICB2YXIgdXNlcklkcyA9IHNlc3Npb25EYXRhLnVzZXJzLm1hcChmdW5jdGlvbih1c2VyT2JqKSB7XHJcbiAgICAgIHJldHVybiB1c2VyT2JqLnBlZXJJZDtcclxuICAgIH0pO1xyXG4gICAgY29ubmVjdFRvQWxsT3RoZXJVc2Vycy5jYWxsKHRoaXMsIHVzZXJJZHMpO1xyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbiAgdXBkYXRlQ2FySWNvbnMuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVXNlcm5hbWVzSW5VSSgpIHtcclxuICB2YXIgdGVhbVRvd25KcXVlcnlFbGVtID0gJCgnI3RlYW0tdG93bi11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVG93bkpxdWVyeUVsZW0sIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMpO1xyXG4gIHZhciB0ZWFtQ3J1c2hKcXVlcnlFbGVtID0gJCgnI3RlYW0tY3J1c2gtdXNlcm5hbWVzJyk7XHJcbiAgdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbUNydXNoSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJuYW1lc0luVUkodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0sIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICAvLyBjbGVhciB0aGUgY3VycmVudCBsaXN0IG9mIHVzZXJuYW1lc1xyXG4gIHRlYW1Vc2VybmFtZXNKcXVlcnlFbGVtLmVtcHR5KCk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VyT2JqZWN0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbmV3SnF1ZXJ5RWxlbSA9ICQoJC5wYXJzZUhUTUwoXHJcbiAgICAgICc8bGkgaWQ9XCJ1c2VybmFtZS0nICtcclxuICAgICAgdXNlck9iamVjdHNBcnJheVtpXS5wZWVySWQgK1xyXG4gICAgICAnXCI+JyArIHVzZXJPYmplY3RzQXJyYXlbaV0udXNlcm5hbWUgKyAnPC9saT4nXHJcbiAgICApKTtcclxuICAgICQodGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0pLmFwcGVuZChuZXdKcXVlcnlFbGVtKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFjdGl2YXRlVGVhbUNydXNoSW5VSSgpIHtcclxuICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcclxuICB2YXIgdGVhbUNydXNoU2NvcmUgPSAwO1xyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKSB7XHJcbiAgICB0ZWFtQ3J1c2hTY29yZSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQ7XHJcbiAgfVxyXG4gICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGVhbUNydXNoU2NvcmUpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvQWxsT3RoZXJVc2VycyhhbGxQZWVySWRzKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxQZWVySWRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAoYWxsUGVlcklkc1tpXSAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgY29ubmVjdFRvUGVlci5jYWxsKHRoaXMsIGFsbFBlZXJJZHNbaV0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYmluZEtleUFuZEJ1dHRvbkV2ZW50cygpIHtcclxuICAkKHdpbmRvdykucmVzaXplKGZ1bmN0aW9uKCkge1xyXG4gICAgcmVzaXplTWFwVG9GaXQuY2FsbCh0aGlzKTtcclxuICB9KTtcclxuXHJcbiAgJChkb2N1bWVudCkua2V5ZG93bih0aGlzLm9uS2V5RG93bik7XHJcbiAgJChkb2N1bWVudCkua2V5dXAodGhpcy5vbktleVVwKTtcclxuICAkKCcjY29ubmVjdC1idXR0b24nKS5jbGljayhmdW5jdGlvbihldnQpIHtcclxuICAgIHZhciBwZWVySWQgPSAkKCcjcGVlci1pZC10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBjb25zb2xlLmxvZygncGVlciBpZCBjb25uZWN0aW5nOiAnICsgcGVlcklkKTtcclxuICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBwZWVySWQpO1xyXG4gIH0pO1xyXG4gICQoJyNzZXQtY2VudGVyLWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHNlYXJjaFRlcm0gPSAkKCcjbWFwLWNlbnRlci10ZXh0Ym94JykudmFsKCk7XHJcbiAgICBpZiAoIXNlYXJjaFRlcm0pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ3NldHRpbmcgY2VudGVyIHRvOiAnICsgc2VhcmNoVGVybSk7XHJcbiAgICBzZWFyY2hBbmRDZW50ZXJNYXAuY2FsbCh0aGlzLCBzZWFyY2hUZXJtKTtcclxuICAgIGJyb2FkY2FzdE5ld0xvY2F0aW9uLmNhbGwodGhpcywgdGhpcy5tYXBDZW50ZXIpO1xyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG4gIHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGRpc2Nvbm5lY3RGcm9tR2FtZS5iaW5kKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXNjb25uZWN0RnJvbUdhbWUoKSB7XHJcbiAgaWYgKHRoaXMucGVlciAmJiB0aGlzLnBlZXIuaWQgJiYgdGhpcy5nYW1lSWQpIHtcclxuICAgIHRoaXMubWF0Y2htYWtlclRvd24ucmVtb3ZlUGVlckZyb21TZXNzaW9uKHRoaXMuZ2FtZUlkLCB0aGlzLnBlZXIuaWQpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlTWFwT25QYWdlKCkge1xyXG4gIHZhciBtYXBPcHRpb25zID0ge1xyXG4gICAgem9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBjZW50ZXI6IHRoaXMubWFwQ2VudGVyLFxyXG4gICAga2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxyXG4gICAgbWFwVHlwZUlkOiBnb29nbGUubWFwcy5NYXBUeXBlSWQuU0FURUxMSVRFLFxyXG4gICAgZGlzYWJsZURlZmF1bHRVSTogdHJ1ZSxcclxuICAgIG1pblpvb206IHRoaXMubWFwWm9vbUxldmVsLFxyXG4gICAgbWF4Wm9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBzY3JvbGx3aGVlbDogZmFsc2UsXHJcbiAgICBkaXNhYmxlRG91YmxlQ2xpY2tab29tOiB0cnVlLFxyXG4gICAgZHJhZ2dhYmxlOiBmYWxzZSxcclxuICB9XHJcblxyXG4gIHRoaXMubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwLWNhbnZhcycpLCBtYXBPcHRpb25zKTtcclxuXHJcbiAgLy8gbm90IG5lY2Vzc2FyeSwganVzdCB3YW50IHRvIGFsbG93IHRoZSByaWdodC1jbGljayBjb250ZXh0IG1lbnVcclxuICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xyXG4gICAgY29udGV4dG1lbnU6IHRydWVcclxuICB9KTtcclxuICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lcih0aGlzLm1hcCwgXCJyaWdodGNsaWNrXCIsIHRoaXMuc2hvd0NvbnRleHRNZW51KTtcclxuXHJcbiAgcmVzaXplTWFwVG9GaXQuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzaXplTWFwVG9GaXQoKSB7XHJcbiAgJCgnYm9keScpLmhlaWdodCgkKHdpbmRvdykuaGVpZ2h0KCkgLSAyKTtcclxuICB2YXIgbWFpbkhlaWdodCA9ICQoJ2JvZHknKS5oZWlnaHQoKTtcclxuICB2YXIgY29udGVudEhlaWdodCA9XHJcbiAgICAkKCcjaGVhZGVyJykub3V0ZXJIZWlnaHQoKSArXHJcbiAgICAkKCcjZm9vdGVyJykub3V0ZXJIZWlnaHQoKTtcclxuICB2YXIgaCA9IG1haW5IZWlnaHQgLSBjb250ZW50SGVpZ2h0O1xyXG4gICQoJyNtYXAtYm9keScpLmhlaWdodChoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2VhcmNoQW5kQ2VudGVyTWFwKHNlYXJjaFRlcm0pIHtcclxuICB2YXIgcGFydHMgPSBzZWFyY2hUZXJtLnNwbGl0KCcsJyk7XHJcbiAgaWYgKCFwYXJ0cykge1xyXG4gICAgLy8gYmFkIHNlYXJjaCBpbnB1dCwgbXVzdCBiZSBpbiBsYXQsbG5nIGZvcm1cclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgdmFyIGxhdFN0cmluZyA9IHBhcnRzWzBdO1xyXG4gIHZhciBsbmdTdHJpbmcgPSBwYXJ0c1sxXTtcclxuICBzZXRHYW1lVG9OZXdMb2NhdGlvbi5jYWxsKHRoaXMsIGxhdFN0cmluZywgbG5nU3RyaW5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZE1hcERhdGEobWFwSXNSZWFkeUNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMubWFwRGF0YUxvYWRlZCA9IGZhbHNlO1xyXG4gIGNvbnNvbGUubG9nKCdsb2FkaW5nIG1hcCBkYXRhJyk7XHJcblxyXG4gIC8vIFRPRE86IFxyXG4gIC8vIHRvIHJlYWQgc3RhdGljIGZpbGVzIGluXHJcbiAgLy8geW91IG5lZWQgdG8gcGFzcyBcIi10IGJyZnNcIiB0byBicm93c2VyaWZ5XHJcbiAgLy8gYnV0IGl0J3MgY29vbCBjb3MgeW91IGNhbiBpbmxpbmUgYmFzZTY0IGVuY29kZWQgaW1hZ2VzIG9yIHV0ZjggaHRtbCBzdHJpbmdzXHJcbiAgLy8kLmdldEpTT04oXCJtYXBzL2dyYW5kY2FueW9uLmpzb25cIiwgZnVuY3Rpb24oanNvbikge1xyXG4gICQuZ2V0SlNPTihcIm1hcHMvcG9ydGxhbmQuanNvblwiLCBmdW5jdGlvbihqc29uKSB7XHJcbiAgICBjb25zb2xlLmxvZygnbWFwIGRhdGEgbG9hZGVkJyk7XHJcbiAgICBzZWxmLm1hcERhdGEgPSBqc29uO1xyXG4gICAgc2VsZi5tYXBEYXRhTG9hZGVkID0gdHJ1ZTtcclxuICAgIHNlbGYubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhzZWxmLm1hcERhdGEubWFwLmNlbnRlckxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAuY2VudGVyTGF0TG5nLmxuZyk7XHJcbiAgICBzZWxmLm1hcC5zZXRDZW50ZXIoc2VsZi5tYXBDZW50ZXIpO1xyXG4gICAgc2VsZi5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24gPSB7XHJcbiAgICAgIGxhdDogc2VsZi5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgIGxuZzogc2VsZi5tYXBDZW50ZXIubG5nKClcclxuICAgIH07XHJcblxyXG4gICAgY3JlYXRlVGVhbVRvd25CYXNlLmNhbGwoc2VsZiwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtVG93bkJhc2VMYXRMbmcubGF0LCBzZWxmLm1hcERhdGEubWFwLnRlYW1Ub3duQmFzZUxhdExuZy5sbmcpO1xyXG4gICAgY3JlYXRlVGVhbUNydXNoQmFzZS5jYWxsKHNlbGYsIHNlbGYubWFwRGF0YS5tYXAudGVhbUNydXNoQmFzZUxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAudGVhbUNydXNoQmFzZUxhdExuZy5sbmcpO1xyXG4gICAgc2VsZi5teVRlYW1CYXNlTWFwT2JqZWN0ID0gc2VsZi50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcblxyXG4gICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHNlbGYpO1xyXG4gICAgbWFwSXNSZWFkeUNhbGxiYWNrLmNhbGwoc2VsZik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZShsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdCA9IGNyZWF0ZVRlYW1Ub3duQmFzZU9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2UobGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0ID0gY3JlYXRlVGVhbUNydXNoQmFzZU9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtVG93bkJhc2VNYXBPYmplY3QobGF0LCBsbmcpIHtcclxuICAvLyBpZiB0aGVyZSdzIGFscmVhZHkgYSB0ZWFtIFRvd24gYmFzZSBvbiB0aGUgbWFwLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgJiYgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QgPSB7fTtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgdGl0bGU6ICdUZWFtIFRvd24gQmFzZScsXHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgcG9zaXRpb246IHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLFxyXG4gICAgaWNvbjogdGhpcy50ZWFtVG93bkJhc2VJY29uXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZU9iamVjdChsYXQsIGxuZykge1xyXG4gIHZhciB0ZWFtVG93bkJhc2VPYmplY3QgPSB7fTtcclxuICB0ZWFtVG93bkJhc2VPYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRlYW1Ub3duQmFzZU9iamVjdDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdChsYXQsIGxuZykge1xyXG4gIC8vIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIHRlYW0gQ3J1c2ggYmFzZSBvbiB0aGUgbWFwLCByZW1vdmUgaXRcclxuICBpZiAodGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ICYmIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0ID0ge307XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgdGl0bGU6ICdUZWFtIENydXNoIEJhc2UnLFxyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHBvc2l0aW9uOiB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubG9jYXRpb24sXHJcbiAgICBpY29uOiB0aGlzLnRlYW1DcnVzaEJhc2VJY29uXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1DcnVzaEJhc2VPYmplY3QobGF0LCBsbmcpIHtcclxuXHJcbiAgdmFyIHRlYW1DcnVzaEJhc2VPYmplY3QgPSB7fTtcclxuICB0ZWFtQ3J1c2hCYXNlT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsYXQsXHJcbiAgICBsbmc6IGxuZ1xyXG4gIH07XHJcblxyXG4gIHJldHVybiB0ZWFtQ3J1c2hCYXNlT2JqZWN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiByYW5kb21seVB1dEl0ZW1zKCkge1xyXG4gIHZhciByYW5kb21Mb2NhdGlvbiA9IGdldFJhbmRvbUxvY2F0aW9uRm9ySXRlbS5jYWxsKHRoaXMpO1xyXG4gIHZhciBpdGVtSWQgPSBnZXRSYW5kb21JblJhbmdlKDEsIDEwMDAwMDAsIDApO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCA9IHtcclxuICAgIGlkOiBpdGVtSWQsXHJcbiAgICBsb2NhdGlvbjoge1xyXG4gICAgICBsYXQ6IHJhbmRvbUxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICBsbmc6IHJhbmRvbUxvY2F0aW9uLmxuZygpXHJcbiAgICB9XHJcbiAgfVxyXG4gIHB1dE5ld0l0ZW1Pbk1hcC5jYWxsKHRoaXMsIHJhbmRvbUxvY2F0aW9uLCBpdGVtSWQpO1xyXG4gIGJyb2FkY2FzdE5ld0l0ZW0uY2FsbCh0aGlzLCByYW5kb21Mb2NhdGlvbiwgaXRlbUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0UmFuZG9tTG9jYXRpb25Gb3JJdGVtKCkge1xyXG4gIC8vIEZpbmQgYSByYW5kb20gbG9jYXRpb24gdGhhdCB3b3JrcywgYW5kIGlmIGl0J3MgdG9vIGNsb3NlXHJcbiAgLy8gdG8gdGhlIGJhc2UsIHBpY2sgYW5vdGhlciBsb2NhdGlvblxyXG4gIHZhciByYW5kb21Mb2NhdGlvbiA9IG51bGw7XHJcbiAgdmFyIGNlbnRlck9mQXJlYUxhdCA9IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbi5sYXQoKTtcclxuICB2YXIgY2VudGVyT2ZBcmVhTG5nID0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLmxuZygpO1xyXG4gIHdoaWxlICh0cnVlKSB7XHJcbiAgICByYW5kb21MYXQgPSBnZXRSYW5kb21JblJhbmdlKGNlbnRlck9mQXJlYUxhdCAtXHJcbiAgICAgICh0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIGNlbnRlck9mQXJlYUxhdCArICh0aGlzLndpZHRoT2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIDcpO1xyXG4gICAgcmFuZG9tTG5nID0gZ2V0UmFuZG9tSW5SYW5nZShjZW50ZXJPZkFyZWFMbmcgLVxyXG4gICAgICAodGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgY2VudGVyT2ZBcmVhTG5nICsgKHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyAvIDIuMCksIDcpO1xyXG4gICAgY29uc29sZS5sb2coJ3RyeWluZyB0byBwdXQgaXRlbSBhdDogJyArIHJhbmRvbUxhdCArICcsJyArIHJhbmRvbUxuZyk7XHJcbiAgICByYW5kb21Mb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcocmFuZG9tTGF0LCByYW5kb21MbmcpO1xyXG4gICAgaWYgKGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKHJhbmRvbUxvY2F0aW9uLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pID4gdGhpcy5taW5JdGVtRGlzdGFuY2VGcm9tQmFzZSkge1xyXG4gICAgICByZXR1cm4gcmFuZG9tTG9jYXRpb247XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnaXRlbSB0b28gY2xvc2UgdG8gYmFzZSwgY2hvb3NpbmcgYW5vdGhlciBsb2NhdGlvbi4uLicpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHV0TmV3SXRlbU9uTWFwKGxvY2F0aW9uLCBpdGVtSWQpIHtcclxuICAvLyBldmVudHVhbGx5IHRoaXMgc2hvdWxkIGJlIHJlZHVuZGFudCB0byBjbGVhciB0aGlzLCBidXQgd2hpbGVcclxuICAvLyB0aGVyZSdzIGEgYnVnIG9uIG11bHRpcGxheWVyIGpvaW5pbmcsIGNsZWFyIGl0IGFnYWluXHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG5cclxuICAvLyBzZXQgdGhlIGJhc2UgaWNvbiBpbWFnZXMgdG8gYmUgdGhlIGxpZ2h0ZXIgb25lc1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuXHJcbiAgLy8gaW4gY2FzZSB0aGVyZSdzIGEgbGluZ2VyaW5nIGl0ZW0sIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLml0ZW1NYXBPYmplY3QgJiYgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlciAmJiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLm1hcCkge1xyXG4gICAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB2YXIgaXRlbU1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgbWFwOiB0aGlzLm1hcCxcclxuICAgIHRpdGxlOiAnSXRlbScsXHJcbiAgICBpY29uOiB0aGlzLml0ZW1JY29uLFxyXG4gICAgLy8gLy9UT0RPOiBGSVggU1RVUElEIEdPT0dMRSBNQVBTIEJVRyB0aGF0IGNhdXNlcyB0aGUgZ2lmIG1hcmtlclxyXG4gICAgLy8gLy90byBteXN0ZXJpb3VzbHkgbm90IHNob3cgdXAgc29tZXRpbWVzXHJcbiAgICAvLyBvcHRpbWl6ZWQ6IGZhbHNlLFxyXG4gICAgcG9zaXRpb246IGxvY2F0aW9uXHJcbiAgfSk7XHJcblxyXG4gIHRoaXMuaXRlbU1hcE9iamVjdCA9IHtcclxuICAgIG1hcmtlcjogaXRlbU1hcmtlcixcclxuICAgIGxvY2F0aW9uOiBsb2NhdGlvblxyXG4gIH07XHJcblxyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICBsbmc6IGxvY2F0aW9uLmxuZygpXHJcbiAgfTtcclxuXHJcbiAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCBsb2NhdGlvbiwgJ2Fycm93LnBuZycpO1xyXG4gIHJldHVybiBpdGVtSWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUJvb3N0aW5nKCkge1xyXG4gIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9OT1JNQUxfU1BFRUQ7XHJcbiAgaWYgKCQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpIHx8ICQoJyNib29zdC1iYXInKS5wcm9ncmVzc2JhcihcInZhbHVlXCIpID09IDApIHtcclxuICAgIHZhciBib29zdEJhclZhbHVlID0gJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIik7XHJcbiAgICBpZiAodGhpcy5jdHJsRG93biAmJiBib29zdEJhclZhbHVlID4gMCkge1xyXG4gICAgICBib29zdEJhclZhbHVlIC09IHRoaXMuQk9PU1RfQ09OU1VNUFRJT05fUkFURTtcclxuICAgICAgJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIiwgYm9vc3RCYXJWYWx1ZSk7XHJcbiAgICAgIHRoaXMubWF4U3BlZWQgPSB0aGlzLk1BWF9CT09TVF9TUEVFRDtcclxuICAgICAgdGhpcy5zcGVlZCAqPSB0aGlzLkJPT1NUX0ZBQ1RPUjtcclxuICAgICAgaWYgKE1hdGguYWJzKHRoaXMuc3BlZWQpID4gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIGlmICh0aGlzLnNwZWVkIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5zcGVlZCA9IC10aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLnNwZWVkID0gdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgKj0gdGhpcy5CT09TVF9GQUNUT1I7XHJcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLmhvcml6b250YWxTcGVlZCkgPiB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkIDwgMCkge1xyXG4gICAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAtdGhpcy5tYXhTcGVlZDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSB0aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuY3RybERvd24gJiYgYm9vc3RCYXJWYWx1ZSA8PSAwKSB7XHJcbiAgICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNib29zdC1iYXInKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5tYXhTcGVlZDtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZUNhcigpIHtcclxuICB0aGlzLm1heFNwZWVkID0gaGFuZGxlQm9vc3RpbmcuY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gaWYgVXAgb3IgRG93biBrZXkgaXMgcHJlc3NlZCwgY2hhbmdlIHRoZSBzcGVlZC4gT3RoZXJ3aXNlLFxyXG4gIC8vIGRlY2VsZXJhdGUgYXQgYSBzdGFuZGFyZCByYXRlXHJcbiAgaWYgKHRoaXMudXBEb3duIHx8IHRoaXMuZG93bkRvd24pIHtcclxuICAgIGlmICh0aGlzLnVwRG93bikge1xyXG4gICAgICBpZiAodGhpcy5zcGVlZCA8PSB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5zcGVlZCArPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5kb3duRG93bikge1xyXG4gICAgICBpZiAodGhpcy5zcGVlZCA+PSAtdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuc3BlZWQgLT0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9XHJcblxyXG4gIC8vIGlmIExlZnQgb3IgUmlnaHQga2V5IGlzIHByZXNzZWQsIGNoYW5nZSB0aGUgaG9yaXpvbnRhbCBzcGVlZC5cclxuICAvLyBPdGhlcndpc2UsIGRlY2VsZXJhdGUgYXQgYSBzdGFuZGFyZCByYXRlXHJcbiAgaWYgKHRoaXMubGVmdERvd24gfHwgdGhpcy5yaWdodERvd24pIHtcclxuICAgIGlmICh0aGlzLnJpZ2h0RG93bikge1xyXG4gICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPD0gdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkICs9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmxlZnREb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA+PSAtdGhpcy5tYXhTcGVlZCkge1xyXG4gICAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkIC09IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICgoIXRoaXMudXBEb3duICYmICF0aGlzLmRvd25Eb3duKSB8fCAoIXRoaXMuY3RybERvd24gJiYgTWF0aC5hYnModGhpcy5zcGVlZCkgPiB0aGlzLk1BWF9OT1JNQUxfU1BFRUQpKSB7XHJcbiAgICBpZiAodGhpcy5zcGVlZCA+IC0wLjAxICYmIHRoaXMuc3BlZWQgPCAwLjAxKSB7XHJcbiAgICAgIHRoaXMuc3BlZWQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5zcGVlZCAvPSB0aGlzLmRlY2VsZXJhdGlvbjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmICgoIXRoaXMubGVmdERvd24gJiYgIXRoaXMucmlnaHREb3duKSB8fCAoIXRoaXMuY3RybERvd24gJiYgTWF0aC5hYnModGhpcy5ob3Jpem9udGFsU3BlZWQpID4gdGhpcy5NQVhfTk9STUFMX1NQRUVEKSkge1xyXG4gICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkID4gLTAuMDEgJiYgdGhpcy5ob3Jpem9udGFsU3BlZWQgPCAwLjAxKSB7XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkID0gMDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuaG9yaXpvbnRhbFNwZWVkIC89IHRoaXMuZGVjZWxlcmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gb3B0aW1pemF0aW9uIC0gb25seSBpZiB0aGUgY2FyIGlzIG1vdmluZyBzaG91bGQgd2Ugc3BlbmRcclxuICAvLyB0aW1lIHJlc2V0dGluZyB0aGUgbWFwXHJcbiAgaWYgKHRoaXMuc3BlZWQgIT0gMCB8fCB0aGlzLmhvcml6b250YWxTcGVlZCAhPSAwKSB7XHJcbiAgICB2YXIgbmV3TGF0ID0gdGhpcy5tYXAuZ2V0Q2VudGVyKCkubGF0KCkgKyAodGhpcy5zcGVlZCAvIHRoaXMubGF0aXR1ZGVTcGVlZEZhY3Rvcik7XHJcbiAgICB2YXIgbmV3TG5nID0gdGhpcy5tYXAuZ2V0Q2VudGVyKCkubG5nKCkgKyAodGhpcy5ob3Jpem9udGFsU3BlZWQgLyB0aGlzLmxvbmdpdHVkZVNwZWVkRmFjdG9yKTtcclxuICAgIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhuZXdMYXQsIG5ld0xuZyk7XHJcbiAgICB0aGlzLm1hcC5zZXRDZW50ZXIodGhpcy5tYXBDZW50ZXIpO1xyXG5cclxuICB9XHJcblxyXG4gIHJvdGF0ZUNhci5jYWxsKHRoaXMpO1xyXG4gIGlmICh0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgcm90YXRlQXJyb3cuY2FsbCh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3RUb1BlZXIob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gY29ubmVjdCB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3RyeWluZyB0byBjb25uZWN0IHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gIHZhciBwZWVySnNDb25uZWN0aW9uID0gdGhpcy5wZWVyLmNvbm5lY3Qob3RoZXJVc2VyUGVlcklkKTtcclxuICBwZWVySnNDb25uZWN0aW9uLm9uKCdvcGVuJywgZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnY29ubmVjdGlvbiBvcGVuJyk7XHJcbiAgICBjb25uZWN0ZWRUb1BlZXIuY2FsbChzZWxmLCBwZWVySnNDb25uZWN0aW9uKTtcclxuICB9KTtcclxuICBwZWVySnNDb25uZWN0aW9uLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xyXG4gICAgY29uc29sZS5sb2coXCJQRUVSSlMgRVJST1I6IFwiKTtcclxuICAgIGNvbnNvbGUubG9nKGVycik7XHJcbiAgICB0aHJvdyBcIlBlZXJKUyBjb25uZWN0aW9uIGVycm9yXCI7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbm5lY3RlZFRvUGVlcihwZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgdmFyIG90aGVyVXNlclBlZXJJZCA9IHBlZXJKc0Nvbm5lY3Rpb24ucGVlcjtcclxuICBjb25zb2xlLmxvZygnY29ubmVjdGVkIHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgnY29ubmVjdGVkIHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICAvLyBpZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lIHdlJ3ZlIGNvbm5lY3RlZCB0byB0aGlzIHVlc3IsXHJcbiAgLy8gYWRkIHRoZSBIVE1MIGZvciB0aGUgbmV3IHVzZXJcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdIHx8ICF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICBpbml0aWFsaXplUGVlckNvbm5lY3Rpb24uY2FsbCh0aGlzLCBwZWVySnNDb25uZWN0aW9uLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gICAgYXNzaWduVXNlclRvVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgICBjcmVhdGVPdGhlclVzZXJDYXIuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU90aGVyVXNlckNhcihvdGhlclVzZXJQZWVySWQpIHtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySWQgPSBvdGhlclVzZXJQZWVySWQ7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0uY2FyID0ge307XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnblVzZXJUb1RlYW0ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgLy8gaWYgdGhlIHVzZXIgaXMgYWxyZWFkeSBvbiBhIHRlYW0sIGlnbm9yZSB0aGlzXHJcbiAgaWYgKGlzVXNlck9uVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2VycykgfHxcclxuICAgIGlzVXNlck9uVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdXNlck9iamVjdCA9IHtcclxuICAgIHBlZXJJZDogb3RoZXJVc2VyUGVlcklkLFxyXG4gICAgdXNlcm5hbWU6IG51bGxcclxuICB9O1xyXG4gIC8vIGZvciBub3csIGp1c3QgYWx0ZXJuYXRlIHdobyBnb2VzIG9uIGVhY2ggdGVhbVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCA+IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aCkge1xyXG4gICAgYWN0aXZhdGVUZWFtQ3J1c2hJblVJLmNhbGwodGhpcyk7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5wdXNoKHVzZXJPYmplY3QpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLnB1c2godXNlck9iamVjdCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpc1VzZXJPblRlYW0ocGVlcklkLCB1c2VyT2JqZWN0c0FycmF5KSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB1c2VyT2JqZWN0c0FycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodXNlck9iamVjdHNBcnJheVtpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFzc2lnbk15VGVhbUluVUkoKSB7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKSB7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAneWVsbG93Jyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2NvbG9yJywgJ2JsYWNrJyk7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyM2NjcnKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICdyZWQnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICcjNjY2Jyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplUGVlckNvbm5lY3Rpb24ocGVlckpzQ29ubmVjdGlvbiwgb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0pIHtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdID0ge307XHJcbiAgfVxyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24gPSBwZWVySnNDb25uZWN0aW9uO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24ub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnY2xvc2luZyBjb25uZWN0aW9uJyk7XHJcbiAgICBvdGhlclVzZXJEaXNjb25uZWN0ZWQuY2FsbChzZWxmLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH0pO1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24ub24oJ2RhdGEnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBkYXRhUmVjZWl2ZWQuY2FsbChzZWxmLCBkYXRhKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmFkZUFycm93VG9JbWFnZShpbWFnZUZpbGVOYW1lKSB7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cignc3JjJywgJ2ltYWdlcy8nICsgaW1hZ2VGaWxlTmFtZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckRpc2Nvbm5lY3RlZChvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBzaG91bGQgYmUgY2FsbGVkIGFmdGVyIHRoZSBwZWVySnMgY29ubmVjdGlvblxyXG4gIC8vIGhhcyBhbHJlYWR5IGJlZW4gY2xvc2VkXHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgcmVtb3ZlVXNlckZyb21UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICByZW1vdmVVc2VyRnJvbVVJLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuXHJcbiAgLy8gcmVtb3ZlIHRoaXMgdXNlciBmcm9tIHRoZSBnYW1lIGluIEZpcmViYXNlOlxyXG4gIHRoaXMubWF0Y2htYWtlclRvd24ucmVtb3ZlUGVlckZyb21TZXNzaW9uKHRoaXMuZ2FtZUlkLCBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICBpZiAodGhpcy5ob3N0UGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgLy8gaWYgdGhhdCB1c2VyIHdhcyB0aGUgaG9zdCwgc2V0IHVzIGFzIHRoZSBuZXcgaG9zdFxyXG4gICAgdGhpcy5ob3N0UGVlcklkID0gdGhpcy5wZWVyLmlkO1xyXG4gICAgdGhpcy5tYXRjaG1ha2VyVG93bi5zd2l0Y2hUb05ld0hvc3QodGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciB3aG8gZGlzY29ubmVjdGVkIGN1cnJlbnRseSBoYWQgYW4gaXRlbSxcclxuICAvLyBwdXQgb3V0IGEgbmV3IG9uZVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IG90aGVyVXNlclBlZXJJZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG5cclxuICAvLyBkZWxldGUgdGhhdCB1c2VyJ3MgZGF0YVxyXG4gIGRlbGV0ZSB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXTtcclxuXHJcbiAgLy8gaWYgdGhlcmUgYW55IHVzZXJzIGxlZnQsIGJyb2FkY2FzdCB0aGVtIHRoZSBuZXcgZ2FtZSBzdGF0ZVxyXG4gIGlmIChPYmplY3Qua2V5cyh0aGlzLm90aGVyVXNlcnMpLmxlbmd0aCA+IDApIHtcclxuICAgIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMuY2FsbCh0aGlzKTtcclxuICB9IGVsc2Uge1xyXG4gICAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCd3YWl0aW5nIGZvciBhIHNtdWdnbGVyIHRvIGJhdHRsZS4uLicpO1xyXG4gIH1cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tVGVhbSh1c2VyUGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSB1c2VyUGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMuc3BsaWNlKGksIDEpO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBqID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS5wZWVySWQgPT0gdXNlclBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5zcGxpY2UoaiwgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVVc2VyRnJvbVVJKHBlZXJJZCkge1xyXG4gIC8vIHJlbW92ZSB0aGUgb3RoZXIgdXNlcidzIGNhciBmcm9tIHRoZSBtYXBcclxuICB0aGlzLm90aGVyVXNlcnNbcGVlcklkXS5jYXIubWFya2VyLnNldE1hcChudWxsKTtcclxuXHJcbiAgLy8gaWYgdGhlaXIgdGVhbSBoYXMgbm8gbW9yZSB1c2VycywgZ3JleSBvdXRcclxuICAvLyB0aGVpciBzY29yZSBib3hcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoID09IDApIHtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ29wYWNpdHknLCAnMC4zJyk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbihsYXQsIGxuZykge1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBicm9hZGNhc3RHYW1lU3RhdGUuY2FsbCh0aGlzLCB1c2VyKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRhdGFSZWNlaXZlZChkYXRhKSB7XHJcbiAgaWYgKGRhdGEucGVlcklkKSB7XHJcbiAgICAvLyBpZiB3ZSBhcmUgdGhlIGhvc3QsIGFuZCB0aGUgdXNlciB3aG8gc2VudCB0aGlzIGRhdGEgaGFzbid0IGJlZW4gZ2l2ZW4gdGhlIGluaXRpYWwgZ2FtZVxyXG4gICAgLy8gc3RhdGUsIHRoZW4gYnJvYWRjYXN0IGl0IHRvIHRoZW1cclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdICYmICF0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmhhc0JlZW5Jbml0aWFsaXplZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0uaGFzQmVlbkluaXRpYWxpemVkID0gdHJ1ZTtcclxuICAgICAgLy8gbm90IHN1cmUgaWYgd2Ugc2hvdWxkIGRvIHRoaXMgb3Igbm90LCBidXQgYXQgbGVhc3QgaXQgcmVzZXRzIHRoZSBnYW1lXHJcbiAgICAgIC8vIHN0YXRlIHRvIHdoYXQgd2UsIHRoZSBob3N0LCB0aGluayBpdCBpc1xyXG4gICAgICBicm9hZGNhc3RHYW1lU3RhdGVUb0FsbFBlZXJzLmNhbGwodGhpcyk7XHJcbiAgICAgIC8vIGlmIG5vdCB0aGF0LCB0aGVuIHdlIHNob3VsZCBqdXN0IGJyb2FkY2FzdCB0byB0aGUgbmV3IGd1eSBsaWtlIHRoaXM6XHJcbiAgICAgIC8vIGJyb2FkY2FzdEdhbWVTdGF0ZShkYXRhLnBlZXJJZCk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLmxhc3RVcGRhdGVUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChkYXRhLmV2ZW50KSB7XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICd1cGRhdGVfZ2FtZV9zdGF0ZScpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiB1cGRhdGUgZ2FtZSBzdGF0ZScpO1xyXG4gICAgICAvLyB3ZSBvbmx5IHdhbnQgdG8gcmVjZW50ZXIgdGhlIG1hcCBpbiB0aGUgY2FzZSB0aGF0IHRoaXMgaXMgYSBuZXcgdXNlclxyXG4gICAgICAvLyBqb2luaW5nIGZvciB0aGUgZmlyc3QgdGltZSwgYW5kIHRoZSB3YXkgdG8gdGVsbCB0aGF0IGlzIHRvIHNlZSBpZiB0aGVcclxuICAgICAgLy8gaW5pdGlhbCBsb2NhdGlvbiBoYXMgY2hhbmdlZC4gIE9uY2UgdGhlIHVzZXIgaXMgYWxyZWFkeSBqb2luZWQsIGlmIGFcclxuICAgICAgLy8gbG9jYXRpb24gY2hhbmdlIGlzIGluaXRpYXRlZCwgdGhhdCB3aWxsIHVzZSB0aGUgJ25ld19sb2NhdGlvbicgZXZlbnQgXHJcbiAgICAgIGlmIChwYXJzZUZsb2F0KGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCkgIT0gcGFyc2VGbG9hdCh0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQpIHx8XHJcbiAgICAgICAgcGFyc2VGbG9hdChkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpICE9IHBhcnNlRmxvYXQodGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSkge1xyXG4gICAgICAgIHRoaXMubWFwLnNldENlbnRlcihuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKFxyXG4gICAgICAgICAgZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0LFxyXG4gICAgICAgICAgZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKSk7XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdCA9IGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3Q7XHJcbiAgICAgIC8vIG5lZWQgdG8gbWFrZSB0aGlzIGNhbGwgYmVjYXVzZSB3ZSBjYW4gYmUgaW4gYSBzaXR1YXRpb24gd2hlcmUgdGhlIGhvc3RcclxuICAgICAgLy8gZG9lc24ndCBrbm93IG91ciB1c2VybmFtZSB5ZXQsIHNvIHdlIG5lZWQgdG8gbWFudWFsbHkgc2V0IGl0IGluIG91clxyXG4gICAgICAvLyBvd24gVUkgZmlyc3QuXHJcbiAgICAgIHVwZGF0ZVVzZXJuYW1lLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkLCB0aGlzLnVzZXJuYW1lKTtcclxuICAgICAgdXBkYXRlVUlXaXRoTmV3R2FtZVN0YXRlLmNhbGwodGhpcyk7XHJcbiAgICAgIGFzc2lnbk15VGVhbUJhc2UuY2FsbCh0aGlzKTtcclxuICAgICAgdXBkYXRlQ2FySWNvbnMuY2FsbCh0aGlzKTtcclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ25ld19sb2NhdGlvbicpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBuZXcgbG9jYXRpb24gJyArIGRhdGEuZXZlbnQubGF0ICsgJywnICsgZGF0YS5ldmVudC5sbmcpO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC5vcmlnaW5hdGluZ19wZWVyX2lkICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIG90aGVyVXNlckNoYW5nZWRMb2NhdGlvbi5jYWxsKHRoaXMsIGRhdGEuZXZlbnQubGF0LCBkYXRhLmV2ZW50LmxuZyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX2NvbGxlY3RlZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtIGNvbGxlY3RlZCBieSAnICsgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0pO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0gIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgb3RoZXJVc2VyQ29sbGVjdGVkSXRlbS5jYWxsKHRoaXMsIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2l0ZW0nKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogbmV3IGl0ZW0gYXQgJyArXHJcbiAgICAgICAgZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyArXHJcbiAgICAgICAgJyB3aXRoIGlkICcgKyBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICAgICAgLy8gT25seSB1cGRhdGUgaWYgc29tZW9uZSBlbHNlIGNhdXNlZCB0aGUgbmV3IGl0ZW0gcGxhY2VtZW50LlxyXG4gICAgICAvLyBpZiB0aGlzIHVzZXIgZGlkIGl0LCBpdCB3YXMgYWxyZWFkeSBwbGFjZWRcclxuICAgICAgaWYgKGRhdGEuZXZlbnQuaG9zdF91c2VyICYmIGRhdGEuZXZlbnQuaG9zdF91c2VyICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIHZhciBpdGVtTG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGEuZXZlbnQubG9jYXRpb24ubGF0LCBkYXRhLmV2ZW50LmxvY2F0aW9uLmxuZyk7XHJcbiAgICAgICAgcHV0TmV3SXRlbU9uTWFwLmNhbGwodGhpcywgaXRlbUxvY2F0aW9uLCBkYXRhLmV2ZW50LmlkKTtcclxuICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fcmV0dXJuZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdyZWNlaXZlZCBldmVudDogaXRlbSByZXR1cm5lZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSArICcgd2hpY2ggZ2l2ZXMgdGhlbSAnICsgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gbnVsbDtcclxuICAgICAgaWYgKGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICAgIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlVHJhbnNwYXJlbnRJY29uKTtcclxuICAgICAgICBvdGhlclVzZXJSZXR1cm5lZEl0ZW0uY2FsbCh0aGlzLCBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbSwgZGF0YS5ldmVudC5ub3dfbnVtX2l0ZW1zKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV90cmFuc2ZlcnJlZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtICcgKyBkYXRhLmV2ZW50LmlkICsgJyB0cmFuc2ZlcnJlZCBieSB1c2VyICcgKyBkYXRhLmV2ZW50LmZyb21Vc2VyUGVlcklkICsgJyB0byB1c2VyICcgKyBkYXRhLmV2ZW50LnRvVXNlclBlZXJJZCk7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC50b1VzZXJQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgLy8gdGhlIGl0ZW0gd2FzIHRyYW5zZmVycmVkIHRvIHRoaXMgdXNlclxyXG4gICAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCA9IHtcclxuICAgICAgICAgIGlkOiBkYXRhLmV2ZW50LmlkLFxyXG4gICAgICAgICAgbG9jYXRpb246IG51bGxcclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnc29tZW9uZSB0cmFuc2ZlcnJlZCBhdCAnICsgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIpO1xyXG4gICAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBzZXQgdGhlIGFycm93IHRvIHBvaW50IHRvIHRoZSBuZXcgdXNlciB3aG8gaGFzIHRoZSBpdGVtXHJcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1tkYXRhLmV2ZW50LnRvVXNlclBlZXJJZF0uY2FyLmxvY2F0aW9uO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBpZiB0aGUgdXNlciBzZW50IGEgdXNlcm5hbWUgdGhhdCB3ZSBoYXZlbid0IHNlZW4geWV0LCBzZXQgaXRcclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS51c2VybmFtZSAmJiAhdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS51c2VybmFtZSkge1xyXG4gICAgdXBkYXRlVXNlcm5hbWUuY2FsbCh0aGlzLCBkYXRhLnBlZXJJZCwgZGF0YS51c2VybmFtZSk7XHJcbiAgfVxyXG5cclxuICBpZiAoZGF0YS5wZWVySWQgJiYgZGF0YS5jYXJMYXRMbmcgJiYgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSkge1xyXG4gICAgbW92ZU90aGVyQ2FyLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXSwgbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhkYXRhLmNhckxhdExuZy5sYXQsIGRhdGEuY2FyTGF0TG5nLmxuZykpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduTXlUZWFtQmFzZSgpIHtcclxuICBpZiAodXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpIHtcclxuICAgIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdCA9IHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0O1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QgPSB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3Q7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVc2VybmFtZShwZWVySWQsIHVzZXJuYW1lKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0udXNlcm5hbWUgPSB1c2VybmFtZTtcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaiA9IDA7IGogPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGorKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0udXNlcm5hbWUgPSB1c2VybmFtZTtcclxuICAgIH1cclxuICB9XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVSVdpdGhOZXdHYW1lU3RhdGUoKSB7XHJcbiAgLy8gcmVjZW50ZXIgdGhlIG1hcFxyXG4gIGNvbnNvbGUubG9nKCduZXcgbG9jYXRpb24gcmVjZWl2ZWQ6ICcgKyB0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbik7XHJcbiAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCwgdGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubG5nKTtcclxuICB1cGRhdGVCYXNlTG9jYXRpb25zSW5VSS5jYWxsKHRoaXMpO1xyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxuICAvLyBpZiBzb21lb25lIGhhcyB0aGUgaXRlbVxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0pIHtcclxuICAgIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gICAgLy8gaWYgSSBoYXZlIHRoZSBpdGVtLCBtYWtlIHRoZSBkZXN0aW5hdGlvbiBteSB0ZWFtJ3MgYmFzZVxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gYW5vdGhlciB1c2VyIGhhcyB0aGUgaXRlbSwgYnV0IHRoZSBzZXREZXN0aW5hdGlvbiBjYWxsXHJcbiAgICAgIC8vIHdpbGwgYmUgdGFrZW4gY2FyZSBvZiB3aGVuIHRoZSB1c2VyIHNlbmRzIHRoZWlyIGxvY2F0aW9uIGRhdGFcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgLy8gaWYgbm9ib2R5IGhhcyB0aGUgaXRlbSwgcHV0IGl0IG9uIHRoZSBtYXAgaW4gdGhlIHJpZ2h0IHBsYWNlLFxyXG4gICAgLy8gYW5kIHNldCB0aGUgbmV3IGl0ZW0gbG9jYXRpb24gYXMgdGhlIGRlc3RpbmF0aW9uXHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ICYmIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtb3ZlSXRlbU9uTWFwLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxhdCwgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93LnBuZycpO1xyXG4gIH1cclxuICB1cGRhdGVTY29yZXNJblVJLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICBhc3NpZ25NeVRlYW1JblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZUJhc2VMb2NhdGlvbnNJblVJKCkge1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubGF0LFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5iYXNlT2JqZWN0LmxvY2F0aW9uLmxhdCxcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FySWNvbnMoKSB7XHJcbiAgdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnMuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLCB0aGlzLnRlYW1Ub3duT3RoZXJDYXJJY29uKTtcclxuICB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucy5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLCB0aGlzLnRlYW1DcnVzaE90aGVyQ2FySWNvbik7XHJcbiAgdXBkYXRlTXlDYXJJY29uLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZU15Q2FySWNvbigpIHtcclxuICB2YXIgdXNlckNhckltZ1NyYyA9ICdpbWFnZXMvY3J1c2hfY2FyLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQpKSB7XHJcbiAgICB1c2VyQ2FySW1nU3JjID0gJ2ltYWdlcy9jYXIucG5nJztcclxuICB9XHJcbiAgJCgnI2Nhci1pbWcnKS5hdHRyKCdzcmMnLCB1c2VyQ2FySW1nU3JjKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlVGVhbVVzZXJzQ2FySWNvbnModGVhbVVzZXJzLCB0ZWFtQ2FySWNvbikge1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGVhbVVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAvLyByZW1vdmUgYW55IGV4aXN0aW5nIG1hcmtlclxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXSAmJiB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyICYmIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIubWFya2VyLnNldE1hcChudWxsKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGVhbVVzZXJzW2ldLnBlZXJJZCAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgICAgIHRpdGxlOiB0ZWFtVXNlcnNbaV0ucGVlcklkLFxyXG4gICAgICAgIGljb246IHRlYW1DYXJJY29uXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVNjb3Jlc0luVUkodGVhbVRvd25OdW1JdGVtc1JldHVybmVkLCB0ZWFtQ3J1c2hOdW1JdGVtc1JldHVybmVkKSB7XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKS50ZXh0KHRlYW1Ub3duTnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKSk7XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0ZWFtQ3J1c2hOdW1JdGVtc1JldHVybmVkKTtcclxuICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVJdGVtT25NYXAobGF0LCBsbmcpIHtcclxuICBjb25zb2xlLmxvZygnbW92aW5nIGl0ZW0gdG8gbmV3IGxvY2F0aW9uOiAnICsgbGF0ICsgJywnICsgbG5nKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubGF0ID0gbGF0O1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sbmcgPSBsbmc7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRQb3NpdGlvbih0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJSZXR1cm5lZEl0ZW0ob3RoZXJVc2VyUGVlcklkLCBub3dOdW1JdGVtc0ZvclVzZXIpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gIGluY3JlbWVudEl0ZW1Db3VudC5jYWxsKHRoaXMsIHVzZXJJc09uVG93blRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpKVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCAnYXJyb3cucG5nJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1vdmVPdGhlckNhcihvdGhlclVzZXJPYmplY3QsIG5ld0xvY2F0aW9uKSB7XHJcbiAgaWYgKCFvdGhlclVzZXJPYmplY3QuY2FyKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBvdGhlclVzZXJPYmplY3QuY2FyLmxvY2F0aW9uID0gbmV3TG9jYXRpb247XHJcbiAgaWYgKCFvdGhlclVzZXJPYmplY3QuY2FyLm1hcmtlcikge1xyXG4gICAgdXBkYXRlQ2FySWNvbnMuY2FsbCh0aGlzKTtcclxuICB9XHJcbiAgLy8gaWYgdGhlIG90aGVyIGNhciBoYXMgYW4gaXRlbSwgdXBkYXRlIHRoZSBkZXN0aW5hdGlvblxyXG4gIC8vIHRvIGJlIGl0XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSBvdGhlclVzZXJPYmplY3QucGVlcklkKSB7XHJcbiAgICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgICBpZiAodXNlcklzT25NeVRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJPYmplY3QucGVlcklkKSkge1xyXG4gICAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgICB9XHJcbiAgICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIG5ld0xvY2F0aW9uLCBhcnJvd0ltZyk7XHJcbiAgfVxyXG4gIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZC5jYWxsKHRoaXMsIG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24sIG90aGVyVXNlck9iamVjdC5wZWVySWQpO1xyXG4gIG90aGVyVXNlck9iamVjdC5jYXIubWFya2VyLnNldFBvc2l0aW9uKG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VySXNPbk15VGVhbShvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgbXlUZWFtID0gbnVsbDtcclxuICB2YXIgb3RoZXJVc2VyVGVhbSA9IG51bGw7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIG15VGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgICAgb3RoZXJVc2VyVGVhbSA9ICd0b3duJztcclxuICAgIH1cclxuICB9XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ2NydXNoJztcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAgIG90aGVyVXNlclRlYW0gPSAnY3J1c2gnO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbXlUZWFtID09IG90aGVyVXNlclRlYW07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZmVySXRlbUlmQ2Fyc0hhdmVDb2xsaWRlZChvdGhlckNhckxvY2F0aW9uLCBvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBpZiB3ZSBkb24ndCBrbm93IHRoZSBvdGhlciBjYXIncyBsb2NhdGlvbiwgb3IgaWYgdGhpcyBpc24ndCB0aGUgdXNlciB3aXRoXHJcbiAgLy8gIHRoZSBpdGVtLCB0aGVuIGlnbm9yZSBpdC4gV2UnbGwgb25seSB0cmFuc2ZlciBhbiBpdGVtIGZyb20gdGhlIHBlcnNwZWN0ZWRcclxuICAvLyAgb2YgdGhlIHVzZXIgd2l0aCB0aGUgaXRlbVxyXG4gIGlmICghb3RoZXJDYXJMb2NhdGlvbiB8fCAhdGhpcy5jb2xsZWN0ZWRJdGVtKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGlmICh0aGlzLnRpbWVPZkxhc3RUcmFuc2Zlcikge1xyXG4gICAgdmFyIHRpbWVTaW5jZUxhc3RUcmFuc2ZlciA9ICgobmV3IERhdGUoKSkuZ2V0VGltZSgpKSAtIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyO1xyXG4gICAgLy8gaWYgbm90IGVub3VnaCB0aW1lIGhhcyBwYXNzZWQgc2luY2UgdGhlIGxhc3QgdHJhbnNmZXIsIHJldHVyblxyXG4gICAgaWYgKHRpbWVTaW5jZUxhc3RUcmFuc2ZlciA8IHRoaXMudGltZURlbGF5QmV0d2VlblRyYW5zZmVycykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBvcHRpbWl6YXRpb246IHJlc2V0IHRoaXMgc28gd2UgZG9uJ3Qgd2FzdGUgdGltZSBjYWxjdWxhdGluZyBpbiB0aGUgZnV0dXJlXHJcbiAgICAgIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKHRoaXMubWFwQ2VudGVyLCBvdGhlckNhckxvY2F0aW9uKTtcclxuICAvLyBpZiB0aGlzIHVzZXIgKHRoYXQgaGFzIHRoZSBpdGVtKSBpcyBjbG9zZSBlbm91Z2ggdG8gY2FsbCBpdCBhXHJcbiAgLy8gY29sbGlzaW9uLCB0cmFuc2ZlciBpdCB0byB0aGUgb3RoZXIgdXNlclxyXG4gIGlmIChkaXN0YW5jZSA8IDIwKSB7XHJcbiAgICB0cmFuc2Zlckl0ZW0uY2FsbCh0aGlzLCB0aGlzLmNvbGxlY3RlZEl0ZW0uaWQsIHRoaXMucGVlci5pZCwgb3RoZXJVc2VyUGVlcklkKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZmVySXRlbShpdGVtT2JqZWN0SWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnaXRlbSAnICsgaXRlbU9iamVjdElkICsgJyB0cmFuc2ZlcnJlZCBmcm9tICcgKyBmcm9tVXNlclBlZXJJZCArICcgdG8gJyArIHRvVXNlclBlZXJJZCk7XHJcbiAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIGJyb2FkY2FzdFRyYW5zZmVyT2ZJdGVtLmNhbGwodGhpcywgaXRlbU9iamVjdElkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkLCB0aGlzLnRpbWVPZkxhc3RUcmFuc2Zlcik7XHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB0b1VzZXJQZWVySWQ7XHJcbiAgdmFyIGFycm93SW1nID0gJ2Fycm93X3JlZC5wbmcnO1xyXG4gIGlmICh1c2VySXNPbk15VGVhbS5jYWxsKHRoaXMsIHRvVXNlclBlZXJJZCkpIHtcclxuICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICB9XHJcbiAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLm90aGVyVXNlcnNbdG9Vc2VyUGVlcklkXS5jYXIubG9jYXRpb24sIGFycm93SW1nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyQ29sbGVjdGVkSXRlbSh1c2VySWQpIHtcclxuICBjb25zb2xlLmxvZygnb3RoZXIgdXNlciBjb2xsZWN0ZWQgaXRlbScpO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHVzZXJJZDtcclxuICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uTXlUZWFtLmNhbGwodGhpcywgdXNlcklkKSkge1xyXG4gICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gIH1cclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgYXJyb3dJbWcpO1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbVRvd25CYXNlSWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZUljb24pO1xyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gdXNlclJldHVybmVkSXRlbVRvQmFzZSgpIHtcclxuICBjb25zb2xlLmxvZygndXNlciByZXR1cm5lZCBpdGVtIHRvIGJhc2UnKTtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCAnYXJyb3cucG5nJyk7XHJcbiAgaW5jcmVtZW50SXRlbUNvdW50LmNhbGwodGhpcywgdXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpO1xyXG4gIHRoaXMuY29sbGVjdGVkSXRlbSA9IG51bGw7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VySXNPblRvd25UZWFtKHBlZXJJZCkge1xyXG4gIGZvciAodmFyIGkgPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS5wZWVySWQgPT0gcGVlcklkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaW5jcmVtZW50SXRlbUNvdW50KGlzVGVhbVRvd24pIHtcclxuICBpZiAoaXNUZWFtVG93bikge1xyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkKys7XHJcbiAgICAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpLnRleHQodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5udW1JdGVtc1JldHVybmVkKTtcclxuICAgIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS10b3duJykpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC5udW1JdGVtc1JldHVybmVkKys7XHJcbiAgICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZmxhc2hFbGVtZW50KGpxdWVyeUVsZW0pIHtcclxuICBqcXVlcnlFbGVtLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VyQ29sbGlkZWRXaXRoSXRlbShjb2xsaXNpb25JdGVtT2JqZWN0KSB7XHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gY29sbGlzaW9uSXRlbU9iamVjdDtcclxuICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICBjb2xsaXNpb25JdGVtT2JqZWN0LmxvY2F0aW9uID0gbnVsbDtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB0aGlzLnBlZXIuaWQ7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlSWNvbik7XHJcbiAgc2V0RGVzdGluYXRpb24uY2FsbCh0aGlzLCB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24sICdhcnJvd19ibHVlLnBuZycpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXREZXN0aW5hdGlvbihsb2NhdGlvbiwgYXJyb3dJbWFnZU5hbWUpIHtcclxuICB0aGlzLmRlc3RpbmF0aW9uID0gbG9jYXRpb247XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsIGFycm93SW1hZ2VOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlQ2FyKCkge1xyXG4gIHRoaXMucm90YXRpb24gPSBnZXRBbmdsZS5jYWxsKHRoaXMsIHRoaXMuc3BlZWQsIHRoaXMuaG9yaXpvbnRhbFNwZWVkKTtcclxuICB0aGlzLnJvdGF0aW9uQ3NzID0gJy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyAvKiBJRSA5ICovIC13ZWJraXQtdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsgLyogQ2hyb21lLCBTYWZhcmksIE9wZXJhICovIHRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7JztcclxufVxyXG5cclxuZnVuY3Rpb24gcm90YXRlQXJyb3coKSB7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uID0gY29tcHV0ZUJlYXJpbmdBbmdsZS5jYWxsKHRoaXMsIHRoaXMubWFwQ2VudGVyLmxhdCgpLCB0aGlzLm1hcENlbnRlci5sbmcoKSwgdGhpcy5kZXN0aW5hdGlvbi5sYXQoKSwgdGhpcy5kZXN0aW5hdGlvbi5sbmcoKSk7XHJcbiAgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzID0gJy1tcy10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7IC8qIElFIDkgKi8gLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7IC8qIENocm9tZSwgU2FmYXJpLCBPcGVyYSAqLyB0cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5hcnJvd1JvdGF0aW9uICsgJ2RlZyk7JztcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlKHN0ZXApIHtcclxuICBtb3ZlQ2FyLmNhbGwodGhpcyk7XHJcblxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0ICYmIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSkge1xyXG4gICAgLy8gY2hlY2sgZm9yIGNvbGxpc2lvbnMgYmV0d2VlbiBvbmUgY2FyIHdpdGggYW4gaXRlbSBhbmQgb25lIHdpdGhvdXRcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIC8vIGlmIHRoaXMgdXNlciBoYXMgYW4gaXRlbSwgY2hlY2sgdG8gc2VlIGlmIHRoZXkgYXJlIGNvbGxpZGluZ1xyXG4gICAgICAvLyB3aXRoIGFueSBvdGhlciB1c2VyLCBhbmQgaWYgc28sIHRyYW5zZmVyIHRoZSBpdGVtXHJcbiAgICAgIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICAgICAgdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkLmNhbGwodGhpcywgdGhpcy5vdGhlclVzZXJzW3VzZXJdLmNhci5sb2NhdGlvbiwgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJJZCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIGFub3RoZXIgdXNlciBoYXMgYW4gaXRlbSwgYW5kIHRoZWlyIGNhciBoYXMgYSBsb2NhdGlvbixcclxuICAgICAgLy8gdGhlbiBjb25zdGFudGx5IHNldCB0aGUgZGVzdGluYXRpb24gdG8gdGhlaXIgbG9jYXRpb25cclxuICAgICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dICYmIHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmxvY2F0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmNhci5sb2NhdGlvbikge1xyXG4gICAgICAgIHRoaXMuZGVzdGluYXRpb24gPSB0aGlzLm90aGVyVXNlcnNbdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXS5jYXIubG9jYXRpb247XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGNoZWNrIGlmIHVzZXIgY29sbGlkZWQgd2l0aCBhbiBpdGVtIG9yIHRoZSBiYXNlXHJcbiAgdmFyIGNvbGxpc2lvbk1hcmtlciA9IGdldENvbGxpc2lvbk1hcmtlci5jYWxsKHRoaXMpO1xyXG4gIGlmIChjb2xsaXNpb25NYXJrZXIpIHtcclxuICAgIGlmICghdGhpcy5jb2xsZWN0ZWRJdGVtICYmIGNvbGxpc2lvbk1hcmtlciA9PSB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyKSB7XHJcbiAgICAgIC8vIHVzZXIganVzdCBwaWNrZWQgdXAgYW4gaXRlbVxyXG4gICAgICB1c2VyQ29sbGlkZWRXaXRoSXRlbS5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdCk7XHJcbiAgICAgIGJyb2FkY2FzdEl0ZW1Db2xsZWN0ZWQuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QuaWQpO1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbGxlY3RlZEl0ZW0gJiYgY29sbGlzaW9uTWFya2VyID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgICAgLy8gdXNlciBoYXMgYW4gaXRlbSBhbmQgaXMgYmFjayBhdCB0aGUgYmFzZVxyXG4gICAgICB1c2VyUmV0dXJuZWRJdGVtVG9CYXNlLmNhbGwodGhpcyk7XHJcbiAgICAgIGJyb2FkY2FzdEl0ZW1SZXR1cm5lZC5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCk7XHJcbiAgICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24uY2FsbCh0aGlzKTtcclxuXHJcbiAgLy8gaWYgdGhlIGdhbWUgaGFzIHN0YXJ0ZWQgYW5kIHdlJ3JlIHRoZSBob3N0LCBjaGVja1xyXG4gIC8vIGZvciBhbnkgcGVlcnMgd2hvIGhhdmVuJ3Qgc2VudCBhbiB1cGRhdGUgaW4gdG9vIGxvbmdcclxuICBpZiAodGhpcy5ob3N0UGVlcklkICYmIHRoaXMucGVlciAmJiB0aGlzLnBlZXIuaWQgJiYgdGhpcy5ob3N0UGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgY2xlYW51cEFueURyb3BwZWRDb25uZWN0aW9ucy5jYWxsKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2hvdWxkS2VlcEFsaXZlKCkge1xyXG4gIHJldHVybiB0aGlzLnFzLnZhbHVlKHRoaXMua2VlcEFsaXZlUGFyYW1OYW1lKSA9PSAndHJ1ZSc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBBbnlEcm9wcGVkQ29ubmVjdGlvbnMoKSB7XHJcbiAgaWYgKHNob3VsZEtlZXBBbGl2ZS5jYWxsKHRoaXMpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdGltZU5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIC8vIGlmIGl0J3MgYmVlbiBsb25nZXIgdGhhbiB0aGUgdGltZW91dCBzaW5jZSB3ZSd2ZSBoZWFyZCBmcm9tXHJcbiAgICAvLyB0aGlzIHVzZXIsIHJlbW92ZSB0aGVtIGZyb20gdGhlIGdhbWVcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgJiYgKHRpbWVOb3cgLSB0aGlzLm90aGVyVXNlcnNbdXNlcl0ubGFzdFVwZGF0ZVRpbWUgPiB0aGlzLkFDVElWRV9DT05ORUNUSU9OX1RJTUVPVVRfSU5fU0VDT05EUykpIHtcclxuICAgICAgY2xvc2VQZWVySnNDb25uZWN0aW9uLmNhbGwodGhpcywgdXNlcik7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24ob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgaWYgKHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdICYmIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24uY2xvc2UoKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbmRlcihkdCkge1xyXG4gICQoXCIjY2FyLWltZ1wiKS5hdHRyKFwic3R5bGVcIiwgdGhpcy5yb3RhdGlvbkNzcyk7XHJcbiAgJChcIiNhcnJvdy1pbWdcIikuYXR0cihcInN0eWxlXCIsIHRoaXMuYXJyb3dSb3RhdGlvbkNzcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE15Q2FyTG9jYXRpb24oKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuICYmIHRoaXMubWFwQ2VudGVyKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICAgIGNhckxhdExuZzoge1xyXG4gICAgICAgICAgbGF0OiB0aGlzLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBlZXJJZDogdGhpcy5wZWVyLmlkLFxyXG4gICAgICAgIHVzZXJuYW1lOiB0aGlzLnVzZXJuYW1lXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0R2FtZVN0YXRlKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgZ2FtZSBzdGF0ZSB0byAnICsgb3RoZXJVc2VyUGVlcklkKTtcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdIHx8ICF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdXBkYXRlR2FtZVN0YXRlRXZlbnRPYmplY3QgPSB7XHJcbiAgICBldmVudDoge1xyXG4gICAgICBuYW1lOiAndXBkYXRlX2dhbWVfc3RhdGUnLFxyXG4gICAgICBnYW1lRGF0YU9iamVjdDogdGhpcy5nYW1lRGF0YU9iamVjdFxyXG4gICAgfVxyXG4gIH07XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHVwZGF0ZUdhbWVTdGF0ZUV2ZW50T2JqZWN0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TmV3SXRlbShsb2NhdGlvbiwgaXRlbUlkKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiAmJiB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHZhciBzaW1wbGVJdGVtTGF0TG5nID0ge1xyXG4gICAgICAgIGxhdDogbG9jYXRpb24ubGF0KCksXHJcbiAgICAgICAgbG5nOiBsb2NhdGlvbi5sbmcoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgICAgZXZlbnQ6IHtcclxuICAgICAgICAgIG5hbWU6ICduZXdfaXRlbScsXHJcbiAgICAgICAgICBob3N0X3VzZXI6IHRoaXMucGVlci5pZCxcclxuICAgICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICAgIGxhdDogc2ltcGxlSXRlbUxhdExuZy5sYXQsXHJcbiAgICAgICAgICAgIGxuZzogc2ltcGxlSXRlbUxhdExuZy5sbmdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBpZDogaXRlbUlkXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEl0ZW1SZXR1cm5lZCgpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBpdGVtIHJldHVybmVkJyk7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX3JldHVybmVkJyxcclxuICAgICAgICB1c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW06IHRoaXMucGVlci5pZCxcclxuICAgICAgICBub3dfbnVtX2l0ZW1zOiB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQsXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0SXRlbUNvbGxlY3RlZChpdGVtSWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gaWQgJyArIGl0ZW1JZCArICcgY29sbGVjdGVkIGJ5IHVzZXIgJyArIHRoaXMucGVlci5pZCk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdGhpcy5wZWVyLmlkO1xyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fY29sbGVjdGVkJyxcclxuICAgICAgICBpZDogaXRlbUlkLFxyXG4gICAgICAgIHVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbTogdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0VHJhbnNmZXJPZkl0ZW0oaXRlbUlkLCBmcm9tVXNlclBlZXJJZCwgdG9Vc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBpdGVtIHRyYW5zZmVycmVkICcgKyBpdGVtSWQgKyAnIGZyb20gJyArIGZyb21Vc2VyUGVlcklkICsgJyB0byAnICsgdG9Vc2VyUGVlcklkKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV90cmFuc2ZlcnJlZCcsXHJcbiAgICAgICAgaWQ6IGl0ZW1JZCxcclxuICAgICAgICBmcm9tVXNlclBlZXJJZDogZnJvbVVzZXJQZWVySWQsXHJcbiAgICAgICAgdG9Vc2VyUGVlcklkOiB0b1VzZXJQZWVySWRcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3ROZXdMb2NhdGlvbihsb2NhdGlvbikge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgbmV3IGxvY2F0aW9uOiAnICsgbG9jYXRpb24ubGF0KCkgKyAnLCcgKyBsb2NhdGlvbi5sbmcoKSk7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ25ld19sb2NhdGlvbicsXHJcbiAgICAgICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgICAgICBsbmc6IGxvY2F0aW9uLmxuZygpLFxyXG4gICAgICAgIG9yaWdpbmF0aW5nX3BlZXJfaWQ6IHRoaXMucGVlci5pZFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGNoZWNrcyB0byBzZWUgaWYgdGhleSBoYXZlIGNvbGxpZGVkIHdpdGggZWl0aGVyIGFuIGl0ZW0gb3IgdGhlIGJhc2VcclxuZnVuY3Rpb24gZ2V0Q29sbGlzaW9uTWFya2VyKCkge1xyXG4gIC8vIGNvbXB1dGUgdGhlIGRpc3RhbmNlIGJldHdlZW4gbXkgY2FyIGFuZCB0aGUgZGVzdGluYXRpb25cclxuICBpZiAodGhpcy5kZXN0aW5hdGlvbikge1xyXG4gICAgdmFyIG1heERpc3RhbmNlQWxsb3dlZCA9IHRoaXMuY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2U7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBnb29nbGUubWFwcy5nZW9tZXRyeS5zcGhlcmljYWwuY29tcHV0ZURpc3RhbmNlQmV0d2Vlbih0aGlzLm1hcENlbnRlciwgdGhpcy5kZXN0aW5hdGlvbik7XHJcbiAgICAvLyBUaGUgYmFzZSBpcyBiaWdnZXIsIHNvIGJlIG1vcmUgbGVuaWVudCB3aGVuIGNoZWNraW5nIGZvciBhIGJhc2UgY29sbGlzaW9uXHJcbiAgICBpZiAodGhpcy5kZXN0aW5hdGlvbiA9PSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgbWF4RGlzdGFuY2VBbGxvd2VkID0gdGhpcy5jYXJUb0Jhc2VDb2xsaXNpb25EaXN0YW5jZTtcclxuICAgIH1cclxuICAgIGlmIChkaXN0YW5jZSA8IG1heERpc3RhbmNlQWxsb3dlZCkge1xyXG4gICAgICBpZiAodGhpcy5kZXN0aW5hdGlvbiA9PSB0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24pIHtcclxuICAgICAgICBjb25zb2xlLmxvZygndXNlciAnICsgdGhpcy5wZWVyLmlkICsgJyBjb2xsaWRlZCB3aXRoIGl0ZW0nKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfSBlbHNlIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGlmICh0aGlzLmNvbGxlY3RlZEl0ZW0pIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyB0aGlzLnBlZXIuaWQgKyAnIGhhcyBhbiBpdGVtIGFuZCBjb2xsaWRlZCB3aXRoIGJhc2UnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5tYXJrZXI7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldEdhbWVUb05ld0xvY2F0aW9uKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuICBjcmVhdGVUZWFtVG93bkJhc2UuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbiAgY3JlYXRlVGVhbUNydXNoQmFzZS5jYWxsKHRoaXMsIChwYXJzZUZsb2F0KGxhdCkgKyAwLjAwNikudG9TdHJpbmcoKSwgKHBhcnNlRmxvYXQobG5nKSArIDAuMDA4KS50b1N0cmluZygpKTtcclxuICBhc3NpZ25NeVRlYW1CYXNlLmNhbGwodGhpcyk7XHJcbiAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLm1hcC5zZXRDZW50ZXIodGhpcy5tYXBDZW50ZXIpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBbmdsZSh2eCwgdnkpIHtcclxuICByZXR1cm4gKE1hdGguYXRhbjIodnksIHZ4KSkgKiAoMTgwIC8gTWF0aC5QSSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbXB1dGVCZWFyaW5nQW5nbGUobGF0MSwgbG9uMSwgbGF0MiwgbG9uMikge1xyXG4gIHZhciBSID0gNjM3MTsgLy8ga21cclxuICB2YXIgZExhdCA9IChsYXQyIC0gbGF0MSkudG9SYWQoKTtcclxuICB2YXIgZExvbiA9IChsb24yIC0gbG9uMSkudG9SYWQoKTtcclxuICB2YXIgbGF0MSA9IGxhdDEudG9SYWQoKTtcclxuICB2YXIgbGF0MiA9IGxhdDIudG9SYWQoKTtcclxuXHJcbiAgdmFyIGFuZ2xlSW5SYWRpYW5zID0gTWF0aC5hdGFuMihNYXRoLnNpbihkTG9uKSAqIE1hdGguY29zKGxhdDIpLFxyXG4gICAgTWF0aC5jb3MobGF0MSkgKiBNYXRoLnNpbihsYXQyKSAtIE1hdGguc2luKGxhdDEpICogTWF0aC5jb3MobGF0MikgKiBNYXRoLmNvcyhkTG9uKSk7XHJcbiAgcmV0dXJuIGFuZ2xlSW5SYWRpYW5zLnRvRGVnKCk7XHJcbn1cclxuXHJcblxyXG4vLyBnYW1lIGxvb3AgaGVscGVyc1xyXG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XHJcbiAgcmV0dXJuIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2Uubm93ID8gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbn1cclxuXHJcbi8vIGRvbid0IHRoaW5rIHdlJ2xsIG5lZWQgdG8gZ28gdG8gdGhlIHVzZXIncyBsb2NhdGlvbiwgYnV0IG1pZ2h0IGJlIHVzZWZ1bFxyXG5mdW5jdGlvbiB0cnlGaW5kaW5nTG9jYXRpb24oKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG5cclxuICAvLyBUcnkgSFRNTDUgZ2VvbG9jYXRpb25cclxuICBpZiAobmF2aWdhdG9yLmdlb2xvY2F0aW9uKSB7XHJcbiAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICAgIHZhciBwb3MgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcclxuICAgICAgICBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlKTtcclxuICAgICAgc2VsZi5tYXAuc2V0Q2VudGVyKHBvcyk7XHJcbiAgICAgIHNlbGYubWFwQ2VudGVyID0gcG9zO1xyXG4gICAgfSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIGhhbmRsZU5vR2VvbG9jYXRpb24uY2FsbChzZWxmLCB0cnVlKTtcclxuICAgIH0pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBCcm93c2VyIGRvZXNuJ3Qgc3VwcG9ydCBHZW9sb2NhdGlvblxyXG4gICAgaGFuZGxlTm9HZW9sb2NhdGlvbi5jYWxsKHNlbGYsIGZhbHNlKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU5vR2VvbG9jYXRpb24oZXJyb3JGbGFnKSB7XHJcbiAgaWYgKGVycm9yRmxhZykge1xyXG4gICAgdmFyIGNvbnRlbnQgPSAnRXJyb3I6IFRoZSBHZW9sb2NhdGlvbiBzZXJ2aWNlIGZhaWxlZC4nO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB2YXIgY29udGVudCA9ICdFcnJvcjogWW91ciBicm93c2VyIGRvZXNuXFwndCBzdXBwb3J0IGdlb2xvY2F0aW9uLic7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBUaGlzIGNhbiBiZSByZW1vdmVkLCBzaW5jZSBpdCBjYXVzZXMgYW4gZXJyb3IuICBpdCdzIGp1c3QgYWxsb3dpbmdcclxuLy8gZm9yIHJpZ2h0LWNsaWNraW5nIHRvIHNob3cgdGhlIGJyb3dzZXIncyBjb250ZXh0IG1lbnUuXHJcbmZ1bmN0aW9uIHNob3dDb250ZXh0TWVudShlKSB7XHJcblxyXG4gIC8vIGNyZWF0ZSBhIGNvbnRleHRtZW51IGV2ZW50LlxyXG4gIHZhciBtZW51X2V2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtcclxuICBtZW51X2V2ZW50LmluaXRNb3VzZUV2ZW50KFwiY29udGV4dG1lbnVcIiwgdHJ1ZSwgdHJ1ZSxcclxuICAgIGUudmlldywgMSwgMCwgMCwgMCwgMCwgZmFsc2UsXHJcbiAgICBmYWxzZSwgZmFsc2UsIGZhbHNlLCAyLCBudWxsKTtcclxuXHJcbiAgLy8gZmlyZSB0aGUgbmV3IGV2ZW50LlxyXG4gIGUub3JpZ2luYWxUYXJnZXQuZGlzcGF0Y2hFdmVudChtZW51X2V2ZW50KTtcclxufVxyXG5cclxuXHJcbi8vIGhhY2sgdG8gYWxsb3cgZm9yIGJyb3dzZXIgY29udGV4dCBtZW51IG9uIHJpZ2h0LWNsaWNrXHJcbmZ1bmN0aW9uIG1vdXNlVXAoZSkge1xyXG4gIGlmIChlLmJ1dHRvbiA9PSAyKSB7IC8vIHJpZ2h0LWNsaWNrXHJcbiAgICBzaG93Q29udGV4dE1lbnUuY2FsbCh0aGlzLCBlKTtcclxuICB9XHJcbn1cclxuXHJcbi8vICQod2luZG93KS51bmxvYWQoZnVuY3Rpb24oKSB7XHJcbi8vICAgZGlzY29ubmVjdEZyb21HYW1lKCk7XHJcbi8vIH0pOyIsIi8qKlxyXG4gKiAgbWF0Y2htYWtlci5qc1xyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiAgZXhwb3J0IGNsYXNzXHJcbiAqL1xyXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGNobWFrZXJUb3duO1xyXG5cclxuLyoqXHJcbiAqICBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKSB7XHJcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE1hdGNobWFrZXJUb3duKSlcclxuICAgIHJldHVybiBuZXcgTWF0Y2htYWtlclRvd24oZmlyZWJhc2VCYXNlVXJsKTtcclxuXHJcbiAgLy8gVGhlIHJvb3Qgb2YgeW91ciBzZXNzaW9uIGRhdGEuXHJcbiAgdGhpcy5TRVNTSU9OX0xPQ0FUSU9OID0gZmlyZWJhc2VCYXNlVXJsO1xyXG4gIHRoaXMuc2Vzc2lvblJlZiA9IG5ldyBGaXJlYmFzZSh0aGlzLlNFU1NJT05fTE9DQVRJT04pO1xyXG5cclxuICB0aGlzLkFWQUlMQUJMRV9TRVNTSU9OU19MT0NBVElPTiA9ICdhdmFpbGFibGVfc2Vzc2lvbnMnO1xyXG4gIHRoaXMuRlVMTF9TRVNTSU9OU19MT0NBVElPTiA9ICdmdWxsX3Nlc3Npb25zJztcclxuICB0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTiA9ICdzZXNzaW9ucyc7XHJcbiAgdGhpcy5NQVhfVVNFUlNfUEVSX1NFU1NJT04gPSA0O1xyXG4gIHRoaXMuU0VTU0lPTl9DTEVBTlVQX1RJTUVPVVQgPSAzMCAqIDEwMDA7IC8vIGluIG1pbGxpc2Vjb25kc1xyXG5cclxuICB0aGlzLmpvaW5lZFNlc3Npb24gPSBudWxsO1xyXG4gIHRoaXMubXlXb3JrZXIgPSBudWxsO1xyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqICBqb2luT3JDcmVhdGVTZXNzaW9uKHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjaylcclxuICpcclxuICogIHVzZXJuYW1lOiBEaXNwbGF5IG5hbWUgb2YgdXNlclxyXG4gKiAgcGVlcklkOiBVbmlxdWUgdXNlciBJRFxyXG4gKiAgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKHNlc3Npb25EYXRhLCBpc05ld0dhbWUpOlxyXG4gKiAgICAgV2lsbCBiZSBjYWxsZWQgYXQgdGhlIGVuZCB3aGVuXHJcbiAqICAgICB3ZSBlaXRoZXIgam9pbmVkIG9yIGNyZWF0ZWQgYSBnYW1lXHJcbiAqXHJcbiAqICBzZXNzaW9uRGF0YTogb2YgdGhpcyBmb3JtXHJcbiAqICB7XHJcbiAqICAgIFwiaG9zdFBlZXJJZFwiOiBcIjg3YjNmdnY5ZXpnYXhseHJcIixcclxuICogICAgXCJpZFwiOiA5MTE2ODI3LFxyXG4gKiAgICBcImxhc3RVcGRhdGVUaW1lXCI6IDE0MDQ3MDc1Nzc4NTEsXHJcbiAqICAgIFwidXNlcnNcIjogW3tcclxuICogICAgICBcInBlZXJJZFwiOiBcIjg3YjNmdnY5ZXpnYXhseHJcIixcclxuICogICAgICBcInVzZXJuYW1lXCI6IFwiTmluamEgUm95XCJcclxuICogICAgfSwge1xyXG4gKiAgICAgIFwicGVlcklkXCI6IFwicjZpc25hYWI1YWlrdnM0aVwiLFxyXG4gKiAgICAgICBcInVzZXJuYW1lXCI6IFwiVG93biBDcnVzaGVyXCJcclxuICogICB9XVxyXG4gKiAgfVxyXG4gKi9cclxuTWF0Y2htYWtlclRvd24ucHJvdG90eXBlLmpvaW5PckNyZWF0ZVNlc3Npb24gPSBmdW5jdGlvbih1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIGlmIHRoZXJlIGFyZSBhbnkgaW5hY3RpdmUgc2Vzc2lvbnMgY2xlYW4gdGhlbSB1cFxyXG4gIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zLmNhbGwodGhpcyk7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBqb2luIHNlc3Npb24nKTtcclxuICB2YXIgYXZhaWxhYmxlU2Vzc2lvbnNEYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX1NFU1NJT05TX0xPQ0FUSU9OKTtcclxuICBhdmFpbGFibGVTZXNzaW9uc0RhdGFSZWYub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAvLyBvbmx5IGpvaW4gYSBzZXNzaW9uIGlmIG9uZSBpc24ndCBqb2luZWQgYWxyZWFkeVxyXG4gICAgaWYgKHNlbGYuam9pbmVkU2Vzc2lvbiA9PSBudWxsKSB7XHJcbiAgICAgIHNlbGYuam9pbmVkU2Vzc2lvbiA9IC0xO1xyXG4gICAgICBpZiAoZGF0YS52YWwoKSA9PT0gbnVsbCkge1xyXG4gICAgICAgIC8vIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgc2Vzc2lvbnMsIHNvIGNyZWF0ZSBvbmVcclxuICAgICAgICB2YXIgc2Vzc2lvbkRhdGEgPSBjcmVhdGVOZXdTZXNzaW9uRGF0YS5jYWxsKHNlbGYsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgICAgIGNyZWF0ZU5ld1Nlc3Npb25JbkZpcmViYXNlLmNhbGwoc2VsZiwgdXNlcm5hbWUsIHBlZXJJZCwgc2Vzc2lvbkRhdGEpO1xyXG4gICAgICAgIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgdHJ1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGpzb25PYmogPSBkYXRhLnZhbCgpO1xyXG4gICAgICAgIHZhciBzZXNzaW9uSWQ7XHJcblxyXG4gICAgICAgIC8vIHN0dXBpZCBqYXZhc2NyaXB0IHdvbid0IHRlbGwgbWUgaG93IG1hbnkgc2Vzc2lvbiBlbGVtZW50c1xyXG4gICAgICAgIC8vIGFyZSBpbiB0aGUganNvbk9iaiwgc28gY291bnQgZW0gdXBcclxuICAgICAgICB2YXIgbnVtQXZhaWxhYmxlU2Vzc2lvbnMgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uT2JqKSB7XHJcbiAgICAgICAgICBudW1BdmFpbGFibGVTZXNzaW9ucysrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBjaGlsZCBzZXNzaW9ucyBhbmQgdHJ5XHJcbiAgICAgICAgLy8gdG8gam9pbiBlYWNoIG9uZVxyXG4gICAgICAgIHZhciBjb3VudGVyID0gMDtcclxuICAgICAgICBmb3IgKHZhciBrZXkgaW4ganNvbk9iaikge1xyXG4gICAgICAgICAgY291bnRlcisrO1xyXG4gICAgICAgICAgaWYgKGpzb25PYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICBzZXNzaW9uSWQgPSBqc29uT2JqW2tleV07XHJcbiAgICAgICAgICAgIGdldFNlc3Npb25MYXN0VXBkYXRlVGltZS5jYWxsKFxyXG4gICAgICAgICAgICAgIHNlbGYsXHJcbiAgICAgICAgICAgICAgc2Vzc2lvbklkLFxyXG4gICAgICAgICAgICAgIHVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgIHBlZXJJZCxcclxuICAgICAgICAgICAgICBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssXHJcbiAgICAgICAgICAgICAgZG9uZUdldHRpbmdVcGRhdGVUaW1lLmJpbmQoc2VsZiksXHJcbiAgICAgICAgICAgICAgY291bnRlciA9PSBudW1BdmFpbGFibGVTZXNzaW9ucyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiAgY3JlYXRlU2Vzc2lvbih1c2VybmFtZSwgcGVlcklkLCBzZXNzaW9uQ3JlYXRlZENhbGxiYWNrKVxyXG4gKlxyXG4gKiAgdXNlcm5hbWU6IERpc3BsYXkgbmFtZSBvZiB1c2VyXHJcbiAqICBwZWVySWQ6IFVuaXF1ZSB1c2VyIElEXHJcbiAqICBzZXNzaW9uQ3JlYXRlZENhbGxiYWNrKHNlc3Npb25EYXRhKTpcclxuICogICAgIFdpbGwgYmUgY2FsbGVkIGF0IHRoZSBlbmQgd2hlbiB3ZSBjcmVhdGVkIGEgc2Vzc2lvblxyXG4gKlxyXG4gKiAgc2Vzc2lvbkRhdGE6IG9mIHRoaXMgZm9ybVxyXG4gKiAge1xyXG4gKiAgICBcImhvc3RQZWVySWRcIjogXCI4N2IzZnZ2OWV6Z2F4bHhyXCIsXHJcbiAqICAgIFwiaWRcIjogOTExNjgyNyxcclxuICogICAgXCJsYXN0VXBkYXRlVGltZVwiOiAxNDA0NzA3NTc3ODUxLFxyXG4gKiAgICBcInVzZXJzXCI6IFt7XHJcbiAqICAgICAgXCJwZWVySWRcIjogXCI4N2IzZnZ2OWV6Z2F4bHhyXCIsXHJcbiAqICAgICAgXCJ1c2VybmFtZVwiOiBcIk5pbmphIFJveVwiXHJcbiAqICAgIH1dXHJcbiAqICB9XHJcbiAqL1xyXG5NYXRjaG1ha2VyVG93bi5wcm90b3R5cGUuY3JlYXRlU2Vzc2lvbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwZWVySWQsIHNlc3Npb25DcmVhdGVkQ2FsbGJhY2spIHtcclxuICAvLyBpZiB0aGVyZSBhcmUgYW55IGluYWN0aXZlIHNlc3Npb25zIGNsZWFuIHRoZW0gdXBcclxuICBjYWxsQXN5bmNDbGVhbnVwSW5hY3RpdmVTZXNzaW9ucy5jYWxsKHRoaXMpO1xyXG4gIGNvbnNvbGUubG9nKCd0cnlpbmcgdG8gY3JlYXRlIHNlc3Npb24nKTtcclxuICB2YXIgc2Vzc2lvbkRhdGEgPSBjcmVhdGVOZXdTZXNzaW9uRGF0YS5jYWxsKHRoaXMsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gIGNyZWF0ZU5ld1Nlc3Npb25JbkZpcmViYXNlLmNhbGwodGhpcywgdXNlcm5hbWUsIHBlZXJJZCwgc2Vzc2lvbkRhdGEpO1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJQaW5nLmNhbGwodGhpcyk7XHJcbiAgc2Vzc2lvbkNyZWF0ZWRDYWxsYmFjayhzZXNzaW9uRGF0YSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZW1vdmVQZWVyRnJvbVNlc3Npb24oc2Vzc2lvbklkLCBwZWVySWQpOlxyXG4gKiByZW1vdmUgYSBwZWVyIGZyb20gdGhlIHNlc3Npb25cclxuICpcclxuICovXHJcbk1hdGNobWFrZXJUb3duLnByb3RvdHlwZS5yZW1vdmVQZWVyRnJvbVNlc3Npb24gPSBmdW5jdGlvbihzZXNzaW9uSWQsIHBlZXJJZCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgaWYgKCFkYXRhLnZhbCgpKSB7XHJcbiAgICAgIC8vIHNvbWV0aGluZydzIHdyb25nLCBwcm9iYWJseSB0aGUgRmlyZWJhc2UgZGF0YSB3YXMgZGVsZXRlZFxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS52YWwoKS5ob3N0UGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICBmaW5kTmV3SG9zdFBlZXJJZC5jYWxsKHNlbGYsIHNlc3Npb25JZCwgcGVlcklkLCBzd2l0Y2hUb05ld0hvc3QpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4gICAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgc2Vzc2lvbi4gU28gdHJpbSBvdXQgdGhlIFxyXG4gICAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuICAgIHZhciBudW1Vc2Vyc0luU2Vzc2lvbiA9IGRhdGEuY2hpbGQoJ3VzZXJzJykudmFsKCkuY2xlYW4odW5kZWZpbmVkKS5sZW5ndGg7XHJcbiAgICBkYXRhLmNoaWxkKCd1c2VycycpLmZvckVhY2goZnVuY3Rpb24oY2hpbGRTbmFwc2hvdCkge1xyXG4gICAgICAvLyBpZiB3ZSd2ZSBmb3VuZCB0aGUgcmVmIHRoYXQgcmVwcmVzZW50cyB0aGUgZ2l2ZW4gcGVlciwgcmVtb3ZlIGl0XHJcbiAgICAgIGlmIChjaGlsZFNuYXBzaG90LnZhbCgpICYmIGNoaWxkU25hcHNob3QudmFsKCkucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcbiAgICAgICAgLy8gaWYgdGhpcyB1c2VyIHdhcyB0aGUgbGFzdCBvbmUgaW4gdGhlIHNlc3Npb24sIG5vdyB0aGVyZSBhcmUgMCwgXHJcbiAgICAgICAgLy8gc28gZGVsZXRlIHRoZSBzZXNzaW9uXHJcbiAgICAgICAgaWYgKG51bVVzZXJzSW5TZXNzaW9uID09IDEpIHtcclxuICAgICAgICAgIGRlbGV0ZVNlc3Npb24uY2FsbChzZWxmLCBzZXNzaW9uSWQpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBpZiBpdCB3YXMgZnVsbCwgbm93IGl0IGhhcyBvbmUgb3BlbiBzbG90LCBzZXQgaXQgdG8gYXZhaWxhYmxlXHJcbiAgICAgICAgICBpZiAobnVtVXNlcnNJblNlc3Npb24gPT0gc2VsZi5NQVhfVVNFUlNfUEVSX1NFU1NJT04pIHtcclxuICAgICAgICAgICAgbW92ZVNlc3Npb25Gcm9tRnVsbFRvQXZhaWxhYmxlLmNhbGwoc2VsZiwgc2Vzc2lvbklkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKlxyXG4gKiBzd2l0Y2hUb05ld0hvc3Qoc2Vzc2lvbklkLCBuZXdIb3N0UGVlcklkKTpcclxuICogaWYgZm9yIHdoYXRldmVyIHJlYXNvbiB0aGVyZSBpcyBhIG5ldyBob3N0LCBzdG9yZSB0aGF0IGluIEZpcmViYXNlXHJcbiAqXHJcbiAqL1xyXG5NYXRjaG1ha2VyVG93bi5wcm90b3R5cGUuc3dpdGNoVG9OZXdIb3N0ID0gZnVuY3Rpb24oc2Vzc2lvbklkLCBuZXdIb3N0UGVlcklkKSB7XHJcbiAgaWYgKCFuZXdIb3N0UGVlcklkKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKS5jaGlsZCgnaG9zdFBlZXJJZCcpLnNldChuZXdIb3N0UGVlcklkKTtcclxufVxyXG5cclxuXHJcbi8qXHJcbiAqIHByaXZhdGUgZnVuY3Rpb25zXHJcbiAqL1xyXG5cclxuZnVuY3Rpb24gY3JlYXRlTmV3U2Vzc2lvbkRhdGEodXNlcm5hbWUsIHBlZXJJZCkge1xyXG4gIHZhciBzZXNzaW9uSWQgPSBjcmVhdGVOZXdTZXNzaW9uSWQuY2FsbCh0aGlzKTtcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IHNlc3Npb25JZCxcclxuICAgIGhvc3RQZWVySWQ6IHBlZXJJZCxcclxuICAgIHVzZXJzOiBbe1xyXG4gICAgICBwZWVySWQ6IHBlZXJJZCxcclxuICAgICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgICB9XVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nVXBkYXRlVGltZShsYXN0VXBkYXRlVGltZSwgc2Vzc2lvbklkLCBpc1RoZUxhc3RTZXNzaW9uLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICAvLyBpZiB0aGUgc2Vzc2lvbiBpcyBzdGlsbCBhY3RpdmUgam9pbiBpdFxyXG4gIGlmIChsYXN0VXBkYXRlVGltZSkge1xyXG4gICAgaWYgKCFpc1RpbWVvdXRUb29Mb25nLmNhbGwodGhpcywgbGFzdFVwZGF0ZVRpbWUpKSB7XHJcbiAgICAgIGpvaW5FeGlzdGluZ1Nlc3Npb24uY2FsbCh0aGlzLCBzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjayk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zLmNhbGwodGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIC8vIGlmIHdlIGdvdCBoZXJlLCBhbmQgdGhpcyBpcyB0aGUgbGFzdCBzZXNzaW9uLCB0aGF0IG1lYW5zIHRoZXJlIGFyZSBubyBhdmFpbGFibGUgc2Vzc2lvbnNcclxuICAvLyBzbyBjcmVhdGUgb25lXHJcbiAgaWYgKGlzVGhlTGFzdFNlc3Npb24pIHtcclxuICAgIGNvbnNvbGUubG9nKCdubyBhdmFpbGFibGUgc2Vzc2lvbnMgZm91bmQsIG9ubHkgaW5hY3RpdmUgb25lcywgc28gY3JlYXRpbmcgYSBuZXcgb25lLi4uJyk7XHJcbiAgICB2YXIgc2Vzc2lvbkRhdGEgPSBjcmVhdGVOZXdTZXNzaW9uRGF0YS5jYWxsKHRoaXMsIHVzZXJuYW1lLCBwZWVySWQpO1xyXG4gICAgY3JlYXRlTmV3U2Vzc2lvbkluRmlyZWJhc2UuY2FsbCh0aGlzLCB1c2VybmFtZSwgcGVlcklkLCBzZXNzaW9uRGF0YSk7XHJcbiAgICBqb2luZWRTZXNzaW9uQ2FsbGJhY2soc2Vzc2lvbkRhdGEsIHRydWUpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0U2Vzc2lvbkxhc3RVcGRhdGVUaW1lKHNlc3Npb25JZCwgdXNlcm5hbWUsIHBlZXJJZCwgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLCBkb25lR2V0dGluZ1VwZGF0ZVRpbWVDYWxsYmFjaywgaXNUaGVMYXN0U2Vzc2lvbikge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICBpZiAoZGF0YS52YWwoKSAmJiBkYXRhLnZhbCgpLmxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdmb3VuZCB1cGRhdGUgdGltZTogJyArIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpXHJcbiAgICAgIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrKGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUsIHNlc3Npb25JZCwgaXNUaGVMYXN0U2Vzc2lvbiwgdXNlcm5hbWUsIHBlZXJJZCwgam9pbmVkU2Vzc2lvbkNhbGxiYWNrLCBzZWxmKTtcclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlclBpbmcoKSB7XHJcbiAgc2V0U2VydmVyU3RhdHVzQXNTdGlsbEFjdGl2ZS5jYWxsKHRoaXMpO1xyXG4gIHdpbmRvdy5zZXRJbnRlcnZhbChzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlLmJpbmQodGhpcyksIDEwMDAwKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaW5pdGlhbGl6ZVNlcnZlckhlbHBlcldvcmtlcih3aW5kb3dPYmplY3QpIHtcclxuICBpZiAodHlwZW9mKHdpbmRvd09iamVjdC5Xb3JrZXIpICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICBpZiAoIXRoaXMubXlXb3JrZXIpIHtcclxuICAgICAgLy9UT0RPOiBtYWtlIHRoaXMgYSBtb2R1bGVcclxuICAgICAgdGhpcy5teVdvcmtlciA9IG5ldyBXb3JrZXIoXCJqcy9hc3luY21lc3NhZ2VyLmpzXCIpO1xyXG4gICAgICB0aGlzLm15V29ya2VyLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBwcm9jZXNzTWVzc2FnZUV2ZW50LmJpbmQodGhpcyksIGZhbHNlKTtcclxuICAgIH1cclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coXCJTb3JyeSwgeW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgV2ViIFdvcmtlcnMuLi5cIik7XHJcbiAgICAvLyBmaW5lLCB3ZSdsbCBkbyBpdCBzeW5jaHJvbm91c2x5XHJcbiAgICBjbGVhbnVwU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zKCkge1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJIZWxwZXJXb3JrZXIuY2FsbCh0aGlzLCB3aW5kb3cpO1xyXG5cclxuICAvLyBkbyBpdCBvbiBhIHdlYiB3b3JrZXIgdGhyZWFkXHJcbiAgaWYgKHRoaXMubXlXb3JrZXIpIHtcclxuICAgIHRoaXMubXlXb3JrZXIucG9zdE1lc3NhZ2Uoe1xyXG4gICAgICBjbWQ6ICdjbGVhbnVwX2luYWN0aXZlX3Nlc3Npb25zJ1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlKCkge1xyXG4gIGNvbnNvbGUubG9nKCdwaW5naW5nIHNlcnZlcicpO1xyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQodGhpcy5qb2luZWRTZXNzaW9uKS5jaGlsZCgnbGFzdFVwZGF0ZVRpbWUnKS5zZXQoKG5ldyBEYXRlKCkpLmdldFRpbWUoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBTZXNzaW9ucygpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIGNvbnNvbGUubG9nKCdjbGVhbmluZyB1cCBpbmFjdGl2ZSBzZXNzaW9ucycpO1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhU25hcHNob3QpIHtcclxuICAgIGRhdGFTbmFwc2hvdC5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU25hcHNob3QpIHtcclxuICAgICAgdmFyIHNob3VsZERlbGV0ZVNlc3Npb24gPSBmYWxzZTtcclxuICAgICAgdmFyIHNlc3Npb25EYXRhID0gY2hpbGRTbmFwc2hvdC52YWwoKTtcclxuICAgICAgaWYgKCFzZXNzaW9uRGF0YSkge1xyXG4gICAgICAgIHNob3VsZERlbGV0ZVNlc3Npb24gPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChzZXNzaW9uRGF0YS51c2VycyA9PSBudWxsIHx8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Nlc3Npb24gaGFzIG5vIHVzZXJzJyk7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlU2Vzc2lvbiA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzVGltZW91dFRvb0xvbmcuY2FsbChzZWxmLCBzZXNzaW9uRGF0YS5sYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcInNlc3Npb24gaGFzbid0IGJlZW4gdXBkYXRlZCBzaW5jZSBcIiArIHNlc3Npb25EYXRhLmxhc3RVcGRhdGVUaW1lKTtcclxuICAgICAgICBzaG91bGREZWxldGVTZXNzaW9uID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNob3VsZERlbGV0ZVNlc3Npb24pIHtcclxuICAgICAgICBkZWxldGVTZXNzaW9uLmNhbGwoc2VsZiwgY2hpbGRTbmFwc2hvdC5uYW1lKCkpO1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc1RpbWVvdXRUb29Mb25nKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgaWYgKCFsYXN0VXBkYXRlVGltZSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICB2YXIgY3VycmVudFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gIHJldHVybiAoY3VycmVudFRpbWUgLSBsYXN0VXBkYXRlVGltZSA+IHRoaXMuU0VTU0lPTl9DTEVBTlVQX1RJTUVPVVQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwcm9jZXNzTWVzc2FnZUV2ZW50KGV2ZW50KSB7XHJcbiAgc3dpdGNoIChldmVudC5kYXRhKSB7XHJcbiAgICBjYXNlICdjbGVhbnVwX2luYWN0aXZlX3Nlc3Npb25zJzpcclxuICAgICAgY2xlYW51cFNlc3Npb25zLmNhbGwodGhpcyk7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgZGVmYXVsdDpcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kTmV3SG9zdFBlZXJJZChzZXNzaW9uSWQsIGV4aXN0aW5nSG9zdFBlZXJJZCwgY2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIHJlc2V0IHRoZSBob3N0UGVlcklkIHNvIGl0IHByZXZlbnRzIHRoZSBsZWF2aW5nIGhvc3QncyBicm93c2VyXHJcbiAgLy8gaWYgaXQgdHJpZXMgdG8gc3dpdGNoIGFnYWluIGJlZm9yZSB0aGlzIGlzIGRvbmVcclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5yZW1vdmUoKTtcclxuXHJcbiAgdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgdmFyIHVzZXJzID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKTtcclxuXHJcbiAgICAvLyBpZiBmb3Igd2hhdGV2ZXIgcmVhc29uIHRoaXMgaXMgY2FsbGVkIGFuZCBzb21ldGhpbmcncyBub3QgcmlnaHQsIGp1c3RcclxuICAgIC8vIHJldHVyblxyXG4gICAgaWYgKCF1c2Vycykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdXNlcnMgPSB1c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG4gICAgaWYgKHVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICh1c2Vyc1tpXSAmJiB1c2Vyc1tpXS5wZWVySWQgIT0gZXhpc3RpbmdIb3N0UGVlcklkKSB7XHJcbiAgICAgICAgLy8gd2UndmUgZm91bmQgYSBuZXcgdXNlciB0byBiZSB0aGUgaG9zdCwgcmV0dXJuIHRoZWlyIGlkXHJcbiAgICAgICAgY2FsbGJhY2soc2Vzc2lvbklkLCB1c2Vyc1tpXS5wZWVySWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjYWxsYmFjayhzZXNzaW9uSWQsIG51bGwpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkZWxldGVTZXNzaW9uKHNlc3Npb25JZCkge1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tQXZhaWxhYmxlU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tRnVsbFNlc3Npb25zLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICByZW1vdmVTZXNzaW9uLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbihzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld1Nlc3Npb25JbkZpcmViYXNlKHVzZXJuYW1lLCBwZWVySWQsIHNlc3Npb25EYXRhKSB7XHJcbiAgY29uc29sZS5sb2coJ2NyZWF0aW5nIG5ldyBzZXNzaW9uJyk7XHJcbiAgdmFyIG5ld1Nlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uRGF0YS5pZCk7XHJcbiAgbmV3U2Vzc2lvbkRhdGFSZWYuc2V0KHNlc3Npb25EYXRhKTtcclxuICB2YXIgbmV3QXZhaWxhYmxlU2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25EYXRhLmlkKTtcclxuICBuZXdBdmFpbGFibGVTZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbkRhdGEuaWQpO1xyXG4gIHRoaXMuam9pbmVkU2Vzc2lvbiA9IHNlc3Npb25EYXRhLmlkO1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJQaW5nLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld1Nlc3Npb25JZCgpIHtcclxuICAvLyBUT0RPOiByZXBsYWNlIHRoaXMgd2l0aCBzb21ldGhpbmcgdGhhdCB3b24ndFxyXG4gIC8vIGFjY2lkZW50YWxseSBoYXZlIGNvbGxpc2lvbnNcclxuICByZXR1cm4gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGpvaW5FeGlzdGluZ1Nlc3Npb24oc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICAvLyBpZiBhIHNlc3Npb24gaGFzIGFscmVhZHkgYmVlbiBqb2luZWQgb24gYW5vdGhlciB0aHJlYWQsIGRvbid0IGpvaW4gYW5vdGhlciBvbmVcclxuICBpZiAodGhpcy5qb2luZWRTZXNzaW9uICYmIHRoaXMuam9pbmVkU2Vzc2lvbiA+PSAwKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuam9pbmVkU2Vzc2lvbiA9IHNlc3Npb25JZDtcclxuICBhc3luY0dldFNlc3Npb25EYXRhLmNhbGwodGhpcywgc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2suYmluZCh0aGlzKSwgZG9uZUdldHRpbmdTZXNzaW9uRGF0YS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGFzeW5jR2V0U2Vzc2lvbkRhdGEoc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssIGRvbmVHZXR0aW5nU2Vzc2lvbkRhdGFDYWxsYmFjaykge1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGRvbmVHZXR0aW5nU2Vzc2lvbkRhdGFDYWxsYmFjayhkYXRhLCB1c2VybmFtZSwgcGVlcklkLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkb25lR2V0dGluZ1Nlc3Npb25EYXRhKHNlc3Npb25EYXRhU25hcHNob3QsIHVzZXJuYW1lLCBwZWVySWQsIGpvaW5lZFNlc3Npb25DYWxsYmFjaykge1xyXG4gIHZhciBzZXNzaW9uRGF0YSA9IHNlc3Npb25EYXRhU25hcHNob3QudmFsKCk7XHJcbiAgdmFyIG5ld1VzZXIgPSB7XHJcbiAgICBwZWVySWQ6IHBlZXJJZCxcclxuICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gIH07XHJcbiAgLy8gd2VpcmRuZXNzOiBpIHdhbnQgdG8ganVzdCBwdXNoIG5ld1VzZXIgb250byBzZXNzaW9uRGF0YS51c2VycywgYnV0XHJcbiAgLy8gdGhhdCBtZXNzZXMgdXAgdGhlIGFycmF5IEkgZ3Vlc3NcclxuICB2YXIgdXNlcnNBcnJheSA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2Vzc2lvbkRhdGEudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmIChzZXNzaW9uRGF0YS51c2Vyc1tpXSkge1xyXG4gICAgICB1c2Vyc0FycmF5LnB1c2goc2Vzc2lvbkRhdGEudXNlcnNbaV0pO1xyXG4gICAgfVxyXG4gIH1cclxuICB1c2Vyc0FycmF5LnB1c2gobmV3VXNlcik7XHJcbiAgc2Vzc2lvbkRhdGEudXNlcnMgPSB1c2Vyc0FycmF5O1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHNlc3Npb25EYXRhU25hcHNob3QucmVmKCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYuc2V0KHNlc3Npb25EYXRhKTtcclxuICBjb25zb2xlLmxvZygnam9pbmluZyBzZXNzaW9uICcgKyBzZXNzaW9uRGF0YS5pZCk7XHJcbiAgLy8gRmlyZWJhc2Ugd2VpcmRuZXNzOiB0aGUgdXNlcnMgYXJyYXkgY2FuIHN0aWxsIGhhdmUgdW5kZWZpbmVkIGVsZW1lbnRzXHJcbiAgLy8gd2hpY2ggcmVwcmVzZW50cyB1c2VycyB0aGF0IGhhdmUgbGVmdCB0aGUgc2Vzc2lvbi4gU28gdHJpbSBvdXQgdGhlIFxyXG4gIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbiAgaWYgKHVzZXJzQXJyYXkubGVuZ3RoID09IHRoaXMuTUFYX1VTRVJTX1BFUl9TRVNTSU9OKSB7XHJcbiAgICBzZXRTZXNzaW9uVG9GdWxsLmNhbGwodGhpcywgc2Vzc2lvbkRhdGEuaWQpO1xyXG4gIH1cclxuICB2YXIgcGVlcklkc0FycmF5ID0gW107XHJcbiAgZm9yICh2YXIgaiA9IDA7IGogPCBzZXNzaW9uRGF0YS51c2Vycy5sZW5ndGg7IGorKykge1xyXG4gICAgcGVlcklkc0FycmF5LnB1c2goc2Vzc2lvbkRhdGEudXNlcnNbal0ucGVlcklkKTtcclxuICB9XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxuICBqb2luZWRTZXNzaW9uQ2FsbGJhY2soc2Vzc2lvbkRhdGEsIGZhbHNlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0U2Vzc2lvblRvRnVsbChzZXNzaW9uSWQpIHtcclxuICByZW1vdmVTZXNzaW9uRnJvbUF2YWlsYWJsZVNlc3Npb25zLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICBhZGRTZXNzaW9uVG9GdWxsU2Vzc2lvbnNMaXN0LmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbkZyb21BdmFpbGFibGVTZXNzaW9ucyhzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZFNlc3Npb25Ub0Z1bGxTZXNzaW9uc0xpc3Qoc2Vzc2lvbklkKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuRlVMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZVNlc3Npb25Gcm9tRnVsbFRvQXZhaWxhYmxlKHNlc3Npb25JZCkge1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tRnVsbFNlc3Npb25zLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICBhZGRTZXNzaW9uVG9BdmFpbGFibGVTZXNzaW9uc0xpc3QuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVTZXNzaW9uRnJvbUZ1bGxTZXNzaW9ucyhzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5GVUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnJlbW92ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRTZXNzaW9uVG9BdmFpbGFibGVTZXNzaW9uc0xpc3Qoc2Vzc2lvbklkKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5cclxuLy8gLy8gcmV0dXJucyBudWxsIGlmIHRoZSB1c2VyIHdhc24ndCBmb3VuZCBpbiB0aGUgc2Vzc2lvblxyXG4vLyBmdW5jdGlvbiByZW1vdmVVc2VyRnJvbVNlc3Npb25EYXRhKHBlZXJJZCwgc2Vzc2lvbkRhdGEpIHtcclxuLy8gICAvLyBpZiBzb21ldGhpbmcncyB3cm9uZywganVzdCByZXR1cm5cclxuLy8gICBpZiAoIXNlc3Npb25EYXRhIHx8ICFzZXNzaW9uRGF0YS51c2Vycykge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfVxyXG5cclxuLy8gICAvLyBUT0RPOiBGaXJlYmFzZSBoYXMgYSBiZXR0ZXIgd2F5IG9mIGRvaW5nIHRoaXNcclxuLy8gICB2YXIgZm91bmRQZWVyID0gZmFsc2U7XHJcblxyXG4vLyAgIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4vLyAgIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIHNlc3Npb24uIFNvIHRyaW0gb3V0IHRoZSBcclxuLy8gICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4vLyAgIHNlc3Npb25EYXRhLnVzZXJzID0gc2Vzc2lvbkRhdGEudXNlcnMuY2xlYW4odW5kZWZpbmVkKTtcclxuXHJcbi8vICAgdXNlcnNXaXRob3V0UGVlciA9IFtdO1xyXG4vLyAgIGZvciAoaSA9IDA7IGkgPCBzZXNzaW9uRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4vLyAgICAgaWYgKHNlc3Npb25EYXRhLnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuLy8gICAgICAgZm91bmRQZWVyID0gdHJ1ZTtcclxuLy8gICAgIH0gZWxzZSB7XHJcbi8vICAgICAgIHVzZXJzV2l0aG91dFBlZXIucHVzaChzZXNzaW9uRGF0YS51c2Vyc1tpXSk7XHJcbi8vICAgICB9XHJcbi8vICAgfVxyXG5cclxuLy8gICBpZiAoZm91bmRQZWVyKSB7XHJcbi8vICAgICBzZXNzaW9uRGF0YS51c2VycyA9IHVzZXJzV2l0aG91dFBlZXI7XHJcbi8vICAgICByZXR1cm4gc2Vzc2lvbkRhdGE7XHJcbi8vICAgfSBlbHNlIHtcclxuLy8gICAgIHJldHVybiBudWxsO1xyXG4vLyAgIH0iLCJ2YXIgU211Z2dsZXJzVG93biA9IHJlcXVpcmUoJy4vbWFwZ2FtZS5qcycpO1xyXG5cclxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgZ2FtZSA9IG5ldyBTbXVnZ2xlcnNUb3duKCdodHRwczovL3NtdWdnbGVyc3Rvd24uZmlyZWJhc2Vpby5jb20vJyk7XHJcbn0pOyJdfQ==
