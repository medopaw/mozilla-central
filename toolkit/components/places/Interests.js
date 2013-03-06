/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesUtils.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");
let consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

let gInterestsService = null;

function Interests() {
  gInterestsService = this;
  this.wrappedJSObject = this;
}

Interests.prototype = {
  classID: Components.ID("{DFB46031-8F05-4577-80A4-F4E5D492881F}"),
  _xpcom_factory: XPCOMUtils.generateSingletonFactory(Interests),

  QueryInterface: XPCOMUtils.generateQI([
  , Ci.nsIObserver
  , Ci.nsIDOMEventListener
  ]),

//  get wrappedJSObject() this,

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
    if (!("__worker " in this)) {
      // Use a ChromeWorker to workaround Bug 487070.
      this.__worker = new ChromeWorker("chrome://global/content/interestsWorker.js");
      this.__worker.addEventListener("message", this, false);
      this.__worker.addEventListener("error", this, false);

      let scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
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

  _getPlacesHostForURI: function(aURI) aURI.host.replace(/^www\./, ""),

  _addInterestsForHost: function I__addInterestsForHost(aHost, aInterests) {
    consoleService.logStringMessage("adding interests for host");
    consoleService.logStringMessage("host: " + aHost);
    consoleService.logStringMessage(typeof(aInterests));
    consoleService.logStringMessage("interests: " + aInterests);
    for (let interest of aInterests) {
      consoleService.logStringMessage("interest: " + typeof(interest) + " " + interest);
      consoleService.logStringMessage("host: " + typeof(aHost) + "  " + aHost);

      // TODO - this is a hack - we do not need to keep inserting into interests table
      PlacesInterestsStorage.addInterest(interest);
      PlacesInterestsStorage.addInterestVisit(interest);
      PlacesInterestsStorage.addInterestForHost(interest, aHost);
      consoleService.logStringMessage("added " + interest);
    }
  },

  _getInterestsForHost: function I__getInterestsForHost(aHost, aCallback) {

  },

  _getBucketsForInterest: function I__getBucketsForInterest(aInterest) {
    return PlacesInterestsStorage.getBucketsForInterest(aInterest);
  },

  _handleInterestsResults: function I__handleInterestsResults(aData) {
    let host = aData.host;
    let interests = aData.interests;
    this._addInterestsForHost(host, interests);
  },

  handleEvent: function I_handleEvent(aEvent) {
    let eventType = aEvent.type;
    if (eventType == "DOMContentLoaded") {
      let doc = aEvent.target;
      if (doc instanceof Ci.nsIDOMHTMLDocument && doc.defaultView == doc.defaultView.top)
        consoleService.logStringMessage("handling the doc");
        this._handleNewDocument(doc);
    }
    else if (eventType == "message") {
      let msgData = aEvent.data;
      if (msgData.message == "InterestsForDocument")
        this._handleInterestsResults(msgData);
    }
    else if (eventType == "error") {
      //TODO:handle error
      let msgData = aEvent.data;
      Cu.reportError(msgData.message);
    }
  },

  onDeleteURI: function(aURI, aGUID, aReason) {
    console.log(JSON.stringify(aURI));
    let host = this._getPlacesHostForURI(aURI);
    let hostInterests = this._getInterestsForHost(host);
    for (let interest of hostInterests) {
      this._invalidateBucketsForInterest(interest);
    }
  },

  onDeleteVisits: function() {
    let host = this._getPlacesHostForURI(aURI);
    let hostInterests = this._getInterestsForHost(host);
    for (let interest of hostInterests) {
      this._invalidateBucketsForInterest(interest);
    }
  },

  onClearHistory: function() {

  },

  onVisit: function() {},
  onTitleChanged: function() {},
  onBeforeDeleteURI: function() {},
  onPageChanged: function() {}
};

function InterestsWebAPI() { }

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
    let rv = {};
    rv.__exposedProps__ = {};
    for (let interest of aInterests)
      rv.__exposedProps__[interest] = "r";
    for (let interest of aInterests) {

      rv[interest] = gInterestsService._getBucketsForInterest(interest);
      for (let bucket of rv[interest]) {
        bucket.__exposedProps__ = { "endTime": "r", "visitCount": "r" };
        bucket.endTime = new Date(bucket.endTime / 1000);
      }
    }
    aCallback(rv);
  }
};

let components = [Interests, InterestsWebAPI];
this.NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
