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


add_task(function test_getHostsForInterest() {
  yield promiseClearHistory();
  yield promiseAddUrlInterestsVisit("http://www.cars.com/", "cars");
  yield promiseAddUrlInterestsVisit("http://www.samsung.com/", "computers");
  yield promiseAddUrlInterestsVisit("http://www.netflix.com/", "movies");

  yield getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length, 1);
    do_check_eq(results[0], "cars.com");
  });

  yield getHostsForInterest("computers").then(function(results) {
    do_check_eq(results.length, 1);
    do_check_eq(results[0], "samsung.com");
  });

  yield getHostsForInterest("movies").then(function(results) {
    do_check_eq(results.length, 1);
    do_check_eq(results[0], "netflix.com");
  });

});
