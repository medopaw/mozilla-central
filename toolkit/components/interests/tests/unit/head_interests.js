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
Cu.import("resource://gre/modules/InterestsStorage.jsm");


// Import common head.
let (commonFile = do_get_file("../../../places/tests/head_common.js", false)) {
  let uri = Services.io.newFileURI(commonFile);
  Services.scriptloader.loadSubScript(uri.spec, this);
}

let iServiceObject = Cc["@mozilla.org/interests;1"].getService(Ci.nsISupports).wrappedJSObject;

// Put any other stuff relative to this test folder below.

const kValidMessages = {
  "bootstrapComplete": true,
  "swapRulesComplete": true,
  "InterestsForDocumentRules": true,
  "InterestsForDocumentText": true,
  "InterestsForDocument": true
}

const MS_PER_DAY = 86400000;
const MICROS_PER_DAY = 86400000000;

// Wrapper around setInterest that puts in some default duration and threshold
const DEFAULT_DURATION = 14;
const DEFAULT_THRESHOLD = 5;
function addInterest(interest) {
  return InterestsStorage.setInterest(interest, {
    duration: DEFAULT_DURATION,
    threshold: DEFAULT_THRESHOLD,
  });
}

function clearInterestsHosts() {
  return InterestsStorage._execute(
    "DELETE FROM moz_interests_hosts"
  );
}

function getHostsForInterest(interest) {
  return InterestsStorage._execute(
    "SELECT ih.host AS host FROM moz_interests i, moz_interests_hosts ih " +
    "WHERE i.interest = :interest AND i.id = ih.interest_id", {
    columns: ["host"],
    params: {
      interest: interest,
    },
  });
}

function getInterestsForHost(host) {
  return InterestsStorage._execute(
    "SELECT interest FROM moz_interests i, moz_interests_hosts ih " +
    "WHERE ih.host = :host AND i.id = ih.interest_id", {
    columns: ["interest"],
    params: {
      host: host,
    },
  });
}

function promiseClearHistoryAndVisits() {
  let promises = [];
  promises.push(InterestsStorage._execute("DELETE FROM moz_interests"));
  promises.push(InterestsStorage._execute("DELETE FROM moz_interests_hosts"));
  promises.push(InterestsStorage._execute("DELETE FROM moz_interests_visits"));
  promises.push(promiseClearHistory());
  return Promise.promised(Array)(promises).then();
}

function promiseAddMultipleUrlInterestsVisits(aVisitInfo) {
  let visits = [];
  if (Array.isArray(aVisitInfo)) {
    visits = visits.concat(aVisitInfo);
  } else {
    visits.push(aVisitInfo)
  }

  // add URL visits and run syc between moz_hosts and moz_interests_frecent_hosts
  let uriPromises = [];
  visits.forEach(function(visit) {
    let uri = NetUtil.newURI(visit.url);
    uriPromises.push(promiseAddVisits(uri));
  });
  // wait for urls insertions to complete
  return Promise.promised(Array)(uriPromises).then(() => {
    // urls are added, moz_hosts populated => refresh moz_interests_frecent_hosts
    return iServiceObject._refreshFrecentHosts().then(() => {
      // moz_interests_frecent_hosts is in OK state, and hosts and visits
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
        });
        visitPromises.push(iServiceObject._addInterestsForHost(host,interests,visitTime,visitCount));
      });
      return Promise.promised(Array)(visitPromises).then();
    });
  });
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
  visitPromises.push(addInterest(interest));
  visitPromises.push(InterestsStorage.addInterestVisit(interest, {visitTime: now - MS_PER_DAY*(daysAgo || 0), visitCount: count || 1}));
  return Promise.promised(Array)(visitPromises).then();
}

function addInterestVisitsToSite(site,interest,count) {
  let promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(promiseAddUrlInterestsVisit(site,interest));
  }
  return Promise.promised(Array)(promises).then();
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
  return promiseAddMultipleUrlInterestsVisits(visitObjects);
}

function promiseAddVisitsWithRefresh(urls) {
  let uriArray = urls.map(url => {
    return promiseAddVisits(NetUtil.newURI(url));
  });
  return Promise.promised(Array)(uriArray).then(() => {
    return iServiceObject._refreshFrecentHosts().then();
  });
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

function scoreDecay(score, numDays, daysToZero) {
  return score * (1 - numDays/(daysToZero+1));
}

Services.prefs.setBoolPref("interests.enabled", true);
