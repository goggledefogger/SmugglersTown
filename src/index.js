var $ = require('jquery')
var Game = require('./mapgame')

var game = new Game('https://smugglerstown.firebaseio.com/')

$(document).ready(function() {
  game.initialize()
});