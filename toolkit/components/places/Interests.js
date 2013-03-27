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

const DEFAULT_THRESHOLD = 5;
const DEFAULT_DURATION = 14;

let gServiceEnabled = Services.prefs.getBoolPref("interests.enabled");
let gInterestsService = null;

// Add a pref observer for the enabled state
function prefObserver(subject, topic, data) {
  let enable = Services.prefs.getBoolPref("interests.enabled");
  if (enable && !gServiceEnabled) {
    gServiceEnabled = true;
  }
  else if (!enable && gServiceEnabled) {
    delete gInterestsService.__worker;
    gServiceEnabled = false;
  }
}

function exposeAll(obj) {
  // Filter for Objects and Arrays.
  if (typeof obj !== "object" || !obj)
    return;

  // Recursively expose our children.
  Object.keys(obj).forEach(function(key) {
    exposeAll(obj[key]);
  });

  // If we're not an Array, generate an __exposedProps__ object for ourselves.
  if (obj instanceof Array)
    return;
  var exposed = {};
  Object.keys(obj).forEach(function(key) {
    exposed[key] = 'r';
  });
  obj.__exposedProps__ = exposed;
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
  //////////////////////////////////////////////////////////////////////////////
  //// Interests API

  resubmitRecentHistoryVisits: function I_resubmitRecentHistory(daysBack) {
    let self = this;
    // check if history is in progress
    if (this._ResubmitRecentHistoryDeferred) {
      return this._ResubmitRecentHistoryDeferred.promise;
    }

    this._ResubmitRecentHistoryDeferred = Promise.defer();
    // clean interest tables first
    this._clearRecentInterests(daysBack).then(function() {
      // read moz_places data and massage it
      PlacesInterestsStorage.reprocessRecentHistoryVisits(daysBack, function(item) {
        let uri = NetUtil.newURI(item.url);
        item["message"] = "getInterestsForDocument";
        item["host"] = self._getPlacesHostForURI(uri);
        item["path"] = uri["path"];
        item["tld"] = Services.eTLD.getBaseDomainFromHost(item["host"]);
        item["metaData"] = {};
        item["language"] = "en";
        self._callMatchingWorker(item);
      }).then(function() {
        // we are done sending recent visits to the worker
        // hence, we can send an echo message to the worker
        // to indicate completion of the history re-processing
        self._callMatchingWorker({
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

  _addInterestsForHost: function I__addInterestsForHost(aHost, aInterests, aVisitDate, aVisitCount) {
    let self = this;
    let deferred = Promise.defer();
    let addInterestPromises = [];

    // TODO - this is a hack - we do not need to keep inserting into interests table
    // we should do it ones on startup or update
    for (let interest of aInterests) {
      // add all addInterest promisses to the array 
      addInterestPromises.push(PlacesInterestsStorage.addInterest(interest));
    }
    // now wait for all the promisses to resolve and execute host and visit additions
    Promise.promised(Array)(addInterestPromises).then(function(results) {
      let addVisitPromises = [];
      for (let interest of aInterests) {
        // we need to wait until interest is added to the inerestes table
        addVisitPromises.push(PlacesInterestsStorage.addInterestVisit(interest,{visitTime: aVisitDate, visitCount: aVisitCount}));
        addVisitPromises.push(PlacesInterestsStorage.addInterestForHost(interest, aHost));
      }
      Promise.promised(Array)(addVisitPromises).then(function(results) {
        deferred.resolve(results);
        // test if resubmitRecentHistory echo message arrrived
        // if so, we have added all resubmitted interests and
        // need to resolve _ResubmitRecentHistoryDeferred promise
        if (self._ResubmitRecentHistoryEchoReceived) {
          self._ResubmitRecentHistoryDeferred.resolve();
          self._ResubmitRecentHistoryDeferred = null;
          self._ResubmitRecentHistoryEchoReceived = false;
        }
      },
      function(error) {
        deferred.reject(error);
      });
    },
    function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },

  _getTopInterests: function I__getTopInterests(aNumber) {
    let returnDeferred = Promise.defer();
    PlacesInterestsStorage.getTopInterests(aNumber).then(function(topInterests) {
      // compute diversity first
      PlacesInterestsStorage.getDiversityForInterests(topInterests.map(function(interest) interest.name)).then(function(diversityResults) {
        // augment with diversity data and start buckets queries
        let bucketPromises = [];
        for (let index=0; index < topInterests.length; index++) {
          let interest = topInterests[index];
          interest.diversity = diversityResults[interest.name] || 0;
          bucketPromises.push(PlacesInterestsStorage.getBucketsForInterest(interest.name));
        }
        // augment with bucket data
        Promise.promised(Array)(bucketPromises).then(function(buckets){
          for (let index=0; index < buckets.length; index++) {
            let bucket = buckets[index];
            topInterests[index].recency = {
              immediate: bucket.immediate,
              recent: bucket.recent,
              past: bucket.past,
            }
          }
          returnDeferred.resolve(topInterests);
        },
        function(error) {
          returnDeferred.reject(error);
        });  // end of bucketPromises then
      },
      function(error) {
        returnDeferred.reject(error);
      }); // end of getDiversityForInterests then
    }); // end of getTopInterests then
    return returnDeferred.promise;
  },

  _getMetaForInterests: function I__getMetaForInterests(interestNames) {
    let deferred = Promise.defer();
    PlacesInterestsStorage.getMetaForInterests(interestNames).then(function(metaData) {
      for (let index=0; index < interestNames.length; index++) {
        let interest = interestNames[index];
        if (metaData[interest]) {
          let threshold = metaData[interest].threshold;
          let duration = metaData[interest].duration;
          metaData[interest].threshold = threshold ? threshold : DEFAULT_THRESHOLD;
          metaData[interest].duration = duration ? duration : DEFAULT_DURATION;
          delete metaData[interest].ignored;
          delete metaData[interest].dateUpdated;
        }
      }
      deferred.resolve(metaData);
    },
    function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },

  _setIgnoredForInterest: function I__setIgnoredForInterest(interest) {
    return PlacesInterestsStorage.updateIgnoreFlagForInterest(interest, true);
  },

  _unsetIgnoredForInterest: function I__setIgnoredForInterest(interest) {
    return PlacesInterestsStorage.updateIgnoreFlagForInterest(interest, false);
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

  _clearRecentInterests: function I__clearRecentInterests(daysBack) {
    return PlacesInterestsStorage.clearRecentInterests(daysBack);
  },

  _handleInterestsResults: function I__handleInterestsResults(aData) {
    this._addInterestsForHost(aData.host, aData.interests, aData.visitDate, aData.visitCount);
  },

  _handleEchoMessage: function I__handleInterestsResults(aData) {
    if (aData.type == "resubmitRecentHistory") {
      this._ResubmitRecentHistoryEchoReceived = true;
    }
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
}
InterestsWebAPI.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  //// mozIInterestsWebAPI

  checkInterests: function(aInterests) {
    let deferred = Promise.defer();
    gInterestsService._getBucketsForInterests(aInterests).then(function(results) {

      results = JSON.parse(JSON.stringify(results));

      results["__exposedProps__"] = {};
      // decorate results before sending it back to the caller
      Object.keys(results).forEach(function(interest) {
        if (interest == "__exposedProps__") {
          return;
        }
        results["__exposedProps__"][interest] = "r";
        results[interest]["__exposedProps__"] = {};
        results[interest]["__exposedProps__"]["immediate"] = "r";
        results[interest]["__exposedProps__"]["recent"] = "r";
        results[interest]["__exposedProps__"]["past"] = "r";
      });
      deferred.resolve(results);
    },
    function(error) {
      deferred.reject(error);
    });
    return deferred.promise;
  },

  getTopInterests: function(aNumber) {
    let deferred = Promise.defer();
    
    let aNumber = 5; // always 5 for now, will be subject to a whitelist
    gInterestsService._getTopInterests(aNumber).then(function(topInterests) {

      topInterests = JSON.parse(JSON.stringify(topInterests));

      let interestNames = [];
      let scoreTotal = 0;
      for (let index=0; index < topInterests.length; index++) {
        interestNames.push(topInterests[index].name);
        scoreTotal += topInterests[index].score;
      }
      gInterestsService._getMetaForInterests(interestNames).then(function(metaData){
        for (let index=0; index < interestNames.length; index++) {
          let interest = interestNames[index];
          // obtain metadata and apply thresholds
          topInterests[index].recency.immediate = topInterests[index].recency.immediate >= metaData[interest].threshold;
          topInterests[index].recency.recent = topInterests[index].recency.recent >= metaData[interest].threshold;
          topInterests[index].recency.past = topInterests[index].recency.past >= metaData[interest].threshold;
          
          // normalize scores
          topInterests[index].score /= scoreTotal;
          // round up diversity to closest number divisible by 5
          topInterests[index].diversity = 5*Math.round(topInterests[index].diversity/5);
        }
        exposeAll(topInterests);
        deferred.resolve(topInterests);
      });
    },
    function(error){
      deferred.reject(error);
    });
    return deferred.promise;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// nsIDOMGlobalPropertyInitializer

  init: function(aWindow) {},

  //////////////////////////////////////////////////////////////////////////////
  //// nsISupports

  classID: Components.ID("{7E7F2263-E356-4B2F-B32B-4238240CD7F9}"),

  classInfo: XPCOMUtils.generateCI({
    "classID": Components.ID("{7E7F2263-E356-4B2F-B32B-4238240CD7F9}"),
    "contractID": "@mozilla.org/InterestsWebAPI;1",
    "interfaces": [Ci.mozIInterestsWebAPI, Ci.nsIDOMGlobalPropertyInitializer],
    "flags": Ci.nsIClassInfo.DOM_OBJECT,
    "classDescription": "Interests Web API"
  }),

  QueryInterface: XPCOMUtils.generateQI([
  , Ci.mozIInterestsWebAPI
  , Ci.nsIDOMGlobalPropertyInitializer
  ]),

  _xpcom_factory: XPCOMUtils.generateSingletonFactory(InterestsWebAPI),
};

let components = [Interests, InterestsWebAPI];
this.NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
