/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

function run_test() {
  run_next_test();
}

function addInterestVisitsToSite(site,interest,count) {
  let promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(promiseAddUrlInterestsVisit(site,interest));
  }
  return Promise.promised(Array)(promises).then();
}

add_task(function test_PlacesInterestsStorageMostFrecentHosts() {
  yield promiseClearHistory();
  yield PlacesInterestsStorage.clearInterestsHosts();

  for (let i = 1; i <= 210; i++) {
    let site = "http://" + i + ".site.com";
    if (i<=200) yield addInterestVisitsToSite(site,"cars",2);
    else        yield addInterestVisitsToSite(site,"cars",1);
  }

  // moz_hosts table now looks like this
  // id|name|frecency
  // 1|1.site.com|200
  // 2|2.site.com|200
  // ....
  // 200|200.site.com|200
  // 201|201.site.com|100
  // ...
  // 210|210.site.com|100
  yield PlacesInterestsStorage.getHostsForInterest("cars").then(function(results) {
    do_check_eq(results.length , 200);
    for (let i = 1; i <= 200; i++ ) {
      do_check_true(itemsHave(results, i + ".site.com"));
    }
  });
});
