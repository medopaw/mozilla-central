/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;
let iServiceObject = Cc["@mozilla.org/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
Services.prefs.setBoolPref("interests.enabled", true);
Services.prefs.setBoolPref("interests.navigator.enabled", true);

const TRANSITION_LINK = Ci.nsINavHistoryService.TRANSITION_LINK;
const TRANSITION_TYPED = Ci.nsINavHistoryService.TRANSITION_TYPED;

Components.utils.import("resource://gre/modules/NetUtil.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Promise",
                                  "resource://gre/modules/commonjs/sdk/core/promise.js");
XPCOMUtils.defineLazyModuleGetter(this, "Task",
                                  "resource://gre/modules/Task.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "InterestsStorage",
                                  "resource://gre/modules/interests/InterestsStorage.jsm");

/**
 * Allows waiting for an observer notification once.
 *
 * @param aTopic
 *        Notification topic to observe.
 *
 * @return {Promise}
 * @resolves The array [aSubject, aData] from the observed notification.
 * @rejects Never.
 */
function promiseTopicObserved(aTopic)
{
  let deferred = Promise.defer();

  Services.obs.addObserver(
    function PTO_observe(aSubject, aTopic, aData) {
      Services.obs.removeObserver(PTO_observe, aTopic);
      deferred.resolve([aSubject, aData]);
    }, aTopic, false);

  return deferred.promise;
}

/**
 * Clears history asynchronously.
 *
 * @return {Promise}
 * @resolves When history has been cleared.
 * @rejects Never.
 */
function promiseClearHistory() {
  let promise = promiseTopicObserved(PlacesUtils.TOPIC_EXPIRATION_FINISHED);
  PlacesUtils.bhistory.removeAllPages();
  return promise;
}

/**
 * Opens a new browser window and executes callback for new window
 *
 * @param aOptions
 *        OpenBrowserWindow options
 * param aCallback
 *        Callback function that will get the new window
 */
function whenNewWindowLoaded(aOptions, aCallback) {
  let win = OpenBrowserWindow(aOptions);
  win.addEventListener("load", function onLoad() {
    win.removeEventListener("load", onLoad, false);
    aCallback(win);
  }, false);
}

/**
 * opens a new browser window and loads URL
 * returns a promise resolved on DOMLoaded event
 *
 * @param aOptions
 *        OpenBrowserWindow options for new window
 * param aURL
 *        url to load into the window
 * param [optional] aCallback
 *        Callback function that will recieve the new window
 *        when the window is opened but before URL is loaded
 */
function loadURLIntoSeparateWindow(aOptions,aURL,aWindowLoadedCallback) {
  let deferred = Promise.defer();
  whenNewWindowLoaded(aOptions, function(aWin) {
    executeSoon(function() {
      aWin.gBrowser.selectedBrowser.addEventListener("DOMContentLoaded", function onDOMLoad() {
        aWin.gBrowser.selectedBrowser.removeEventListener("DOMContentLoaded", onDOMLoad, true);
        deferred.resolve(aWin);
      });
      if (aWindowLoadedCallback) {
        aWindowLoadedCallback(aWin);
      }
      aWin.content.location.href = aURL;
      //aWin.gBrowser.selectedBrowser.loadURI(aURL);
    });
  });
  return deferred.promise;
}

/**
 * adds an interest to the database
 *
 * @param aInterest The interest.
 * @return {Promise}
 * @resolves When the added successfully.
 * @rejects JavaScript exception.
 */
function promiseAddInterest(aInterest) {
  return InterestsStorage.setInterest(aInterest, {
    duration: 14,
    threshold: 5,
  });
}

/**
 * clears all interests related tables
 *
 * @return {Promise}
 */
function promiseClearInterests() {
  let promises = [];
  promises.push(InterestsStorage._execute("DELETE FROM moz_interests"));
  promises.push(InterestsStorage._execute("DELETE FROM moz_interests_visits"));
  return Promise.promised(Array)(promises).then();
}

/**
 * clears all interests and history
 *
 * @return {Promise}
 */
function promiseClearHistoryAndInterests() {
  let promises = [];
  promises.push(promiseClearHistory());
  promises.push(promiseClearInterests());
  return Promise.promised(Array)(promises).then();
}
