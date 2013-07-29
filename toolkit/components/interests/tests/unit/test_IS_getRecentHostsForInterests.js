/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

//Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/InterestsStorage.jsm");
XPCOMUtils.defineLazyServiceGetter(this, "gHistory", "@mozilla.org/browser/history;1", "mozIAsyncHistory");

function run_test() {
  run_next_test();
}

add_task(function test_GetRecentHostsForInterests()
{
  yield addInterest("computers");
  yield addInterest("real-estate");

  yield promiseAddUrlInterestsVisit("http://techmeme.com", ["computers"], 1, 1);
  yield promiseAddUrlInterestsVisit("http://realtor.com", ["real-estate"], 2, 13);
  yield promiseAsyncUpdates();

  let results;

  results = yield InterestsStorage.getRecentHostsForInterests(["computers"], 7);
  isIdentical([{"interest":"computers","host":"techmeme.com"}], results);
  
  /** testing bounds **/
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate"], 13);
  isIdentical([], results);
 
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate"], 14);
  isIdentical([{"interest":"real-estate","host":"realtor.com"}], results);

  /** multi-result **/
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 7);
  isIdentical([{"interest":"computers","host":"techmeme.com"}], results);

  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 14);
  isIdentical([{"interest":"computers","host":"techmeme.com"},{"interest":"real-estate","host":"realtor.com"}], results);
});
