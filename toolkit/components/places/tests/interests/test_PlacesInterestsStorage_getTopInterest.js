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

add_task(function test_PlacesInterestsStorage_getTopInterest()
{
  yield PlacesInterestsStorage.addInterest("cars");
  yield PlacesInterestsStorage.addInterest("movies");
  yield PlacesInterestsStorage.addInterest("technology");

  // code lifted from: https://github.com/prettycode/Object.identical.js
  function isIdentical(expected, actual, sortArrays) {
    function sort(object) {
      if (sortArrays == true && Array.isArray(object)) {
        return object.sort();
      }
      else if (typeof object != "object" || object == null) {
        return object;
      }
      return Object.keys(object).sort().map(function(key) {
        return {
          key: key,
          value: sort(object[key])
        };
      });
    }
    do_check_eq(JSON.stringify(sort(expected)), JSON.stringify(sort(actual)));
  }

  function scoreDecay(score, numDays, daysToZero) {
    return score * (1 - numDays/(daysToZero+1));
  }

  // cleanup the tables
  //yield PlacesInterestsStorage.clearTables(100);

  // make a bunch of insertions for a number of days
  const MS_PER_DAY = 86400000;
  let now = Date.now();
  let results;

  // add visit
  yield PlacesInterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  results = yield PlacesInterestsStorage.getTopInterests();
  isIdentical([{"name":"technology","score":1,"recency":{"immediate":1,"recent":0,"past":0}}], results);

  // add another visit for the same category, same day
  yield PlacesInterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  results = yield PlacesInterestsStorage.getTopInterests();
  isIdentical([{"name":"technology","score":2,"recency":{"immediate":2,"recent":0,"past":0}}], results);

  // add 3 visits for another category, same day, new top interest
  yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*0), visitCount: 3});
  results = yield PlacesInterestsStorage.getTopInterests();
  isIdentical([
      {"name":"cars","score":3,"recency":{"immediate":3,"recent":0,"past":0}},
      {"name":"technology","score":2,"recency":{"immediate":2,"recent":0,"past":0}},
  ], results);

  // add visits for another category, one day ago
  yield PlacesInterestsStorage.addInterestVisit("movies", {visitTime: (now - MS_PER_DAY*1), visitCount: 3});
  results = yield PlacesInterestsStorage.getTopInterests();
  isIdentical([
      {"name":"cars","score":3,"recency":{"immediate":3,"recent":0,"past":0}},
      {"name":"movies","score":scoreDecay(3, 1, 28),"recency":{"immediate":3,"recent":0,"past":0}},
      {"name":"technology","score":2,"recency":{"immediate":2,"recent":0,"past":0}},
  ], results);

  // get top 2 visits, test result limiting
  results = yield PlacesInterestsStorage.getTopInterests(2);
  isIdentical([
      {"name":"cars","score":3,"recency":{"immediate":3,"recent":0,"past":0}},
      {"name":"movies","score":scoreDecay(3, 1, 28),"recency":{"immediate":3,"recent":0,"past":0}},
  ], results);
});

