/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/NetUtil.jsm");


// Import common head.
let (commonFile = do_get_file("../../../places/tests/head_common.js", false)) {
  let uri = Services.io.newFileURI(commonFile);
  Services.scriptloader.loadSubScript(uri.spec, this);
}

// Put any other stuff relative to this test folder below.

const MS_PER_DAY = 86400000;
const MICROS_PER_DAY = 86400000000;

function isAddInterest(interestsStorage,interest) {
  return interestsStorage.setInterest(interest, {});
}

function isPromiseClearInterests(interestsStorage) {
  let promises = [];
  promises.push(interestsStorage._execute("DELETE FROM moz_interests"));
  promises.push(interestsStorage._execute("DELETE FROM moz_interests_visits"));
  return Promise.promised(Array)(promises).then();
}

function isPromiseAddInterestsVisits(interestsStorage,aVisitInfo) {
  let visits = [];
  if (Array.isArray(aVisitInfo)) {
    visits = visits.concat(aVisitInfo);
  } else {
    visits.push(aVisitInfo)
  }

  let visitPromises = [];
  let now = Date.now();
  visits.forEach(function(visit) {
    let uri = NetUtil.newURI(visit.url);
    let host = uri.host.replace(/^www\./, "");
    let visitTime = now - MS_PER_DAY*(visit.daysAgo || 0);
    let visitCount = visit.count || 1;
    let interests = (Array.isArray(visit.interests)) ? visit.interests : [visit.interests];

    interests.forEach(function(interest) {
      visitPromises.push(addInterest(interest));
      visitPromises.push(interestsStorage.addInterestHostVisit(interest, host, {visitCount: visitCount, visitTime: visitTime}));
    });
  });
  return Promise.promised(Array)(visitPromises).then();
}

function itemsHave(items,data) {
  for (let i in items) {
    if(items[i] == data) return true;
  }
  return false;
}

function isIdentical(expected, actual) {
  if (expected == null) {
    do_check_eq(expected, actual);
  }
  else if (typeof expected == "object") {
    // Make sure all the keys match up
    do_check_eq(Object.keys(expected).sort() + "", Object.keys(actual).sort());

    // Recursively check each value individually
    Object.keys(expected).forEach(key => {
      dump("Checking key " + key);
      isIdentical(actual[key], expected[key]);
    });
  }
  else {
    do_check_eq(expected, actual);
  }
}

function checkScores(expected, expectedZeros, interests) {
  let withScores = interests.slice(0, expected.length);
  isIdentical(expected, withScores);

  let zeroScores = interests.slice(expected.length);
  zeroScores.forEach(({name, score}) => {
    LOG("Checking 0 score for " + name);
    do_check_eq(score, 0);
  });
  do_check_eq(zeroScores.length, expectedZeros);
}

function unExposeAll(obj) {
  // Filter for Objects and Arrays.
  if (typeof obj !== "object" || !obj)
    return;

  // Recursively unexpose our children.
  Object.keys(obj).forEach(function(key) {
    unExposeAll(obj[key]);
  });

  if (obj instanceof Array)
    return;
  delete obj.__exposedProps__;
}

function dbg(datum, ending = " <===========\n") {
  dump(JSON.stringify(datum) + ending);
}

