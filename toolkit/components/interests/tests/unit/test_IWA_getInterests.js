/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let dbConn = InterestsStorage.db;

let iServiceApi = Cc["@mozilla.org/InterestsWebAPI;1"].createInstance(Ci.mozIInterestsWebAPI)

function run_test() {
  run_next_test();
}

add_task(function test_InterestWebAPI_getInterests()
{
  // make a bunch of insertions for a number of days
  let now = Date.now();
  let results;

  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("video-games");
  yield addInterest("history");
  yield addInterest("food");
  yield addInterest("computers");

  // this interest has custom values for duration and threshold
  yield InterestsStorage.setInterest("technology");
  /*
  */

  // no visits, empty results
  results = yield iServiceApi.getInterests([]);
  checkScores([], 0, results);

  // add visit
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});

  results = yield iServiceApi.getInterests(["cars", "movies"]);
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 1, results);

  // add another visit for the same category, same day. do not cross threshold
  yield InterestsStorage.addInterestHostVisit("cars", "auto.com", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  results = yield iServiceApi.getInterests(["cars"]);
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 0, results);

  // add more visits for the same category, same day. do cross threshold
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*1), visitCount: 3});
  results = yield iServiceApi.getInterests(["cars"]);
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 0, results);

  // add a few visits for another category, same day, new top interest
  for (i=0; i<9; i++) {
    yield InterestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*i), visitCount: 1});
  }
  results = yield iServiceApi.getInterests(["cars", "technology"]);
  unExposeAll(results);
  let scoreMax = 9;
  let calcScore = score => Math.round(score / scoreMax * 100);
  checkScores([
      {"name":"technology","score":calcScore(9),"diversity":50},
      {"name":"cars","score":calcScore(2),"diversity":100},
  ], 0, results);

  // add visits for another category, one day ago
  yield InterestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*1), visitCount: 3});
  results = yield iServiceApi.getInterests(["technology", "movies", "cars"]);
  unExposeAll(results);
  scoreMax = 9;
  checkScores([
      {"name":"technology","score":calcScore(9),"diversity":50},
      {"name":"cars","score":calcScore(2),"diversity":100},
      {"name":"movies","score": calcScore(1),"diversity":50},
  ], 0, results);

  // make interest go beyond custom threshold
  yield InterestsStorage.addInterestHostVisit("technology", "tech.com", {visitTime: (now - MS_PER_DAY*10), visitCount: 1});
  results = yield iServiceApi.getInterests(["cars", "technology", "movies"]);
  unExposeAll(results);
  scoreMax = 10;
  checkScores([
      {"name":"technology","score":calcScore(10),"diversity":100},
      {"name":"cars","score":calcScore(2),"diversity":100},
      {"name":"movies","score":calcScore(1),"diversity":50},
  ], 0, results);

  for (i=0; i<15; i++) {
    yield InterestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*i), visitCount: 3});
  }
  results = yield iServiceApi.getInterests(["cars", "movies", "technology", "video-games"]);
  unExposeAll(results);
  scoreMax = 15;
  checkScores([
      {"name":"video-games","score":calcScore(15),"diversity":50},
      {"name":"technology","score":calcScore(10),"diversity":100},
      {"name":"cars","score":calcScore(2),"diversity":100},
      {"name":"movies","score":calcScore(1),"diversity":50},
  ], 0, results);

  // add a couple more interest visits to get top 5. food will show, history won't show up
  yield InterestsStorage.addInterestHostVisit("food", "food.com", {visitTime: (now - MS_PER_DAY*15), visitCount: 5});
  yield InterestsStorage.addInterestHostVisit("food", "food.com", {visitTime: (now - MS_PER_DAY*16), visitCount: 5});
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*16), visitCount: 5});
  yield InterestsStorage.addInterestHostVisit("history", "history.com", {visitTime: (now - MS_PER_DAY*16), visitCount: 5});
  yield InterestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*3), visitCount: 3});
  results = yield iServiceApi.getInterests(["cars", "technology", "movies", "video-games", "food"]);
  unExposeAll(results);
  checkScores([
      {"name":"video-games","score":calcScore(15),"diversity":50},
      {"name":"technology","score":calcScore(10),"diversity":100},
      {"name":"cars","score":calcScore(3),"diversity":100},
      {"name":"movies","score":calcScore(2),"diversity":50},
      {"name":"food","score":calcScore(2),"diversity":50},
  ], 0, results);

  yield InterestsStorage.clearRecentVisits(100);
  // add visits to a category beyond test threshold, i.e. 29 days and beyond
  // the category should not show up
  yield InterestsStorage.addInterestHostVisit("history", "history.com", {visitTime: (now - MS_PER_DAY*29), visitCount: 5});
  results = yield iServiceApi.getInterests(["cars", "technology", "video-games"]);
  unExposeAll(results);
  checkScores([], 3, results);

  // add visits within test-threshold
  yield InterestsStorage.addInterestHostVisit("history", "history.com", {visitTime: (now - MS_PER_DAY*15), visitCount: 5});
  results = yield iServiceApi.getInterests(["cars", "history"]);
  unExposeAll(results);
  checkScores([
      {"name":"history","score":100,"diversity":100},
  ], 1, results);

  yield InterestsStorage.clearRecentVisits(100);
  yield InterestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*1), visitCount: 5});
  results = yield iServiceApi.getInterests(["cars", "technology"]);
  unExposeAll(results);
  checkScores([
      {"name":"technology","score":100,"diversity":100},
  ], 1, results);

  yield InterestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*2), visitCount: 5});
  results = yield iServiceApi.getInterests(["technology", "cars"]);
  unExposeAll(results);
  checkScores([
      {"name":"technology","score":100,"diversity":100},
  ], 1, results);
});

add_task(function test_sharable() {
  let results;
  // Clear out previous test state
  yield InterestsStorage.clearRecentVisits(30);

  // interests set with default values for threshold and duration
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("technology");

  // Add some test visits and hosts
  yield InterestsStorage.addInterestHostVisit("cars", "cars.com");

  results = yield iServiceApi.getInterests(["computers", "technology", "cars"]);
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":100},
  ], 2, results);

  LOG("Unshare the one interest with non-zero score and everything should be 0");
  yield InterestsStorage.setInterest("cars", {sharable: false});
  results = yield iServiceApi.getInterests(["computers", "technology", "cars"]);
  checkScores([], 3, results);
});
