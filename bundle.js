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

MatchmakerTown.prototype.switchToNewHost = function(sessionId, newHostPeerId) {
  if (!newHostPeerId) {
    return;
  }
  this.sessionRef.child(this.ALL_SESSIONS_LOCATION).child(sessionId).child('hostPeerId').set(newHostPeerId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXERhbm55XFxBcHBEYXRhXFxSb2FtaW5nXFxucG1cXG5vZGVfbW9kdWxlc1xcd2F0Y2hpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiRjovVXNlcnMvRGFubnkvV2Vic2l0ZXMvU211Z2dsZXIncyBUb3duL21hcGdhbWUvbWFwZ2FtZS5qcyIsIkY6L1VzZXJzL0Rhbm55L1dlYnNpdGVzL1NtdWdnbGVyJ3MgVG93bi9tYXBnYW1lL21hdGNobWFrZXIuanMiLCJGOi9Vc2Vycy9EYW5ueS9XZWJzaXRlcy9TbXVnZ2xlcidzIFRvd24vbWFwZ2FtZS9zdGFydC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwa0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIFlPVVIgU01VR0dMRVIgTUlTU0lPTiwgSUYgWU9VIENIT09TRSBUTyBBQ0NFUFQsIElTIFRPIEpPSU4gVEVBTVxyXG4gKiBUT1dOIEFORCBUUlkgVE8gREVGRUFUIFRFQU0gQ1JVU0guICBBTkQgWU9VIE1VU1QgQUNDRVBULi4uXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBtYXBnYW1lLmpzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBkZXBzXHJcbiAqL1xyXG4vL3ZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XHJcbi8vdmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcclxudmFyIE1hdGNobWFrZXJUb3duID0gcmVxdWlyZSgnLi9tYXRjaG1ha2VyLmpzJyk7XHJcblxyXG4vKipcclxuICogIGV4cG9ydCBjbGFzc1xyXG4gKi9cclxubW9kdWxlLmV4cG9ydHMgPSBTbXVnZ2xlcnNUb3duO1xyXG5cclxuLyoqXHJcbiAqICBjb25zdHJ1Y3RvclxyXG4gKi9cclxuZnVuY3Rpb24gU211Z2dsZXJzVG93bihmaXJlYmFzZUJhc2VVcmwpIHtcclxuXHJcbiAgLy8gYmluZCBwdWJsaWMgY2FsbGJhY2sgZnVuY3Rpb25zXHJcbiAgdGhpcy5pbml0aWFsaXplID0gdGhpcy5pbml0aWFsaXplLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5mcmFtZSA9IHRoaXMuZnJhbWUuYmluZCh0aGlzKTtcclxuICB0aGlzLm9uS2V5RG93biA9IHRoaXMub25LZXlEb3duLmJpbmQodGhpcyk7XHJcbiAgdGhpcy5vbktleVVwID0gdGhpcy5vbktleVVwLmJpbmQodGhpcyk7XHJcblxyXG4gIHRoaXMua2VlcEFsaXZlUGFyYW1OYW1lID0gJ2tlZXBhbGl2ZSc7XHJcbiAgdGhpcy5xcyA9IG5ldyBRdWVyeVN0cmluZygpO1xyXG5cclxuICB0aGlzLm1hdGNobWFrZXJUb3duID0gbmV3IE1hdGNobWFrZXJUb3duKGZpcmViYXNlQmFzZVVybCk7XHJcblxyXG4gIHRoaXMubWFwID0gbnVsbDsgLy8gdGhlIG1hcCBjYW52YXMgZnJvbSB0aGUgR29vZ2xlIE1hcHMgdjMgamF2YXNjcmlwdCBBUElcclxuICB0aGlzLm1hcFpvb21MZXZlbCA9IDE4O1xyXG4gIHRoaXMubWFwRGF0YSA9IG51bGw7IC8vIHRoZSBsZXZlbCBkYXRhIGZvciB0aGlzIG1hcCAoYmFzZSBsb2NhdGlvbnMpXHJcblxyXG4gIHRoaXMuaXRlbU1hcE9iamVjdCA9IG51bGw7XHJcbiAgLy8gdGhlIGl0ZW1NYXBPYmplY3Qgd2lsbCBiZSBvZiB0aGlzIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG5cclxuICAvLyBkZWZhdWx0IHRvIHRoZSBncmFuZCBjYW55b24sIGJ1dCB0aGlzIHdpbGwgYmUgbG9hZGVkIGZyb20gYSBtYXAgZmlsZVxyXG4gIHRoaXMubWFwQ2VudGVyID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZygzNi4xNTExMDMsIC0xMTMuMjA4NTY1KTtcclxuXHJcblxyXG5cclxuICAvLyBmb3IgdGltZS1iYXNlZCBnYW1lIGxvb3BcclxuICB0aGlzLm5vdztcclxuICB0aGlzLmR0ID0gMDtcclxuICB0aGlzLmxhc3QgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLnN0ZXAgPSAxIC8gNjA7XHJcblxyXG4gIC8vIHVzZXIgZGF0YVxyXG4gIHRoaXMudXNlcm5hbWUgPSBudWxsO1xyXG5cclxuICAvLyBnYW1lIGhvc3RpbmcgZGF0YVxyXG4gIHRoaXMuZ2FtZUlkID0gbnVsbDtcclxuICB0aGlzLmhvc3RQZWVySWQgPSBudWxsO1xyXG5cclxuICAvLyBjYXIgcHJvcGVydGllc1xyXG4gIHRoaXMucm90YXRpb24gPSAwO1xyXG4gIHRoaXMuZGVjZWxlcmF0aW9uID0gMS4xO1xyXG4gIHRoaXMuTUFYX05PUk1BTF9TUEVFRCA9IDE4O1xyXG4gIHRoaXMuTUFYX0JPT1NUX1NQRUVEID0gNDA7XHJcbiAgdGhpcy5CT09TVF9GQUNUT1IgPSAxLjA3O1xyXG4gIHRoaXMuQk9PU1RfQ09OU1VNUFRJT05fUkFURSA9IDAuNTtcclxuICB0aGlzLm1heFNwZWVkID0gdGhpcy5NQVhfTk9STUFMX1NQRUVEO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnJztcclxuICB0aGlzLmxhdGl0dWRlU3BlZWRGYWN0b3IgPSAxMDAwMDAwO1xyXG4gIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IgPSA1MDAwMDA7XHJcblxyXG4gIC8vIGNvbGxpc2lvbiBlbmdpbmUgaW5mb1xyXG4gIHRoaXMuY2FyVG9JdGVtQ29sbGlzaW9uRGlzdGFuY2UgPSAyMDtcclxuICB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlID0gNDM7XHJcblxyXG4gIC8vIG1hcCBkYXRhXHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgdGhpcy53aWR0aE9mQXJlYVRvUHV0SXRlbXMgPSAwLjAwODsgLy8gaW4gbGF0aXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMuaGVpZ2h0T2ZBcmVhVG9QdXRJdGVtcyA9IDAuMDA4OyAvLyBpbiBsb25naXR1ZGUgZGVncmVlc1xyXG4gIHRoaXMubWluSXRlbURpc3RhbmNlRnJvbUJhc2UgPSAzMDA7XHJcblxyXG4gIC8vIHRoZXNlIG1hcCBvYmplY3RzIHdpbGwgYmUgb2YgdGhlIGZvcm06XHJcbiAgLy8ge1xyXG4gIC8vICAgbG9jYXRpb246IDxnb29nbGVfbWFwc19MYXRMbmdfb2JqZWN0PixcclxuICAvLyAgIG1hcmtlcjogPGdvb2dsZV9tYXBzX01hcmtlcl9vYmplY3Q+XHJcbiAgLy8gfVxyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0ID0ge1xyXG4gICAgbG9jYXRpb246IHRoaXMubWFwQ2VudGVyLFxyXG4gICAgbWFya2VyOiBudWxsXHJcbiAgfVxyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdCA9IG51bGw7XHJcbiAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcblxyXG4gIC8vIGdhbWVwbGF5XHJcblxyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QgPSB7XHJcbiAgICB0ZWFtVG93bk9iamVjdDoge1xyXG4gICAgICB1c2VyczogW10sXHJcbiAgICAgIGJhc2VPYmplY3Q6IHtcclxuICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgbGF0OiAzNi4xNTExMDMsXHJcbiAgICAgICAgICBsbmc6IC0xMTMuMjA4NTY1XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBudW1JdGVtc1JldHVybmVkOiAwXHJcbiAgICB9LFxyXG4gICAgdGVhbUNydXNoT2JqZWN0OiB7XHJcbiAgICAgIHVzZXJzOiBbXSxcclxuICAgICAgYmFzZU9iamVjdDoge1xyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBsYXQ6IDM2LjE1MTEwMyxcclxuICAgICAgICAgIGxuZzogLTExMy4yMDg1NjVcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIG51bUl0ZW1zUmV0dXJuZWQ6IDBcclxuICAgIH0sXHJcbiAgICBwZWVySWRPZkNhcldpdGhJdGVtOiBudWxsLFxyXG4gICAgaW5pdGlhbExvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogdGhpcy5tYXBDZW50ZXIubGF0KCksXHJcbiAgICAgIGxuZzogdGhpcy5tYXBDZW50ZXIubG5nKClcclxuICAgIH1cclxuICB9O1xyXG4gIC8vIHRoaXMgd2lsbCBiZSBvZiB0aGUgZm9ybVxyXG4gIC8vIHtcclxuICAvLyAgIHRlYW1Ub3duT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgdGVhbUNydXNoT2JqZWN0OiA8dGVhbV9vYmplY3Q+LFxyXG4gIC8vICAgcGVlcklkT2ZDYXJXaXRoSXRlbTogbnVsbCxcclxuICAvLyAgIGluaXRpYWxMb2NhdGlvbjoge1xyXG4gIC8vICAgICBsYXQ6IDM1LFxyXG4gIC8vICAgICBsbmc6IC0xMzJcclxuICAvLyB9XHJcbiAgLy8gICBpdGVtT2JqZWN0OiB7XHJcbiAgLy8gICAgIGlkOiA1NzYsXHJcbiAgLy8gICAgIGxvY2F0aW9uOiB7XHJcbiAgLy8gICAgICAgbGF0OiAzNCxcclxuICAvLyAgICAgICBsbmc6IC0xMzNcclxuICAvLyAgICAgfVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcbiAgLy8gdGhlIDx0ZWFtX29iamVjdD4gc3RydWN0dXJlcyBhYm92ZSB3aWxsIGJlIG9mIHRoaXMgZm9ybTpcclxuICAvLyB7XHJcbiAgLy8gICB1c2VyczogW3tcclxuICAvLyAgICAgcGVlcklkOiAxMjM0NTY3ODksXHJcbiAgLy8gICAgIHVzZXJuYW1lOiAncm95J1xyXG4gIC8vICAgfSwge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6ICdoYW0nXHJcbiAgLy8gICB9XSxcclxuICAvLyAgIGJhc2VPYmplY3Q6IHtcclxuICAvLyAgICAgbG9jYXRpb246IHtcclxuICAvLyAgICAgICBsYXQ6IDM0LFxyXG4gIC8vICAgICAgIGxuZzogLTEzM1xyXG4gIC8vICAgICB9XHJcbiAgLy8gICB9LFxyXG4gIC8vICAgbnVtSXRlbXNSZXR1cm5lZDogMFxyXG4gIC8vIH1cclxuXHJcblxyXG5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIC8vIHNldCB0aGUgaW5pdGlhbCBkZXN0aW5hdGlvbiB0byB3aGF0ZXZlciwgaXQgd2lsbCBiZSByZXNldCBcclxuICAvLyB3aGVuIGFuIGl0ZW0gaXMgZmlyc3QgcGxhY2VkXHJcbiAgdGhpcy5kZXN0aW5hdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoNDUuNDg5MzkxLCAtMTIyLjY0NzU4Nik7XHJcbiAgdGhpcy50aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzID0gMTAwMDsgLy8gaW4gbXNcclxuICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IG51bGw7XHJcblxyXG4gIC8vIG9iamVjdCBvZiB0aGUgb3RoZXIgdXNlcnNcclxuICB0aGlzLm90aGVyVXNlcnMgPSB7fTtcclxuICAvLyB0aGUgb3RoZXJVc2VycyBkYXRhIHdpbGwgYmUgb2YgdGhpcyBmb3JtOlxyXG4gIC8vIHtcclxuICAvLyAgIDEyMzQ1Njc4OToge1xyXG4gIC8vICAgICBwZWVySWQ6IDEyMzQ2Nzg5LFxyXG4gIC8vICAgICB1c2VybmFtZTogaGVsbG9yb3ksXHJcbiAgLy8gICAgIGNhcjoge1xyXG4gIC8vICAgICAgIGxvY2F0aW9uOiA8bG9jYXRpb25fb2JqZWN0PixcclxuICAvLyAgICAgICBtYXJrZXI6IDxtYXJrZXJfb2JqZWN0PlxyXG4gIC8vICAgICB9LFxyXG4gIC8vICAgICBwZWVySnNDb25uZWN0aW9uOiA8cGVlckpzQ29ubmVjdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICBsYXN0VXBkYXRlVGltZTogPHRpbWVfb2JqZWN0PixcclxuICAvLyAgICAgbnVtSXRlbXM6IDAsXHJcbiAgLy8gICAgIGhhc0JlZW5Jbml0aWFsaXplZDogdHJ1ZVxyXG4gIC8vICAgfSxcclxuICAvLyAgIDk4NzY1NDMyMToge1xyXG4gIC8vICAgICBwZWVySWQ6IDk4NzY1NDMyMSxcclxuICAvLyAgICAgdXNlcm5hbWU6IHRvd250b3duOTAwMCxcclxuICAvLyAgICAgY2FyOiB7XHJcbiAgLy8gICAgICAgbG9jYXRpb246IDxsb2NhdGlvbl9vYmplY3Q+LFxyXG4gIC8vICAgICAgIG1hcmtlcjogPG1hcmtlcl9vYmplY3Q+XHJcbiAgLy8gICAgIH0sXHJcbiAgLy8gICAgIHBlZXJKc0Nvbm5lY3Rpb246IDxwZWVySnNDb25uZWN0aW9uX29iamVjdD4sXHJcbiAgLy8gICAgIGxhc3RVcGRhdGVUaW1lOiA8dGltZV9vYmplY3Q+LFxyXG4gIC8vICAgICBudW1JdGVtczogNVxyXG4gIC8vICAgfVxyXG4gIC8vIH1cclxuXHJcbiAgLy8gaW1hZ2VzXHJcbiAgdGhpcy5pdGVtSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9zbW9raW5nX3RvaWxldF9zbWFsbC5naWYnXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hVc2VyQ2FySWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9jcnVzaF9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtVG93blVzZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL2Nhci5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCgxNiwgMzIpXHJcbiAgfTtcclxuICB0aGlzLnRlYW1Ub3duT3RoZXJDYXJJY29uID0ge1xyXG4gICAgdXJsOiAnaW1hZ2VzL3RlYW1fdG93bl9vdGhlcl9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcbiAgdGhpcy50ZWFtQ3J1c2hPdGhlckNhckljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvdGVhbV9jcnVzaF9vdGhlcl9jYXIucG5nJyxcclxuICAgIG9yaWdpbjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDAsIDApLFxyXG4gICAgYW5jaG9yOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMTYsIDMyKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbVRvd25CYXNlSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9mb3J0LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlSWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9vcHBvbmVudF9mb3J0LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24gPSB7XHJcbiAgICB1cmw6ICdpbWFnZXMvZm9ydF90cmFuc3BhcmVudC5wbmcnLFxyXG4gICAgb3JpZ2luOiBuZXcgZ29vZ2xlLm1hcHMuUG9pbnQoMCwgMCksXHJcbiAgICBhbmNob3I6IG5ldyBnb29nbGUubWFwcy5Qb2ludCg3NSwgMTIwKVxyXG4gIH07XHJcblxyXG4gIHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbiA9IHtcclxuICAgIHVybDogJ2ltYWdlcy9vcHBvbmVudF9mb3J0X3RyYW5zcGFyZW50LnBuZycsXHJcbiAgICBvcmlnaW46IG5ldyBnb29nbGUubWFwcy5Qb2ludCgwLCAwKSxcclxuICAgIGFuY2hvcjogbmV3IGdvb2dsZS5tYXBzLlBvaW50KDc1LCAxMjApXHJcbiAgfTtcclxuXHJcblxyXG4gIC8vIHBlZXIgSlMgY29ubmVjdGlvbiAoZm9yIG11bHRpcGxheWVyIHdlYlJUQylcclxuICB0aGlzLnBlZXIgPSBuZXcgUGVlcih7XHJcbiAgICBrZXk6ICdqM20wcXRkZGVzaHBrM3hyJ1xyXG4gIH0pO1xyXG4gIHRoaXMucGVlci5vbignb3BlbicsIGZ1bmN0aW9uKGlkKSB7XHJcbiAgICBjb25zb2xlLmxvZygnTXkgcGVlciBJRCBpczogJyArIGlkKTtcclxuICAgICQoJyNwZWVyLWlkJykudGV4dChpZCk7XHJcbiAgICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3dhaXRpbmcgZm9yIGEgc211Z2dsZXIgdG8gYmF0dGxlLi4uJyk7XHJcbiAgfSk7XHJcbiAgdGhpcy5wZWVyLm9uKCdjb25uZWN0aW9uJywgY29ubmVjdGVkVG9QZWVyLmJpbmQodGhpcykpO1xyXG4gIHRoaXMuQUNUSVZFX0NPTk5FQ1RJT05fVElNRU9VVF9JTl9TRUNPTkRTID0gMzAgKiAxMDAwO1xyXG5cclxuXHJcbiAgZ29vZ2xlLm1hcHMuZXZlbnQuYWRkRG9tTGlzdGVuZXIod2luZG93LCAnbG9hZCcsIHRoaXMuaW5pdGlhbGl6ZSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiAgaW5pdGlhbGl6ZSB0aGUgZ2FtZVxyXG4gKi9cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgdGhpcy51c2VybmFtZSA9IHByb21wdCgnQ2hvb3NlIHlvdXIgU211Z2dsZXIgTmFtZTonLCAnTmluamEgUm95Jyk7XHJcbiAgY3JlYXRlTWFwT25QYWdlLmNhbGwodGhpcyk7XHJcbiAgbG9hZE1hcERhdGEuY2FsbCh0aGlzLCBtYXBJc1JlYWR5KTtcclxuXHJcbiAgLy8gdGhlc2UgYXJlIHNldCB0byB0cnVlIHdoZW4ga2V5cyBhcmUgYmVpbmcgcHJlc3NlZFxyXG4gIHRoaXMucmlnaHREb3duID0gZmFsc2U7XHJcbiAgdGhpcy5sZWZ0RG93biA9IGZhbHNlO1xyXG4gIHRoaXMudXBEb3duID0gZmFsc2U7XHJcbiAgdGhpcy5kb3duRG93biA9IGZhbHNlO1xyXG4gIHRoaXMuY3RybERvd24gPSBmYWxzZTtcclxuXHJcbiAgdGhpcy5zcGVlZCA9IDA7XHJcbiAgdGhpcy5yb3RhdGlvbiA9IDA7XHJcbiAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnJztcclxuXHJcbiAgLy90cnlGaW5kaW5nTG9jYXRpb24oKTtcclxuXHJcblxyXG4gIGJpbmRLZXlBbmRCdXR0b25FdmVudHMuY2FsbCh0aGlzKTtcclxuXHJcbiAgaW5pdGlhbGl6ZUJvb3N0QmFyLmNhbGwodGhpcyk7XHJcblxyXG4gIC8vIHN0YXJ0IHRoZSBnYW1lIGxvb3BcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5mcmFtZSk7XHJcbn1cclxuXHJcblNtdWdnbGVyc1Rvd24ucHJvdG90eXBlLmZyYW1lID0gZnVuY3Rpb24oKSB7XHJcbiAgdGhpcy5ub3cgPSB0aW1lc3RhbXAuY2FsbCh0aGlzKTtcclxuICB0aGlzLmR0ID0gdGhpcy5kdCArIE1hdGgubWluKDEsICh0aGlzLm5vdyAtIHRoaXMubGFzdCkgLyAxMDAwKTtcclxuICB3aGlsZSAodGhpcy5kdCA+IHRoaXMuc3RlcCkge1xyXG4gICAgdGhpcy5kdCA9IHRoaXMuZHQgLSB0aGlzLnN0ZXA7XHJcbiAgICB1cGRhdGUuY2FsbCh0aGlzLCB0aGlzLnN0ZXApO1xyXG4gIH1cclxuICByZW5kZXIuY2FsbCh0aGlzLCB0aGlzLmR0KTtcclxuICB0aGlzLmxhc3QgPSB0aGlzLm5vdztcclxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5mcmFtZSk7XHJcbn1cclxuXHJcbi8vIGtleSBldmVudHNcclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUub25LZXlEb3duID0gZnVuY3Rpb24oZXZ0KSB7XHJcbiAgaWYgKGV2dC5rZXlDb2RlID09IDM5KSB7XHJcbiAgICB0aGlzLnJpZ2h0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzNykge1xyXG4gICAgdGhpcy5sZWZ0RG93biA9IHRydWU7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzOCkge1xyXG4gICAgdGhpcy51cERvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gNDApIHtcclxuICAgIHRoaXMuZG93bkRvd24gPSB0cnVlO1xyXG4gIH0gZWxzZSBpZiAoZXZ0LmtleUNvZGUgPT0gMTcpIHtcclxuICAgIHRoaXMuY3RybERvd24gPSB0cnVlO1xyXG4gIH1cclxufVxyXG5cclxuU211Z2dsZXJzVG93bi5wcm90b3R5cGUub25LZXlVcCA9IGZ1bmN0aW9uKGV2dCkge1xyXG4gIGlmIChldnQua2V5Q29kZSA9PSAzOSkge1xyXG4gICAgdGhpcy5yaWdodERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDM3KSB7XHJcbiAgICB0aGlzLmxlZnREb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAzOCkge1xyXG4gICAgdGhpcy51cERvd24gPSBmYWxzZTtcclxuICB9IGVsc2UgaWYgKGV2dC5rZXlDb2RlID09IDQwKSB7XHJcbiAgICB0aGlzLmRvd25Eb3duID0gZmFsc2U7XHJcbiAgfSBlbHNlIGlmIChldnQua2V5Q29kZSA9PSAxNykge1xyXG4gICAgdGhpcy5jdHJsRG93biA9IGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVCb29zdEJhcigpIHtcclxuICAkKGZ1bmN0aW9uKCkge1xyXG4gICAgJChcIiNib29zdC1iYXJcIikucHJvZ3Jlc3NiYXIoe1xyXG4gICAgICB2YWx1ZTogMTAwXHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gbWFwSXNSZWFkeSgpIHtcclxuICB0aGlzLm1hdGNobWFrZXJUb3duLmpvaW5PckNyZWF0ZVNlc3Npb24odGhpcy51c2VybmFtZSwgdGhpcy5wZWVyLmlkLCBjb25uZWN0VG9BbGxOb25Ib3N0VXNlcnMuYmluZCh0aGlzKSwgZ2FtZUpvaW5lZC5iaW5kKHRoaXMpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBnYW1lSm9pbmVkKHNlc3Npb25EYXRhLCBpc05ld0dhbWUpIHtcclxuICB0aGlzLmdhbWVJZCA9IHNlc3Npb25EYXRhLmlkO1xyXG4gIGlmIChpc05ld0dhbWUpIHtcclxuICAgIC8vIHdlJ3JlIGhvc3RpbmcgdGhlIGdhbWUgb3Vyc2VsZlxyXG4gICAgdGhpcy5ob3N0UGVlcklkID0gdGhpcy5wZWVyLmlkO1xyXG5cclxuICAgIC8vIGZpcnN0IHVzZXIgaXMgYWx3YXlzIG9uIHRlYW0gdG93blxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2VycyA9IFt7XHJcbiAgICAgIHBlZXJJZDogdGhpcy5wZWVyLmlkLFxyXG4gICAgICB1c2VybmFtZTogdGhpcy51c2VybmFtZVxyXG4gICAgfV07XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAneWVsbG93Jyk7XHJcbiAgICAkKCcjdGVhbS10b3duLXRleHQnKS5jc3MoJ2NvbG9yJywgJ2JsYWNrJyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIHNvbWVvbmUgZWxzZSBpcyBhbHJlYWR5IHRoZSBob3N0XHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSBzZXNzaW9uRGF0YS5ob3N0UGVlcklkO1xyXG4gICAgYWN0aXZhdGVUZWFtQ3J1c2hJblVJLmNhbGwodGhpcyk7XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxuICB1cGRhdGVDYXJJY29ucy5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVc2VybmFtZXNJblVJKCkge1xyXG4gIHZhciB0ZWFtVG93bkpxdWVyeUVsZW0gPSAkKCcjdGVhbS10b3duLXVzZXJuYW1lcycpO1xyXG4gIHVwZGF0ZVRlYW1Vc2VybmFtZXNJblVJKHRlYW1Ub3duSnF1ZXJ5RWxlbSwgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycyk7XHJcbiAgdmFyIHRlYW1DcnVzaEpxdWVyeUVsZW0gPSAkKCcjdGVhbS1jcnVzaC11c2VybmFtZXMnKTtcclxuICB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtQ3J1c2hKcXVlcnlFbGVtLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycyk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUZWFtVXNlcm5hbWVzSW5VSSh0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbSwgdXNlck9iamVjdHNBcnJheSkge1xyXG4gIC8vIGNsZWFyIHRoZSBjdXJyZW50IGxpc3Qgb2YgdXNlcm5hbWVzXHJcbiAgdGVhbVVzZXJuYW1lc0pxdWVyeUVsZW0uZW1wdHkoKTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJPYmplY3RzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBuZXdKcXVlcnlFbGVtID0gJCgkLnBhcnNlSFRNTChcclxuICAgICAgJzxsaSBpZD1cInVzZXJuYW1lLScgK1xyXG4gICAgICB1c2VyT2JqZWN0c0FycmF5W2ldLnBlZXJJZCArXHJcbiAgICAgICdcIj4nICsgdXNlck9iamVjdHNBcnJheVtpXS51c2VybmFtZSArICc8L2xpPidcclxuICAgICkpO1xyXG4gICAgJCh0ZWFtVXNlcm5hbWVzSnF1ZXJ5RWxlbSkuYXBwZW5kKG5ld0pxdWVyeUVsZW0pO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYWN0aXZhdGVUZWFtQ3J1c2hJblVJKCkge1xyXG4gICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ29wYWNpdHknLCAnMScpO1xyXG4gIHZhciB0ZWFtQ3J1c2hTY29yZSA9IDA7XHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpIHtcclxuICAgIHRlYW1DcnVzaFNjb3JlID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZDtcclxuICB9XHJcbiAgJCgnI251bS1pdGVtcy10ZWFtLWNydXNoJykudGV4dCh0ZWFtQ3J1c2hTY29yZSk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjb25uZWN0VG9BbGxOb25Ib3N0VXNlcnMobm9uSG9zdFBlZXJJZHMpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vbkhvc3RQZWVySWRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAobm9uSG9zdFBlZXJJZHNbaV0gIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgIGNvbm5lY3RUb1BlZXIuY2FsbCh0aGlzLCBub25Ib3N0UGVlcklkc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBiaW5kS2V5QW5kQnV0dG9uRXZlbnRzKCkge1xyXG4gICQod2luZG93KS5yZXNpemUoZnVuY3Rpb24oKSB7XHJcbiAgICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG4gIH0pO1xyXG5cclxuICAkKGRvY3VtZW50KS5rZXlkb3duKHRoaXMub25LZXlEb3duKTtcclxuICAkKGRvY3VtZW50KS5rZXl1cCh0aGlzLm9uS2V5VXApO1xyXG4gICQoJyNjb25uZWN0LWJ1dHRvbicpLmNsaWNrKGZ1bmN0aW9uKGV2dCkge1xyXG4gICAgdmFyIHBlZXJJZCA9ICQoJyNwZWVyLWlkLXRleHRib3gnKS52YWwoKTtcclxuICAgIGNvbnNvbGUubG9nKCdwZWVyIGlkIGNvbm5lY3Rpbmc6ICcgKyBwZWVySWQpO1xyXG4gICAgY29ubmVjdFRvUGVlci5jYWxsKHRoaXMsIHBlZXJJZCk7XHJcbiAgfSk7XHJcbiAgJCgnI3NldC1jZW50ZXItYnV0dG9uJykuY2xpY2soZnVuY3Rpb24oZXZ0KSB7XHJcbiAgICB2YXIgc2VhcmNoVGVybSA9ICQoJyNtYXAtY2VudGVyLXRleHRib3gnKS52YWwoKTtcclxuICAgIGlmICghc2VhcmNoVGVybSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBjb25zb2xlLmxvZygnc2V0dGluZyBjZW50ZXIgdG86ICcgKyBzZWFyY2hUZXJtKTtcclxuICAgIHNlYXJjaEFuZENlbnRlck1hcC5jYWxsKHRoaXMsIHNlYXJjaFRlcm0pO1xyXG4gICAgYnJvYWRjYXN0TmV3TG9jYXRpb24uY2FsbCh0aGlzLCB0aGlzLm1hcENlbnRlcik7XHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwodGhpcyk7XHJcbiAgfSk7XHJcbiAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZGlzY29ubmVjdEZyb21HYW1lLmJpbmQodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpc2Nvbm5lY3RGcm9tR2FtZSgpIHtcclxuICBpZiAodGhpcy5wZWVyICYmIHRoaXMucGVlci5pZCAmJiB0aGlzLmdhbWVJZCkge1xyXG4gICAgdGhpcy5tYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbVNlc3Npb24odGhpcy5nYW1lSWQsIHRoaXMucGVlci5pZCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVNYXBPblBhZ2UoKSB7XHJcbiAgdmFyIG1hcE9wdGlvbnMgPSB7XHJcbiAgICB6b29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIGNlbnRlcjogdGhpcy5tYXBDZW50ZXIsXHJcbiAgICBrZXlib2FyZFNob3J0Y3V0czogZmFsc2UsXHJcbiAgICBtYXBUeXBlSWQ6IGdvb2dsZS5tYXBzLk1hcFR5cGVJZC5TQVRFTExJVEUsXHJcbiAgICBkaXNhYmxlRGVmYXVsdFVJOiB0cnVlLFxyXG4gICAgbWluWm9vbTogdGhpcy5tYXBab29tTGV2ZWwsXHJcbiAgICBtYXhab29tOiB0aGlzLm1hcFpvb21MZXZlbCxcclxuICAgIHNjcm9sbHdoZWVsOiBmYWxzZSxcclxuICAgIGRpc2FibGVEb3VibGVDbGlja1pvb206IHRydWUsXHJcbiAgICBkcmFnZ2FibGU6IGZhbHNlLFxyXG4gIH1cclxuXHJcbiAgdGhpcy5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAtY2FudmFzJyksIG1hcE9wdGlvbnMpO1xyXG5cclxuICAvLyBub3QgbmVjZXNzYXJ5LCBqdXN0IHdhbnQgdG8gYWxsb3cgdGhlIHJpZ2h0LWNsaWNrIGNvbnRleHQgbWVudVxyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCAnY2xpY2snLCBmdW5jdGlvbihlKSB7XHJcbiAgICBjb250ZXh0bWVudTogdHJ1ZVxyXG4gIH0pO1xyXG4gIGdvb2dsZS5tYXBzLmV2ZW50LmFkZExpc3RlbmVyKHRoaXMubWFwLCBcInJpZ2h0Y2xpY2tcIiwgdGhpcy5zaG93Q29udGV4dE1lbnUpO1xyXG5cclxuICByZXNpemVNYXBUb0ZpdC5jYWxsKHRoaXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNpemVNYXBUb0ZpdCgpIHtcclxuICAkKCdib2R5JykuaGVpZ2h0KCQod2luZG93KS5oZWlnaHQoKSAtIDIpO1xyXG4gIHZhciBtYWluSGVpZ2h0ID0gJCgnYm9keScpLmhlaWdodCgpO1xyXG4gIHZhciBjb250ZW50SGVpZ2h0ID1cclxuICAgICQoJyNoZWFkZXInKS5vdXRlckhlaWdodCgpICtcclxuICAgICQoJyNmb290ZXInKS5vdXRlckhlaWdodCgpO1xyXG4gIHZhciBoID0gbWFpbkhlaWdodCAtIGNvbnRlbnRIZWlnaHQ7XHJcbiAgJCgnI21hcC1ib2R5JykuaGVpZ2h0KGgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWFyY2hBbmRDZW50ZXJNYXAoc2VhcmNoVGVybSkge1xyXG4gIHZhciBwYXJ0cyA9IHNlYXJjaFRlcm0uc3BsaXQoJywnKTtcclxuICBpZiAoIXBhcnRzKSB7XHJcbiAgICAvLyBiYWQgc2VhcmNoIGlucHV0LCBtdXN0IGJlIGluIGxhdCxsbmcgZm9ybVxyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgbGF0U3RyaW5nID0gcGFydHNbMF07XHJcbiAgdmFyIGxuZ1N0cmluZyA9IHBhcnRzWzFdO1xyXG4gIHNldEdhbWVUb05ld0xvY2F0aW9uLmNhbGwodGhpcywgbGF0U3RyaW5nLCBsbmdTdHJpbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBsb2FkTWFwRGF0YShtYXBJc1JlYWR5Q2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdGhpcy5tYXBEYXRhTG9hZGVkID0gZmFsc2U7XHJcbiAgY29uc29sZS5sb2coJ2xvYWRpbmcgbWFwIGRhdGEnKTtcclxuXHJcbiAgLy8gVE9ETzogXHJcbiAgLy8gdG8gcmVhZCBzdGF0aWMgZmlsZXMgaW5cclxuICAvLyB5b3UgbmVlZCB0byBwYXNzIFwiLXQgYnJmc1wiIHRvIGJyb3dzZXJpZnlcclxuICAvLyBidXQgaXQncyBjb29sIGNvcyB5b3UgY2FuIGlubGluZSBiYXNlNjQgZW5jb2RlZCBpbWFnZXMgb3IgdXRmOCBodG1sIHN0cmluZ3NcclxuICAvLyQuZ2V0SlNPTihcIm1hcHMvZ3JhbmRjYW55b24uanNvblwiLCBmdW5jdGlvbihqc29uKSB7XHJcbiAgJC5nZXRKU09OKFwibWFwcy9wb3J0bGFuZC5qc29uXCIsIGZ1bmN0aW9uKGpzb24pIHtcclxuICAgIGNvbnNvbGUubG9nKCdtYXAgZGF0YSBsb2FkZWQnKTtcclxuICAgIHNlbGYubWFwRGF0YSA9IGpzb247XHJcbiAgICBzZWxmLm1hcERhdGFMb2FkZWQgPSB0cnVlO1xyXG4gICAgc2VsZi5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHNlbGYubWFwRGF0YS5tYXAuY2VudGVyTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC5jZW50ZXJMYXRMbmcubG5nKTtcclxuICAgIHNlbGYubWFwLnNldENlbnRlcihzZWxmLm1hcENlbnRlcik7XHJcbiAgICBzZWxmLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgICAgbGF0OiBzZWxmLm1hcENlbnRlci5sYXQoKSxcclxuICAgICAgbG5nOiBzZWxmLm1hcENlbnRlci5sbmcoKVxyXG4gICAgfTtcclxuXHJcbiAgICBjcmVhdGVUZWFtVG93bkJhc2UuY2FsbChzZWxmLCBzZWxmLm1hcERhdGEubWFwLnRlYW1Ub3duQmFzZUxhdExuZy5sYXQsIHNlbGYubWFwRGF0YS5tYXAudGVhbVRvd25CYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBjcmVhdGVUZWFtQ3J1c2hCYXNlLmNhbGwoc2VsZiwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxhdCwgc2VsZi5tYXBEYXRhLm1hcC50ZWFtQ3J1c2hCYXNlTGF0TG5nLmxuZyk7XHJcbiAgICBzZWxmLm15VGVhbUJhc2VNYXBPYmplY3QgPSBzZWxmLnRlYW1Ub3duQmFzZU1hcE9iamVjdDtcclxuXHJcbiAgICByYW5kb21seVB1dEl0ZW1zLmNhbGwoc2VsZik7XHJcbiAgICBtYXBJc1JlYWR5Q2FsbGJhY2suY2FsbChzZWxmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlKGxhdCwgbG5nKSB7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC5iYXNlT2JqZWN0ID0gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdC5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZShsYXQsIGxuZykge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QgPSBjcmVhdGVUZWFtQ3J1c2hCYXNlT2JqZWN0LmNhbGwodGhpcywgbGF0LCBsbmcpO1xyXG4gIGNyZWF0ZVRlYW1DcnVzaEJhc2VNYXBPYmplY3QuY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVRlYW1Ub3duQmFzZU1hcE9iamVjdChsYXQsIGxuZykge1xyXG4gIC8vIGlmIHRoZXJlJ3MgYWxyZWFkeSBhIHRlYW0gVG93biBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCAmJiB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdCA9IHt9O1xyXG4gIHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZyk7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gVG93biBCYXNlJyxcclxuICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICBwb3NpdGlvbjogdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubG9jYXRpb24sXHJcbiAgICBpY29uOiB0aGlzLnRlYW1Ub3duQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbVRvd25CYXNlT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgdmFyIHRlYW1Ub3duQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1Ub3duQmFzZU9iamVjdC5sb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG5cclxuICByZXR1cm4gdGVhbVRvd25CYXNlT2JqZWN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0KGxhdCwgbG5nKSB7XHJcbiAgLy8gaWYgdGhlcmUncyBhbHJlYWR5IGEgdGVhbSBDcnVzaCBiYXNlIG9uIHRoZSBtYXAsIHJlbW92ZSBpdFxyXG4gIGlmICh0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgJiYgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QgPSB7fTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICB0aXRsZTogJ1RlYW0gQ3J1c2ggQmFzZScsXHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgcG9zaXRpb246IHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5sb2NhdGlvbixcclxuICAgIGljb246IHRoaXMudGVhbUNydXNoQmFzZUljb25cclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlVGVhbUNydXNoQmFzZU9iamVjdChsYXQsIGxuZykge1xyXG5cclxuICB2YXIgdGVhbUNydXNoQmFzZU9iamVjdCA9IHt9O1xyXG4gIHRlYW1DcnVzaEJhc2VPYmplY3QubG9jYXRpb24gPSB7XHJcbiAgICBsYXQ6IGxhdCxcclxuICAgIGxuZzogbG5nXHJcbiAgfTtcclxuXHJcbiAgcmV0dXJuIHRlYW1DcnVzaEJhc2VPYmplY3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJhbmRvbWx5UHV0SXRlbXMoKSB7XHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gZ2V0UmFuZG9tTG9jYXRpb25Gb3JJdGVtLmNhbGwodGhpcyk7XHJcbiAgdmFyIGl0ZW1JZCA9IGdldFJhbmRvbUluUmFuZ2UoMSwgMTAwMDAwMCwgMCk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ID0ge1xyXG4gICAgaWQ6IGl0ZW1JZCxcclxuICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgIGxhdDogcmFuZG9tTG9jYXRpb24ubGF0KCksXHJcbiAgICAgIGxuZzogcmFuZG9tTG9jYXRpb24ubG5nKClcclxuICAgIH1cclxuICB9XHJcbiAgcHV0TmV3SXRlbU9uTWFwLmNhbGwodGhpcywgcmFuZG9tTG9jYXRpb24sIGl0ZW1JZCk7XHJcbiAgYnJvYWRjYXN0TmV3SXRlbS5jYWxsKHRoaXMsIHJhbmRvbUxvY2F0aW9uLCBpdGVtSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRSYW5kb21Mb2NhdGlvbkZvckl0ZW0oKSB7XHJcbiAgLy8gRmluZCBhIHJhbmRvbSBsb2NhdGlvbiB0aGF0IHdvcmtzLCBhbmQgaWYgaXQncyB0b28gY2xvc2VcclxuICAvLyB0byB0aGUgYmFzZSwgcGljayBhbm90aGVyIGxvY2F0aW9uXHJcbiAgdmFyIHJhbmRvbUxvY2F0aW9uID0gbnVsbDtcclxuICB2YXIgY2VudGVyT2ZBcmVhTGF0ID0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uLmxhdCgpO1xyXG4gIHZhciBjZW50ZXJPZkFyZWFMbmcgPSB0aGlzLm15VGVhbUJhc2VNYXBPYmplY3QubG9jYXRpb24ubG5nKCk7XHJcbiAgd2hpbGUgKHRydWUpIHtcclxuICAgIHJhbmRvbUxhdCA9IGdldFJhbmRvbUluUmFuZ2UoY2VudGVyT2ZBcmVhTGF0IC1cclxuICAgICAgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgY2VudGVyT2ZBcmVhTGF0ICsgKHRoaXMud2lkdGhPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICByYW5kb21MbmcgPSBnZXRSYW5kb21JblJhbmdlKGNlbnRlck9mQXJlYUxuZyAtXHJcbiAgICAgICh0aGlzLmhlaWdodE9mQXJlYVRvUHV0SXRlbXMgLyAyLjApLCBjZW50ZXJPZkFyZWFMbmcgKyAodGhpcy5oZWlnaHRPZkFyZWFUb1B1dEl0ZW1zIC8gMi4wKSwgNyk7XHJcbiAgICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIHB1dCBpdGVtIGF0OiAnICsgcmFuZG9tTGF0ICsgJywnICsgcmFuZG9tTG5nKTtcclxuICAgIHJhbmRvbUxvY2F0aW9uID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZyhyYW5kb21MYXQsIHJhbmRvbUxuZyk7XHJcbiAgICBpZiAoZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4ocmFuZG9tTG9jYXRpb24sIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikgPiB0aGlzLm1pbkl0ZW1EaXN0YW5jZUZyb21CYXNlKSB7XHJcbiAgICAgIHJldHVybiByYW5kb21Mb2NhdGlvbjtcclxuICAgIH1cclxuICAgIGNvbnNvbGUubG9nKCdpdGVtIHRvbyBjbG9zZSB0byBiYXNlLCBjaG9vc2luZyBhbm90aGVyIGxvY2F0aW9uLi4uJyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBwdXROZXdJdGVtT25NYXAobG9jYXRpb24sIGl0ZW1JZCkge1xyXG4gIC8vIGV2ZW50dWFsbHkgdGhpcyBzaG91bGQgYmUgcmVkdW5kYW50IHRvIGNsZWFyIHRoaXMsIGJ1dCB3aGlsZVxyXG4gIC8vIHRoZXJlJ3MgYSBidWcgb24gbXVsdGlwbGF5ZXIgam9pbmluZywgY2xlYXIgaXQgYWdhaW5cclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcblxyXG4gIC8vIHNldCB0aGUgYmFzZSBpY29uIGltYWdlcyB0byBiZSB0aGUgbGlnaHRlciBvbmVzXHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG5cclxuICAvLyBpbiBjYXNlIHRoZXJlJ3MgYSBsaW5nZXJpbmcgaXRlbSwgcmVtb3ZlIGl0XHJcbiAgaWYgKHRoaXMuaXRlbU1hcE9iamVjdCAmJiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyICYmIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIubWFwKSB7XHJcbiAgICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldE1hcChudWxsKTtcclxuICB9XHJcblxyXG4gIHZhciBpdGVtTWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICBtYXA6IHRoaXMubWFwLFxyXG4gICAgdGl0bGU6ICdJdGVtJyxcclxuICAgIGljb246IHRoaXMuaXRlbUljb24sXHJcbiAgICAvLyAvL1RPRE86IEZJWCBTVFVQSUQgR09PR0xFIE1BUFMgQlVHIHRoYXQgY2F1c2VzIHRoZSBnaWYgbWFya2VyXHJcbiAgICAvLyAvL3RvIG15c3RlcmlvdXNseSBub3Qgc2hvdyB1cCBzb21ldGltZXNcclxuICAgIC8vIG9wdGltaXplZDogZmFsc2UsXHJcbiAgICBwb3NpdGlvbjogbG9jYXRpb25cclxuICB9KTtcclxuXHJcbiAgdGhpcy5pdGVtTWFwT2JqZWN0ID0ge1xyXG4gICAgbWFya2VyOiBpdGVtTWFya2VyLFxyXG4gICAgbG9jYXRpb246IGxvY2F0aW9uXHJcbiAgfTtcclxuXHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uID0ge1xyXG4gICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgIGxuZzogbG9jYXRpb24ubG5nKClcclxuICB9O1xyXG5cclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIGxvY2F0aW9uLCAnYXJyb3cucG5nJyk7XHJcbiAgcmV0dXJuIGl0ZW1JZDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlQm9vc3RpbmcoKSB7XHJcbiAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX05PUk1BTF9TUEVFRDtcclxuICBpZiAoJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgfHwgJCgnI2Jvb3N0LWJhcicpLnByb2dyZXNzYmFyKFwidmFsdWVcIikgPT0gMCkge1xyXG4gICAgdmFyIGJvb3N0QmFyVmFsdWUgPSAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiKTtcclxuICAgIGlmICh0aGlzLmN0cmxEb3duICYmIGJvb3N0QmFyVmFsdWUgPiAwKSB7XHJcbiAgICAgIGJvb3N0QmFyVmFsdWUgLT0gdGhpcy5CT09TVF9DT05TVU1QVElPTl9SQVRFO1xyXG4gICAgICAkKCcjYm9vc3QtYmFyJykucHJvZ3Jlc3NiYXIoXCJ2YWx1ZVwiLCBib29zdEJhclZhbHVlKTtcclxuICAgICAgdGhpcy5tYXhTcGVlZCA9IHRoaXMuTUFYX0JPT1NUX1NQRUVEO1xyXG4gICAgICB0aGlzLnNwZWVkICo9IHRoaXMuQk9PU1RfRkFDVE9SO1xyXG4gICAgICBpZiAoTWF0aC5hYnModGhpcy5zcGVlZCkgPiB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLnNwZWVkID0gLXRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRoaXMuc3BlZWQgPSB0aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB0aGlzLmhvcml6b250YWxTcGVlZCAqPSB0aGlzLkJPT1NUX0ZBQ1RPUjtcclxuICAgICAgaWYgKE1hdGguYWJzKHRoaXMuaG9yaXpvbnRhbFNwZWVkKSA+IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPCAwKSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IC10aGlzLm1heFNwZWVkO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aGlzLmhvcml6b250YWxTcGVlZCA9IHRoaXMubWF4U3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5jdHJsRG93biAmJiBib29zdEJhclZhbHVlIDw9IDApIHtcclxuICAgICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI2Jvb3N0LWJhcicpKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm1heFNwZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtb3ZlQ2FyKCkge1xyXG4gIHRoaXMubWF4U3BlZWQgPSBoYW5kbGVCb29zdGluZy5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBpZiBVcCBvciBEb3duIGtleSBpcyBwcmVzc2VkLCBjaGFuZ2UgdGhlIHNwZWVkLiBPdGhlcndpc2UsXHJcbiAgLy8gZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy51cERvd24gfHwgdGhpcy5kb3duRG93bikge1xyXG4gICAgaWYgKHRoaXMudXBEb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkIDw9IHRoaXMubWF4U3BlZWQpIHtcclxuICAgICAgICB0aGlzLnNwZWVkICs9IDE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICh0aGlzLmRvd25Eb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLnNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5zcGVlZCAtPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gIH1cclxuXHJcbiAgLy8gaWYgTGVmdCBvciBSaWdodCBrZXkgaXMgcHJlc3NlZCwgY2hhbmdlIHRoZSBob3Jpem9udGFsIHNwZWVkLlxyXG4gIC8vIE90aGVyd2lzZSwgZGVjZWxlcmF0ZSBhdCBhIHN0YW5kYXJkIHJhdGVcclxuICBpZiAodGhpcy5sZWZ0RG93biB8fCB0aGlzLnJpZ2h0RG93bikge1xyXG4gICAgaWYgKHRoaXMucmlnaHREb3duKSB7XHJcbiAgICAgIGlmICh0aGlzLmhvcml6b250YWxTcGVlZCA8PSB0aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgKz0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubGVmdERvd24pIHtcclxuICAgICAgaWYgKHRoaXMuaG9yaXpvbnRhbFNwZWVkID49IC10aGlzLm1heFNwZWVkKSB7XHJcbiAgICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLT0gMTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy51cERvd24gJiYgIXRoaXMuZG93bkRvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLnNwZWVkKSA+IHRoaXMuTUFYX05PUk1BTF9TUEVFRCkpIHtcclxuICAgIGlmICh0aGlzLnNwZWVkID4gLTAuMDEgJiYgdGhpcy5zcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5zcGVlZCA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLnNwZWVkIC89IHRoaXMuZGVjZWxlcmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKCghdGhpcy5sZWZ0RG93biAmJiAhdGhpcy5yaWdodERvd24pIHx8ICghdGhpcy5jdHJsRG93biAmJiBNYXRoLmFicyh0aGlzLmhvcml6b250YWxTcGVlZCkgPiB0aGlzLk1BWF9OT1JNQUxfU1BFRUQpKSB7XHJcbiAgICBpZiAodGhpcy5ob3Jpem9udGFsU3BlZWQgPiAtMC4wMSAmJiB0aGlzLmhvcml6b250YWxTcGVlZCA8IDAuMDEpIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgPSAwO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5ob3Jpem9udGFsU3BlZWQgLz0gdGhpcy5kZWNlbGVyYXRpb247XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBvcHRpbWl6YXRpb24gLSBvbmx5IGlmIHRoZSBjYXIgaXMgbW92aW5nIHNob3VsZCB3ZSBzcGVuZFxyXG4gIC8vIHRpbWUgcmVzZXR0aW5nIHRoZSBtYXBcclxuICBpZiAodGhpcy5zcGVlZCAhPSAwIHx8IHRoaXMuaG9yaXpvbnRhbFNwZWVkICE9IDApIHtcclxuICAgIHZhciBuZXdMYXQgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sYXQoKSArICh0aGlzLnNwZWVkIC8gdGhpcy5sYXRpdHVkZVNwZWVkRmFjdG9yKTtcclxuICAgIHZhciBuZXdMbmcgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKS5sbmcoKSArICh0aGlzLmhvcml6b250YWxTcGVlZCAvIHRoaXMubG9uZ2l0dWRlU3BlZWRGYWN0b3IpO1xyXG4gICAgdGhpcy5tYXBDZW50ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKG5ld0xhdCwgbmV3TG5nKTtcclxuICAgIHRoaXMubWFwLnNldENlbnRlcih0aGlzLm1hcENlbnRlcik7XHJcblxyXG4gIH1cclxuXHJcbiAgcm90YXRlQ2FyLmNhbGwodGhpcyk7XHJcbiAgaWYgKHRoaXMudGVhbVRvd25CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICByb3RhdGVBcnJvdy5jYWxsKHRoaXMpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdFRvUGVlcihvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgY29uc29sZS5sb2coJ3RyeWluZyB0byBjb25uZWN0IHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gICQoJyNwZWVyLWNvbm5lY3Rpb24tc3RhdHVzJykudGV4dCgndHJ5aW5nIHRvIGNvbm5lY3QgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgdmFyIHBlZXJKc0Nvbm5lY3Rpb24gPSB0aGlzLnBlZXIuY29ubmVjdChvdGhlclVzZXJQZWVySWQpO1xyXG4gIHBlZXJKc0Nvbm5lY3Rpb24ub24oJ29wZW4nLCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIG9wZW4nKTtcclxuICAgIGNvbm5lY3RlZFRvUGVlci5jYWxsKHNlbGYsIHBlZXJKc0Nvbm5lY3Rpb24pO1xyXG4gIH0pO1xyXG4gIHBlZXJKc0Nvbm5lY3Rpb24ub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlBFRVJKUyBFUlJPUjogXCIpO1xyXG4gICAgY29uc29sZS5sb2coZXJyKTtcclxuICAgIHRocm93IFwiUGVlckpTIGNvbm5lY3Rpb24gZXJyb3JcIjtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29ubmVjdGVkVG9QZWVyKHBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICB2YXIgb3RoZXJVc2VyUGVlcklkID0gcGVlckpzQ29ubmVjdGlvbi5wZWVyO1xyXG4gIGNvbnNvbGUubG9nKCdjb25uZWN0ZWQgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgJCgnI3BlZXItY29ubmVjdGlvbi1zdGF0dXMnKS50ZXh0KCdjb25uZWN0ZWQgdG8gJyArIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIC8vIGlmIHRoaXMgaXMgdGhlIGZpcnN0IHRpbWUgd2UndmUgY29ubmVjdGVkIHRvIHRoaXMgdWVzcixcclxuICAvLyBhZGQgdGhlIEhUTUwgZm9yIHRoZSBuZXcgdXNlclxyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gfHwgIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIGluaXRpYWxpemVQZWVyQ29ubmVjdGlvbi5jYWxsKHRoaXMsIHBlZXJKc0Nvbm5lY3Rpb24sIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgICBhc3NpZ25Vc2VyVG9UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkKTtcclxuICAgIGNyZWF0ZU90aGVyVXNlckNhci5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfVxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlT3RoZXJVc2VyQ2FyKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJJZCA9IG90aGVyVXNlclBlZXJJZDtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5jYXIgPSB7fTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduVXNlclRvVGVhbShvdGhlclVzZXJQZWVySWQpIHtcclxuICAvLyBpZiB0aGUgdXNlciBpcyBhbHJlYWR5IG9uIGEgdGVhbSwgaWdub3JlIHRoaXNcclxuICBpZiAoaXNVc2VyT25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzKSB8fFxyXG4gICAgaXNVc2VyT25UZWFtLmNhbGwodGhpcywgb3RoZXJVc2VyUGVlcklkLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2VycykpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB1c2VyT2JqZWN0ID0ge1xyXG4gICAgcGVlcklkOiBvdGhlclVzZXJQZWVySWQsXHJcbiAgICB1c2VybmFtZTogbnVsbFxyXG4gIH07XHJcbiAgLy8gZm9yIG5vdywganVzdCBhbHRlcm5hdGUgd2hvIGdvZXMgb24gZWFjaCB0ZWFtXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoID4gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMubGVuZ3RoKSB7XHJcbiAgICBhY3RpdmF0ZVRlYW1DcnVzaEluVUkuY2FsbCh0aGlzKTtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLnB1c2godXNlck9iamVjdCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMucHVzaCh1c2VyT2JqZWN0KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzVXNlck9uVGVhbShwZWVySWQsIHVzZXJPYmplY3RzQXJyYXkpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJPYmplY3RzQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh1c2VyT2JqZWN0c0FycmF5W2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZnVuY3Rpb24gYXNzaWduTXlUZWFtSW5VSSgpIHtcclxuICBpZiAodXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpIHtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnYmFja2dyb3VuZC1jb2xvcicsICd5ZWxsb3cnKTtcclxuICAgICQoJyN0ZWFtLXRvd24tdGV4dCcpLmNzcygnY29sb3InLCAnYmxhY2snKTtcclxuICAgICQoJyN0ZWFtLWNydXNoLXRleHQnKS5jc3MoJ2JhY2tncm91bmQtY29sb3InLCAnIzY2NycpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkKCcjdGVhbS1jcnVzaC10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJ3JlZCcpO1xyXG4gICAgJCgnI3RlYW0tdG93bi10ZXh0JykuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgJyM2NjYnKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVQZWVyQ29ubmVjdGlvbihwZWVySnNDb25uZWN0aW9uLCBvdGhlclVzZXJQZWVySWQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgaWYgKCF0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXSkge1xyXG4gICAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gPSB7fTtcclxuICB9XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbiA9IHBlZXJKc0Nvbm5lY3Rpb247XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5vbignY2xvc2UnLCBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdjbG9zaW5nIGNvbm5lY3Rpb24nKTtcclxuICAgIG90aGVyVXNlckRpc2Nvbm5lY3RlZC5jYWxsKHNlbGYsIG90aGVyVXNlclBlZXJJZCk7XHJcbiAgfSk7XHJcbiAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5vbignZGF0YScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGRhdGFSZWNlaXZlZC5jYWxsKHNlbGYsIGRhdGEpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmYWRlQXJyb3dUb0ltYWdlKGltYWdlRmlsZU5hbWUpIHtcclxuICAkKFwiI2Fycm93LWltZ1wiKS5hdHRyKCdzcmMnLCAnaW1hZ2VzLycgKyBpbWFnZUZpbGVOYW1lKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyRGlzY29ubmVjdGVkKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIHNob3VsZCBiZSBjYWxsZWQgYWZ0ZXIgdGhlIHBlZXJKcyBjb25uZWN0aW9uXHJcbiAgLy8gaGFzIGFscmVhZHkgYmVlbiBjbG9zZWRcclxuICBpZiAoIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICByZW1vdmVVc2VyRnJvbVRlYW0uY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIHJlbW92ZVVzZXJGcm9tVUkuY2FsbCh0aGlzLCBvdGhlclVzZXJQZWVySWQpO1xyXG5cclxuICAvLyByZW1vdmUgdGhpcyB1c2VyIGZyb20gdGhlIGdhbWUgaW4gRmlyZWJhc2U6XHJcbiAgdGhpcy5tYXRjaG1ha2VyVG93bi5yZW1vdmVQZWVyRnJvbVNlc3Npb24odGhpcy5nYW1lSWQsIG90aGVyVXNlclBlZXJJZCk7XHJcblxyXG4gIGlmICh0aGlzLmhvc3RQZWVySWQgPT0gb3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgICAvLyBpZiB0aGF0IHVzZXIgd2FzIHRoZSBob3N0LCBzZXQgdXMgYXMgdGhlIG5ldyBob3N0XHJcbiAgICB0aGlzLmhvc3RQZWVySWQgPSB0aGlzLnBlZXIuaWQ7XHJcbiAgICB0aGlzLm1hdGNobWFrZXJUb3duLnN3aXRjaFRvTmV3SG9zdCh0aGlzLmdhbWVJZCwgdGhpcy5wZWVyLmlkKTtcclxuICB9XHJcblxyXG4gIC8vIGlmIHRoZSB1c2VyIHdobyBkaXNjb25uZWN0ZWQgY3VycmVudGx5IGhhZCBhbiBpdGVtLFxyXG4gIC8vIHB1dCBvdXQgYSBuZXcgb25lXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSAmJiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPT0gb3RoZXJVc2VyUGVlcklkICYmIHRoaXMuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgIHJhbmRvbWx5UHV0SXRlbXMuY2FsbCh0aGlzKTtcclxuICB9XHJcblxyXG4gIC8vIGRlbGV0ZSB0aGF0IHVzZXIncyBkYXRhXHJcbiAgZGVsZXRlIHRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdO1xyXG5cclxuICAvLyBpZiB0aGVyZSBhbnkgdXNlcnMgbGVmdCwgYnJvYWRjYXN0IHRoZW0gdGhlIG5ldyBnYW1lIHN0YXRlXHJcbiAgaWYgKE9iamVjdC5rZXlzKHRoaXMub3RoZXJVc2VycykubGVuZ3RoID4gMCkge1xyXG4gICAgYnJvYWRjYXN0R2FtZVN0YXRlVG9BbGxQZWVycy5jYWxsKHRoaXMpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkKCcjcGVlci1jb25uZWN0aW9uLXN0YXR1cycpLnRleHQoJ3dhaXRpbmcgZm9yIGEgc211Z2dsZXIgdG8gYmF0dGxlLi4uJyk7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlVXNlckZyb21UZWFtKHVzZXJQZWVySWQpIHtcclxuICBmb3IgKHZhciBpID0gdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IHVzZXJQZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vycy5zcGxpY2UoaSwgMSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGZvciAodmFyIGogPSB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2pdLnBlZXJJZCA9PSB1c2VyUGVlcklkKSB7XHJcbiAgICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLnNwbGljZShqLCAxKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbW92ZVVzZXJGcm9tVUkocGVlcklkKSB7XHJcbiAgLy8gcmVtb3ZlIHRoZSBvdGhlciB1c2VyJ3MgY2FyIGZyb20gdGhlIG1hcFxyXG4gIHRoaXMub3RoZXJVc2Vyc1twZWVySWRdLmNhci5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG5cclxuICAvLyBpZiB0aGVpciB0ZWFtIGhhcyBubyBtb3JlIHVzZXJzLCBncmV5IG91dFxyXG4gIC8vIHRoZWlyIHNjb3JlIGJveFxyXG4gIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vycy5sZW5ndGggPT0gMCkge1xyXG4gICAgJCgnI3RlYW0tY3J1c2gtdGV4dCcpLmNzcygnb3BhY2l0eScsICcwLjMnKTtcclxuICB9XHJcblxyXG4gIHVwZGF0ZVVzZXJuYW1lc0luVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gb3RoZXJVc2VyQ2hhbmdlZExvY2F0aW9uKGxhdCwgbG5nKSB7XHJcbiAgc2V0R2FtZVRvTmV3TG9jYXRpb24uY2FsbCh0aGlzLCBsYXQsIGxuZyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMoKSB7XHJcbiAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgIGJyb2FkY2FzdEdhbWVTdGF0ZS5jYWxsKHRoaXMsIHVzZXIpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZGF0YVJlY2VpdmVkKGRhdGEpIHtcclxuICBpZiAoZGF0YS5wZWVySWQpIHtcclxuICAgIC8vIGlmIHdlIGFyZSB0aGUgaG9zdCwgYW5kIHRoZSB1c2VyIHdobyBzZW50IHRoaXMgZGF0YSBoYXNuJ3QgYmVlbiBnaXZlbiB0aGUgaW5pdGlhbCBnYW1lXHJcbiAgICAvLyBzdGF0ZSwgdGhlbiBicm9hZGNhc3QgaXQgdG8gdGhlbVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0gJiYgIXRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0uaGFzQmVlbkluaXRpYWxpemVkICYmIHRoaXMuaG9zdFBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW2RhdGEucGVlcklkXS5oYXNCZWVuSW5pdGlhbGl6ZWQgPSB0cnVlO1xyXG4gICAgICAvLyBub3Qgc3VyZSBpZiB3ZSBzaG91bGQgZG8gdGhpcyBvciBub3QsIGJ1dCBhdCBsZWFzdCBpdCByZXNldHMgdGhlIGdhbWVcclxuICAgICAgLy8gc3RhdGUgdG8gd2hhdCB3ZSwgdGhlIGhvc3QsIHRoaW5rIGl0IGlzXHJcbiAgICAgIGJyb2FkY2FzdEdhbWVTdGF0ZVRvQWxsUGVlcnMuY2FsbCh0aGlzKTtcclxuICAgICAgLy8gaWYgbm90IHRoYXQsIHRoZW4gd2Ugc2hvdWxkIGp1c3QgYnJvYWRjYXN0IHRvIHRoZSBuZXcgZ3V5IGxpa2UgdGhpczpcclxuICAgICAgLy8gYnJvYWRjYXN0R2FtZVN0YXRlKGRhdGEucGVlcklkKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdKSB7XHJcbiAgICAgIHRoaXMub3RoZXJVc2Vyc1tkYXRhLnBlZXJJZF0ubGFzdFVwZGF0ZVRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGRhdGEuZXZlbnQpIHtcclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ3VwZGF0ZV9nYW1lX3N0YXRlJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IHVwZGF0ZSBnYW1lIHN0YXRlJyk7XHJcbiAgICAgIC8vIHdlIG9ubHkgd2FudCB0byByZWNlbnRlciB0aGUgbWFwIGluIHRoZSBjYXNlIHRoYXQgdGhpcyBpcyBhIG5ldyB1c2VyXHJcbiAgICAgIC8vIGpvaW5pbmcgZm9yIHRoZSBmaXJzdCB0aW1lLCBhbmQgdGhlIHdheSB0byB0ZWxsIHRoYXQgaXMgdG8gc2VlIGlmIHRoZVxyXG4gICAgICAvLyBpbml0aWFsIGxvY2F0aW9uIGhhcyBjaGFuZ2VkLiAgT25jZSB0aGUgdXNlciBpcyBhbHJlYWR5IGpvaW5lZCwgaWYgYVxyXG4gICAgICAvLyBsb2NhdGlvbiBjaGFuZ2UgaXMgaW5pdGlhdGVkLCB0aGF0IHdpbGwgdXNlIHRoZSAnbmV3X2xvY2F0aW9uJyBldmVudCBcclxuICAgICAgaWYgKHBhcnNlRmxvYXQoZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0KSAhPSBwYXJzZUZsb2F0KHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxhdCkgfHxcclxuICAgICAgICBwYXJzZUZsb2F0KGRhdGEuZXZlbnQuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uLmxuZykgIT0gcGFyc2VGbG9hdCh0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpKSB7XHJcbiAgICAgICAgdGhpcy5tYXAuc2V0Q2VudGVyKG5ldyBnb29nbGUubWFwcy5MYXRMbmcoXHJcbiAgICAgICAgICBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sYXQsXHJcbiAgICAgICAgICBkYXRhLmV2ZW50LmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpKTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0ID0gZGF0YS5ldmVudC5nYW1lRGF0YU9iamVjdDtcclxuICAgICAgLy8gbmVlZCB0byBtYWtlIHRoaXMgY2FsbCBiZWNhdXNlIHdlIGNhbiBiZSBpbiBhIHNpdHVhdGlvbiB3aGVyZSB0aGUgaG9zdFxyXG4gICAgICAvLyBkb2Vzbid0IGtub3cgb3VyIHVzZXJuYW1lIHlldCwgc28gd2UgbmVlZCB0byBtYW51YWxseSBzZXQgaXQgaW4gb3VyXHJcbiAgICAgIC8vIG93biBVSSBmaXJzdC5cclxuICAgICAgdXBkYXRlVXNlcm5hbWUuY2FsbCh0aGlzLCB0aGlzLnBlZXIuaWQsIHRoaXMudXNlcm5hbWUpO1xyXG4gICAgICB1cGRhdGVVSVdpdGhOZXdHYW1lU3RhdGUuY2FsbCh0aGlzKTtcclxuICAgICAgYXNzaWduTXlUZWFtQmFzZS5jYWxsKHRoaXMpO1xyXG4gICAgICB1cGRhdGVDYXJJY29ucy5jYWxsKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnbmV3X2xvY2F0aW9uJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IG5ldyBsb2NhdGlvbiAnICsgZGF0YS5ldmVudC5sYXQgKyAnLCcgKyBkYXRhLmV2ZW50LmxuZyk7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50Lm9yaWdpbmF0aW5nX3BlZXJfaWQgIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgb3RoZXJVc2VyQ2hhbmdlZExvY2F0aW9uLmNhbGwodGhpcywgZGF0YS5ldmVudC5sYXQsIGRhdGEuZXZlbnQubG5nKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChkYXRhLmV2ZW50Lm5hbWUgPT0gJ2l0ZW1fY29sbGVjdGVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gY29sbGVjdGVkIGJ5ICcgKyBkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSk7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnVzZXJfaWRfb2ZfY2FyX3dpdGhfaXRlbSAhPSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtLmNhbGwodGhpcywgZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl93aXRoX2l0ZW0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICduZXdfaXRlbScpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBuZXcgaXRlbSBhdCAnICtcclxuICAgICAgICBkYXRhLmV2ZW50LmxvY2F0aW9uLmxhdCArICcsJyArIGRhdGEuZXZlbnQubG9jYXRpb24ubG5nICtcclxuICAgICAgICAnIHdpdGggaWQgJyArIGRhdGEuZXZlbnQuaWQpO1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gICAgICAvLyBPbmx5IHVwZGF0ZSBpZiBzb21lb25lIGVsc2UgY2F1c2VkIHRoZSBuZXcgaXRlbSBwbGFjZW1lbnQuXHJcbiAgICAgIC8vIGlmIHRoaXMgdXNlciBkaWQgaXQsIGl0IHdhcyBhbHJlYWR5IHBsYWNlZFxyXG4gICAgICBpZiAoZGF0YS5ldmVudC5ob3N0X3VzZXIgJiYgZGF0YS5ldmVudC5ob3N0X3VzZXIgIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgdmFyIGl0ZW1Mb2NhdGlvbiA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoZGF0YS5ldmVudC5sb2NhdGlvbi5sYXQsIGRhdGEuZXZlbnQubG9jYXRpb24ubG5nKTtcclxuICAgICAgICBwdXROZXdJdGVtT25NYXAuY2FsbCh0aGlzLCBpdGVtTG9jYXRpb24sIGRhdGEuZXZlbnQuaWQpO1xyXG4gICAgICB9XHJcblxyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEuZXZlbnQubmFtZSA9PSAnaXRlbV9yZXR1cm5lZCcpIHtcclxuICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIGV2ZW50OiBpdGVtIHJldHVybmVkIGJ5IHVzZXIgJyArIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtICsgJyB3aGljaCBnaXZlcyB0aGVtICcgKyBkYXRhLmV2ZW50Lm5vd19udW1faXRlbXMpO1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSBudWxsO1xyXG4gICAgICBpZiAoZGF0YS5ldmVudC51c2VyX2lkX29mX2Nhcl90aGF0X3JldHVybmVkX2l0ZW0gIT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICAgICAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gICAgICAgIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VUcmFuc3BhcmVudEljb24pO1xyXG4gICAgICAgIG90aGVyVXNlclJldHVybmVkSXRlbS5jYWxsKHRoaXMsIGRhdGEuZXZlbnQudXNlcl9pZF9vZl9jYXJfdGhhdF9yZXR1cm5lZF9pdGVtLCBkYXRhLmV2ZW50Lm5vd19udW1faXRlbXMpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoZGF0YS5ldmVudC5uYW1lID09ICdpdGVtX3RyYW5zZmVycmVkJykge1xyXG4gICAgICBjb25zb2xlLmxvZygncmVjZWl2ZWQgZXZlbnQ6IGl0ZW0gJyArIGRhdGEuZXZlbnQuaWQgKyAnIHRyYW5zZmVycmVkIGJ5IHVzZXIgJyArIGRhdGEuZXZlbnQuZnJvbVVzZXJQZWVySWQgKyAnIHRvIHVzZXIgJyArIGRhdGEuZXZlbnQudG9Vc2VyUGVlcklkKTtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gZGF0YS5ldmVudC50b1VzZXJQZWVySWQ7XHJcbiAgICAgIGlmIChkYXRhLmV2ZW50LnRvVXNlclBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgICAvLyB0aGUgaXRlbSB3YXMgdHJhbnNmZXJyZWQgdG8gdGhpcyB1c2VyXHJcbiAgICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0ID0ge1xyXG4gICAgICAgICAgaWQ6IGRhdGEuZXZlbnQuaWQsXHJcbiAgICAgICAgICBsb2NhdGlvbjogbnVsbFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzb21lb25lIHRyYW5zZmVycmVkIGF0ICcgKyB0aGlzLnRpbWVPZkxhc3RUcmFuc2Zlcik7XHJcbiAgICAgICAgdXNlckNvbGxpZGVkV2l0aEl0ZW0uY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNldCB0aGUgYXJyb3cgdG8gcG9pbnQgdG8gdGhlIG5ldyB1c2VyIHdobyBoYXMgdGhlIGl0ZW1cclxuICAgICAgICB0aGlzLmRlc3RpbmF0aW9uID0gdGhpcy5vdGhlclVzZXJzW2RhdGEuZXZlbnQudG9Vc2VyUGVlcklkXS5jYXIubG9jYXRpb247XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGlmIHRoZSB1c2VyIHNlbnQgYSB1c2VybmFtZSB0aGF0IHdlIGhhdmVuJ3Qgc2VlbiB5ZXQsIHNldCBpdFxyXG4gIGlmIChkYXRhLnBlZXJJZCAmJiBkYXRhLnVzZXJuYW1lICYmICF0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLnVzZXJuYW1lKSB7XHJcbiAgICB1cGRhdGVVc2VybmFtZS5jYWxsKHRoaXMsIGRhdGEucGVlcklkLCBkYXRhLnVzZXJuYW1lKTtcclxuICB9XHJcblxyXG4gIGlmIChkYXRhLnBlZXJJZCAmJiBkYXRhLmNhckxhdExuZyAmJiB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdKSB7XHJcbiAgICBtb3ZlT3RoZXJDYXIuY2FsbCh0aGlzLCB0aGlzLm90aGVyVXNlcnNbZGF0YS5wZWVySWRdLCBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGRhdGEuY2FyTGF0TG5nLmxhdCwgZGF0YS5jYXJMYXRMbmcubG5nKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBhc3NpZ25NeVRlYW1CYXNlKCkge1xyXG4gIGlmICh1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSkge1xyXG4gICAgdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0ID0gdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3Q7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdCA9IHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdDtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVzZXJuYW1lKHBlZXJJZCwgdXNlcm5hbWUpIHtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtVG93bk9iamVjdC51c2Vyc1tpXS51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBqID0gMDsgaiA8IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbal0ucGVlcklkID09IHBlZXJJZCkge1xyXG4gICAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1DcnVzaE9iamVjdC51c2Vyc1tqXS51c2VybmFtZSA9IHVzZXJuYW1lO1xyXG4gICAgfVxyXG4gIH1cclxuICB1cGRhdGVVc2VybmFtZXNJblVJLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJV2l0aE5ld0dhbWVTdGF0ZSgpIHtcclxuICAvLyByZWNlbnRlciB0aGUgbWFwXHJcbiAgY29uc29sZS5sb2coJ25ldyBsb2NhdGlvbiByZWNlaXZlZDogJyArIHRoaXMuZ2FtZURhdGFPYmplY3QuaW5pdGlhbExvY2F0aW9uKTtcclxuICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcodGhpcy5nYW1lRGF0YU9iamVjdC5pbml0aWFsTG9jYXRpb24ubGF0LCB0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbi5sbmcpO1xyXG4gIHVwZGF0ZUJhc2VMb2NhdGlvbnNJblVJLmNhbGwodGhpcyk7XHJcbiAgdXBkYXRlVXNlcm5hbWVzSW5VSS5jYWxsKHRoaXMpO1xyXG4gIC8vIGlmIHNvbWVvbmUgaGFzIHRoZSBpdGVtXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSkge1xyXG4gICAgdGhpcy5pdGVtTWFwT2JqZWN0Lm1hcmtlci5zZXRNYXAobnVsbCk7XHJcbiAgICAvLyBpZiBJIGhhdmUgdGhlIGl0ZW0sIG1ha2UgdGhlIGRlc3RpbmF0aW9uIG15IHRlYW0ncyBiYXNlXHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93X2JsdWUucG5nJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBhbm90aGVyIHVzZXIgaGFzIHRoZSBpdGVtLCBidXQgdGhlIHNldERlc3RpbmF0aW9uIGNhbGxcclxuICAgICAgLy8gd2lsbCBiZSB0YWtlbiBjYXJlIG9mIHdoZW4gdGhlIHVzZXIgc2VuZHMgdGhlaXIgbG9jYXRpb24gZGF0YVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBpZiBub2JvZHkgaGFzIHRoZSBpdGVtLCBwdXQgaXQgb24gdGhlIG1hcCBpbiB0aGUgcmlnaHQgcGxhY2UsXHJcbiAgICAvLyBhbmQgc2V0IHRoZSBuZXcgaXRlbSBsb2NhdGlvbiBhcyB0aGUgZGVzdGluYXRpb25cclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QgJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgIG1vdmVJdGVtT25NYXAuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubGF0LCB0aGlzLmdhbWVEYXRhT2JqZWN0Lml0ZW1PYmplY3QubG9jYXRpb24ubG5nKTtcclxuICAgIH1cclxuICAgIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgdGhpcy5pdGVtTWFwT2JqZWN0LmxvY2F0aW9uLCAnYXJyb3cucG5nJyk7XHJcbiAgfVxyXG4gIHVwZGF0ZVNjb3Jlc0luVUkuY2FsbCh0aGlzLCB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGFzc2lnbk15VGVhbUluVUkuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQmFzZUxvY2F0aW9uc0luVUkoKSB7XHJcbiAgY3JlYXRlVGVhbVRvd25CYXNlTWFwT2JqZWN0LmNhbGwodGhpcyxcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sYXQsXHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlTWFwT2JqZWN0LmNhbGwodGhpcyxcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LmJhc2VPYmplY3QubG9jYXRpb24ubGF0LFxyXG4gICAgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QuYmFzZU9iamVjdC5sb2NhdGlvbi5sbmcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVDYXJJY29ucygpIHtcclxuICB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucy5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMsIHRoaXMudGVhbVRvd25PdGhlckNhckljb24pO1xyXG4gIHVwZGF0ZVRlYW1Vc2Vyc0Nhckljb25zLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnMsIHRoaXMudGVhbUNydXNoT3RoZXJDYXJJY29uKTtcclxuICB1cGRhdGVNeUNhckljb24uY2FsbCh0aGlzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlTXlDYXJJY29uKCkge1xyXG4gIHZhciB1c2VyQ2FySW1nU3JjID0gJ2ltYWdlcy9jcnVzaF9jYXIucG5nJztcclxuICBpZiAodXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIHRoaXMucGVlci5pZCkpIHtcclxuICAgIHVzZXJDYXJJbWdTcmMgPSAnaW1hZ2VzL2Nhci5wbmcnO1xyXG4gIH1cclxuICAkKCcjY2FyLWltZycpLmF0dHIoJ3NyYycsIHVzZXJDYXJJbWdTcmMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVUZWFtVXNlcnNDYXJJY29ucyh0ZWFtVXNlcnMsIHRlYW1DYXJJY29uKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0ZWFtVXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIC8vIHJlbW92ZSBhbnkgZXhpc3RpbmcgbWFya2VyXHJcbiAgICBpZiAodGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdICYmIHRoaXMub3RoZXJVc2Vyc1t0ZWFtVXNlcnNbaV0ucGVlcklkXS5jYXIgJiYgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3RlYW1Vc2Vyc1tpXS5wZWVySWRdLmNhci5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0ZWFtVXNlcnNbaV0ucGVlcklkICE9IHRoaXMucGVlci5pZCkge1xyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdGVhbVVzZXJzW2ldLnBlZXJJZF0uY2FyLm1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICAgIG1hcDogdGhpcy5tYXAsXHJcbiAgICAgICAgdGl0bGU6IHRlYW1Vc2Vyc1tpXS5wZWVySWQsXHJcbiAgICAgICAgaWNvbjogdGVhbUNhckljb25cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlU2NvcmVzSW5VSSh0ZWFtVG93bk51bUl0ZW1zUmV0dXJuZWQsIHRlYW1DcnVzaE51bUl0ZW1zUmV0dXJuZWQpIHtcclxuICAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpLnRleHQodGVhbVRvd25OdW1JdGVtc1JldHVybmVkKTtcclxuICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tdG93bicpKTtcclxuICAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKS50ZXh0KHRlYW1DcnVzaE51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gIGZsYXNoRWxlbWVudC5jYWxsKHRoaXMsICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZUl0ZW1Pbk1hcChsYXQsIGxuZykge1xyXG4gIGNvbnNvbGUubG9nKCdtb3ZpbmcgaXRlbSB0byBuZXcgbG9jYXRpb246ICcgKyBsYXQgKyAnLCcgKyBsbmcpO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5sb2NhdGlvbi5sYXQgPSBsYXQ7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0LmxvY2F0aW9uLmxuZyA9IGxuZztcclxuICB0aGlzLml0ZW1NYXBPYmplY3QubG9jYXRpb24gPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKGxhdCwgbG5nKTtcclxuICB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyLnNldFBvc2l0aW9uKHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG90aGVyVXNlclJldHVybmVkSXRlbShvdGhlclVzZXJQZWVySWQsIG5vd051bUl0ZW1zRm9yVXNlcikge1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgaW5jcmVtZW50SXRlbUNvdW50LmNhbGwodGhpcywgdXNlcklzT25Ub3duVGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlclBlZXJJZCkpXHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsICdhcnJvdy5wbmcnKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZU90aGVyQ2FyKG90aGVyVXNlck9iamVjdCwgbmV3TG9jYXRpb24pIHtcclxuICBpZiAoIW90aGVyVXNlck9iamVjdC5jYXIpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIG90aGVyVXNlck9iamVjdC5jYXIubG9jYXRpb24gPSBuZXdMb2NhdGlvbjtcclxuICBpZiAoIW90aGVyVXNlck9iamVjdC5jYXIubWFya2VyKSB7XHJcbiAgICB1cGRhdGVDYXJJY29ucy5jYWxsKHRoaXMpO1xyXG4gIH1cclxuICAvLyBpZiB0aGUgb3RoZXIgY2FyIGhhcyBhbiBpdGVtLCB1cGRhdGUgdGhlIGRlc3RpbmF0aW9uXHJcbiAgLy8gdG8gYmUgaXRcclxuICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID09IG90aGVyVXNlck9iamVjdC5wZWVySWQpIHtcclxuICAgIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICAgIGlmICh1c2VySXNPbk15VGVhbS5jYWxsKHRoaXMsIG90aGVyVXNlck9iamVjdC5wZWVySWQpKSB7XHJcbiAgICAgIGFycm93SW1nID0gJ2Fycm93X2dyZWVuX2JsdWUucG5nJztcclxuICAgIH1cclxuICAgIHNldERlc3RpbmF0aW9uLmNhbGwodGhpcywgbmV3TG9jYXRpb24sIGFycm93SW1nKTtcclxuICB9XHJcbiAgdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkLmNhbGwodGhpcywgb3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbiwgb3RoZXJVc2VyT2JqZWN0LnBlZXJJZCk7XHJcbiAgb3RoZXJVc2VyT2JqZWN0LmNhci5tYXJrZXIuc2V0UG9zaXRpb24ob3RoZXJVc2VyT2JqZWN0LmNhci5sb2NhdGlvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uTXlUZWFtKG90aGVyVXNlclBlZXJJZCkge1xyXG4gIHZhciBteVRlYW0gPSBudWxsO1xyXG4gIHZhciBvdGhlclVzZXJUZWFtID0gbnVsbDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgbXlUZWFtID0gJ3Rvd24nO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnNbaV0ucGVlcklkID09IG90aGVyVXNlclBlZXJJZCkge1xyXG4gICAgICBvdGhlclVzZXJUZWFtID0gJ3Rvd24nO1xyXG4gICAgfVxyXG4gIH1cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBpZiAodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QudXNlcnNbaV0ucGVlcklkID09IHRoaXMucGVlci5pZCkge1xyXG4gICAgICBteVRlYW0gPSAnY3J1c2gnO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBvdGhlclVzZXJQZWVySWQpIHtcclxuICAgICAgb3RoZXJVc2VyVGVhbSA9ICdjcnVzaCc7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBteVRlYW0gPT0gb3RoZXJVc2VyVGVhbTtcclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNmZXJJdGVtSWZDYXJzSGF2ZUNvbGxpZGVkKG90aGVyQ2FyTG9jYXRpb24sIG90aGVyVXNlclBlZXJJZCkge1xyXG4gIC8vIGlmIHdlIGRvbid0IGtub3cgdGhlIG90aGVyIGNhcidzIGxvY2F0aW9uLCBvciBpZiB0aGlzIGlzbid0IHRoZSB1c2VyIHdpdGhcclxuICAvLyAgdGhlIGl0ZW0sIHRoZW4gaWdub3JlIGl0LiBXZSdsbCBvbmx5IHRyYW5zZmVyIGFuIGl0ZW0gZnJvbSB0aGUgcGVyc3BlY3RlZFxyXG4gIC8vICBvZiB0aGUgdXNlciB3aXRoIHRoZSBpdGVtXHJcbiAgaWYgKCFvdGhlckNhckxvY2F0aW9uIHx8ICF0aGlzLmNvbGxlY3RlZEl0ZW0pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgaWYgKHRoaXMudGltZU9mTGFzdFRyYW5zZmVyKSB7XHJcbiAgICB2YXIgdGltZVNpbmNlTGFzdFRyYW5zZmVyID0gKChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkpIC0gdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXI7XHJcbiAgICAvLyBpZiBub3QgZW5vdWdoIHRpbWUgaGFzIHBhc3NlZCBzaW5jZSB0aGUgbGFzdCB0cmFuc2ZlciwgcmV0dXJuXHJcbiAgICBpZiAodGltZVNpbmNlTGFzdFRyYW5zZmVyIDwgdGhpcy50aW1lRGVsYXlCZXR3ZWVuVHJhbnNmZXJzKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIG9wdGltaXphdGlvbjogcmVzZXQgdGhpcyBzbyB3ZSBkb24ndCB3YXN0ZSB0aW1lIGNhbGN1bGF0aW5nIGluIHRoZSBmdXR1cmVcclxuICAgICAgdGhpcy50aW1lT2ZMYXN0VHJhbnNmZXIgPSBudWxsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGRpc3RhbmNlID0gZ29vZ2xlLm1hcHMuZ2VvbWV0cnkuc3BoZXJpY2FsLmNvbXB1dGVEaXN0YW5jZUJldHdlZW4odGhpcy5tYXBDZW50ZXIsIG90aGVyQ2FyTG9jYXRpb24pO1xyXG4gIC8vIGlmIHRoaXMgdXNlciAodGhhdCBoYXMgdGhlIGl0ZW0pIGlzIGNsb3NlIGVub3VnaCB0byBjYWxsIGl0IGFcclxuICAvLyBjb2xsaXNpb24sIHRyYW5zZmVyIGl0IHRvIHRoZSBvdGhlciB1c2VyXHJcbiAgaWYgKGRpc3RhbmNlIDwgMjApIHtcclxuICAgIHRyYW5zZmVySXRlbS5jYWxsKHRoaXMsIHRoaXMuY29sbGVjdGVkSXRlbS5pZCwgdGhpcy5wZWVyLmlkLCBvdGhlclVzZXJQZWVySWQpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gdHJhbnNmZXJJdGVtKGl0ZW1PYmplY3RJZCwgZnJvbVVzZXJQZWVySWQsIHRvVXNlclBlZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdpdGVtICcgKyBpdGVtT2JqZWN0SWQgKyAnIHRyYW5zZmVycmVkIGZyb20gJyArIGZyb21Vc2VyUGVlcklkICsgJyB0byAnICsgdG9Vc2VyUGVlcklkKTtcclxuICB0aGlzLnRpbWVPZkxhc3RUcmFuc2ZlciA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgYnJvYWRjYXN0VHJhbnNmZXJPZkl0ZW0uY2FsbCh0aGlzLCBpdGVtT2JqZWN0SWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQsIHRoaXMudGltZU9mTGFzdFRyYW5zZmVyKTtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHRvVXNlclBlZXJJZDtcclxuICB2YXIgYXJyb3dJbWcgPSAnYXJyb3dfcmVkLnBuZyc7XHJcbiAgaWYgKHVzZXJJc09uTXlUZWFtLmNhbGwodGhpcywgdG9Vc2VyUGVlcklkKSkge1xyXG4gICAgYXJyb3dJbWcgPSAnYXJyb3dfZ3JlZW5fYmx1ZS5wbmcnO1xyXG4gIH1cclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMub3RoZXJVc2Vyc1t0b1VzZXJQZWVySWRdLmNhci5sb2NhdGlvbiwgYXJyb3dJbWcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBvdGhlclVzZXJDb2xsZWN0ZWRJdGVtKHVzZXJJZCkge1xyXG4gIGNvbnNvbGUubG9nKCdvdGhlciB1c2VyIGNvbGxlY3RlZCBpdGVtJyk7XHJcbiAgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtID0gdXNlcklkO1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIHZhciBhcnJvd0ltZyA9ICdhcnJvd19yZWQucG5nJztcclxuICBpZiAodXNlcklzT25NeVRlYW0uY2FsbCh0aGlzLCB1c2VySWQpKSB7XHJcbiAgICBhcnJvd0ltZyA9ICdhcnJvd19ncmVlbl9ibHVlLnBuZyc7XHJcbiAgfVxyXG4gIGZhZGVBcnJvd1RvSW1hZ2UuY2FsbCh0aGlzLCBhcnJvd0ltZyk7XHJcbiAgdGhpcy50ZWFtVG93bkJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtVG93bkJhc2VJY29uKTtcclxuICB0aGlzLnRlYW1DcnVzaEJhc2VNYXBPYmplY3QubWFya2VyLnNldEljb24odGhpcy50ZWFtQ3J1c2hCYXNlSWNvbik7XHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiB1c2VyUmV0dXJuZWRJdGVtVG9CYXNlKCkge1xyXG4gIGNvbnNvbGUubG9nKCd1c2VyIHJldHVybmVkIGl0ZW0gdG8gYmFzZScpO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IG51bGw7XHJcbiAgZmFkZUFycm93VG9JbWFnZS5jYWxsKHRoaXMsICdhcnJvdy5wbmcnKTtcclxuICBpbmNyZW1lbnRJdGVtQ291bnQuY2FsbCh0aGlzLCB1c2VySXNPblRvd25UZWFtLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKSk7XHJcbiAgdGhpcy5jb2xsZWN0ZWRJdGVtID0gbnVsbDtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbiAgdGhpcy50ZWFtQ3J1c2hCYXNlTWFwT2JqZWN0Lm1hcmtlci5zZXRJY29uKHRoaXMudGVhbUNydXNoQmFzZVRyYW5zcGFyZW50SWNvbik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJJc09uVG93blRlYW0ocGVlcklkKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QudXNlcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgIGlmICh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0LnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbmNyZW1lbnRJdGVtQ291bnQoaXNUZWFtVG93bikge1xyXG4gIGlmIChpc1RlYW1Ub3duKSB7XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQrKztcclxuICAgICQoJyNudW0taXRlbXMtdGVhbS10b3duJykudGV4dCh0aGlzLmdhbWVEYXRhT2JqZWN0LnRlYW1Ub3duT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQpO1xyXG4gICAgZmxhc2hFbGVtZW50LmNhbGwodGhpcywgJCgnI251bS1pdGVtcy10ZWFtLXRvd24nKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbUNydXNoT2JqZWN0Lm51bUl0ZW1zUmV0dXJuZWQrKztcclxuICAgICQoJyNudW0taXRlbXMtdGVhbS1jcnVzaCcpLnRleHQodGhpcy5nYW1lRGF0YU9iamVjdC50ZWFtQ3J1c2hPYmplY3QubnVtSXRlbXNSZXR1cm5lZCk7XHJcbiAgICBmbGFzaEVsZW1lbnQuY2FsbCh0aGlzLCAkKCcjbnVtLWl0ZW1zLXRlYW0tY3J1c2gnKSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmbGFzaEVsZW1lbnQoanF1ZXJ5RWxlbSkge1xyXG4gIGpxdWVyeUVsZW0uZmFkZUluKDEwMCkuZmFkZU91dCgxMDApLmZhZGVJbigxMDApLmZhZGVPdXQoMTAwKS5mYWRlSW4oMTAwKS5mYWRlT3V0KDEwMCkuZmFkZUluKDEwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVzZXJDb2xsaWRlZFdpdGhJdGVtKGNvbGxpc2lvbkl0ZW1PYmplY3QpIHtcclxuICB0aGlzLmNvbGxlY3RlZEl0ZW0gPSBjb2xsaXNpb25JdGVtT2JqZWN0O1xyXG4gIHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIuc2V0TWFwKG51bGwpO1xyXG4gIGNvbGxpc2lvbkl0ZW1PYmplY3QubG9jYXRpb24gPSBudWxsO1xyXG4gIHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9IHRoaXMucGVlci5pZDtcclxuICB0aGlzLnRlYW1Ub3duQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1Ub3duQmFzZUljb24pO1xyXG4gIHRoaXMudGVhbUNydXNoQmFzZU1hcE9iamVjdC5tYXJrZXIuc2V0SWNvbih0aGlzLnRlYW1DcnVzaEJhc2VJY29uKTtcclxuICBzZXREZXN0aW5hdGlvbi5jYWxsKHRoaXMsIHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbiwgJ2Fycm93X2JsdWUucG5nJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldERlc3RpbmF0aW9uKGxvY2F0aW9uLCBhcnJvd0ltYWdlTmFtZSkge1xyXG4gIHRoaXMuZGVzdGluYXRpb24gPSBsb2NhdGlvbjtcclxuICBmYWRlQXJyb3dUb0ltYWdlLmNhbGwodGhpcywgYXJyb3dJbWFnZU5hbWUpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGVDYXIoKSB7XHJcbiAgdGhpcy5yb3RhdGlvbiA9IGdldEFuZ2xlLmNhbGwodGhpcywgdGhpcy5zcGVlZCwgdGhpcy5ob3Jpem9udGFsU3BlZWQpO1xyXG4gIHRoaXMucm90YXRpb25Dc3MgPSAnLW1zLXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLnJvdGF0aW9uICsgJ2RlZyk7IC8qIElFIDkgKi8gLXdlYmtpdC10cmFuc2Zvcm06IHJvdGF0ZSgnICsgdGhpcy5yb3RhdGlvbiArICdkZWcpOyAvKiBDaHJvbWUsIFNhZmFyaSwgT3BlcmEgKi8gdHJhbnNmb3JtOiByb3RhdGUoJyArIHRoaXMucm90YXRpb24gKyAnZGVnKTsnO1xyXG59XHJcblxyXG5mdW5jdGlvbiByb3RhdGVBcnJvdygpIHtcclxuICB0aGlzLmFycm93Um90YXRpb24gPSBjb21wdXRlQmVhcmluZ0FuZ2xlLmNhbGwodGhpcywgdGhpcy5tYXBDZW50ZXIubGF0KCksIHRoaXMubWFwQ2VudGVyLmxuZygpLCB0aGlzLmRlc3RpbmF0aW9uLmxhdCgpLCB0aGlzLmRlc3RpbmF0aW9uLmxuZygpKTtcclxuICB0aGlzLmFycm93Um90YXRpb25Dc3MgPSAnLW1zLXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsgLyogSUUgOSAqLyAtd2Via2l0LXRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsgLyogQ2hyb21lLCBTYWZhcmksIE9wZXJhICovIHRyYW5zZm9ybTogcm90YXRlKCcgKyB0aGlzLmFycm93Um90YXRpb24gKyAnZGVnKTsnO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoc3RlcCkge1xyXG4gIG1vdmVDYXIuY2FsbCh0aGlzKTtcclxuXHJcbiAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QgJiYgdGhpcy5nYW1lRGF0YU9iamVjdC5wZWVySWRPZkNhcldpdGhJdGVtKSB7XHJcbiAgICAvLyBjaGVjayBmb3IgY29sbGlzaW9ucyBiZXR3ZWVuIG9uZSBjYXIgd2l0aCBhbiBpdGVtIGFuZCBvbmUgd2l0aG91dFxyXG4gICAgaWYgKHRoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbSA9PSB0aGlzLnBlZXIuaWQpIHtcclxuICAgICAgLy8gaWYgdGhpcyB1c2VyIGhhcyBhbiBpdGVtLCBjaGVjayB0byBzZWUgaWYgdGhleSBhcmUgY29sbGlkaW5nXHJcbiAgICAgIC8vIHdpdGggYW55IG90aGVyIHVzZXIsIGFuZCBpZiBzbywgdHJhbnNmZXIgdGhlIGl0ZW1cclxuICAgICAgZm9yICh2YXIgdXNlciBpbiB0aGlzLm90aGVyVXNlcnMpIHtcclxuICAgICAgICB0cmFuc2Zlckl0ZW1JZkNhcnNIYXZlQ29sbGlkZWQuY2FsbCh0aGlzLCB0aGlzLm90aGVyVXNlcnNbdXNlcl0uY2FyLmxvY2F0aW9uLCB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlcklkKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaWYgYW5vdGhlciB1c2VyIGhhcyBhbiBpdGVtLCBhbmQgdGhlaXIgY2FyIGhhcyBhIGxvY2F0aW9uLFxyXG4gICAgICAvLyB0aGVuIGNvbnN0YW50bHkgc2V0IHRoZSBkZXN0aW5hdGlvbiB0byB0aGVpciBsb2NhdGlvblxyXG4gICAgICBpZiAodGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0gJiYgdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0ubG9jYXRpb24gJiYgdGhpcy5vdGhlclVzZXJzW3RoaXMuZ2FtZURhdGFPYmplY3QucGVlcklkT2ZDYXJXaXRoSXRlbV0uY2FyLmxvY2F0aW9uKSB7XHJcbiAgICAgICAgdGhpcy5kZXN0aW5hdGlvbiA9IHRoaXMub3RoZXJVc2Vyc1t0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1dLmNhci5sb2NhdGlvbjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gY2hlY2sgaWYgdXNlciBjb2xsaWRlZCB3aXRoIGFuIGl0ZW0gb3IgdGhlIGJhc2VcclxuICB2YXIgY29sbGlzaW9uTWFya2VyID0gZ2V0Q29sbGlzaW9uTWFya2VyLmNhbGwodGhpcyk7XHJcbiAgaWYgKGNvbGxpc2lvbk1hcmtlcikge1xyXG4gICAgaWYgKCF0aGlzLmNvbGxlY3RlZEl0ZW0gJiYgY29sbGlzaW9uTWFya2VyID09IHRoaXMuaXRlbU1hcE9iamVjdC5tYXJrZXIpIHtcclxuICAgICAgLy8gdXNlciBqdXN0IHBpY2tlZCB1cCBhbiBpdGVtXHJcbiAgICAgIHVzZXJDb2xsaWRlZFdpdGhJdGVtLmNhbGwodGhpcywgdGhpcy5nYW1lRGF0YU9iamVjdC5pdGVtT2JqZWN0KTtcclxuICAgICAgYnJvYWRjYXN0SXRlbUNvbGxlY3RlZC5jYWxsKHRoaXMsIHRoaXMuZ2FtZURhdGFPYmplY3QuaXRlbU9iamVjdC5pZCk7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29sbGVjdGVkSXRlbSAmJiBjb2xsaXNpb25NYXJrZXIgPT0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcikge1xyXG4gICAgICAvLyB1c2VyIGhhcyBhbiBpdGVtIGFuZCBpcyBiYWNrIGF0IHRoZSBiYXNlXHJcbiAgICAgIHVzZXJSZXR1cm5lZEl0ZW1Ub0Jhc2UuY2FsbCh0aGlzKTtcclxuICAgICAgYnJvYWRjYXN0SXRlbVJldHVybmVkLmNhbGwodGhpcywgdGhpcy5wZWVyLmlkKTtcclxuICAgICAgcmFuZG9tbHlQdXRJdGVtcy5jYWxsKHRoaXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYnJvYWRjYXN0TXlDYXJMb2NhdGlvbi5jYWxsKHRoaXMpO1xyXG5cclxuICAvLyBpZiB0aGUgZ2FtZSBoYXMgc3RhcnRlZCBhbmQgd2UncmUgdGhlIGhvc3QsIGNoZWNrXHJcbiAgLy8gZm9yIGFueSBwZWVycyB3aG8gaGF2ZW4ndCBzZW50IGFuIHVwZGF0ZSBpbiB0b28gbG9uZ1xyXG4gIGlmICh0aGlzLmhvc3RQZWVySWQgJiYgdGhpcy5wZWVyICYmIHRoaXMucGVlci5pZCAmJiB0aGlzLmhvc3RQZWVySWQgPT0gdGhpcy5wZWVyLmlkKSB7XHJcbiAgICBjbGVhbnVwQW55RHJvcHBlZENvbm5lY3Rpb25zLmNhbGwodGhpcyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaG91bGRLZWVwQWxpdmUoKSB7XHJcbiAgcmV0dXJuIHRoaXMucXMudmFsdWUodGhpcy5rZWVwQWxpdmVQYXJhbU5hbWUpID09ICd0cnVlJztcclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cEFueURyb3BwZWRDb25uZWN0aW9ucygpIHtcclxuICBpZiAoc2hvdWxkS2VlcEFsaXZlLmNhbGwodGhpcykpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB0aW1lTm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgLy8gaWYgaXQncyBiZWVuIGxvbmdlciB0aGFuIHRoZSB0aW1lb3V0IHNpbmNlIHdlJ3ZlIGhlYXJkIGZyb21cclxuICAgIC8vIHRoaXMgdXNlciwgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgZ2FtZVxyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5sYXN0VXBkYXRlVGltZSAmJiAodGltZU5vdyAtIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5sYXN0VXBkYXRlVGltZSA+IHRoaXMuQUNUSVZFX0NPTk5FQ1RJT05fVElNRU9VVF9JTl9TRUNPTkRTKSkge1xyXG4gICAgICBjbG9zZVBlZXJKc0Nvbm5lY3Rpb24uY2FsbCh0aGlzLCB1c2VyKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsb3NlUGVlckpzQ29ubmVjdGlvbihvdGhlclVzZXJQZWVySWQpIHtcclxuICBpZiAodGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gJiYgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbikge1xyXG4gICAgdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0ucGVlckpzQ29ubmVjdGlvbi5jbG9zZSgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVuZGVyKGR0KSB7XHJcbiAgJChcIiNjYXItaW1nXCIpLmF0dHIoXCJzdHlsZVwiLCB0aGlzLnJvdGF0aW9uQ3NzKTtcclxuICAkKFwiI2Fycm93LWltZ1wiKS5hdHRyKFwic3R5bGVcIiwgdGhpcy5hcnJvd1JvdGF0aW9uQ3NzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0TXlDYXJMb2NhdGlvbigpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4gJiYgdGhpcy5tYXBDZW50ZXIpIHtcclxuICAgICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgICAgY2FyTGF0TG5nOiB7XHJcbiAgICAgICAgICBsYXQ6IHRoaXMubWFwQ2VudGVyLmxhdCgpLFxyXG4gICAgICAgICAgbG5nOiB0aGlzLm1hcENlbnRlci5sbmcoKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcGVlcklkOiB0aGlzLnBlZXIuaWQsXHJcbiAgICAgICAgdXNlcm5hbWU6IHRoaXMudXNlcm5hbWVcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RHYW1lU3RhdGUob3RoZXJVc2VyUGVlcklkKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBnYW1lIHN0YXRlIHRvICcgKyBvdGhlclVzZXJQZWVySWQpO1xyXG4gIGlmICghdGhpcy5vdGhlclVzZXJzW290aGVyVXNlclBlZXJJZF0gfHwgIXRoaXMub3RoZXJVc2Vyc1tvdGhlclVzZXJQZWVySWRdLnBlZXJKc0Nvbm5lY3Rpb24pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHZhciB1cGRhdGVHYW1lU3RhdGVFdmVudE9iamVjdCA9IHtcclxuICAgIGV2ZW50OiB7XHJcbiAgICAgIG5hbWU6ICd1cGRhdGVfZ2FtZV9zdGF0ZScsXHJcbiAgICAgIGdhbWVEYXRhT2JqZWN0OiB0aGlzLmdhbWVEYXRhT2JqZWN0XHJcbiAgICB9XHJcbiAgfTtcclxuICB0aGlzLm90aGVyVXNlcnNbb3RoZXJVc2VyUGVlcklkXS5wZWVySnNDb25uZWN0aW9uLnNlbmQodXBkYXRlR2FtZVN0YXRlRXZlbnRPYmplY3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3ROZXdJdGVtKGxvY2F0aW9uLCBpdGVtSWQpIHtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uICYmIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgdmFyIHNpbXBsZUl0ZW1MYXRMbmcgPSB7XHJcbiAgICAgICAgbGF0OiBsb2NhdGlvbi5sYXQoKSxcclxuICAgICAgICBsbmc6IGxvY2F0aW9uLmxuZygpXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgICBldmVudDoge1xyXG4gICAgICAgICAgbmFtZTogJ25ld19pdGVtJyxcclxuICAgICAgICAgIGhvc3RfdXNlcjogdGhpcy5wZWVyLmlkLFxyXG4gICAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgICAgbGF0OiBzaW1wbGVJdGVtTGF0TG5nLmxhdCxcclxuICAgICAgICAgICAgbG5nOiBzaW1wbGVJdGVtTGF0TG5nLmxuZ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGlkOiBpdGVtSWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gYnJvYWRjYXN0SXRlbVJldHVybmVkKCkge1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gcmV0dXJuZWQnKTtcclxuICAgIGlmICghdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24gfHwgIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLm9wZW4pIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24uc2VuZCh7XHJcbiAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgbmFtZTogJ2l0ZW1fcmV0dXJuZWQnLFxyXG4gICAgICAgIHVzZXJfaWRfb2ZfY2FyX3RoYXRfcmV0dXJuZWRfaXRlbTogdGhpcy5wZWVyLmlkLFxyXG4gICAgICAgIG5vd19udW1faXRlbXM6IHRoaXMuZ2FtZURhdGFPYmplY3QudGVhbVRvd25PYmplY3QubnVtSXRlbXNSZXR1cm5lZCxcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RJdGVtQ29sbGVjdGVkKGl0ZW1JZCkge1xyXG4gIGNvbnNvbGUubG9nKCdicm9hZGNhc3RpbmcgaXRlbSBpZCAnICsgaXRlbUlkICsgJyBjb2xsZWN0ZWQgYnkgdXNlciAnICsgdGhpcy5wZWVyLmlkKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW0gPSB0aGlzLnBlZXIuaWQ7XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnaXRlbV9jb2xsZWN0ZWQnLFxyXG4gICAgICAgIGlkOiBpdGVtSWQsXHJcbiAgICAgICAgdXNlcl9pZF9vZl9jYXJfd2l0aF9pdGVtOiB0aGlzLmdhbWVEYXRhT2JqZWN0LnBlZXJJZE9mQ2FyV2l0aEl0ZW1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBicm9hZGNhc3RUcmFuc2Zlck9mSXRlbShpdGVtSWQsIGZyb21Vc2VyUGVlcklkLCB0b1VzZXJQZWVySWQpIHtcclxuICBjb25zb2xlLmxvZygnYnJvYWRjYXN0aW5nIGl0ZW0gdHJhbnNmZXJyZWQgJyArIGl0ZW1JZCArICcgZnJvbSAnICsgZnJvbVVzZXJQZWVySWQgKyAnIHRvICcgKyB0b1VzZXJQZWVySWQpO1xyXG4gIGZvciAodmFyIHVzZXIgaW4gdGhpcy5vdGhlclVzZXJzKSB7XHJcbiAgICBpZiAoIXRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uIHx8ICF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5vcGVuKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHRoaXMub3RoZXJVc2Vyc1t1c2VyXS5wZWVySnNDb25uZWN0aW9uLnNlbmQoe1xyXG4gICAgICBldmVudDoge1xyXG4gICAgICAgIG5hbWU6ICdpdGVtX3RyYW5zZmVycmVkJyxcclxuICAgICAgICBpZDogaXRlbUlkLFxyXG4gICAgICAgIGZyb21Vc2VyUGVlcklkOiBmcm9tVXNlclBlZXJJZCxcclxuICAgICAgICB0b1VzZXJQZWVySWQ6IHRvVXNlclBlZXJJZFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGJyb2FkY2FzdE5ld0xvY2F0aW9uKGxvY2F0aW9uKSB7XHJcbiAgY29uc29sZS5sb2coJ2Jyb2FkY2FzdGluZyBuZXcgbG9jYXRpb246ICcgKyBsb2NhdGlvbi5sYXQoKSArICcsJyArIGxvY2F0aW9uLmxuZygpKTtcclxuICBmb3IgKHZhciB1c2VyIGluIHRoaXMub3RoZXJVc2Vycykge1xyXG4gICAgaWYgKCF0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbiB8fCAhdGhpcy5vdGhlclVzZXJzW3VzZXJdLnBlZXJKc0Nvbm5lY3Rpb24ub3Blbikge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB0aGlzLm90aGVyVXNlcnNbdXNlcl0ucGVlckpzQ29ubmVjdGlvbi5zZW5kKHtcclxuICAgICAgZXZlbnQ6IHtcclxuICAgICAgICBuYW1lOiAnbmV3X2xvY2F0aW9uJyxcclxuICAgICAgICBsYXQ6IGxvY2F0aW9uLmxhdCgpLFxyXG4gICAgICAgIGxuZzogbG9jYXRpb24ubG5nKCksXHJcbiAgICAgICAgb3JpZ2luYXRpbmdfcGVlcl9pZDogdGhpcy5wZWVyLmlkXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuLy8gY2hlY2tzIHRvIHNlZSBpZiB0aGV5IGhhdmUgY29sbGlkZWQgd2l0aCBlaXRoZXIgYW4gaXRlbSBvciB0aGUgYmFzZVxyXG5mdW5jdGlvbiBnZXRDb2xsaXNpb25NYXJrZXIoKSB7XHJcbiAgLy8gY29tcHV0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiBteSBjYXIgYW5kIHRoZSBkZXN0aW5hdGlvblxyXG4gIGlmICh0aGlzLmRlc3RpbmF0aW9uKSB7XHJcbiAgICB2YXIgbWF4RGlzdGFuY2VBbGxvd2VkID0gdGhpcy5jYXJUb0l0ZW1Db2xsaXNpb25EaXN0YW5jZTtcclxuICAgIHZhciBkaXN0YW5jZSA9IGdvb2dsZS5tYXBzLmdlb21ldHJ5LnNwaGVyaWNhbC5jb21wdXRlRGlzdGFuY2VCZXR3ZWVuKHRoaXMubWFwQ2VudGVyLCB0aGlzLmRlc3RpbmF0aW9uKTtcclxuICAgIC8vIFRoZSBiYXNlIGlzIGJpZ2dlciwgc28gYmUgbW9yZSBsZW5pZW50IHdoZW4gY2hlY2tpbmcgZm9yIGEgYmFzZSBjb2xsaXNpb25cclxuICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMubXlUZWFtQmFzZU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICBtYXhEaXN0YW5jZUFsbG93ZWQgPSB0aGlzLmNhclRvQmFzZUNvbGxpc2lvbkRpc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgaWYgKGRpc3RhbmNlIDwgbWF4RGlzdGFuY2VBbGxvd2VkKSB7XHJcbiAgICAgIGlmICh0aGlzLmRlc3RpbmF0aW9uID09IHRoaXMuaXRlbU1hcE9iamVjdC5sb2NhdGlvbikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCd1c2VyICcgKyB0aGlzLnBlZXIuaWQgKyAnIGNvbGxpZGVkIHdpdGggaXRlbScpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1NYXBPYmplY3QubWFya2VyO1xyXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuZGVzdGluYXRpb24gPT0gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0LmxvY2F0aW9uKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuY29sbGVjdGVkSXRlbSkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coJ3VzZXIgJyArIHRoaXMucGVlci5pZCArICcgaGFzIGFuIGl0ZW0gYW5kIGNvbGxpZGVkIHdpdGggYmFzZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5teVRlYW1CYXNlTWFwT2JqZWN0Lm1hcmtlcjtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gbnVsbDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0R2FtZVRvTmV3TG9jYXRpb24obGF0LCBsbmcpIHtcclxuICB0aGlzLmdhbWVEYXRhT2JqZWN0LmluaXRpYWxMb2NhdGlvbiA9IHtcclxuICAgIGxhdDogbGF0LFxyXG4gICAgbG5nOiBsbmdcclxuICB9O1xyXG4gIGNyZWF0ZVRlYW1Ub3duQmFzZS5jYWxsKHRoaXMsIGxhdCwgbG5nKTtcclxuICBjcmVhdGVUZWFtQ3J1c2hCYXNlLmNhbGwodGhpcywgKHBhcnNlRmxvYXQobGF0KSArIDAuMDA2KS50b1N0cmluZygpLCAocGFyc2VGbG9hdChsbmcpICsgMC4wMDgpLnRvU3RyaW5nKCkpO1xyXG4gIGFzc2lnbk15VGVhbUJhc2UuY2FsbCh0aGlzKTtcclxuICB0aGlzLm1hcENlbnRlciA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpO1xyXG4gIHRoaXMubWFwLnNldENlbnRlcih0aGlzLm1hcENlbnRlcik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFuZ2xlKHZ4LCB2eSkge1xyXG4gIHJldHVybiAoTWF0aC5hdGFuMih2eSwgdngpKSAqICgxODAgLyBNYXRoLlBJKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY29tcHV0ZUJlYXJpbmdBbmdsZShsYXQxLCBsb24xLCBsYXQyLCBsb24yKSB7XHJcbiAgdmFyIFIgPSA2MzcxOyAvLyBrbVxyXG4gIHZhciBkTGF0ID0gKGxhdDIgLSBsYXQxKS50b1JhZCgpO1xyXG4gIHZhciBkTG9uID0gKGxvbjIgLSBsb24xKS50b1JhZCgpO1xyXG4gIHZhciBsYXQxID0gbGF0MS50b1JhZCgpO1xyXG4gIHZhciBsYXQyID0gbGF0Mi50b1JhZCgpO1xyXG5cclxuICB2YXIgYW5nbGVJblJhZGlhbnMgPSBNYXRoLmF0YW4yKE1hdGguc2luKGRMb24pICogTWF0aC5jb3MobGF0MiksXHJcbiAgICBNYXRoLmNvcyhsYXQxKSAqIE1hdGguc2luKGxhdDIpIC0gTWF0aC5zaW4obGF0MSkgKiBNYXRoLmNvcyhsYXQyKSAqIE1hdGguY29zKGRMb24pKTtcclxuICByZXR1cm4gYW5nbGVJblJhZGlhbnMudG9EZWcoKTtcclxufVxyXG5cclxuXHJcbi8vIGdhbWUgbG9vcCBoZWxwZXJzXHJcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcclxuICByZXR1cm4gd2luZG93LnBlcmZvcm1hbmNlICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5ub3cgPyB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCkgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxufVxyXG5cclxuLy8gZG9uJ3QgdGhpbmsgd2UnbGwgbmVlZCB0byBnbyB0byB0aGUgdXNlcidzIGxvY2F0aW9uLCBidXQgbWlnaHQgYmUgdXNlZnVsXHJcbmZ1bmN0aW9uIHRyeUZpbmRpbmdMb2NhdGlvbigpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIFRyeSBIVE1MNSBnZW9sb2NhdGlvblxyXG4gIGlmIChuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcclxuICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pIHtcclxuICAgICAgdmFyIHBvcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmcocG9zaXRpb24uY29vcmRzLmxhdGl0dWRlLFxyXG4gICAgICAgIHBvc2l0aW9uLmNvb3Jkcy5sb25naXR1ZGUpO1xyXG4gICAgICBzZWxmLm1hcC5zZXRDZW50ZXIocG9zKTtcclxuICAgICAgc2VsZi5tYXBDZW50ZXIgPSBwb3M7XHJcbiAgICB9LCBmdW5jdGlvbigpIHtcclxuICAgICAgaGFuZGxlTm9HZW9sb2NhdGlvbi5jYWxsKHNlbGYsIHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIEJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IEdlb2xvY2F0aW9uXHJcbiAgICBoYW5kbGVOb0dlb2xvY2F0aW9uLmNhbGwoc2VsZiwgZmFsc2UpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTm9HZW9sb2NhdGlvbihlcnJvckZsYWcpIHtcclxuICBpZiAoZXJyb3JGbGFnKSB7XHJcbiAgICB2YXIgY29udGVudCA9ICdFcnJvcjogVGhlIEdlb2xvY2F0aW9uIHNlcnZpY2UgZmFpbGVkLic7XHJcbiAgfSBlbHNlIHtcclxuICAgIHZhciBjb250ZW50ID0gJ0Vycm9yOiBZb3VyIGJyb3dzZXIgZG9lc25cXCd0IHN1cHBvcnQgZ2VvbG9jYXRpb24uJztcclxuICB9XHJcbn1cclxuXHJcbi8vIFRoaXMgY2FuIGJlIHJlbW92ZWQsIHNpbmNlIGl0IGNhdXNlcyBhbiBlcnJvci4gIGl0J3MganVzdCBhbGxvd2luZ1xyXG4vLyBmb3IgcmlnaHQtY2xpY2tpbmcgdG8gc2hvdyB0aGUgYnJvd3NlcidzIGNvbnRleHQgbWVudS5cclxuZnVuY3Rpb24gc2hvd0NvbnRleHRNZW51KGUpIHtcclxuXHJcbiAgLy8gY3JlYXRlIGEgY29udGV4dG1lbnUgZXZlbnQuXHJcbiAgdmFyIG1lbnVfZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIk1vdXNlRXZlbnRzXCIpO1xyXG4gIG1lbnVfZXZlbnQuaW5pdE1vdXNlRXZlbnQoXCJjb250ZXh0bWVudVwiLCB0cnVlLCB0cnVlLFxyXG4gICAgZS52aWV3LCAxLCAwLCAwLCAwLCAwLCBmYWxzZSxcclxuICAgIGZhbHNlLCBmYWxzZSwgZmFsc2UsIDIsIG51bGwpO1xyXG5cclxuICAvLyBmaXJlIHRoZSBuZXcgZXZlbnQuXHJcbiAgZS5vcmlnaW5hbFRhcmdldC5kaXNwYXRjaEV2ZW50KG1lbnVfZXZlbnQpO1xyXG59XHJcblxyXG5cclxuLy8gaGFjayB0byBhbGxvdyBmb3IgYnJvd3NlciBjb250ZXh0IG1lbnUgb24gcmlnaHQtY2xpY2tcclxuZnVuY3Rpb24gbW91c2VVcChlKSB7XHJcbiAgaWYgKGUuYnV0dG9uID09IDIpIHsgLy8gcmlnaHQtY2xpY2tcclxuICAgIHNob3dDb250ZXh0TWVudS5jYWxsKHRoaXMsIGUpO1xyXG4gIH1cclxufVxyXG5cclxuLy8gJCh3aW5kb3cpLnVubG9hZChmdW5jdGlvbigpIHtcclxuLy8gICBkaXNjb25uZWN0RnJvbUdhbWUoKTtcclxuLy8gfSk7IiwiLyoqXHJcbiAqICBtYXRjaG1ha2VyLmpzXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqICBleHBvcnQgY2xhc3NcclxuICovXHJcbm1vZHVsZS5leHBvcnRzID0gTWF0Y2htYWtlclRvd247XHJcblxyXG4vKipcclxuICogIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpIHtcclxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTWF0Y2htYWtlclRvd24pKVxyXG4gICAgcmV0dXJuIG5ldyBNYXRjaG1ha2VyVG93bihmaXJlYmFzZUJhc2VVcmwpO1xyXG5cclxuICAvLyBUaGUgcm9vdCBvZiB5b3VyIHNlc3Npb24gZGF0YS5cclxuICB0aGlzLlNFU1NJT05fTE9DQVRJT04gPSBmaXJlYmFzZUJhc2VVcmw7XHJcbiAgdGhpcy5zZXNzaW9uUmVmID0gbmV3IEZpcmViYXNlKHRoaXMuU0VTU0lPTl9MT0NBVElPTik7XHJcblxyXG4gIHRoaXMuQVZBSUxBQkxFX1NFU1NJT05TX0xPQ0FUSU9OID0gJ2F2YWlsYWJsZV9zZXNzaW9ucyc7XHJcbiAgdGhpcy5GVUxMX1NFU1NJT05TX0xPQ0FUSU9OID0gJ2Z1bGxfc2Vzc2lvbnMnO1xyXG4gIHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OID0gJ3Nlc3Npb25zJztcclxuICB0aGlzLk1BWF9VU0VSU19QRVJfU0VTU0lPTiA9IDQ7XHJcbiAgdGhpcy5TRVNTSU9OX0NMRUFOVVBfVElNRU9VVCA9IDMwICogMTAwMDsgLy8gaW4gbWlsbGlzZWNvbmRzXHJcblxyXG4gIHRoaXMuam9pbmVkU2Vzc2lvbiA9IG51bGw7XHJcbiAgdGhpcy5teVdvcmtlciA9IG51bGw7XHJcblxyXG59XHJcblxyXG4vKipcclxuICogIGNvbm5lY3QgdG8gYSBzZXNzaW9uXHJcbiAqL1xyXG5NYXRjaG1ha2VyVG93bi5wcm90b3R5cGUuam9pbk9yQ3JlYXRlU2Vzc2lvbiA9IGZ1bmN0aW9uKHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZFNlc3Npb25DYWxsYmFjaykge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgY2FsbEFzeW5jQ2xlYW51cEluYWN0aXZlU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICBjb25zb2xlLmxvZygndHJ5aW5nIHRvIGpvaW4gc2Vzc2lvbicpO1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJIZWxwZXJXb3JrZXIuY2FsbCh0aGlzLCB3aW5kb3cpO1xyXG4gIHZhciBhdmFpbGFibGVTZXNzaW9uc0RhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pO1xyXG4gIGF2YWlsYWJsZVNlc3Npb25zRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIC8vIG9ubHkgam9pbiBhIHNlc3Npb24gaWYgb25lIGlzbid0IGpvaW5lZCBhbHJlYWR5XHJcbiAgICBpZiAoc2VsZi5qb2luZWRTZXNzaW9uID09IG51bGwpIHtcclxuICAgICAgc2VsZi5qb2luZWRTZXNzaW9uID0gLTE7XHJcbiAgICAgIGlmIChkYXRhLnZhbCgpID09PSBudWxsKSB7XHJcbiAgICAgICAgLy8gdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSBzZXNzaW9ucywgc28gY3JlYXRlIG9uZVxyXG4gICAgICAgIHZhciBzZXNzaW9uRGF0YSA9IGNyZWF0ZU5ld1Nlc3Npb25EYXRhLmNhbGwoc2VsZiwgdXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICAgICAgY3JlYXRlTmV3U2Vzc2lvbkluRmlyZWJhc2UuY2FsbChzZWxmLCB1c2VybmFtZSwgcGVlcklkLCBzZXNzaW9uRGF0YSk7XHJcbiAgICAgICAgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKHNlc3Npb25EYXRhLCB0cnVlKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIganNvbk9iaiA9IGRhdGEudmFsKCk7XHJcbiAgICAgICAgdmFyIHNlc3Npb25JZDtcclxuXHJcbiAgICAgICAgLy8gc3R1cGlkIGphdmFzY3JpcHQgd29uJ3QgdGVsbCBtZSBob3cgbWFueSBzZXNzaW9uIGVsZW1lbnRzXHJcbiAgICAgICAgLy8gYXJlIGluIHRoZSBqc29uT2JqLCBzbyBjb3VudCBlbSB1cFxyXG4gICAgICAgIHZhciBudW1BdmFpbGFibGVTZXNzaW9ucyA9IDA7XHJcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGpzb25PYmopIHtcclxuICAgICAgICAgIG51bUF2YWlsYWJsZVNlc3Npb25zKys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIGNoaWxkIHNlc3Npb25zIGFuZCB0cnlcclxuICAgICAgICAvLyB0byBqb2luIGVhY2ggb25lXHJcbiAgICAgICAgdmFyIGNvdW50ZXIgPSAwO1xyXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBqc29uT2JqKSB7XHJcbiAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICBpZiAoanNvbk9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgIHNlc3Npb25JZCA9IGpzb25PYmpba2V5XTtcclxuICAgICAgICAgICAgZ2V0U2Vzc2lvbkxhc3RVcGRhdGVUaW1lLmNhbGwoc2VsZiwgc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssIGRvbmVHZXR0aW5nVXBkYXRlVGltZS5iaW5kKHNlbGYpLCBjb3VudGVyID09IG51bUF2YWlsYWJsZVNlc3Npb25zLCBzZWxmKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9KTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiAgcmVtb3ZlIGEgcGVlciBmcm9tIHRoZSBzZXNzaW9uXHJcbiAqL1xyXG5NYXRjaG1ha2VyVG93bi5wcm90b3R5cGUucmVtb3ZlUGVlckZyb21TZXNzaW9uID0gZnVuY3Rpb24oc2Vzc2lvbklkLCBwZWVySWQpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGlmICghZGF0YS52YWwoKSkge1xyXG4gICAgICAvLyBzb21ldGhpbmcncyB3cm9uZywgcHJvYmFibHkgdGhlIEZpcmViYXNlIGRhdGEgd2FzIGRlbGV0ZWRcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKGRhdGEudmFsKCkuaG9zdFBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgZmluZE5ld0hvc3RQZWVySWQuY2FsbChzZWxmLCBzZXNzaW9uSWQsIHBlZXJJZCwgc3dpdGNoVG9OZXdIb3N0KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAgIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIHNlc3Npb24uIFNvIHRyaW0gb3V0IHRoZSBcclxuICAgIC8vIHVuZGVmaW5lZCBlbGVtZW50cyB0byBzZWUgdGhlIGFjdHVhbCBhcnJheSBvZiBjdXJyZW50IHVzZXJzXHJcbiAgICB2YXIgbnVtVXNlcnNJblNlc3Npb24gPSBkYXRhLmNoaWxkKCd1c2VycycpLnZhbCgpLmNsZWFuKHVuZGVmaW5lZCkubGVuZ3RoO1xyXG4gICAgZGF0YS5jaGlsZCgndXNlcnMnKS5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU25hcHNob3QpIHtcclxuICAgICAgLy8gaWYgd2UndmUgZm91bmQgdGhlIHJlZiB0aGF0IHJlcHJlc2VudHMgdGhlIGdpdmVuIHBlZXIsIHJlbW92ZSBpdFxyXG4gICAgICBpZiAoY2hpbGRTbmFwc2hvdC52YWwoKSAmJiBjaGlsZFNuYXBzaG90LnZhbCgpLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuICAgICAgICBjaGlsZFNuYXBzaG90LnJlZigpLnJlbW92ZSgpO1xyXG4gICAgICAgIC8vIGlmIHRoaXMgdXNlciB3YXMgdGhlIGxhc3Qgb25lIGluIHRoZSBzZXNzaW9uLCBub3cgdGhlcmUgYXJlIDAsIFxyXG4gICAgICAgIC8vIHNvIGRlbGV0ZSB0aGUgc2Vzc2lvblxyXG4gICAgICAgIGlmIChudW1Vc2Vyc0luU2Vzc2lvbiA9PSAxKSB7XHJcbiAgICAgICAgICBkZWxldGVTZXNzaW9uLmNhbGwoc2VsZiwgc2Vzc2lvbklkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gaWYgaXQgd2FzIGZ1bGwsIG5vdyBpdCBoYXMgb25lIG9wZW4gc2xvdCwgc2V0IGl0IHRvIGF2YWlsYWJsZVxyXG4gICAgICAgICAgaWYgKG51bVVzZXJzSW5TZXNzaW9uID09IHNlbGYuTUFYX1VTRVJTX1BFUl9TRVNTSU9OKSB7XHJcbiAgICAgICAgICAgIG1vdmVTZXNzaW9uRnJvbUZ1bGxUb0F2YWlsYWJsZS5jYWxsKHNlbGYsIHNlc3Npb25JZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuTWF0Y2htYWtlclRvd24ucHJvdG90eXBlLnN3aXRjaFRvTmV3SG9zdCA9IGZ1bmN0aW9uKHNlc3Npb25JZCwgbmV3SG9zdFBlZXJJZCkge1xyXG4gIGlmICghbmV3SG9zdFBlZXJJZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5zZXQobmV3SG9zdFBlZXJJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld1Nlc3Npb25EYXRhKHVzZXJuYW1lLCBwZWVySWQpIHtcclxuICB2YXIgc2Vzc2lvbklkID0gY3JlYXRlTmV3U2Vzc2lvbklkLmNhbGwodGhpcyk7XHJcbiAgcmV0dXJuIHtcclxuICAgIGlkOiBzZXNzaW9uSWQsXHJcbiAgICBob3N0UGVlcklkOiBwZWVySWQsXHJcbiAgICB1c2VyczogW3tcclxuICAgICAgcGVlcklkOiBwZWVySWQsXHJcbiAgICAgIHVzZXJuYW1lOiB1c2VybmFtZVxyXG4gICAgfV1cclxuICB9O1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZG9uZUdldHRpbmdVcGRhdGVUaW1lKGxhc3RVcGRhdGVUaW1lLCBzZXNzaW9uSWQsIGlzVGhlTGFzdFNlc3Npb24sIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZFNlc3Npb25DYWxsYmFjaykge1xyXG4gIC8vIGlmIHRoZSBzZXNzaW9uIGlzIHN0aWxsIGFjdGl2ZSBqb2luIGl0XHJcbiAgaWYgKGxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICBpZiAoIWlzVGltZW91dFRvb0xvbmcuY2FsbCh0aGlzLCBsYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgam9pbkV4aXN0aW5nU2Vzc2lvbi5jYWxsKHRoaXMsIHNlc3Npb25JZCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY2FsbEFzeW5jQ2xlYW51cEluYWN0aXZlU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gaWYgd2UgZ290IGhlcmUsIGFuZCB0aGlzIGlzIHRoZSBsYXN0IHNlc3Npb24sIHRoYXQgbWVhbnMgdGhlcmUgYXJlIG5vIGF2YWlsYWJsZSBzZXNzaW9uc1xyXG4gIC8vIHNvIGNyZWF0ZSBvbmVcclxuICBpZiAoaXNUaGVMYXN0U2Vzc2lvbikge1xyXG4gICAgY29uc29sZS5sb2coJ25vIGF2YWlsYWJsZSBzZXNzaW9ucyBmb3VuZCwgb25seSBpbmFjdGl2ZSBvbmVzLCBzbyBjcmVhdGluZyBhIG5ldyBvbmUuLi4nKTtcclxuICAgIHZhciBzZXNzaW9uRGF0YSA9IGNyZWF0ZU5ld1Nlc3Npb25EYXRhLmNhbGwodGhpcywgdXNlcm5hbWUsIHBlZXJJZCk7XHJcbiAgICBjcmVhdGVOZXdTZXNzaW9uSW5GaXJlYmFzZS5jYWxsKHRoaXMsIHVzZXJuYW1lLCBwZWVySWQsIHNlc3Npb25EYXRhKTtcclxuICAgIGpvaW5lZFNlc3Npb25DYWxsYmFjayhzZXNzaW9uRGF0YSwgdHJ1ZSk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTZXNzaW9uTGFzdFVwZGF0ZVRpbWUoc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssIGRvbmVHZXR0aW5nVXBkYXRlVGltZUNhbGxiYWNrLCBpc1RoZUxhc3RTZXNzaW9uKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKS5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGlmIChkYXRhLnZhbCgpICYmIGRhdGEudmFsKCkubGFzdFVwZGF0ZVRpbWUpIHtcclxuICAgICAgY29uc29sZS5sb2coJ2ZvdW5kIHVwZGF0ZSB0aW1lOiAnICsgZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSlcclxuICAgICAgZG9uZUdldHRpbmdVcGRhdGVUaW1lQ2FsbGJhY2soZGF0YS52YWwoKS5sYXN0VXBkYXRlVGltZSwgc2Vzc2lvbklkLCBpc1RoZUxhc3RTZXNzaW9uLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2ssIHNlbGYpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVyUGluZygpIHtcclxuICBzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlLmNhbGwodGhpcyk7XHJcbiAgd2luZG93LnNldEludGVydmFsKHNldFNlcnZlclN0YXR1c0FzU3RpbGxBY3RpdmUuYmluZCh0aGlzKSwgMTAwMDApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpbml0aWFsaXplU2VydmVySGVscGVyV29ya2VyKHdpbmRvd09iamVjdCkge1xyXG4gIGlmICh0eXBlb2Yod2luZG93T2JqZWN0LldvcmtlcikgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuICAgIHRoaXMubXlXb3JrZXIgPSBuZXcgV29ya2VyKFwiYXN5bmNtZXNzYWdlci5qc1wiKTtcclxuICAgIHRoaXMubXlXb3JrZXIuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHByb2Nlc3NNZXNzYWdlRXZlbnQuYmluZCh0aGlzKSwgZmFsc2UpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIlNvcnJ5LCB5b3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBXZWIgV29ya2Vycy4uLlwiKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGxBc3luY0NsZWFudXBJbmFjdGl2ZVNlc3Npb25zKCkge1xyXG4gIC8vIGRvIGl0IG9uIGEgd2ViIHdvcmtlciB0aHJlYWRcclxuICBpZiAodGhpcy5teVdvcmtlcikge1xyXG4gICAgdGhpcy5teVdvcmtlci5wb3N0TWVzc2FnZSh7XHJcbiAgICAgIGNtZDogJ2NsZWFudXBfaW5hY3RpdmVfc2Vzc2lvbnMnXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBzZXRTZXJ2ZXJTdGF0dXNBc1N0aWxsQWN0aXZlKCkge1xyXG4gIGNvbnNvbGUubG9nKCdwaW5naW5nIHNlcnZlcicpO1xyXG4gIHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQodGhpcy5qb2luZWRTZXNzaW9uKS5jaGlsZCgnbGFzdFVwZGF0ZVRpbWUnKS5zZXQoKG5ldyBEYXRlKCkpLmdldFRpbWUoKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFudXBTZXNzaW9ucygpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIGNvbnNvbGUubG9nKCdjbGVhbmluZyB1cCBpbmFjdGl2ZSBzZXNzaW9ucycpO1xyXG4gIHZhciBzZXNzaW9uRGF0YVJlZiA9IHRoaXMuc2Vzc2lvblJlZi5jaGlsZCh0aGlzLkFMTF9TRVNTSU9OU19MT0NBVElPTikub25jZSgndmFsdWUnLCBmdW5jdGlvbihkYXRhU25hcHNob3QpIHtcclxuICAgIGRhdGFTbmFwc2hvdC5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkU25hcHNob3QpIHtcclxuICAgICAgdmFyIHNob3VsZERlbGV0ZVNlc3Npb24gPSBmYWxzZTtcclxuICAgICAgdmFyIHNlc3Npb25EYXRhID0gY2hpbGRTbmFwc2hvdC52YWwoKTtcclxuICAgICAgaWYgKCFzZXNzaW9uRGF0YSkge1xyXG4gICAgICAgIHNob3VsZERlbGV0ZVNlc3Npb24gPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChzZXNzaW9uRGF0YS51c2VycyA9PSBudWxsIHx8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Nlc3Npb24gaGFzIG5vIHVzZXJzJyk7XHJcbiAgICAgICAgc2hvdWxkRGVsZXRlU2Vzc2lvbiA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGlzVGltZW91dFRvb0xvbmcuY2FsbChzZWxmLCBzZXNzaW9uRGF0YS5sYXN0VXBkYXRlVGltZSkpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcInNlc3Npb24gaGFzbid0IGJlZW4gdXBkYXRlZCBzaW5jZSBcIiArIHNlc3Npb25EYXRhLmxhc3RVcGRhdGVUaW1lKTtcclxuICAgICAgICBzaG91bGREZWxldGVTZXNzaW9uID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNob3VsZERlbGV0ZVNlc3Npb24pIHtcclxuICAgICAgICBkZWxldGVTZXNzaW9uLmNhbGwoc2VsZiwgY2hpbGRTbmFwc2hvdC5uYW1lKCkpO1xyXG4gICAgICAgIGNoaWxkU25hcHNob3QucmVmKCkucmVtb3ZlKCk7XHJcblxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGlzVGltZW91dFRvb0xvbmcobGFzdFVwZGF0ZVRpbWUpIHtcclxuICBpZiAoIWxhc3RVcGRhdGVUaW1lKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIHZhciBjdXJyZW50VGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XHJcbiAgcmV0dXJuIChjdXJyZW50VGltZSAtIGxhc3RVcGRhdGVUaW1lID4gdGhpcy5TRVNTSU9OX0NMRUFOVVBfVElNRU9VVCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHByb2Nlc3NNZXNzYWdlRXZlbnQoZXZlbnQpIHtcclxuICBzd2l0Y2ggKGV2ZW50LmRhdGEpIHtcclxuICAgIGNhc2UgJ2NsZWFudXBfaW5hY3RpdmVfc2Vzc2lvbnMnOlxyXG4gICAgICBjbGVhbnVwU2Vzc2lvbnMuY2FsbCh0aGlzKTtcclxuICAgICAgYnJlYWs7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICBicmVhaztcclxuICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBmaW5kTmV3SG9zdFBlZXJJZChzZXNzaW9uSWQsIGV4aXN0aW5nSG9zdFBlZXJJZCwgY2FsbGJhY2spIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIC8vIHJlc2V0IHRoZSBob3N0UGVlcklkIHNvIGl0IHByZXZlbnRzIHRoZSBsZWF2aW5nIGhvc3QncyBicm93c2VyXHJcbiAgLy8gaWYgaXQgdHJpZXMgdG8gc3dpdGNoIGFnYWluIGJlZm9yZSB0aGlzIGlzIGRvbmVcclxuICB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCkuY2hpbGQoJ2hvc3RQZWVySWQnKS5yZW1vdmUoKTtcclxuXHJcbiAgdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgdmFyIHVzZXJzID0gZGF0YS5jaGlsZCgndXNlcnMnKS52YWwoKTtcclxuXHJcbiAgICAvLyBpZiBmb3Igd2hhdGV2ZXIgcmVhc29uIHRoaXMgaXMgY2FsbGVkIGFuZCBzb21ldGhpbmcncyBub3QgcmlnaHQsIGp1c3RcclxuICAgIC8vIHJldHVyblxyXG4gICAgaWYgKCF1c2Vycykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdXNlcnMgPSB1c2Vycy5jbGVhbih1bmRlZmluZWQpO1xyXG4gICAgaWYgKHVzZXJzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHVzZXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGlmICh1c2Vyc1tpXSAmJiB1c2Vyc1tpXS5wZWVySWQgIT0gZXhpc3RpbmdIb3N0UGVlcklkKSB7XHJcbiAgICAgICAgLy8gd2UndmUgZm91bmQgYSBuZXcgdXNlciB0byBiZSB0aGUgaG9zdCwgcmV0dXJuIHRoZWlyIGlkXHJcbiAgICAgICAgY2FsbGJhY2soc2Vzc2lvbklkLCB1c2Vyc1tpXS5wZWVySWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjYWxsYmFjayhzZXNzaW9uSWQsIG51bGwpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkZWxldGVTZXNzaW9uKHNlc3Npb25JZCkge1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tQXZhaWxhYmxlU2Vzc2lvbnMuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tRnVsbFNlc3Npb25zLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICByZW1vdmVTZXNzaW9uLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbihzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BTExfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld1Nlc3Npb25JbkZpcmViYXNlKHVzZXJuYW1lLCBwZWVySWQsIHNlc3Npb25EYXRhKSB7XHJcbiAgY29uc29sZS5sb2coJ2NyZWF0aW5nIG5ldyBzZXNzaW9uJyk7XHJcbiAgdmFyIG5ld1Nlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uRGF0YS5pZCk7XHJcbiAgbmV3U2Vzc2lvbkRhdGFSZWYuc2V0KHNlc3Npb25EYXRhKTtcclxuICB2YXIgbmV3QXZhaWxhYmxlU2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25EYXRhLmlkKTtcclxuICBuZXdBdmFpbGFibGVTZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbkRhdGEuaWQpO1xyXG4gIHRoaXMuam9pbmVkU2Vzc2lvbiA9IHNlc3Npb25EYXRhLmlkO1xyXG4gIGluaXRpYWxpemVTZXJ2ZXJQaW5nLmNhbGwodGhpcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5ld1Nlc3Npb25JZCgpIHtcclxuICAvLyBUT0RPOiByZXBsYWNlIHRoaXMgd2l0aCBzb21ldGhpbmcgdGhhdCB3b24ndFxyXG4gIC8vIGFjY2lkZW50YWxseSBoYXZlIGNvbGxpc2lvbnNcclxuICByZXR1cm4gZ2V0UmFuZG9tSW5SYW5nZSgxLCAxMDAwMDAwMCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGpvaW5FeGlzdGluZ1Nlc3Npb24oc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLCBqb2luZWRTZXNzaW9uQ2FsbGJhY2spIHtcclxuICAvLyBpZiBhIHNlc3Npb24gaGFzIGFscmVhZHkgYmVlbiBqb2luZWQgb24gYW5vdGhlciB0aHJlYWQsIGRvbid0IGpvaW4gYW5vdGhlciBvbmVcclxuICBpZiAodGhpcy5qb2luZWRTZXNzaW9uICYmIHRoaXMuam9pbmVkU2Vzc2lvbiA+PSAwKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIHRoaXMuam9pbmVkU2Vzc2lvbiA9IHNlc3Npb25JZDtcclxuICBhc3luY0dldFNlc3Npb25EYXRhLmNhbGwodGhpcywgc2Vzc2lvbklkLCB1c2VybmFtZSwgcGVlcklkLCBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrLmJpbmQodGhpcyksIGpvaW5lZFNlc3Npb25DYWxsYmFjay5iaW5kKHRoaXMpLCBkb25lR2V0dGluZ1Nlc3Npb25EYXRhLmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gYXN5bmNHZXRTZXNzaW9uRGF0YShzZXNzaW9uSWQsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZFNlc3Npb25DYWxsYmFjaywgZG9uZUdldHRpbmdTZXNzaW9uRGF0YUNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLm9uY2UoJ3ZhbHVlJywgZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZG9uZUdldHRpbmdTZXNzaW9uRGF0YUNhbGxiYWNrKGRhdGEsIHVzZXJuYW1lLCBwZWVySWQsIGNvbm5lY3RUb1VzZXJzQ2FsbGJhY2ssIGpvaW5lZFNlc3Npb25DYWxsYmFjayk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvbmVHZXR0aW5nU2Vzc2lvbkRhdGEoc2Vzc2lvbkRhdGFTbmFwc2hvdCwgdXNlcm5hbWUsIHBlZXJJZCwgY29ubmVjdFRvVXNlcnNDYWxsYmFjaywgam9pbmVkU2Vzc2lvbkNhbGxiYWNrKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhID0gc2Vzc2lvbkRhdGFTbmFwc2hvdC52YWwoKTtcclxuICB2YXIgbmV3VXNlciA9IHtcclxuICAgIHBlZXJJZDogcGVlcklkLFxyXG4gICAgdXNlcm5hbWU6IHVzZXJuYW1lXHJcbiAgfTtcclxuICAvLyB3ZWlyZG5lc3M6IGkgd2FudCB0byBqdXN0IHB1c2ggbmV3VXNlciBvbnRvIHNlc3Npb25EYXRhLnVzZXJzLCBidXRcclxuICAvLyB0aGF0IG1lc3NlcyB1cCB0aGUgYXJyYXkgSSBndWVzc1xyXG4gIHZhciB1c2Vyc0FycmF5ID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZXNzaW9uRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKHNlc3Npb25EYXRhLnVzZXJzW2ldKSB7XHJcbiAgICAgIHVzZXJzQXJyYXkucHVzaChzZXNzaW9uRGF0YS51c2Vyc1tpXSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHVzZXJzQXJyYXkucHVzaChuZXdVc2VyKTtcclxuICBzZXNzaW9uRGF0YS51c2VycyA9IHVzZXJzQXJyYXk7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gc2Vzc2lvbkRhdGFTbmFwc2hvdC5yZWYoKTtcclxuICBzZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbkRhdGEpO1xyXG4gIGNvbnNvbGUubG9nKCdqb2luaW5nIHNlc3Npb24gJyArIHNlc3Npb25EYXRhLmlkKTtcclxuICAvLyBGaXJlYmFzZSB3ZWlyZG5lc3M6IHRoZSB1c2VycyBhcnJheSBjYW4gc3RpbGwgaGF2ZSB1bmRlZmluZWQgZWxlbWVudHNcclxuICAvLyB3aGljaCByZXByZXNlbnRzIHVzZXJzIHRoYXQgaGF2ZSBsZWZ0IHRoZSBzZXNzaW9uLiBTbyB0cmltIG91dCB0aGUgXHJcbiAgLy8gdW5kZWZpbmVkIGVsZW1lbnRzIHRvIHNlZSB0aGUgYWN0dWFsIGFycmF5IG9mIGN1cnJlbnQgdXNlcnNcclxuICBpZiAodXNlcnNBcnJheS5sZW5ndGggPT0gdGhpcy5NQVhfVVNFUlNfUEVSX1NFU1NJT04pIHtcclxuICAgIHNldFNlc3Npb25Ub0Z1bGwuY2FsbCh0aGlzLCBzZXNzaW9uRGF0YS5pZCk7XHJcbiAgfVxyXG4gIHZhciBwZWVySWRzQXJyYXkgPSBbXTtcclxuICBmb3IgKHZhciBqID0gMDsgaiA8IHNlc3Npb25EYXRhLnVzZXJzLmxlbmd0aDsgaisrKSB7XHJcbiAgICBwZWVySWRzQXJyYXkucHVzaChzZXNzaW9uRGF0YS51c2Vyc1tqXS5wZWVySWQpO1xyXG4gIH1cclxuICBjb25uZWN0VG9Vc2Vyc0NhbGxiYWNrKHBlZXJJZHNBcnJheSk7XHJcbiAgaW5pdGlhbGl6ZVNlcnZlclBpbmcuY2FsbCh0aGlzKTtcclxuICBqb2luZWRTZXNzaW9uQ2FsbGJhY2soc2Vzc2lvbkRhdGEsIGZhbHNlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0U2Vzc2lvblRvRnVsbChzZXNzaW9uSWQpIHtcclxuICByZW1vdmVTZXNzaW9uRnJvbUF2YWlsYWJsZVNlc3Npb25zLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICBhZGRTZXNzaW9uVG9GdWxsU2Vzc2lvbnNMaXN0LmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlU2Vzc2lvbkZyb21BdmFpbGFibGVTZXNzaW9ucyhzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5BVkFJTEFCTEVfU0VTU0lPTlNfTE9DQVRJT04pLmNoaWxkKHNlc3Npb25JZCk7XHJcbiAgc2Vzc2lvbkRhdGFSZWYucmVtb3ZlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZFNlc3Npb25Ub0Z1bGxTZXNzaW9uc0xpc3Qoc2Vzc2lvbklkKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuRlVMTF9TRVNTSU9OU19MT0NBVElPTikuY2hpbGQoc2Vzc2lvbklkKTtcclxuICBzZXNzaW9uRGF0YVJlZi5zZXQoc2Vzc2lvbklkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbW92ZVNlc3Npb25Gcm9tRnVsbFRvQXZhaWxhYmxlKHNlc3Npb25JZCkge1xyXG4gIHJlbW92ZVNlc3Npb25Gcm9tRnVsbFNlc3Npb25zLmNhbGwodGhpcywgc2Vzc2lvbklkKTtcclxuICBhZGRTZXNzaW9uVG9BdmFpbGFibGVTZXNzaW9uc0xpc3QuY2FsbCh0aGlzLCBzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVTZXNzaW9uRnJvbUZ1bGxTZXNzaW9ucyhzZXNzaW9uSWQpIHtcclxuICB2YXIgc2Vzc2lvbkRhdGFSZWYgPSB0aGlzLnNlc3Npb25SZWYuY2hpbGQodGhpcy5GVUxMX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnJlbW92ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRTZXNzaW9uVG9BdmFpbGFibGVTZXNzaW9uc0xpc3Qoc2Vzc2lvbklkKSB7XHJcbiAgdmFyIHNlc3Npb25EYXRhUmVmID0gdGhpcy5zZXNzaW9uUmVmLmNoaWxkKHRoaXMuQVZBSUxBQkxFX1NFU1NJT05TX0xPQ0FUSU9OKS5jaGlsZChzZXNzaW9uSWQpO1xyXG4gIHNlc3Npb25EYXRhUmVmLnNldChzZXNzaW9uSWQpO1xyXG59XHJcblxyXG5cclxuLy8gLy8gcmV0dXJucyBudWxsIGlmIHRoZSB1c2VyIHdhc24ndCBmb3VuZCBpbiB0aGUgc2Vzc2lvblxyXG4vLyBmdW5jdGlvbiByZW1vdmVVc2VyRnJvbVNlc3Npb25EYXRhKHBlZXJJZCwgc2Vzc2lvbkRhdGEpIHtcclxuLy8gICAvLyBpZiBzb21ldGhpbmcncyB3cm9uZywganVzdCByZXR1cm5cclxuLy8gICBpZiAoIXNlc3Npb25EYXRhIHx8ICFzZXNzaW9uRGF0YS51c2Vycykge1xyXG4vLyAgICAgcmV0dXJuIG51bGw7XHJcbi8vICAgfVxyXG5cclxuLy8gICAvLyBUT0RPOiBGaXJlYmFzZSBoYXMgYSBiZXR0ZXIgd2F5IG9mIGRvaW5nIHRoaXNcclxuLy8gICB2YXIgZm91bmRQZWVyID0gZmFsc2U7XHJcblxyXG4vLyAgIC8vIEZpcmViYXNlIHdlaXJkbmVzczogdGhlIHVzZXJzIGFycmF5IGNhbiBzdGlsbCBoYXZlIHVuZGVmaW5lZCBlbGVtZW50c1xyXG4vLyAgIC8vIHdoaWNoIHJlcHJlc2VudHMgdXNlcnMgdGhhdCBoYXZlIGxlZnQgdGhlIHNlc3Npb24uIFNvIHRyaW0gb3V0IHRoZSBcclxuLy8gICAvLyB1bmRlZmluZWQgZWxlbWVudHMgdG8gc2VlIHRoZSBhY3R1YWwgYXJyYXkgb2YgY3VycmVudCB1c2Vyc1xyXG4vLyAgIHNlc3Npb25EYXRhLnVzZXJzID0gc2Vzc2lvbkRhdGEudXNlcnMuY2xlYW4odW5kZWZpbmVkKTtcclxuXHJcbi8vICAgdXNlcnNXaXRob3V0UGVlciA9IFtdO1xyXG4vLyAgIGZvciAoaSA9IDA7IGkgPCBzZXNzaW9uRGF0YS51c2Vycy5sZW5ndGg7IGkrKykge1xyXG4vLyAgICAgaWYgKHNlc3Npb25EYXRhLnVzZXJzW2ldLnBlZXJJZCA9PSBwZWVySWQpIHtcclxuLy8gICAgICAgZm91bmRQZWVyID0gdHJ1ZTtcclxuLy8gICAgIH0gZWxzZSB7XHJcbi8vICAgICAgIHVzZXJzV2l0aG91dFBlZXIucHVzaChzZXNzaW9uRGF0YS51c2Vyc1tpXSk7XHJcbi8vICAgICB9XHJcbi8vICAgfVxyXG5cclxuLy8gICBpZiAoZm91bmRQZWVyKSB7XHJcbi8vICAgICBzZXNzaW9uRGF0YS51c2VycyA9IHVzZXJzV2l0aG91dFBlZXI7XHJcbi8vICAgICByZXR1cm4gc2Vzc2lvbkRhdGE7XHJcbi8vICAgfSBlbHNlIHtcclxuLy8gICAgIHJldHVybiBudWxsO1xyXG4vLyAgIH0iLCJ2YXIgU211Z2dsZXJzVG93biA9IHJlcXVpcmUoJy4vbWFwZ2FtZS5qcycpO1xyXG5cclxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgZ2FtZSA9IG5ldyBTbXVnZ2xlcnNUb3duKCdodHRwczovL3NtdWdnbGVyc3Rvd24uZmlyZWJhc2Vpby5jb20vJyk7XHJcbn0pOyJdfQ==
