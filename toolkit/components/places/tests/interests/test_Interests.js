/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

let iServiceObject = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
let iServiceApi = Cc["@mozilla.org/InterestsWebAPI;1"].createInstance(Ci.mozIInterestsWebAPI)
let obsereverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
let deferEnsureResults;


function run_test() {
  run_next_test();
}

add_task(function test_Interests() {

  yield promiseAddVisits(NetUtil.newURI("http://www.cars.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.mozilla.org/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.netflix.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.samsung.com/"));

  yield iServiceObject._addInterestsForHost("cars.com", ["cars" , "computers"]);
  yield iServiceObject._addInterestsForHost("cars.com", ["cars" , "movies"]);

  // check insertions
  let thePromise = PlacesInterestsStorage.getInterestsForHost("cars.com");
  yield thePromise;

  thePromise.then(function(items) {
    // recheck the items
    // dump( items.join(" ") + " <<<<<<<<<<<\n");
    do_check_eq(items.length , 3);
    do_check_true(itemsHave("cars"));
    do_check_true(itemsHave("movies"));
    do_check_true(itemsHave("computers"));
  });

  thePromise = iServiceObject._getBucketsForInterests(["cars" , "computers"]);

  yield thePromise;

  thePromise.then(function(data) {
    //dump(JSON.stringify(data) + " ------------------\n");
    do_check_eq(data["cars"][0]["visitCount"], 2);
    do_check_eq(data["computers"][0]["visitCount"], 1);
  });

  // try the API
  iServiceApi.checkInterests(["cars" , "computers"],function(rv) {
     //dump(JSON.stringify(rv) + " xxxxxxxxxxxxx\n");
  });

  thePromise = PlacesInterestsStorage.getInterestsForHost("cars.com");
  yield thePromise;
});
