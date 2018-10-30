var filter = require('./filter');

    /**
     * Object reject
     */
    function reject(obj, callback, thisObj) {
        return filter(obj, function(value, index, obj) {
            return !callback.call(thisObj, value, index, obj);
        }, thisObj);
    }

    module.exports = reject;


