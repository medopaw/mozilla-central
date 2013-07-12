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

add_task(function test_refreshFrecentHosts()
{
  yield promiseAddVisitsWithRefresh(["http://www.cars.com/",
                                     "http://www.mozilla.org/",
                                     "http://www.netflix.com/",
                                     "http://www.samsung.com/"]);

  let ret = yield PlacesInterestsStorage._execute("SELECT id,host from moz_interests_frecent_hosts", {
      columns: ["id" , "host"],
  });
  isIdentical(ret,[{"id":1,"host":"cars.com"},{"id":2,"host":"mozilla.org"},{"id":3,"host":"netflix.com"},{"id":4,"host":"samsung.com"}]);
});

