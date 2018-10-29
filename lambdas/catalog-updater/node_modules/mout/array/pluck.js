var map = require('./map');
var prop = require('../function/prop');

    /**
     * Extract a list of property values.
     */
    function pluck(arr, propName){
        return map(arr, prop(propName));
    }

    module.exports = pluck;


