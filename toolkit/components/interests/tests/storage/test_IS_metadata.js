/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

add_task(function test_IS_metadata()
{
  yield addInterest("cars");
  yield addInterest("movies");

  let results;

  // empty array
  results = yield gInterestsStorage.getInterests([]);
  isIdentical({}, results);

  // non-existent interest cases
  results = yield gInterestsStorage.getInterests(["eccentricity"]);
  isIdentical({}, results);

  results = yield gInterestsStorage.getInterests(["eccentricity", "quixotic"]);
  isIdentical({}, results);

  results = yield gInterestsStorage.getInterests(["cars"]);
  isIdentical({"cars": {sharable: 1}}, results);

  // updates work as expected
  yield gInterestsStorage.setInterest("cars", {sharable: false});
  results = yield gInterestsStorage.getInterests(["cars"]);
  isIdentical({"cars": {sharable: 0}}, results);

  yield gInterestsStorage.setInterest("cars", {sharable: true});
  results = yield gInterestsStorage.getInterests(["cars"]);
  isIdentical({"cars": {sharable: 1}}, results);


  // INSERT cases

  // calling with an interest that doesn't exist
  results = yield gInterestsStorage.getInterests(["idontexist"]);
  isIdentical([], results);

  // > 1 interests
  results = yield gInterestsStorage.getInterests(["movies", "cars"]);
  isIdentical({"cars": {sharable: 1}, "movies": {sharable: 1}}, results);

  // multiple interests, one doesn't exist
  results = yield gInterestsStorage.getInterests(["movies", "cars", "idontexist"]);
  isIdentical({"cars": {sharable: 1}, "movies": {sharable: 1}}, results);
});
