/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_task(function test_ClearRecentVisits()
{
  yield promiseAddInterestsVisit("http://www.cars.com/", ["cars","movies","shopping"], 2);
  yield promiseAddInterestsVisit("http://www.samsung.com/", "consumer-electronics");
  yield promiseAddInterestsVisit("http://www.mozilla.org/", "computers");

  // cleanup the tables
  yield gInterestsStorage.clearRecentVisits(100);

  // check that tables are empty
  let expectedScore = 0;
  yield gInterestsStorage.getScoresForInterests(["computers"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield getInterestsForHost("cars.com").then(function(results) {
    do_check_eq(results.length, 0);
  });

  // make a bunch of insertions for a number of days
  for(let i = 0; i < 100; i++) {
    yield promiseAddInterestsVisit("http://www.cars.com/", "cars", 1, i);
    expectedScore ++;
  }

  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 1);
    do_check_eq(results[0] , "cars.com");
  });

  // test deletions
  yield gInterestsStorage.clearRecentVisits(14);
  expectedScore -= 14;

  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 1);
    do_check_eq(results[0] , "cars.com");
  });

  yield gInterestsStorage.clearRecentVisits(28);
  expectedScore -= 14;

  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield gInterestsStorage.clearRecentVisits(101);
  expectedScore = 0;

  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield gInterestsStorage.clearRecentVisits(100);

  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield gInterestsStorage.clearRecentVisits(100);

  // test visitCounts when adding visits

  // add one today
  yield promiseAddInterestsVisit("http://www.cars.com/", "cars");
  expectedScore = 1;
  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  // add a couple more yesterday
  yield promiseAddInterestsVisit("http://www.cars.com/","cars", 1, 1);
  yield promiseAddInterestsVisit("http://www.cars.com/","cars", 1, 2);
  yield promiseAddInterestsVisit("http://www.cars.com/","cars", 1, 3);
  expectedScore += 3;
  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    do_check_eq(results[0].score, expectedScore);
  });

  yield promiseAddInterestsVisit("http://www.cars.com/","cars", 5, 15);
  yield promiseAddInterestsVisit("http://www.cars.com/","cars", 10, 31);
  expectedScore += 2;
  yield gInterestsStorage.getScoresForInterests(["cars"]).then(function(results) {
    // comparing rounded scores due to numerical error
    do_check_eq(results[0].score.toFixed(5), expectedScore.toFixed(5));
  });

  yield gInterestsStorage.clearRecentVisits(100);
  yield getInterestsForHost("cars.com").then(function(results) {
    do_check_eq(results.length, 0);
  });

});
