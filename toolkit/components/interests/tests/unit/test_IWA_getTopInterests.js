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

add_task(function test_InterestWebAPI_getTopInterests()
{
  // make a bunch of insertions for a number of days
  let now = Date.now();
  let results;

  yield promiseAddVisitsWithRefresh(["http://www.cars.com/",
                                     "http://www.mozilla.org/",
                                     "http://www.netflix.com/",
                                     "http://www.samsung.com/"
                                    ]);
  // interests set with default values for threshold and duration
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("video-games");
  yield addInterest("history");
  yield addInterest("food");
  yield addInterest("computers");

  // this interest has custom values for duration and threshold
  yield InterestsStorage.setInterest("technology", {duration: 20, threshold: 10});
  /*
  */

  // no visits, empty results
  results = yield iServiceApi.getTopInterests();
  checkScores([], 5, results);

  // add visit
  yield InterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  yield InterestsStorage.addInterestHost("cars", "cars.com");
  yield InterestsStorage.addInterestHost("movies", "netflix.com");
  yield InterestsStorage.addInterestHost("computers", "mozilla.org");
  yield InterestsStorage.addInterestHost("technology", "samsung.com");

  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":25},
  ], 4, results);

  // add another visit for the same category, same day. do not cross threshold
  yield InterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  yield InterestsStorage.addInterestHost("cars", "netflix.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":50},
  ], 4, results);

  // add more visits for the same category, same day. do cross threshold
  yield InterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*0), visitCount: 3});
  yield InterestsStorage.addInterestHost("cars", "samsung.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":75},
  ], 4, results);

  // add a few visits for another category, same day, new top interest
  yield InterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*0), visitCount: 9});

  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  let scoreMax = 9;
  let calcScore = score => Math.round(score / scoreMax * 100);
  checkScores([
      {"name":"technology","score":calcScore(9),"diversity":25},
      {"name":"cars","score":calcScore(5),"diversity":75},
  ], 3, results);

  // add visits for another category, one day ago

  yield InterestsStorage.addInterestVisit("movies", {visitTime: (now - MS_PER_DAY*1), visitCount: 3});
  yield InterestsStorage.addInterestHost("movies", "netflix.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  scoreMax = 9;
  checkScores([
      {"name":"technology","score":calcScore(9),"diversity":25},
      {"name":"cars","score":calcScore(5),"diversity":75},
      {"name":"movies","score": calcScore(scoreDecay(3, 1, 28)),"diversity":25},
  ], 2, results);

  // make interest go beyond custom threshold
  yield InterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  scoreMax = 10;
  checkScores([
      {"name":"technology","score":calcScore(10),"diversity":25},
      {"name":"cars","score":calcScore(5),"diversity":75},
      {"name":"movies","score":calcScore(scoreDecay(3, 1, 28)),"diversity":25},
  ], 2, results);

  // add visits to the same category over multiple days
  yield InterestsStorage.addInterestVisit("video-games", {visitTime: (now - MS_PER_DAY*0), visitCount: 15});
  yield InterestsStorage.addInterestVisit("video-games", {visitTime: (now - MS_PER_DAY*1), visitCount: 5});
  yield InterestsStorage.addInterestVisit("video-games", {visitTime: (now - MS_PER_DAY*2), visitCount: 3});
  yield InterestsStorage.addInterestHost("video-games", "cars.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  scoreMax = 15 + scoreDecay(5, 1, 28) + scoreDecay(3, 2, 28);
  checkScores([
      {"name":"video-games","score":calcScore(15 + scoreDecay(5, 1, 28) + scoreDecay(3, 2, 28)),"diversity":25},
      {"name":"technology","score":calcScore(10),"diversity":25},
      {"name":"cars","score":calcScore(5),"diversity":75},
      {"name":"movies","score":calcScore(scoreDecay(3, 1, 28)),"diversity":25},
  ], 1, results);

  // add a couple more interest visits to get top 5. food will show, history won't show up
  yield InterestsStorage.addInterestVisit("food", {visitTime: (now - MS_PER_DAY*15), visitCount: 5});
  yield InterestsStorage.addInterestVisit("history", {visitTime: (now - MS_PER_DAY*16), visitCount: 5});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  scoreMax = 15 + scoreDecay(5, 1, 28) + scoreDecay(3, 2, 28);
  checkScores([
      {"name":"video-games","score":calcScore(15 + scoreDecay(5, 1, 28) + scoreDecay(3, 2, 28)),"diversity":25},
      {"name":"technology","score":calcScore(10),"diversity":25},
      {"name":"cars","score":calcScore(5),"diversity":75},
      {"name":"movies","score":calcScore(scoreDecay(3, 1, 28)),"diversity":25},
      {"name":"food","score":calcScore(scoreDecay(5, 15, 28)),"diversity":0},
  ], 0, results);

  yield InterestsStorage.clearRecentVisits(100);
  // add visits to a category beyond test threshold, i.e. 29 days and beyond
  // the category should not show up
  yield promiseAddVisitsWithRefresh(["http://www.site1.com/",
                                     "http://www.site2.com/",
                                     "http://www.site3.com/"
                                    ]);
  yield InterestsStorage.addInterestVisit("history", {visitTime: (now - MS_PER_DAY*29), visitCount: 5});
  yield InterestsStorage.addInterestHost("history", "site1.com");
  yield InterestsStorage.addInterestHost("history", "site2.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([], 5, results);

  // add visits within test-threshold
  yield InterestsStorage.addInterestVisit("history", {visitTime: (now - MS_PER_DAY*15), visitCount: 5});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
      {"name":"history","score":100,"diversity":33},
  ], 4, results);

  yield InterestsStorage.clearRecentVisits(100);
  // add visits to a category beyond custom threshold, i.e. 40 days and beyond, and 10 in threshold
  // the category should not show up
  yield InterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*41), visitCount: 10});
  yield InterestsStorage.addInterestHost("technology", "site1.com");
  yield InterestsStorage.addInterestHost("technology", "site2.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([], 5, results);

  // add visits within test-threshold
  yield InterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*28), visitCount: 5});
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
      {"name":"technology","score":100,"diversity":50},
  ], 4, results);

  yield InterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*28), visitCount: 5});
  yield InterestsStorage.addInterestHost("technology", "site3.com");
  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
      {"name":"technology","score":100,"diversity":57},
  ], 4, results);
});

add_task(function test_sharable() {
  let results;

  // Clear out previous test state
  yield promiseClearHistory();
  yield clearInterestsHosts();
  yield InterestsStorage.clearRecentVisits(30);

  // Add some hosts
  yield promiseAddVisitsWithRefresh(["http://www.cars.com/",
                                     "http://www.mozilla.org/",
                                     "http://www.netflix.com/",
                                     "http://www.samsung.com/"
                                    ]);

  // interests set with default values for threshold and duration
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("video-games");
  yield addInterest("history");
  yield addInterest("food");
  yield addInterest("computers");

  // Add some test visits and hosts
  yield InterestsStorage.addInterestVisit("cars");
  yield InterestsStorage.addInterestHost("cars", "cars.com");
  yield InterestsStorage.addInterestHost("movies", "netflix.com");
  yield InterestsStorage.addInterestHost("computers", "mozilla.org");
  yield InterestsStorage.addInterestHost("technology", "samsung.com");

  results = yield iServiceApi.getTopInterests();
  unExposeAll(results);
  checkScores([
    {"name":"cars","score":100,"diversity":25},
  ], 4, results);

  LOG("Unshare the one interest with non-zero score and everything should be 0");
  yield InterestsStorage.setInterest("cars", {sharable: false});
  results = yield iServiceApi.getTopInterests();
  checkScores([], 5, results);
});
