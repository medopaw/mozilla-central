/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function run_test() {
  yield initStorage();
  run_next_test();
}

add_task(function test_gInterestsStorage_getTopInterest()
{
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("technology");
  yield addInterest("video-games");
  yield addInterest("history");
  yield gInterestsStorage.setInterest("ignored-interest", {sharable: false});

  // make a bunch of insertions for a number of days
  let now = Date.now();
  let results;

  // no visits, all results 0 score
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([], 5, results);

  // add visit
  yield gInterestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*0)});
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([
    {"name":"technology","score":1},
  ], 4, results);

  // add another visit for the same category, same day
  yield gInterestsStorage.addInterestHostVisit("technology", "technology.com", {visitTime: (now - MS_PER_DAY*1)});
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([
    {"name":"technology","score":2},
  ], 4, results);

  // add 3 visits for another category, same day, new top interest
  yield gInterestsStorage.addInterestHostVisit("cars", "cars.com", {visitTime: (now - MS_PER_DAY*0)});
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([
      {"name":"technology","score":2},
      {"name":"cars","score":1},
  ], 3, results);

  // add visits for another category, one day ago
  yield gInterestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*1)});
  yield gInterestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*2)});
  yield gInterestsStorage.addInterestHostVisit("movies", "movies.com", {visitTime: (now - MS_PER_DAY*3)});
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([
      {"name":"movies","score":3},
      {"name":"technology","score":2},
      {"name":"cars","score":1},
  ], 2, results);

  // get top 2 visits, test result limiting
  results = yield gInterestsStorage.getScoresForNamespace("", {interestLimit: 2});
  checkScores([
      {"name":"movies","score":3},
      {"name":"technology","score":2},
  ], 0, results);

  // add visits to the same category over multiple days
  yield gInterestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*0)});
  yield gInterestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*1)});
  yield gInterestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*2)});
  yield gInterestsStorage.addInterestHostVisit("video-games", "video-games.com", {visitTime: (now - MS_PER_DAY*3)});
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([
      {"name":"video-games","score":4},
      {"name":"movies","score":3},
      {"name":"technology","score":2},
      {"name":"cars","score":1},
  ], 1, results);

  yield gInterestsStorage.clearRecentVisits(100);
  yield gInterestsStorage.addInterestHostVisit("history", "history.com", {visitTime: (now - MS_PER_DAY*15)});
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([
      {"name":"history","score":1},
  ], 4, results);

  // add unshared interest
  yield gInterestsStorage.clearRecentVisits(100);
  yield gInterestsStorage.addInterestHostVisit("ignored-interest", "ignored-interest.com", {visitTime: (now - MS_PER_DAY*0)});
  yield gInterestsStorage.setInterest("ignored-interest", {sharable: false});

  // show ignored interests
  results = yield gInterestsStorage.getScoresForNamespace("");
  checkScores([{"name":"ignored-interest","score":1}], 4, results);

  results = yield gInterestsStorage.getScoresForNamespace("", {checkSharable: true});
  checkScores([], 5, results);
});
