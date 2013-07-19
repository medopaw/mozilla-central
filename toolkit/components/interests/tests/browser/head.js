/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;
let iServiceObject = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
Services.prefs.setBoolPref("interests.enabled", true);
Services.prefs.setBoolPref("interests.navigator.enabled", true);

const TRANSITION_LINK = Ci.nsINavHistoryService.TRANSITION_LINK;
const TRANSITION_TYPED = Ci.nsINavHistoryService.TRANSITION_TYPED;

Components.utils.import("resource://gre/modules/NetUtil.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "Promise",
                                  "resource://gre/modules/commonjs/sdk/core/promise.js");
XPCOMUtils.defineLazyModuleGetter(this, "Task",
                                  "resource://gre/modules/Task.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesInterestsStorage",
                                  "resource://gre/modules/PlacesInterestsStorage.jsm");

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
 * Waits for all pending async statements on the default connection.
 *
 * @return {Promise}
 * @resolves When all pending async statements finished.
 * @rejects Never.
 *
 * @note The result is achieved by asynchronously executing a query requiring
 *       a write lock.  Since all statements on the same connection are
 *       serialized, the end of this write operation means that all writes are
 *       complete.  Note that WAL makes so that writers don't block readers, but
 *       this is a problem only across different connections.
 */
function promiseAsyncUpdates()
{
  let deferred = Promise.defer();

  let db = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase)
                              .DBConnection;
  let begin = db.createAsyncStatement("BEGIN EXCLUSIVE");
  begin.executeAsync();
  begin.finalize();

  let commit = db.createAsyncStatement("COMMIT");
  commit.executeAsync({
    handleResult: function() {},
    handleError: function() {},
    handleCompletion: function(aReason)
    {
      deferred.resolve();
    }
  });
  commit.finalize();

  return deferred.promise;
}

/**
 * Returns a moz_places field value for a url.
 *
 * @param aURI
 *        The URI or spec to get field for.
 * param aCallback
 *        Callback function that will get the property value.
 */
function fieldForUrl(aURI, aFieldName, aCallback)
{
  let url = aURI instanceof Ci.nsIURI ? aURI.spec : aURI;
  let stmt = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase)
                                .DBConnection.createAsyncStatement(
    "SELECT " + aFieldName + " FROM moz_places WHERE url = :page_url"
  );
  stmt.params.page_url = url;
  stmt.executeAsync({
    _value: -1,
    handleResult: function(aResultSet) {
      let row = aResultSet.getNextRow();
      if (!row)
        ok(false, "The page should exist in the database");
      this._value = row.getResultByName(aFieldName);
    },
    handleError: function() {},
    handleCompletion: function(aReason) {
      if (aReason != Ci.mozIStorageStatementCallback.REASON_FINISHED)
         ok(false, "The statement should properly succeed");
      aCallback(this._value);
    }
  });
  stmt.finalize();
}

/**
 * Generic nsINavHistoryObserver that doesn't implement anything, but provides
 * dummy methods to prevent errors about an object not having a certain method.
 */
function NavHistoryObserver() {}

NavHistoryObserver.prototype = {
  onBeginUpdateBatch: function () {},
  onEndUpdateBatch: function () {},
  onVisit: function () {},
  onTitleChanged: function () {},
  onDeleteURI: function () {},
  onClearHistory: function () {},
  onPageChanged: function () {},
  onDeleteVisits: function () {},
  QueryInterface: XPCOMUtils.generateQI([
    Ci.nsINavHistoryObserver,
  ])
};

/**
 * Waits for the first OnPageChanged notification for ATTRIBUTE_FAVICON, and
 * verifies that it matches the expected page URI and associated favicon URI.
 *
 * This function also double-checks the GUID parameter of the notification.
 *
 * @param aExpectedPageURI
 *        nsIURI object of the page whose favicon should change.
 * @param aExpectedFaviconURI
 *        nsIURI object of the newly associated favicon.
 * @param aCallback
 *        This function is called after the check finished.
 */
function waitForFaviconChanged(aExpectedPageURI, aExpectedFaviconURI, aWindow,
                               aCallback) {
  let historyObserver = {
    __proto__: NavHistoryObserver.prototype,
    onPageChanged: function WFFC_onPageChanged(aURI, aWhat, aValue, aGUID) {
      if (aWhat != Ci.nsINavHistoryObserver.ATTRIBUTE_FAVICON) {
        return;
      }
      aWindow.PlacesUtils.history.removeObserver(this);

      ok(aURI.equals(aExpectedPageURI),
        "Check URIs are equal for the page which favicon changed");
      is(aValue, aExpectedFaviconURI.spec,
        "Check changed favicon URI is the expected");
      checkGuidForURI(aURI, aGUID);

      if (aCallback) {
        aCallback();
      }
    }
  };
  aWindow.PlacesUtils.history.addObserver(historyObserver, false);
}

/**
 * Asynchronously adds visits to a page, invoking a callback function when done.
 *
 * @param aPlaceInfo
 *        Can be an nsIURI, in such a case a single LINK visit will be added.
 *        Otherwise can be an object describing the visit to add, or an array
 *        of these objects:
 *          { uri: nsIURI of the page,
 *            transition: one of the TRANSITION_* from nsINavHistoryService,
 *            [optional] title: title of the page,
 *            [optional] visitDate: visit date in microseconds from the epoch
 *            [optional] referrer: nsIURI of the referrer for this visit
 *          }
 * @param [optional] aCallback
 *        Function to be invoked on completion.
 * @param [optional] aStack
 *        The stack frame used to report errors.
 */
function addVisits(aPlaceInfo, aWindow, aCallback, aStack) {
  let stack = aStack || Components.stack.caller;
  let places = [];
  if (aPlaceInfo instanceof Ci.nsIURI) {
    places.push({ uri: aPlaceInfo });
  }
  else if (Array.isArray(aPlaceInfo)) {
    places = places.concat(aPlaceInfo);
  } else {
    places.push(aPlaceInfo)
  }

  // Create mozIVisitInfo for each entry.
  let now = Date.now();
  for (let i = 0; i < places.length; i++) {
    if (!places[i].title) {
      places[i].title = "test visit for " + places[i].uri.spec;
    }
    places[i].visits = [{
      transitionType: places[i].transition === undefined ? TRANSITION_LINK
                                                         : places[i].transition,
      visitDate: places[i].visitDate || (now++) * 1000,
      referrerURI: places[i].referrer
    }];
  }

  aWindow.PlacesUtils.asyncHistory.updatePlaces(
    places,
    {
      handleError: function AAV_handleError() {
        throw("Unexpected error in adding visit.");
      },
      handleResult: function () {},
      handleCompletion: function UP_handleCompletion() {
        if (aCallback)
          aCallback();
      }
    }
  );
}

/**
 * Checks that the favicon for the given page matches the provided data.
 *
 * @param aPageURI
 *        nsIURI object for the page to check.
 * @param aExpectedMimeType
 *        Expected MIME type of the icon, for example "image/png".
 * @param aExpectedData
 *        Expected icon data, expressed as an array of byte values.
 * @param aCallback
 *        This function is called after the check finished.
 */
function checkFaviconDataForPage(aPageURI, aExpectedMimeType, aExpectedData,
  aWindow, aCallback) {
  aWindow.PlacesUtils.favicons.getFaviconDataForPage(aPageURI,
    function (aURI, aDataLen, aData, aMimeType) {
      is(aExpectedMimeType, aMimeType, "Check expected MimeType");
      is(aExpectedData.length, aData.length,
        "Check favicon data for the given page matches the provided data");
      checkGuidForURI(aPageURI);
      aCallback();
    });
}

/**
 * Tests that a guid was set in moz_places for a given uri.
 *
 * @param aURI
 *        The uri to check.
 * @param [optional] aGUID
 *        The expected guid in the database.
 */
function checkGuidForURI(aURI, aGUID) {
  let guid = doGetGuidForURI(aURI);
  if (aGUID) {
    doCheckValidPlacesGuid(aGUID);
    is(guid, aGUID, "Check equal guid for URIs");
  }
}

/**
 * Retrieves the guid for a given uri.
 *
 * @param aURI
 *        The uri to check.
 * @return the associated the guid.
 */
function doGetGuidForURI(aURI) {
  let stmt = DBConn().createStatement(
    "SELECT guid "
    + "FROM moz_places "
    + "WHERE url = :url "
  );
  stmt.params.url = aURI.spec;
  ok(stmt.executeStep(), "Check get guid for uri from moz_places");
  let guid = stmt.row.guid;
  stmt.finalize();
  doCheckValidPlacesGuid(guid);
  return guid;
}

/**
 * Tests if a given guid is valid for use in Places or not.
 *
 * @param aGuid
 *        The guid to test.
 */
function doCheckValidPlacesGuid(aGuid) {
  ok(/^[a-zA-Z0-9\-_]{12}$/.test(aGuid), "Check guid for valid places");
}

/**
 * Gets the database connection.  If the Places connection is invalid it will
 * try to create a new connection.
 *
 * @param [optional] aForceNewConnection
 *        Forces creation of a new connection to the database.  When a
 *        connection is asyncClosed it cannot anymore schedule async statements,
 *        though connectionReady will keep returning true (Bug 726990).
 *
 * @return The database connection or null if unable to get one.
 */
function DBConn(aForceNewConnection) {
  let gDBConn;
  if (!aForceNewConnection) {
    let db = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase)
      .DBConnection;
    if (db.connectionReady)
      return db;
  }

  // If the Places database connection has been closed, create a new connection.
  if (!gDBConn || aForceNewConnection) {
    let file = Services.dirsvc.get('ProfD', Ci.nsIFile);
    file.append("places.sqlite");
    let dbConn = gDBConn = Services.storage.openDatabase(file);

    // Be sure to cleanly close this connection.
    Services.obs.addObserver(function DBCloseCallback(aSubject, aTopic, aData) {
      Services.obs.removeObserver(DBCloseCallback, aTopic);
      dbConn.asyncClose();
    }, "profile-before-change", false);
  }

  return gDBConn.connectionReady ? gDBConn : null;
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
 * Asynchronously check a url is visited.
 *
 * @param aURI The URI.
 * @param aExpectedValue The expected value.
 * @return {Promise}
 * @resolves When the check has been added successfully.
 * @rejects JavaScript exception.
 */
function promiseIsURIVisited(aURI, aExpectedValue) {
  let deferred = Promise.defer();

  PlacesUtils.asyncHistory.isURIVisited(aURI, function(aURI, aIsVisited) {
    deferred.resolve(aIsVisited);
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
  return PlacesInterestsStorage.setInterest(aInterest, {
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
  promises.push(PlacesInterestsStorage._execute("DELETE FROM moz_interests"));
  promises.push(PlacesInterestsStorage._execute("DELETE FROM moz_interests_hosts"));
  promises.push(PlacesInterestsStorage._execute("DELETE FROM moz_interests_visits"));
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
