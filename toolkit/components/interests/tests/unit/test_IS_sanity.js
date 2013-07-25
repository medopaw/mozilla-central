/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/InterestsStorage.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

let observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);

function run_test() {
  run_next_test();
}

add_task(function test_IS_sanity() {

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

  thePromise = InterestsStorage.getBucketsForInterests(["cars" , "computers"]);
  yield thePromise.then(function(data) {
    do_check_eq(data["cars"]["immediate"], 2);
    do_check_eq(data["computers"]["immediate"], 1);
  });

});
