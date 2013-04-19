/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

const gatherPromises = Promise.promised(Array);
const secMan = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);

let gServiceEnabled = Services.prefs.getBoolPref("interests.enabled");
let gInterestsService = null;

// Add a pref observer for the enabled state
function prefEnabledObserver(subject, topic, data) {
  let enable = Services.prefs.getBoolPref("interests.enabled");
  if (enable && !gServiceEnabled) {
    gServiceEnabled = true;
  }
  else if (!enable && gServiceEnabled) {
    delete gInterestsService.__worker;
    gServiceEnabled = false;
  }
}

// pref observer for user-defined whitelist
function resetWhitelistObserver(subject, topic, data) {
  if(gInterestsService && gInterestsService.__whitelistedSet) {
    delete gInterestsService.__whitelistedSet;
  }
}

function exposeAll(obj) {
  // Filter for Objects and Arrays.
  if (typeof obj !== "object" || !obj)
    return;

  // Recursively expose our children.
  Object.keys(obj).forEach(key => exposeAll(obj[key]));

  // If we're not an Array, generate an __exposedProps__ object for ourselves.
  if (obj instanceof Array)
    return;
  var exposed = {};
  Object.keys(obj).forEach(key => exposed[key] = "r");
  obj.__exposedProps__ = exposed;
}

Services.prefs.addObserver("interests.enabled", prefEnabledObserver, false);
Services.prefs.addObserver("interests.userDomainWhitelist", resetWhitelistObserver, false);
Services.obs.addObserver(function xpcomShutdown() {
  Services.obs.removeObserver(xpcomShutdown, "xpcom-shutdown");
  Services.prefs.removeObserver("interests.enabled", prefEnabledObserver);
}, "xpcom-shutdown", false);

function Interests() {
  gInterestsService = this;
}
Interests.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  //// Interests API

  /**
   * Package up interest data by names
   *
   * @param   names
   *          Array of interest string names
   * @returns Promise with interests sorted by score
   */
  getInterestsByNames: function I_getInterestsByNames(names, options={}) {
    return this._packageInterests(PlacesInterestsStorage.
      getScoresForInterests(names, options), options);
  },

  /**
   * Package up top interest data by namespace
   *
   * @param   namespace
   *          Namespace of the interests to fetch
   * @returns Promise with interests sorted by score
   */
  getInterestsByNamespace: function I_getInterestsByNamespace(namespace, options={}) {
    return this._packageInterests(PlacesInterestsStorage.
      getScoresForNamespace(namespace, options), options);
  },

  resubmitRecentHistoryVisits: function I_resubmitRecentHistory(daysBack) {
    // check if history is in progress
    if (this._ResubmitRecentHistoryDeferred) {
      return this._ResubmitRecentHistoryDeferred.promise;
    }

    this._ResubmitRecentHistoryDeferred = Promise.defer();
    // clean interest tables first
    PlacesInterestsStorage.clearRecentVisits(daysBack).then(() => {
      // read moz_places data and massage it
      PlacesInterestsStorage.getRecentHistory(daysBack, item => {
        let uri = NetUtil.newURI(item.url);
        item["message"] = "getInterestsForDocument";
        item["host"] = this._getPlacesHostForURI(uri);
        item["path"] = uri["path"];
        item["tld"] = Services.eTLD.getBaseDomainFromHost(item["host"]);
        item["metaData"] = {};
        item["language"] = "en";
        this._callMatchingWorker(item);
      }).then(() => {
        // we are done sending recent visits to the worker
        // hence, we can send an echo message to the worker
        // to indicate completion of the history re-processing
        this._callMatchingWorker({
          message: "echoMessage",
          type: "resubmitRecentHistory"
        });
      });
    });
    return this._ResubmitRecentHistoryDeferred.promise;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// Interests Helpers

  get _worker() {
    if (gServiceEnabled && !("__worker" in this)) {
      // Use a ChromeWorker to workaround Bug 487070.
      this.__worker = new ChromeWorker("chrome://global/content/interestsWorker.js");
      this.__worker.addEventListener("message", this, false);
      this.__worker.addEventListener("error", this, false);

      let scriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"].
        getService(Ci.mozIJSSubScriptLoader);
      let data = scriptLoader.loadSubScript("chrome://global/content/interestsData.js");
      let model = scriptLoader.loadSubScript("chrome://global/content/interestsClassifierModel.js");
      let stopwords = scriptLoader.loadSubScript("chrome://global/content/interestsUrlStopwords.js");

      this.__worker.postMessage({
        message: "bootstrap",
        interestsDataType: "dfr",
        interestsData: interestsData,
        interestsClassifierModel: interestsClassifierModel,
        interestsUrlStopwords: interestsUrlStopwords
      });
    }
    return this.__worker;
  },

  _handleNewDocument: function I__handleNewDocument(aDocument) {
    // Only compute interests on documents with a host
    let host = this._getPlacesHostForURI(aDocument.documentURIObject);
    if (host == "") {
      return;
    }

    // disallow saving of interests for PB windows
    if (PrivateBrowsingUtils.isWindowPrivate(aDocument.defaultView)) {
      return;
    }

    this._callMatchingWorker({
      message: "getInterestsForDocument",
      url: aDocument.documentURI,
      host: host,
      path: aDocument.documentURIObject.path,
      title: aDocument.title,
      tld: Services.eTLD.getBaseDomainFromHost(host) ,
      metaData: {} ,
      language: "en"
    });
  },

  _callMatchingWorker: function I__callMatchingWorker(callObject) {
    this._worker.postMessage(callObject);
  },

  /**
   * Extract the host from the URI in the format Places expects
   *
   * @param   uri
   *          nsIURI to get the host
   * @returns Host string or empty if no host
   */
  _getPlacesHostForURI: function I__getPlacesHostForURI(uri) {
    try {
      return uri.host.replace(/^www\./, "");
    }
    catch(ex) {}
    return "";
  },

  _addInterestsForHost: function I__addInterestsForHost(aHost, aInterests, aVisitDate, aVisitCount) {
    let deferred = Promise.defer();

    // execute host and visit additions
    let addVisitPromises = [];
    for (let interest of aInterests) {
      // we need to wait until interest is added to the inerestes table
      addVisitPromises.push(PlacesInterestsStorage.addInterestVisit(interest,{visitTime: aVisitDate, visitCount: aVisitCount}));
      addVisitPromises.push(PlacesInterestsStorage.addInterestHost(interest, aHost));
    }
    Promise.promised(Array)(addVisitPromises).then(results => {
      deferred.resolve(results);
      // test if resubmitRecentHistory echo message arrrived
      // if so, we have added all resubmitted interests and
      // need to resolve _ResubmitRecentHistoryDeferred promise
      if (this._ResubmitRecentHistoryEchoReceived) {
        this._ResubmitRecentHistoryDeferred.resolve();
        this._ResubmitRecentHistoryDeferred = null;
        this._ResubmitRecentHistoryEchoReceived = false;
      }
    }, error => deferred.reject(error))
    return deferred.promise;
  },

  /**
   * Add extra data to a sorted array of interests
   *
   * @param   scoresPromise
   *          Promise with an array of interests with name and score
   * @param   [optional] options {see below}
   *          excludeMeta: Boolean true to not include metadata
   *          roundDiversity: Boolean true to round to the closest int
   *          roundScore: Boolean true to normalize scores to the first score
   *          roundRecency: Boolean true to round to the interest's threshold
   * @returns Promise with an array of interests with added data
   */
  _packageInterests: function I__packageInterests(scoresPromise, options={}) {
    // Wait for the scores to come back with interest names
    return scoresPromise.then(sortedInterests => {
      let names = sortedInterests.map(({name}) => name);
      // Pass on the scores and add on interest, diversity and bucket data
      return [
        sortedInterests,
        PlacesInterestsStorage.getInterests(names),
        PlacesInterestsStorage.getDiversityForInterests(names, options),
        PlacesInterestsStorage.getBucketsForInterests(names, options),
      ];
    // Wait for all the promises to finish then combine the data
    }).then(gatherPromises).then(([interests, meta, diversity, buckets]) => {
      let {excludeMeta, roundDiversity, roundRecency, roundScore} = options;

      // Take the first result's score to be the max
      let maxScore = 0;
      if (interests.length > 0) {
        maxScore = interests[0].score;
      }

      // Package up pieces according to options
      interests.forEach(interest => {
        let {name} = interest;

        // Include diversity and round to a percent [0-100] if requested
        interest.diversity = diversity[name];
        if (roundDiversity) {
          interest.diversity = Math.round(interest.diversity);
        }

        // Include meta only if not explictly excluded
        if (!excludeMeta) {
          interest.meta = meta[name];
        }

        // Include recency and round to thresholds if requested
        interest.recency = buckets[name];
        if (roundRecency) {
          // Round each recency bucket to the interest's threshold
          let {recency} = interest;
          Object.keys(recency).forEach(bucket => {
            recency[bucket] = recency[bucket] >= meta[name].threshold;
          });
        }

        // Round the already-included score to a percent [0-100] if requested
        if (roundScore && maxScore != 0) {
          interest.score = Math.round(interest.score / maxScore * 100);
        }
      });

      return interests;
    });
  },

  _setIgnoredForInterest: function I__setIgnoredForInterest(interest) {
    return PlacesInterestsStorage.setInterest(interest, {
      sharable: false
    });
  },

  _unsetIgnoredForInterest: function I__setIgnoredForInterest(interest) {
    return PlacesInterestsStorage.setInterest(interest, {
      sharable: true
    });
  },

  _getInterestsForHost: function I__getInterestsForHost(aHost, aCallback) {
  },

  _handleInterestsResults: function I__handleInterestsResults(aData) {
    this._addInterestsForHost(aData.host,
                              aData.interests,
                              aData.visitDate,
                              aData.visitCount).then(results => {
      // generate "interest-visit-saved" event
      let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      timer.init(function(timer) {
        Services.obs.notifyObservers({wrappedJSObject: aData},
                                     "interest-visit-saved",
                                     null);
      }, 0, Ci.nsITimer.TYPE_ONE_SHOT);
    });
  },

  _handleEchoMessage: function I__handleInterestsResults(aData) {
    if (aData.type == "resubmitRecentHistory") {
      this._ResubmitRecentHistoryEchoReceived = true;
    }
  },

  _getDomainWhitelistedSet: function I__getDomainWhitelist() {
    if (!("__whitelistedSet" in this)) {
      // init with default values
      this.__whitelistedSet = new Set(["mozilla.org", "mozilla.com", "about:profile"]);

      // load from user prefs
      let userWhitelist = Services.prefs.getCharPref('interests.userDomainWhitelist').trim().split(/\s*,\s*/);
      for (let i=0; i<userWhitelist.length; i++) {
        this.__whitelistedSet.add(userWhitelist[i]);
      }

      //TODO: load from file in profile dir
    }

    return this.__whitelistedSet;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsIDOMEventListener

  handleEvent: function I_handleEvent(aEvent) {
    let eventType = aEvent.type;
    if (eventType == "DOMContentLoaded") {
      if (gServiceEnabled) {
        let doc = aEvent.target;
        if (doc instanceof Ci.nsIDOMHTMLDocument && doc.defaultView == doc.defaultView.top) {
          this._handleNewDocument(doc);
        }
      }
    }
    else if (eventType == "message") {
      let msgData = aEvent.data;
      if (msgData.message == "InterestsForDocument") {
        this._handleInterestsResults(msgData);
      }
      else if (msgData.message == "echoMessage") {
        this._handleEchoMessage(msgData);
      }
    }
    else if (eventType == "error") {
      //TODO:handle error
      Cu.reportError(aEvent.message);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsIObserver

  observe: function I_observe(aSubject, aTopic, aData) {
    if (aTopic == "app-startup") {
      Services.obs.addObserver(this, "toplevel-window-ready", false);
    }
    else if (aTopic == "toplevel-window-ready") {
      // Top level window is the browser window, not the content window(s).
      aSubject.addEventListener("DOMContentLoaded", this, true);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsISupports

  classID: Components.ID("{DFB46031-8F05-4577-80A4-F4E5D492881F}"),

  QueryInterface: XPCOMUtils.generateQI([
  , Ci.nsIDOMEventListener
  , Ci.nsIObserver
  ]),

  get wrappedJSObject() this,

  _xpcom_factory: XPCOMUtils.generateSingletonFactory(Interests),
};

function InterestsWebAPI() {
  this.currentHost = "";
}
InterestsWebAPI.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  //// mozIInterestsWebAPI

  /**
   * Get information about specific interests sorted by score
   *
   * @param   interests
   *          An array of interest name strings
   * @param   [optional] interestsData
   * @returns Promise with the sorted array of top interests
   */
  getInterests: function IWA_getInterests(interests, interestsData) {
    let deferred = this._makePromise();

    // Only allow API access according to the user's permission
    this._checkContentPermission().then(() => {
      return gInterestsService.getInterestsByNames(interests, {
        checkSharable: true,
        excludeMeta: true,
        roundDiversity: true,
        roundRecency: true,
        roundScore: true,
      });
    }).then(sortedInterests => {
      exposeAll(sortedInterests);
      deferred.resolve(sortedInterests);
    }, error => deferred.reject(error));

    return deferred.promise;
  },

  /**
   * Get the user's top interests
   *
   * @param   [optional] topData
   * @returns Promise with the array of top interests
   */
  getTopInterests: function IWA_getTopInterests(topData) {
    let deferred = this._makePromise();
    
    let aNumber = topData || 5;
    if (aNumber > 5) {
      let whitelistedSet = gInterestsService._getDomainWhitelistedSet();
      if (!whitelistedSet.has(this.currentHost) && !secMan.isSystemPrincipal(this.window.document.nodePrincipal)) { 
        deferred.reject("host "+this.currentHost+" does not have enough privileges to access getTopInterests("+aNumber+")");
        return deferred.promise;
      }
    }

    // Only allow API access according to the user's permission
    this._checkContentPermission().then(() => {
      return gInterestsService.getInterestsByNamespace("", {
        checkSharable: true,
        excludeMeta: true,
        interestLimit: aNumber,
        roundDiversity: true,
        roundRecency: true,
        roundScore: true,
      });
    }).then(topInterests => {
      exposeAll(topInterests);
      deferred.resolve(topInterests);
    }, error => deferred.reject(error));

    return deferred.promise;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// mozIInterestsWebAPI Helpers

  /**
   * Make a promise that exposes "then" to allow callbacks
   *
   * @returns Promise usable from content
   */
  _makePromise: function IWA__makePromise() {
    let deferred = Promise.defer();
    deferred.promise.__exposedProps__ = {
      then: "r"
    };
    return deferred;
  },

  /**
   * Check if the user has allowed API access
   *
   * @returns Promise for when the content access is allowed or canceled
   */
  _checkContentPermission: function IWA__checkContentPermission() {
    let promptPromise = Promise.defer();

    // APIs created by tests don't have a principal, so just allow them
    // Also allow higher privileged pages.
    if (this.window == null || this.window.document == null || this.window.document.nodePrincipal == null) {
      promptPromise.resolve();
    }
    // For private browsing window - always reject
    else if (PrivateBrowsingUtils.isWindowPrivate(this.window)) {
      promptPromise.reject("Interests Unavailable in Private Browsing mode");
    }
    // For content documents, check the user's permission
    else {
      let prompt = Cc["@mozilla.org/content-permission/prompt;1"].
        createInstance(Ci.nsIContentPermissionPrompt);
      prompt.prompt({
        type: "interests",
        window: this.window,
        principal: this.window.document.nodePrincipal,
        allow: () => promptPromise.resolve(),
        cancel: () => promptPromise.reject(),
      });
    }

    return promptPromise.promise;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsIDOMGlobalPropertyInitializer

  init: function IWA__init(aWindow) {
    let uriObj = {host: aWindow.location.hostname || aWindow.location.href};
    this.currentHost = gInterestsService._getPlacesHostForURI(uriObj);
    this.window = aWindow;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsISupports

  classID: Components.ID("{7E7F2263-E356-4B2F-B32B-4238240CD7F9}"),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{7E7F2263-E356-4B2F-B32B-4238240CD7F9}"),
    "contractID": "@mozilla.org/InterestsWebAPI;1",
    "interfaces": [Ci.mozIInterestsWebAPI],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "Interests Web API"
  }),

  QueryInterface: XPCOMUtils.generateQI([
  , Ci.mozIInterestsWebAPI
  , Ci.nsIDOMGlobalPropertyInitializer
  ]),
};

let components = [Interests, InterestsWebAPI];
this.NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
