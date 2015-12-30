module.exports = Utilities

function Utilities () {

}

Utilities.getRandomInRange = function(from, to, fixed) {
    return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    // .toFixed() returns string, so ' * 1' is a trick to convert to number
}

Utilities.getTime = function(zone, success) {
    var url = 'http://json-time.appspot.com/time.json?tz=' + zone,
        ud = 'json' + (+new Date());
    window[ud] = function(o) {
        success && success(new Date(o.datetime));
    };
    document.getElementsByTagName('head')[0].appendChild((function() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = url + '&callback=' + ud;
        return s;
    })());
}

Array.prototype.clean = function(deleteValue) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == deleteValue) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

/** Adds to the Number prototye: Converts numeric degrees to radians */
if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
        return this * Math.PI / 180;
    }
}
/** Adds to the Number prototye: Converts numeric radians to degrees */
if (typeof(Number.prototype.toDeg) === "undefined") {
    Number.prototype.toDeg = function() {
        return this * 180 / Math.PI;
    }
}
