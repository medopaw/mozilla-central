/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

let iServiceObject = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
let iServiceApi = Cc["@mozilla.org/InterestsWebAPI;1"].createInstance(Ci.mozIInterestsWebAPI)
let obsereverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

function run_test() {
  run_next_test();
}

function itemsHave(items,data) {
  for (let i in items) {
    if(items[i] == data) return true;
  }
  return false;
};

add_task(function test_Interests() {

  yield promiseAddVisits(NetUtil.newURI("http://www.cars.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.mozilla.org/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.netflix.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.samsung.com/"));

  yield iServiceObject._addInterestsForHost("cars.com", ["cars" , "computers"]);
  yield iServiceObject._addInterestsForHost("cars.com", ["cars" , "movies"]);

  // check insertions
  let thePromise = PlacesInterestsStorage.getInterestsForHost("cars.com");
  yield thePromise.then(function(data) {
    // recheck the items
    do_check_eq(data.length , 3);
    do_check_true(itemsHave(data,"cars"));
    do_check_true(itemsHave(data,"movies"));
    do_check_true(itemsHave(data,"computers"));
  });

  thePromise = iServiceObject._getBucketsForInterests(["cars" , "computers"]);
  yield thePromise.then(function(data) {
    do_check_eq(data["cars"]["immediate"], 2);
    do_check_eq(data["computers"]["immediate"], 1);
  });

  // try the API
  thePromise = iServiceApi.checkInterests(["cars" , "computers"]);
  yield thePromise.then(function(data) {
    do_check_eq(data["cars"]["immediate"], 2);
    do_check_eq(data["computers"]["immediate"], 1);
  });

});

add_task(function test_ResubmitHistoryVisits() {

  let myDef = Promise.defer();
  yield iServiceObject._clearRecentInterests(100).then(function(data) {
    // test that interests are all empty
    iServiceObject._getBucketsForInterests(["cars" , "computers","movies"]).then(function(data) {
      myDef.resolve(data);
    });
  });

  yield myDef.promise.then(function(data) {
    do_check_eq(data["cars"]["immediate"], 0);
    do_check_eq(data["computers"]["immediate"], 0);
    do_check_eq(data["movies"]["immediate"], 0);
  });

  // the database is clean - repopulate it
  // clean places tables and re-insert cars.com
  const MICROS_PER_DAY = 86400000000;
  let now = Date.now();
  let microNow = now * 1000;
  yield promiseClearHistory();
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});

  myDef = Promise.defer();
  // we expect 3 rows being submitted to Interests.js for each day
  // hence count to 3 and resolve the promise then
  let count = 0;
  iServiceObject["_report_add_interest"] = function(data) {
    count++;
    if (count == 3) {
      myDef.resolve();
    }
  };

  iServiceObject.resubmitRecentHistoryVisits(60);

  yield myDef.promise;

  // so we have processed the history, let's make sure we get interests back
  yield iServiceObject._getBucketsForInterests(["cars"]).then(function(data) {
        do_check_eq(data["cars"]["immediate"], 1);
        do_check_eq(data["cars"]["recent"], 2);
        do_check_eq(data["cars"]["past"], 3);
  });
});
