/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_PlacesInterestsStorage_sharedInterests()
{
  yield addInterest("cars");
  yield addInterest("movies");
  yield addInterest("technology");

  let now = Date.now();
  let today = PlacesInterestsStorage._convertDateToDays(now);
  let results;

  // nothig was shared - results are empty
  yield PlacesInterestsStorage.getHostsForSharedInterests(["cars"]).then(results => {
    do_check_eq(results.length, 0);
  });

  yield PlacesInterestsStorage.getPersonalizedHosts().then(results => {
    do_check_eq(results.length, 0);
  });

  //make a bunch of insertions
  yield PlacesInterestsStorage.setSharedInterest("movies","foo.com");
  yield PlacesInterestsStorage.setSharedInterest("movies","baz.com",now - MS_PER_DAY*2);
  yield PlacesInterestsStorage.setSharedInterest("movies","bar.com",now - MS_PER_DAY);
  yield PlacesInterestsStorage.setSharedInterest("cars","foo.com");
  yield PlacesInterestsStorage.setSharedInterest("cars","baz.com",now - MS_PER_DAY*2);
  yield PlacesInterestsStorage.setSharedInterest("cars","bar.com",now - MS_PER_DAY);

  yield PlacesInterestsStorage.getHostsForSharedInterests(["cars","movies"]).then(results => {
    isIdentical(results,[
                          {"interest":"cars","host":"foo.com","day":today},
                          {"interest":"cars","host":"bar.com","day":today-1},
                          {"interest":"cars","host":"baz.com","day":today-2},
                          {"interest":"movies","host":"foo.com","day":today},
                          {"interest":"movies","host":"bar.com","day":today-1},
                          {"interest":"movies","host":"baz.com","day":today-2},
                        ]);
  });

  yield PlacesInterestsStorage.getPersonalizedHosts().then(results => {
    isIdentical(results,[
                          {"interest":"movies","host":"foo.com","day":today},
                          {"interest":"cars","host":"foo.com","day":today},
                          {"interest":"movies","host":"bar.com","day":today-1},
                          {"interest":"cars","host":"bar.com","day":today-1},
                          {"interest":"movies","host":"baz.com","day":today-2},
                          {"interest":"cars","host":"baz.com","day":today-2},
                        ]);
  });

});
