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
Cu.import("resource://gre/modules/PlacesUtils.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

let consoleService = Services.console;

let gServiceEnabled = Services.prefs.getBoolPref("interests.enabled");
let gInterestsService = null;

// Add a pref observer for the enabled state
function prefObserver(subject, topic, data) {
  let enable = Services.prefs.getBoolPref("interests.enabled");
  if (enable && !gServiceEnabled) {
    this._worker;
    gServiceEnabled = true;
  }
  else if (!enable && gServiceEnabled) {
    delete this.__worker;
    gServiceEnabled = false;
  }
}

Services.prefs.addObserver("interests.enabled", prefObserver, false);
Services.obs.addObserver(function xpcomShutdown() {
  Services.obs.removeObserver(xpcomShutdown, "xpcom-shutdown");
  Services.prefs.removeObserver("interests.enabled", prefObserver);
}, "xpcom-shutdown", false);

function Interests() {
  gInterestsService = this;
}

Interests.prototype = {
  classID: Components.ID("{DFB46031-8F05-4577-80A4-F4E5D492881F}"),
  _xpcom_factory: XPCOMUtils.generateSingletonFactory(Interests),

  QueryInterface: XPCOMUtils.generateQI([
  , Ci.nsIObserver
  , Ci.nsIDOMEventListener
  ]),

  get wrappedJSObject() this,

  observe: function I_observe(aSubject, aTopic, aData) {
    if (aTopic == "app-startup") {
      Services.obs.addObserver(this, "toplevel-window-ready", false);
      Services.obs.addObserver(this, "places-init-complete", false);
    }
    else if (aTopic == "places-init-complete") {
      PlacesUtils.history.addObserver(this, false);
    }
    else if (aTopic == "toplevel-window-ready") {
      // Top level window is the browser window, not the content window(s).
      aSubject.addEventListener("DOMContentLoaded", this, true);
    }
  },

  get _worker() {
    if (gServiceEnabled && !("__worker " in this)) {
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
    let host = this._getPlacesHostForURI(aDocument.documentURIObject);

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

  _getPlacesHostForURI: function(aURI) {
    return aURI.host.replace(/^www\./, "");
  },

  _addInterestsForHost: function I__addInterestsForHost(aHost, aInterests) {
    let allPromises = [];
    consoleService.logStringMessage("adding interests for host");
    consoleService.logStringMessage("host: " + aHost);
    consoleService.logStringMessage(typeof(aInterests));
    consoleService.logStringMessage("interests: " + aInterests);
    for (let interest of aInterests) {
      consoleService.logStringMessage("interest: " + typeof(interest) + " " + interest);
      consoleService.logStringMessage("host: " + typeof(aHost) + "  " + aHost);

      // TODO - this is a hack - we do not need to keep inserting into interests table
      allPromises.push(PlacesInterestsStorage.addInterest(interest));
      allPromises.push(PlacesInterestsStorage.addInterestVisit(interest));
      allPromises.push(PlacesInterestsStorage.addInterestForHost(interest, aHost));
      consoleService.logStringMessage("added " + interest);
    }
    return Promise.promised(Array)(allPromises);
  },

  _getInterestsForHost: function I__getInterestsForHost(aHost, aCallback) {

  },

  _getBucketsForInterests: function I__getBucketsForInterests(aInterests) {
    let rv = {};
    let promiseArray = [];
    let deferred = Promise.defer();
    for (let interest of aInterests) {
      promiseArray.push(PlacesInterestsStorage.getBucketsForInterest(interest))
    }

    let group = Promise.promised(Array);
    let groupPromise = group(promiseArray).then(function(allInterestsBuckets) {
      allInterestsBuckets.forEach(function(interestBuckets) {
        rv[interestBuckets.interest] = interestBuckets;
      });
      deferred.resolve(rv);
    }, function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },

  _handleInterestsResults: function I__handleInterestsResults(aData) {
    let host = aData.host;
    let interests = aData.interests;
    this._addInterestsForHost(host, interests);
  },

  handleEvent: function I_handleEvent(aEvent) {
    let eventType = aEvent.type;
    if (eventType == "DOMContentLoaded") {
      if (gServiceEnabled) {
        let doc = aEvent.target;
        if (doc instanceof Ci.nsIDOMHTMLDocument && doc.defaultView == doc.defaultView.top) {
          consoleService.logStringMessage("handling the doc");
          this._handleNewDocument(doc);
        }
      }
    }
    else if (eventType == "message") {
      let msgData = aEvent.data;
      if (msgData.message == "InterestsForDocument") {
        this._handleInterestsResults(msgData);
      }
    }
    else if (eventType == "error") {
      //TODO:handle error
      Cu.reportError(aEvent.message);
    }
  },

  onDeleteURI: function(aURI, aGUID, aReason) {
    // TODO - we need to implement URI deletion probably, by classifiing that
    // URI again and removing it from the tables - potentially a call tp
    // PlacesInterestsStorage
    /*
    console.log(JSON.stringify(aURI));
    let host = this._getPlacesHostForURI(aURI);
    let hostInterests = this._getInterestsForHost(host);
    for (let interest of hostInterests) {
      this._invalidateBucketsForInterest(interest);
    }
    */
  },

  onDeleteVisits: function(aURI) {
    // TODO - same thing as above figure what to do if a visit is deleted
    /*
    let host = this._getPlacesHostForURI(aURI);
    let hostInterests = this._getInterestsForHost(host);
    for (let interest of hostInterests) {
      this._invalidateBucketsForInterest(interest);
    }
    */
  },

  onClearHistory: function() {

  },

  onVisit: function() {},
  onTitleChanged: function() {},
  onBeforeDeleteURI: function() {},
  onPageChanged: function() {}
};

function InterestsWebAPI() {}

InterestsWebAPI.prototype = {
  classID: Components.ID("{7E7F2263-E356-4B2F-B32B-4238240CD7F9}"),
  _xpcom_factory: XPCOMUtils.generateSingletonFactory(InterestsWebAPI),

  QueryInterface: XPCOMUtils.generateQI([
  , Ci.mozIInterestsWebAPI
  , Ci.nsIDOMGlobalPropertyInitializer
  ]),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{7E7F2263-E356-4B2F-B32B-4238240CD7F9}"),
    "contractID": "@mozilla.org/InterestsWebAPI;1",
    "interfaces": [Ci.mozIInterestsWebAPI, Ci.nsIDOMGlobalPropertyInitializer],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "Interests Web API"}),

  init: function(aWindow) {},

  checkInterests: function(aInterests, aCallback) {
    let promise = gInterestsService._getBucketsForInterests(aInterests);
    promise.then(function(results) {
      results["__exposedProps__"] = {};
      // decorate results before sending it back to the caller
      Object.keys(results).forEach(function(interest) {
        if (interest == "__exposedProps__") {
          return;
        }

        results["__exposedProps__"][interest] = "r";
        results[interest].forEach(function(bucket) {
          bucket["__exposedProps__"] = { "endTime": "r", "visitCount": "r" };
          bucket["endTime"] = new Date(results[interest]["endTime"] / 1000);
        });
      });

      aCallback(results);
    });
  }
};

let components = [Interests, InterestsWebAPI];
this.NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
