angular.module('hoodie')
  .factory('hoodieArray',
  function (hoodieStore) {

    var service = {};

    service.bind = function ($scope, key, hoodieKey) {

      hoodieKey = hoodieKey || key;
      $scope[key] = $scope[key] || [];

      hoodieStore.findAll(hoodieKey)
        .then(function (data) {
          $scope[key] = data;
        });

      $scope.$watch(key, function (newValue, oldValue) {
        if (newValue === oldValue || !angular.isArray(newValue) || !angular.isArray(oldValue)) {
          // Init
        } else {

          var delta = getDelta(oldValue, newValue, angular.equals);
          var item;
          var key;

          // first, add new items
          for (key in delta.added) {
            item = delta.added[key];
            hoodieStore.add(hoodieKey, item);
          }

          // then, the changed items
          for (key in delta.changed) {
            item = delta.changed[key];
            hoodieStore.update(hoodieKey, item.id, item);
          }

          // Last, lets delete items
          for (key in delta.deleted) {
            item = delta.deleted[key];
            // Only delete the item if there isn't an id, otherwise when a new
            // item is added, the first call to $watch will add the item and the
            // second call will remove this same item.
            // TODO: Danger! false ID values would be ignored e.g. id = 0
            if (item.id) {
              hoodieStore.remove(hoodieKey, item.id);
            }
          }

        }
      }, true);

      hoodieStore.on('change:' + hoodieKey, function () {
        hoodieStore.findAll(hoodieKey)
          .then(function (data) {
            $scope[key] = data;
          });
      });
    };


    /**
     * Creates a map out of an array be choosing what property to key by
     * @param {object[]} array Array that will be converted into a map
     * @param {string} prop Name of property to key by
     * @return {object} The mapped array. Example:
     *     mapFromArray([{a:1,b:2}, {a:3,b:4}], 'a')
     *     returns {1: {a:1,b:2}, 3: {a:3,b:4}}
     */
    function mapFromArray(array, prop) {
      var map = {};
      for (var i = 0; i < array.length; i++) {
        map[ array[i][prop] ] = array[i];
      }
      return map;
    }

    /**
     * @param {object[]} o old array of objects
     * @param {object[]} n new array of objects
     * @param {object} An object with changes
     */
    function getDelta(o, n, comparator) {
      var delta = {
        added: [],
        deleted: [],
        changed: []
      };
      var mapO = mapFromArray(o, 'id');
      var mapN = mapFromArray(n, 'id');
      var id;
      for (id in mapO) {
        if (!mapN.hasOwnProperty(id)) {
          delta.deleted.push(mapO[id]);
        } else if (!comparator(mapN[id], mapO[id])) {
          delta.changed.push(mapN[id]);
        }
      }

      // New attributes cannot be mapped by id as the id is undefined and
      // there may be more than 1 new item
      for (var k in n) {
        if (!n[k].id) { // new?
          delta.added.push(n[k]);
        }
      }

      return delta;
    }


    // Public API
    return {
      bind: service.bind
    };
  });

