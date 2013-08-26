/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let iServiceApi = Cc["@mozilla.org/InterestsWebAPI;1"].createInstance(Ci.mozIInterestsWebAPI)

function run_test() {
  run_next_test();
}

add_task(function test_InterestWebAPI_getTopInterests()
{
  // make a bunch of insertions for a number of days
  let now = Date.now();
  let results;
  let interestsStorage = yield iServiceObject.InterestsStoragePromise;

  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("video-games");
  yield addInterest("history");
  yield addInterest("food");
  yield addInterest("computers");

  // this interest has custom values for duration and threshold
  yield interestsStorage.setInterest("technology");
  /*
  */

  // no visits, empty results
  results = yield iServiceApi.getTopInterests();
  checkScores([], 5, results);

  // add visit
  yield interestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*0)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 4, results);

  // add another visit for the same category, same day. do not cross threshold
  yield interestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*0)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 4, results);

  // add more visits for the same category, same day. do cross threshold
  yield interestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*2)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 4, results);

  // add a few visits for another category, same day, new top interest
  yield interestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*0)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  let scoreMax = 2;
  let calcScore = score => Math.round(score / scoreMax * 100);
  checkScores([
      {"name":"cars","score":calcScore(2),"diversity":100},
      {"name":"technology","score":calcScore(1),"diversity":100},
  ], 3, results);

  // add visits for another category, one day ago
  yield interestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*1)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
      {"name":"cars","score":calcScore(2),"diversity":100},
      {"name":"movies","score": calcScore(1),"diversity":100},
      {"name":"technology","score":calcScore(1),"diversity":100},
  ], 2, results);

  // add visits to the same category over multiple days
  yield interestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*0)});
  yield interestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*1)});
  yield interestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*2)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  scoreMax = 3;
  checkScores([
      {"name":"video-games","score":calcScore(3),"diversity":100},
      {"name":"cars","score":calcScore(2),"diversity":100},
      {"name":"movies","score":calcScore(1),"diversity":100},
      {"name":"technology","score":calcScore(1),"diversity":100},
  ], 1, results);

  // add a couple more interest visits to get top 5. food will show, history won't show up
  yield interestsStorage.addInterestHostVisit("movies", "netflix.com", {visitTime: (now - MS_PER_DAY*1)});
  yield interestsStorage.addInterestHostVisit("food", "food.com", {visitTime: (now - MS_PER_DAY*15)});
  yield interestsStorage.addInterestHostVisit("food", "food.com", {visitTime: (now - MS_PER_DAY*16)});
  yield interestsStorage.addInterestHostVisit("technology", "foo.com", {visitTime: (now - MS_PER_DAY*17)});
  yield interestsStorage.addInterestHostVisit("history", "history.com", {visitTime: (now - MS_PER_DAY*18)});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
      {"name":"video-games","score":calcScore(3),"diversity":50},
      {"name":"cars","score":calcScore(2),"diversity":50},
      {"name":"food","score":calcScore(2),"diversity":50},
      {"name":"technology","score":calcScore(2),"diversity":100},
      {"name":"movies","score":calcScore(1),"diversity":100},
  ], 0, results);

  yield interestsStorage.clearRecentVisits(100);
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([], 5, results);

});

add_task(function test_sharable() {
  let results;
  let interestsStorage = yield iServiceObject.InterestsStoragePromise;

  // Clear out previous test state
  yield interestsStorage.clearRecentVisits(30);

  // interests set with default values for threshold and duration
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("video-games");
  yield addInterest("history");
  yield addInterest("food");
  yield addInterest("computers");

  // Add some test visits and hosts
  yield interestsStorage.addInterestHostVisit("cars", "cars.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 4, results);

  LOG("Unshare the one interest with non-zero score and everything should be 0");
  yield interestsStorage.setInterest("cars", {sharable: false});
  results = yield iServiceApi.getTopInterests();
  checkScores([], 5, results);
});
