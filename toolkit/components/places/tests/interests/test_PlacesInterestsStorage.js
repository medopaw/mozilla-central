/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_PlacesInterestsStorage()
{
  yield promiseAddVisits(NetUtil.newURI("http://www.cars.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.mozilla.org/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.netflix.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.samsung.com/"));

  yield PlacesInterestsStorage.addInterest("cars");
  yield PlacesInterestsStorage.addInterest("computers");
  yield PlacesInterestsStorage.addInterest("movies");
  yield PlacesInterestsStorage.addInterest("shopping");
  yield PlacesInterestsStorage.addInterest("consumer-electronics");

  yield PlacesInterestsStorage.addInterestVisit("cars");
  yield PlacesInterestsStorage.addInterestVisit("cars");
  yield PlacesInterestsStorage.addInterestVisit("computers");

  yield PlacesInterestsStorage.addInterestForHost("computers","samsung.com");
  yield PlacesInterestsStorage.addInterestForHost("computers","mozilla.org");
  yield PlacesInterestsStorage.addInterestForHost("cars","cars.com");
  yield PlacesInterestsStorage.addInterestForHost("movies","cars.com");
  yield PlacesInterestsStorage.addInterestForHost("shopping","cars.com");

  let items = [];
  function addDataItem(data) {
    items.push(data);
  };

  function itemsHave(data) {
    for (let i in items) {
      if(items[i] == data) return true;
    }
    return false;
  };

  // test row callback funcitonality
  yield PlacesInterestsStorage.getInterestsForHost("cars.com",addDataItem);
  do_check_eq(items.length , 3);
  do_check_true(itemsHave("cars"));
  do_check_true(itemsHave("movies"));
  do_check_true(itemsHave("shopping"));

  items = [];

  // test promise returning results functionality
  let thePromise = PlacesInterestsStorage.getInterestsForHost("cars.com");
  yield thePromise.then(function(results) {
    items = results;
    dump( items.join(" ") + " <<<<<<<<<<<\n");
  });

  // recheck the items
  do_check_eq(items.length , 3);
  do_check_true(itemsHave("cars"));
  do_check_true(itemsHave("movies"));
  do_check_true(itemsHave("shopping"));

  items = [];
  yield PlacesInterestsStorage.getHostsForInterest("computers",addDataItem);
  do_check_eq(items.length , 2);
  do_check_true(itemsHave("mozilla.org"));
  do_check_true(itemsHave("samsung.com"));

  // make sure we are getting correct counts in the buckets
  let buckets = [];
  thePromise = PlacesInterestsStorage.getBucketsForInterest("computers");
  yield thePromise.then(function(results) {
    buckets = results;
  });

  dump( JSON.stringify(buckets) + " <<<<==== \n");
  do_check_eq(buckets.immediate , 1);

  thePromise = PlacesInterestsStorage.getBucketsForInterest("cars");
  yield thePromise.then(function(results) {
    buckets = results;
  });

  do_check_eq(buckets.immediate, 2);
});

