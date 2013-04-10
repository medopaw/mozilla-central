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

add_task(function test_Interests() {

  yield promiseAddUrlInterestsVisit("http://www.cars.com/", ["cars","movies","computers"]);
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "cars");

  // check insertions
  let thePromise = getInterestsForHost("cars.com");
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
  yield PlacesInterestsStorage.clearRecentVisits(100).then(function(data) {
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
  let now = Date.now();
  let microNow = now * 1000;
  yield promiseClearHistory();
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 15*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});
  yield promiseAddVisits({uri: NetUtil.newURI("http://www.cars.com/"), visitDate: microNow - 30*MICROS_PER_DAY});

  let promise1 = iServiceObject.resubmitRecentHistoryVisits(60);
  let promise2 = iServiceObject.resubmitRecentHistoryVisits(60);
  let promise3 = iServiceObject.resubmitRecentHistoryVisits(60);

  // all of the promisses above should be the same promise
  do_check_true(promise1 == promise2);
  do_check_true(promise1 == promise3);

  yield promise1;

  // so we have processed the history, let's make sure we get interests back
  yield iServiceObject._getBucketsForInterests(["cars"]).then(function(data) {
        do_check_eq(data["cars"]["immediate"], 1);
        do_check_eq(data["cars"]["recent"], 2);
        do_check_eq(data["cars"]["past"], 3);
  });
});

add_task(function test_Interests_Service() {
  // verify that worker is removed when the feature is disabled
  Services.prefs.setBoolPref("interests.enabled", false);
  do_check_true(iServiceObject.__worker == undefined)
  Services.prefs.setBoolPref("interests.enabled", true);
  let worker = iServiceObject._worker;
  do_check_eq(iServiceObject.__worker, worker)
});
