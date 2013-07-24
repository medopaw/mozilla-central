/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/InterestsStorage.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_InterestsStorage_getInterests()
{
  yield addInterest("cars");
  yield addInterest("movies");

  let results;

  // empty array
  results = yield InterestsStorage.getInterests([]);
  isIdentical({}, results);

  // non-existent interest cases
  results = yield InterestsStorage.getInterests(["eccentricity"])
  isIdentical({}, results);

  results = yield InterestsStorage.getInterests(["eccentricity", "quixotic"])
  isIdentical({}, results);

  results = yield InterestsStorage.getInterests(["cars"])
  isIdentical({"cars": {threshold: DEFAULT_THRESHOLD, duration: DEFAULT_DURATION, sharable: 1}}, results);

  // updates work as expected
  yield InterestsStorage.setInterest("cars", {threshold: 5, duration: 15, sharable: false});
  results = yield InterestsStorage.getInterests(["cars"])
  isIdentical({"cars": {threshold: 5, duration: 15, sharable: 0}}, results);

  // null for option does not change anything
  yield InterestsStorage.setInterest("cars", {threshold: null, duration: null, ignored: null});
  results = yield InterestsStorage.getInterests(["cars"])
  isIdentical({"cars": {threshold: 5, duration: 15, sharable: 0}}, results);

  // not specifying dateUpdate sets today's update time
  yield InterestsStorage.setInterest("cars", {duration: 7});
  results = yield InterestsStorage.getInterests(["cars"])
  isIdentical({"cars": {threshold: 5, duration: 7, sharable: 0}}, results);

  // can set threshold and durations to 0
  yield InterestsStorage.setInterest("cars", {threshold: 0, duration: 0, sharable: true});
  results = yield InterestsStorage.getInterests(["cars"])
  isIdentical({"cars": {threshold: 0, duration: 0, sharable: 1}}, results);
  yield InterestsStorage.setInterest("cars");
  results = yield InterestsStorage.getInterests(["cars"])
  isIdentical({"cars": {threshold: 0, duration: 0, sharable: 1}}, results);


  // INSERT cases

  // calling with an interest that doesn't exist
  let didFail = false;
  yield InterestsStorage.setInterest("idontexist", {}).then(null, () => didFail = true);
  do_check_true(didFail);
  results = yield InterestsStorage.getInterests(["idontexist"]);
  isIdentical([], results);

  // inserting with parameters works
  results = yield InterestsStorage.getInterests(["movies"]);
  isIdentical({"movies": {threshold: DEFAULT_THRESHOLD, duration: DEFAULT_DURATION, sharable: 1}}, results);
  yield InterestsStorage.setInterest("movies", {threshold:14, duration: 5});
  results = yield InterestsStorage.getInterests(["movies"])
  isIdentical({"movies": {threshold: 14, duration: 5, sharable: 1}}, results);

  // > 1 interests
  results = yield InterestsStorage.getInterests(["movies", "cars"]);
  isIdentical({"cars": {threshold: 0, duration: 0, sharable: 1}, "movies": {threshold: 14, duration: 5, sharable: 1}}, results);

  // multiple interests, one doesn't exist
  results = yield InterestsStorage.getInterests(["movies", "cars", "idontexist"]);
  isIdentical({"cars": {threshold: 0, duration: 0, sharable: 1}, "movies": {threshold: 14, duration: 5, sharable: 1}}, results);
});
