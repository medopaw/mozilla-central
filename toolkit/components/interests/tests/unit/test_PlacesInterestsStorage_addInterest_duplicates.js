/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

function run_test() {
  run_next_test();
}

// Test that ids for interests increase by 1
add_task(function checkSequentialIds() {
  // Add some stuff in repeats in various orders
  yield addInterest("cars");
  yield addInterest("cars");
  yield addInterest("sports");
  yield addInterest("cars");
  yield addInterest("sports");
  yield addInterest("shopping");

  // Explicitly query for the id because it's not exposed through APIs
  yield PlacesInterestsStorage._execute(
    "SELECT id, interest FROM moz_interests ORDER BY id ASC",
    {columns: ["id", "interest"]}
  ).then(results => {
    isIdentical([{"id":1,"interest":"cars"},{"id":2,"interest":"sports"},{"id":3,"interest":"shopping"}], results);
  });
});
