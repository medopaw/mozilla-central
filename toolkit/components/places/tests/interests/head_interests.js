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
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

// Import common head.
let (commonFile = do_get_file("../head_common.js", false)) {
  let uri = Services.io.newFileURI(commonFile);
  Services.scriptloader.loadSubScript(uri.spec, this);
}

// Put any other stuff relative to this test folder below.

const kValidMessages = {
  "bootstrapComplete": true,
  "swapRulesComplete": true,
  "InterestsForDocumentRules": true,
  "InterestsForDocumentText": true,
  "InterestsForDocument": true
}
Services.prefs.setBoolPref("interests.enabled", true);

const MS_PER_DAY = 86400000;
const MICROS_PER_DAY = 86400000000;

function promiseAddMultipleUrlInterestsVisits(aVisitInfo) {
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
    visitPromises.push(promiseAddVisits(uri));

    let host = uri.host.replace(/^www\./, "");
    let visitTime = now - MS_PER_DAY*(visit.daysAgo || 0);
    let visitCount = visit.count || 1;
    let interests = (Array.isArray(visit.interests)) ? visit.interests : [visit.interests];

    interests.forEach(function(interest) {
      visitPromises.push(PlacesInterestsStorage.addInterest(interest));
      visitPromises.push(PlacesInterestsStorage.addInterestVisit(interest, {visitTime: visitTime, visitCount: visitCount}));
      visitPromises.push(PlacesInterestsStorage.addInterestForHost(interest,host));
    });
  });

  return Promise.promised(Array)(visitPromises).then();
}

function promiseAddUrlInterestsVisit(url,interests,count,daysAgo) {
  return promiseAddMultipleUrlInterestsVisits(
    { url: url,
      interests: interests,
      count: count || 1,
      daysAgo: daysAgo || 0
    });
}

function promiseAddInterestVisits(interest,count,daysAgo) {
  let visitPromises = [];
  let now = Date.now();
  visitPromises.push(PlacesInterestsStorage.addInterest(interest));
  visitPromises.push(PlacesInterestsStorage.addInterestVisit(interest, {visitTime: now - MS_PER_DAY*(daysAgo || 0), visitCount: count || 1}));
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
      isIdentical(expected[key], actual[key]);
    });
  }
  else {
    do_check_eq(expected, actual);
  }
}
