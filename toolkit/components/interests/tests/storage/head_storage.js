/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/interests/InterestsStorage.jsm");
Cu.import("resource://gre/modules/interests/InterestsDatabase.jsm");

// Import common head.
let (commonFile = do_get_file("../head_common.js", false)) {
  let uri = Services.io.newFileURI(commonFile);
  Services.scriptloader.loadSubScript(uri.spec, this);
}

// Put any other stuff relative to this test folder below.
let gInterestsStorage = null;

function initStorage() {
  dump("MAKING CONNECTION \n");
  return InterestsDatabase.DBConnectionPromise.then(connection => {
    dump("CONNECTION ESTABLISHED\n");
    gInterestsStorage = new InterestsStorage(connection);
    return gInterestsStorage;
  });
}

function addInterest(interest) {
  return isAddInterest(gInterestsStorage,interest);
}

function getHostsForInterest(interest) {
  return gInterestsStorage._execute(
    "SELECT DISTINCT(iv.host) AS host FROM moz_interests i, moz_interests_visits iv " +
    "WHERE i.interest = :interest AND i.id = iv.interest_id", {
    columns: "host",
    params: {
      interest: interest,
    },
  });
}

function getInterestsForHost(host) {
  return gInterestsStorage._execute(
    "SELECT DISTINCT(interest) AS interest FROM moz_interests i, moz_interests_visits iv " +
    "WHERE iv.host = :host AND i.id = iv.interest_id", {
    columns: "interest",
    params: {
      host: host,
    },
  });
}

function promiseClearInterests() {
  return isPromiseClearInterests();
}

function promiseAddInterestsVisits(aVisitInfo) {
  return isPromiseAddInterestsVisits(gInterestsStorage,aVisitInfo);
}

function promiseAddInterestsVisit(url,interests,count,daysAgo) {
  return promiseAddInterestsVisits(
    { url: url,
      interests: interests,
      count: count || 1,
      daysAgo: daysAgo || 0
    });
}

function bulkAddInterestVisitsToSite(data) {
  let visitObjects = [];
  data.forEach(object => {
    visitObjects.push({
      url: object.url,
      interests: object.interests,
      count: object.count || 1,
      daysAgo: object.daysAgo || 0
    });
  });
  return promiseAddInterestsVisits(visitObjects);
}

