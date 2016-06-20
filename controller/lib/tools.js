var Tools = {};
Tools.unique = function(arr){
    var ret = [],
        hash = {},
        i = 0;

    for (; i < arr.length; i++) {
        var item = arr[i],
            key = typeof(item) + item;
        if (hash[key] !== 1) {
            ret.push(item);
            hash[key] = 1;
        }
    }

    return ret; 
}
module.exports = Tools;