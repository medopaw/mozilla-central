/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

XPCOMUtils.defineLazyServiceGetter(this, "gHistory", "@mozilla.org/browser/history;1", "mozIAsyncHistory");

add_task(function test_GetRecentHostsForInterests()
{
  yield addInterest("computers");
  yield addInterest("real-estate");

  yield promiseAddInterestsVisit("http://techmeme.com", ["computers"], 1, 1);
  yield promiseAddInterestsVisit("http://realtor.com", ["real-estate"], 2, 13);
  yield promiseAddInterestsVisit("http://realtor.com", ["real-estate"], 2, 14);
  yield promiseAddInterestsVisit("http://mls.com", ["real-estate"], 1, 15);
  yield promiseAddInterestsVisit("http://zillow.com", ["real-estate"], 1, 100);
  yield promiseAsyncUpdates();

  let results;

  results = yield gInterestsStorage.getRecentHostsForInterests(["computers"], 7);
  isIdentical([{"interest":"computers","host":"techmeme.com","days":1,"visits":1}], results);
  
  /** testing bounds **/
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate"], 13);
  isIdentical([], results);
 
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate"], 14);
  isIdentical([{"interest":"real-estate","host":"realtor.com","days":1,"visits":2}], results);

  /** Testing the summation of interests over a multiple days **/
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate"], 15);
  isIdentical([{"interest":"real-estate","host":"realtor.com","days":2,"visits":4}], results);

  /** Multiple hosts for the same interest **/
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate"], 16);
  isIdentical([{"interest":"real-estate","host":"realtor.com","days":2,"visits":4}, {"interest":"real-estate","host":"mls.com","days":1,"visits":1}], results);

  /** multiple interests **/

  // an interest not matching within the time limit
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 7);
  isIdentical([{"interest":"computers","host":"techmeme.com","days":1,"visits":1}], results);

  // two matching
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 14);
  isIdentical([{"interest":"computers","host":"techmeme.com","days":1,"visits":1},{"interest":"real-estate","host":"realtor.com","days":1,"visits":2}], results);

  // multiple hosts and multiple interests
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], 16);
  isIdentical([{"interest":"computers","host":"techmeme.com","days":1,"visits":1},{"interest":"real-estate","host":"realtor.com","days":2,"visits":4},{"interest":"real-estate","host":"mls.com","days":1,"visits":1}], results);

  // multiple hosts and multiple interests no time limit
  results = yield gInterestsStorage.getRecentHostsForInterests(["real-estate", "computers"], Infinity);
  isIdentical([{"interest":"computers","host":"techmeme.com","days":1,"visits":1},{"interest":"real-estate","host":"realtor.com","days":2,"visits":4},{"interest":"real-estate","host":"mls.com","days":1,"visits":1},{"interest":"real-estate","host":"zillow.com","days":1,"visits":1}], results);
});
