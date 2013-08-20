/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

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
  yield promiseAddUrlInterestsVisit("http://realtor.com", ["real-estate"], 2, 14);
  yield promiseAddUrlInterestsVisit("http://mls.com", ["real-estate"], 1, 15);
  yield promiseAsyncUpdates();

  let results;

  results = yield InterestsStorage.getRecentHostsForInterests(["computers"], 7);
  isIdentical([{"interest":"computers","host":"techmeme.com", "visits": 1}], results);
  
  /** testing bounds **/
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate"], 13);
  isIdentical([], results);
 
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate"], 14);
  isIdentical([{"interest":"real-estate","host":"realtor.com", "visits": 2}], results);

  /** Testing the summation of interests over a multiple days **/
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate"], 15);
  isIdentical([{"interest":"real-estate","host":"realtor.com", "visits": 4}], results);

  /** Multiple hosts for the same interest **/
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate"], 16);
  isIdentical([{"interest":"real-estate","host":"realtor.com", "visits": 4}, {"interest":"real-estate","host":"mls.com", "visits": 1}], results);

  /** multiple interests **/

  // an interest not matching within the time limit
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 7);
  isIdentical([{"interest":"computers","host":"techmeme.com", "visits": 1}], results);

  // two matching
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 14);
  isIdentical([{"interest":"computers","host":"techmeme.com","visits":1},{"interest":"real-estate","host":"realtor.com","visits":2}], results);

  // multiple hosts and multiple interests
  results = yield InterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 16);
  isIdentical([{"interest":"computers","host":"techmeme.com","visits":1},{"interest":"real-estate","host":"realtor.com","visits":4},{"interest":"real-estate","host":"mls.com","visits":1}], results);
});
