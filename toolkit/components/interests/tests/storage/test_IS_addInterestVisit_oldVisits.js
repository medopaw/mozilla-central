/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

function run_test() {
  yield initStorage();
  run_next_test();
}

// Test adding interest visits going older in time
add_task(function addGoingOlder() {
  let interest = "cars";
  yield addInterest(interest);

  let expectedScore = 1;

  // Add one visit for now and make sure there's only one
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com");
  yield gInterestsStorage.getScoresForInterests([interest]).then(function(result) {
    do_check_eq(result[0].score, expectedScore);
  });

  // Add a couple visits from 3 weeks ago
  let recentTime = Date.now() - 21 * MS_PER_DAY;
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime});
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime - MS_PER_DAY});

  expectedScore += 2;

  yield gInterestsStorage.getScoresForInterests([interest]).then(function(result) {
    do_check_eq(result[0].score, expectedScore);
  });

  // Add a few visits from 5 weeks ago. should not change the score
  let pastTime = Date.now() - 35 * MS_PER_DAY;
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: pastTime});
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: pastTime});
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: pastTime});
  expectedScore += 1;

  yield gInterestsStorage.getScoresForInterests([interest]).then(function(result) {
    do_check_eq(result[0].score, expectedScore);
  });
});

// Test adding interest visits going more recent in time
add_task(function addGoingNewer() {
  let interest = "sports";
  yield addInterest(interest);

  let pastTime = Date.now() - 35 * MS_PER_DAY;
  let expectedScore = 1;

  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: pastTime});
  yield gInterestsStorage.getScoresForInterests([interest]).then(function(result) {
    do_check_eq(result[0].score, expectedScore);
  });

  // Add a couple visits from 3 weeks ago
  let recentTime = Date.now() - 21 * MS_PER_DAY;
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime});
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime - MS_PER_DAY});

  expectedScore += 2;

  yield gInterestsStorage.getScoresForInterests([interest]).then(function(result) {
    do_check_eq(result[0].score, expectedScore);
  });

  // Add a few visits for now
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime - MS_PER_DAY * 2});
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime - MS_PER_DAY * 3});
  yield gInterestsStorage.addInterestHostVisit(interest,"foo.com", {visitTime: recentTime - MS_PER_DAY * 4});

  expectedScore += 3;

  yield gInterestsStorage.getScoresForInterests([interest]).then(function(result) {
    do_check_eq(result[0].score, expectedScore);
  });
});
