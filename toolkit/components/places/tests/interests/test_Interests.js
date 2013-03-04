/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_PlacesInterestsStorage()
{
  yield promiseAddVisits(NetUtil.newURI("http://www.mozilla.org/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.netflix.com/"));
  yield promiseAddVisits(NetUtil.newURI("http://www.cars.com/"));

  PlacesInterestsStorage.addInterest("cars");
  PlacesInterestsStorage.addInterest("computers");
  PlacesInterestsStorage.addInterest("movies");

  PlacesInterestsStorage.addInterestVisit("cars");
  PlacesInterestsStorage.addInterestVisit("cars");

  PlacesInterestsStorage.addInterestVisit("computers");

  PlacesInterestsStorage.addInterestForHost("computers","mozilla.org");
  PlacesInterestsStorage.addInterestForHost("cars","cars.com");

  // make sure we arew getting correcrt counts in the bauskets
  let buskets = PlacesInterestsStorage.getBucketsForInterest("computers");

  do_check_true(buskets[0]["endTime"] != 0);
  do_check_eq(buskets[0]["visitCount"] , 1);

  buskets = PlacesInterestsStorage.getBucketsForInterest("cars");
  do_check_true(buskets[0]["endTime"] != 0);
  do_check_eq(buskets[0]["visitCount"] , 2);
});

